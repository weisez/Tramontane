/* ===== «События»: слайдер анонсов на главной, страница события, список и архив =====
   Данные лежат в events.json в репозитории (а не в data.json), как и объявления (08-board.js).
   Сайт читает файл напрямую с GitHub, поэтому новое или изменённое событие видно сразу,
   не дожидаясь GitHub Pages и не требуя «Опубликовать». Владелец создаёт, правит, удаляет и двигает
   события обычными кнопками правки; каждое действие — отдельный коммит events.json (нужен токен GitHub).
   S.events — это окно в EVT.list (не попадает ни в data.json, ни в «Опубликовать»).
   Поля события: id, title, tag, date (дд.мм.гггг), time, place, summary, banner (+bannerPos), body (HTML),
   link + linkLabel (кнопка на странице события), until (дд.мм.гггг), draft.
   Событие показывается на слайдере, пока не прошла дата «until» (если её нет — дата события; если нет и её — без ограничения). */
const EVT = { list: [], q: Promise.resolve(), busy: 0, status: "load", at: 0, err: "", timer: 0, last: 0 };
const EVKEY = "tcs-events-v1";
const evApi = () => `https://api.github.com/repos/${GH.repo}/contents/events.json`;
const evParse = (txt) => {
  const j = JSON.parse(txt), a = Array.isArray(j) ? j : j && j.events;
  if (!Array.isArray(a)) throw new Error("events.json: ожидался список событий");
  return a.filter((e) => e && typeof e === "object" && typeof e.id === "string" && typeof e.title === "string");
};
const evText = (list) => JSON.stringify({ events: list }, null, 2) + "\n";
try { const c = JSON.parse(LS.get(EVKEY, "null")); if (c && Array.isArray(c.events)) { EVT.list = c.events; EVT.at = c.at || 0; EVT.status = "cache"; } } catch (e) {}
const evCache = () => LS.set(EVKEY, JSON.stringify({ events: EVT.list, at: EVT.at }));

/* чтение: владелец с токеном — API GitHub (всегда свежее), остальные — raw (раз в минуту), запасной вариант — файл рядом с сайтом */
async function evLoad() {
  const src = [
    async () => { const r = await fetch(evApi() + "?ref=" + GH.branch, { headers: { ...ghH(), Accept: "application/vnd.github.raw+json" }, cache: "no-cache" }); if (!r.ok) throw new Error("api " + r.status); return r.text(); },
    async () => { const r = await fetch(`https://raw.githubusercontent.com/${GH.repo}/${GH.branch}/events.json?t=${Math.floor(Date.now() / 60000)}`); if (!r.ok) throw new Error("raw " + r.status); return r.text(); },
    async () => { const r = await fetch("events.json", { cache: "no-cache" }); if (!r.ok) throw new Error("file " + r.status); return r.text(); },
  ];
  let last = null;
  /* посетители (без токена) читают raw: у API GitHub лимит 60 запросов/час на IP, а за офисным или мобильным NAT он общий */
  const order = GH.token ? [0, 1, 2] : [1, 2];
  for (let k = 0; k < order.length; k++) {
    const i = order[k], fresh = k < order.length - 1;
    try {
      const list = evParse(await src[i]());
      if (EVT.busy) return false; /* не затираем действие, которое ещё записывается */
      const ch = JSON.stringify(list) !== JSON.stringify(EVT.list);
      EVT.list = list; EVT.at = EVT.last = Date.now(); EVT.status = fresh ? "live" : "stale"; EVT.err = ""; evCache();
      return ch;
    } catch (e) { last = e; }
  }
  EVT.status = EVT.list.length || EVT.at ? "stale" : "fail"; EVT.err = last ? last.message : "";
  return false;
}

