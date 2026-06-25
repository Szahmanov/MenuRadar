/* ============================================================
   MenuRadar by StaGove — app.js  (v1.1)
   Autonomous food decision agent (client orchestrator).
   New in v1.1: self-audit revision pass, Google Maps links,
   search history, "Why not ChatGPT" compare, budget math.
   ============================================================ */

const CONFIG = {
  MAX_FETCH: 5,
  CACHE_TTL: 24 * 60 * 60 * 1000,
  WEIGHTS: { food: 0.30, budget: 0.25, open: 0.20, menu: 0.15, location: 0.10 },
  CONFIDENCE_MIN: 55,
  HISTORY_MAX: 5,
};

/* ---------- i18n ---------- */
const I18N = {
  bg: {
    "hero.title": "Намери най-доброто ядене за бюджета си.",
    "hero.sub": "Един ред. Агентът претърсва живи менюта, проверява бюджет, работно време и доказателства, прави самооценка — и решава вместо теб.",
    "input.placeholder": "Пловдив, център, пилешко, 15 лв, сега",
    "input.run": "Намери",
    "input.refresh": "Презареди (игнорирай кеша)",
    "key.button": "Groq ключ",
    "key.title": "Свържи своя безплатен Groq ключ",
    "key.sub": "MenuRadar използва твой собствен безплатен Groq ключ, за да няма повтарящи се разходи. Ключът се пази само в този браузър (localStorage) и се праща директно към Groq.",
    "key.get": "Вземи безплатен ключ от console.groq.com →",
    "key.save": "Запази",
    "key.clear": "Изтрий",
    "history.title": "Скорошни търсения",
    "goal.title": "Разчетена цел",
    "results.title": "Топ 3 препоръки",
    "rejected.title": "Отхвърлени опции",
    "audit.title": "Самооценка на решението",
    "report.title": "Автономен доклад за решението",
    "proof.title": "Доказателство за автономност",
    "compare.button": "Защо не просто ChatGPT?",
    "compare.title": "MenuRadar срещу обикновен LLM",
    "disclaimer.text": "MenuRadar търси публично достъпна онлайн информация за менюта. Ресторанти без онлайн меню може да не се появят. Цените и работното време може да са остарели — винаги потвърждавай преди да тръгнеш.",
    steps: ["Разчитам целта", "Търся ресторанти", "Чета менюта", "Проверявам бюджет", "Проверявам работно време", "Класирам опции", "Правя самооценка", "Подготвям доклад"],
    cache: () => `Показани са кеширани резултати от по-рано. Включи „Презареди“ за свежо търсене.`,
    chip: { city: "град", area: "район", food: "храна", budget: "бюджет", time: "момент", priority: "приоритет" },
    rank: "ВОДЕЩ",
    why: "Защо е избран", left: "Какво остава неясно", source: "Източник", maps: "Виж на картата",
    budgetCalc: "Сметка",
    auditFlag: "Бележка от самооценката",
    auditConfirmed: "Самооценката потвърди класирането без промени.",
    auditAdjusted: "Самооценката коригира класирането:",
    report: {
      goal: "Цел на потребителя", strategy: "Стратегия за търсене", pages: "Прегледани страници",
      menus: "Анализирани менюта", criteria: "Критерии за избор", audit: "Резултат от самооценката",
      chosen: "Защо водещият", rejected: "Защо отпаднаха другите", confidence: "Ниво на увереност", next: "Следваща стъпка",
    },
    proof: {
      parsed: (g) => `Разчетох целта: ${g}`,
      query: (q) => `Създадох автоматично заявка: „${q}“`,
      search: (n) => `Претърсих Google през Serper и върнах ${n} резултата`,
      read: (n) => `Прочетох ${n} страници с менюта`,
      reject: (n) => `Отхвърлих ${n} слаби съвпадения`,
      rank: (n) => `Класирах ${n} проверени опции`,
      audit: (v) => `Направих самооценка на собственото си решение (${v})`,
      choose: (name) => `Избрах най-добрия резултат (${name}) по храна, бюджет, работно време и доказателства`,
    },
    compare: {
      llmLabel: "Обикновен LLM (без живи данни)",
      mrLabel: "MenuRadar (живи данни)",
      mrBody: (n, name, price, host) => `Прочете ${n} живи страници. Водещ: ${name} — ${price}. Източник: ${host}.`,
      note: "Обикновеният LLM отговаря по памет, без да отваря менюта, без цени в реално време и без източник. MenuRadar върши реалната работа.",
      loading: "Питам обикновен LLM…",
    },
    none: "Не успях уверено да потвърдя добра опция от наличните онлайн менюта. Опитай по-голям район, по-широк тип храна или по-висок бюджет.",
    err: {
      groqkey: "Сървърът няма GROQ_API_KEY. Добави го в Netlify → Environment variables.",
      rate: "Groq лимитът е достигнат. Опитай пак след малко.",
      serper: "Сървърът няма SERPER_API_KEY. Добави го в Netlify → Environment variables.",
      search: "Търсенето се провали. Провери връзката и опитай отново.",
      ai: "AI върна невалиден отговор. Опитай отново.",
      empty: "Въведи заявка, напр. „Пловдив, център, пилешко, 15 лв, сега“.",
    },
    nextAction: () => `Потвърди работното време по телефона за избрания ресторант, преди да тръгнеш. Ако искаш повече опции — разшири района или вдигни бюджета.`,
  },
  en: {
    "hero.title": "Find the best meal your budget can actually buy.",
    "hero.sub": "One line. The agent scans live menus, checks budget, hours and evidence, self-audits — then decides for you.",
    "input.placeholder": "Sofia, Studentski Grad, pizza, 20 BGN, tonight",
    "input.run": "Find",
    "input.refresh": "Force refresh (ignore cache)",
    "key.button": "Groq key",
    "key.title": "Connect your free Groq key",
    "key.sub": "MenuRadar uses your own free Groq key so there is no recurring cost. The key is stored only in this browser (localStorage) and sent directly to Groq.",
    "key.get": "Get a free key at console.groq.com →",
    "key.save": "Save",
    "key.clear": "Clear",
    "history.title": "Recent searches",
    "goal.title": "Parsed goal",
    "results.title": "Top 3 recommendations",
    "rejected.title": "Rejected options",
    "audit.title": "Decision self-audit",
    "report.title": "Autonomous decision report",
    "proof.title": "Proof of autonomy",
    "compare.button": "Why not just ChatGPT?",
    "compare.title": "MenuRadar vs a plain LLM",
    "disclaimer.text": "MenuRadar searches publicly available online menu information. Restaurants without online menus may not appear. Prices and opening hours may be outdated — always confirm before you go.",
    steps: ["Understanding food goal", "Searching restaurants", "Reading menus", "Checking budget fit", "Checking open-now status", "Ranking options", "Self-auditing", "Preparing decision report"],
    cache: () => `Showing cached results from earlier. Tick “Force refresh” for a fresh search.`,
    chip: { city: "city", area: "area", food: "food", budget: "budget", time: "when", priority: "priority" },
    rank: "TOP PICK",
    why: "Why selected", left: "What remains uncertain", source: "Source", maps: "View on map",
    budgetCalc: "Budget math",
    auditFlag: "Self-audit note",
    auditConfirmed: "Self-audit confirmed the ranking with no changes.",
    auditAdjusted: "Self-audit adjusted the ranking:",
    report: {
      goal: "User goal", strategy: "Search strategy", pages: "Pages searched",
      menus: "Menus analyzed", criteria: "Selection criteria", audit: "Self-audit result",
      chosen: "Why top result", rejected: "Why others rejected", confidence: "Confidence level", next: "Next best action",
    },
    proof: {
      parsed: (g) => `Parsed the goal: ${g}`,
      query: (q) => `Created a search query automatically: “${q}”`,
      search: (n) => `Searched Google via Serper and returned ${n} results`,
      read: (n) => `Read ${n} restaurant/menu pages`,
      reject: (n) => `Rejected ${n} weak matches`,
      rank: (n) => `Ranked ${n} verified options`,
      audit: (v) => `Self-audited its own decision (${v})`,
      choose: (name) => `Chose the best result (${name}) on food, budget, open-now and evidence`,
    },
    compare: {
      llmLabel: "Plain LLM (no live data)",
      mrLabel: "MenuRadar (live data)",
      mrBody: (n, name, price, host) => `Read ${n} live pages. Top pick: ${name} — ${price}. Source: ${host}.`,
      note: "A plain LLM answers from memory — no menus opened, no real-time prices, no source. MenuRadar does the actual work.",
      loading: "Asking a plain LLM…",
    },
    none: "I could not confidently verify a good option from available online menus. Try a larger area, broader food type, or higher budget.",
    err: {
      groqkey: "Server is missing GROQ_API_KEY. Add it in Netlify → Environment variables.",
      rate: "Groq rate limit reached. Try again shortly.",
      serper: "Server is missing SERPER_API_KEY. Add it in Netlify → Environment variables.",
      search: "Search failed. Check your connection and try again.",
      ai: "The AI returned an invalid response. Try again.",
      empty: "Enter a query, e.g. “Sofia, Studentski Grad, pizza, 20 BGN, tonight”.",
    },
    nextAction: () => `Call the chosen restaurant to confirm hours before you go. Want more options — widen the area or raise the budget.`,
  },
};

