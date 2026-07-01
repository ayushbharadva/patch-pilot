"""Runtime patches for known cognee==1.2.2 bugs affecting the Mistral provider.

Import AFTER `import cognee` (and after `backend.cognee_config`) in every
entrypoint that may run with `LLM_PROVIDER=mistral`. Applying the patch
mutates the already-imported `MistralAdapter` class in place, so import
order only matters relative to `import cognee` itself, not relative to when
Cognee's pipelines actually run.

Bug (cognee 1.2.2): `MistralAdapter.acreate_structured_output`'s body is
fundamentally wrong for EVERY `response_model`, not just `str`. It does:

    response = await self.aclient.chat.completions.create(
        model=self.model, messages=messages, response_model=response_model, ...
    )
    if response.choices and response.choices[0].message is not None ...:
        content = response.choices[0].message.content
        return response_model.model_validate_json(content)

But `self.aclient` is `instructor.from_litellm(litellm.acompletion, ...)` —
when called with `response_model=X`, instructor's contract (used correctly
by the sibling `GenericAPIAdapter.acreate_structured_output`, which just does
`return result`) is to return an ALREADY-PARSED instance of `X` directly, not
a raw chat-completion object with a `.choices` list. So:
  - `response_model=str` -> instructor returns a bare `str` ->
    `response.choices` raises `AttributeError: 'str' object has no attribute
    'choices'`.
  - `response_model=SomeBaseModel` (e.g. cognee's `KnowledgeGraph` during
    `cognify()`'s graph extraction) -> instructor returns a `SomeBaseModel`
    instance directly -> `response.choices` raises `AttributeError:
    'SomeBaseModel' object has no attribute 'choices'` (pydantic models
    reject unknown attribute access).

Both crashes are swallowed by the adapter's own `@retry` decorator until the
caller's outer timeout/retry budget is exhausted, surfacing as a generic
"LLM connection test timed out after 30s" (from
`cognee.infrastructure.llm.utils.test_llm_connection()`) or a retry-storm
during `cognify()`'s knowledge-graph extraction — with no hint of the real
AttributeError underneath unless retry logging is inspected directly.

This is not a Mistral-provider edge case: `response_model=str` is the
mainline path for `test_llm_connection()` and for
`cognee.search(query_type=SearchType.GRAPH_COMPLETION)` (via
`cognee.modules.retrieval.utils.completion` and friends), and a real
`BaseModel` response_model is the mainline path for `cognify()`'s own
knowledge-graph extraction. So the Mistral provider cannot complete a single
`add()+cognify()` or `search()` call in cognee 1.2.2 without this patch.

Fix: replace the method body with the same "trust instructor's return value"
contract `GenericAPIAdapter` already uses correctly — for `response_model is
str`, delegate to the inherited `acreate_str_output` (a plain
`litellm.acompletion` call, matching the parent's own special case); for any
other `response_model`, return the parsed result from
`self.aclient.chat.completions.create(...)` directly instead of reaching
into a nonexistent `.choices` attribute. All other behavior (retry policy,
rate limiting, exception classification) is preserved unchanged from the
original method.
"""

import logging

import litellm as _litellm
from litellm import JSONSchemaValidationError
from tenacity import (
    before_sleep_log,
    retry,
    retry_if_not_exception_type,
    wait_exponential_jitter,
)

from cognee.infrastructure.llm.retry_config import llm_retry_stop_condition
from cognee.infrastructure.llm.structured_output_framework.litellm_instructor.llm.mistral.adapter import (
    MistralAdapter,
)
from cognee.modules.observability.get_observe import get_observe
from cognee.shared.logging_utils import get_logger
from cognee.shared.rate_limiting import llm_rate_limiter_context_manager

_logger = get_logger()
_observe = get_observe()


