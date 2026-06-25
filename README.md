# MenuRadar by StaGove

**Find the best meal your budget can actually buy.**
*Намери най-доброто ядене за бюджета си.*

MenuRadar is an autonomous food decision agent. You type one messy line —
`Пловдив, център, пилешко, 15 лв, сега` — and the agent searches live menu
data on the web, reads restaurant pages, checks whether your dish exists,
whether your budget actually covers a meal, and whether the place is open now.
It then ranks the top 3, rejects the weak matches, and explains its decision.

It is a PWA: installable to a phone home screen, launched from an icon, no app
store required.

---

## 1. What MenuRadar is

A decision agent, not a chatbot and not a Maps clone. It does the legwork a
person normally does by hand — open ten tabs, skim menus, compare prices, guess
the hours — and returns a ranked verdict with evidence and honest uncertainty.

## 2. How it works

The agent runs a real loop on every query:

1. **Parse** the free-text query into a structured goal (city, area, food,
   budget, time, language).
2. **Search** Google once via Serper for restaurants and menus.
3. **Filter** out social pages, directories and duplicates.
4. **Read** up to 5 candidate pages (server-side fetch + Cheerio text
   extraction).
5. **Fallback search** once, only if fewer than 3 usable pages were found.
6. **Evaluate** every candidate in a single AI pass against the goal and the
   current local time.
7. **Score** each on food match, budget fit, open-now, menu evidence and
   location — combined with fixed weights.
8. **Reject** weak matches (no menu, wrong food, over budget, low confidence).
9. **Rank** the survivors and return the top 3 with reasons.
10. **Report** what it did, why it chose the winner, and what is still uncertain.

After the top 3 are ranked, MenuRadar runs a **self-audit pass**: a second AI
review of its own decision that can demote or flag a pick if the evidence does
not support it. Each result also carries a **Google Maps link**, an explicit
**budget calculation** when concrete prices are found, and the app keeps a
**recent-search history**. A **"Why not ChatGPT?"** button shows the agent's
evidence-backed answer side by side with what a plain LLM returns from memory.

Scoring weights:

```
overall = food 0.30 + budget 0.25 + open-now 0.20 + evidence 0.15 + location 0.10
```

Candidates below 55 confidence are kept out of the top 3 unless nothing better
exists.

## 3. Why it is autonomous

Every run produces a **Proof of Autonomy** block built from real runtime
counters — not hardcoded. The agent interprets messy input, decides its own
search query, calls the web, opens multiple pages, extracts evidence, scores
and rejects options, and explains the trade-offs. None of those steps are the
user's to perform. The intelligence is in the judgement: deciding what to
search, what counts as evidence, what to throw away, and how confident to be.

## 4. Why it is not just ChatGPT

A plain LLM cannot open today's restaurant pages, read live menus, or verify a
price. Ask ChatGPT "where can I eat chicken in central Plovdiv for 15 lv right
now" and it guesses from stale training data, with no source and no current
hours. MenuRadar performs the actual workflow — live search, page reading,
budget math, open-now reasoning — and hands back a ranked decision with links
and confidence scores. The honesty rules matter here: if a price isn't on the
page, MenuRadar says **"Price not confirmed"** instead of inventing one.

## 5. Why it costs nothing to operate

- **Netlify** free static hosting (no Render-style sleep).
- **Netlify Functions** run the Serper call and page fetching server-side.
- **Serper.dev** free search tier covers MVP volume.
- **Groq** runs the LLM via a **server-side key** (`GROQ_API_KEY`) on Groq's
  free tier — no monetary cost while within free-tier limits. The single
  StaGove key is shared across users, so the free-tier rate limit is the thing
  to watch at scale; the proxy returns a clear "rate limit reached" message and
  the user can retry.
- **localStorage cache** (24h) cuts repeat API usage.
- No paid Google Maps / Places API. No database. No manual restaurant list.

---

