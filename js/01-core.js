/* ===== core: config, helpers, state, router ===== */
const CFG = {
  ownerHash: "105c000590cbfcd47238ac8d8f186c969f4e00c899f6aaf8011b82cace66634a",
  repo: (() => { const m = location.hostname.match(/^([^.]+)\.github\.io$/), p = location.pathname.split("/")[1]; return m && p ? m[1] + "/" + p : "weisez/Tramontane"; })(),
  branch: "main", dir: "img",
};
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const uid = () => Math.random().toString(36).slice(2, 9);
const LS = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
const KEY = "tcs-data-v1";
let S = null, OWN = LS.get("tcs-owner") === "1", EDIT = false;
const VIEW = () => /[?&]view\b/.test(location.search) || (/\.github\.io$/.test(location.hostname) && !OWN);
const sha256 = async (t) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)))].map((b) => b.toString(16).padStart(2, "0")).join("");
async function ownerCheck() {
  if (location.hash.startsWith("#edit=") && window.crypto && crypto.subtle) {
    const h = await sha256(decodeURIComponent(location.hash.slice(6)));
    if (h === CFG.ownerHash) { LS.set("tcs-owner", "1"); OWN = true; }
    history.replaceState(null, "", location.pathname + location.search + "#/");
  }
}
/* toast */
function toast(t) { const x = $("#toast"); x.textContent = t; x.classList.add("on"); clearTimeout(x._t); x._t = setTimeout(() => x.classList.remove("on"), 5200); }
/* data */
async function loadData() {
  let remote = null;
  try { remote = await (await fetch("data.json", { cache: "no-cache" })).json(); } catch (e) {}
  let local = null;
  if (!VIEW()) { try { local = JSON.parse(LS.get(KEY, "null")); } catch (e) {} }
  S = local || remote;
  if (!S) throw new Error("data.json не загрузился. Откройте сайт через веб-сервер (python3 -m http.server).");
  ["people", "units", "ranks", "timeline", "rooms", "zones", "docs", "forms", "notes", "steps"].forEach((k) => { S[k] = S[k] || []; });
  S.meta = S.meta || {}; S.vacancies = S.vacancies || { rows: [], req: [] }; S.dept = S.dept || { name: "", kids: [] };
}
let saveT;
function save() {
  if (VIEW()) return;
  clearTimeout(saveT);
  saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast("Не удалось сохранить: хранилище браузера переполнено. Опубликуйте изменения и вынесите картинки в img/."); } pbSoon(); }, 250);
}
/* lookups */
const pById = (id) => S.people.find((p) => p.id === id), uById = (id) => S.units.find((u) => u.id === id), dById = (id) => S.docs.find((d) => d.id === id), fById = (id) => S.forms.find((f) => f.id === id);
const ini = (n) => (n || "?").replace(/[^\p{L}\s]/gu, "").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
const dkey = (d) => { const m = /(\d{2})\.(\d{2})\.(\d{4})/.exec(d || ""); return m ? m[3] + m[2] + m[1] : "0"; };
const TYPES = { order: "Приказ", briefing: "Брифинг", memo: "Служебная записка", press: "Пресс-релиз" };
/* edit helpers (rendered only in edit mode via CSS) */
const eb = (c, id) => `<button class="ed edb" data-ed="${c}:${id}" title="Править" aria-label="Править">✎</button>`;
const mvb = (c, id) => `<button class="ed edb mv" data-mv="${c}:${id}:-1" title="Выше">↑</button><button class="ed edb mv2" data-mv="${c}:${id}:1" title="Ниже">↓</button>`;
const addb = (c, l) => `<button class="ed addb" data-add="${c}">+ ${l}</button>`;
/* router */
const ROUTES = [];
const route = (pat, fn, nav) => ROUTES.push({ re: new RegExp("^" + pat.replace(/:\w+/g, "([^/]+)") + "$"), fn, nav });
function render() {
  const h = decodeURIComponent(location.hash.replace(/^#\/?/, "")).replace(/\/+$/, "");
  const app = $("#app");
  let r = null, m = null;
  for (const x of ROUTES) { m = h.match(x.re); if (m) { r = x; break; } }
  let out;
  try { out = r ? r.fn(...m.slice(1)) : { html: notFound(), title: "Не найдено" }; }
  catch (e) { console.error(e); out = { html: `<section class="sec"><div class="wrap"><h2>Ошибка страницы</h2><p class="lead">${esc(e.message)}</p></div></section>`, title: "Ошибка" }; }
  if (typeof out === "string") out = { html: out };
  app.classList.remove("pg"); void app.offsetWidth;
  app.innerHTML = out.html; app.classList.add("pg");
  document.title = (out.title ? out.title + " — " : "") + (S.meta.name || "Tramontane Central Station");
  $$("#nav a").forEach((a) => a.classList.toggle("on", !!r && r.nav && a.dataset.n === r.nav));
  $("#nav").classList.remove("open");
  scrollTo(0, 0);
  after(); if (out.init) out.init(app);
}
const notFound = () => `<section class="sec"><div class="wrap"><div class="eb">404</div><h2>Страница не найдена</h2><p class="lead">Такого раздела нет или документ перенесён в архив.</p><p><a class="btn" href="#/">На главную</a></p></div></section>`;
/* generic after-render: reveal, counters, accordions */
let IO;
function after() {
  if (IO) IO.disconnect();
  IO = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); if (e.target.dataset.count) countUp(e.target); IO.unobserve(e.target); } }), { threshold: 0.12 });
  $$("#app .reveal,#app .tli,#app [data-count]").forEach((el, i) => { if (el.classList.contains("reveal")) el.style.transitionDelay = Math.min(i % 6, 5) * 60 + "ms"; IO.observe(el); });
}
function countUp(el) {
  const to = parseInt(el.dataset.count, 10), s = el.dataset.suf || "", t0 = performance.now(), d = 1100;
  if (isNaN(to) || to > 9999) { el.textContent = el.dataset.count + s; return; }
  const f = (t) => { const p = Math.min(1, (t - t0) / d); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))) + s; if (p < 1) requestAnimationFrame(f); };
  requestAnimationFrame(f);
}
/* global image fallback */
addEventListener("error", (e) => { const i = e.target; if (i && i.tagName === "IMG") { i.style.display = "none"; const p = i.closest(".ph"); if (p) p.classList.add("noimg"); } }, true);
/* modal helpers */
function ovOpen(id, html) { let o = $("#" + id); if (!o) { o = document.createElement("div"); o.className = "ov"; o.id = id; document.body.appendChild(o); } o.innerHTML = html; o.classList.add("open"); return o; }
const ovClose = (id) => { const o = $("#" + id); if (o) { o.classList.remove("open"); o.innerHTML = ""; } };
/* two-step confirm */
function arm(b, ok) { if (b.classList.contains("arm")) { clearTimeout(b._t); ok(); return; } b.dataset.t = b.textContent; b.textContent = "Точно?"; b.classList.add("arm"); b._t = setTimeout(() => { b.classList.remove("arm"); b.textContent = b.dataset.t; }, 3000); }
/* theme */
function theme(t) { if (t) LS.set("tcs-theme", t); const v = LS.get("tcs-theme", matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"); document.documentElement.dataset.theme = v; return v; }