const EXAMPLES = {
  bg: ["Пловдив, център, пилешко, 15 лв, сега", "София, Студентски град, пица, 20 лв", "Варна, морска градина, риба, 25 лв", "Бургас, център, дюнер, 10 лв"],
  en: ["Sofia, Studentski Grad, pizza, 20 BGN, tonight", "Plovdiv, center, chicken, 15 BGN, now", "Varna, sea garden, fish, 25 BGN", "Burgas, center, doner, 10 BGN"],
};

/* ---------- State ---------- */
let LANG = localStorage.getItem("mr_lang") || "bg";
let lastRun = null;
const t = (k) => (I18N[LANG][k] ?? k);

/* ---------- DOM ---------- */
const $ = (id) => document.getElementById(id);
const el = {
  query: $("queryInput"), run: $("runBtn"), refresh: $("forceRefresh"),
  examples: $("examples"), history: $("historyRow"), lang: $("langToggle"),
  progress: $("progress"), steps: $("steps"),
  goalPanel: $("goalPanel"), goalChips: $("goalChips"), cacheNote: $("cacheNote"),
  resultsPanel: $("resultsPanel"), results: $("results"), compareBtn: $("compareBtn"),
  rejectedPanel: $("rejectedPanel"), rejected: $("rejected"),
  auditPanel: $("auditPanel"), audit: $("audit"),
  comparePanel: $("comparePanel"), compare: $("compare"),
  reportPanel: $("reportPanel"), report: $("report"),
  proofPanel: $("proofPanel"), proof: $("proof"),
  errorPanel: $("errorPanel"), errorMsg: $("errorMsg"),
};

