/* ===== publish data.json to GitHub, history, export/import ===== */
const PUB = { sha: "", hash: "", remote: null, txt: "", busy: 0, t: 0 };
const pbH = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36) + "." + s.length; };
const pbN = (o) => JSON.stringify(o);
const pbErr = (r, j) => new Error(r.status === 401 ? "токен недействителен или истёк" : r.status === 403 ? "нет прав у токена или лимит запросов GitHub" : r.status === 404 ? "data.json или репозиторий не найдены (проверьте ветку и права токена)" : r.status === 409 || r.status === 422 ? "данные на GitHub изменились — откройте окно заново" : (j && j.message) || "ошибка " + r.status);
const pbUrl = (ref) => `https://api.github.com/repos/${GH.repo}/contents/data.json?ref=${ref || GH.branch}`;
async function pbMeta(ref) { const r = await fetch(pbUrl(ref), { headers: ghH() }), j = await r.json().catch(() => ({})); if (!r.ok) throw pbErr(r, j); return j; }
async function pbRaw(ref) { const r = await fetch(pbUrl(ref), { headers: { ...ghH(), Accept: "application/vnd.github.raw+json" } }); if (!r.ok) throw pbErr(r); return r.text(); }
async function pbSync() { const m = await pbMeta(), t = await pbRaw(); PUB.sha = m.sha; PUB.txt = t; PUB.remote = JSON.parse(t); PUB.hash = pbH(pbN(PUB.remote)); pbInd(); }
const pbDirty = () => !!PUB.hash && pbH(pbN(S)) !== PUB.hash;
function pbInd() { const b = $("#b-pub"); if (b) b.classList.toggle("dirty", pbDirty()); }
function pbSoon() { clearTimeout(PUB.t); PUB.t = setTimeout(pbInd, 600); }
function pbDiff(a, b) {
  const rows = []; let lost = 0;
  const nm = { people: (x) => x.name + " — " + x.title, units: (x) => x.name, ranks: (x) => x.name, timeline: (x) => x.title, rooms: (x) => x.title, zones: (x) => x.name, pois: (x) => x.name, docs: (x) => x.num + " " + x.title, forms: (x) => x.title, events: (x) => x.title };
  const L = { people: "Люди", units: "Подразделения", ranks: "Звания", timeline: "История", rooms: "Помещения", zones: "Зоны", pois: "Объекты карты", docs: "Документы", forms: "Формуляры", events: "События" };
  Object.keys(nm).forEach((k) => {
    const A = new Map((a[k] || []).map((x) => [x.id, x])), B = new Map((b[k] || []).map((x) => [x.id, x])), add = [], del = [], chg = [];
    B.forEach((v, id) => { if (!A.has(id)) add.push(v); else if (pbN(A.get(id)) !== pbN(v)) chg.push(v); }); A.forEach((v, id) => { if (!B.has(id)) del.push(v); });
    const names = (l) => l.slice(0, 5).map((x) => esc(nm[k](x) || "—")).join(", ") + (l.length > 5 ? " …" : "");
    if (add.length) rows.push({ c: "var(--green)", t: L[k] + ": добавлено " + add.length, s: names(add) });
    if (chg.length) rows.push({ c: "var(--brass)", t: L[k] + ": изменено " + chg.length, s: names(chg) });
    if (del.length) { lost += del.length; rows.push({ c: "var(--red)", t: L[k] + ": удалено " + del.length, s: names(del) }); }
  });
  Object.keys({ ...a, ...b }).filter((k) => !nm[k] && pbN(a[k]) !== pbN(b[k])).forEach((k) => rows.push({ c: "var(--brass)", t: ({ meta: "Настройки сайта и главная", vacancies: "Кадровый смотр", map: "Карта зон: контуры и фон", footer: "Ссылки подвала", dept: "Структура департамента", deptText: "Текст о департаменте", careerIntro: "Тексты карьеры", specs: "Тексты карьеры", steps: "Путь поступления" })[k] || "Поле «" + k + "»", s: "изменено" }));
  return { rows, lost };
}
const pbClose = () => ovClose("pbov");
async function pbOpen() {
  const o = ovOpen("pbov", `<div class="md"><div class="mh"><h3>Публикация <small class="note">${esc(GH.repo)} · ${esc(GH.branch)}</small></h3><button data-pb="hist">История</button><button data-pb="x" aria-label="Закрыть">✕</button></div><div class="mb" id="pbb"></div></div>`);
  o.onclick = (e) => { if (e.target === o) { pbClose(); return; } const b = e.target.closest("[data-pb]"); if (!b) return; const a = b.dataset.pb; if (a === "x") pbClose(); else if (a === "go") pbGo(); else if (a === "hist") pbHist(); else if (a === "back") pbOpen(); else if (a === "rev") pbRev(b.dataset.sha); else if (a === "cfg") { pbClose(); mlOpen(null); mlCfg(); } };
  const B = $("#pbb");
  if (!GH.token) { B.innerHTML = `<p class="note"><b>Нужен токен GitHub</b> с правом Contents: Read and write (тот же, что для медиатеки).</p><p><button class="pri" data-pb="cfg">Подключить</button></p>`; return; }
  B.innerHTML = '<p class="note">Сравниваю с GitHub…</p>';
  try { await pbSync(); } catch (e) { B.innerHTML = `<p class="note">Не удалось связаться с GitHub: ${esc(e.message)}</p>`; return; }
  const d = pbDiff(PUB.remote, S);
  if (!d.rows.length) { B.innerHTML = `<p class="note"><b>Изменений нет</b> — сайт актуален ✓</p>`; return; }
  B.innerHTML = `${d.lost ? `<div class="pb-r" style="--c:var(--red)">⚠ На GitHub есть то, чего нет у вас (${d.lost}). Если вы редактировали с другого устройства, при публикации это пропадёт.</div>` : ""}${d.rows.map((r) => `<div class="pb-r" style="--c:${r.c}"><b>${r.t}</b>${r.s ? `<small>${r.s}</small>` : ""}</div>`).join("")}<div class="fld" style="margin-top:14px"><label>Описание изменений</label><input id="pb-m" value="Update data.json"></div><p><button class="pri" data-pb="go">Опубликовать</button></p>`;
}
async function pbGo() {
  if (PUB.busy) return; PUB.busy = 1; const btn = $('[data-pb="go"]'); btn.disabled = true; btn.textContent = "Публикую…";
  try {
    const m = /^\{\r?\n(\t| +)"/.exec(PUB.txt), ind = m ? m[1] : 2, text = JSON.stringify(S, null, ind) + "\n";
    const r = await fetch(`https://api.github.com/repos/${GH.repo}/contents/data.json`, { method: "PUT", headers: ghH(), body: JSON.stringify({ message: ($("#pb-m").value || "").trim() || "Update data.json", content: await b64Of(new Blob([text], { type: "application/json" })), sha: PUB.sha, branch: GH.branch }) });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw pbErr(r, j);
    PUB.sha = j.content.sha; PUB.txt = text; PUB.remote = JSON.parse(text); PUB.hash = pbH(pbN(PUB.remote)); pbInd();
    $("#pbb").innerHTML = `<p><b>Опубликовано ✓</b></p><p class="note">GitHub Pages обновит сайт примерно через минуту.${j.commit && j.commit.html_url ? ` <a href="${esc(j.commit.html_url)}" target="_blank" rel="noopener">Посмотреть коммит</a>` : ""}</p>`;
  } catch (e) { toast("Не удалось опубликовать: " + e.message); btn.disabled = false; btn.textContent = "Опубликовать"; } finally { PUB.busy = 0; }
}
async function pbHist() {
  const B = $("#pbb"); B.innerHTML = '<p class="note">Загружаю историю…</p>';
  try {
    const r = await fetch(`https://api.github.com/repos/${GH.repo}/commits?path=data.json&sha=${GH.branch}&per_page=10`, { headers: ghH() }); if (!r.ok) throw pbErr(r);
    const L = await r.json();
    B.innerHTML = `<p class="note">Версию можно загрузить в редактор. На сайте она появится, только если вы потом нажмёте «Опубликовать».</p>${L.map((c) => `<div class="pb-r"><b>${esc(new Date(c.commit.author.date).toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" }))}</b><small>${esc((c.commit.message || "").split("\n")[0])}</small><button data-pb="rev" data-sha="${c.sha}" style="margin-left:auto">Загрузить</button></div>`).join("")}<p><button data-pb="back">← Назад</button></p>`;
  } catch (e) { B.innerHTML = `<p class="note">Не удалось получить историю: ${esc(e.message)}</p>`; }
}
async function pbRev(sha) {
  if (!confirm("Заменить ваши текущие данные в редакторе этой версией?\nСайт не изменится, пока вы не нажмёте «Опубликовать».")) return;
  try { const obj = JSON.parse(await pbRaw(sha)); LS.set(KEY, JSON.stringify(obj)); location.reload(); } catch (e) { toast("Не удалось загрузить версию: " + e.message); }
}
/* export / import */
function dataOpen() {
  const o = ovOpen("dtov", `<div class="md wide"><div class="mh"><h3>Данные сайта (JSON)</h3><button data-d="x" aria-label="Закрыть">✕</button></div><div class="mb"><p class="note">Резервная копия всех данных. Вставьте JSON и нажмите «Загрузить», чтобы заменить текущие данные в редакторе.</p><textarea id="dt" style="min-height:320px;font:12px var(--ff-m)">${esc(JSON.stringify(S, null, 2))}</textarea></div><div class="mf"><button data-d="cp">Скопировать</button><button data-d="dl">Скачать файл</button><span class="sp"></span><button class="dng" data-d="ld">Загрузить из поля</button></div></div>`);
  o.onclick = (e) => { if (e.target === o) { ovClose("dtov"); return; } const b = e.target.closest("[data-d]"); if (!b) return; const a = b.dataset.d;
    if (a === "x") ovClose("dtov"); else if (a === "cp") { try { navigator.clipboard.writeText($("#dt").value); toast("Скопировано"); } catch (x) {} }
    else if (a === "dl") { const l = document.createElement("a"); l.href = URL.createObjectURL(new Blob([$("#dt").value], { type: "application/json" })); l.download = "data.json"; l.click(); }
    else if (a === "ld") arm(b, () => { try { S = JSON.parse($("#dt").value); LS.set(KEY, JSON.stringify(S)); location.reload(); } catch (x) { toast("Ошибка JSON: " + x.message); } }); };
}
