/* ===== pages: documents, press, forms, board ===== */
route("docs", () => {
  const T = [["all", "Все"], ["order", "Приказы"], ["briefing", "Брифинги"], ["memo", "Служебные записки"]];
  return { title: "Документы", init: docsInit, html: `${phead("Служебные документы", "Приказы, брифинги и нормативы", "Официальные документы центральной станции Трамонтана. Каждый офицер обязан быть ознакомлен с актуальными приказами и последним брифингом.", S.meta.hero, null, cropOf(S.meta, "hero"))}
  <section class="sec"><div class="wrap"><div class="filt">${T.map((t, i) => `<button data-df="${t[0]}" class="${i ? "" : "on"}">${t[1]}</button>`).join("")}<input id="dq" placeholder="Поиск по номеру и названию…" aria-label="Поиск документов"></div><div id="dl">${docList("all", "")}</div>${addb("docs", "Документ")}</div></section>` };
}, "docs");
function docList(t, q) {
  q = (q || "").toLowerCase();
  const L = S.docs.filter((d) => d.type !== "press" && (t === "all" || d.type === t) && (!q || (d.num + " " + d.title).toLowerCase().includes(q))).sort((a, b) => dkey(b.date).localeCompare(dkey(a.date)));
  return L.map(drow).join("") || `<p class="note">Ничего не найдено.</p>`;
}
function docsInit(app) {
  let t = "all";
  const up = () => { $("#dl", app).innerHTML = ui(docList(t, $("#dq", app).value)); };
  $(".filt", app).addEventListener("click", (e) => { const b = e.target.closest("[data-df]"); if (!b) return; t = b.dataset.df; $$("[data-df]", app).forEach((x) => x.classList.toggle("on", x === b)); up(); });
  $("#dq", app).addEventListener("input", up);
}
/* ===== режим скриншота: на месте страницы остаётся только документ на ровном фоне.
   Панель управления гаснет через пару секунд и возвращается при движении мыши / касании. ===== */
const SHOT_BG = ["dark", "light", "white"], SHOT_BGL = { dark: "тёмный", light: "светлый", white: "белый" };
let shotY = 0, shotT = 0;
function shotClose() {
  const o = $("#shot"); if (!o) return;
  clearTimeout(shotT); o.remove(); document.body.classList.remove("shot"); scrollTo({ top: shotY, behavior: "instant" });
}
function shotOpen(src, kind) {
  if (!src) return; shotClose();
  const c = src.cloneNode(true); c.removeAttribute("id");
  $$(".ed,.edb,[data-ed],[data-mv]", c).forEach((x) => x.remove()); $$("[data-t],[data-lk]", c).forEach((x) => { x.removeAttribute("data-t"); x.removeAttribute("data-lk"); }); $$(".reveal", c).forEach((x) => x.classList.add("in"));
  const o = document.createElement("div"); o.id = "shot"; if (kind) o.className = kind;
  o.dataset.bg = SHOT_BG.includes(LS.get("tcs-shotbg")) ? LS.get("tcs-shotbg") : "dark";
  const sc = document.createElement("div"); sc.className = "sc"; sc.append(c);
  o.innerHTML = `<div class="shot-bar" role="toolbar" aria-label="Режим скриншота"><span>Режим скриншота</span><button type="button" data-sh="bg"></button><button type="button" data-sh="x">Закрыть · Esc</button></div>`;
  o.append(sc);
  const bar = $(".shot-bar", o), lab = () => { $('[data-sh="bg"]', o).textContent = "Фон: " + SHOT_BGL[o.dataset.bg]; };
  const wake = () => { bar.classList.remove("hide"); clearTimeout(shotT); shotT = setTimeout(() => bar.classList.add("hide"), 2500); };
  o.addEventListener("click", (e) => {
    const b = e.target.closest("[data-sh]"); wake(); if (!b) return;
    if (b.dataset.sh === "x") shotClose();
    else { o.dataset.bg = SHOT_BG[(SHOT_BG.indexOf(o.dataset.bg) + 1) % SHOT_BG.length]; LS.set("tcs-shotbg", o.dataset.bg); lab(); }
  });
  ["mousemove", "touchstart", "pointerdown"].forEach((t) => o.addEventListener(t, wake, { passive: true }));
  lab(); shotY = scrollY;
  document.body.append(o); document.body.classList.add("shot"); scrollTo({ top: 0, behavior: "instant" }); wake();
  o.tabIndex = -1; o.focus({ preventScroll: true }); /* фокус с исчезнувшей кнопки иначе рисует рамку по краю экрана */
  addEventListener("hashchange", shotClose, { once: true });
}
route("doc/:id", (id) => {
  const d = dById(id), m = S.meta;
  if (!d) return { html: notFound() };
  const sg = (d.sign || []).map((s) => { const p = s.pid ? pById(s.pid) : s; return p ? `<div class="sg"><i>${E((p.en || p.name || "").split(" ").pop())}</i><b>${E(p.name)}</b><div>${E(p.rank || "")}${p.title ? " · " + E(p.title) : ""}</div></div>` : ""; }).join("");
  const stamp = d.draft ? "Готовится" : d.type === "order" ? "В силе" : "";
  return { title: d.title, html: `<section class="sec" style="padding-top:34px"><div class="wrap">
    <div class="tools"><a class="btn ghost" href="#/${d.type === "press" ? "press" : "docs"}">← К списку</a><button id="pr" title="Чистый вид документа без шапки и меню — для скриншота">Режим скриншота</button><button id="cp">Копировать ссылку</button><button class="ed" data-ed="docs:${d.id}">✎ Править</button></div>
    <article class="paper">${stamp ? `<div class="stamp">${stamp}</div>` : ""}<svg class="wm" viewBox="0 0 64 64">${BADGE.replace(/^<svg[^>]*>|<\/svg>$/g, "")}</svg>
      <div class="ptop"><div class="st">★ TRAMONTANE CENTRAL STATION — SFPD — 2nd AREA COMMAND ★</div><b>${E(m.name)}</b><span>${E(m.org)} · ${E(m.address)}</span></div>
      <h1>${E(d.title)}</h1>
      ${d.meta && d.meta.length ? `<div class="meta">${d.meta.map((x) => `<div><span>${E(x[0])}</span>${E(x[1])}</div>`).join("")}</div>` : ""}
      <div class="prose">${H(d.body)}</div>
      ${d.quote ? `<div class="q2">${E(d.quote)}</div>` : ""}
      ${sg ? `<div class="sigs">${sg}</div>` : ""}
      ${d.dist ? `<div class="dist">Рассылка: ${E(d.dist)}</div>` : ""}
    </article></div></section>`,
    init(app) { $("#pr", app).onclick = () => shotOpen($(".paper", app)); $("#cp", app).onclick = () => { try { navigator.clipboard.writeText(location.href); toast("Ссылка скопирована"); } catch (e) {} }; } };
}, "docs");

