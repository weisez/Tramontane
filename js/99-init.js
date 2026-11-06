/* ===== init ===== */
const NAV = [["home", "", "Главная"], ["about", "about", "О станции"], ["units", "units", "Подразделения"], ["staff", "staff", "Состав"], ["career", "career", "Карьера"], ["docs", "docs", "Документы"], ["press", "press", "Пресс-центр"], ["forms", "forms", "Формуляры"], ["board", "board", "Доска"]];
function chrome() {
  const m = S.meta;
  $("#nav").innerHTML = NAV.map((n) => `<a href="#/${n[1]}" data-n="${n[0]}">${n[2]}</a>`).join("");
  $("#ftr").innerHTML = `<div class="wrap"><div class="fi"><div><div class="brand" style="margin-bottom:12px">${BADGE}<span><b>TRAMONTANE</b><i>Central Station</i></span></div><p style="margin:0">${esc(m.org)}<br>${esc(m.address)}</p></div>
  <div><h4>Разделы</h4>${NAV.slice(1, 5).map((n) => `<a href="#/${n[1]}">${n[2]}</a>`).join("")}</div><div><h4>Документы</h4>${NAV.slice(5).map((n) => `<a href="#/${n[1]}">${n[2]}</a>`).join("")}</div></div>
  <div class="copy">© ${new Date().getFullYear()} ${esc(m.name)} · ${esc(m.org)} · Игровой проект, все события вымышлены</div></div>`;
  $(".brand", $("#hdr")).innerHTML = `${BADGE}<span><b>TRAMONTANE</b><i>Central Station · SFPD 2nd Area Command</i></span>`;
}
function ownerBar() {
  const on = OWN && !VIEW();
  document.body.classList.toggle("own", on);
  if (!on) return;
  $("#ownbar").innerHTML = `<b>Режим владельца</b><button id="b-edit">Режим правки: выкл</button><button id="b-set" class="ed">Настройки сайта</button><span class="sp"></span><button id="b-media">Медиа</button><button id="b-pub" class="pri">Опубликовать</button><button id="b-data">Данные</button>`;
  $("#b-edit").onclick = (e) => { const v = document.body.classList.toggle("editing"); e.currentTarget.classList.toggle("on", v); e.currentTarget.textContent = "Режим правки: " + (v ? "вкл" : "выкл"); };
  $("#b-set").onclick = () => openEd("meta");
  $("#b-media").onclick = () => mlOpen(null);
  $("#b-pub").onclick = pbOpen;
  $("#b-data").onclick = dataOpen;
  if (GH.token) pbSync().catch(() => {});
}
document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-ed],[data-add],[data-mv],[data-rank]");
  if (!t) return;
  if (t.dataset.rank !== undefined) { t.classList.toggle("open"); return; }
  e.preventDefault(); e.stopPropagation();
  if (t.dataset.ed) { const [c, id] = t.dataset.ed.split(":"); SCHEMA[c] && SCHEMA[c].single ? openEd(c) : openEd(c, id); }
  else if (t.dataset.add) { const c = t.dataset.add; if (c === "press") { openEd("docs", "new"); ED.pressNew = true; const s = $('#edb [data-f="type"]'); if (s) s.value = "press"; } else openEd(c, "new"); }
  else if (t.dataset.mv) { const [c, id, d] = t.dataset.mv.split(":"); mvItem(c, id, +d); }
}, true);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { for (const id of ["mlov", "edov", "pbov", "dtov", "srov"]) { const o = $("#" + id); if (o && o.classList.contains("open")) { ovClose(id); e.stopPropagation(); return; } } $("#nav").classList.remove("open"); }
  else if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") || (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !document.activeElement.isContentEditable)) { e.preventDefault(); sOpen(); }
  else if (e.key === "Enter" && e.target.dataset && e.target.dataset.rank !== undefined) e.target.classList.toggle("open");
});
(async function init() {
  theme();
  $("#b-search").onclick = sOpen;
  $("#b-theme").onclick = () => theme(document.documentElement.dataset.theme === "light" ? "dark" : "light");
  $("#b-menu").onclick = () => $("#nav").classList.toggle("open");
  try { await ownerCheck(); } catch (e) {}
  try { await loadData(); } catch (e) { $("#app").innerHTML = `<section class="sec"><div class="wrap"><h2>Не удалось загрузить данные</h2><p class="lead">${esc(e.message)}</p></div></section>`; return; }
  chrome(); ownerBar();
  addEventListener("hashchange", render);
  render();
})();
