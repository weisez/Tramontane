/* ===== pages: documents, press, forms, board ===== */
route("docs", () => {
  const T = [["all", "Все"], ["order", "Приказы"], ["briefing", "Брифинги"], ["memo", "Служебные записки"]];
  return { title: "Документы", init: docsInit, html: `${phead("Служебные документы", "Приказы, брифинги и нормативы", "Официальные документы центральной станции Трамонтана. Каждый офицер обязан быть ознакомлен с актуальными приказами и последним брифингом.", S.meta.hero)}
  <section class="sec"><div class="wrap"><div class="filt">${T.map((t, i) => `<button data-df="${t[0]}" class="${i ? "" : "on"}">${t[1]}</button>`).join("")}<input id="dq" placeholder="Поиск по номеру и названию…" aria-label="Поиск документов"></div><div id="dl">${docList("all", "")}</div>${addb("docs", "Документ")}</div></section>` };
}, "docs");
function docList(t, q) {
  q = (q || "").toLowerCase();
  const L = S.docs.filter((d) => d.type !== "press" && (t === "all" || d.type === t) && (!q || (d.num + " " + d.title).toLowerCase().includes(q))).sort((a, b) => dkey(b.date).localeCompare(dkey(a.date)));
  return L.map(drow).join("") || `<p class="note">Ничего не найдено.</p>`;
}
function docsInit(app) {
  let t = "all";
  const up = () => { $("#dl", app).innerHTML = docList(t, $("#dq", app).value); };
  $(".filt", app).addEventListener("click", (e) => { const b = e.target.closest("[data-df]"); if (!b) return; t = b.dataset.df; $$("[data-df]", app).forEach((x) => x.classList.toggle("on", x === b)); up(); });
  $("#dq", app).addEventListener("input", up);
}
route("doc/:id", (id) => {
  const d = dById(id), m = S.meta;
  if (!d) return { html: notFound() };
  const sg = (d.sign || []).map((s) => { const p = s.pid ? pById(s.pid) : s; return p ? `<div class="sg"><i>${esc((p.en || p.name || "").split(" ").pop())}</i><b>${esc(p.name)}</b><div>${esc(p.rank || "")}${p.title ? " · " + esc(p.title) : ""}</div></div>` : ""; }).join("");
  const stamp = d.draft ? "Готовится" : d.type === "order" ? "В силе" : "";
  return { title: d.title, html: `<section class="sec" style="padding-top:34px"><div class="wrap">
    <div class="tools"><a class="btn ghost" href="#/${d.type === "press" ? "press" : "docs"}">← К списку</a><button id="pr">Печать</button><button id="cp">Копировать ссылку</button><button class="ed" data-ed="docs:${d.id}">✎ Править</button></div>
    <article class="paper">${stamp ? `<div class="stamp">${stamp}</div>` : ""}<svg class="wm" viewBox="0 0 64 64">${BADGE.replace(/^<svg[^>]*>|<\/svg>$/g, "")}</svg>
      <div class="ptop"><div class="st">★ TRAMONTANE CENTRAL STATION — SFPD — 2nd AREA COMMAND ★</div><b>${esc(m.name)}</b><span>${esc(m.org)} · ${esc(m.address)}</span></div>
      <h2>${esc(d.title)}</h2>
      ${d.meta && d.meta.length ? `<div class="meta">${d.meta.map((x) => `<div><span>${esc(x[0])}</span>${esc(x[1])}</div>`).join("")}</div>` : ""}
      <div class="prose">${d.body || ""}</div>
      ${d.quote ? `<div class="q2">${esc(d.quote)}</div>` : ""}
      ${sg ? `<div class="sigs">${sg}</div>` : ""}
      ${d.dist ? `<div class="dist">Рассылка: ${esc(d.dist)}</div>` : ""}
    </article></div></section>`,
    init(app) { $("#pr", app).onclick = () => print(); $("#cp", app).onclick = () => { try { navigator.clipboard.writeText(location.href); toast("Ссылка скопирована"); } catch (e) {} }; } };
}, "docs");

