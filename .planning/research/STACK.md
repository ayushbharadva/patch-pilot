# Stack Research

**Domain:** Cognee-powered incident-memory web app (FastAPI + Next.js + self-hosted Cognee)
**Researched:** 2026-06-30
**Confidence:** MEDIUM (Cognee API details verified against PyPI 1.2.2 + docs.cognee.ai; versions confirmed day-of)

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| cognee | 1.2.2 | Memory layer — graph + vector + SQLite, full lifecycle | Latest stable (released 2026-06-26); targets self-hosted OSS prize track; only lib that ships graph extraction + surgical forget in one package |
| FastAPI | 0.138.2 | Backend API between Next.js and Cognee | Latest stable (released 2026-06-29); async-native so Cognee's `await` calls fit without thread hacks; fastest Python web framework for I/O-heavy workloads |
| Python | 3.12 | Runtime for FastAPI + Cognee | Cognee requires 3.10–3.14; 3.12 is the current stable sweet spot with full async support and no deprecation risk |
| Next.js | 16.2.9 | Frontend — App Router, server components, client fetches | Latest stable (June 2026); App Router is the canonical pattern; Turbopack default; Node.js 20+ required |
| React | 19 (bundled with Next.js 16) | UI component layer | Shipped with Next.js 16; concurrent rendering, server components |
| OpenAI gpt-4o-mini | — | LLM for Cognee `cognify()` graph extraction | Required by spec; cheapest capable model for entity/relationship extraction; $10 cap is viable with small corpus |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| python-dotenv | >=1.0.0 | Load `.env` into process for Cognee env vars | Always — Cognee reads `LLM_API_KEY`, `LLM_PROVIDER`, `LLM_MODEL` from env |
| python-multipart | >=0.0.18 | Enable FastAPI `UploadFile` / `File(...)` | Required any time a FastAPI endpoint accepts file uploads (incident ingest) |
| uvicorn[standard] | >=0.34 | ASGI server for FastAPI | Always — `uvicorn main:app --reload` in dev; `--workers 1` in prod (Kuzu file-locking) |
| react-force-graph | latest | 2D/3D force-directed graph rendering | Memory Graph view — lightweight canvas, works for <10K nodes, dead-simple API: `<ForceGraph2D graphData={{nodes, links}} />` |
| tailwindcss | 4.x | Utility-first CSS | Aligns with Next.js 16 default setup; faster to theme the diagnosis card and drift badges than custom CSS |
| @tanstack/react-query | 5.x | Client-side async state / cache invalidation | Manages search results, polling graph status — eliminates boilerplate `useEffect` fetch chains |
| axios or native fetch | — | HTTP calls from Next.js to FastAPI | Use native `fetch` in Server Components; `axios` or `fetch` in Client Components — no extra dep needed |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| uv | Fast Python package manager | `uv pip install cognee fastapi uvicorn` — significantly faster than pip; works with standard requirements.txt |
| `next` CLI | Next.js dev server + build | `npx create-next-app@latest` scaffolds App Router + Tailwind + TypeScript; use `next dev --turbopack` |
| TypeScript | Type safety on Next.js side | Included in Next.js scaffold; catches FastAPI response shape mismatches at compile time |

---

## Cognee Configuration Reference

### Environment Variables (.env at project root, loaded by python-dotenv)

```bash
# LLM — graph extraction (cognify)
LLM_API_KEY="sk-..."           # OpenAI API key
LLM_PROVIDER="openai"
LLM_MODEL="openai/gpt-4o-mini"

# Embeddings — defaults to OpenAI text-embedding-3-small when LLM_PROVIDER=openai
# No extra vars needed unless switching providers.
# EMBEDDING_PROVIDER="openai"
# EMBEDDING_MODEL="openai/text-embedding-3-small"

# Persistence — write all Cognee data here instead of .cognee_system
SYSTEM_ROOT_DIRECTORY=".patchpilot_memory"
DATA_ROOT_DIRECTORY=".patchpilot_memory/data"

# Storage backends — defaults (no extra deps required for self-hosted single-user)
# GRAPH_DATABASE=kuzu          # file-based, default
# VECTOR_DATABASE=lancedb      # file-based, default
# RELATIONAL_DATABASE=sqlite   # file-based, default
```

### Default Storage Backends (no extra dependencies)

