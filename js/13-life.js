/* ===== «Жизнь станции»: небольшие истории с фото — помощь жителям, спасения, благодарности, встречи с горожанами =====
   Как у событий (12-events.js): данные лежат в stories.json и читаются прямо с GitHub, поэтому новая история
   видна всем через несколько секунд, без «Опубликовать» и без ожидания GitHub Pages.
   Владелец: режим правки → «+ История» / ✎ на карточке. Каждое действие — отдельный коммит stories.json (нужен токен GitHub).
   S.stories — окно в LIFE.list (не попадает ни в data.json, ни в «Опубликовать»).
   Поля: id, title, tag (рубрика), date (дд.мм.гггг), place, who (кто участвовал), img (+imgPos), summary (коротко), body (HTML), draft.
   Новые истории встают в начало списка: на главной показываются первые четыре. */
function liveStore(c) {
  const T = { list: [], q: Promise.resolve(), busy: 0, status: "load", at: 0, err: "", last: 0, timer: 0 };
  const api = () => `https://api.github.com/repos/${GH.repo}/contents/${c.file}`;
  const parse = (txt) => {
    const j = JSON.parse(txt), a = Array.isArray(j) ? j : j && j[c.prop];
    if (!Array.isArray(a)) throw new Error(c.file + ": ожидался список");
    return a.filter((e) => e && typeof e === "object" && typeof e.id === "string" && typeof e.title === "string");
  };
  const text = (list) => JSON.stringify({ [c.prop]: list }, null, 2) + "\n";
  try { const k = JSON.parse(LS.get(c.key, "null")); if (k && Array.isArray(k[c.prop])) { T.list = k[c.prop]; T.at = k.at || 0; T.status = "cache"; } } catch (e) {}
  const cache = () => LS.set(c.key, JSON.stringify({ [c.prop]: T.list, at: T.at }));

  /* чтение: владелец с токеном — API GitHub (всегда свежее), остальные — raw (раз в минуту), запасной вариант — файл рядом с сайтом */
  async function load() {
    const src = [
      async () => { const r = await fetch(api() + "?ref=" + GH.branch, { headers: { ...ghH(), Accept: "application/vnd.github.raw+json" }, cache: "no-cache" }); if (!r.ok) throw new Error("api " + r.status); return r.text(); },
      async () => { const r = await fetch(`https://raw.githubusercontent.com/${GH.repo}/${GH.branch}/${c.file}?t=${Math.floor(Date.now() / 60000)}`); if (!r.ok) throw new Error("raw " + r.status); return r.text(); },
      async () => { const r = await fetch(c.file, { cache: "no-cache" }); if (!r.ok) throw new Error("file " + r.status); return r.text(); },
    ];
    let last = null;
    /* посетители (без токена) читают raw: у API GitHub лимит 60 запросов/час на IP, а за офисным или мобильным NAT он общий */
  const order = GH.token ? [0, 1, 2] : [1, 2];
  for (let k = 0; k < order.length; k++) {
    const i = order[k], fresh = k < order.length - 1;
      try {
        const list = parse(await src[i]());
        if (T.busy) return false; /* не затираем действие, которое ещё записывается */
        const ch = JSON.stringify(list) !== JSON.stringify(T.list);
        T.list = list; T.at = T.last = Date.now(); T.status = fresh ? "live" : "stale"; T.err = ""; cache();
        return ch;
      } catch (e) { last = e; }
    }
    T.status = T.list.length || T.at ? "stale" : "fail"; T.err = last ? last.message : "";
    return false;
  }
  /* запись: берём свежую версию с GitHub, применяем действие и коммитим — одновременные правки не затирают друг друга */
  async function push(apply, msg) {
    for (let i = 0; i < 3; i++) {
      const r = await fetch(api() + "?ref=" + GH.branch, { headers: ghH(), cache: "no-store" });
      let list = [], sha = "";
      if (r.status !== 404) {
        if (!r.ok) throw pbErr(r, await r.json().catch(() => ({})));
        const j = await r.json(); sha = j.sha; list = parse(bUtf8(j.content || ""));
      }
      const next = apply(list), body = { message: msg, content: await b64Of(new Blob([text(next)], { type: "application/json" })), branch: GH.branch };
      if (sha) body.sha = sha;
      const p = await fetch(api(), { method: "PUT", headers: ghH(), body: JSON.stringify(body) });
      if (p.ok) { T.list = next; T.at = T.last = Date.now(); T.status = "live"; T.err = ""; cache(); return; }
      if (p.status !== 409 && p.status !== 422) throw pbErr(p, await p.json().catch(() => ({})));
    }
    throw new Error("данные на GitHub менялись одновременно, повторите действие");
  }
  const ops = {
    add: (n) => (a) => [n, ...a.filter((x) => x.id !== n.id)],
    set: (id, f, keys) => (a) => a.map((x) => { if (x.id !== id) return x; const n = { ...x }; keys.forEach((k) => delete n[k]); return Object.assign(n, f); }),
    del: (id) => (a) => a.filter((x) => x.id !== id),
    mv: (id, d) => (a) => { a = a.slice(); const i = a.findIndex((x) => x.id === id), j = i + d; if (i < 0 || j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a; },
  };
  const onPage = () => { const h = location.hash.replace(/^#\/?/, "").replace(/\/$/, ""); return c.page(h); };
  function repaint() { if (!onPage()) return; if (typeof keepScroll === "function") keepScroll(render); else render(); }
  /* действие владельца: мгновенно показываем у себя, коммитим в очереди */
  function op(apply, msg, done) {
    if (!GH.token) { toast("Чтобы публиковать без пересборки, подключите токен GitHub: «Медиа» → «Подключить»"); return Promise.resolve(false); }
    T.list = apply(T.list.map((x) => ({ ...x }))); T.busy++; T.status = "save"; repaint();
    const job = T.q.then(() => push(apply, msg)).then(() => { T.busy--; toast(done || "Опубликовано, уже видно всем"); return true; })
      .catch(async (e) => { T.busy--; toast("Не удалось сохранить: " + e.message); T.status = "stale"; T.err = e.message; try { await load(); } catch (x) {} return false; })
      .then((ok) => { repaint(); return ok; });
    T.q = job.catch(() => {});
    return job;
  }
  /* из окна редактора */
  function saveEd(v, isNew, id) {
    const f = {};
    Object.keys(v).forEach((k) => { if (typeof v[k] === "string") v[k] = v[k].trim(); if (v[k] !== "" && v[k] != null) f[k] = v[k]; });
    if (!f.title) { toast("Укажите заголовок"); return false; }
    if (f.date && !/^\d{2}\.\d{2}\.\d{4}$/.test(f.date)) { toast("Дата должна быть в формате дд.мм.гггг, например 08.11.2026"); return false; }
    f.draft = !!v.draft;
    if (isNew) { const n = { id: c.idp + uid(), ...f }; op(ops.add(n), c.name + ": " + n.title.slice(0, 50), n.draft ? "Черновик сохранён (виден только вам)" : "Опубликовано, уже видно всем"); }
    else { const keys = SCHEMA[c.prop].fields.map((x) => x[0]).concat(c.posKeys); op(ops.set(id, f, keys), c.name + " изменено: " + f.title.slice(0, 50), "Изменения сохранены"); }
    return true;
  }
  const del = (id) => { const go = c.detail.test(location.hash); const p = op(ops.del(id), c.name + " удалено", "Удалено"); if (go) location.hash = c.listHash; return p; };
  const mv = (id, d) => op(ops.mv(id, d), c.name + ": порядок", "Порядок сохранён");

  async function tick(force) {
    if (document.hidden || T.busy || !onPage() || (!force && Date.now() - T.last < 20000)) return;
    if (await load() && !document.querySelector(".ov.open")) repaint();
  }
  async function refresh() { try { await load(); } catch (e) {} repaint(); }
  function stat() {
    const s = T.status, t = T.at ? " · " + bTime(T.at) : "";
    if (s === "save") return `<span class="bs sv">Сохраняю на GitHub…</span>`;
    if (s === "live") return `<span class="bs ok">${c.name}: свежая версия${t}</span>`;
    if (s === "load") return `<span class="bs">Загружаю…</span>`;
    if (s === "fail") return `<span class="bs er">Не удалось загрузить ${c.file}${T.err ? " (" + esc(T.err) + ")" : ""}</span>`;
    return `<span class="bs er">Показана сохранённая версия${t} — GitHub сейчас недоступен</span>`;
  }
  /* из loadData(): подключает хранилище и ждёт первую загрузку (не дольше 2.5 с) */
  async function install() {
    Object.defineProperty(S, c.prop, { get: () => T.list, set() {}, enumerable: false, configurable: true });
    const first = load().then((ch) => { const a = document.getElementById("app"); if (ch && a && a.children.length) repaint(); }).catch(() => {});
    await Promise.race([first, new Promise((r) => setTimeout(r, 2500))]);
    clearInterval(T.timer); T.timer = setInterval(() => tick(false), 60000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) tick(false); });
    addEventListener("hashchange", () => tick(false));
    document.addEventListener("click", (e) => { if (e.target.closest && e.target.closest("#" + c.refId)) refresh(); });
  }
  return { T, saveEd, del, mv, stat, install, refresh };
}

const LIFE = liveStore({
  file: "stories.json", prop: "stories", key: "tcs-stories-v1", name: "История станции", idp: "st-", refId: "stref",
  posKeys: ["imgPos"], listHash: "#/life", detail: /^#\/story\//,
  page: (h) => h === "" || h === "life" || /^story\//.test(h),
});
const lifeInstall = () => LIFE.install();
const stSave = (v, isNew, id) => LIFE.saveEd(v, isNew, id);
const stDel = (id) => LIFE.del(id);
const stMv = (id, d) => LIFE.mv(id, d);

const stById = (id) => (S.stories || []).find((s) => s.id === id);
const stOwn = () => OWN && !VIEW();
const stMeta = (s) => `<div class="lf-m">${s.tag ? `<span class="lf-tag">${E(s.tag)}</span>` : ""}${s.draft ? `<span class="chip warn">Черновик</span>` : ""}${s.date ? `<time>${E(s.date)}</time>` : ""}</div>`;
const stPic = (s, eager) => (s.img ? fimg(s.img, cropOf(s, "img"), s.title, eager) : `<div class="evs-ph">${BADGE}</div>`);

/* ---------- блок на главной: одна большая история и три поменьше сбоку ---------- */
const lifeMain = (s) => `<a class="lf-main reveal" href="#/story/${s.id}"><div class="lf-img">${stPic(s)}</div>
  <div class="lf-txt">${stMeta(s)}<h3>${E(s.title)}</h3>${s.summary ? `<p>${E(s.summary)}</p>` : ""}<span class="lf-more">Читать полностью</span></div>${eb("stories", s.id)}${mvb("stories", s.id)}</a>`;
const lifeSide = (s) => `<a class="lf-it reveal" href="#/story/${s.id}"><div class="lf-th">${stPic(s)}</div>
  <div class="lf-txt">${stMeta(s)}<h3>${E(s.title)}</h3>${s.summary ? `<p>${E(s.summary)}</p>` : ""}</div>${eb("stories", s.id)}${mvb("stories", s.id)}</a>`;

function lifeHome() {
  const L = (S.stories || []).filter((s) => !s.draft).slice(0, 4);
  if (!L.length) return stOwn() ? `<section class="sec"><div class="wrap evs-add">${addb("stories", "История станции")}</div></section>` : "";
  const [a, ...b] = L;
  return `<section class="sec alt lf-sec"><div class="wrap">
    <div class="evs-hd reveal"><div><div class="eb">Хроника станции</div><h2>Жизнь станции</h2></div><a class="btn ghost" href="#/life">Все истории</a></div>
    <div class="lf${b.length ? "" : " one"}">${lifeMain(a)}${b.length ? `<div class="lf-side">${b.map(lifeSide).join("")}</div>` : ""}</div>
    ${addb("stories", "История")}
  </div></section>`;
}

/* ---------- страница истории ---------- */
route("story/:id", (id) => {
  const s = stById(id);
  if (!s || (s.draft && !stOwn())) return { html: notFound() };
  const rows = [["Дата", s.date], ["Место", s.place], ["Участвовали", s.who]].filter((r) => r[1]);
  return { title: s.title, html: `${phead(E(s.tag || "Жизнь станции"), E(s.title), "", "", `<a href="#/">Главная</a> / <a href="#/life">Жизнь станции</a>`)}
  <section class="sec"><div class="wrap two"><div>
    ${s.draft ? `<p><span class="chip warn">Черновик: виден только вам</span></p>` : ""}
    ${s.img ? `<figure class="evp reveal"><img src="${E(s.img)}" alt="${E(s.title)}"></figure>` : ""}
    <div class="prose reveal">${s.body && s.body.replace(/<[^>]*>/g, "").trim() ? H(s.body) : `<p>${E(s.summary || "")}</p>`}</div>
  </div><div class="aside">
    ${rows.length ? `<div class="box reveal"><h4>О событии</h4><dl class="evi">${rows.map((r) => `<div><dt>${r[0]}</dt><dd>${E(r[1])}</dd></div>`).join("")}</dl></div>` : ""}
    <a class="btn ghost" href="#/life">Все истории</a>
    <button class="ed addb" data-ed="stories:${s.id}">✎ Править историю</button>
  </div></div></section>` };
}, "life");

/* ---------- хроника: все истории ---------- */
const stCard = (s) => `<a class="lf-card reveal" href="#/story/${s.id}"><div class="lf-ci">${stPic(s)}</div><div class="lf-txt">${stMeta(s)}<h3>${E(s.title)}</h3>${s.summary ? `<p>${E(s.summary)}</p>` : ""}</div>${eb("stories", s.id)}${mvb("stories", s.id)}</a>`;
route("life", () => {
  const all = (S.stories || []).filter((s) => stOwn() || !s.draft);
  return { title: "Жизнь станции", html: `${phead("Хроника станции", "Жизнь станции", "Истории о работе офицеров за пределами вызовов: помощь жителям, встречи, благодарности и просто хорошие новости.", S.meta.hero, null, cropOf(S.meta, "hero"))}
  <section class="sec"><div class="wrap">
    ${stOwn() ? `<div class="bstatus">${LIFE.stat()}<button type="button" class="bref" id="stref">Обновить</button></div>` : ""}
    ${all.length ? `<div class="lf-grid">${all.map(stCard).join("")}</div>` : `<p class="note">Историй пока нет. Загляните сюда позже.</p>`}
    ${addb("stories", "История станции")}</div></section>` };
}, "life");
