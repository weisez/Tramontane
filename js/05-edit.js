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
  meta: { title: "Настройки сайта", single: 1, fields: [["name", "Название (первое слово крупно в шапке)", "text"], ["brandSub", "Подпись под названием в шапке", "text"], ["topline", "Верхняя строка шапки", "text"], ["org", "Подзаголовок (департамент)", "text"], ["address", "Адрес", "text"], ["motto", "Девиз / цитата", "area"], ["mottoBy", "Автор цитаты", "text"], ["hero", "Главное изображение", "image", { fr: [["Шапка страниц", 3.5], ["Главный экран", 1.7]] }], ["careerImg", "Изображение «Карьера»", "image", { fr: [["Блок на главной", 0.75], ["Шапка «Карьера»", 3.5]] }], ["lifeImg", "Изображение «Доска станции»", "image", { fr: [["Шапка страницы", 3.5]] }], ["deptImg", "Обложка раздела «Зоны ответственности»", "image", { fr: [["Шапка раздела", 3.5]] }], ["intro", "Вступление на главной", "html"], ["about", "Текст «О станции»", "html"], ["building", "О здании", "area"], ["pressIntro", "Вступление пресс-центра", "area"], ["lifeIntro", "Вступление доски", "area"], ["lifeRules", "Правила доски (по строке)", "lines"], ["mapIntro", "Вступление раздела «Зоны ответственности»", "area"], ["contactIntro", "Контакты и обращения", "area"], ["stats", "Показатели главной: свои (добавляются к встроенным IC-фактам, на главной случайные 4)", "rows", { keys: ["n", "l"], ph: ["Число", "Подпись"] }], ["statsOwn", "Показывать только мои показатели (без встроенных)", "bool"]] },
  vacancies: { title: "Кадровый смотр", single: 1, fields: [["state", "Состояние набора", "select", () => [["open", "Идёт набор (показать таблицу)"], ["closed", "Вакантных мест нет"], ["soon", "Следите за новостями"], ["none", "Набор не ведётся"]]], ["msg", "Сообщение (когда набор не идёт)", "text"], ["title", "Заголовок", "text"], ["rows", "Должности", "arr2", { n: 4, ph: ["Должность", "Ранг", "Вакансий", "Мин. звание"] }], ["req", "Требования (по строке)", "lines"]] },
  people: { title: "Сотрудник", fields: [["name", "Имя и фамилия (VACANT для вакансии)", "text"], ["en", "Имя латиницей", "text"], ["rank", "Звание", "text"], ["title", "Должность", "text"], ["unit", "Подразделение", "select", unitOpts], ["status", "Статус", "select", () => [["active", "В штате"], ["vacant", "Вакансия"]]], ["photo", "Фото", "image", { fr: [["Портрет", 0.75], ["Аватар (круг)", 1]] }], ["bio", "Описание", "area"]], blank: () => ({ name: "", en: "", rank: "", title: "", unit: "patrol", photo: "", bio: "", status: "active" }) },
  units: { title: "Подразделение", fields: [["name", "Название", "text"], ["en", "Название латиницей", "text"], ["tag", "Девиз / короткое описание", "text"], ["banner", "Баннер", "image", { fr: [["Шапка страницы", 3.5], ["Карточка", 16 / 7]] }], ["quote", "Цитата", "area"], ["quoteBy", "Автор цитаты", "text"], ["summary", "Описание", "html"], ["roster", "Состав", "roster"], ["criteria", "Критерии отбора (по строке)", "lines"], ["form", "Формуляр заявления", "select", formOpts], ["docs", "Документы (id, по строке)", "lines"], ["gallery", "Галерея (ссылки, по строке)", "lines"]], blank: () => ({ name: "", en: "", tag: "", banner: S.meta.hero, summary: "", roster: [], criteria: [], form: "", docs: [], gallery: [] }) },
  ranks: { title: "Звание", fields: [["group", "Группа", "text"], ["name", "Название", "text"], ["desc", "Описание", "area"]], blank: () => ({ group: "Полевая служба", name: "", desc: "" }) },
  timeline: { title: "Событие истории", fields: [["year", "Дата / период", "text"], ["title", "Заголовок", "text"], ["text", "Описание", "area"]], blank: () => ({ year: "", title: "", text: "" }) },
  rooms: { title: "Помещение", fields: [["title", "Название", "text"], ["text", "Описание", "area"], ["img", "Изображение", "image", { fr: [["Рамка помещения", 1552 / 264], ["На телефоне", 2.3]] }]], blank: () => ({ title: "", text: "", img: "" }) },
  zones: { title: "Зона ответственности", fields: [["n", "Номер (I, II…)", "text"], ["name", "Название", "text"], ["station", "Станция", "text"], ["img", "Изображение", "image", { fr: [["Карточка зоны", 1.3]] }], ["text", "Описание", "area"], ["color", "Цвет на карте (#rrggbb, пусто — авто)", "text"], ["home", "Наша зона", "bool"]], blank: () => ({ n: "", name: "", station: "", img: "", text: "" }) },
  pois: { title: "Объект на карте", fields: [["name", "Название", "text"], ["kind", "Тип", "select", () => Object.entries(MAP_KINDS)], ["zone", "Зона", "select", () => [["", "— без зоны —"], ...S.zones.map((z) => [z.id, (z.n ? z.n + ". " : "") + z.name])]], ["text", "Описание", "area"], ["img", "Изображение", "image", { fr: [["Карточка объекта", 16 / 9]] }], ["x", "X (0–1000)", "text"], ["y", "Y (0–680)", "text"]], blank: () => ({ name: "", kind: "landmark", zone: "", text: "", img: "", x: 500, y: 340 }) },
  map: { title: "Фон карты", single: 1, get: () => ({ img: S.map.img || "" }), set: (v) => { S.map.img = v.img; if (!v.img) { S.map.w = 1000; S.map.h = 680; } else { const im = new Image(); im.onload = () => { S.map.w = 1000; S.map.h = Math.round(1000 * im.naturalHeight / im.naturalWidth); save(); render(); }; im.src = v.img; } }, fields: [["img", "Своя картинка вместо схемы (пусто — встроенная схема). Любые пропорции: контуры и маркеры лежат в системе «ширина 1000», высота считается по картинке", "image", { fr: [["Карта", 1000 / 680]] }]] },
  docs: { title: "Документ", fields: [["type", "Тип", "select", () => ST.type], ["num", "Номер", "text"], ["title", "Название", "text"], ["date", "Дата (дд.мм.гггг)", "text"], ["status", "Статус", "text"], ["draft", "Черновик / готовится", "bool"], ["body", "Текст", "html"], ["meta", "Реквизиты", "arr2", { n: 2, ph: ["Поле", "Значение"] }], ["sign", "Подписи", "pids"], ["dist", "Рассылка", "text"], ["quote", "Цитата", "area"]], blank: () => ({ type: "order", num: "", title: "", date: "", status: "В силе", draft: false, body: "<p></p>", meta: [], sign: [], dist: "", quote: "" }) },
  forms: { title: "Формуляр", fields: [["title", "Название", "text"], ["ref", "Номер формы", "text"], ["to", "Адресат", "text"], ["desc", "Описание", "area"], ["tpl", "Шаблон ({ключ} — поля)", "area"], ["bb", "BB-шаблон для форума ({ключ} — поля). Пусто — собирается автоматически из шаблона выше", "area"], ["fields", "Поля (JSON)", "json"]], blank: () => ({ title: "", ref: "", to: "", desc: "", tpl: "", fields: [] }) },
  footer: { title: "Подвал сайта", single: 1, get: () => ({ rows: footData().map((r) => r.slice()) }), set: (v) => { S.footer = v.rows; }, fields: [["rows", "Ссылки подвала. Одинаковое название колонки = одна колонка. Ссылка: #/раздел, https://… или mailto:…", "arr2", { n: 3, ph: ["Колонка", "Название", "Ссылка"], list: 2 }]] },
  nav: { title: "Меню сайта", single: 1, get: () => ({ rows: navData().map((r) => r.slice()) }), set: (v) => { S.nav = v.rows; }, fields: [["rows", "Пункты меню. Группа пустая = отдельная ссылка; одинаковая группа = выпадающее меню", "arr2", { n: 4, ph: ["Группа", "Название", "Ссылка", "Описание"], list: 2 }]] },
  dept: { title: "Структура департамента", single: 1, get: () => ({ tree: treeToText(S.dept), deptText: S.deptText || "" }), set: (v) => { S.dept = textToTree(v.tree); S.deptText = v.deptText; }, fields: [["tree", "Структура: отступ в 2 пробела = вложенность, «*» в начале = выделить", "tree"], ["deptText", "Текст слева от схемы", "html"]] },
  notes: { title: "Объявление", fields: [["title", "Заголовок (необязательно)", "text"], ["author", "Автор", "text"], ["role", "Звание / роль", "text"], ["place", "Где / подпись", "text"], ["date", "Дата (пусто — подставится текущая)", "text"], ["text", "Текст", "area"]], blank: () => ({ title: "", author: "", role: "", place: "", date: "", text: "" }) },
};
const treeToText = (n, d = 0) => !n ? "" : "  ".repeat(d) + (n.hl ? "* " : "") + n.name + "\n" + (n.kids || []).map((k) => treeToText(k, d + 1)).join("");
function textToTree(t) {
  const root = { name: "", kids: [] }, st = [{ d: -1, n: root }];
  String(t || "").split("\n").filter((l) => l.trim()).forEach((l) => {
    const d = Math.floor(l.match(/^ */)[0].length / 2); let x = l.trim(), hl = false;
    if (x.startsWith("*")) { hl = true; x = x.replace(/^\*\s*/, ""); }
    const n = { name: x }; if (hl) n.hl = true;
    while (st.length > 1 && st[st.length - 1].d >= d) st.pop();
    const p = st[st.length - 1].n; (p.kids = p.kids || []).push(n); st.push({ d, n });
  });
  return root.kids.length === 1 ? root.kids[0] : { name: "Структура", kids: root.kids };
}
const ROWB = '<button type="button" data-rup title="Выше">↑</button><button type="button" data-rdn title="Ниже">↓</button><button type="button" data-rm title="Убрать">×</button>';
const RB = [["bold", "<b>B</b>"], ["italic", "<i>I</i>"], ["underline", "<u>U</u>"], ["h3", "H"], ["p", "¶"], ["ul", "• ≡"], ["ol", "1. ≡"], ["bq", "❝"], ["link", "🔗"], ["img", "🖼"], ["hr", "—"], ["undo", "↶"], ["redo", "↷"], ["rm", "⌫"]];
function fieldHTML(f, v, it) {
  const [k, label, t, o] = f, A = (x) => esc(x == null ? "" : x);
  let h = "";
  if (t === "text") h = `<input data-f="${k}" value="${A(v)}">`;
  else if (t === "area") h = `<textarea data-f="${k}">${A(v)}</textarea>`;
  else if (t === "json") h = `<textarea data-f="${k}" data-t="json" style="min-height:160px;font-family:var(--ff-m);font-size:12px">${A(JSON.stringify(v || [], null, 1))}</textarea>`;
  else if (t === "lines") h = `<textarea data-f="${k}" data-t="lines">${A((v || []).join("\n"))}</textarea>`;
  else if (t === "bool") return `<div class="fld ck"><input type="checkbox" data-f="${k}" ${v ? "checked" : ""}><label>${esc(label)}</label></div>`;
  else if (t === "select") h = `<select data-f="${k}">${o().map((x) => `<option value="${A(x[0])}" ${x[0] === v ? "selected" : ""}>${A(x[1])}</option>`).join("")}</select>`;
  else if (t === "image") {
    const fr = (o && o.fr) || [["Рамка", 16 / 9]], c = cropOf(it, k) || CROP0;
    h = `<div class="imgf"><input data-f="${k}" value="${A(v)}" placeholder="https://… или img/файл.webp"><button type="button" data-imgpick>Библиотека</button><button type="button" data-imgup>Загрузить</button></div>
    <div class="crop"${v ? "" : " hidden"} data-for="${k}" data-fr="${A(JSON.stringify(fr))}" data-pos="${A(JSON.stringify(c))}">
      <div class="cfr">${fr.length > 1 ? fr.map((x, i) => `<button type="button" data-cf="${i}">${esc(x[0])}</button>`).join("") : `<span class="note">Рамка: ${esc(fr[0][0])}</span>`}</div>
      <div class="cv" tabindex="0" role="group" aria-label="Кадр. Перетаскивайте картинку; колёсико мыши, плюс и минус меняют масштаб"><img class="pic" alt="" draggable="false"${v ? ` src="${A(v)}"` : ""}></div>
      <div class="cc"><button type="button" data-cz="-1" aria-label="Уменьшить">−</button><input type="range" class="cz" min="100" max="400" step="1" value="100" aria-label="Масштаб"><button type="button" data-cz="1" aria-label="Увеличить">+</button><output class="co">100%</output><button type="button" data-cr>Сбросить</button></div>
      <p class="note">Перетаскивайте картинку, чтобы сдвинуть её в рамке. Колёсико мыши, щипок или ползунок меняют масштаб. Рамка повторяет пропорции места на сайте.</p>
    </div>`;
  }
  else if (t === "tree") h = `<textarea data-f="${k}" data-t="tree" style="min-height:260px;font-family:var(--ff-m);font-size:13px" spellcheck="false">${A(v)}</textarea>`;
  else if (t === "html") h = `<div class="rte-tb">${RB.map((b) => `<button type="button" data-x="${b[0]}">${b[1]}</button>`).join("")}</div><div class="rte" contenteditable="true" data-f="${k}" data-t="html">${clean(v || "")}</div>`;
  else if (t === "rows") h = `<div class="rows" data-f="${k}" data-t="rows" data-keys="${o.keys.join(",")}">${(v || []).map((r) => rowHTML(o.keys.map((x) => r[x]), o.ph)).join("")}</div><button type="button" data-radd>+ строка</button>`;
  else if (t === "arr2") h = `<div class="rows" data-f="${k}" data-t="arr2" data-n="${o.n}" data-li="${o.list == null ? -1 : o.list}">${(v || []).map((r) => rowHTML(r, o.ph, o.list)).join("")}</div><button type="button" data-radd>+ строка</button>`;
  else if (t === "roster") h = `<div class="rows" data-f="${k}" data-t="roster">${(v || []).map((r) => rosterRow(r)).join("")}</div><button type="button" data-radd>+ строка</button>`;
  else if (t === "pids") h = `<div class="rows" data-f="${k}" data-t="pids">${(v || []).map((r) => pidRow(r.pid)).join("")}</div><button type="button" data-radd>+ подпись</button>`;
  return `<div class="fld"><label>${esc(label)}</label>${h}</div>`;
}
const rowHTML = (r, ph, li) => `<div class="rowi" style="--c:${ph.length}">${ph.map((p, i) => `<input data-c ${li === i ? 'list="rl-opts"' : ""} placeholder="${esc(p)}" value="${esc((r || [])[i] || "")}">`).join("")}${ROWB}</div>`;
const rosterRow = (r) => `<div class="rowi" style="--c:2"><input data-c="role" placeholder="Роль" value="${esc((r || {}).role || "")}"><select data-c="pid">${pOpts().map((x) => `<option value="${esc(x[0])}" ${r && x[0] === r.pid ? "selected" : ""}>${esc(x[1])}</option>`).join("")}</select>${ROWB}</div>`;
const pidRow = (pid) => `<div class="rowi" style="--c:1"><select data-c="pid">${pOpts().map((x) => `<option value="${esc(x[0])}" ${x[0] === pid ? "selected" : ""}>${esc(x[1])}</option>`).join("")}</select>${ROWB}</div>`;
let ED = null;
function openEd(coll, id) {
  const sc = SCHEMA[coll]; if (!sc) return;
  const single = !!sc.single, isNew = !single && id === "new";
  const item = single ? (sc.get ? sc.get() : S[coll]) : isNew ? sc.blank() : (coll === "notes" ? BOARD.notes : S[coll]).find((x) => x.id === id);
  if (!item) return;
  ED = { coll, id, isNew, single, item };
  const o = ovOpen("edov", `<div class="md wide"><div class="mh"><h3>${esc(sc.title)}${isNew ? " — новый" : ""}</h3><button data-edx aria-label="Закрыть">✕</button></div><div class="mb" id="edb">${sc.fields.map((f) => fieldHTML(f, item[f[0]], item)).join("")}</div><div class="mf">${single || isNew ? "" : `<button class="dng" data-edel>Удалить</button>`}<span class="sp"></span><button data-edx>Отмена</button><button class="pri" data-edsave>Сохранить</button></div></div>`);
  o.insertAdjacentHTML("beforeend", `<datalist id="rl-opts">${routeList().map((x) => `<option value="${esc(x[0])}">${esc(x[1])}</option>`).join("")}</datalist>`);
  $$("#edb .crop", o).forEach(cropInit);
  o.scrollTop = 0;
}
function collect() {
  const sc = SCHEMA[ED.coll], out = {};
  for (const f of sc.fields) {
    const el = $(`#edb [data-f="${f[0]}"]`), t = f[2]; if (!el) continue; let v;
    if (t === "bool") v = el.checked;
    else if (t === "html") v = clean(el.innerHTML);
    else if (t === "image") {
      v = el.value.trim(); const rt = $(".crop", el.closest(".fld")), p = rt && rt._st && rt._st.pos, r1 = (n) => Math.round(n * 10) / 10;
      out[f[0] + "Pos"] = v && p && (Math.abs(p.x - 50) > 0.05 || Math.abs(p.y - 50) > 0.05 || Math.abs(p.z - 1) > 0.005) ? { x: r1(p.x), y: r1(p.y), z: Math.round(p.z * 100) / 100 } : null;
    }
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
  if (ED.coll === "notes") { if (boardSaveEd(v, ED.isNew, ED.id)) ovClose("edov"); return; } /* объявления: сразу в board.json */
  if (ED.coll === "pois") { v.x = Math.max(0, Math.min(MAP_W, parseFloat(String(v.x).replace(",", ".")) || 0)); v.y = Math.max(0, Math.min(MAP_H, parseFloat(String(v.y).replace(",", ".")) || 0)); }
  if (ED.coll === "zones" && v.color && !/^#[0-9a-f]{3,8}$/i.test(v.color.trim())) { toast("Цвет: формат #rrggbb"); return; }
  let tgt = null;
  if (ED.single) { const sc = SCHEMA[ED.coll]; if (sc.set) sc.set(v); else Object.assign((tgt = S[ED.coll]), v); }
  else if (ED.isNew) { const it = Object.assign({ id: (ED.coll === "docs" ? "d-" : ED.coll[0] + "-") + uid() }, v); if (ED.pressNew) it.type = "press"; S[ED.coll].push(it); tgt = it; }
  else Object.assign((tgt = ED.item), v);
  if (tgt) Object.keys(tgt).forEach((k) => { if (/Pos$/.test(k) && !tgt[k]) delete tgt[k]; });
  save(); ovClose("edov"); chrome(); render(); toast("Сохранено");
}
function mvItem(c, id, d) { if (c === "notes") { boardMv(id, d); return; } const a = S[c], i = a.findIndex((x) => x.id === id), j = i + d; if (i < 0 || j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; if (c === "rooms") ROOM_I = j; save(); render(); }
/* modal-level events */
document.addEventListener("click", (e) => {
  const ov = e.target.closest("#edov"); if (!ov) return;
  const b = e.target.closest("button"); if (!b) { if (e.target === ov) ovClose("edov"); return; }
  const d = b.dataset;
  if ("edx" in d) ovClose("edov");
  else if ("edsave" in d) edSave();
  else if ("edel" in d) arm(b, () => { if (ED.coll === "notes") { boardDel(ED.id); ovClose("edov"); return; } S[ED.coll] = S[ED.coll].filter((x) => x.id !== ED.id); save(); ovClose("edov"); render(); toast("Удалено"); });
  else if ("rm" in d) b.closest(".rowi").remove();
  else if ("rup" in d) { const r = b.closest(".rowi"), p = r.previousElementSibling; if (p) r.parentNode.insertBefore(r, p); }
  else if ("rdn" in d) { const r = b.closest(".rowi"), n = r.nextElementSibling; if (n) r.parentNode.insertBefore(n, r); }
  else if ("radd" in d) { const box = b.previousElementSibling, t = box.dataset.t; const h = t === "rows" ? rowHTML([], new Array(box.dataset.keys.split(",").length).fill("")) : t === "arr2" ? rowHTML([], new Array(+box.dataset.n).fill(""), +box.dataset.li) : t === "roster" ? rosterRow(null) : pidRow(""); box.insertAdjacentHTML("beforeend", h); }
  else if ("imgpick" in d) { const inp = $("input", b.parentElement); mlOpen((p) => { inp.value = p; cropSync(inp); }); }
  else if ("imgup" in d) { const inp = $("input", b.parentElement), fi = document.createElement("input"); fi.type = "file"; fi.accept = "image/*"; fi.onchange = () => fi.files[0] && imgIn(fi.files[0], 1600, (p) => { inp.value = p; cropSync(inp); }); fi.click(); }
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

/* ===== inline editors for any UI text and for buttons ===== */
function keepScroll(fn) { const y = scrollY; fn(); scrollTo(0, y); }
function textEd(key) {
  const cur = (S.txt || {})[key], val = cur != null ? cur : key;
  const o = ovOpen("txov", `<div class="md"><div class="mh"><h3>Изменить надпись</h3><button data-x aria-label="Закрыть">✕</button></div><div class="mb"><p class="note">Исходный текст: «${esc(key)}». Замена действует везде, где встречается эта надпись.</p><div class="fld"><textarea id="tx-v" style="min-height:90px">${esc(val)}</textarea></div></div><div class="mf"><button data-rs>Сбросить</button><span class="sp"></span><button data-x>Отмена</button><button class="pri" data-ok>Сохранить</button></div></div>`);
  const fin = () => { save(); ovClose("txov"); keepScroll(() => { chrome(); render(); }); toast("Надпись обновлена"); };
  o.onclick = (e) => { if (e.target === o) { ovClose("txov"); return; } const b = e.target.closest("button"); if (!b) return;
    if ("x" in b.dataset) ovClose("txov"); else if ("rs" in b.dataset) { delete S.txt[key]; fin(); }
    else if ("ok" in b.dataset) { const v = $("#tx-v").value.trim(); if (!v || v === key) delete S.txt[key]; else S.txt[key] = v; fin(); } };
  $("#tx-v").focus();
}
function btnEd(a) {
  const key = a.dataset.lk, i = key.indexOf("|"), href0 = key.slice(0, i), label0 = key.slice(i + 1);
  const curL = (S.txt || {})[label0] != null ? S.txt[label0] : label0, curH = (S.lnk || {})[key] || href0;
  const o = ovOpen("txov", `<div class="md"><div class="mh"><h3>Кнопка</h3><button data-x aria-label="Закрыть">✕</button></div><div class="mb"><div class="fld"><label>Надпись</label><input id="bt-l" value="${esc(curL)}"></div><div class="fld"><label>Куда ведёт (раздел сайта или адрес)</label><input id="bt-h" list="rl-opts" value="${esc(curH)}" placeholder="#/career или https://…"></div><p class="note">Начните вводить: подскажем разделы, документы и формуляры. Для внешних ссылок укажите https://…</p><datalist id="rl-opts">${routeList().map((x) => `<option value="${esc(x[0])}">${esc(x[1])}</option>`).join("")}</datalist></div><div class="mf"><button data-rs>Сбросить</button><span class="sp"></span><button data-x>Отмена</button><button class="pri" data-ok>Сохранить</button></div></div>`);
  const fin = () => { save(); ovClose("txov"); keepScroll(() => { chrome(); render(); }); toast("Кнопка обновлена"); };
  o.onclick = (e) => { if (e.target === o) { ovClose("txov"); return; } const b = e.target.closest("button"); if (!b) return;
    if ("x" in b.dataset) ovClose("txov");
    else if ("rs" in b.dataset) { delete S.txt[label0]; delete S.lnk[key]; fin(); }
    else if ("ok" in b.dataset) { const l = $("#bt-l").value.trim(), h = $("#bt-h").value.trim();
      if (!l || l === label0) delete S.txt[label0]; else S.txt[label0] = l;
      if (!h || h === href0 || /^\s*javascript:/i.test(h)) delete S.lnk[key]; else S.lnk[key] = h; fin(); } };
  $("#bt-l").focus();
}
document.addEventListener("click", (e) => {
  if (!document.body.classList.contains("editing")) return;
  const t = e.target.closest("[data-t],a.btn[data-lk]");
  if (!t || !(t.closest("#app") || t.closest("#ftr"))) return;
  if (t.closest(".mctl,.mleg,.mtool,.mo,.mzc,.mp-more,.mp-back")) return; /* управление картой: клик работает как обычно, не открывает редактор подписи */
  e.preventDefault(); e.stopPropagation();
  const a = t.closest("a.btn[data-lk]");
  if (a) btnEd(a); else textEd(t.dataset.t);
}, true);

/* ===== кадрирование: перетаскивание, масштаб колёсиком / ползунком / щипком / клавишами =====
   Модель: «окно» шириной v = W/(z·w) от картинки (w — ширина картинки после cover), его левый край
   стоит на x % свободного места. Это ровно то, что рисует сайт: object-position + scale вокруг той же точки. */
const zoomPos = (p, g, nz, fx, fy) => {
  nz = clamp(nz, 1, 4);
  const ax = (c, W, w, f) => { const v0 = Math.min(1, W / (p.z * w)), v1 = Math.min(1, W / (nz * w)); if (v1 >= 1) return 50; const pt = (c / 100) * (1 - v0) + v0 * f; return clamp(((pt - v1 * f) / (1 - v1)) * 100, 0, 100); };
  return { x: ax(p.x, g.W, g.w, fx), y: ax(p.y, g.H, g.h, fy), z: nz };
};
const panPos = (p, g, dx, dy) => {
  const sx = p.z * g.w - g.W, sy = p.z * g.h - g.H;
  return { x: sx > 0.5 ? clamp(p.x - (dx * 100) / sx, 0, 100) : p.x, y: sy > 0.5 ? clamp(p.y - (dy * 100) / sy, 0, 100) : p.y, z: p.z };
};
const cropSync = (inp) => { const r = $(".crop", inp.closest(".fld")); if (r && r._sync) r._sync(); };
function cropInit(root) {
  const k = root.dataset.for, fld = root.closest(".fld"), inp = $(`[data-f="${k}"]`, fld);
  const vp = $(".cv", root), im = $("img", vp), sl = $(".cz", root), co = $(".co", root), FR = JSON.parse(root.dataset.fr);
  let init = {}; try { init = JSON.parse(root.dataset.pos || "{}"); } catch (e) {}
  const st = (root._st = { pos: Object.assign({}, CROP0, init), src: (inp.value || "").trim() });
  const geo = () => { const r = vp.getBoundingClientRect(), iw = im.naturalWidth || r.width || 1, ih = im.naturalHeight || r.height || 1, s = Math.max(r.width / iw, r.height / ih); return { W: r.width, H: r.height, w: iw * s, h: ih * s, L: r.left, T: r.top }; };
  const apply = () => { const p = st.pos, s = cstyle(p); im.removeAttribute("style"); if (s) im.setAttribute("style", s); sl.value = Math.round(p.z * 100); co.textContent = Math.round(p.z * 100) + "%"; };
  const zoomTo = (nz, fx, fy) => { st.pos = zoomPos(st.pos, geo(), nz, fx == null ? 0.5 : fx, fy == null ? 0.5 : fy); apply(); };
  const frame = (i) => { const r = FR[i][1]; vp.style.aspectRatio = String(r); vp.style.width = `min(100%, ${Math.round(280 * r)}px)`; $$("[data-cf]", root).forEach((b) => b.classList.toggle("on", +b.dataset.cf === i)); };
  const ptrs = new Map(); let drag = null, pinch = null;
  vp.addEventListener("pointerdown", (e) => {
    if (e.button > 0) return;
    try { vp.setPointerCapture(e.pointerId); } catch (x) {}
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); vp.classList.add("grab"); vp.focus({ preventScroll: true });
    if (ptrs.size === 1) drag = { x: e.clientX, y: e.clientY, p: Object.assign({}, st.pos) };
    else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, p: Object.assign({}, st.pos) }; drag = null; }
  });
  vp.addEventListener("pointermove", (e) => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && ptrs.size >= 2) { const [a, b] = [...ptrs.values()], g = geo(), d = Math.hypot(a.x - b.x, a.y - b.y) || 1; st.pos = zoomPos(pinch.p, g, (pinch.p.z * d) / pinch.d, ((a.x + b.x) / 2 - g.L) / g.W, ((a.y + b.y) / 2 - g.T) / g.H); apply(); }
    else if (drag) { st.pos = panPos(drag.p, geo(), e.clientX - drag.x, e.clientY - drag.y); apply(); }
  });
  const up = (e) => {
    ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null;
    if (ptrs.size === 1) { const q = [...ptrs.values()][0]; drag = { x: q.x, y: q.y, p: Object.assign({}, st.pos) }; }
    else if (!ptrs.size) { drag = null; vp.classList.remove("grab"); }
  };
  vp.addEventListener("pointerup", up); vp.addEventListener("pointercancel", up);
  vp.addEventListener("wheel", (e) => { e.preventDefault(); const g = geo(); zoomTo(st.pos.z * Math.exp(-e.deltaY * 0.0015), (e.clientX - g.L) / g.W, (e.clientY - g.T) / g.H); }, { passive: false });
  vp.addEventListener("keydown", (e) => {
    const step = e.shiftKey ? 10 : 3, p = st.pos;
    if (e.key === "+" || e.key === "=") { e.preventDefault(); zoomTo(p.z + 0.1); return; }
    if (e.key === "-" || e.key === "_") { e.preventDefault(); zoomTo(p.z - 0.1); return; }
    if (e.key === "ArrowLeft") st.pos = Object.assign({}, p, { x: clamp(p.x - step, 0, 100) });
    else if (e.key === "ArrowRight") st.pos = Object.assign({}, p, { x: clamp(p.x + step, 0, 100) });
    else if (e.key === "ArrowUp") st.pos = Object.assign({}, p, { y: clamp(p.y - step, 0, 100) });
    else if (e.key === "ArrowDown") st.pos = Object.assign({}, p, { y: clamp(p.y + step, 0, 100) });
    else if (e.key === "0") st.pos = Object.assign({}, CROP0);
    else return;
    e.preventDefault(); e.stopPropagation(); apply();
  });
  root.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if ("cf" in b.dataset) frame(+b.dataset.cf);
    else if ("cz" in b.dataset) zoomTo(st.pos.z + +b.dataset.cz * 0.25);
    else if ("cr" in b.dataset) { st.pos = Object.assign({}, CROP0); apply(); }
  });
  sl.addEventListener("input", () => zoomTo(sl.value / 100));
  /* другая картинка в поле → кадр сбрасывается */
  root._sync = () => {
    const v = (inp.value || "").trim(); if (v === st.src) return;
    st.src = v; st.pos = Object.assign({}, CROP0); root.hidden = !v;
    if (v) { im.removeAttribute("data-rf"); im.src = v; } else im.removeAttribute("src");
    apply();
  };
  inp.addEventListener("input", () => { clearTimeout(root._t); root._t = setTimeout(root._sync, 400); });
  frame(0); apply();
}
