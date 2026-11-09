/* ===== pages: home, about, units, staff, career ===== */
/* Фон шапки страницы — обычный <img> (раньше это был url() в CSS-переменной, который
   разрешался относительно css/style.css и давал 404 для всех путей вида img/...). */
const phead = (eyebrow, title, lead, img, crumbs, pos) =>
  `<div class="pagehead${img ? " img" : ""}">${img ? fimg(img, pos, "", true) : ""}<div class="wrap"><div class="crumbs">${crumbs || `<a href="#/">Главная</a>`}</div><div class="eb">${eyebrow}</div><h1>${title}</h1>${lead ? `<p class="lead">${lead}</p>` : ""}</div></div>`;
const sech = (eyebrow, title, extra = "") => `<div class="sec-h reveal"><div class="eb">${eyebrow}</div><h2>${title}</h2>${extra}</div>`;
const phot = (p, cls = "") => { const s = cstyle(cropOf(p, "photo")); return `<div class="ph ${cls}${p.status === "vacant" ? " vac" : ""}">${p.photo ? `<img src="${E(p.photo)}" alt="${E(p.name)}" loading="lazy"${s ? ` style="${s}"` : ""}>` : ""}<b>${p.status === "vacant" ? "VACANT" : E(ini(p.name))}</b></div>`; };
/* картинка карточки подразделения: первая из галереи, иначе баннер (кадрирование — только у баннера) */
const unitCardImg = (u) => { const g = u.gallery && u.gallery[0]; return g ? fimg(g, null, "") : fimg(u.banner, cropOf(u, "banner"), ""); };
const prow = (p) => `<div class="person${p.status === "vacant" ? " vac" : ""}">${phot(p)}<div><div class="rk">${E(p.rank || "")}</div><h4>${E(p.name)}</h4><small>${E(p.title)}</small></div>${eb("people", p.id)}</div>`;
const latest = (type, n) => S.docs.filter((d) => d.type === type).sort((a, b) => (a.draft ? 1 : 0) - (b.draft ? 1 : 0) || dkey(b.date).localeCompare(dkey(a.date)) || b.num.localeCompare(a.num)).slice(0, n);
const drow = (d) => `<a class="drow ${d.type}${d.draft ? " draft" : ""}" href="#/doc/${d.id}"><span class="n">${E(d.num)}</span><span><b>${E(d.title)}</b><small>${E(TYPES[d.type] || "")}${d.date ? " · " + E(d.date) : ""}</small></span><span class="chip ${d.draft ? "warn" : "ok"}">${d.draft ? "Готовится" : E(d.status || "")}</span>${eb("docs", d.id)}</a>`;
const BADGE = `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 3 55 12v18c0 15-10 26-23 31C19 56 9 45 9 30V12z" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M32.0 14.0 L35.9 24.7 L47.2 25.1 L38.3 32.0 L41.4 42.9 L32.0 36.6 L22.6 42.9 L25.7 32.0 L16.8 25.1 L28.1 24.7z" fill="currentColor"/></svg>`;

