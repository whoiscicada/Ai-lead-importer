# GrowEasy AI-Powered CSV Importer

Upload any CRM lead CSV — regardless of column names or layout — preview it, confirm the
import, and let Claude map every row onto the GrowEasy CRM schema. Imported and skipped
records are shown with reasons for anything that couldn't be mapped.

## Architecture

```
apps/web (Next.js, App Router)  --->  apps/server (Express + TypeScript)  --->  Claude (Anthropic API)
     CSV preview (papaparse)              CSV parsing (csv-parse)              AIProvider interface
     multipart upload                     batching + retry/backoff            ClaudeProvider impl
     results UI                           zod validation
```

- **Frontend** (`apps/web`): drag-and-drop upload, client-side preview via `papaparse`, then hands the
  raw file to the backend — the backend is the source of truth for parsing.
- **Backend** (`apps/server`): parses the CSV, splits rows into batches, sends each batch to Claude
  behind an `AIProvider` interface (so swapping providers is a one-file change), validates/repairs
  the AI's output, and assembles the final `ImportResult`.
- **AI provider**: `ClaudeProvider` calls `claude-sonnet-4-6` with a system prompt that encodes every
  mapping rule (enum values, date normalization, multi-email/phone handling, newline safety, row
  exclusion criteria). Responses are parsed defensively (strip code fences, `JSON.parse`, validate
  with `zod`), with one retry using a stricter prompt if parsing fails.

## Project structure

```
apps/
  web/     Next.js frontend
  server/  Express backend
```

## Setup

```bash
npm install          # installs both workspaces from the repo root
```

### Environment variables

`apps/server/.env` (copy from `apps/server/.env.example`):

```
PORT=8080
CORS_ORIGIN=http://localhost:3000
BATCH_SIZE=10
MAX_FILE_SIZE_MB=5
AI_CONCURRENCY=1

# This deployment runs AI extraction through OpenRouter (Claude Haiku) instead of
# a direct Anthropic key:
AI_TRANSPORT=openrouter
OPENROUTER_API_KEY=sk-or-xxxx
OPENROUTER_MODEL=anthropic/claude-haiku-4.5
OPENROUTER_MAX_TOKENS=2500

# Only needed if AI_TRANSPORT=anthropic (the assignment-spec default)
ANTHROPIC_API_KEY=
```

`apps/web/.env.local` (copy from `apps/web/.env.local.example`):

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

### Run locally

```bash
npm run dev:server   # starts Express on :8080
npm run dev:web      # starts Next.js on :3000
```

Open http://localhost:3000.

### Tests

```bash
npm run test:server  # vitest — validator + AI extractor logic (Anthropic client mocked)
```

## How the AI mapping works

1. The backend parses the CSV with `csv-parse`, preserving original headers as-is.
2. Rows are chunked into batches (`BATCH_SIZE`) and sent to the model with limited
   concurrency (`AI_CONCURRENCY`) to stay under rate limits.
3. Each batch's prompt instructs Claude to map arbitrary column names to the fixed CRM schema,
   normalize dates to ISO 8601, split multiple emails/phones (first one wins, rest go to
   `crm_note`), and omit rows with neither an email nor a phone number.
4. On a parse failure, the batch is retried once with a stricter "no prose" reminder; on
   repeated upstream failures the whole batch is retried up to 3 times with exponential backoff,
   then marked `"AI extraction failed"` for every row in that batch so one bad batch never crashes
   the whole import.
5. The backend re-validates every returned record: invalid `crm_status`/`data_source` values are
   blanked (not rejected), unparseable `created_at` values become `null`, and raw newlines are
   escaped to `\n` so every record still round-trips as a single CSV row.
6. Rows the model silently dropped (had contact info but weren't returned) are reported as
   `"AI omitted row"` rather than silently disappearing.

The model call sits behind an `AIProvider` interface (`apps/server/src/providers/AIProvider.ts`).
`ClaudeProvider` implements it four ways, selected by `AI_TRANSPORT`: a direct call to
`@anthropic-ai/sdk` (`claude-sonnet-4-6`, the assignment-spec default), or a plain `fetch` to
OpenRouter / Groq (both OpenAI-compatible `/chat/completions`) / Gemini's `generateContent`
endpoint. This deployment runs on OpenRouter with `anthropic/claude-haiku-4.5`.

## API reference

### `POST /api/import`

- **Request**: `multipart/form-data` with a single field `file` — a `.csv` file, max 5MB.
- **Response** `200 OK`:

```json
{
  "imported": [ { "created_at": "...", "name": "...", "...": "..." } ],
  "skipped": [ { "row": { "...": "..." }, "reason": "No email or mobile number" } ],
  "totalImported": 42,
  "totalSkipped": 3
}
```

- **Errors**:
  - `400` — malformed CSV, wrong file type, or missing file
  - `422` — no valid rows could be imported
  - `500` — upstream AI failure or missing server configuration

## Deployed URLs

- Frontend: https://ai-lead-importer-web.vercel.app
- Backend: https://groweasyserver-production-8e12.up.railway.app

## Known limitations / edge cases handled

- Rows with neither an email nor a phone number are excluded and reported as skipped, never fabricated.
- `crm_status` and `data_source` are always restricted to their fixed enum values (or `""`).
- `created_at` is always either `null` or a value `new Date()` can parse.
- Multiple emails/phones in one row: first one is kept in its field, the rest appended to `crm_note`.
- Raw newlines inside any field are replaced with literal `\n` so CSV round-tripping never breaks.
- A single failed AI batch (e.g. transient API error) doesn't fail the whole import — only the rows
  in that batch are marked skipped.
- Large result sets (>500 rows) are rendered with a virtualized table to keep the UI responsive.

## Deployment

Deployed as two separate services on Railway (backend) and Vercel (frontend):

1. **Backend** (Railway): new service from the GitHub repo, root directory `apps/server`,
   build command `npm run build --workspace=@groweasy/server`, start command
   `npm run start --workspace=@groweasy/server`, env vars set from the list above
   (`AI_TRANSPORT=openrouter` + `OPENROUTER_API_KEY` + `OPENROUTER_MODEL` +
   `OPENROUTER_MAX_TOKENS`), public domain generated under Settings → Networking.
2. **Frontend** (Vercel): import the repo, root directory `apps/web`,
   `NEXT_PUBLIC_API_BASE_URL` set to the Railway backend's public URL (must include
   `https://`, no trailing slash — this is a build-time value, redeploy after changing it).
3. Backend's `CORS_ORIGIN` set to the exact Vercel frontend URL (no trailing slash).

## Docker (optional)

```bash
docker compose up --build
```

Requires `apps/server/.env` to exist with valid credentials for whichever `AI_TRANSPORT` is set.