/* ============================================================
   i18n application
   ============================================================ */
function applyI18n() {
  document.documentElement.lang = LANG;
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.getAttribute("data-i18n"));
  });
  document.querySelectorAll("[data-i18n-ph]").forEach((node) => {
    node.setAttribute("placeholder", t(node.getAttribute("data-i18n-ph")));
  });
  el.lang.textContent = LANG.toUpperCase();
  el.query.placeholder = t("input.placeholder");
  el.compareBtn.textContent = t("compare.button");
  renderExamples();
  renderHistory();
}

function renderExamples() {
  el.examples.innerHTML = "";
  EXAMPLES[LANG].forEach((ex) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "example-chip"; b.textContent = ex;
    b.onclick = () => { el.query.value = ex; el.query.focus(); };
    el.examples.appendChild(b);
  });
}

el.lang.onclick = () => {
  LANG = LANG === "bg" ? "en" : "bg";
  localStorage.setItem("mr_lang", LANG);
  applyI18n();
};

/* ============================================================
   Search history
   ============================================================ */
function getHistory() {
  try { return JSON.parse(localStorage.getItem("mr_history") || "[]"); } catch { return []; }
}
function pushHistory(raw) {
  let h = getHistory().filter((x) => x !== raw);
  h.unshift(raw);
  h = h.slice(0, CONFIG.HISTORY_MAX);
  localStorage.setItem("mr_history", JSON.stringify(h));
  renderHistory();
}
function renderHistory() {
  const h = getHistory();
  if (!h.length) { el.history.hidden = true; el.history.innerHTML = ""; return; }
  el.history.hidden = false;
  el.history.innerHTML =
    `<span class="history-label">${esc(t("history.title"))}</span>` +
    h.map((q) => `<button type="button" class="history-chip">${esc(q)}</button>`).join("");
  el.history.querySelectorAll(".history-chip").forEach((b, i) => {
    b.onclick = () => { el.query.value = h[i]; runAgent(); };
  });
}

/* ============================================================
   Cache
   ============================================================ */
function cacheKey(goal) {
  const norm = (s) => (s || "").toString().toLowerCase().trim().replace(/\s+/g, "");
  return "mr_cache_" + [norm(goal.city), norm(goal.area), norm(goal.food), goal.budget ?? "x", norm(goal.timeContext)].join("|");
}
function readCache(goal) {
  try {
    const raw = localStorage.getItem(cacheKey(goal));
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (Date.now() - obj.ts > CONFIG.CACHE_TTL) return null;
    return obj.data;
  } catch { return null; }
}
function writeCache(goal, data) {
  try { localStorage.setItem(cacheKey(goal), JSON.stringify({ ts: Date.now(), data })); } catch {}
}

/* ============================================================
   Groq client (via server-side proxy /api/groq)
   ============================================================ */
async function callGroq(system, user, { json = true } = {}) {
  const res = await fetch("/api/groq", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      json,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    if (body.error === "missing_groq_key") throw new AgentError("groqkey");
    if (body.error === "rate_limited") throw new AgentError("rate");
    throw new AgentError("ai", `groq ${res.status}`);
  }
  const data = await res.json();
  const content = data.content || "";
  if (!json) return content;
  return parseJsonLoose(content);
}