| Layer | Default | Where Data Lives |
|-------|---------|-----------------|
| Graph | Kuzu (file-based) | `SYSTEM_ROOT_DIRECTORY/databases/kuzu/` |
| Vector | LanceDB (file-based) | `SYSTEM_ROOT_DIRECTORY/databases/lancedb/` |
| Relational | SQLite | `SYSTEM_ROOT_DIRECTORY/databases/sqlite.db` |

All three are included in `pip install cognee`. No Postgres, Neo4j, or Docker required for hackathon self-hosted setup.

---

## Cognee API Reference — Exact Signatures

> Confidence: LOW-MEDIUM (verified against docs.cognee.ai + PyPI 1.2.2 + DeepWiki; confirm against installed package before shipping)

### Import

```python
import cognee
from cognee import SearchType
# Alternative: from cognee.api.v1.search import SearchType
```

### V1 Pipeline API

```python
# Ingest raw data into a named dataset
async def add(
    data: Union[BinaryIO, list[BinaryIO], str, list[str], DataItem, list[DataItem]],
    dataset_name: str = 'main_dataset',
    # ... advanced: user, node_set, incremental_loading, preferred_loaders, llm_config
) -> PipelineRunInfo

# Build knowledge graph from staged data
async def cognify(
    datasets: Union[str, list[str], list[UUID]] = None,  # None = all staged
    run_in_background: bool = False,
    # ... advanced: graph_model, chunker, chunk_size, custom_prompt
) -> Union[dict, list[PipelineRunInfo]]

# Query the knowledge graph
async def search(
    query_text: str,
    query_type: SearchType = SearchType.GRAPH_COMPLETION,
    datasets: Optional[Union[list[str], str]] = None,
    dataset_ids: Optional[Union[list[UUID], UUID]] = None,
    top_k: int = 15,
    include_references: bool = False,
    # ... advanced: node_type, system_prompt, session_id
) -> List[SearchResult]
```

### V2 Memory API (high-level, preferred for application code)

```python
# Ingest + cognify in one call (wrapper around add + cognify + improve)
async def remember(
    data: Any,
    dataset_name: str = 'main_dataset',
    self_improvement: bool = True,
    run_in_background: bool = False,
    # ... advanced same as add()
) -> RememberResult

# Query with auto-routing (wrapper around search)
async def recall(
    query_text: str,
    datasets: Optional[list[str]] = None,
    # ...
) -> ...

# Re-weight graph from feedback/corrections
async def improve() -> ...

# Surgical dataset removal
async def forget(dataset: str) -> ...
```

### Prune API (full reset / demo reseed)

```python
# Wipe raw data files only (preserves DB records)
await cognee.prune.prune_data()

# Wipe database stores (selective)
await cognee.prune.prune_system(
    graph: bool = True,    # Kuzu graph
    vector: bool = True,   # LanceDB vectors
    metadata: bool = False, # SQLite relational records
    cache: bool = True,    # pipeline caches
)

# Full reset (call both):
await cognee.prune.prune_data()
await cognee.prune.prune_system(metadata=True)

# Surgical single-dataset empty (prefer over prune for PatchPilot):
await cognee.datasets.empty_dataset(dataset_id)  # by UUID
# OR:
await cognee.forget(dataset="workarounds_v1_9")   # by name
```

### SearchType Enum — Key Values

```python
from cognee import SearchType

SearchType.GRAPH_COMPLETION          # default — full graph context + LLM-generated answer
SearchType.CHUNKS                    # raw semantic text segments (no LLM, just retrieval)
SearchType.CHUNKS_LEXICAL            # BM25 keyword matching
SearchType.RAG_COMPLETION            # classic RAG: retrieve chunks → LLM answer
SearchType.HYBRID_COMPLETION         # lexical + semantic + graph combined
SearchType.GRAPH_COMPLETION_DECOMPOSITION  # complex query → sub-query decomposition
SearchType.FEELING_LUCKY             # auto-select best type
```

**For PatchPilot dual-search recall:**
```python
# Recommendation (grounded answer + evidence sources)
graph_answer = await cognee.search(
    query_text=query,
    query_type=SearchType.GRAPH_COMPLETION,
    datasets=["incidents"],
)
# Evidence chunks (specific ticket text)
evidence = await cognee.search(
    query_text=query,
    query_type=SearchType.CHUNKS,
    datasets=["incidents"],
)
```

---

## FastAPI Patterns

### Async endpoint with Cognee call

