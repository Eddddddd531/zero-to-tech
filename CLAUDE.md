# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Course material for a "零到全栈" curriculum (module 4.5 → 5), not a production app. The README documents module 4.5 (React → Next.js migration); the working tree has since moved on to module 5 (adding the FastAPI backend), so the README's project structure section is behind the code.

Two consequences that override normal instincts:

- **The Chinese comments are the product.** Most files open with a multi-line Chinese comment explaining *why* a pattern exists and what it replaced ("4.4 我们手搓 useRoute()，Next.js 替我们写好了那一摊"). These are the lesson. Do not strip, shorten, or translate them; when adding code to an annotated file, match that voice.
- **Superseded code is kept on purpose.** `backend/handmadeAPI.py` is a hand-rolled `http.server` API that `main.py` replaced — it stays for teaching contrast. Don't delete it as dead code.

## Running it

Needs **two processes**. Frontend alone renders, but every fetch fails and the UI silently falls back to `data/site.js`.

```bash
npm install
npm run dev                                   # → http://localhost:3000

cd backend                                    # cwd matters, see below
./.venv/bin/uvicorn main:app --reload         # → http://localhost:8000
```

`backend/.venv/` is Python 3.14 and gitignored; recreate with `python3 -m venv .venv && ./.venv/bin/pip install -r requirements.txt`.

**Run the backend from `backend/`.** `HISTORY_FILE = "history.json"` is a relative path, so `history.json` is created wherever uvicorn was launched, not next to `main.py`.

There are no tests, no linter, and no formatter configured. Don't invent commands for them; if verification is needed, exercise the endpoints (`curl localhost:8000/api/profile`) or drive the UI.

## Build

`next.config.mjs` sets `output: 'export'` — a **static export**, which is the single most constraining fact about the frontend:

- No API routes, no server actions, no middleware, no dynamic SSR. All data comes from the separate FastAPI process at runtime, client-side.
- `npm run build` emits `out/`. `npm run start` (`next start`) does not work with `output: 'export'` — serve `out/` as static files instead.
- Both `.next/` and `out/` are gitignored but present in the working tree.

## Architecture

### Two independent analysis paths

`POST /api/analyze` forks the submitted text into two paths that never touch each other, then merges the results into one record:

- **pypinyin** — `lazy_pinyin(text, Style.TONE)`, a per-character dictionary lookup. No segmentation, so no 多音字 context disambiguation. Non-Chinese characters pass through untouched, which is why `" ".join(...)` leaves floating punctuation in the output (`qīng ， shì`).
- **SnowNLP** — segment (TnT model) → drop stopwords → add-one-smoothed naive Bayes → `P(pos)`. `main.py` rounds to 2dp, then buckets at `≥0.6 / ≤0.4`.

Two properties of the sentiment score that look like bugs and aren't: the bundled model is trained on ~35k lines of **e-commerce product reviews**, so anything out of that domain scores oddly; and naive Bayes multiplies word probabilities, so longer text saturates toward 0 or 1 (a real `0.99936` displays as a confident-looking `1.00`). Read the score as a direction, not a magnitude.

### Content lives in two places on purpose

Homepage copy exists as both `data/site.js` (the `home` export) and the `profile` dict in `backend/main.py`. `HomeView` seeds state from the former, then overwrites it with `GET /api/profile`, logging and keeping the fallback on failure. This duplication is a deliberate teaching step — the seed for "数据与界面分离" noted in `data/site.js`. **Editing homepage text means editing both**, or the page visibly changes when the backend comes up.

`main.py`'s `profile` currently carries a stray marker comment (`# → 临时加的标记，验证完删掉`) from that exercise.

### Client/server component split

Every component is `"use client"` except `PageHeading.jsx` — the only one with no hooks or handlers. `AnimatedCardGrid` wraps both pages and drives an anime.js stagger over `.card` children, so `.card` defaults to `opacity: 0` in CSS and depends on JS to reveal it. `ResultCard` animates itself rather than relying on the grid.

`TextLabView` holds the lifted `result` state shared by its two children (`InputCard` posts, `ResultCard` renders).

### Wiring that breaks quietly

- **`NEXT_PUBLIC_API_BASE_URL`** in `.env.local` (`http://localhost:8000`) is the API base. `.gitignore` covers `.env*`, so a fresh clone has no value and every URL becomes `undefined/api/...`.
- **CORS is a hardcoded allowlist** of `http://localhost:3000` in `main.py`. If Next.js falls back to another port, every request fails preflight.
- `HomeView` swallows fetch errors to console; only `InputCard` surfaces them in the UI.

### Persistence

`save_record()` is read-modify-write over the whole file — parse all of `history.json`, append, rewrite. No locking, no atomic replace, O(n) per request. `GET /api/history` reloads, reverses the full list, then slices 10.

`backend/history.json` is **untracked and not gitignored**, and already holds real user entries — a blanket `git add .` will commit them.

## Frontend/backend contract

Nothing generates or validates this; both sides are hand-written and drift silently.

| Endpoint | Response | Consumed by |
|---|---|---|
| `GET /api/profile` | `{heroTitle, heroSubtitle, featuredWork{kicker,title,copy,linkLabel}, identity{motto,learning}}` | `HomeView` |
| `POST /api/analyze` | `{text, score, label, pinyin, created_at}` | `InputCard` → `ResultCard` |
| `GET /api/history` | array of the above, newest first, max 10 | **nothing yet** |

`HomeView` dereferences `data.featuredWork.kicker` and `data.identity.motto` unguarded, so dropping a nested key from `profile` crashes the render rather than falling back.
