/* ===== header, footer, init ===== */
const IC = {
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>',
  sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1"/></svg>',
  moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z"/></svg>',
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
};
function navHTML() {
  const out = [], groups = {};
  navData().forEach((r) => {
    const [g, l, h, d] = r; if (!l) return;
    if (!g) out.push({ t: "l", l, h });
    else { if (!groups[g]) { groups[g] = { t: "g", g, items: [] }; out.push(groups[g]); } groups[g].items.push({ l, h, d }); }
  });
  return out.map((x) => x.t === "l"
    ? `<a class="nl" href="${esc(x.h)}" data-h="${esc(x.h)}">${esc(x.l)}</a>`
    : `<div class="ng"><button class="nl" aria-haspopup="true" aria-expanded="false">${esc(x.g)}<i class="car"></i></button><div class="dd">${x.items.map((i) => `<a class="di" href="${esc(i.h)}" data-h="${esc(i.h)}"><b>${esc(i.l)}</b>${i.d ? `<small>${esc(i.d)}</small>` : ""}</a>`).join("")}</div></div>`).join("");
}
function chrome() {
  const m = S.meta, [a] = (m.name || "Tramontane").split(" ");
  $("#util").innerHTML = `<div class="uw"><span><i class="pulse"></i>${esc(m.topline || "")}</span><span>${esc(m.address || "")}</span></div>`;
  $("#brand").innerHTML = `${BADGE}<span><b>${esc(a.toUpperCase())}</b><i>${esc(m.brandSub || m.org || "")}</i></span>`;
  $("#nav").innerHTML = navHTML();
  const light = document.documentElement.dataset.theme === "light";
  $("#hact").innerHTML = `<button id="b-search" class="pill" title="Поиск (Ctrl+K)" aria-label="Поиск">${IC.search}<span>Поиск</span><kbd>Ctrl K</kbd></button><button id="b-theme" class="ic" title="${light ? "Тёмная тема" : "Светлая тема"}" aria-label="Сменить тему">${light ? IC.moon : IC.sun}</button><button id="b-menu" class="ic" title="Меню" aria-label="Меню" aria-expanded="false">${IC.menu}</button>`;
  $("#b-search").onclick = sOpen;
  $("#b-theme").onclick = () => { theme(light ? "dark" : "light"); chrome(); };
  $("#b-menu").onclick = (e) => { const o = $("#nav").classList.toggle("open"); e.currentTarget.setAttribute("aria-expanded", o); };
  const cols = footCols();
  $("#ftr").innerHTML = uiProcess(`<div class="wrap"><div class="fi" style="--fc:${Math.max(1, cols.length)}"><div><div class="brand" style="margin-bottom:12px">${BADGE}<span><b>${esc(a.toUpperCase())}</b><i>${esc(m.brandSub || "")}</i></span></div><p style="margin:0">${E(m.org)}<br>${E(m.address)}</p></div>
    ${cols.map((c) => `<div>${c.t ? `<h4>${H(esc(c.t))}</h4>` : ""}${H(c.links.map(footLink).join(""))}</div>`).join("")}</div>
    <div class="copy">© ${new Date().getFullYear()} ${E(m.name)} · ${E(m.org)} · Игровой проект, все события вымышлены</div></div>`);
  setActive();
}
$("#nav").addEventListener("click", (e) => {
  const g = e.target.closest(".ng > button");
  if (g) { const open = !g.parentElement.classList.contains("open"); $$("#nav .ng.open").forEach((x) => { x.classList.remove("open"); $("button", x).setAttribute("aria-expanded", "false"); }); if (open) { g.parentElement.classList.add("open"); g.setAttribute("aria-expanded", "true"); } return; }
  if (e.target.closest("a")) { $$("#nav .ng.open").forEach((x) => x.classList.remove("open")); $("#nav").classList.remove("open"); }
});
document.addEventListener("click", (e) => { if (!e.target.closest("#nav,#b-menu")) { $$("#nav .ng.open").forEach((x) => x.classList.remove("open")); if (!e.target.closest("#hdr")) $("#nav").classList.remove("open"); } });
function ownerBar() {
  const on = OWN && !VIEW();
  document.body.classList.toggle("own", on);
  if (!on) return;
  $("#ownbar").innerHTML = `<b>Режим владельца</b><button id="b-edit">Режим правки: выкл</button><button id="b-set" class="ed">Настройки сайта</button><button id="b-nav" class="ed">Меню</button><button id="b-foot" class="ed">Подвал</button><span class="sp"></span><button id="b-media">Медиа</button><button id="b-pub" class="pri">Опубликовать</button><button id="b-data">Данные</button>`;
  $("#b-edit").onclick = (e) => { const v = document.body.classList.toggle("editing"); e.currentTarget.classList.toggle("on", v); e.currentTarget.textContent = "Режим правки: " + (v ? "вкл" : "выкл"); };
  $("#b-set").onclick = () => openEd("meta");
  $("#b-nav").onclick = () => openEd("nav");
  $("#b-foot").onclick = () => openEd("footer");
  $("#b-media").onclick = () => mlOpen(null);
  $("#b-pub").onclick = pbOpen;
  $("#b-data").onclick = dataOpen;
  if (GH.token) pbSync().catch(() => {});
}
document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-ed],[data-add],[data-mv],[data-mvs],[data-rank]");
  if (!t) return;
  if (t.dataset.rank !== undefined) { const was = t.classList.contains("open"); $$(".rank.open").forEach((r) => r.classList.remove("open")); if (!was) t.classList.add("open"); return; }
  e.preventDefault(); e.stopPropagation();
  if (t.dataset.ed) { const [c, id] = t.dataset.ed.split(":"); SCHEMA[c] && SCHEMA[c].single ? openEd(c) : openEd(c, id); }
  else if (t.dataset.add) { const c = t.dataset.add; if (c === "press") { openEd("docs", "new"); ED.pressNew = true; const s = $('#edb [data-f="type"]'); if (s) s.value = "press"; } else openEd(c, "new"); }
  else if (t.dataset.mv) { const [c, id, d] = t.dataset.mv.split(":"); mvItem(c, id, +d); }
  else if (t.dataset.mvs) { const [id, d] = t.dataset.mvs.split(":"), ids = staffOrder().map((u) => u.id), i = ids.indexOf(id), j = i + +d; if (i < 0 || j < 0 || j >= ids.length) return; [ids[i], ids[j]] = [ids[j], ids[i]]; S.meta.staffOrder = ids; save(); keepScroll(render); }
}, true);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { if ($("#shot")) { shotClose(); e.stopPropagation(); return; } for (const id of ["txov", "mlov", "edov", "pbov", "dtov", "srov"]) { const o = $("#" + id); if (o && o.classList.contains("open")) { ovClose(id); e.stopPropagation(); return; } } $("#nav").classList.remove("open"); $$("#nav .ng.open").forEach((x) => x.classList.remove("open")); }
  else if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") || (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !document.activeElement.isContentEditable)) { e.preventDefault(); sOpen(); }
  else if (e.key === "Enter" && e.target.dataset && e.target.dataset.rank !== undefined) { const was = e.target.classList.contains("open"); $$(".rank.open").forEach((r) => r.classList.remove("open")); if (!was) e.target.classList.add("open"); }
});
/* ===== липкие элементы =====
   --hh = реальная высота шапки (у владельца к ней добавляется панель владельца, раньше было фиксированное 100px,
   из-за чего кнопки и боковые колонки уезжали под шапку).
   Если липкий блок выше экрана, его верх сдвигается так, чтобы до низа блока можно было долистать. */
