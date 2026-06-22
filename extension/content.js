// PolyArc content script — overlays an honest card on a Polymarket
// market page. Read-only: it reads the market identity off the page and asks our
// backend for the card. It never tells you what to bet — facts, not advice.
//
// NOTE (honest): market-identity extraction is best-effort. Polymarket is a SPA, so
// we (a) try to read clobTokenIds embedded in the page, (b) fall back to the URL
// slug. These selectors may need tuning against the live site — the panel will say
// "not analyzed" rather than guess if it can't resolve or we lack coverage.

const DEFAULT_API = "https://polyarc.ai";
let lastKey = null;
let curSlug = null; // shown on the card so you can see what page it detected
let panelMin = false; // collapsed (minimized) state, persists across re-renders

function apiBase() {
  return new Promise((res) =>
    chrome.storage?.sync.get({ apiBase: DEFAULT_API }, (d) => res(d.apiBase || DEFAULT_API)));
}

// Escape everything we interpolate into innerHTML (prevents XSS if any field ever
// carries attacker-influenced text, e.g. a market title).
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Anonymized, per-install session id (random — no identity). Created once; its
// creation is the "install" event. Used only to measure retention (same install
// returning) and aggregate flow. Never tied to any personal data.
function getSid() {
  return new Promise((res) =>
    chrome.storage.sync.get({ sid: null }, (d) => {
      if (d.sid) return res({ sid: d.sid, fresh: false });
      const sid = (self.crypto && crypto.randomUUID) ? crypto.randomUUID()
        : Date.now() + "-" + Math.random().toString(36).slice(2);
      chrome.storage.sync.set({ sid }, () => res({ sid, fresh: true }));
    }));
}

async function logEvent(event, market, yesPrice) {
  try {
    const { sid, fresh } = await getSid();
    const base = await apiBase();
    const post = (b) => fetch(`${base}/event`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(b),
    }).catch(() => {});
    if (fresh) post({ event: "install", session_id: sid, ts: new Date().toISOString() });
    post({ event, market, yes_price: yesPrice, session_id: sid, ts: new Date().toISOString() });
  } catch (e) { /* logging must never break the card */ }
}

// Identify the market by the URL SLUG. The backend resolves it via the Gamma API
// (so coverage isn't limited to markets we captured), and crucially the slug CHANGES
// when you navigate to a different market — which is how the card refreshes on this
// single-page app. (We deliberately do NOT read an embedded token id: it goes stale
// in the SPA DOM and wouldn't update on navigation.)
// Pure (no DOM/globals) so it can be unit-tested under Node. Polymarket uses several
// path formats: /event/<slug>, /market/<slug>, /sports/<league>/<slug>, /crypto/<slug>.
// The market slug is always the LAST path segment. Section/list roots ("markets",
// "sports", "mlb") aren't hyphenated slugs, so we require a hyphen to avoid firing on
// non-market pages.
function slugFromPath(pathname) {
  const segs = String(pathname || "").split("/").filter(Boolean);
  if (!segs.length) return null;
  const last = segs[segs.length - 1];
  if (!last.includes("-")) return null;
  return last;
}

function marketIdentity() {
  const v = slugFromPath(location.pathname);
  return v ? { kind: "slug", value: v } : null;
}

async function fetchCard() {
  const id = marketIdentity();
  curSlug = id ? id.value : null;
  if (!id) return null;
  const key = id.kind + ":" + id.value;
  if (key === lastKey) return undefined; // unchanged; skip re-render
  lastKey = key;
  const base = await apiBase();
  try {
    // precomputed static card from the serving plane: /card/<slug>.json
    const r = await fetch(`${base}/card/${encodeURIComponent(id.value)}.json`);
    return await r.json();
  } catch (e) {
    return { _error: "Couldn't reach PolyArc (" + base + ")." };
  }
}

function fmtPct(x) { return Math.round(x * 100) + "%"; }

// Underlined links from the card's jargon to the plain-English explainers on the site.
const LEARN = "https://polyarc.ai/learn";
function lnk(text, path) {
  return `<a class="pt-link" href="${LEARN}${path}" target="_blank" rel="noopener">${text}</a>`;
}
// map a SafeBet flag to its explainer article (best-effort by keyword)
function flagLink(flagText) {
  const map = [[/wash|pump|volume/i, "/wash-trading"],
               [/resolution|clarity|ambig/i, "/resolution-risk"],
               [/holder|concentrat|whale/i, "/rug-pulls"]];
  const hit = map.find(([re]) => re.test(flagText));
  return hit ? lnk(`<b>${esc(flagText)}</b>`, hit[1]) : `<b>${esc(flagText)}</b>`;
}

