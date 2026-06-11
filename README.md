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

## The AI feature is bring-your-own-key

The AI proposal writer is **optional**. Each visitor pastes their **own**
Anthropic API key (from <https://console.anthropic.com/settings/keys>) into
*AI settings*; it is stored only in their browser and used for direct
browser→API calls.

> ⚠️ **Never put your own API key in this file.** It is a public static page —
> anyone can view the source. A committed key can be stolen and abused. If you
> ever want users not to need their own key, replace the direct API call with a
> serverless proxy that holds the key on the server side.

## Publish it (static hosting)

### Option A — GitHub Pages (recommended: free, versioned, custom domain)

1. Create a new repository on GitHub (e.g. `comp-calculator`).
2. Push this folder:
   ```sh
   git remote add origin https://github.com/<you>/comp-calculator.git
   git branch -M main
   git push -u origin main
   ```
3. On GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a
   branch → Branch: `main` / `/ (root)` → Save.**
4. Your site goes live at `https://<you>.github.io/comp-calculator/` in ~1 min.

To update later: edit `index.html`, then `git commit -am "update" && git push`.

### Option B — Netlify Drop (fastest, no account juggling)

Go to <https://app.netlify.com/drop> and drag this folder onto the page. You get
an instant public URL. Optionally connect it to this Git repo for auto-deploys.

### Option C — Cloudflare Pages / Vercel

Connect the repo (or upload the folder) as a static site; no build command and
no output directory are needed.

## Disclaimer

Estimates only — not tax, legal, or financial advice. Verify all figures with a
qualified payroll/tax professional before making or accepting an offer.

## License

MIT — see [LICENSE](LICENSE).