/* запись: берём свежую версию с GitHub, применяем действие к ней и коммитим. Одновременные правки не затирают друг друга */
async function evPush(apply, msg) {
  for (let i = 0; i < 3; i++) {
    const r = await fetch(evApi() + "?ref=" + GH.branch, { headers: ghH(), cache: "no-store" });
    let list = [], sha = "";
    if (r.status === 404) list = [];
    else if (!r.ok) throw pbErr(r, await r.json().catch(() => ({})));
    else { const j = await r.json(); sha = j.sha; list = evParse(bUtf8(j.content || "")); }
    const next = apply(list), body = { message: msg, content: await b64Of(new Blob([evText(next)], { type: "application/json" })), branch: GH.branch };
    if (sha) body.sha = sha;
    const p = await fetch(evApi(), { method: "PUT", headers: ghH(), body: JSON.stringify(body) });
    if (p.ok) { EVT.list = next; EVT.at = EVT.last = Date.now(); EVT.status = "live"; EVT.err = ""; evCache(); return; }
    if (p.status !== 409 && p.status !== 422) throw pbErr(p, await p.json().catch(() => ({})));
  }
  throw new Error("данные на GitHub менялись одновременно, повторите действие");
}
const evOps = {
  add: (n) => (a) => [...a.filter((x) => x.id !== n.id), n],
  set: (id, f, keys) => (a) => a.map((x) => { if (x.id !== id) return x; const n = { ...x }; keys.forEach((k) => delete n[k]); return Object.assign(n, f); }),
  del: (id) => (a) => a.filter((x) => x.id !== id),
  mv: (id, d) => (a) => { a = a.slice(); const i = a.findIndex((x) => x.id === id), j = i + d; if (i < 0 || j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a; },
};
/* действие владельца: мгновенно показываем у себя, коммитим в очереди */
function evOp(apply, msg, done) {
  if (!GH.token) { toast("Чтобы публиковать события без пересборки, подключите токен GitHub: «Медиа» → «Подключить»"); return Promise.resolve(false); }
  EVT.list = apply(EVT.list.map((x) => ({ ...x }))); EVT.busy++; EVT.status = "save"; evRepaint();
  const job = EVT.q.then(() => evPush(apply, msg)).then(() => { EVT.busy--; toast(done || "Опубликовано, уже видно всем"); return true; })
    .catch(async (e) => { EVT.busy--; toast("Не удалось сохранить: " + e.message); EVT.status = "stale"; EVT.err = e.message; try { await evLoad(); } catch (x) {} return false; })
    .then((ok) => { evRepaint(); return ok; });
  EVT.q = job.catch(() => {});
  return job;
}
/* из окна редактора */
function evSaveEd(v, isNew, id) {
  const f = {};
  Object.keys(v).forEach((k) => { if (typeof v[k] === "string") v[k] = v[k].trim(); if (v[k] !== "" && v[k] != null) f[k] = v[k]; });
  if (!f.title) { toast("Укажите заголовок события"); return false; }
  for (const k of ["date", "until"]) if (f[k] && !/^\d{2}\.\d{2}\.\d{4}$/.test(f[k])) { toast("Дата должна быть в формате дд.мм.гггг, например 14.11.2026"); return false; }
  f.draft = !!v.draft;
  if (isNew) { const n = { id: "e-" + uid(), ...f }; evOp(evOps.add(n), "Событие: " + n.title.slice(0, 50), n.draft ? "Черновик сохранён (виден только вам)" : "Событие опубликовано, уже видно всем"); }
  else { const keys = SCHEMA.events.fields.map((x) => x[0]).concat("bannerPos"); evOp(evOps.set(id, f, keys), "Событие изменено: " + f.title.slice(0, 50), "Изменения сохранены"); }
  return true;
}
const evDel = (id) => { const go = /^#\/event\//.test(location.hash); const p = evOp(evOps.del(id), "Событие удалено", "Удалено"); if (go) location.hash = "#/events"; return p; };
const evMv = (id, d) => evOp(evOps.mv(id, d), "События: порядок", "Порядок сохранён");

/* перерисовка страниц, где есть события (главная, список, страница события) */
const evPage = () => { const h = location.hash.replace(/^#\/?/, "").replace(/\/$/, ""); return h === "" || h === "events" || /^event\//.test(h); };
function evRepaint() {
  if (!evPage()) return;
  if (typeof keepScroll === "function") keepScroll(render); else render();
}
const evBusyUi = () => !!document.querySelector(".ov.open");
async function evTick(force) {
  if (document.hidden || EVT.busy || !evPage() || (!force && Date.now() - EVT.last < 20000)) return;
  if (await evLoad() && !evBusyUi()) evRepaint();
}
async function evRefresh() { if (!EVT.busy) EVT.status = EVT.list.length ? EVT.status : "load"; try { await evLoad(); } catch (e) {} evRepaint(); }
function evStat() {
  const s = EVT.status, t = EVT.at ? " · " + bTime(EVT.at) : "";
  if (s === "save") return `<span class="bs sv">Сохраняю на GitHub…</span>`;
  if (s === "live") return `<span class="bs ok">События: свежая версия${t}</span>`;
  if (s === "load") return `<span class="bs">Загружаю события…</span>`;
  if (s === "fail") return `<span class="bs er">Не удалось загрузить events.json${EVT.err ? " (" + esc(EVT.err) + ")" : ""}</span>`;
  return `<span class="bs er">Показана сохранённая версия${t} — GitHub сейчас недоступен</span>`;
}
/* вызывается из loadData(): подключает хранилище и ждёт первую загрузку (не дольше 2.5 с) */
async function evInstall(legacy) {
  if (!EVT.at && !EVT.list.length && legacy && legacy.length) { EVT.list = legacy; EVT.status = "legacy"; } /* events.json ещё нет — берём старые события из data.json */
  Object.defineProperty(S, "events", { get: () => EVT.list, set() {}, enumerable: false, configurable: true });
  const first = evLoad().then((ch) => { if (ch && document.getElementById("app") && document.getElementById("app").children.length) evRepaint(); }).catch(() => {});
  await Promise.race([first, new Promise((r) => setTimeout(r, 2500))]);
  clearInterval(EVT.timer); EVT.timer = setInterval(() => evTick(false), 60000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) evTick(false); });
  addEventListener("hashchange", () => evTick(false));
  document.addEventListener("click", (e) => { if (e.target.closest && e.target.closest("#evref")) evRefresh(); });
}

const evKey = () => today().replace(/-/g, "");
const evEnd = (e) => { const v = String(e.until || e.date || "").trim(); return /^\d{2}\.\d{2}\.\d{4}$/.test(v) ? dkey(v) : ""; };
const evOver = (e) => { const k = evEnd(e); return !!k && k < evKey(); };
const evLive = (e) => !e.draft && !evOver(e);
const evById = (id) => (S.events || []).find((e) => e.id === id);
const evOwn = () => OWN && !VIEW();
const evWhen = (e) => [e.date, e.time].filter(Boolean).join(", ");
const evMeta = (e) => { const a = [evWhen(e), e.place].filter(Boolean); return a.length ? `<div class="evs-meta">${a.map((x) => `<span>${E(x)}</span>`).join("")}</div>` : ""; };
const evHref = (u) => (okHref(u) ? u : "#/");

/* ---------- слайдер на главной ---------- */
const evSlide = (e, i, n) => `<article class="evs-s${i ? "" : " on"}" role="group" aria-roledescription="slide" aria-label="${i + 1} / ${n}"${i ? " inert" : ""}>
  <div class="evs-img">${e.banner ? fimg(e.banner, cropOf(e, "banner"), "", i === 0) : `<div class="evs-ph">${BADGE}</div>`}</div>
  <div class="evs-cap">
    ${e.tag ? `<span class="evs-tag">${E(e.tag)}</span>` : ""}
    <h3>${E(e.title)}</h3>
    ${evMeta(e)}
    ${e.summary ? `<p>${E(e.summary)}</p>` : ""}
    <a class="btn" href="#/event/${e.id}">Подробнее</a>
  </div>
  ${eb("events", e.id)}${mvb("events", e.id)}
</article>`;

const ICN = {
  prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
  pause: '<svg class="i-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>',
  play: '<svg class="i-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z"/></svg>',
};

function evsHome() {
  const L = (S.events || []).filter(evLive).slice(0, 8), n = L.length;
  if (!n) return evOwn() ? `<div class="wrap evs-add">${addb("events", "Событие на главной")}</div>` : "";
  return `<section class="sec evs-sec"><div class="wrap">
    <div class="evs-hd reveal"><div><div class="eb">Афиша станции</div><h2>События и анонсы</h2></div><a class="btn ghost" href="#/events">Все события</a></div>
    <div class="evs" id="evs" role="region" aria-roledescription="carousel" aria-label="События станции">
      <div class="evs-stage">
        ${L.map((e, i) => evSlide(e, i, n)).join("")}
        ${n > 1 ? `<div class="evs-ctl"><button type="button" data-nav="-1" aria-label="Предыдущее событие">${ICN.prev}</button><button type="button" class="evs-pp" aria-label="Остановить автопрокрутку">${ICN.pause}${ICN.play}</button><button type="button" data-nav="1" aria-label="Следующее событие">${ICN.next}</button></div>` : ""}
      </div>
      ${n > 1 ? `<div class="evs-rail">${L.map((e, i) => `<button type="button" class="evs-t${i ? "" : " on"}" data-go="${i}" data-n="${i + 1}" aria-label="${esc(e.title)}" aria-current="${i ? "false" : "true"}"><i class="evs-pg"><u></u></i><span class="evs-td">${E(e.date || e.tag || "")}</span><b>${E(e.title)}</b></button>`).join("")}</div>` : ""}
    </div>
    ${addb("events", "Событие")}
  </div></section>`;
}

let EVS = { raf: 0, io: null };
function evsInit(app) {
  cancelAnimationFrame(EVS.raf); if (EVS.io) { EVS.io.disconnect(); EVS.io = null; }
  const root = $("#evs", app); if (!root) return;
  const slides = $$(".evs-s", root), tabs = $$(".evs-t", root), n = slides.length;
  const stage = $(".evs-stage", root), pp = $(".evs-pp", root);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches, DUR = 7000;
  let cur = 0, acc = 0, last = 0, paused = reduce, hover = false, focus = false, vis = true;
  const fill = (i, v) => { const u = tabs[i] && $("u", tabs[i]); if (u) u.style.transform = `scaleX(${v})`; };
  const live = () => stage.setAttribute("aria-live", paused ? "polite" : "off");
  const go = (i) => {
    if (n < 2) return;
    cur = (i + n) % n; acc = 0;
    slides.forEach((s, k) => { const on = k === cur; s.classList.toggle("on", on); if (on) s.removeAttribute("inert"); else s.setAttribute("inert", ""); });
    tabs.forEach((t, k) => { const on = k === cur; t.classList.toggle("on", on); t.setAttribute("aria-current", on ? "true" : "false"); fill(k, on && reduce ? 1 : 0); });
  };
  const sync = () => { root.classList.toggle("paused", paused); if (pp) pp.setAttribute("aria-label", paused ? "Включить автопрокрутку" : "Остановить автопрокрутку"); live(); };
  if (n > 1) {
    root.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b || !root.contains(b)) return;
      if (b.dataset.nav) go(cur + +b.dataset.nav);
      else if (b.dataset.go != null) go(+b.dataset.go);
      else if (b === pp) { paused = !paused; sync(); }
    });
    root.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); go(cur - 1); } else if (e.key === "ArrowRight") { e.preventDefault(); go(cur + 1); }
    });
    if (matchMedia("(hover:hover)").matches) { root.addEventListener("pointerenter", () => { hover = true; }); root.addEventListener("pointerleave", () => { hover = false; }); }
    const fc = () => { focus = !!root.querySelector(":focus-visible"); };
    root.addEventListener("focusin", fc); root.addEventListener("focusout", () => setTimeout(fc, 0));
    /* свайп на телефоне */
    let sx = 0, sy = 0, sid = null;
    stage.addEventListener("pointerdown", (e) => { if (e.pointerType === "mouse") return; sx = e.clientX; sy = e.clientY; sid = e.pointerId; });
    stage.addEventListener("pointerup", (e) => { if (sid !== e.pointerId) return; sid = null; const dx = e.clientX - sx, dy = e.clientY - sy; if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) go(cur + (dx < 0 ? 1 : -1)); });
    stage.addEventListener("pointercancel", () => { sid = null; });
    if (window.IntersectionObserver) { EVS.io = new IntersectionObserver((es) => { vis = es[0].isIntersecting; }, { threshold: 0.25 }); EVS.io.observe(root); }
    fill(0, reduce ? 1 : 0);
    const tick = (ts) => {
      if (!root.isConnected) return;
      const dt = last ? Math.min(ts - last, 200) : 0; last = ts;
      if (!paused && !hover && !focus && vis && !document.hidden && !evOwnEditing()) { acc += dt; fill(cur, Math.min(1, acc / DUR)); if (acc >= DUR) go(cur + 1); }
      EVS.raf = requestAnimationFrame(tick);
    };
    EVS.raf = requestAnimationFrame(tick);
  }
  sync();
}
/* пока владелец правит страницу, слайды не листаются сами */
const evOwnEditing = () => document.body.classList.contains("editing");