const STK = ".aside,.fg .col2 .stk,.post.compose";
let stkRO;
function stickyFit() {
  const hh = $("#hdr").offsetHeight, vh = innerHeight;
  const vis = document.documentElement.classList.contains("hdr-off") ? 0 : hh; /* сколько шапки сейчас видно: липкие блоки поднимаются вместе с ней */
  document.documentElement.style.setProperty("--hh", hh + "px");
  $$(STK).forEach((e) => { e.style.top = ""; if (getComputedStyle(e).position !== "sticky") return; const g = e.classList.contains("compose") ? 10 : 14; e.style.top = Math.min(vis + g, vh - e.offsetHeight - g) + "px"; });
}
function stickyWatch() {
  stickyFit();
  if (!window.ResizeObserver) return;
  if (!stkRO) { stkRO = new ResizeObserver(stickyFit); stkRO.observe($("#hdr")); }
  $$(STK).forEach((e) => stkRO.observe(e));
}
addEventListener("resize", stickyFit);
/* ===== шапка: уезжает вверх при прокрутке вниз и возвращается при прокрутке вверх =====
   Класс hdr-off на <html> двигает шапку (стили в style.css). Не прячем: у самого верха, при открытом меню или окне,
   в режиме правки у владельца и при навигации с клавиатуры. Пока шапка спрятана, по верхнему краю бежит полоска прогресса чтения. */
(function headerAutoHide() {
  const root = document.documentElement;
  let last = scrollY, run = 0, off = false, queued = false;
  const set = (v) => { if (v === off) return; off = v; root.classList.toggle("hdr-off", v); stickyFit(); };
  const hold = () => {
    const h = $("#hdr"), a = document.activeElement;
    return !h || $("#nav").classList.contains("open") || !!document.querySelector(".ov.open") ||
      document.body.classList.contains("editing") || (a && h.contains(a) && a.matches(":focus-visible"));
  };
  function step() {
    queued = false;
    const y = Math.max(0, scrollY), d = y - last, max = root.scrollHeight - innerHeight;
    last = y;
    root.style.setProperty("--rp", max > 0 ? Math.min(1, y / max).toFixed(4) : "0");
    if (y < 120 || hold()) { run = 0; set(false); return; }   /* у верха и при удержании шапка на месте */
    if (d === 0) return;
    if ((d > 0) !== (run > 0)) run = 0;                       /* сменилось направление: считаем заново */
    run += d;
    if (run > 24) set(true);                                  /* ушли вниз заметно: прячем */
    else if (run < -10) set(false);                           /* чуть потянули вверх: возвращаем */
  }
  addEventListener("scroll", () => { if (!queued) { queued = true; requestAnimationFrame(step); } }, { passive: true });
  document.addEventListener("focusin", (e) => { if (e.target.closest && e.target.closest("#hdr") && e.target.matches(":focus-visible")) set(false); });
})();
(async function init() {
  theme();
  try { await ownerCheck(); } catch (e) {}
  try { await loadData(); } catch (e) { $("#app").innerHTML = `<section class="sec"><div class="wrap"><h2>Не удалось загрузить данные</h2><p class="lead">${esc(e.message)}</p></div></section>`; return; }
  chrome(); ownerBar(); stickyFit();
  addEventListener("hashchange", () => { ROOM_I = 0; render(); });
  const sk = $(".skip"); if (sk) sk.addEventListener("click", (e) => { e.preventDefault(); $("#app").focus(); });
  render(); stickyWatch();
})();