@_observe(as_type="generation")
@retry(
    stop=llm_retry_stop_condition,
    wait=wait_exponential_jitter(8, 128),
    retry=retry_if_not_exception_type(
        (
            _litellm.exceptions.NotFoundError,
            _litellm.exceptions.AuthenticationError,
        )
    ),
    before_sleep=before_sleep_log(_logger, logging.WARNING),
    reraise=True,
)
async def _patched_acreate_structured_output(
    self, text_input, system_prompt, response_model, **kwargs
):
    merged_kwargs = {**self.llm_args, **kwargs}

    if response_model is str:
        return await self.acreate_str_output(text_input, system_prompt, **merged_kwargs)

    messages = [
        {"role": "system", "content": system_prompt},
        {
            "role": "user",
            "content": f"""Use the given format to extract information
                from the following input: {text_input}""",
        },
    ]
    try:
        async with llm_rate_limiter_context_manager():
            return await self.aclient.chat.completions.create(
                model=self.model,
                max_retries=2,
                messages=messages,
                response_model=response_model,
                **merged_kwargs,
            )
    except _litellm.exceptions.BadRequestError as e:
        _logger.error(f"Bad request error: {str(e)}")
        raise ValueError(f"Invalid request: {str(e)}")
    except JSONSchemaValidationError as e:
        _logger.error(f"Schema validation failed: {str(e)}")
        _logger.debug(f"Raw response: {e.raw_response}")
        raise ValueError(f"Response failed schema validation: {str(e)}")


MistralAdapter.acreate_structured_output = _patched_acreate_structured_output


# --- Second bug: LiteLLMEmbeddingEngine.get_tokenizer() crashes for the
# Mistral *embedding* model (e.g. `mistral-embed`). ---------------------
#
# `get_tokenizer()` special-cases Gemini with an explicit comment ("Gemini
# Tokenizer expects an LLM *chat* model as input and not the embedding
# model") and falls back to TikToken for token counting. No equivalent
# special case exists for Mistral: it unconditionally builds a
# `MistralTokenizer(model=<embedding-model-name>)`, which loads
# `mistral_common`'s chat-template tokenizer registry
# (`MODEL_NAME_TO_TOKENIZER_CLS`). That registry only contains Mistral
# *chat* model names (`mistral-small-2409`, `mistral-large-2411`, ...) —
# it has no entry for `mistral-embed` (or any embedding model) because
# embedding models have no chat template to tokenize. The result is:
#     mistral_common.exceptions.TokenizerException: Unrecognized model: mistral-embed
#
# Fix: for the Mistral provider, use TikToken for token-count estimation
# (same fallback Gemini already uses) instead of the chat-template
# tokenizer, since this tokenizer is only used for chunk-size accounting,
# not for actual API calls.
from cognee.infrastructure.databases.vector.embeddings.LiteLLMEmbeddingEngine import (  # noqa: E402
    LiteLLMEmbeddingEngine,
)
from cognee.infrastructure.llm.tokenizer.TikToken import TikTokenTokenizer  # noqa: E402


def _patched_get_tokenizer(self):
    if "mistral" in self.provider.lower():
        return TikTokenTokenizer(model=None, max_completion_tokens=self.max_completion_tokens)
    return _original_get_tokenizer(self)


_original_get_tokenizer = LiteLLMEmbeddingEngine.get_tokenizer
LiteLLMEmbeddingEngine.get_tokenizer = _patched_get_tokenizer


# --- Third bug: LiteLLMEmbeddingEngine always sends `dimensions=...` to
# litellm's Mistral embedding call, which Mistral's API does not support. ---
#
# `LiteLLMEmbeddingEngine.embed_text()` does
# `if self.dimensions is not None: embedding_kwargs["dimensions"] = self.dimensions`.
# `self.dimensions` is never actually `None` at call time: cognee's
# `EmbeddingConfig.model_post_init` always resolves a concrete int (either
# the user's `EMBEDDING_DIMENSIONS`, an auto-detected value, or the
# `_FALLBACK_DIMENSIONS = 3072` default) before the engine is constructed.
# So for the `mistral` provider this `dimensions` kwarg is unconditionally
# forwarded to `litellm.aembedding(model="mistral/mistral-embed", ...)`,
# which raises:
#     litellm.UnsupportedParamsError: mistral does not support parameters:
#     {'dimensions': 1024}, for model=mistral-embed.
# litellm's own error message names the fix: `litellm.drop_params = True`
# silently drops provider-unsupported request params instead of raising.
# Scoped acceptably here because this project only ever runs one embedding
# provider per deployment (no runtime provider-swapping), so there is no
# case where a genuinely-required param gets silently dropped without our
# noticing during development.
import litellm  # noqa: E402

litellm.drop_params = True