route("press", () => ({ title: "Пресс-центр", html: `${phead("Пресс-центр", "Пресс-релизы станции", esc(S.meta.pressIntro || ""), S.meta.hero)}
  <section class="sec"><div class="wrap"><div class="grid g3">${S.docs.filter((d) => d.type === "press").map((d) => `<a class="card lnk reveal" href="#/doc/${d.id}"><div class="pad"><div class="ref">${esc(d.num)}</div><h3 style="margin:10px 0 12px;font-size:17px">${esc(d.title)}</h3><span class="chip ${d.draft ? "warn" : "ok"}">${d.draft ? "Готовится" : esc(d.status || "Опубликован")}</span></div>${eb("docs", d.id)}</a>`).join("")}</div>${addb("press", "Пресс-релиз")}</div></section>` }), "press");

route("forms", () => ({ title: "Формуляры", html: `${phead("Формуляры", "Заявления, рапорты и обращения", "Заполните форму на странице: готовый текст в установленном формате можно скопировать и отправить командованию.", S.meta.hero)}
  <section class="sec"><div class="wrap"><div class="grid g3">${S.forms.map((f) => `<a class="card lnk reveal" href="#/form/${f.id}"><div class="pad"><div class="ref">${esc(f.ref || "—")}</div><h3 style="margin:10px 0 8px;font-size:18px">${esc(f.title)}</h3><p style="margin:0">${esc(f.desc || "")}</p></div>${eb("forms", f.id)}</a>`).join("")}</div>
  <div class="prose reveal" style="margin-top:44px;max-width:760px"><h3>Куда обращаться</h3><p>${esc(S.meta.contactIntro || "")}</p></div>${addb("forms", "Формуляр")}</div></section>` }), "forms");