function parseJsonLoose(text) {
  try { return JSON.parse(text); } catch {}
  const cleaned = text.replace(/```json|```/g, "").trim();
  try { return JSON.parse(cleaned); } catch {}
  const first = cleaned.indexOf("{"), last = cleaned.lastIndexOf("}");
  if (first !== -1 && last !== -1) {
    try { return JSON.parse(cleaned.slice(first, last + 1)); } catch {}
  }
  throw new AgentError("ai");
}

class AgentError extends Error {
  constructor(code, detail) { super(code); this.code = code; this.detail = detail; }
}

/* ============================================================
   Progress controller
   ============================================================ */
function initSteps() {
  el.steps.innerHTML = "";
  I18N[LANG].steps.forEach((label, i) => {
    const li = document.createElement("li");
    li.textContent = label; li.dataset.i = i;
    el.steps.appendChild(li);
  });
}
function setStep(i) {
  [...el.steps.children].forEach((li, idx) => {
    li.classList.toggle("done", idx < i);
    li.classList.toggle("active", idx === i);
  });
}
function finishSteps() {
  [...el.steps.children].forEach((li) => { li.classList.remove("active"); li.classList.add("done"); });
}

/* ============================================================
   Agent steps
   ============================================================ */
async function parseQuery(raw) {
  const system =
    "You are the intent parser for MenuRadar, an autonomous food decision agent operating in Bulgaria. " +
    "Extract a structured goal from the user's free-text query. The query may be Bulgarian or English and may be messy. " +
    "Keep city, area and food in the user's ORIGINAL language and script — do not translate them. " +
    "budget is a number or null. currency defaults to 'BGN'. " +
    "timeContext is one of: now, tonight, lunch, later, unspecified. " +
    "Output ONLY a JSON object, no markdown, with keys: " +
    "city, area, food, budget, currency, timeContext, dietaryConstraints (array), priority (short string), language ('bg' or 'en').";
  const goal = await callGroq(system, `Query: ${raw}`);
  goal.currency = goal.currency || "BGN";
  goal.language = goal.language === "en" ? "en" : "bg";
  if (typeof goal.budget === "string") {
    const n = parseFloat(goal.budget.replace(",", "."));
    goal.budget = isNaN(n) ? null : n;
  }
  return goal;
}

function buildSearchQuery(goal) {
  const parts = [goal.city, goal.area, goal.food].filter(Boolean);
  const tail = goal.language === "en" ? "restaurant menu price" : "ресторант меню цена";
  return [...parts, tail].join(" ").trim();
}

async function runSearch(query, goal) {
  const res = await fetch("/api/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, num: 8, gl: "bg", hl: goal.language === "en" ? "en" : "bg" }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    if (body.error === "missing_serper_key") throw new AgentError("serper");
    throw new AgentError("search");
  }
  const data = await res.json();
  return Array.isArray(data.organic) ? data.organic : [];
}

const SKIP_DOMAINS = ["instagram.com", "facebook.com", "tiktok.com", "youtube.com", "wikipedia.org", "tripadvisor.", "booking.com"];
function filterResults(organic) {
  const seen = new Set();
  return organic.filter((r) => {
    if (!r.link) return false;
    let host;
    try { host = new URL(r.link).hostname.replace(/^www\./, ""); } catch { return false; }
    if (SKIP_DOMAINS.some((d) => host.includes(d))) return false;
    if (seen.has(host)) return false;
    seen.add(host);
    return true;
  });
}

async function fetchPages(results) {
  const targets = results.slice(0, CONFIG.MAX_FETCH);
  const settled = await Promise.allSettled(
    targets.map(async (r) => {
      const res = await fetch("/api/fetch-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: r.link }),
      });
      if (!res.ok) return null;
      const page = await res.json();
      if (!page || (!page.text && !page.description)) return null;
      return { url: page.url || r.link, title: page.title || r.title, description: page.description || r.snippet, text: page.text || "" };
    })
  );
  return settled.map((s) => (s.status === "fulfilled" ? s.value : null)).filter(Boolean);
}

