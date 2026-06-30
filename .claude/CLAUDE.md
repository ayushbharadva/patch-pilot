<!-- GSD:project-start source:PROJECT.md -->

## Project

**PatchPilot**

PatchPilot is a living incident-memory system for small SaaS and engineering teams. It ingests tickets, chats, changelogs, and past fixes into Cognee, recalls prior incidents with root-cause recommendations backed by evidence, reinforces fixes engineers confirm, and — when a release ships — detects which old workarounds have gone stale (Memory Drift) and forgets them. The result is a self-maintaining incident brain that never recommends a fix the latest version already replaced.

*Tagline: every bug remembers its history.*

**Core Value:** The search → drift-detected → forget → re-search loop must work: searching a bug returns the old workaround, uploading a release marks it 🔴, forgetting it, then re-searching returns the new correct fix — visibly, in under 60 seconds. PatchPilot must be obviously impossible without Cognee's memory lifecycle.

### Constraints

- **Tech stack**: Next.js (App Router) frontend; FastAPI backend; Cognee self-hosted for memory — fixed by spec. Typefaces: Space Grotesk / Inter / IBM Plex Mono.
- **LLM**: OpenAI `gpt-4o-mini` for Cognee graph extraction (`cognify`). Only `cognify` incurs meaningful cost; recall/embeddings negligible.
- **Budget**: Hard $10 spending cap in the OpenAI dashboard; keep seed corpus small.
- **Timeline**: 5 effective build days (Jun 29 – Jul 3) + final submission Jul 4–5. Today is Jun 30 (Day 2).
- **Deploy persistence**: Cognee writes memory to disk; ephemeral filesystems (e.g. Render free tier) reset on redeploy — attach a persistent disk.
- **Disclosure**: AI-assistant usage must be declared in submission (house rule).

<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->

## Technology Stack

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

## Cognee Configuration Reference

### Environment Variables (.env at project root, loaded by python-dotenv)

# LLM — graph extraction (cognify)

# Embeddings — defaults to OpenAI text-embedding-3-small when LLM_PROVIDER=openai

# No extra vars needed unless switching providers.

# EMBEDDING_PROVIDER="openai"

# EMBEDDING_MODEL="openai/text-embedding-3-small"

# Persistence — write all Cognee data here instead of .cognee_system

# Storage backends — defaults (no extra deps required for self-hosted single-user)

# GRAPH_DATABASE=kuzu          # file-based, default

# VECTOR_DATABASE=lancedb      # file-based, default

# RELATIONAL_DATABASE=sqlite   # file-based, default

### Default Storage Backends (no extra dependencies)

| Layer | Default | Where Data Lives |
|-------|---------|-----------------|
| Graph | Kuzu (file-based) | `SYSTEM_ROOT_DIRECTORY/databases/kuzu/` |
| Vector | LanceDB (file-based) | `SYSTEM_ROOT_DIRECTORY/databases/lancedb/` |
| Relational | SQLite | `SYSTEM_ROOT_DIRECTORY/databases/sqlite.db` |

## Cognee API Reference — Exact Signatures

### Import

# Alternative: from cognee.api.v1.search import SearchType

### V1 Pipeline API

# Ingest raw data into a named dataset

# Build knowledge graph from staged data

# Query the knowledge graph

### V2 Memory API (high-level, preferred for application code)

# Ingest + cognify in one call (wrapper around add + cognify + improve)

# Query with auto-routing (wrapper around search)

# Re-weight graph from feedback/corrections

# Surgical dataset removal

### Prune API (full reset / demo reseed)

# Wipe raw data files only (preserves DB records)

# Wipe database stores (selective)

# Full reset (call both):

# Surgical single-dataset empty (prefer over prune for PatchPilot):

# OR:

### SearchType Enum — Key Values

# Recommendation (grounded answer + evidence sources)

# Evidence chunks (specific ticket text)

## FastAPI Patterns

### Async endpoint with Cognee call

### Running Cognee at startup (load env)

# main.py

## Next.js Font Setup

## Installation

# Python backend

# or with uv:

# Next.js frontend

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

## Stack Patterns by Variant

# Then re-add seed data

# Per-release dataset naming (surgical forget target)

# Later, when v2.0 ships and v1_9 workarounds are stale:

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| cognee==1.2.2 | Python 3.10–3.14 | Tested on 3.12; requires async runtime (asyncio) |
| fastapi==0.138.2 | Python >=3.10; pydantic v2 | Pydantic v2 is default; no v1 compat needed for greenfield |
| uvicorn[standard] | fastapi>=0.100 | `[standard]` includes websockets + httptools for production |
| Next.js 16.x | Node.js >=20.0.0 | Node 18 EOL Oct 2025; use Node 20 or 22 LTS |
| react-force-graph | React 18/19 | Works with Next.js 16 client components |
| @tanstack/react-query 5.x | React 18/19 | v5 breaking changes from v4; start with v5 for greenfield |

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

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