/* ---------- страница события ---------- */
route("event/:id", (id) => {
  const e = evById(id);
  if (!e || (e.draft && !evOwn())) return { html: notFound() };
  const over = evOver(e), rows = [["Дата", e.date], ["Время", e.time], ["Место", e.place]].filter((r) => r[1]);
  return { title: e.title, html: `${phead(E(e.tag || "Событие"), E(e.title), E(e.summary || ""), "", `<a href="#/">Главная</a> / <a href="#/events">События</a>`)}
  <section class="sec"><div class="wrap two"><div>
    ${e.draft ? `<p><span class="chip warn">Черновик: виден только вам</span></p>` : ""}
    ${e.banner ? `<figure class="evp reveal"><img src="${E(e.banner)}" alt="${E(e.title)}"></figure>` : ""}
    <div class="prose reveal">${H(e.body)}</div>
  </div><div class="aside">
    <div class="box reveal"><h4>Подробности</h4>
      ${rows.length ? `<dl class="evi">${rows.map((r) => `<div><dt>${r[0]}</dt><dd>${E(r[1])}</dd></div>`).join("")}</dl>` : `<p class="note" style="margin:0">Время и место уточняются.</p>`}
      ${evEnd(e) ? `<p style="margin:14px 0 0"><span class="chip ${over ? "" : "ok"}">${over ? "Завершено" : "Предстоит"}</span></p>` : ""}
    </div>
    ${e.link ? `<a class="btn" href="${esc(evHref(e.link))}"${/^https?:/i.test(e.link) ? ' target="_blank" rel="noopener noreferrer"' : ""}>${E(e.linkLabel || "Перейти")}</a>` : ""}
    <a class="btn ghost" href="#/events">Все события</a>
    <button class="ed addb" data-ed="events:${e.id}">✎ Править событие</button>
  </div></div></section>` };
}, "events");

