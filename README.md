# Tinted

**Foundation shade matching that works across the full range of skin tones —
plus a skincare routine builder.** Upload a photo and Tinted reads your depth
and undertone from your skin directly, matches you to real products, and
explains why each one was chosen. No camera, or don't want to upload your face?
A seven-question quiz gets you a routine instead.

> Shade matching is a genuinely hard problem that most tools solve badly for
> deep and neutral tones. Tinted samples many small skin patches, throws away
> the ones ruined by shadow or glare, and classifies the survivors against the
> [Monk Skin Tone scale](https://skintone.google/) — a 10-point scale built
> specifically to be more inclusive than the Fitzpatrick scale it replaced.

---

## How it works

```
photo
  │
  ├─ preprocess ............ white-balance correction
  ├─ face mesh ............. MediaPipe, 468 landmarks
  ├─ quality gate .......... blur / exposure / head angle, with a
  │                          specific reason when it rejects
  ├─ patch sampling ........ 17 landmark regions, outliers discarded
  ├─ aggregation ........... trimmed mean in Lab space
  ├─ classification ........ Monk Skin Tone level + undertone
  ├─ shade matching ........ CLIP-backed match over a shade catalogue
  └─ recommendations ....... Claude picks real products per category
```

The `/analyze-stream` endpoint emits each stage as a server-sent event, so the
UI can narrate the pipeline instead of showing a spinner.

### Why a quality gate

Getting a confidently wrong answer is worse than getting no answer. Bad
lighting, motion blur and a turned head all corrupt the colour reading in ways
that are invisible in the final number. The gate rejects those inputs *before*
classification and says which problem it found, so the fix is actionable
("hold your phone steady") rather than generic ("no face detected").

Its thresholds are resolution-dependent and tunable via environment variables —
see `backend/quality_gate.py`.

### Why a range, not one shade

The classifier has real uncertainty, especially under mixed lighting. Tinted
shows a shade range with match scores and lets you override the detected Monk
level by hand. An automated result the user can't correct is worse than no
result.

---

## Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 16, React 19, Tailwind CSS v4, Framer Motion |
| Backend | FastAPI, Python 3.11 |
| CV | MediaPipe Face Mesh, OpenCV, PyTorch |
| Matching | CLIP embeddings + Lab colour distance |
| AI | Claude (Haiku 4.5) for product recommendations |
| Auth | Supabase |
| Deploy | Vercel (web) + Render (API) |

---

## Running it locally

### Backend

```bash
cd backend
python3.11 -m venv .venv          # 3.11 — routes.py uses PEP 604 unions
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env              # add ANTHROPIC_API_KEY
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local  # set NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

### Tests

```bash
cd backend && python -m pytest tests/ -q     # 72 tests
```

There is also an offline accuracy harness in `backend/eval/` that scores the
classifier against a labelled test set — see `backend/eval/README.md`.

---

## API

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/health` | Liveness |
| `POST` | `/analyze` | Full pipeline, single JSON response |
| `POST` | `/analyze-stream` | Same pipeline, streamed per stage (SSE) |
| `POST` | `/match-foundation` | "I already wear X" → equivalents in other brands |
| `GET` | `/skincare-quiz/questions` | Question set (single source of truth for the UI) |
| `POST` | `/skincare-quiz` | Score answers → routine → products |
| `POST` | `/product-images` | Batched, cached product photo lookup |
| `POST` | `/search-product` | Image search for a single product |

### Cost and abuse controls

The paid upstreams (Claude, remove.bg) are protected by per-IP sliding-window
rate limits and a hard daily spend cap that fails closed at UTC midnight. Both
live in `backend/api/limits.py`. Counters are in-process, which is correct for
a single-instance deploy and documented as needing Redis if that ever changes.

---

## Design

The interface is deliberately near-neutral dark. This app's job is to show
colour accurately, and a tinted background shifts perceived skin tone — a warm
page makes every swatch read warmer, which corrupts the exact judgement the
product exists to make. The only saturated colour on screen belongs to the
shades and the product photos. The accent is bronze rather than pink for the
same reason: it sits beside every skin tone without competing with it.

Every text/surface pair is verified at WCAG AA for body text, with the measured
ratios recorded in `frontend/app/globals.css` so they can be re-checked.

Research behind the interface decisions is written up in
[`docs/frontend-research.md`](docs/frontend-research.md).

---

## Repository layout

```
tinted/
├── backend/
│   ├── api/            routes, rate limits, Claude calls, image lookup
│   ├── detection/      face mesh, patch sampling, Monk classifier
│   ├── eval/           offline accuracy harness
│   ├── tests/          pytest suite
│   ├── quality_gate.py pre-analysis input checks
│   └── skincare_quiz.py  question set + weighted tag scoring
├── frontend/
│   ├── app/            routes: /, /quiz, /profile, /lip-combo
│   ├── components/ui/  design-system primitives
│   └── lib/api.ts      typed API client
└── docs/
```