route("", () => {
  const m = S.meta, [a, ...b] = (m.name || "").split(" "), br = latest("briefing", 1)[0], cap = pById("delacroix");
  const stats = (m.stats || []).map((s) => `<div class="stat"><b data-count="${E(s.n)}">${E(s.n)}</b><span>${E(s.l)}</span></div>`).join("");
  return { title: "", html: `
  <section class="hero">${fimg(m.hero, cropOf(m, "hero"), "", true)}<div class="wrap hero-in">
    <div class="eb">${E(m.org)}</div>
    <h1>${E(a || "")}<span>${E(b.join(" "))}</span></h1>
    <p>${E(m.motto)}</p>
    <div class="acts"><a class="btn" href="#/career">Служба в SFPD</a><a class="btn ghost" href="#/docs">Служебные документы</a></div>
    <div class="hero-addr">${E(m.address)}</div>
  </div></section>
  ${br ? `<div class="strip"><b>Брифинг</b><span>${E(br.num)} · ${E(br.date)}</span><a href="#/doc/${br.id}">Читать →</a></div>` : ""}
  <section class="sec"><div class="wrap quote">
    ${cap ? `<div class="reveal" style="position:relative">${phot(cap)}${eb("people", cap.id)}</div>` : ""}
    <div class="reveal"><div class="eb">Командующий офицер</div><h2 style="margin:8px 0 22px">${cap ? E(cap.rank + " " + cap.name) : ""}</h2>
      <blockquote class="q" style="margin:0 0 26px">«${E(m.motto)}»<cite>${E(m.mottoBy)}</cite></blockquote>
      <div class="prose">${H(m.intro)}</div><p><a class="btn ghost" href="#/about">О станции</a></p></div>
  </div>${OWN ? `<div class="wrap">${`<button class="ed addb" data-ed="meta:-">✎ Настройки сайта и главной</button>`}</div>` : ""}</section>
  <section class="sec alt"><div class="wrap">
    <div class="stats reveal">${stats}</div>
  </div></section>
  <section class="sec"><div class="wrap">${sech("Структура", "Подразделения станции")}
    <div class="grid g4">${S.units.filter((u) => u.id !== "cmd").map((u) => `<a class="card reveal" href="#/unit/${u.id}"><div class="cimgw"><div class="cimg">${unitCardImg(u)}</div></div><div class="pad"><h3>${E(u.name)}</h3><div class="sub">${E(u.en)}</div><p>${E(u.tag)}</p></div>${eb("units", u.id)}</a>`).join("")}</div>
  </div></section>
  <section class="sec alt"><div class="wrap grid g2" style="gap:44px">
    <div>${sech("Оперативное информирование", "Брифинги")}${latest("briefing", 3).map(drow).join("")}<p><a class="btn ghost" href="#/docs">Все документы</a></p></div>
    <div>${sech("Пресс-центр", "Пресс-релизы")}${latest("press", 3).map(drow).join("")}<p><a class="btn ghost" href="#/press">Все релизы</a></p></div>
  </div></section>
  <section class="sec"><div class="wrap quote">
    <div class="reveal" style="position:relative"><div class="ph">${m.careerImg ? `<img src="${E(m.careerImg)}" alt="" loading="lazy"${cstyle(cropOf(m, "careerImg")) ? ` style="${cstyle(cropOf(m, "careerImg"))}"` : ""}>` : ""}<b>SFPD</b></div>${eb("meta", "-")}</div>
    <div class="reveal"><div class="eb">Карьера</div><h2 style="margin:8px 0 18px">Департамент даёт вам звание, станция даёт вам стандарт</h2><p class="lead">Путь от кадета до командного состава: академия, полевая подготовка, специализированные секции. Станция принимает на службу и ищет сильных офицеров в старший состав.</p><p><a class="btn" href="#/career">Узнать больше</a> <a class="btn ghost" href="#/forms">Подать заявление</a></p></div>
  </div></section>` };
}, "home");

