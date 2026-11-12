/* ===== «Объявления»: живая лента без пересборки сайта =====
   Записки лежат в board.json в репозитории (а не в data.json). Страница читает его напрямую с GitHub,
   поэтому новая запись видна сразу, не дожидаясь GitHub Pages. Владелец пишет, правит, удаляет и двигает
   записки через токен: каждое действие — отдельный коммит board.json. */
const BOARD = { notes: [], q: Promise.resolve(), busy: 0, status: "load", at: 0, err: "", timer: 0, etag: "" };
const BKEY = "tcs-board-v1";
const bApi = () => `https://api.github.com/repos/${GH.repo}/contents/board.json`;
const bParse = (txt) => {
  const j = JSON.parse(txt), a = Array.isArray(j) ? j : j && j.notes;
  if (!Array.isArray(a)) throw new Error("board.json: ожидался список записок");
  return a.filter((n) => n && typeof n === "object" && typeof n.id === "string" && typeof n.text === "string");
};
const bUtf8 = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, "")), (c) => c.charCodeAt(0)));
const bText = (notes) => JSON.stringify({ notes }, null, 2) + "\n";
const bNow = () => { const d = new Date(), p = (n) => String(n).padStart(2, "0"); return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`; };
const bTime = (t) => { const d = new Date(t), p = (n) => String(n).padStart(2, "0"); return `${p(d.getHours())}:${p(d.getMinutes())}`; };
try { const c = JSON.parse(LS.get(BKEY, "null")); if (c && Array.isArray(c.notes)) { BOARD.notes = c.notes; BOARD.at = c.at || 0; BOARD.status = "cache"; } } catch (e) {}
const bCache = () => LS.set(BKEY, JSON.stringify({ notes: BOARD.notes, at: BOARD.at }));

/* чтение: владелец с токеном — API GitHub (всегда свежее), остальные — raw (раз в минуту), запасной вариант — файл рядом с сайтом */
async function boardLoad() {
  const src = [
    async () => { const r = await fetch(bApi() + "?ref=" + GH.branch, { headers: { ...ghH(), Accept: "application/vnd.github.raw+json" }, cache: "no-cache" }); if (!r.ok) throw new Error("api " + r.status); return r.text(); },
    async () => { const r = await fetch(`https://raw.githubusercontent.com/${GH.repo}/${GH.branch}/board.json?t=${Math.floor(Date.now() / 60000)}`); if (!r.ok) throw new Error("raw " + r.status); return r.text(); },
    async () => { const r = await fetch("board.json", { cache: "no-cache" }); if (!r.ok) throw new Error("file " + r.status); return r.text(); },
  ];
  let last = null;
  /* посетители (без токена) читают raw: у API GitHub лимит 60 запросов/час на IP, а за офисным или мобильным NAT он общий */
  const order = GH.token ? [0, 1, 2] : [1, 2];
  for (let k = 0; k < order.length; k++) {
    const i = order[k], fresh = k < order.length - 1;
    try { const notes = bParse(await src[i]()); if (BOARD.busy) return false; /* не затираем действие, которое ещё записывается */ const ch = JSON.stringify(notes) !== JSON.stringify(BOARD.notes); BOARD.notes = notes; BOARD.at = Date.now(); BOARD.status = fresh ? "live" : "stale"; BOARD.err = ""; bCache(); return ch; }
    catch (e) { last = e; }
  }
  BOARD.status = BOARD.notes.length || BOARD.at ? "stale" : "fail"; BOARD.err = last ? last.message : "";
  return false;
}