async function analyzeCandidates(goal, candidates) {
  const now = new Date();
  const nowStr = now.toLocaleString(goal.language === "en" ? "en-GB" : "bg-BG", { weekday: "long", hour: "2-digit", minute: "2-digit" });
  const system =
    "You are the evaluation core of MenuRadar, an autonomous food decision agent. " +
    "You receive the user's structured goal, the current local day/time, and candidate restaurant pages " +
    "(url, title, description, extracted text). For EACH candidate, judge ONLY from the provided evidence. " +
    "NEVER invent prices, dishes or opening hours. If evidence is missing, say so and lower the score and confidence. " +
    "Write 'reason' and 'uncertainty' in the user's language (goal.language). " +
    "If concrete dish prices are present, set 'budgetMath' to a short equation string such as '11.90 + 2.50 = 14.40 <= 15'. Otherwise set budgetMath to null. " +
    "Return ONLY JSON: {\"candidates\":[{" +
    "url, name, matchingDishes (array), estimatedPrice (string or 'Price not confirmed'), priceConfirmed (boolean), budgetMath (string or null), " +
    "budgetVerdict ('within budget'|'over budget'|'budget likely fits'|'budget unclear'), " +
    "openNowVerdict ('confirmed'|'likely'|'unknown'|'likely closed'), " +
    "menuFreshness ('confirmed'|'recent'|'unknown'), " +
    "food_match_score, budget_fit_score, open_now_score, menu_evidence_score, location_fit_score, confidence_score, " +
    "reason, uncertainty, rejectReason (null or short string)}]}. " +
    "All scores are integers 0-100. reason < 240 chars, uncertainty < 160 chars. " +
    "name is the restaurant name; if unknown, use the page title.";
  const trimmed = candidates.map((c) => ({
    url: c.url, title: (c.title || "").slice(0, 140),
    description: (c.description || "").slice(0, 300), text: (c.text || "").slice(0, 4500),
  }));
  const user = `Goal: ${JSON.stringify(goal)}\nLocal time now: ${nowStr}\nCandidates:\n${JSON.stringify(trimmed)}`;
  const out = await callGroq(system, user);
  return Array.isArray(out.candidates) ? out.candidates : [];
}

/* ---- Self-audit revision pass ---- */
async function auditDecision(goal, top) {
  const system =
    "You are the self-audit layer of MenuRadar. You are shown the agent's OWN top picks (with scores, verdicts and reasons) " +
    "and the user's goal. Critically review the agent's own decision: are the confidence scores justified by the evidence? " +
    "Was anything over-ranked? Should a pick be demoted or flagged for the user? Be conservative — only change something if the " +
    "evidence clearly does not support it. Return ONLY JSON: " +
    "{\"verdict\":\"confirmed\"|\"adjusted\", \"adjustments\":[{\"url\":\"...\",\"action\":\"keep\"|\"demote\"|\"flag\",\"note\":\"short, in the user's language\"}], \"summary\":\"one sentence in the user's language\"}.";
  const slim = top.map((c) => ({
    url: c.url, name: c.name, overall_score: c.overall_score, confidence_score: c.confidence_score,
    budgetVerdict: c.budgetVerdict, openNowVerdict: c.openNowVerdict, menuFreshness: c.menuFreshness,
    estimatedPrice: c.estimatedPrice, reason: c.reason,
  }));
  const user = `Goal: ${JSON.stringify(goal)}\nMy top picks:\n${JSON.stringify(slim)}`;
  return await callGroq(system, user);
}

/* ---- "Why not ChatGPT" plain-LLM answer ---- */
async function plainLLM(raw) {
  const system =
    "You are a generic chatbot with NO internet access and NO live data. Answer the user's restaurant question " +
    "ONLY from general training knowledge. Keep it under 80 words. Do not claim current prices or opening hours. " +
    "Answer in the same language as the user.";
  return await callGroq(system, raw, { json: false });
}

/* ============================================================
   Scoring / ranking
   ============================================================ */
const num = (v) => Math.max(0, Math.min(100, parseInt(v, 10) || 0));
function computeOverall(c) {
  const w = CONFIG.WEIGHTS;
  return Math.round(
    num(c.food_match_score) * w.food + num(c.budget_fit_score) * w.budget +
    num(c.open_now_score) * w.open + num(c.menu_evidence_score) * w.menu +
    num(c.location_fit_score) * w.location
  );
}

function rankAndReject(scored) {
  const withOverall = scored.map((c) => ({ ...c, overall_score: computeOverall(c) }));
  const hardReject = (c) =>
    c.rejectReason || num(c.menu_evidence_score) < 20 || num(c.food_match_score) < 25 || c.budgetVerdict === "over budget";

  const hardRejected = [], pool = [];
  withOverall.forEach((c) => (hardReject(c) ? hardRejected.push({ ...c, why: rejectWhy(c) }) : pool.push(c)));
  pool.sort((a, b) => b.overall_score - a.overall_score);

  const confident = pool.filter((c) => num(c.confidence_score) >= CONFIG.CONFIDENCE_MIN);
  const lowconf = pool.filter((c) => num(c.confidence_score) < CONFIG.CONFIDENCE_MIN);
  const ordered = confident.concat(lowconf);
  return { top: ordered.slice(0, 3), reserve: ordered.slice(3), hardRejected };
}

