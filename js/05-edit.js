/* ===== editing: schema-driven forms, rich text, reorder ===== */
const OKT = new Set("P,BR,H2,H3,H4,STRONG,B,EM,I,U,S,SPAN,A,UL,OL,LI,BLOCKQUOTE,HR,IMG,TABLE,THEAD,TBODY,TR,TD,TH,DIV,SUB,SUP".split(","));
function clean(html) {
  const d = new DOMParser().parseFromString("<body>" + html, "text/html").body;
  (function w(n) {
    [...n.children].forEach((c) => {
      const t = c.tagName;
      if (!OKT.has(t)) { if (/^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|LINK|META|FORM|INPUT|BUTTON|TEXTAREA|SELECT|SVG|MATH|NOSCRIPT|TEMPLATE)$/.test(t)) { c.remove(); return; } w(c); c.replaceWith(...c.childNodes); return; }
      [...c.attributes].forEach((a) => { if (!/^(href|src|alt|title|colspan|rowspan)$/.test(a.name)) c.removeAttribute(a.name); });
      if (c.hasAttribute("href")) { const v = c.getAttribute("href").trim(); if (!/^(https?:\/\/\S+|mailto:\S+|#\S*|[\w.\/%-]+)$/i.test(v)) c.removeAttribute("href"); else if (/^https?:/i.test(v)) { c.setAttribute("target", "_blank"); c.setAttribute("rel", "noopener noreferrer"); } }
      if (t === "IMG") { const v = (c.getAttribute("src") || "").trim(); if (!/^(data:image\/(png|jpe?g|gif|webp);base64,[\w+\/=]+|https?:\/\/\S+|[\w.\/%-]+)$/i.test(v)) { c.remove(); return; } }
      w(c);
    });
  })(d);
  return d.innerHTML;
}
const ST = { type: [["order", "Приказ"], ["briefing", "Брифинг"], ["memo", "Служебная записка"], ["press", "Пресс-релиз"]] };
const unitOpts = () => S.units.map((u) => [u.id, u.name]), formOpts = () => [["", "—"]].concat(S.forms.map((f) => [f.id, f.title])), pOpts = () => S.people.map((p) => [p.id, p.name === "VACANT" ? "VACANT — " + p.title : p.name]);
const SCHEMA = {
  meta: { title: "Настройки сайта", single: 1, fields: [["name", "Название", "text"], ["org", "Подзаголовок (департамент)", "text"], ["address", "Адрес", "text"], ["motto", "Девиз / цитата", "area"], ["mottoBy", "Автор цитаты", "text"], ["hero", "Главное изображение", "image"], ["careerImg", "Изображение «Карьера»", "image"], ["lifeImg", "Изображение «Доска станции»", "image"], ["intro", "Вступление на главной", "html"], ["about", "Текст «О станции»", "html"], ["building", "О здании", "area"], ["pressIntro", "Вступление пресс-центра", "area"], ["lifeIntro", "Вступление доски", "area"], ["lifeRules", "Правила доски (по строке)", "lines"], ["contactIntro", "Контакты и обращения", "area"], ["stats", "Показатели главной", "rows", { keys: ["n", "l"], ph: ["Число", "Подпись"] }]] },
  vacancies: { title: "Кадровый смотр", single: 1, fields: [["status", "Статус (Открыто / Закрыто)", "text"], ["title", "Заголовок", "text"], ["rows", "Должности", "arr2", { n: 4, ph: ["Должность", "Ранг", "Вакансий", "Мин. звание"] }], ["req", "Требования (по строке)", "lines"]] },
  people: { title: "Сотрудник", fields: [["name", "Имя и фамилия (VACANT для вакансии)", "text"], ["en", "Имя латиницей", "text"], ["rank", "Звание", "text"], ["title", "Должность", "text"], ["unit", "Подразделение", "select", unitOpts], ["status", "Статус", "select", () => [["active", "В штате"], ["vacant", "Вакансия"]]], ["photo", "Фото", "image"], ["bio", "Описание", "area"]], blank: () => ({ name: "", en: "", rank: "", title: "", unit: "patrol", photo: "", bio: "", status: "active" }) },
  units: { title: "Подразделение", fields: [["name", "Название", "text"], ["en", "Название латиницей", "text"], ["tag", "Девиз / короткое описание", "text"], ["banner", "Баннер", "image"], ["quote", "Цитата", "area"], ["quoteBy", "Автор цитаты", "text"], ["summary", "Описание", "html"], ["roster", "Состав", "roster"], ["criteria", "Критерии отбора (по строке)", "lines"], ["form", "Формуляр заявления", "select", formOpts], ["docs", "Документы (id, по строке)", "lines"], ["gallery", "Галерея (ссылки, по строке)", "lines"]], blank: () => ({ name: "", en: "", tag: "", banner: S.meta.hero, summary: "", roster: [], criteria: [], form: "", docs: [], gallery: [] }) },
  ranks: { title: "Звание", fields: [["group", "Группа", "text"], ["name", "Название", "text"], ["desc", "Описание", "area"]], blank: () => ({ group: "Полевая служба", name: "", desc: "" }) },
  timeline: { title: "Событие истории", fields: [["year", "Дата / период", "text"], ["title", "Заголовок", "text"], ["text", "Описание", "area"]], blank: () => ({ year: "", title: "", text: "" }) },
  rooms: { title: "Помещение", fields: [["title", "Название", "text"], ["text", "Описание", "area"], ["img", "Изображение", "image"]], blank: () => ({ title: "", text: "", img: "" }) },
  zones: { title: "Зона ответственности", fields: [["n", "Номер (I, II…)", "text"], ["name", "Название", "text"], ["station", "Станция", "text"], ["img", "Изображение", "image"], ["text", "Описание", "area"], ["home", "Наша зона", "bool"]], blank: () => ({ n: "", name: "", station: "", img: "", text: "" }) },
  docs: { title: "Документ", fields: [["type", "Тип", "select", () => ST.type], ["num", "Номер", "text"], ["title", "Название", "text"], ["date", "Дата (дд.мм.гггг)", "text"], ["status", "Статус", "text"], ["draft", "Черновик / готовится", "bool"], ["body", "Текст", "html"], ["meta", "Реквизиты", "arr2", { n: 2, ph: ["Поле", "Значение"] }], ["sign", "Подписи", "pids"], ["dist", "Рассылка", "text"], ["quote", "Цитата", "area"]], blank: () => ({ type: "order", num: "", title: "", date: "", status: "В силе", draft: false, body: "<p></p>", meta: [], sign: [], dist: "", quote: "" }) },
  forms: { title: "Формуляр", fields: [["title", "Название", "text"], ["ref", "Номер формы", "text"], ["to", "Адресат", "text"], ["desc", "Описание", "area"], ["tpl", "Шаблон ({ключ} — поля)", "area"], ["fields", "Поля (JSON)", "json"]], blank: () => ({ title: "", ref: "", to: "", desc: "", tpl: "", fields: [] }) },
  notes: { title: "Записка", fields: [["author", "Автор", "text"], ["role", "Звание / роль", "text"], ["place", "Где", "text"], ["date", "Дата", "text"], ["text", "Текст", "area"]], blank: () => ({ author: "", role: "", place: "", date: "", text: "" }) },
};
const RB = [["bold", "<b>B</b>"], ["italic", "<i>I</i>"], ["underline", "<u>U</u>"], ["h3", "H"], ["p", "¶"], ["ul", "• ≡"], ["ol", "1. ≡"], ["bq", "❝"], ["link", "🔗"], ["img", "🖼"], ["hr", "—"], ["undo", "↶"], ["redo", "↷"], ["rm", "⌫"]];
function fieldHTML(f, v) {
  const [k, label, t, o] = f, A = (x) => esc(x == null ? "" : x);
  let h = "";
  if (t === "text") h = `<input data-f="${k}" value="${A(v)}">`;
  else if (t === "area") h = `<textarea data-f="${k}">${A(v)}</textarea>`;
  else if (t === "json") h = `<textarea data-f="${k}" data-t="json" style="min-height:160px;font-family:var(--ff-m);font-size:12px">${A(JSON.stringify(v || [], null, 1))}</textarea>`;
  else if (t === "lines") h = `<textarea data-f="${k}" data-t="lines">${A((v || []).join("\n"))}</textarea>`;
  else if (t === "bool") return `<div class="fld ck"><input type="checkbox" data-f="${k}" ${v ? "checked" : ""}><label>${esc(label)}</label></div>`;
  else if (t === "select") h = `<select data-f="${k}">${o().map((x) => `<option value="${A(x[0])}" ${x[0] === v ? "selected" : ""}>${A(x[1])}</option>`).join("")}</select>`;
  else if (t === "image") h = `<div class="imgf"><input data-f="${k}" value="${A(v)}" placeholder="https://… или img/файл.webp"><button type="button" data-imgpick>Библиотека</button><button type="button" data-imgup>Загрузить</button>${v ? `<img src="${A(v)}" alt="">` : ""}</div>`;
  else if (t === "html") h = `<div class="rte-tb">${RB.map((b) => `<button type="button" data-x="${b[0]}">${b[1]}</button>`).join("")}</div><div class="rte" contenteditable="true" data-f="${k}" data-t="html">${clean(v || "")}</div>`;
  else if (t === "rows") h = `<div class="rows" data-f="${k}" data-t="rows" data-keys="${o.keys.join(",")}">${(v || []).map((r) => rowHTML(o.keys.map((x) => r[x]), o.ph)).join("")}</div><button type="button" data-radd>+ строка</button>`;
  else if (t === "arr2") h = `<div class="rows" data-f="${k}" data-t="arr2" data-n="${o.n}">${(v || []).map((r) => rowHTML(r, o.ph)).join("")}</div><button type="button" data-radd>+ строка</button>`;
  else if (t === "roster") h = `<div class="rows" data-f="${k}" data-t="roster">${(v || []).map((r) => rosterRow(r)).join("")}</div><button type="button" data-radd>+ строка</button>`;
  else if (t === "pids") h = `<div class="rows" data-f="${k}" data-t="pids">${(v || []).map((r) => pidRow(r.pid)).join("")}</div><button type="button" data-radd>+ подпись</button>`;
  return `<div class="fld"><label>${esc(label)}</label>${h}</div>`;
}
const rowHTML = (r, ph) => `<div class="rowi" style="--c:${ph.length}">${ph.map((p, i) => `<input data-c placeholder="${esc(p)}" value="${esc((r || [])[i] || "")}">`).join("")}<button type="button" data-rm>×</button></div>`;
const rosterRow = (r) => `<div class="rowi" style="--c:2"><input data-c="role" placeholder="Роль" value="${esc((r || {}).role || "")}"><select data-c="pid">${pOpts().map((x) => `<option value="${esc(x[0])}" ${r && x[0] === r.pid ? "selected" : ""}>${esc(x[1])}</option>`).join("")}</select><button type="button" data-rm>×</button></div>`;
const pidRow = (pid) => `<div class="rowi" style="--c:1"><select data-c="pid">${pOpts().map((x) => `<option value="${esc(x[0])}" ${x[0] === pid ? "selected" : ""}>${esc(x[1])}</option>`).join("")}</select><button type="button" data-rm>×</button></div>`;
let ED = null;
function openEd(coll, id) {
  const sc = SCHEMA[coll]; if (!sc) return;
  const single = !!sc.single, isNew = !single && id === "new";
  const item = single ? S[coll] : isNew ? sc.blank() : S[coll].find((x) => x.id === id);
  if (!item) return;
  ED = { coll, id, isNew, single, item };
  const o = ovOpen("edov", `<div class="md wide"><div class="mh"><h3>${esc(sc.title)}${isNew ? " — новый" : ""}</h3><button data-edx aria-label="Закрыть">✕</button></div><div class="mb" id="edb">${sc.fields.map((f) => fieldHTML(f, item[f[0]])).join("")}</div><div class="mf">${single || isNew ? "" : `<button class="dng" data-edel>Удалить</button>`}<span class="sp"></span><button data-edx>Отмена</button><button class="pri" data-edsave>Сохранить</button></div></div>`);
  o.scrollTop = 0;
}
function collect() {
  const sc = SCHEMA[ED.coll], out = {};
  for (const f of sc.fields) {
    const el = $(`#edb [data-f="${f[0]}"]`), t = f[2]; if (!el) continue; let v;
    if (t === "bool") v = el.checked;
    else if (t === "html") v = clean(el.innerHTML);
    else if (t === "lines") v = el.value.split("\n").map((s) => s.trim()).filter(Boolean);
    else if (t === "json") { try { v = JSON.parse(el.value || "[]"); } catch (e) { toast("Поле «" + f[1] + "»: ошибка JSON"); return null; } }
    else if (t === "rows") { const ks = el.dataset.keys.split(","); v = $$(".rowi", el).map((r) => Object.fromEntries(ks.map((k, i) => [k, $$("[data-c]", r)[i].value.trim()]))).filter((r) => Object.values(r).some(Boolean)); }
    else if (t === "arr2") v = $$(".rowi", el).map((r) => $$("[data-c]", r).map((i) => i.value.trim())).filter((r) => r.some(Boolean));
    else if (t === "roster") v = $$(".rowi", el).map((r) => ({ role: $("[data-c=role]", r).value.trim(), pid: $("[data-c=pid]", r).value }));
    else if (t === "pids") v = $$(".rowi", el).map((r) => ({ pid: $("[data-c=pid]", r).value }));
    else v = el.value;
    out[f[0]] = v;
  }
  return out;
}
function edSave() {
  const v = collect(); if (!v) return;
  if (ED.single) Object.assign(S[ED.coll], v);
  else if (ED.isNew) { const it = Object.assign({ id: (ED.coll === "docs" ? "d-" : ED.coll[0] + "-") + uid() }, v); if (ED.pressNew) it.type = "press"; S[ED.coll].push(it); }
  else Object.assign(ED.item, v);
  save(); ovClose("edov"); render(); toast("Сохранено");
}
function mvItem(c, id, d) { const a = S[c], i = a.findIndex((x) => x.id === id), j = i + d; if (i < 0 || j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; save(); render(); }
/* modal-level events */
document.addEventListener("click", (e) => {
  const ov = e.target.closest("#edov"); if (!ov) return;
  const b = e.target.closest("button"); if (!b) { if (e.target === ov) ovClose("edov"); return; }
  const d = b.dataset;
  if ("edx" in d) ovClose("edov");
  else if ("edsave" in d) edSave();
  else if ("edel" in d) arm(b, () => { S[ED.coll] = S[ED.coll].filter((x) => x.id !== ED.id); save(); ovClose("edov"); render(); toast("Удалено"); });
  else if ("rm" in d) b.closest(".rowi").remove();
  else if ("radd" in d) { const box = b.previousElementSibling, t = box.dataset.t; const h = t === "rows" ? rowHTML([], new Array(box.dataset.keys.split(",").length).fill("")) : t === "arr2" ? rowHTML([], new Array(+box.dataset.n).fill("")) : t === "roster" ? rosterRow(null) : pidRow(""); box.insertAdjacentHTML("beforeend", h); }
  else if ("imgpick" in d) { const inp = $("input", b.parentElement); mlOpen((p) => { inp.value = p; }); }
  else if ("imgup" in d) { const inp = $("input", b.parentElement), fi = document.createElement("input"); fi.type = "file"; fi.accept = "image/*"; fi.onchange = () => fi.files[0] && imgIn(fi.files[0], 1600, (p) => { inp.value = p; }); fi.click(); }
  else if ("x" in d) rteCmd(d.x);
});
document.addEventListener("mousedown", (e) => { if (e.target.closest(".rte-tb button")) e.preventDefault(); });
function rteCmd(x) {
  const m = { bold: ["bold"], italic: ["italic"], underline: ["underline"], ul: ["insertUnorderedList"], ol: ["insertOrderedList"], hr: ["insertHorizontalRule"], undo: ["undo"], redo: ["redo"], rm: ["removeFormat"], h3: ["formatBlock", "<h3>"], p: ["formatBlock", "<p>"], bq: ["formatBlock", "<blockquote>"] };
  if (m[x]) document.execCommand(m[x][0], false, m[x][1] || null);
  else if (x === "link") { const u = prompt("Адрес ссылки (https://…)"); if (u) document.execCommand("createLink", false, u); }
  else if (x === "img") { const sel = getSelection().rangeCount ? getSelection().getRangeAt(0).cloneRange() : null; mlOpen((p) => { const ed = $("#edb .rte"); if (!ed) return; ed.focus(); if (sel) { const s = getSelection(); s.removeAllRanges(); s.addRange(sel); } document.execCommand("insertImage", false, p); }); }
}
document.addEventListener("paste", (e) => { const t = e.target.closest && e.target.closest(".rte"); if (!t) return; e.preventDefault(); const h = e.clipboardData.getData("text/html"); document.execCommand("insertHTML", false, h ? clean(h) : esc(e.clipboardData.getData("text/plain")).replace(/\n/g, "<br>")); });