```python
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import cognee

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js dev; add prod URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/remember")
async def remember_endpoint(file: UploadFile = File(...), dataset_name: str = "incidents"):
    content = await file.read()
    result = await cognee.remember(content.decode(), dataset_name=dataset_name)
    return {"status": result.status, "dataset": dataset_name}

@app.post("/api/recall")
async def recall_endpoint(query: str, datasets: list[str] = ["incidents"]):
    graph_results = await cognee.search(query, query_type=SearchType.GRAPH_COMPLETION, datasets=datasets)
    chunk_results = await cognee.search(query, query_type=SearchType.CHUNKS, datasets=datasets)
    return {"answer": graph_results, "evidence": chunk_results}
```

### Running Cognee at startup (load env)

```python
# main.py
from dotenv import load_dotenv
load_dotenv()  # must be before import cognee to pick up SYSTEM_ROOT_DIRECTORY etc.
import cognee
```

---

## Next.js Font Setup

```typescript
// app/layout.tsx
import { Space_Grotesk, Inter, IBM_Plex_Mono } from 'next/font/google'

const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
})

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
})

const ibmPlexMono = IBM_Plex_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${inter.variable} ${ibmPlexMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
```

Then in `tailwind.config.ts`:
```typescript
fontFamily: {
  sans: ['var(--font-inter)'],
  display: ['var(--font-space-grotesk)'],
  mono: ['var(--font-mono)'],
}
```

---

## Installation

```bash
# Python backend
pip install cognee==1.2.2 fastapi==0.138.2 "uvicorn[standard]" python-dotenv python-multipart
# or with uv:
uv pip install "cognee==1.2.2" "fastapi==0.138.2" "uvicorn[standard]" python-dotenv python-multipart

# Next.js frontend
npx create-next-app@16 patch-pilot-frontend --typescript --tailwind --app --no-src-dir
cd patch-pilot-frontend
npm install react-force-graph @tanstack/react-query
```

---

## Alternatives Considered

| Category | Recommended | Alternative | When to Use Alternative |
|----------|-------------|-------------|-------------------------|
| Graph store | Kuzu (default) | Neo4j | Multi-agent concurrent writes; production scale; not needed here |
| Vector store | LanceDB (default) | Pinecone / Qdrant | Cloud deployment, >1M vectors; not needed here |
| Relational | SQLite (default) | Postgres | Multi-user, concurrent writes; not needed for single-user demo |
| Graph viz | react-force-graph | @react-sigma (Sigma.js) | >10K nodes, WebGL required; overkill for hackathon |
| Graph viz | react-force-graph | Cytoscape.js | Algorithm-heavy analysis UIs; too heavy for simple incident graph |
| Client state | @tanstack/react-query | SWR | Prefer react-query for mutation + invalidation patterns; SWR is fine for read-heavy |
| CSS | Tailwind 4 | CSS Modules | Tailwind wins for velocity on hackathon timeline |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `cognee.prune.prune_system()` for per-dataset forget | Wipes ALL datasets globally, no dataset targeting | `cognee.forget(dataset="name")` or `cognee.datasets.empty_dataset(dataset_id)` |
| `allow_origins=["*"]` in CORSMiddleware | Security risk; breaks `allow_credentials=True` (browser rejects) | Explicit origin list: `["http://localhost:3000", "https://yourapp.com"]` |
| Next.js Pages Router | Outdated; App Router is default since Next 13; no `use client`/`use server` primitives | App Router (`app/` directory) |
| `getServerSideProps` / `getStaticProps` | Pages Router only, removed in App Router | Server Components (`async function Page()`) or `fetch()` with `cache: 'no-store'` |
| Cognee Cloud deployment | Loses "Best Use of Open Source" (MacBook) prize track | Self-hosted with `SYSTEM_ROOT_DIRECTORY=.patchpilot_memory/` |
| Neo4j / FalkorDB / Postgres for hackathon | Adds Docker infra complexity with no benefit for single-user app | Default Kuzu + LanceDB + SQLite (all file-based, zero extra setup) |
| Multiple uvicorn workers (`--workers N`) | Kuzu graph store uses file-based locking — concurrent workers corrupt graph | `--workers 1` only; single async worker is sufficient for demo |
| LangChain / LlamaIndex as orchestration layer | Cognee already IS the memory orchestration layer; adding another framework creates abstraction conflict | Direct Cognee API: `await cognee.remember(...)`, `await cognee.recall(...)` |
| OpenAI `gpt-4o` (full) for cognify | ~6x more expensive than gpt-4o-mini with marginal quality gain for entity extraction | `LLM_MODEL="openai/gpt-4o-mini"` — stays within $10 cap |