// Collapse the response into ONE traffic-light status + a few terse factors.
// The integrity gate sets it: RED/STOP (serious flag), YELLOW/BE CAREFUL (soft flag),
// GREEN/GO (clean). GO means "no traps detected — your own call", never "good bet": the
// value/mispricing axis did not validate, so we never render a "buy" edge (nor the
// low-price EV number, a leverage artifact). GRAY/NO DATA = not analyzed yet.
function gradeMeta(data) {
  const NA = (headline, factors) => ({ label: "NO DATA", cls: "pt-s-na", headline, factors });
  if (data && data._error) return NA("Couldn't reach PolyArc.", [esc(data._error)]);
  if (!data || data.coverage === false)
    return NA("Not analyzed yet.", [esc((data && data.message) || "No data for this market — we won't guess.")]);
  if (!data.market || !data.safebet || !data.polytruth)
    return NA("Couldn't read the card.", ["The backend may be updating. We won't guess."]);

  const m = data.market, sb = data.safebet, pt = data.polytruth;
  const flags = sb.flags || [];
  const high = flags.some((f) => f.sev === "high");
  const level = high ? "stop" : (flags.length ? "care" : "go");
  const cls = { stop: "pt-s-stop", care: "pt-s-care", go: "pt-s-go" }[level];
  const label = { stop: "STOP", care: "BE CAREFUL", go: "GO" }[level];

  const factors = [];
  if (flags.length)
    flags.forEach((f) => factors.push(
      `${f.sev === "high" ? "🚩" : "⚠️"} ${flagLink(f.flag)} — ${esc(f.fact)}`));
  else
    factors.push("✓ no manipulation or resolution flags detected");

  if (sb.max_stake && sb.max_stake.liq_cap)
    factors.push(`🛡 cap your stake ~$${Number(sb.max_stake.liq_cap).toLocaleString()} `
      + `(≈2% of $${Number(sb.max_stake.liquidity).toLocaleString()} liquidity, so you can exit)`);

  let fairTag = "";
  if (pt.base_rate) {
    const [rate, lo, hi, n] = pt.base_rate;
    fairTag = m.yes > hi ? "priced above history" : (m.yes < lo ? "priced below history" : "fairly priced");
    factors.push(`📊 similar markets resolved YES ${fmtPct(rate)} `
      + `(${lnk("CI", "/confidence-interval")} ${fmtPct(lo)}–${fmtPct(hi)}, n=${esc(n)}); `
      + `this is at ${fmtPct(m.yes)} — ${fairTag}`);
  } else {
    factors.push("📊 not enough history to judge a fair price");
  }

  let headline;
  if (level === "stop") headline = "Trap risk — the market setup may be unfair. A cheap price here is a red flag, not a deal.";
  else if (level === "care") headline = "Be careful — elevated risk in how this market is set up.";
  else headline = pt.base_rate
    ? `Clean, ${fairTag} — no reliable edge after fees. Your call; bet your own thesis.`
    : "Clean — no traps detected. Not enough history to judge the price.";
  return { label, cls, headline, factors };
}

function render(data) {
  document.getElementById("pt-panel")?.remove();
  if (data === undefined) return; // unchanged
  const el = document.createElement("div");
  el.id = "pt-panel";
  const gm = gradeMeta(data);
  const factorsHtml = gm.factors.map((f) => `<div class="pt-factor">${f}</div>`).join("");
  el.innerHTML = `
    <div class="pt-top">
      <span class="pt-chip ${gm.cls}">${esc(gm.label)}</span>
      <div class="pt-brandwrap">
        <div class="pt-brand">PolyArc<span class="pt-x" id="pt-x">×</span><span class="pt-min-btn" id="pt-min-btn">–</span></div>
        <div class="pt-headline">${esc(gm.headline)}</div>
      </div>
    </div>
    <div class="pt-slug">${esc(curSlug || "(no market on this page)")}</div>
    ${factorsHtml}
    <div class="pt-learn">${lnk("How the grade works", "/the-grade")} · ${lnk("CI", "/confidence-interval")} · ${lnk("EV", "/expected-value")}</div>
    <div class="pt-foot">Facts, not advice · not a safety guarantee · Polymarket only</div>`;
  if (panelMin) el.classList.add("pt-min");   // persist collapsed state across re-renders
  document.body.appendChild(el);
  const x = document.getElementById("pt-x");
  if (x) x.onclick = () => el.remove();
  const mb = document.getElementById("pt-min-btn");
  if (mb) {
    mb.textContent = panelMin ? "+" : "–";
    mb.title = panelMin ? "expand" : "minimize";
    mb.onclick = () => {
      panelMin = !panelMin;
      el.classList.toggle("pt-min", panelMin);
      mb.textContent = panelMin ? "+" : "–";
      mb.title = panelMin ? "expand" : "minimize";
    };
  }
}

async function tick() {
  try {
    const data = await fetchCard();
    if (data !== undefined) {
      render(data);
      if (data && data.coverage) logEvent("view", curSlug, data.market && data.market.yes);
    }
  } catch (e) {
    console.warn("[PolyArc] tick error:", e);
  }
}

// Initial render + detect SPA navigation. Polymarket changes the URL via pushState
// (which a content script can't hook across the isolated world), so we POLL
// location.href — reliable — and also listen for back/forward. Guarded so the file can
// be require()d in a Node test without running the browser bootstrap.
if (typeof window !== "undefined" && typeof document !== "undefined") {
  tick();
  let lastUrl = location.href;
  const onNav = () => {
    if (location.href !== lastUrl) {
      lastUrl = location.href; lastKey = null; tick();        // navigated to a new market
    } else if (lastKey && !document.getElementById("pt-panel")) {
      lastKey = null; tick();                                  // SPA re-render wiped our panel
    }
  };
  setInterval(onNav, 800);
  window.addEventListener("popstate", onNav);
}

// Test export (no-op in the browser content-script world).
if (typeof module !== "undefined" && module.exports) {
  module.exports = { slugFromPath, esc };
}
