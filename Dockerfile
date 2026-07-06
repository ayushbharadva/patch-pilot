# PatchPilot backend — built for Hugging Face Spaces (Docker SDK, free CPU
# tier: 2 vCPU / 16GB RAM). Render's free 512MB instance OOM-killed on every
# Cognee GRAPH_COMPLETION search (Render events, Jul 6); Cognee's
# graph+vector+LLM pipeline needs ~500MB+ resident, so the fix is a host
# with real memory, not more tuning.
#
# The Space provides no PORT env var — app_port in the Space README's
# front-matter must match PORT below (7860, the HF convention).
# LLM_API_KEY is injected as a Space secret, never baked into the image.

FROM python:3.12-slim

# Non-root uid 1000 per HF Spaces convention.
RUN useradd -m -u 1000 appuser

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ backend/
COPY scripts/ scripts/
COPY seed/ seed/

RUN chown -R appuser:appuser /app
USER appuser

ENV PYTHONPATH=/app \
    PORT=7860 \
    LLM_PROVIDER=mistral \
    LLM_MODEL=mistral/mistral-small-latest \
    EMBEDDING_PROVIDER=mistral \
    EMBEDDING_MODEL=mistral/mistral-embed \
    EMBEDDING_DIMENSIONS=1024 \
    MALLOC_ARENA_MAX=2

EXPOSE 7860

# Same boot path as Render: restore the demo snapshot onto the fresh disk,
# then serve (single worker — Kuzu is file-locked).
CMD ["bash", "scripts/render_start.sh"]