---

## Stack Patterns by Variant

**For the demo reseed (full reset before demo run):**
```python
await cognee.prune.prune_data()
await cognee.prune.prune_system(metadata=True)
# Then re-add seed data
await cognee.add(seed_data, dataset_name="incidents")
await cognee.cognify(datasets=["incidents"])
```

**For the Memory Drift → forget loop:**
```python
# Per-release dataset naming (surgical forget target)
await cognee.add(release_notes, dataset_name="workarounds_v1_9")
await cognee.cognify(datasets=["workarounds_v1_9"])
# Later, when v2.0 ships and v1_9 workarounds are stale:
await cognee.forget(dataset="workarounds_v1_9")
```

**For running Cognee inline in FastAPI (no separate service):**
Cognee runs in-process — just `import cognee` in your FastAPI app. No separate service, no port, no Docker. Cognee is a Python library, not a service. The file stores (Kuzu, LanceDB, SQLite) are accessed directly from the FastAPI process.

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| cognee==1.2.2 | Python 3.10–3.14 | Tested on 3.12; requires async runtime (asyncio) |
| fastapi==0.138.2 | Python >=3.10; pydantic v2 | Pydantic v2 is default; no v1 compat needed for greenfield |
| uvicorn[standard] | fastapi>=0.100 | `[standard]` includes websockets + httptools for production |
| Next.js 16.x | Node.js >=20.0.0 | Node 18 EOL Oct 2025; use Node 20 or 22 LTS |
| react-force-graph | React 18/19 | Works with Next.js 16 client components |
| @tanstack/react-query 5.x | React 18/19 | v5 breaking changes from v4; start with v5 for greenfield |

---

## Sources

- [cognee on PyPI](https://pypi.org/project/cognee/) — version 1.2.2, released 2026-06-26
- [FastAPI on PyPI](https://pypi.org/project/fastapi/) — version 0.138.2, released 2026-06-29
- [Next.js latest version June 2026](https://abhs.in/blog/nextjs-current-version-march-2026-stable-release-whats-new) — 16.2.9
- [Cognee SearchType docs](https://docs.cognee.ai/python-api/search-type) — all enum values and import path
- [Cognee add() docs](https://docs.cognee.ai/python-api/add) — exact signature with dataset_name
- [Cognee cognify() docs](https://docs.cognee.ai/python-api/cognify) — exact signature with datasets param
- [Cognee search() docs](https://docs.cognee.ai/python-api/search) — full signature, return type
- [Cognee prune docs](https://docs.cognee.ai/python-api/prune) — prune_data/prune_system signatures
- [Cognee remember() docs](https://docs.cognee.ai/core-concepts/main-operations/remember) — V2 API params
- [Cognee installation docs](https://docs.cognee.ai/getting-started/installation) — env vars
- [Cognee deployment docs](https://docs.cognee.ai/how-to-guides/cognee-sdk/deployment) — storage backends, SYSTEM_ROOT_DIRECTORY
- [Cognee GitHub](https://github.com/topoteretes/cognee) — main repo
- [FastAPI CORS docs](https://fastapi.tiangolo.com/tutorial/cors/) — CORSMiddleware
- [Next.js font optimization](https://nextjs.org/docs/14/app/building-your-application/optimizing/fonts) — next/font/google
- [Python API Reference (DeepWiki)](https://deepwiki.com/topoteretes/cognee/2.1-python-api-reference) — function locations
- [SearchType DEV Community post](https://dev.to/chinmay_bhosale_9ceed796b/search-types-in-cognee-1jo7) — search types overview
- [Graph viz comparison 2026](https://www.pkgpulse.com/guides/cytoscape-vs-vis-network-vs-sigma-graph-visualization-2026) — react-force-graph vs sigma vs cytoscape
- [Cognee self-hosted guide](https://www.bitdoze.com/cognee-self-host/) — Docker/persistence patterns
- [WeMakeDevs hackathon resources](https://www.wemakedevs.org/hackathons/cognee/resources) — memory lifecycle APIs

---
*Stack research for: PatchPilot (Cognee-powered incident-memory app)*
*Researched: 2026-06-30*