function applyAudit(top, reserve, audit) {
  const flags = {};
  if (!audit || !Array.isArray(audit.adjustments)) return { top, reserve, flags };
  let newTop = [...top], newReserve = [...reserve];
  audit.adjustments.forEach((a) => {
    if (!a || !a.url) return;
    if (a.action === "flag") flags[a.url] = a.note || "";
    if (a.action === "demote") {
      const i = newTop.findIndex((c) => c.url === a.url);
      if (i !== -1) {
        const [c] = newTop.splice(i, 1);
        c.auditDemoted = a.note || (LANG === "bg" ? "деградиран при самооценка" : "demoted on self-audit");
        newReserve.unshift(c);
      }
    }
  });
  while (newTop.length < 3 && newReserve.length) {
    const c = newReserve.shift();
    if (c.auditDemoted) { newReserve.push(c); break; }
    newTop.push(c);
  }
  return { top: newTop, reserve: newReserve, flags };
}

function rejectWhy(c) {
  if (c.auditDemoted) return c.auditDemoted;
  if (c.rejectReason) return c.rejectReason;
  if (num(c.menu_evidence_score) < 20) return LANG === "bg" ? "няма доказателство за меню" : "menu not found";
  if (num(c.food_match_score) < 25) return LANG === "bg" ? "слабо съвпадение по храна" : "food match weak";
  if (c.budgetVerdict === "over budget") return LANG === "bg" ? "над бюджета" : "over budget";
  if (num(c.confidence_score) < CONFIG.CONFIDENCE_MIN) return LANG === "bg" ? "цена непотвърдена и ниска увереност" : "price not confirmed, low confidence";
  return LANG === "bg" ? "по-нисък общ резултат" : "lower overall score";
}

/* ============================================================
   Render
   ============================================================ */
function show(node) { node.hidden = false; }
function hide(node) { node.hidden = true; }
function clearAll() {
  [el.goalPanel, el.resultsPanel, el.rejectedPanel, el.auditPanel, el.comparePanel, el.reportPanel, el.proofPanel, el.errorPanel].forEach(hide);
  el.cacheNote.hidden = true;
  el.compareBtn.hidden = true;
  el.compare.innerHTML = "";
}

