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
  if (typeof mapEnsure === "function") mapEnsure();
  S.notes = []; /* объявления живут в board.json (js/08-board.js), не в data.json */
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
const eb = (c, id) => H(`<button class="ed edb" data-ed="${c}:${id}" title="Править" aria-label="Править">✎</button>`);
const mvb = (c, id) => H(`<button class="ed edb mv" data-mv="${c}:${id}:-1" title="Выше">↑</button><button class="ed edb mv2" data-mv="${c}:${id}:1" title="Ниже">↓</button>`);
const addb = (c, l) => H(`<button class="ed addb" data-add="${c}">+ ${l}</button>`);
/* router */
const ROUTES = [];
const route = (pat, fn, nav) => ROUTES.push({ re: new RegExp("^" + pat.replace(/:\w+/g, "([^/]+)") + "$"), fn, nav });
function render() {
  let h = location.hash.replace(/^#\/?/, "");
  try { h = decodeURIComponent(h); } catch (e) {}
  h = h.replace(/\/+$/, "");
  const app = $("#app");
  let r = null, m = null;
  for (const x of ROUTES) { m = h.match(x.re); if (m) { r = x; break; } }
  let out;
  try { out = r ? r.fn(...m.slice(1)) : { html: notFound(), title: "Не найдено" }; }
  catch (e) { console.error(e); out = { html: `<section class="sec"><div class="wrap"><h2>Ошибка страницы</h2><p class="lead">${esc(e.message)}</p></div></section>`, title: "Ошибка" }; }
  if (typeof out === "string") out = { html: out };
  app.classList.remove("pg"); void app.offsetWidth;
  app.innerHTML = uiProcess(out.html); app.classList.add("pg");
  document.title = (out.title ? out.title + " — " : "") + (S.meta.name || "Tramontane Central Station");
  curNav = (r && r.nav) || ""; setActive();
  $("#nav").classList.remove("open");
  scrollTo(0, 0);
  after(); if (out.init) out.init(app);
  if (typeof stickyWatch === "function") stickyWatch();
}
const notFound = () => `<section class="sec"><div class="wrap"><div class="eb">404</div><h1 style="font-size:clamp(26px,3.6vw,40px)">Страница не найдена</h1><p class="lead">Такого раздела нет или документ перенесён в архив.</p><p><a class="btn" href="#/">На главную</a></p></div></section>`;
/* generic after-render: reveal, counters, accordions */
let IO;
function after() {
  if (IO) IO.disconnect();
  IO = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); if (e.target.dataset.count) countUp(e.target); IO.unobserve(e.target); } }), { threshold: 0.12 });
  $$("#app .reveal,#app .tli,#app [data-count]").forEach((el, i) => { if (el.classList.contains("reveal")) el.style.transitionDelay = Math.min(i % 6, 5) * 60 + "ms"; IO.observe(el); });
}
function countUp(el) {
  const to = parseInt(el.dataset.count, 10), s = el.dataset.suf || "", t0 = performance.now(), d = 1100;
  if (!/^\d+$/.test(el.dataset.count) || to > 9999) { el.textContent = el.dataset.count + s; return; }
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

/* ===== editable UI texts: static strings in templates become editable ===== */
const D0 = "\uE000", D1 = "\uE001";
const E = (s) => D0 + esc(s) + D1, H = (s) => D0 + (s == null ? "" : s) + D1;
/* Любой HTML, собранный через E()/H(), нужно пропускать через uiProcess() перед вставкой в DOM:
   именно он убирает служебные символы /. Короткая обёртка для таких мест: */
const ui = (html) => uiProcess(html);
/* ===== кадрирование картинок: точка фокуса + масштаб.
   Хранится рядом с полем картинки как <поле>Pos = { x, y, z } (x,y: 0..100 %, z: 1..4). ===== */
const CROP0 = { x: 50, y: 50, z: 1 };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const cropOf = (o, f) => {
  const c = o && o[f + "Pos"]; if (!c || typeof c !== "object") return null;
  const x = clamp(+c.x, 0, 100), y = clamp(+c.y, 0, 100), z = clamp(+c.z, 1, 4);
  return isFinite(x + y + z) ? { x, y, z } : null;
};
const cstyle = (c) => c && (c.x !== 50 || c.y !== 50 || c.z !== 1) ? `object-position:${c.x}% ${c.y}%;transform-origin:${c.x}% ${c.y}%;transform:scale(${c.z})` : "";
/* картинка внутри рамки: рамка должна быть position:relative + overflow:hidden */
const fimg = (src, c, alt, eager) => { if (!src) return ""; const s = cstyle(c); return `<img class="pic" src="${E(src)}" alt="${E(alt || "")}"${eager ? "" : ' loading="lazy"'}${s ? ` style="${s}"` : ""}>`; };
const cnt = (t, c) => t.split(c).length - 1;
const btnKey = (inner) => inner.replace(/<[^>]*>/g, "").replace(/[\uE000\uE001]/g, "").trim();
function uiProcess(html) {
  S.txt = S.txt || {}; S.lnk = S.lnk || {};
  html = html.replace(/<a class="(btn[^"]*)" href="([^"]*)"([^>]*)>([\s\S]*?)<\/a>/g, (m, c, h, r, inner) => {
    const key = h + "|" + btnKey(inner), o = S.lnk[key];
    return `<a class="${c}" href="${esc(o || h)}"${r} data-lk="${esc(key)}">${inner}</a>`;
  });
  let depth = 0, skip = 0, edBtn = 0, out = "", m;
  const re = /(<[^>]*>)|([^<]+)/g;
  while ((m = re.exec(html))) {
    if (m[1]) {
      const t = m[1]; depth += cnt(t, D0) - cnt(t, D1);
      if (/^<(textarea|option|script|style|select)\b/i.test(t)) skip++;
      else if (/^<\/(textarea|option|script|style|select)>/i.test(t)) skip = Math.max(0, skip - 1);
      if (/^<(button|a|span)\b[^>]*class="[^"]*\bed\b/.test(t)) edBtn = 1;
      else if (edBtn && /^<\/(button|a|span)>/.test(t)) edBtn = 0;
      out += t;
    } else {
      const t = m[2];
      if (skip || edBtn) { out += t; for (const ch of t) { if (ch === D0) depth++; else if (ch === D1) depth--; } continue; }
      t.split(/([\uE000\uE001])/).forEach((part) => {
        if (part === D0) { depth++; out += part; }
        else if (part === D1) { depth--; out += part; }
        else if (depth === 0 && /[A-Za-zА-Яа-яЁё]/.test(part) && !/\d/.test(part)) {
          const mm = /^(\s*)([\s\S]*?)(\s*)$/.exec(part), key = mm[2], v = S.txt[key];
          out += mm[1] + `<span data-t="${esc(key)}">${v != null ? esc(v) : key}</span>` + mm[3];
        } else out += part;
      });
    }
  }
  return out.replace(/[\uE000\uE001]/g, "");
}
/* nav */
const DEFAULT_NAV = [["", "Главная", "#/", ""], ["Станция", "О станции", "#/about", ""], ["Станция", "Подразделения", "#/units", ""], ["Станция", "Личный состав", "#/staff", ""], ["Станция", "Зоны ответственности", "#/zones", ""], ["", "Карьера", "#/career", ""], ["Документы", "Документы", "#/docs", ""], ["Документы", "Пресс-центр", "#/press", ""], ["Документы", "Формуляры", "#/forms", ""], ["", "Объявления", "#/board", ""]];
const navData = () => (S.nav && S.nav.length ? S.nav : DEFAULT_NAV);
let curNav = "";
function setActive() {
  const n = (h) => String(h || "").replace(/^#\/?/, "").replace(/\/$/, ""), want = curNav === "home" ? "" : curNav;
  $$("#nav [data-h]").forEach((a) => a.classList.toggle("on", !!curNav && n(a.dataset.h) === want));
  $$("#nav .ng").forEach((g) => g.classList.toggle("on", !!$(".di.on", g)));
}
function routeList() {
  const L = [["#/", "Главная"], ["#/about", "О станции"], ["#/units", "Подразделения"], ["#/staff", "Личный состав"], ["#/zones", "Зоны ответственности"], ["#/career", "Карьера"], ["#/docs", "Документы"], ["#/press", "Пресс-центр"], ["#/forms", "Формуляры"], ["#/board", "Объявления"]];
  S.units.forEach((u) => L.push(["#/unit/" + u.id, "Подразделение: " + u.name]));
  S.docs.forEach((d) => L.push(["#/doc/" + d.id, d.num + " " + d.title]));
  S.forms.forEach((f) => L.push(["#/form/" + f.id, "Формуляр: " + f.title]));
  return L;
}