route("about", () => {
  const m = S.meta;
  return { title: "О станции", init: roomsInit, html: `
  ${phead("О станции", "Центральная станция Трамонтана", E(m.org), m.hero, null, cropOf(m, "hero"))}
  <section class="sec"><div class="wrap two"><div class="prose reveal">${H(m.intro)}${H(m.about)}<button class="ed addb" data-ed="meta:-">✎ Править текст</button></div>
    <div class="aside"><div class="box reveal"><h4>Адрес</h4><p style="margin:0">${E(m.address)}</p></div><div class="box reveal"><h4>Руководство</h4>${S.people.filter((p) => p.unit === "cmd").map(prow).join("")}<a class="btn ghost" href="#/staff">Весь состав</a></div></div></div></section>
  <section class="sec alt"><div class="wrap">${sech("Хронология", "История станции")}<div class="tl">${S.timeline.map((t) => `<div class="tli"><time>${E(t.year)}</time><div><h3>${E(t.title)}</h3><p>${E(t.text)}</p></div>${eb("timeline", t.id)}${mvb("timeline", t.id)}</div>`).join("")}</div>${addb("timeline", "Событие")}</div></section>
  <section class="sec"><div class="wrap">${sech("Станция изнутри", "Здание и помещения", `<p class="lead">${E(m.building || "")}</p>`)}${roomsHTML()}${addb("rooms", "Помещение")}</div></section>
  <section class="sec alt"><div class="wrap">${sech("Департамент", "Зоны ответственности SFPD")}
    <p class="reveal" style="margin:-6px 0 26px"><a class="btn" href="#/zones">Открыть интерактивную карту зон →</a></p>
    <div class="grid" style="gap:18px">${S.zones.map((z) => `<div class="card zc reveal${z.home ? " hl" : ""}"><div class="zi">${fimg(z.img, cropOf(z, "img"), "")}</div><div class="pad"><h3><span>${E(z.n)}.</span> ${E(z.name)}</h3><div class="sub">${E(z.station)}${z.home ? " · наша зона" : ""}</div><p style="font:400 15px/1.7 var(--ff-s)">${E(z.text)}</p></div>${eb("zones", z.id)}</div>`).join("")}</div>
    <div class="grid g2" style="gap:44px;margin-top:54px"><div class="prose reveal">${H(S.deptText)}</div><div class="reveal"><h3 style="margin-bottom:16px;color:var(--brass2)">Структура департамента</h3>${treeHTML(S.dept)}<button class="ed addb" data-ed="dept:-">✎ Править структуру</button></div></div></div></section>` };
}, "about");

const treeHTML = (n) => `<ul class="tree"><li class="${n.hl ? "hl" : ""}"><b>${E(n.name)}</b>${n.kids ? `<ul>${n.kids.map((k) => treeHTML(k).replace(/^<ul class="tree">|<\/ul>$/g, "")).join("")}</ul>` : ""}</li></ul>`;
let ROOM_I = 0; /* выбранное помещение: переживает перерисовку после правки/перемещения */
function roomsHTML() {
  const R = S.rooms;
  if (!R.length) return "";
  if (!(ROOM_I >= 0 && ROOM_I < R.length)) ROOM_I = 0;
  return `<div class="rooms reveal"><nav>${R.map((r, i) => `<button data-room="${i}" class="${i === ROOM_I ? "on" : ""}">${E(r.title)}</button>`).join("")}</nav><div class="rv" id="rv">${roomView(ROOM_I)}</div></div>`;
}
const roomView = (i) => { const r = S.rooms[i]; return r ? `<div class="rimg">${fimg(r.img, cropOf(r, "img"), r.title, true)}</div><div class="rt"><h3>${E(r.title)}</h3><p>${E(r.text)}</p></div><span class="cnt">${i + 1} / ${S.rooms.length}</span>${eb("rooms", r.id)}${mvb("rooms", r.id)}` : ""; };
function roomsInit(app) {
  const nav = $(".rooms nav", app);
  if (!nav) return;
  nav.addEventListener("click", (e) => {
    const b = e.target.closest("[data-room]"); if (!b) return;
    ROOM_I = +b.dataset.room;
    $$("button", nav).forEach((x) => x.classList.toggle("on", x === b));
    /* ВАЖНО: через ui(), иначе в разметке остаются служебные символы /
       (мусор в тексте и битый адрес картинки) */
    $("#rv").innerHTML = ui(roomView(ROOM_I));
    b.scrollIntoView({ block: "nearest", inline: "nearest" });
  });
}