/* ---------- список событий и архив ---------- */
const evCard = (e) => `<a class="card evc reveal${evOver(e) ? " past" : ""}" href="#/event/${e.id}"><div class="cimgw"><div class="cimg">${e.banner ? fimg(e.banner, cropOf(e, "banner"), "") : `<div class="evs-ph">${BADGE}</div>`}</div></div><div class="pad">
  <div class="evc-top">${e.tag ? `<span class="chip">${E(e.tag)}</span>` : ""}${e.draft ? `<span class="chip warn">Черновик</span>` : ""}<span class="sub">${E(evWhen(e))}</span></div>
  <h3>${E(e.title)}</h3>${e.summary ? `<p>${E(e.summary)}</p>` : ""}</div>${eb("events", e.id)}${mvb("events", e.id)}</a>`;

route("events", () => {
  const all = (S.events || []).filter((e) => evOwn() || !e.draft), up = all.filter((e) => !evOver(e)), old = all.filter(evOver);
  return { title: "События", html: `${phead("Афиша станции", "События и анонсы", "Мероприятия, собрания и учения центральной станции Трамонтана. Нажмите на событие, чтобы прочитать подробности.", S.meta.hero, null, cropOf(S.meta, "hero"))}
  <section class="sec"><div class="wrap">${sech("Ближайшие", "Предстоящие события")}
    ${evOwn() ? `<div class="bstatus" id="evst">${evStat()}<button type="button" class="bref" id="evref">Обновить</button></div>` : ""}
    ${up.length ? `<div class="grid g3">${up.map(evCard).join("")}</div>` : `<p class="note">Сейчас ничего не запланировано. Новые анонсы появятся здесь и на главной странице.</p>`}
    ${addb("events", "Событие")}</div></section>
  ${old.length ? `<section class="sec alt"><div class="wrap">${sech("Архив", "Прошедшие события")}<div class="grid g3">${old.map(evCard).join("")}</div></div></section>` : ""}` };
}, "events");