/* запись: берём свежую версию с GitHub, применяем действие к ней и коммитим. Так одновременные правки не затирают друг друга */
async function boardPush(apply, msg) {
  for (let i = 0; i < 3; i++) {
    const r = await fetch(bApi() + "?ref=" + GH.branch, { headers: ghH(), cache: "no-store" });
    let notes = [], sha = "";
    if (r.status === 404) notes = [];
    else if (!r.ok) throw pbErr(r, await r.json().catch(() => ({})));
    else { const j = await r.json(); sha = j.sha; notes = bParse(bUtf8(j.content || "")); }
    const next = apply(notes), body = { message: msg, content: await b64Of(new Blob([bText(next)], { type: "application/json" })), branch: GH.branch };
    if (sha) body.sha = sha;
    const p = await fetch(bApi(), { method: "PUT", headers: ghH(), body: JSON.stringify(body) });
    if (p.ok) { BOARD.notes = next; BOARD.at = Date.now(); BOARD.status = "live"; BOARD.err = ""; bCache(); return; }
    if (p.status !== 409 && p.status !== 422) throw pbErr(p, await p.json().catch(() => ({})));
  }
  throw new Error("данные на GitHub менялись одновременно, повторите действие");
}
const bOps = {
  add: (n) => (a) => [n, ...a.filter((x) => x.id !== n.id)],
  upd: (id, f) => (a) => a.map((x) => (x.id === id ? { ...x, ...f } : x)),
  del: (id) => (a) => a.filter((x) => x.id !== id),
  mv: (id, d) => (a) => { const i = a.findIndex((x) => x.id === id), j = i + d; if (i < 0 || j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a; },
};
/* действие владельца: мгновенно показываем у себя, коммитим в очереди */
function boardOp(apply, msg, done) {
  if (!GH.token) { toast("Чтобы публиковать без пересборки, подключите токен GitHub: «Медиа» → «Подключить»"); return Promise.resolve(false); }
  BOARD.notes = apply(BOARD.notes.map((x) => ({ ...x }))); BOARD.busy++; BOARD.status = "save"; boardPaint();
  const job = BOARD.q.then(() => boardPush(apply, msg)).then(() => { BOARD.busy--; toast(done || "Опубликовано, уже видно всем"); return true; })
    .catch(async (e) => { BOARD.busy--; toast("Не удалось сохранить: " + e.message); BOARD.status = "stale"; BOARD.err = e.message; try { await boardLoad(); } catch (x) {} return false; })
    .then((ok) => { boardPaint(); return ok; });
  BOARD.q = job.catch(() => {});
  return job;
}
/* из окна редактора */
function boardSaveEd(v, isNew, id) {
  const f = {}; Object.keys(v).forEach((k) => { if (typeof v[k] === "string") v[k] = v[k].trim(); if (v[k] !== "" && v[k] != null) f[k] = v[k]; });
  if (!f.text) { toast("Напишите текст объявления"); return false; }
  if (isNew) { const n = { id: "n-" + uid(), ...f, date: f.date || bNow() }; boardOp(bOps.add(n), "Объявление: " + (n.title || n.author || n.id).slice(0, 50), "Объявление опубликовано, уже видно всем"); }
  else { const cur = BOARD.notes.find((x) => x.id === id) || {}, nf = {}; ["title", "author", "role", "place", "date", "text"].forEach((k) => { nf[k] = f[k] != null ? f[k] : ""; }); boardOp(bOps.upd(id, nf), "Объявление изменено: " + (nf.title || nf.author || cur.id || id).slice(0, 50), "Изменения сохранены"); }
  return true;
}
const boardDel = (id) => boardOp(bOps.del(id), "Объявление удалено", "Удалено");
const boardMv = (id, d) => boardOp(bOps.mv(id, d), "Объявления: порядок", "Порядок сохранён");

/* ===== отрисовка ===== */
function boardStat() {
  const s = BOARD.status, t = BOARD.at ? " · " + bTime(BOARD.at) : "";
  if (s === "save") return `<span class="bs sv">Сохраняю на GitHub…</span>`;
  if (s === "live") return `<span class="bs ok">Свежая версия${t}</span>`;
  if (s === "load") return `<span class="bs">Загружаю…</span>`;
  if (s === "fail") return `<span class="bs er">Не удалось загрузить объявления${BOARD.err ? " (" + esc(BOARD.err) + ")" : ""}</span>`;
  return `<span class="bs er">Показана сохранённая версия${t} — GitHub сейчас недоступен</span>`;
}
const boardItem = (n) => `<div class="post reveal in"><div class="av">${E(ini(n.author))}</div><div class="pbody"><div class="who">${E(n.role ? n.role + " " : "")}${E(n.author || "")}</div><div class="where">${E(n.place || "")}${n.place && n.date ? " · " : ""}${n.date ? E(n.date) : ""}</div>${n.title ? `<h4 class="nt">${E(n.title)}</h4>` : ""}<p class="nb">${E(n.text)}</p></div>${eb("notes", n.id)}${mvb("notes", n.id)}</div>`;
function boardList() {
  const L = BOARD.notes.map(boardItem).join("") || (BOARD.status === "load" ? "" : `<p class="note">Объявлений пока нет.</p>`);
  return `${OWN && !VIEW() ? `<div class="bstatus" id="bst">${boardStat()}<button type="button" class="bref" id="bref">Обновить</button></div>` : ""}${L}${addb("notes", "Объявление")}`;
}
function boardPaint() { const el = $("#bl"); if (!el) return; el.innerHTML = ui(boardList()); const b = $("#bref"); if (b) b.onclick = boardRefresh; }
async function boardRefresh() { BOARD.status = BOARD.busy ? "save" : BOARD.notes.length ? BOARD.status : "load"; try { await boardLoad(); } catch (e) {} boardPaint(); }
function boardWatch() {
  clearInterval(BOARD.timer);
  BOARD.timer = setInterval(async () => {
    if (!$("#bl")) { clearInterval(BOARD.timer); return; }
    if (document.hidden || BOARD.busy) return;
    if (await boardLoad()) boardPaint(); else { const s = $("#bst"); if (s) { const b = $(".bs", s); if (b) b.outerHTML = boardStat(); } }
  }, 30000);
}