route("units", () => ({ title: "Подразделения", html: `${phead("Структура станции", "Подразделения", "Секции и программы центральной станции Трамонтана: от патруля до командования.", S.meta.hero, null, cropOf(S.meta, "hero"))}
  <section class="sec"><div class="wrap"><div class="grid g2">${S.units.map((u) => {
    const r = u.roster || [], vac = r.filter((x) => (pById(x.pid) || {}).status === "vacant").length;
    return `<a class="card reveal" href="#/unit/${u.id}"><div class="cimgw"><div class="cimg">${unitCardImg(u)}</div></div><div class="pad"><h3>${E(u.name)}</h3><div class="sub">${E(u.en)}</div><p>${E(u.tag)}</p><p><span class="chip ok">${r.length - vac} в штате</span> ${vac ? `<span class="chip warn">${vac} вакант.</span>` : ""}</p></div>${eb("units", u.id)}${mvb("units", u.id)}</a>`;
  }).join("")}</div>${addb("units", "Подразделение")}</div></section>` }), "units");

route("unit/:id", (id) => {
  const u = uById(id);
  if (!u) return { html: notFound() };
  const r = (u.roster || []).map((x) => ({ role: x.role, p: pById(x.pid) })).filter((x) => x.p);
  const f = u.form && fById(u.form), docs = (u.docs || []).map(dById).filter(Boolean);
  return { title: u.name, html: `${phead(E(u.en), E(u.name), E(u.tag), u.banner, `<a href="#/">Главная</a> / <a href="#/units">Подразделения</a>`, cropOf(u, "banner"))}
  <section class="sec"><div class="wrap two"><div>
    ${u.quote ? `<blockquote class="q reveal" style="margin:0 0 36px">«${E(u.quote)}»<cite>${E(u.quoteBy || "")}</cite></blockquote>` : ""}
    <div class="prose reveal">${H(u.summary)}</div>
    ${u.gallery && u.gallery.length ? `<div class="gal reveal">${u.gallery.map((g) => `<img src="${E(g)}" alt="" loading="lazy">`).join("")}</div>` : ""}
  </div><div class="aside">
    <div class="box reveal"><h4>Состав</h4>${r.map((x) => `<div class="note" style="margin:6px 0 3px">${E(x.role)}</div>${prow(x.p)}`).join("") || `<p class="note">Состав не указан.</p>`}</div>
    ${u.criteria && u.criteria.length ? `<div class="box reveal"><h4>Критерии отбора</h4><ul class="chk">${u.criteria.map((c) => `<li>${E(c)}</li>`).join("")}</ul></div>` : ""}
    ${f ? `<a class="btn" href="#/form/${f.id}">Подать заявление</a>` : ""}
    ${docs.length ? `<div class="box reveal"><h4>Документы</h4>${docs.map(drow).join("")}</div>` : ""}
    <button class="ed addb" data-ed="units:${u.id}">✎ Править подразделение</button>
  </div></div></section>` };
}, "units");

function staffOrder() {
  const ids = ((S.meta.staffOrder || ["cmd"])).filter((id) => uById(id));
  S.units.forEach((u) => { if (!ids.includes(u.id)) ids.push(u.id); });
  return ids.map(uById);
}
route("staff", () => {
  const C = (id) => pById(id) ? `<div class="reveal">${prow(pById(id))}</div>` : "";
  const order = staffOrder();
  return { title: "Состав", html: `${phead("Руководство и состав", "Личный состав станции", "Командование, супервайзеры секций и рядовой состав. Вакантные должности открыты для отбора.", S.meta.hero, null, cropOf(S.meta, "hero"))}
  <section class="sec"><div class="wrap">${sech("Командование", "Схема управления")}
    <div class="org"><div class="orgrow">${C("delacroix")}</div><div class="orgrow">${C("hayes")}${C("awayuki")}</div><div class="orgrow">${["v-patrol", "toreno", "quintero", "v-fto"].map(C).join("")}</div></div></div></section>
  <section class="sec alt"><div class="wrap">${sech("По подразделениям", "Состав")}
    ${order.map((u, i) => { const L = S.people.filter((p) => p.unit === u.id); return `<div class="ugrp"><div class="ugh"><h3>${E(u.name)}</h3><span class="ed ugm"><button data-mvs="${u.id}:-1" ${i ? "" : "disabled"} title="Выше">↑</button><button data-mvs="${u.id}:1" ${i < order.length - 1 ? "" : "disabled"} title="Ниже">↓</button></span></div>${L.length ? `<div class="grid g3">${L.map((p) => `<div class="reveal">${prow(p)}</div>`).join("")}</div>` : `<p class="note">Состав не указан.</p>`}</div>`; }).join("")}
    ${addb("people", "Сотрудник / вакансия")}</div></section>` };
}, "staff");