route("press", () => ({ title: "Пресс-центр", html: `${phead("Пресс-центр", "Пресс-релизы станции", E(S.meta.pressIntro || ""), S.meta.hero, null, cropOf(S.meta, "hero"))}
  <section class="sec"><div class="wrap"><div class="grid g3">${S.docs.filter((d) => d.type === "press").map((d) => `<a class="card lnk reveal" href="#/doc/${d.id}"><div class="pad"><div class="ref">${E(d.num)}</div><h3 style="margin:10px 0 12px;font-size:17px">${E(d.title)}</h3><span class="chip ${d.draft ? "warn" : "ok"}">${d.draft ? "Готовится" : E(d.status || "Опубликован")}</span></div>${eb("docs", d.id)}</a>`).join("")}</div>${addb("press", "Пресс-релиз")}</div></section>` }), "press");

route("forms", () => ({ title: "Формуляры", html: `${phead("Формуляры", "Заявления, рапорты и обращения", "Заполните форму на странице: готовый текст в установленном формате можно скопировать и отправить командованию.", S.meta.hero, null, cropOf(S.meta, "hero"))}
  <section class="sec"><div class="wrap"><div class="grid g3">${S.forms.map((f) => `<a class="card lnk reveal" href="#/form/${f.id}"><div class="pad"><div class="ref">${E(f.ref || "—")}</div><h3 style="margin:10px 0 8px;font-size:18px">${E(f.title)}</h3><p style="margin:0">${E(f.desc || "")}</p></div>${eb("forms", f.id)}</a>`).join("")}</div>
  <div class="prose reveal" style="margin-top:44px;max-width:760px"><h3>Куда обращаться</h3><p>${E(S.meta.contactIntro || "")}</p></div>${addb("forms", "Формуляр")}</div></section>` }), "forms");

