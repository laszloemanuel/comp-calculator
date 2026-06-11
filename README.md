# US Compensation Package Calculator

A single-file web app for modeling US compensation packages: net / gross / full
company cost, subcontractor hourly rates, configurable healthcare plans, a
candidate database with proposal history, and an optional AI proposal writer.

**No build step, no backend, no dependencies** — it's one `index.html` file.
All data (inputs, candidates, and your optional API key) lives only in the
visitor's browser via `localStorage`; nothing is uploaded.

## Features

- **Compensation** — base, bonus, 401(k), health; estimates employee net pay
  (2025 federal brackets + state + FICA), gross, and fully-loaded company cost.
- **Candidate model** — state, age, marital status, children feed the math
  (state tax, filing status, coverage tier).
- **Subcontractor rate** — derives an hourly rate from any package basis, with
  unpaid time-off folded in and an adjustment field to deviate.
- **Configurable healthcare plans** — add/edit plans and tiers in Parameters.
- **Candidates & history** — save each generation per candidate; load, export,
  or delete past snapshots.
- **Proposal editor** — Markdown template with `{{placeholders}}`, live preview,
  and export to **Markdown / HTML / Print-PDF**.
- **Optional AI** — generates/polishes the proposal via the Anthropic API using
  the visitor's *own* key (bring-your-own-key; see below).

## Run locally

Just open `index.html` in any modern browser. That's it.

## The AI feature has two modes

The AI proposal writer is **optional** and works in either of two ways — the
front-end auto-detects which is available:

1. **Keyless backend (recommended for a public site).** If you deploy with the
   included serverless function and set your `ANTHROPIC_API_KEY` as a server
   environment variable, visitors get AI with **no key of their own**. The key
   never reaches the browser; the function builds the prompt server-side and
   only the proposal text comes back. See *Deploy with keyless AI* below.
2. **Bring-your-own-key.** On a pure static host (e.g. GitHub Pages, where the
   function can't run), or for power users, a visitor can paste their **own**
   Anthropic key (from <https://console.anthropic.com/settings/keys>) in
   *AI settings*. It's stored only in their browser and used for a direct
   browser→API call. If a visitor enters their own key, it always takes priority.

> ⚠️ **Never put your own API key inside `index.html`.** It is a public page —
> anyone can view the source. The server key belongs only in the host's
> environment-variable settings (mode 1), never in committed code.

## Publish it

### Static only, bring-your-own-key — GitHub Pages

Free, versioned, custom-domain capable. The serverless function is simply
ignored (GitHub Pages can't run it), so AI works in **bring-your-own-key** mode.

1. Create a new repository on GitHub (e.g. `comp-calculator`).
2. Push this folder:
   ```sh
   git remote add origin https://github.com/<you>/comp-calculator.git
   git branch -M main
   git push -u origin main
   ```
3. **Settings → Pages → Source: Deploy from a branch → `main` / `/ (root)` → Save.**
4. Live at `https://<you>.github.io/comp-calculator/` in ~1 min.

Update later: edit `index.html`, then `git commit -am "update" && git push`.

### Deploy with keyless AI — Cloudflare Pages (recommended)

Serves the static site **and** the AI function from the same repo, free tier.

1. Push this repo to GitHub (steps above).
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git** →
   pick the repo. Build command: *(none)*. Output directory: `/` (root).
3. **Settings → Environment variables → add `ANTHROPIC_API_KEY` = `sk-ant-...`**,
   then redeploy.
4. The function at `functions/api/generate.js` serves `/api/generate`, and the
   app shows “✓ Keyless AI is available”.

### Deploy with keyless AI — Netlify

1. Push to GitHub, then Netlify → **Add new site → Import from Git** → pick the repo.
2. Netlify reads `netlify.toml` (publish `.`, functions in `netlify/functions`,
   `/api/generate` redirect — all included).
3. **Site settings → Environment variables → add `ANTHROPIC_API_KEY`**, redeploy.

The default proxy model is `claude-sonnet-4-6` (you pay per call). To force a
specific model or change the cap, edit `DEFAULT_MODEL` / `MAX_TOKENS` in
`functions/api/generate.js` (and the Netlify copy).

> **Abuse note for keyless mode:** the function caps output size, allowlists
> models, and builds the prompt server-side, but it has no per-user rate limit
> (serverless is stateless). For a high-traffic public site, add Cloudflare
> Turnstile / rate-limiting or Netlify's rate limits in front of `/api/generate`.

## Disclaimer

Estimates only — not tax, legal, or financial advice. Verify all figures with a
qualified payroll/tax professional before making or accepting an offer.

## License

MIT — see [LICENSE](LICENSE).
