/* ===== Зоны ответственности: интерактивная карта Сан-Фиерро =====
   Данные:
   - S.zones   — зоны (название, станция, описание, картинка, цвет) — те же, что в разделе «О станции»;
   - S.map     — { img, rings: { <id зоны>: [ кольцо, … ] } }, кольцо = [[x, y], …] в системе 1000×680;
   - S.pois    — объекты на карте: станции и всё остальное ({ id, kind, zone, name, x, y, text, img }).
   Карта нарисована схемой по описаниям зон, это не копия игровой карты. Контуры и маркеры правятся мышью
   в режиме правки; вместо схемы можно подставить свою картинку («Фон карты»). */
const MAP_W = 1000, MAP_H = 680;
const MAP_PAL = ["#4f84c4", "#d2a94a", "#4fa37a", "#c0607a", "#8f72cf", "#d08a4b"];
const MAP_KINDS = {
  station: "Станция", bridge: "Мост", port: "Порт", district: "Район", town: "Населённый пункт",
  industry: "Промзона", mountain: "Горы", landmark: "Объект",
};
const MAP_ICON = {
  bridge: '<path d="M-9 5H9M-9 5Q0 -11 9 5M-5 5V0M0 5V-4M5 5V0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  port: '<path d="M0 -8a2 2 0 1 0 .01 0M0 -5V8M-6 2Q-6 8 0 8Q6 8 6 2M-4 -1H4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  district: '<path d="M-6 8V-6H1V8M1 8V-1H6V8M-9 8H9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  town: '<path d="M-8 1L0 -7L8 1M-6 0V8H6V0M-1.5 8V3H1.5V8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  industry: '<path d="M-8 8V-1L-3 3V-1L2 3V-6H5V3H8V8Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  mountain: '<path d="M-9 8L-2 -6L2 0L5 -3L9 8Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  landmark: '<path d="M0 -8L8 0L0 8L-8 0Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  station: '<path d="M0 -9L8 -6V1C8 6 4 8.5 0 10C-4 8.5 -8 6 -8 1V-6Z" fill="currentColor"/><path d="M0 -4.5L1.4 -1.4L4.8 -1.1L2.2 1L3 4.3L0 2.5L-3 4.3L-2.2 1L-4.8 -1.1L-1.4 -1.4Z" fill="#14100a"/>',
};
/* стартовые контуры и объекты */
const MAP_DEF = { img: "", rings: {
  z1: [[[30, 315], [650, 315], [650, 400], [520, 400], [470, 455], [30, 470]]],
  z2: [[[30, 470], [470, 455], [520, 400], [750, 400], [750, 600], [330, 640], [250, 590], [30, 570]]],
  z3: [[[0, 0], [1000, 0], [1000, 300], [0, 300]], [[30, 570], [250, 590], [330, 640], [750, 600], [750, 700], [30, 700]]],
} };
const POI_DEF = [
  { id: "p-st1", kind: "station", zone: "z1", name: "Станция моста Гант", x: 392, y: 357, text: "Северный въезд в город, у основания моста через залив в направлении Бэйсайда." },
  { id: "p-st2", kind: "station", zone: "z2", name: "Центральная станция Трамонтана", x: 548, y: 506, text: "На стыке финансового центра и промышленного сектора, в непосредственной близости от портового терминала." },
  { id: "p-st3", kind: "station", zone: "z3", name: "Офис шерифа", x: 765, y: 128, text: "Отдельная структура внутри департамента, расположена в Бэйсайде. Шериф избирается населением." },
  { id: "p-bridge", kind: "bridge", zone: "z1", name: "Мост Гант", x: 348, y: 290, text: "Мост через залив в сторону Бэйсайда. Высокий транзитный трафик, транзитная контрабанда, угоны и ДТП с тяжёлыми последствиями." },
  { id: "p-front", kind: "district", zone: "z1", name: "Туристическая набережная", x: 222, y: 352, text: "Карманные кражи, мошенничество и публичные беспорядки в вечернее время." },
  { id: "p-north", kind: "district", zone: "z1", name: "Северные жилые кварталы", x: 176, y: 418, text: "Расширяющийся жилой сектор: нагрузка на станцию последовательно растёт." },
  { id: "p-ind1", kind: "industry", zone: "z1", name: "Промышленная полоса у залива", x: 585, y: 366, text: "Прилегающая к мосту промышленная полоса вдоль залива." },
  { id: "p-fin", kind: "district", zone: "z2", name: "Финансовый центр", x: 405, y: 508, text: "Днём здесь десятки тысяч офисных работников и сотрудников государственных учреждений, штаб-квартиры крупных корпораций." },
  { id: "p-ind2", kind: "industry", zone: "z2", name: "Промышленный сектор", x: 622, y: 548, text: "Контрабандные сети, корпоративный шпионаж и уличный криминал." },
  { id: "p-port", kind: "port", zone: "z2", name: "Портовый терминал", x: 696, y: 492, text: "Один из главных грузовых хабов Федерации. Ночью огромный поток грузов идёт через доки и транзитные узлы." },
  { id: "p-angel", kind: "town", zone: "z3", name: "Энджел Пайн", x: 205, y: 118, text: "Посёлок округа Флинт, юрисдикция шерифа." },
  { id: "p-hills", kind: "mountain", zone: "z3", name: "Горные районы", x: 118, y: 196, text: "Незаконные лаборатории и свалки, контрабанда по горным дорогам в обход городских постов, туристы, теряющиеся на серпантинах." },
  { id: "p-farms", kind: "landmark", zone: "z3", name: "Фермерские угодья", x: 610, y: 78, text: "Сельские трассы и угоны сельскохозяйственной техники." },
];
const MAP_INTRO = "Карта показывает зоны территориальной ответственности SFPD. Выберите станцию, объект или зону: контур подсветится, справа появится описание.";
const clone = (o) => JSON.parse(JSON.stringify(o));
const zColor = (z, i) => (/^#[0-9a-f]{3,8}$/i.test((z && z.color) || "") ? z.color : MAP_PAL[i % MAP_PAL.length]);
function mapEnsure() {
  if (!S.map || typeof S.map !== "object") S.map = clone(MAP_DEF);
  if (!S.map.rings || typeof S.map.rings !== "object") S.map.rings = {};
  if (!Array.isArray(S.pois)) S.pois = clone(POI_DEF);
  S.pois.forEach((p) => { p.x = clamp(+p.x || 0, 0, MAP_W); p.y = clamp(+p.y || 0, 0, MAP_H); if (!MAP_KINDS[p.kind]) p.kind = "landmark"; });
}
const mzRings = (id) => (S.map.rings[id] || []).filter((r) => Array.isArray(r) && r.length >= 3);
const ringD = (r) => "M" + r.map((q) => q[0].toFixed(1) + " " + q[1].toFixed(1)).join("L") + "Z";
const zonePath = (id) => mzRings(id).map(ringD).join("");
const zoneIdx = (id) => S.zones.findIndex((z) => z.id === id);
const zBox = (id) => { const rs = mzRings(id); if (!rs.length) return null; let a = 1e9, b = 1e9, c = -1e9, d = -1e9; rs.forEach((r) => r.forEach((q) => { a = Math.min(a, q[0]); b = Math.min(b, q[1]); c = Math.max(c, q[0]); d = Math.max(d, q[1]); })); return [a, b, c, d]; };
/* подпись зоны: центр самого крупного кольца, обрезанный по видимой карте */
function zLabelAt(id) {
  let best = null, ba = -1;
  mzRings(id).forEach((r) => { const xs = r.map((q) => clamp(q[0], 0, MAP_W)), ys = r.map((q) => clamp(q[1], 0, MAP_H)), a0 = Math.min(...xs), a1 = Math.max(...xs), b0 = Math.min(...ys), b1 = Math.max(...ys), ar = (a1 - a0) * (b1 - b0); if (ar > ba) { ba = ar; best = [(a0 + a1) / 2, (b0 + b1) / 2]; } });
  return best;
}

/* ===== схема Сан-Фиерро ===== */
function smoothD(p, closed) {
  const n = p.length, g = (i) => p[closed ? (i + n) % n : clamp(i, 0, n - 1)];
  let d = "M" + p[0][0] + " " + p[0][1];
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const a = g(i - 1), b = g(i), c = g(i + 1), e = g(i + 2);
    d += `C${(b[0] + (c[0] - a[0]) / 6).toFixed(1)} ${(b[1] + (c[1] - a[1]) / 6).toFixed(1)} ${(c[0] - (e[0] - b[0]) / 6).toFixed(1)} ${(c[1] - (e[1] - b[1]) / 6).toFixed(1)} ${c[0]} ${c[1]}`;
  }
  return d + (closed ? "Z" : "");
}
const COUNTY = [[1040, -40], [1040, 112], [965, 136], [905, 152], [852, 138], [800, 172], [745, 160], [690, 196], [630, 190], [572, 216], [512, 212], [456, 232], [402, 238], [346, 244], [290, 253], [232, 246], [176, 262], [120, 246], [70, 252], [42, 230], [34, 150], [46, 80], [36, 10], [40, -40]];
const CITY = [[70, 720], [62, 620], [78, 540], [70, 480], [105, 425], [150, 395], [205, 370], [250, 350], [300, 342], [352, 334], [410, 344], [470, 334], [530, 340], [585, 356], [630, 388], [680, 418], [712, 455], [724, 505], [706, 545], [690, 590], [702, 640], [690, 720]];
const ROADS = [
  [[352, 334], [346, 420], [382, 500], [362, 600], [340, 700]],
  [[100, 522], [250, 506], [382, 500], [520, 496], [660, 472], [712, 456]],
  [[346, 244], [420, 204], [520, 172], [640, 142], [765, 128]],
  [[420, 204], [330, 162], [262, 132], [206, 118]],
  [[250, 350], [230, 430], [190, 520], [140, 640]],
  [[530, 340], [548, 420], [548, 506], [580, 600], [640, 700]],
];
const MOUNT = [[110, 190], [138, 168], [92, 150], [160, 205], [230, 160], [260, 100], [300, 120], [170, 80], [120, 110], [300, 640], [340, 660], [260, 620], [420, 650], [180, 600], [140, 650], [560, 640], [610, 620]];
function mapBase() {
  const city = smoothD(CITY, true), county = smoothD(COUNTY, true);
  const mt = (q) => `<path d="M${q[0] - 11} ${q[1] + 7}L${q[0]} ${q[1] - 9}L${q[0] + 11} ${q[1] + 7}Z"/>`;
  return `<defs>
    <clipPath id="mclipland"><path d="${county}"/><path d="${city}"/></clipPath>
    <clipPath id="mclipcity"><path d="${city}"/></clipPath>
    <pattern id="mgrid" width="26" height="26" patternUnits="userSpaceOnUse" patternTransform="rotate(-14)"><path d="M0 0H26M0 0V26" class="mp-grid"/></pattern>
    <pattern id="mwave" width="60" height="22" patternUnits="userSpaceOnUse"><path d="M0 11Q15 2 30 11T60 11" class="mp-wave"/></pattern>
  </defs>
  <rect class="mp-water" width="${MAP_W}" height="${MAP_H}"/><rect width="${MAP_W}" height="${MAP_H}" fill="url(#mwave)"/>
  <path class="mp-shore" d="${county}"/><path class="mp-shore" d="${city}"/>
  <path class="mp-land" d="${county}"/><path class="mp-land" d="${city}"/>
  <rect width="${MAP_W}" height="${MAP_H}" fill="url(#mgrid)" clip-path="url(#mclipcity)"/>
  <g class="mp-mt" clip-path="url(#mclipland)">${MOUNT.map(mt).join("")}</g>
  <g clip-path="url(#mclipland)" fill="none">${ROADS.map((r) => `<path class="mp-road" d="${smoothD(r, false)}"/>`).join("")}</g>
  <g class="mp-bridge"><path d="M346 244L352 334" class="b1"/><path d="M346 244L352 334" class="b2"/><rect x="341" y="268" width="11" height="5"/><rect x="344" y="300" width="11" height="5"/></g>
  <text class="mp-sea" x="610" y="286">ЗАЛИВ САН-ФИЕРРО</text><text class="mp-sea" x="860" y="500" transform="rotate(-90 860 500)">ОКЕАН</text>
  <text class="mp-area" x="520" y="60">ОКРУГ ФЛИНТ</text><text class="mp-area" x="215" y="660">САН-ФИЕРРО</text>
  <g class="mp-compass" transform="translate(940 70)"><circle r="26"/><path d="M0 -22L5 0L0 22L-5 0Z"/><text y="-30">С</text></g>
  <text class="mp-note" x="990" y="668" text-anchor="end">Схема, не в масштабе</text>`;
}