const VS = { open: ["Открыто", "ok"], closed: ["Закрыто", "red"], soon: ["Скоро", "warn"], none: ["Набор не ведётся", "warn"] };
const VM = { closed: "Вакантных мест нет. Следите за новостями.", soon: "Следите за новостями: информация о наборе появится здесь.", none: "В настоящий момент набор на должности не проводится." };
route("career", () => {
  const v = S.vacancies, groups = [...new Set(S.ranks.map((r) => r.group))], st = VS[v.state] ? v.state : "closed";
  const body = st === "open"
    ? `<div class="tw reveal"><table class="tbl"><thead><tr><th>Должность</th><th>Ранг</th><th>Вакансий</th><th>Мин. звание</th></tr></thead><tbody>${(v.rows || []).map((r) => `<tr>${r.map((c) => `<td>${E(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
    <div class="grid g2" style="margin-top:36px;gap:36px"><div class="reveal"><h3 style="margin-bottom:12px;color:var(--brass2)">Требования к кандидату</h3><ul class="chk">${(v.req || []).map((c) => `<li>${E(c)}</li>`).join("")}</ul></div><div class="reveal"><h3 style="margin-bottom:12px;color:var(--brass2)">Подача заявления</h3><p class="lead" style="font-size:16px">Заявление в старший состав подаётся строго по формуляру, пока смотр открыт.</p><a class="btn" href="#/form/app-staff">Открыть формуляр</a></div></div>`
    : `<div class="vac-msg reveal ${st}"><div class="vm-i">${st === "soon" ? "⌛" : "—"}</div><div><b>${E(VS[st][0])}</b><p>${E(v.msg || VM[st] || "")}</p></div></div>`;
  return { title: "Карьера", html: `${phead("Карьера в SFPD", "Служба в полиции Сан-Фиерро", "", S.meta.careerImg, null, cropOf(S.meta, "careerImg"))}
  <section class="sec"><div class="wrap two"><div class="prose reveal">${H(S.careerIntro)}</div><div class="aside"><div class="box reveal"><h4>Вторая зона</h4><p style="margin:0;font-size:14.5px;color:var(--mute)">Финансовый округ, Даунтаун, Центральный портовый терминал и прилегающие доки. Служба на Трамонтане формирует один из самых высоких профессиональных стандартов в департаменте.</p></div><a class="btn" href="#/forms">Заявления и формуляры</a></div></div></section>
  <section class="sec alt"><div class="wrap">${sech("Поступление", "Путь в полицию")}<div class="steps reveal">${S.steps.map((s) => `<div class="step"><h4>${E(s.t)}</h4><p>${E(s.d)}</p></div>`).join("")}</div></div></section>
  <section class="sec"><div class="wrap">${sech("Звания", "Карьерная лестница")}<div class="ladder">${groups.map((g) => `<div class="lg reveal"><h3>${E(g)}</h3>${S.ranks.filter((r) => r.group === g).map((r) => `<div class="rank" data-rank tabindex="0"><b>${E(r.name)}</b><div class="d"><div>${E(r.desc)}</div></div>${eb("ranks", r.id)}</div>`).join("")}</div>`).join("")}</div>${addb("ranks", "Звание")}
    <div class="prose reveal" style="margin-top:50px">${H(S.specs)}</div></div></section>
  <section class="sec alt"><div class="wrap">${sech("Кадровый смотр", E(v.title || "Вакансии"), `<div><span class="chip ${VS[st][1]}">${E(VS[st][0])}</span></div>`)}${body}
    <button class="ed addb" data-ed="vacancies:-">✎ Править набор</button></div></section>` };
}, "career");