## 6. Deploy to Netlify

**Option A — browser only (no terminal):**

1. Create a new GitHub repo and upload every file in this project, keeping the
   folder structure (`netlify/functions/...`, `icons/...`).
2. On [netlify.com](https://netlify.com) → **Add new site → Import an existing
   project** → pick the repo.
3. Build settings: leave the command empty, publish directory `.` (already set
   in `netlify.toml`). Deploy.

**Option B — drag & drop:** Netlify → **Sites** → drag the project folder in.
(Functions still deploy from `netlify/functions`.)

## 7. Add the Serper key on Netlify

1. Get a free key at [serper.dev](https://serper.dev).
2. Netlify → **Site settings → Environment variables → Add a variable**:
   - Key: `SERPER_API_KEY`
   - Value: your Serper key
3. **Redeploy** the site so the function picks it up.

The Serper key stays server-side and is never sent to the browser.

## 8. Add the Groq key on Netlify

The Groq key is server-side, exactly like the Serper key — users never touch it.

1. Get a free key at [console.groq.com/keys](https://console.groq.com/keys).
2. Netlify → **Site settings → Environment variables → Add a variable**:
   - Key: `GROQ_API_KEY`
   - Value: your Groq key
3. **Redeploy** the site so the function picks it up.

The key stays server-side (in the `groq` function) and is never sent to the
browser. The frontend only calls `/api/groq`.

## 9. Limitations

- Not every restaurant publishes a menu online; those won't appear.
- Prices on web pages may be outdated.
- Opening hours are often missing — the agent marks those as *unknown* rather
  than guessing.
- No paid Google Maps / Places API is used, so coverage depends on what's
  publicly indexed.

MenuRadar states this in-app: *"MenuRadar searches publicly available online
menu information. Restaurants without online menus may not appear."*

---

## 10. Delivery Directory entry

**Name:** MenuRadar by StaGove

**Short description:** Autonomous food decision agent that searches live public
menu data, evaluates budget fit, open-now status, menu evidence and food match,
then recommends the top 3 places to eat.

**Utility:** Solves the real problem of deciding where to eat under time,
budget, location and food constraints without manually checking restaurant
sites, menus, prices and opening hours.

**Access:** PWA deployed through Netlify. Installable on a phone home screen.

**Agentic nature:** MenuRadar interprets the user's goal, creates its own search
strategy, searches live web results, reads restaurant pages, evaluates evidence,
rejects weak options, ranks the strongest matches and explains its final
decision. The agentic core is the judgement layer — query construction,
evidence selection, rejection logic, confidence scoring and a self-audit pass
that reviews its own output — which cannot be reproduced by a spreadsheet or a
single static prompt, because the inputs (live pages) and the decisions (what
to keep, what to trust, what to demote) change on every run.

**Why not ChatGPT:** A plain ChatGPT chat requires the user to manually search,
open restaurant pages, compare menus and verify prices. MenuRadar performs that
workflow automatically and returns a ranked decision with evidence and
uncertainty scores.

**No recurring cost:** Netlify free hosting, Netlify Functions, Serper free
tier, Groq free tier (server-side key), localStorage caching.

---

## Project files

```
index.html              UI shell + all sections
styles.css              radar/phosphor theme, mobile-first
app.js                  agent loop, i18n (BG/EN), cache, scoring, render
manifest.webmanifest    PWA manifest
sw.js                   service worker (network-first HTML, cache-first assets)
netlify.toml            hosting + /api redirects + cache headers
package.json            cheerio dependency for the fetch function
netlify/functions/
  search.js             server-side Serper search (key hidden)
  fetch-page.js         page fetch + Cheerio extraction + SSRF guards
  groq.js               server-side Groq proxy (key hidden)
icons/
  icon-192.png          PWA icon
  icon-512.png          PWA icon
make-icons.py           regenerate the icons (optional)
```

---

MenuRadar · StaGove