function mapsUrl(name, city) {
  const q = encodeURIComponent([name, city].filter(Boolean).join(" "));
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

function renderGoal(goal, cached) {
  const c = I18N[LANG].chip;
  const rows = [
    [c.city, goal.city], [c.area, goal.area], [c.food, goal.food],
    [c.budget, goal.budget != null ? `${goal.budget} ${goal.currency}` : "—"],
    [c.time, goal.timeContext], [c.priority, goal.priority],
  ].filter(([, v]) => v);
  el.goalChips.innerHTML = rows.map(([k, v]) =>
    `<span class="chip"><span>${esc(k)}</span><b>${esc(v)}</b></span>`).join("");
  if (cached) { el.cacheNote.textContent = I18N[LANG].cache(); el.cacheNote.hidden = false; }
  show(el.goalPanel);
}

function scoreColor(n) { return n >= 70 ? "var(--signal)" : n >= 50 ? "var(--appetite)" : "var(--danger)"; }
function verdictClass(kind, val) {
  if (kind === "budget") return val === "within budget" ? "good" : val === "over budget" ? "bad" : "warn";
  if (kind === "open") return (val === "confirmed" || val === "likely") ? "good" : val === "likely closed" ? "bad" : "warn";
  if (kind === "menu") return val === "unknown" ? "warn" : "good";
  return "warn";
}

function renderResults(top, flags, goal) {
  if (!top.length) { hide(el.resultsPanel); return; }
  el.results.innerHTML = top.map((c, i) => {
    const score = c.overall_score;
    const dishes = (c.matchingDishes || []).slice(0, 4).map((d) => `<span class="dish">${esc(d)}</span>`).join("");
    const price = c.estimatedPrice || "Price not confirmed";
    const flagNote = flags && flags[c.url];
    return `
    <article class="card ${i === 0 ? "top" : ""}">
      <div class="card-head">
        <div>
          ${i === 0 ? `<span class="card-rank">${esc(t("rank"))}</span>` : `<span class="card-rank alt">#${i + 1}</span>`}
          <h3>${esc(c.name || "—")}</h3>
        </div>
        <div class="score-ring" style="border-color:${scoreColor(score)};color:${scoreColor(score)}">${score}</div>
      </div>
      ${dishes ? `<div class="dishes">${dishes}</div>` : ""}
      <div class="verdicts">
        <span class="verdict"><b>${esc(price)}</b></span>
        <span class="verdict ${verdictClass("budget", c.budgetVerdict)}">${esc(c.budgetVerdict || "—")}</span>
        <span class="verdict ${verdictClass("open", c.openNowVerdict)}">${LANG === "bg" ? "отворено" : "open"}: ${esc(c.openNowVerdict || "unknown")}</span>
        <span class="verdict ${verdictClass("menu", c.menuFreshness)}">${LANG === "bg" ? "меню" : "menu"}: ${esc(c.menuFreshness || "unknown")}</span>
        <span class="verdict">conf ${num(c.confidence_score)}</span>
      </div>
      ${c.budgetMath ? `<p class="budget-math"><span>${esc(t("budgetCalc"))}</span> ${esc(c.budgetMath)}</p>` : ""}
      <p class="reason"><b>${esc(t("why"))}:</b> ${esc(c.reason || "—")}</p>
      ${c.uncertainty ? `<p class="uncertainty">${esc(t("left"))}: ${esc(c.uncertainty)}</p>` : ""}
      ${flagNote ? `<p class="audit-flag">⚑ ${esc(t("auditFlag"))}: ${esc(flagNote)}</p>` : ""}
      <div class="card-links">
        <a class="source" href="${esc(c.url)}" target="_blank" rel="noopener">↗ ${esc(t("source"))}: ${esc(shortUrl(c.url))}</a>
        <a class="maps" href="${esc(mapsUrl(c.name, goal.city))}" target="_blank" rel="noopener">📍 ${esc(t("maps"))}</a>
      </div>
    </article>`;
  }).join("");
  show(el.resultsPanel);
  el.compareBtn.hidden = false;
}

function renderRejected(rejected) {
  if (!rejected.length) { hide(el.rejectedPanel); return; }
  el.rejected.innerHTML = rejected.slice(0, 6).map((c) =>
    `<li><span class="x">✕</span><span><span class="rname">${esc(c.name || shortUrl(c.url))}</span> — <span class="rwhy">${esc(c.why)}</span></span></li>`
  ).join("");
  show(el.rejectedPanel);
}

function renderAudit(audit) {
  if (!audit) { hide(el.auditPanel); return; }
  const adjusted = audit.verdict === "adjusted";
  const head = adjusted ? t("auditAdjusted") : t("auditConfirmed");
  let body = `<p class="audit-summary">${esc(audit.summary || head)}</p>`;
  const changes = (audit.adjustments || []).filter((a) => a.action && a.action !== "keep");
  if (changes.length) {
    body += `<ul class="audit-list">` + changes.map((a) =>
      `<li><span class="audit-act ${esc(a.action)}">${esc(a.action)}</span> ${esc(shortUrl(a.url))} — ${esc(a.note || "")}</li>`).join("") + `</ul>`;
  }
  el.audit.innerHTML = body;
  show(el.auditPanel);
}

function renderReport(goal, ctx) {
  const r = I18N[LANG].report;
  const top = ctx.top[0];
  const conf = top ? num(top.confidence_score) : 0;
  const rows = [
    [r.goal, `${goal.food || "—"} · ${goal.city || ""} ${goal.area || ""} · ${goal.budget != null ? goal.budget + " " + goal.currency : (LANG === "bg" ? "без бюджет" : "no budget")}`],
    [r.strategy, ctx.query],
    [r.pages, String(ctx.pagesRead)],
    [r.menus, String(ctx.analyzed)],
    [r.criteria, "food 30% · budget 25% · open-now 20% · evidence 15% · location 10%"],
    [r.audit, ctx.auditVerdict || "—"],
    [r.chosen, top ? `${top.name} — ${top.reason}` : "—"],
    [r.rejected, ctx.rejected.length ? ctx.rejected.slice(0, 3).map((c) => `${c.name || shortUrl(c.url)} (${c.why})`).join("; ") : "—"],
    [r.confidence, top ? `${conf}/100` : "—"],
    [r.next, I18N[LANG].nextAction()],
  ];
  el.report.innerHTML = rows.map(([k, v]) =>
    `<span class="row"><span class="k">${esc(k)}:</span> <span class="v">${esc(v)}</span></span>`).join("");
  show(el.reportPanel);
}

function renderProof(goal, ctx) {
  const p = I18N[LANG].proof;
  const goalStr = `${goal.city || "?"} · ${goal.area || "?"} · ${goal.food || "?"} · ${goal.budget != null ? goal.budget + " " + goal.currency : "?"} · ${goal.timeContext || "?"}`;
  const lines = [
    p.parsed(goalStr), p.query(ctx.query), p.search(ctx.serperCount),
    p.read(ctx.pagesRead), p.reject(ctx.rejected.length), p.rank(ctx.top.length),
  ];
  if (ctx.auditVerdict) lines.push(p.audit(ctx.auditVerdict));
  if (ctx.top[0]) lines.push(p.choose(ctx.top[0].name));
  el.proof.innerHTML = lines.map((l) => `<li>${esc(l)}</li>`).join("");
  show(el.proofPanel);
}

function renderError(msg) { el.errorMsg.textContent = msg; show(el.errorPanel); }

/* ---- Compare (Why not ChatGPT) ---- */
async function runCompare() {
  if (!lastRun) return;
  const cmp = I18N[LANG].compare;
  el.compareBtn.disabled = true;
  el.compare.innerHTML = `<p class="compare-loading">${esc(cmp.loading)}</p>`;
  show(el.comparePanel);
  try {
    const plain = await plainLLM(lastRun.raw);
    const top = lastRun.ctx.top[0];
    el.compare.innerHTML = `
      <div class="compare-grid">
        <div class="compare-col llm">
          <div class="compare-tag">${esc(cmp.llmLabel)}</div>
          <p>${esc(plain)}</p>
        </div>
        <div class="compare-col mr">
          <div class="compare-tag good">${esc(cmp.mrLabel)}</div>
          <p>${esc(cmp.mrBody(lastRun.ctx.pagesRead, top.name, top.estimatedPrice || "—", shortUrl(top.url)))}</p>
          <a class="source" href="${esc(top.url)}" target="_blank" rel="noopener">↗ ${esc(shortUrl(top.url))}</a>
        </div>
      </div>
      <p class="compare-note">${esc(cmp.note)}</p>`;
  } catch {
    el.compare.innerHTML = `<p class="compare-loading">${esc(I18N[LANG].err.ai)}</p>`;
  } finally {
    el.compareBtn.disabled = false;
  }
}
el.compareBtn.onclick = runCompare;

/* ---------- helpers ---------- */
function esc(s) {
  return (s == null ? "" : String(s)).replace(/[&<>"']/g, (m) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}
function shortUrl(u) { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } }

/* ============================================================
   Orchestrator
   ============================================================ */
async function runAgent() {
  const raw = el.query.value.trim();
  if (!raw) { renderError(I18N[LANG].err.empty); show(el.errorPanel); return; }

  clearAll();
  el.run.disabled = true;
  show(el.progress);
  initSteps();
  setStep(0);

  try {
    const goal = await parseQuery(raw);
    renderGoal(goal, false);

    if (!el.refresh.checked) {
      const cached = readCache(goal);
      if (cached) {
        finishSteps();
        renderGoal(goal, true);
        renderResults(cached.top, cached.flags, goal);
        renderRejected(cached.rejected);
        renderAudit(cached.audit);
        renderReport(goal, cached.ctx);
        renderProof(goal, cached.ctx);
        hide(el.progress);
        lastRun = { raw, goal, ctx: cached.ctx };
        pushHistory(raw);
        el.run.disabled = false;
        return;
      }
    }

    setStep(1);
    const query = buildSearchQuery(goal);
    let organic = await runSearch(query, goal);
    let serperCount = organic.length;
    let filtered = filterResults(organic);

    setStep(2);
    let pages = await fetchPages(filtered);

    if (pages.length < 3) {
      const fbTail = goal.language === "en" ? "restaurant menu" : "ресторант меню";
      const fbQuery = [goal.city, goal.area, goal.food, fbTail].filter(Boolean).join(" ");
      const fb = await runSearch(fbQuery, goal);
      serperCount += fb.length;
      const fbFiltered = filterResults(fb).filter((r) => !pages.some((p) => p.url === r.link));
      const more = await fetchPages(fbFiltered.slice(0, CONFIG.MAX_FETCH - pages.length));
      pages = pages.concat(more);
    }

    if (!pages.length) {
      finishSteps(); hide(el.progress);
      renderError(I18N[LANG].none);
      el.run.disabled = false;
      return;
    }

    setStep(3);
    const scored = await analyzeCandidates(goal, pages);
    setStep(4);

    setStep(5);
    let { top, reserve, hardRejected } = rankAndReject(scored);

    if (!top.length) {
      finishSteps(); hide(el.progress);
      renderError(I18N[LANG].none);
      renderRejected(hardRejected);
      el.run.disabled = false;
      return;
    }

    // Self-audit (graceful: skip on failure)
    setStep(6);
    let audit = null, flags = {};
    try {
      audit = await auditDecision(goal, top);
      const applied = applyAudit(top, reserve, audit);
      top = applied.top; reserve = applied.reserve; flags = applied.flags;
    } catch { audit = null; }

    const rejected = reserve.map((c) => ({ ...c, why: rejectWhy(c) })).concat(hardRejected);

    setStep(7);
    const ctx = {
      query, serperCount, pagesRead: pages.length, analyzed: scored.length,
      top, rejected, auditVerdict: audit ? audit.verdict : null,
    };

    finishSteps();
    hide(el.progress);
    renderResults(top, flags, goal);
    renderRejected(rejected);
    renderAudit(audit);
    renderReport(goal, ctx);
    renderProof(goal, ctx);

    lastRun = { raw, goal, ctx };
    pushHistory(raw);
    writeCache(goal, { top, rejected, audit, flags, ctx });
  } catch (err) {
    hide(el.progress);
    const code = err instanceof AgentError ? err.code : "search";
    renderError(I18N[LANG].err[code] || I18N[LANG].err.search);
  } finally {
    el.run.disabled = false;
  }
}

el.run.onclick = runAgent;
el.query.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") runAgent();
});

/* ============================================================
   Boot
   ============================================================ */
applyI18n();
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