const today = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
const ruDate = (v) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ""); return m ? m[3] + "." + m[2] + "." + m[1] : v; };
const PH = { count: "кол-во", name: "имя фамилия", rank: "звание", date: "дата", on: "дата", from: "дата", to: "дата", d1: "дата", d2: "дата", sign: "подпись", phone: "номер", id: "ID аккаунта" };
function fillTpl(f, vals, tpl, emptyRaw) {
  const F = Object.fromEntries(f.fields.map((x) => [x.k, x]));
  return String(tpl || "").replace(/\{(\w+)\}/g, (m, k) => {
    const x = F[k]; if (!x) return m; const v = vals[k];
    if (x.t === "check") return v ? "[ X ]" : "[   ]";
    if (x.t === "list") { const L = String(v || "").split("\n").map((s) => s.trim()).filter(Boolean); return (L.length ? L : ["(ссылка)"]).map((s, i) => i + 1 + ". " + s).join("\n"); }
    if (!v) return emptyRaw && emptyRaw[k] != null ? emptyRaw[k] : "*" + (PH[k] || x.l.split(/[,(:]/)[0].trim().toLowerCase().split(" ").slice(0, 3).join(" ")) + "*";
    return x.t === "date" ? ruDate(v) : v;
  });
}
const formOut = (f, vals) => fillTpl(f, vals, f.tpl);
route("form/:id", (id) => {
  const f = fById(id);
  if (!f) return { html: notFound() };
  let sec = "";
  const fields = f.fields.map((x) => {
    let h = "";
    if (x.sec && x.sec !== sec) { sec = x.sec; h += `<div class="fsec">${E(sec)}</div>`; }
    const lab = `<label for="f_${x.k}">${E(x.l)}${x.ooc ? "<em>OOC</em>" : ""}</label>`;
    const inp = x.t === "area" || x.t === "list" ? `<textarea id="f_${x.k}" data-k="${x.k}" placeholder="${E(x.ph || "")}"></textarea>` : x.t === "check" ? `<input type="checkbox" id="f_${x.k}" data-k="${x.k}">` : `<input id="f_${x.k}" data-k="${x.k}" type="${x.t === "date" ? "date" : x.t === "number" ? "number" : "text"}" placeholder="${E(x.ph || "")}">`;
    return h + (x.t === "check" ? `<div class="fld ck">${inp}${lab}</div>` : `<div class="fld">${lab}${inp}</div>`);
  }).join("");
  return { title: f.title, html: `${phead(E(f.ref || "Формуляр"), E(f.title), E(f.desc || ""), null, `<a href="#/">Главная</a> / <a href="#/forms">Формуляры</a>`)}
  <section class="sec"><div class="wrap fg"><div><div class="note" style="margin-bottom:14px">Адресат: ${E(f.to || "")}. Поля сохраняются в вашем браузере.</div>${fields}<button id="fclr">Очистить форму</button> <button class="ed" data-ed="forms:${f.id}">✎ Править формуляр</button></div>
    <div class="col2"><div class="stk"><div class="outh"><div class="otabs" role="tablist" aria-label="Вид вывода"><button type="button" role="tab" data-om="txt">Текст</button><button type="button" role="tab" data-om="bb">BB-код</button></div><button class="pri" id="fcp">Скопировать</button><button id="fpr" title="Чистый вид текста без шапки и меню — для скриншота">Режим скриншота</button></div><div class="out" id="fo"></div><div class="out bb" id="fob" hidden></div><p class="note" id="fobn" hidden>BB-код для вставки на форум: скопируйте и вставьте в редактор в режиме BB-кода (кнопка «[ ]» в окне ответа).</p></div></div></div></section>`,
    init(app) {
      const key = "tcs-f-" + f.id; let vals = {};
      try { vals = JSON.parse(LS.get(key, "{}")); } catch (e) {}
      f.fields.forEach((x) => { if (x.t === "date" && vals[x.k] == null && ["date", "on"].includes(x.k)) vals[x.k] = today(); });
      const els = $$("[data-k]", app);
      els.forEach((el) => { const v = vals[el.dataset.k]; if (el.type === "checkbox") el.checked = !!v; else if (v != null) el.value = v; });
      const up = () => { els.forEach((el) => { vals[el.dataset.k] = el.type === "checkbox" ? el.checked : el.value; }); LS.set(key, JSON.stringify(vals)); $("#fo", app).textContent = formOut(f, vals); $("#fob", app).textContent = bbOut(f, vals); };
      const fgEl = $(".fg", app); fgEl.addEventListener("input", up); fgEl.addEventListener("change", up);
      let mode = LS.get("tcs-fmode", "txt") === "bb" ? "bb" : "txt";
      const setMode = (m) => {
        mode = m; LS.set("tcs-fmode", m);
        $("#fo", app).hidden = m === "bb"; $("#fob", app).hidden = m !== "bb"; $("#fobn", app).hidden = m !== "bb";
        $$("[data-om]", app).forEach((b) => { const on = b.dataset.om === m; b.classList.toggle("on", on); b.setAttribute("aria-selected", on); });
        $("#fcp", app).textContent = m === "bb" ? "Скопировать BB-код" : "Скопировать текст";
      };
      $$("[data-om]", app).forEach((b) => { b.onclick = () => setMode(b.dataset.om); });
      setMode(mode);
      $("#fcp", app).onclick = () => { try { navigator.clipboard.writeText($(mode === "bb" ? "#fob" : "#fo", app).textContent); toast(mode === "bb" ? "BB-код скопирован" : "Текст скопирован"); } catch (e) { toast("Не удалось скопировать"); } };
      $("#fpr", app).onclick = () => { const t = $("#fo", app).cloneNode(true); t.hidden = false; shotOpen(t, "so"); }; /* скриншот всегда с обычным текстом */
      $("#fclr", app).onclick = () => { LS.set(key, "{}"); render(); };
      up();
    } };
}, "forms");

route("board", () => ({ title: "Объявления", init: boardInit, html: `${phead("Объявления станции", "Объявления", E(S.meta.lifeIntro || ""), S.meta.lifeImg, null, cropOf(S.meta, "lifeImg"))}
  <section class="sec"><div class="wrap two"><div class="bcol">
    <div class="post compose" id="cmp"><div class="av">✎</div><div class="cbody"><button class="cmp-t" id="cmpt" aria-expanded="false">Написать объявление…</button>
      <div class="cmp-b"><div><div class="cf"><div class="fld"><label>Автор (звание, имя)</label><input id="bw" placeholder="Офицер Имя Фамилия"></div><div class="fld"><label>Где / подпись</label><input id="ba" placeholder="Доска объявлений станции"></div></div>
        <div class="fld ownonly"><label>Заголовок (необязательно)</label><input id="bh" placeholder="Например: Брифинг в 17:30"></div>
        <div class="fld"><label>Текст</label><textarea id="bt"></textarea></div><div class="out small" id="bo"></div><p class="cact"><button class="pri ownonly" id="bpub">Опубликовать на сайте</button><button id="bc">Скопировать</button><button id="bx">Свернуть</button></p></div></div></div></div>
    <div id="bl">${boardList()}</div></div>
    <div class="aside"><details class="box rl" id="rl" open><summary>Правила площадки</summary><ol class="rules">${(S.meta.lifeRules || []).map((r) => `<li>${E(r.replace(/^\d+\.\s*/, ""))}</li>`).join("")}</ol></details></div></div></section>` }), "board");
function boardInit(app) {
  const c = $("#cmp", app), t = $("#cmpt", app);
  const up = () => { $("#bo", app).textContent = `*${$("#bw", app).value || "Офицер"} ${$("#ba", app).value || "оставил записку на доске объявлений станции"}*\n${$("#bt", app).value}`; };
  t.onclick = () => { const o = c.classList.toggle("open"); t.setAttribute("aria-expanded", o); if (o) $("#bw", app).focus(); };
  $("#bx", app).onclick = () => { c.classList.remove("open"); t.setAttribute("aria-expanded", "false"); };
  ["bw", "ba", "bt"].forEach((i) => $("#" + i, app).addEventListener("input", up)); up();
  $("#bc", app).onclick = () => { try { navigator.clipboard.writeText($("#bo", app).textContent); toast("Скопировано"); } catch (e) {} };
  $("#bpub", app).onclick = () => {
    const author = $("#bw", app).value.trim(), text = $("#bt", app).value.trim();
    if (!author || !text) { toast("Заполните автора и текст"); return; }
    const n = { id: "n-" + uid(), author, text, date: bNow() }, pl = $("#ba", app).value.trim(), ti = $("#bh", app).value.trim();
    if (pl) n.place = pl; if (ti) n.title = ti;
    boardOp(bOps.add(n), "Объявление: " + (ti || author).slice(0, 50), "Объявление опубликовано, уже видно всем").then((ok) => { if (!ok) return; $("#bt", app).value = ""; $("#bh", app).value = ""; up(); c.classList.remove("open"); t.setAttribute("aria-expanded", "false"); });
  };
  if (innerWidth < 940) $("#rl", app).open = false;
  boardPaint(); boardRefresh(); boardWatch();
}
