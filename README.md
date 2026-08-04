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
| `cowork.html` | Cowork task tiers, credits, skills, automation |
| `code.html` | Copilot Code |
| `scout.html` | Microsoft Scout |
| `custom-agents.html` | When to consider a custom agent |
| `compare.html` | Full side-by-side matrix |

## Tech

Static HTML + one shared `assets/styles.css` and `assets/nav.js` (injects the header, tabs and
footer on every page). No build step. Branding matches the mfg-365.com family: Copilot iridescent
gradient, navy hero/footer, Fluent/Segoe type, and the shared gradient "seed" glyph.

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
