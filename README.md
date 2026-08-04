# When to Use What · Copilot

A decision guide for choosing the right **Microsoft Copilot surface** for a task — part of the
[mfg-365.com](https://mfg-365.com) site collection.

It maps every surface onto one **autonomy spectrum** (*simpler & faster → more autonomous*) and
helps you pick between:

- **M365 Copilot Chat** — Search, Notebook, Create, Agents (incl. first-party Researcher & Analyst)
- **Copilot Cowork** — multi-artifact, multi-step tasks across Microsoft 365 (Light / Medium / Heavy)
- **Copilot Code** — natural-language software building
- **Microsoft Scout** — always-on, autonomous agent that runs your habits and coordinates your day
- **Custom Agents** — *when to consider* Agent Builder / Copilot Studio (not how to build)

## Structure

| Page | Purpose |
| --- | --- |
| `index.html` | Overview: the spectrum, at-a-glance matrix, Cowork/Code/Autopilots comparison |
| `decision-tree.html` | Ordered decision tree + quick chooser |
| `chat.html` | Copilot Chat modes, first-party agents, with/without a license |
| `cowork.html` | Cowork task tiers, skills, automation |
| `code.html` | Copilot Code |
| `scout.html` | Microsoft Scout |
| `custom-agents.html` | When to consider a custom agent |
| `compare.html` | Full side-by-side matrix |

## Tech

Static HTML + one shared `assets/styles.css` and `assets/nav.js` (injects the header, tabs and
footer on every page). No build step. Branding matches the mfg-365.com family: Copilot iridescent
gradient, navy hero/footer, Fluent/Segoe type, and the shared gradient "seed" glyph.

## The Advisor (hybrid recommender)

An embedded prompt box on the Overview page recommends a surface from a plain-language task.

**Phase 1 — deterministic (live, always on).** `assets/advisor.js` scores the input against a
weighted signal table across the five surfaces, plus a Chat sub-mode hint. No backend, no API
keys, nothing leaves the browser. This is also the permanent fallback.

Test it:

```powershell
node tools/test-advisor.js        # representative cases
node tools/test-advisor-hard.js   # adversarial phrasings
```

**Phase 2 — optional LLM enhancement.** If an endpoint is configured, the result is sent to a
serverless function that holds the model key **server-side** and returns a richer explanation.
Any failure (network, rate limit, cold start, bad JSON) silently degrades to the Phase 1 answer.

Enable by setting this **before** `advisor.js` loads:

```html
<script>window.ADVISOR_CONFIG = { endpoint: "https://<func>.azurewebsites.net/api/advise" };</script>
```

Function contract:

```jsonc
// POST request
{ "task": "prep for my customer meeting…", "suggested": "cowork", "confidence": "high" }
// 200 response
{ "surface": "cowork", "explanation": "one short paragraph" }
```

Implementation notes (matching what already works in this tenant):
- Use a **standalone Azure Function App**, not SWA managed functions — those failed with
  "content distribution" errors on a sibling project.
- Lock **CORS** to the production origin only.
- No RAG needed: the whole framework fits in the system prompt. Constrain output to the five
  surface IDs (`chat`, `cowork`, `code`, `scout`, `agent`), cap output tokens, and rate-limit by IP.

## Sister sites

Links marked `data-mfg-link="agents"` resolve automatically: `/agents/` on mfg-365.com,
otherwise the GitHub Pages URL. See `resolveSisterLinks()` in `assets/nav.js`.

## Local preview

```powershell
cd copilot-when-to-use-what
python -m http.server 8080
# open http://localhost:8080
```

## Publish (GitHub Pages)

1. Create a repo (e.g. `mfg-365/copilot-when-to-use-what`) and push `main`.
2. In **Settings → Pages**, set source to **Deploy from a branch**, branch `main`, folder `/ (root)`.
3. `.nojekyll` is included so asset folders are served as-is.

## Disclaimer

Internal decision aid. Product naming, capabilities, pricing and availability change frequently —
always confirm against current Microsoft documentation. Not an official Microsoft product page.
