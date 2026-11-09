/* ===== search palette (Ctrl+K or /) ===== */
const PAGES = [["", "Главная"], ["about", "О станции"], ["units", "Подразделения"], ["staff", "Личный состав"], ["career", "Карьера"], ["docs", "Документы"], ["press", "Пресс-центр"], ["forms", "Формуляры"], ["board", "Объявления"], ["zones", "Зоны ответственности"]];
function sIndex() {
  const L = PAGES.map((p) => ({ t: "Раздел", n: p[1], s: "", u: "#/" + p[0] }));
  S.docs.forEach((d) => L.push({ t: TYPES[d.type] || "Документ", n: d.title, s: d.num, u: "#/doc/" + d.id }));
  S.forms.forEach((f) => L.push({ t: "Формуляр", n: f.title, s: f.ref, u: "#/form/" + f.id }));
  S.units.forEach((u) => L.push({ t: "Подразделение", n: u.name, s: u.en, u: "#/unit/" + u.id }));
  S.people.filter((p) => p.status !== "vacant").forEach((p) => L.push({ t: "Сотрудник", n: p.name, s: p.title + " " + (p.en || ""), u: "#/staff" }));
  S.ranks.forEach((r) => L.push({ t: "Звание", n: r.name, s: r.group, u: "#/career" }));
  S.rooms.forEach((r) => L.push({ t: "Помещение", n: r.title, s: "", u: "#/about" }));
  return L;
}
function sOpen() {
  const o = ovOpen("srov", `<div class="md" id="sr"><input id="sq" placeholder="Поиск по сайту: документы, люди, звания…" autocomplete="off" aria-label="Поиск"><div class="sr-l" id="sl"></div></div>`);
  const IDX = sIndex(); let cur = 0, res = [];
  const go = (u) => { ovClose("srov"); if (location.hash === u || (u === "#/" && !location.hash.replace("#", "").replace(/^\//, ""))) render(); else location.hash = u; };
  const draw = () => {
    const q = $("#sq").value.toLowerCase().trim().split(/\s+/).filter(Boolean);
    res = IDX.map((x) => { const h = (x.n + " " + x.s).toLowerCase(); let sc = 0; for (const w of q) { if (!h.includes(w)) return null; sc += x.n.toLowerCase().includes(w) ? 2 : 1; } return { x, sc }; }).filter(Boolean).sort((a, b) => b.sc - a.sc).slice(0, 30).map((r) => r.x);
    if (!q.length) res = IDX.filter((x) => x.t === "Раздел").concat(IDX.filter((x) => x.t === "Документ" || x.t === "Приказ" || x.t === "Брифинг").slice(0, 5));
    cur = 0;
    $("#sl").innerHTML = res.map((x, i) => `<a class="sri${i === cur ? " on" : ""}" href="${x.u}"><i>${esc(x.t)}</i><span>${esc(x.n)}${x.s ? `<br><small>${esc(x.s.trim())}</small>` : ""}</span></a>`).join("") || `<p class="note" style="padding:18px">Ничего не найдено.</p>`;
  };
  const mark = () => $$("#sl .sri").forEach((a, i) => { a.classList.toggle("on", i === cur); if (i === cur) a.scrollIntoView({ block: "nearest" }); });
  $("#sq").addEventListener("input", draw);
  $("#sq").addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); cur = Math.min(res.length - 1, cur + 1); mark(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); cur = Math.max(0, cur - 1); mark(); }
    else if (e.key === "Enter" && res[cur]) { go(res[cur].u); }
  });
  o.onclick = (e) => { const a = e.target.closest(".sri"); if (a) { e.preventDefault(); go(a.getAttribute("href")); } else if (e.target === o) ovClose("srov"); };
  draw(); $("#sq").focus();
}