const today = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
const ruDate = (v) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ""); return m ? m[3] + "." + m[2] + "." + m[1] : v; };
const PH = { count: "кол-во", name: "имя фамилия", rank: "звание", date: "дата", on: "дата", from: "дата", to: "дата", d1: "дата", d2: "дата", sign: "подпись", phone: "номер", id: "ID аккаунта" };
function formOut(f, vals) {
  const F = Object.fromEntries(f.fields.map((x) => [x.k, x]));
  return f.tpl.replace(/\{(\w+)\}/g, (m, k) => {
    const x = F[k]; if (!x) return m; const v = vals[k];
    if (x.t === "check") return v ? "[ X ]" : "[   ]";
    if (x.t === "list") { const L = String(v || "").split("\n").map((s) => s.trim()).filter(Boolean); return (L.length ? L : ["(ссылка)"]).map((s, i) => i + 1 + ". " + s).join("\n"); }
    if (!v) return "*" + (PH[k] || x.l.split(/[,(:]/)[0].trim().toLowerCase().split(" ").slice(0, 3).join(" ")) + "*";
    return x.t === "date" ? ruDate(v) : v;
  });
}
route("form/:id", (id) => {
  const f = fById(id);
  if (!f) return { html: notFound() };
  let sec = "";
  const fields = f.fields.map((x) => {
    let h = "";
    if (x.sec && x.sec !== sec) { sec = x.sec; h += `<div class="fsec">${esc(sec)}</div>`; }
    const lab = `<label for="f_${x.k}">${esc(x.l)}${x.ooc ? "<em>OOC</em>" : ""}</label>`;
    const inp = x.t === "area" || x.t === "list" ? `<textarea id="f_${x.k}" data-k="${x.k}" placeholder="${esc(x.ph || "")}"></textarea>` : x.t === "check" ? `<input type="checkbox" id="f_${x.k}" data-k="${x.k}">` : `<input id="f_${x.k}" data-k="${x.k}" type="${x.t === "date" ? "date" : x.t === "number" ? "number" : "text"}" placeholder="${esc(x.ph || "")}">`;
    return h + (x.t === "check" ? `<div class="fld ck">${inp}${lab}</div>` : `<div class="fld">${lab}${inp}</div>`);
  }).join("");
  return { title: f.title, html: `${phead(esc(f.ref || "Формуляр"), esc(f.title), esc(f.desc || ""), null, `<a href="#/">Главная</a> / <a href="#/forms">Формуляры</a>`)}
  <section class="sec"><div class="wrap fg"><div><div class="note" style="margin-bottom:14px">Адресат: ${esc(f.to || "")}. Поля сохраняются в вашем браузере.</div>${fields}<button id="fclr">Очистить форму</button> <button class="ed" data-ed="forms:${f.id}">✎ Править формуляр</button></div>
    <div class="col2"><div class="stk"><div class="outh"><button class="pri" id="fcp">Скопировать текст</button><button id="fpr">Печать</button></div><div class="out" id="fo"></div></div></div></div></section>`,
    init(app) {
      const key = "tcs-f-" + f.id; let vals = {};
      try { vals = JSON.parse(LS.get(key, "{}")); } catch (e) {}
      f.fields.forEach((x) => { if (x.t === "date" && vals[x.k] == null && ["date", "on"].includes(x.k)) vals[x.k] = today(); });
      const els = $$("[data-k]", app);
      els.forEach((el) => { const v = vals[el.dataset.k]; if (el.type === "checkbox") el.checked = !!v; else if (v != null) el.value = v; });
      const up = () => { els.forEach((el) => { vals[el.dataset.k] = el.type === "checkbox" ? el.checked : el.value; }); LS.set(key, JSON.stringify(vals)); $("#fo", app).textContent = formOut(f, vals); };
      app.addEventListener("input", up); app.addEventListener("change", up);
      $("#fcp", app).onclick = () => { try { navigator.clipboard.writeText($("#fo", app).textContent); toast("Текст скопирован"); } catch (e) { toast("Не удалось скопировать"); } };
      $("#fpr", app).onclick = () => print();
      $("#fclr", app).onclick = () => { LS.set(key, "{}"); render(); };
      up();
    } };
}, "forms");

route("board", () => ({ title: "Доска станции", init: boardInit, html: `${phead("Жизнь станции", "Доска станции", esc(S.meta.lifeIntro || ""), S.meta.lifeImg)}
  <section class="sec"><div class="wrap two"><div>${S.notes.map((n) => `<div class="post reveal"><div class="av">${esc(ini(n.author))}</div><div><div class="who">${esc(n.role ? n.role + " " : "")}${esc(n.author)}</div><div class="where">${esc(n.place || "")}${n.date ? " · " + esc(n.date) : ""}</div><p>${esc(n.text)}</p></div>${eb("notes", n.id)}${mvb("notes", n.id)}</div>`).join("") || `<p class="note">Записок пока нет.</p>`}${addb("notes", "Записка")}</div>
    <div class="aside"><div class="box reveal"><h4>Правила площадки</h4><ol class="rules">${(S.meta.lifeRules || []).map((r) => `<li>${esc(r.replace(/^\d+\.\s*/, ""))}</li>`).join("")}</ol></div>
    <div class="box reveal"><h4>Оставить записку</h4><div class="fld"><label>Кто (звание, имя)</label><input id="bw" placeholder="Офицер Имя Фамилия"></div><div class="fld"><label>Что делает / где</label><input id="ba" placeholder="оставил записку на доске объявлений станции"></div><div class="fld"><label>Текст</label><textarea id="bt"></textarea></div><div class="out" id="bo" style="min-height:0;max-height:200px"></div><p><button class="pri" id="bc">Скопировать</button></p></div></div></div></section>` }), "board");
function boardInit(app) {
  const up = () => { $("#bo", app).textContent = `*${$("#bw", app).value || "Офицер"} ${$("#ba", app).value || "оставил записку на доске объявлений станции"}*\n${$("#bt", app).value}`; };
  ["bw", "ba", "bt"].forEach((i) => $("#" + i, app).addEventListener("input", up)); up();
  $("#bc", app).onclick = () => { try { navigator.clipboard.writeText($("#bo", app).textContent); toast("Скопировано"); } catch (e) {} };
}