/* ===== страница ===== */
const MP = { svg: null, vb: { x: 0, y: 0, w: MAP_W }, sel: { z: null, p: null }, off: new Set(), anim: 0, ro: null, moved: false, px: 1 };
const mvH = () => MP.vb.w * MAP_H / MAP_W;
const mEditing = () => document.body.classList.contains("editing");
const mTitle = (p) => (p.name || MAP_KINDS[p.kind] || "Объект");
function mapMarkup() {
  return `<div class="mapui reveal"><div class="mapbox" id="mapbox">
    <svg id="mapsvg" viewBox="0 0 ${MAP_W} ${MAP_H}" role="group" aria-label="Карта зон ответственности"><g id="mbase"></g><g id="mzones"></g><g id="mhandles"></g><g id="mpois"></g></svg>
    <div class="mtip" id="mtip" hidden></div>
    <div class="mctl"><button type="button" data-mz="1" aria-label="Приблизить" title="Приблизить">+</button><button type="button" data-mz="-1" aria-label="Отдалить" title="Отдалить">−</button><button type="button" data-mz="0" aria-label="Вся карта" title="Вся карта">⌂</button></div>
    <div class="mhint" id="mhint">Ctrl + колесо мыши — масштаб · перетаскивание — сдвиг</div>
    <div class="mleg" id="mleg"></div>
    <div class="mtool ed"><button type="button" data-mt="addp">+ Объект</button><button type="button" data-mt="addr">+ Контур выбранной зоны</button><button type="button" data-mt="bg">Фон карты</button><button type="button" data-mt="reset">Вернуть исходную схему</button><span class="note">Тяните маркеры и точки контура. Двойной щелчок по линии добавляет точку, по точке удаляет её.</span></div>
  </div><aside class="mpanel aside" id="mpanel" aria-live="polite"></aside></div>`;
}
route("zones", () => mapPage(), "zones");
route("zones/:id", (id) => mapPage(id), "zones");
function mapPage(id) {
  mapEnsure();
  const m = S.meta;
  return { title: "Зоны ответственности", init: (app) => mapInit(app, id), html: `${phead("Департамент", "Зоны ответственности", E(m.mapIntro || MAP_INTRO), m.deptImg || m.hero, null, cropOf(m, m.deptImg ? "deptImg" : "hero"))}
  <section class="sec mapsec"><div class="wrap xl">${mapMarkup()}</div></section>
  <section class="sec alt"><div class="wrap"><div class="grid g2" style="gap:44px"><div class="prose reveal">${H(S.deptText)}</div><div class="reveal"><h3 style="margin-bottom:16px;color:var(--brass2)">Структура департамента</h3>${treeHTML(S.dept)}<button class="ed addb" data-ed="dept:-">✎ Править структуру</button></div></div></div></section>` };
}
/* --- рисование --- */
function paintZones() {
  const g = $("#mzones"); if (!g) return;
  g.innerHTML = S.zones.map((z, i) => { const c = zColor(z, i), d = zonePath(z.id), at = zLabelAt(z.id); if (!d) return ""; return `<g class="mz${z.home ? " home" : ""}" data-z="${esc(z.id)}" style="--zc:${c}" clip-path="url(#mclipland)"><path class="zf" d="${d}"/>${at ? `<text class="zn" x="${at[0].toFixed(0)}" y="${at[1].toFixed(0)}">${esc(z.n || "")}</text>` : ""}</g>`; }).join("");
  syncSel();
}
function paintPois() {
  const g = $("#mpois"); if (!g) return;
  g.innerHTML = S.pois.filter((p) => !MP.off.has(p.kind)).map((p) => {
    const zi = zoneIdx(p.zone), z = S.zones[zi], c = z ? zColor(z, zi) : "#8a95a5", st = p.kind === "station";
    return `<g class="mk k-${p.kind}${st ? " st" : ""}${z && z.home && st ? " home" : ""}" data-p="${esc(p.id)}" data-z="${esc(p.zone || "")}" transform="translate(${p.x} ${p.y})" tabindex="0" role="button" aria-label="${esc(mTitle(p))}" style="--zc:${c}"><g class="mki"><circle class="mkh" r="${st ? 22 : 17}"/><circle class="mkb" r="${st ? 16 : 13}"/><g class="mic" style="color:${st ? "#14100a" : "#fff"}" transform="scale(${st ? 1 : 0.85})">${MAP_ICON[p.kind] || MAP_ICON.landmark}</g><text class="mkt" y="${st ? 33 : 28}">${esc(mTitle(p))}</text></g></g>`;
  }).join("");
  syncSel();
}
function paintHandles() {
  const g = $("#mhandles"); if (!g) return;
  const z = MP.sel.z; if (!z) { g.innerHTML = ""; return; }
  g.innerHTML = mzRings(z).map((r, ri) => r.map((q, vi) => { const n = r.slice(vi + 1 < r.length ? vi + 1 : 0)[0]; return `<path class="mve" data-r="${ri}" data-s="${vi}" d="M${q[0]} ${q[1]}L${n[0]} ${n[1]}"/>`; }).join("") + r.map((q, vi) => `<g class="mvh" data-r="${ri}" data-v="${vi}" transform="translate(${q[0]} ${q[1]})"><circle r="7"/></g>`).join("")).join("");
}
function paintLegend() {
  const el = $("#mleg"); if (!el) return;
  const ks = [...new Set(S.pois.map((p) => p.kind))];
  el.innerHTML = ks.map((k) => `<button type="button" data-lk="${k}" class="${MP.off.has(k) ? "off" : ""}" aria-pressed="${!MP.off.has(k)}"><svg viewBox="-11 -11 22 22" aria-hidden="true"><g style="color:currentColor">${MAP_ICON[k]}</g></svg>${esc(MAP_KINDS[k])}</button>`).join("");
}
function syncSel() {
  const svg = MP.svg; if (!svg) return;
  const { z, p } = MP.sel;
  svg.classList.toggle("has", !!z);
  $$(".mz", svg).forEach((e) => e.classList.toggle("sel", e.dataset.z === z));
  $$(".mk", svg).forEach((e) => { e.classList.toggle("sel", e.dataset.p === p); e.classList.toggle("zsel", !!z && e.dataset.z === z); });
}
/* --- камера --- */
function applyVB() {
  const v = MP.vb, svg = MP.svg; if (!svg) return;
  v.w = clamp(v.w, 200, MAP_W); const h = mvH();
  v.x = clamp(v.x, 0, MAP_W - v.w); v.y = clamp(v.y, 0, MAP_H - h);
  svg.setAttribute("viewBox", `${v.x.toFixed(2)} ${v.y.toFixed(2)} ${v.w.toFixed(2)} ${h.toFixed(2)}`);
  const px = svg.getBoundingClientRect().width || MAP_W; MP.px = px;
  svg.style.setProperty("--ms", (v.w / px * (px < 560 ? 0.85 : 1)).toFixed(4));
  svg.classList.toggle("zoomed", v.w < MAP_W * 0.92); svg.classList.toggle("close", v.w < 520);
}
function flyTo(x, y, w, quick) {
  cancelAnimationFrame(MP.anim);
  const v = MP.vb; w = clamp(w, 200, MAP_W);
  const to = { w, x: x - w / 2, y: y - (w * MAP_H / MAP_W) / 2 }, from = { x: v.x, y: v.y, w: v.w };
  if (quick || matchMedia("(prefers-reduced-motion: reduce)").matches) { Object.assign(v, to); applyVB(); return; }
  const t0 = performance.now(), D = 520;
  const step = (t) => { const k = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - k, 3); v.w = from.w + (to.w - from.w) * e; v.x = from.x + (to.x - from.x) * e; v.y = from.y + (to.y - from.y) * e; applyVB(); if (k < 1) MP.anim = requestAnimationFrame(step); };
  MP.anim = requestAnimationFrame(step);
}
function fitBox(b, quick) { const pad = 50, w = Math.max(b[2] - b[0] + pad * 2, (b[3] - b[1] + pad * 2) * MAP_W / MAP_H); flyTo((b[0] + b[2]) / 2, (b[1] + b[3]) / 2, Math.min(MAP_W, w), quick); }
function zoomAt(f, cx, cy) { /* f > 1 — приблизить; cx, cy — доли окна, куда смотрим */ const v = MP.vb, nw = clamp(v.w / f, 200, MAP_W), px = v.x + v.w * cx, py = v.y + mvH() * cy; cancelAnimationFrame(MP.anim); v.w = nw; v.x = px - nw * cx; v.y = py - (nw * MAP_H / MAP_W) * cy; applyVB(); }
const toMap = (e) => { const r = MP.svg.getBoundingClientRect(), v = MP.vb; return [v.x + ((e.clientX - r.left) / r.width) * v.w, v.y + ((e.clientY - r.top) / r.height) * mvH()]; };
/* --- выбор --- */
function mapSelect(sel, opt) {
  opt = opt || {};
  const p = sel.p ? S.pois.find((x) => x.id === sel.p) : null;
  const z = sel.z && S.zones.find((x) => x.id === sel.z) ? sel.z : p && S.zones.find((x) => x.id === p.zone) ? p.zone : null;
  MP.sel = { z, p: p ? p.id : null };
  syncSel(); paintHandles(); mapPanel();
  const tag = p ? p.id : z;
  try { history.replaceState(null, "", "#/zones" + (tag ? "/" + encodeURIComponent(tag) : "")); } catch (e) {}
  if (opt.noFly) return;
  if (p && p.kind !== "station") flyTo(p.x, p.y, Math.min(MP.vb.w, 440), opt.quick);
  else if (z && zBox(z)) fitBox(zBox(z), opt.quick);
  else if (!z) flyTo(MAP_W / 2, MAP_H / 2, MAP_W, opt.quick);
}
function mapPanel() {
  const el = $("#mpanel"); if (!el) return;
  const { z: zid, p: pid } = MP.sel, z = S.zones.find((x) => x.id === zid), p = S.pois.find((x) => x.id === pid), zi = zoneIdx(zid);
  const chips = (list) => list.map((q) => `<button type="button" class="mo" data-sp="${esc(q.id)}"><svg viewBox="-11 -11 22 22" aria-hidden="true">${MAP_ICON[q.kind] || MAP_ICON.landmark}</svg><span>${esc(mTitle(q))}</span><em>${esc(MAP_KINDS[q.kind])}</em></button>`).join("");
  let h = "";
  if (z && (!p || p.kind === "station")) {
    const st = p || S.pois.find((q) => q.zone === z.id && q.kind === "station"), others = S.pois.filter((q) => q.zone === z.id && q.kind !== "station");
    h = `<div class="mp-h" style="--zc:${zColor(z, zi)}"><span class="mp-n">${E(z.n || "")}</span><div><h3>${E(z.name)}</h3><div class="sub">${E(z.station || "")}${z.home ? " · наша зона" : ""}</div></div></div>
      ${z.img ? `<div class="mp-img">${fimg(z.img, cropOf(z, "img"), z.name)}</div>` : ""}
      ${st && st.text ? `<p class="mp-lead">${E(st.text)}</p>` : ""}
      <div class="mp-txt" id="mptxt"><p>${E(z.text || "")}</p></div><button type="button" class="mp-more" id="mpmore" hidden>Читать полностью</button>
      ${others.length ? `<h4 class="mp-sub">Объекты в зоне</h4><div class="mos">${chips(others)}</div>` : ""}
      ${z.home ? `<p class="mp-links"><a class="btn ghost" href="#/units">Подразделения станции</a> <a class="btn ghost" href="#/staff">Личный состав</a></p>` : ""}
      <p class="mp-links"><button type="button" class="mp-back" data-sp="">← Все зоны</button></p>${eb("zones", z.id)}`;
  } else if (p) {
    h = `<div class="mp-h" style="--zc:${z ? zColor(z, zi) : "#8a95a5"}"><span class="mp-ic"><svg viewBox="-11 -11 22 22" aria-hidden="true">${MAP_ICON[p.kind] || MAP_ICON.landmark}</svg></span><div><h3>${E(mTitle(p))}</h3><div class="sub">${esc(MAP_KINDS[p.kind])}</div></div></div>
      ${p.img ? `<div class="mp-img">${fimg(p.img, cropOf(p, "img"), p.name)}</div>` : ""}
      <div class="mp-txt full"><p>${E(p.text || "Описание пока не добавлено.")}</p></div>
      ${z ? `<h4 class="mp-sub">Зона ответственности</h4><div class="mos"><button type="button" class="mo zone" data-sz="${esc(z.id)}" style="--zc:${zColor(z, zi)}"><b>${E(z.n || "")}</b><span>${E(z.name)}</span><em>${E(z.station || "")}</em></button></div>` : ""}
      <p class="mp-links"><button type="button" class="mp-back" data-sp="">← Все зоны</button></p>${eb("pois", p.id)}`;
  } else {
    h = `<h3 class="mp-title">Зоны ответственности</h3><p class="mp-lead">${E(S.meta.mapIntro || MAP_INTRO)}</p><div class="mzs">${S.zones.map((q, i) => `<button type="button" class="mzc${q.home ? " home" : ""}" data-sz="${esc(q.id)}" style="--zc:${zColor(q, i)}"><b>${E(q.n || "")}</b><span>${E(q.name)}</span><em>${E(q.station || "")}${q.home ? " · наша зона" : ""}</em></button>`).join("")}</div>${S.zones.length ? "" : `<p class="note">Зон пока нет.</p>`}${addb("zones", "Зона")}`;
  }
  el.innerHTML = ui(h); el.scrollTop = 0;
  const tx = $("#mptxt", el), more = $("#mpmore", el);
  if (tx && more) { tx.classList.add("clamp"); requestAnimationFrame(() => { if (tx.scrollHeight > tx.clientHeight + 4) { more.hidden = false; more.onclick = () => { const open = tx.classList.toggle("clamp"); more.textContent = open ? "Читать полностью" : "Свернуть"; }; } else tx.classList.remove("clamp"); }); }
}
/* --- правка контуров и маркеров мышью --- */
function mapDrag(e, onMove, onEnd) {
  e.stopPropagation(); e.preventDefault();
  const el = e.currentTarget || e.target; let moved = false; const x0 = e.clientX, y0 = e.clientY;
  try { el.setPointerCapture(e.pointerId); } catch (x) {}
  const mv = (ev) => { if (!moved && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 4) return; moved = true; onMove(toMap(ev)); };
  const up = () => { el.removeEventListener("pointermove", mv); el.removeEventListener("pointerup", up); el.removeEventListener("pointercancel", up); onEnd(moved); };
  el.addEventListener("pointermove", mv); el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
}
const r1 = (n) => Math.round(n * 10) / 10;
function mapEditBind(svg) {
  svg.addEventListener("pointerdown", (e) => {
    if (!mEditing() || e.button > 0) return;
    const hd = e.target.closest(".mvh"), mk = e.target.closest(".mk");
    if (hd) {
      const ring = mzRings(MP.sel.z)[+hd.dataset.r], q = ring[+hd.dataset.v], fill = $(`#mzones .mz[data-z="${CSS.escape(MP.sel.z)}"] .zf`);
      mapDrag(e, ([x, y]) => { q[0] = r1(clamp(x, 0, MAP_W)); q[1] = r1(clamp(y, 0, MAP_H)); hd.setAttribute("transform", `translate(${q[0]} ${q[1]})`); if (fill) fill.setAttribute("d", zonePath(MP.sel.z)); }, (moved) => { if (moved) { save(); paintZones(); paintHandles(); } });
    } else if (mk) {
      const p = S.pois.find((x) => x.id === mk.dataset.p); if (!p) return;
      mapDrag(e, ([x, y]) => { p.x = r1(clamp(x, 0, MAP_W)); p.y = r1(clamp(y, 0, MAP_H)); mk.setAttribute("transform", `translate(${p.x} ${p.y})`); }, (moved) => { if (moved) save(); else MP.moved = false, openEd("pois", p.id); });
    }
  }, true);
  svg.addEventListener("dblclick", (e) => {
    if (!mEditing()) return;
    const hd = e.target.closest(".mvh"), ed = e.target.closest(".mve"), rings = MP.sel.z && S.map.rings[MP.sel.z];
    if (!rings) return;
    if (hd) { const r = mzRings(MP.sel.z)[+hd.dataset.r]; if (r.length <= 3) { toast("В контуре должно остаться минимум три точки"); return; } r.splice(+hd.dataset.v, 1); }
    else if (ed) { const r = mzRings(MP.sel.z)[+ed.dataset.r], [x, y] = toMap(e); r.splice(+ed.dataset.s + 1, 0, [r1(x), r1(y)]); }
    else return;
    e.preventDefault(); e.stopPropagation(); save(); paintZones(); paintHandles();
  });
}
function mapTool(a) {
  if (a === "addp") { const z = MP.sel.z || ""; openEd("pois", "new"); const c = [MP.vb.x + MP.vb.w / 2, MP.vb.y + mvH() / 2]; const fx = $('#edb [data-f="x"]'), fy = $('#edb [data-f="y"]'), fz = $('#edb [data-f="zone"]'); if (fx) fx.value = Math.round(c[0]); if (fy) fy.value = Math.round(c[1]); if (fz && z) fz.value = z; }
  else if (a === "addr") {
    const z = MP.sel.z; if (!z) { toast("Сначала выберите зону на карте"); return; }
    const cx = Math.round(MP.vb.x + MP.vb.w / 2), cy = Math.round(MP.vb.y + mvH() / 2), s = Math.round(MP.vb.w / 8);
    (S.map.rings[z] = S.map.rings[z] || []).push([[cx - s, cy - s], [cx + s, cy - s], [cx + s, cy + s], [cx - s, cy + s]]);
    save(); paintZones(); paintHandles(); toast("Контур добавлен: потяните его точки");
  } else if (a === "bg") openEd("map");
}
/* --- подключение --- */
function mapInit(app, startId) {
  const svg = $("#mapsvg", app); if (!svg) return;
  MP.svg = svg; MP.sel = { z: null, p: null }; MP.vb = { x: 0, y: 0, w: MAP_W };
  if (MP.ro) MP.ro.disconnect();
  $("#mbase", app).innerHTML = S.map.img ? `<rect class="mp-water" width="${MAP_W}" height="${MAP_H}"/><image href="${esc(S.map.img)}" width="${MAP_W}" height="${MAP_H}" preserveAspectRatio="xMidYMid slice"/>` : mapBase();
  svg.classList.toggle("custom", !!S.map.img);
  paintZones(); paintPois(); paintLegend(); applyVB();
  if (window.ResizeObserver) { MP.ro = new ResizeObserver(applyVB); MP.ro.observe(svg); }
  /* камера: перетаскивание, щипок, Ctrl + колесо */
  const ptr = new Map(); let pan = null, pinch = null, hint = 0;
  svg.addEventListener("pointerdown", (e) => {
    if (e.button > 0 || (mEditing() && e.target.closest(".mvh,.mk"))) return;
    ptr.set(e.pointerId, { x: e.clientX, y: e.clientY }); MP.moved = false;
    if (ptr.size === 1) pan = { x: e.clientX, y: e.clientY, vx: MP.vb.x, vy: MP.vb.y };
    else if (ptr.size === 2) { const [a, b] = [...ptr.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, w: MP.vb.w }; pan = null; MP.moved = true; }
  });
  svg.addEventListener("pointermove", (e) => {
    if (ptr.has(e.pointerId)) {
      ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const r = svg.getBoundingClientRect();
      if (pinch && ptr.size >= 2) { const [a, b] = [...ptr.values()], d = Math.hypot(a.x - b.x, a.y - b.y) || 1; zoomAt(d / pinch.d, ((a.x + b.x) / 2 - r.left) / r.width, ((a.y + b.y) / 2 - r.top) / r.height); pinch.d = d; }
      else if (pan) {
        const dx = e.clientX - pan.x, dy = e.clientY - pan.y;
        if (!MP.moved && Math.hypot(dx, dy) > 5) { MP.moved = true; try { svg.setPointerCapture(e.pointerId); } catch (x) {} svg.classList.add("grab"); cancelAnimationFrame(MP.anim); }
        if (MP.moved) { MP.vb.x = pan.vx - (dx / r.width) * MP.vb.w; MP.vb.y = pan.vy - (dy / r.height) * mvH(); applyVB(); }
      }
    } else mapHover(e);
  });
  const end = (e) => { ptr.delete(e.pointerId); if (ptr.size < 2) pinch = null; if (!ptr.size) { pan = null; svg.classList.remove("grab"); } };
  svg.addEventListener("pointerup", end); svg.addEventListener("pointercancel", end);
  svg.addEventListener("pointerleave", () => { const t = $("#mtip"); if (t) t.hidden = true; $$(".mz.hov", svg).forEach((x) => x.classList.remove("hov")); });
  svg.addEventListener("wheel", (e) => {
    if (!(e.ctrlKey || e.metaKey)) { const h = $("#mhint"); if (h) { h.classList.add("on"); clearTimeout(hint); hint = setTimeout(() => h.classList.remove("on"), 1600); } return; }
    e.preventDefault(); const r = svg.getBoundingClientRect(); zoomAt(Math.exp(-e.deltaY * 0.0022), (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
  }, { passive: false });
  svg.addEventListener("click", (e) => {
    if (MP.moved) { MP.moved = false; return; }
    if (mEditing() && e.target.closest(".mk")) return;
    const mk = e.target.closest(".mk"), mz = e.target.closest(".mz");
    if (mk) mapSelect({ p: mk.dataset.p });
    else if (mz) mapSelect({ z: mz.dataset.z });
    else if (MP.sel.z && !e.target.closest(".mvh,.mve")) mapSelect({});
  });
  svg.addEventListener("keydown", (e) => {
    const mk = e.target.closest && e.target.closest(".mk");
    if (mk && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); mapSelect({ p: mk.dataset.p }); }
    else if (e.key === "Escape" && MP.sel.z) { e.stopPropagation(); mapSelect({}); }
  });
  mapEditBind(svg);
  const box = $("#mapbox", app);
  box.addEventListener("click", (e) => {
    const z = e.target.closest("[data-mz]"), lk = e.target.closest("[data-lk]"), tl = e.target.closest("[data-mt]");
    if (z) { const f = +z.dataset.mz; if (!f) mapSelect({}); else zoomAt(f > 0 ? 1.5 : 1 / 1.5, 0.5, 0.5); }
    else if (lk) { const k = lk.dataset.lk; MP.off.has(k) ? MP.off.delete(k) : MP.off.add(k); paintLegend(); paintPois(); }
    else if (tl) { const a = tl.dataset.mt; if (a === "reset") arm(tl, () => { S.map = clone(MAP_DEF); S.pois = clone(POI_DEF); save(); render(); toast("Исходная схема восстановлена"); }); else mapTool(a); }
  });
  $("#mpanel", app).addEventListener("click", (e) => {
    const sp = e.target.closest("[data-sp]"), sz = e.target.closest("[data-sz]");
    if (sp) mapSelect(sp.dataset.sp ? { p: sp.dataset.sp } : {});
    else if (sz) mapSelect({ z: sz.dataset.sz });
  });
  const sid = startId ? decodeURIComponent(startId) : "";
  const poi = S.pois.find((x) => x.id === sid), zone = S.zones.find((x) => x.id === sid);
  mapSelect(poi ? { p: poi.id } : zone ? { z: zone.id } : {}, { quick: true });
  const fixScroll = () => { const r = box.getBoundingClientRect(); if (r.top > innerHeight * 0.5 || r.top < $("#hdr").offsetHeight) scrollTo({ top: scrollY + r.top - ($("#hdr").offsetHeight + 12), behavior: "instant" }); };
  if (poi || zone) { requestAnimationFrame(fixScroll); setTimeout(fixScroll, 450); }
}
function mapHover(e) {
  const t = $("#mtip"), svg = MP.svg; if (!t) return;
  const mk = e.target.closest(".mk"), mz = e.target.closest(".mz");
  $$(".mz.hov", svg).forEach((x) => x !== mz && x.classList.remove("hov")); if (mz) mz.classList.add("hov");
  const box = $("#mapbox").getBoundingClientRect();
  let txt = "";
  if (mk) { const p = S.pois.find((x) => x.id === mk.dataset.p); txt = p ? mTitle(p) + " · " + MAP_KINDS[p.kind] : ""; }
  else if (mz) { const z = S.zones.find((x) => x.id === mz.dataset.z); txt = z ? (z.n ? z.n + ". " : "") + z.name : ""; }
  if (!txt) { t.hidden = true; return; }
  t.textContent = txt; t.hidden = false; t.style.left = clamp(e.clientX - box.left + 14, 6, box.width - 220) + "px"; t.style.top = clamp(e.clientY - box.top + 16, 6, box.height - 40) + "px";
}
