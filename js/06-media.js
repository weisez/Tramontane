/* ===== media library: images live in the img/ folder of the repo ===== */
const GH = Object.assign({ repo: CFG.repo, branch: CFG.branch, dir: CFG.dir, token: "" }, (() => { try { return JSON.parse(LS.get("tcs-gh", "{}")); } catch (e) { return {}; } })());
const ghSave = () => LS.set("tcs-gh", JSON.stringify({ repo: GH.repo, branch: GH.branch, token: GH.token }));
const ghH = () => ({ Accept: "application/vnd.github+json", ...(GH.token ? { Authorization: "Bearer " + GH.token } : {}) });
const TRm = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ы: "y", э: "e", ю: "yu", я: "ya" };
const slug = (t) => String(t || "").toLowerCase().replace(/[а-яё]/g, (c) => TRm[c] || "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "img";
const b64Of = (b) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result.split(",")[1]); r.onerror = rej; r.readAsDataURL(b); });
const dataOf = (b) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(b); });
addEventListener("error", (e) => { const i = e.target; if (i && i.tagName === "IMG") { const u = i.getAttribute("src") || ""; if (/^img\//.test(u) && !i.dataset.rf) { i.dataset.rf = 1; i.style.display = ""; i.src = `https://raw.githubusercontent.com/${GH.repo}/${GH.branch}/${u}`; } } }, true);
async function imgPrep(f, max, q) {
  const base = slug(f.name.replace(/\.[^.]+$/, "")), id = Math.random().toString(36).slice(2, 6);
  if (/gif|svg/.test(f.type)) return { blob: f, name: `${base}-${id}.${f.type.includes("gif") ? "gif" : "svg"}` };
  const u = URL.createObjectURL(f), im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("не удалось прочитать картинку")); i.src = u; });
  const k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement("canvas"); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u);
  let b = await new Promise((r) => c.toBlob(r, "image/webp", q)), ext = "webp"; if (!b || b.type !== "image/webp") { b = await new Promise((r) => c.toBlob(r, "image/jpeg", q)); ext = "jpg"; }
  return { blob: b, name: `${base}-${id}.${ext}` };
}
const ML = { items: [], fresh: [], pick: null };
async function ghUpload(o) {
  const path = GH.dir + "/" + o.name, r = await fetch(`https://api.github.com/repos/${GH.repo}/contents/${path}`, { method: "PUT", headers: ghH(), body: JSON.stringify({ message: "Add " + path, content: await b64Of(o.blob), branch: GH.branch }) });
  if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(r.status === 401 ? "токен недействителен" : r.status === 404 ? "репозиторий или ветка не найдены, либо у токена нет прав на запись" : (j.message || r.status)); }
  const j = await r.json(); ML.fresh.unshift({ name: o.name, url: j.content.download_url }); return path;
}
let embedWarned = 0;
async function imgIn(f, max, cb, q) {
  try {
    const o = await imgPrep(f, max, q || 0.85);
    if (GH.token) { toast("Загружаю " + o.name + "…"); const p = await ghUpload(o); cb(p); toast("Готово: " + p + " · на сайте появится примерно через минуту"); }
    else { cb(await dataOf(o.blob)); if (!embedWarned) { embedWarned = 1; toast("Картинка встроена в данные. Чтобы хранить файлы в репозитории, подключите медиатеку: «Медиа» → ⚙"); } }
  } catch (e) { toast("Не удалось загрузить: " + e.message); }
}
function mlShell() {
  return ovOpen("mlov", `<div class="md wide"><div class="mh"><h3>Медиатека <small class="note" id="ml-sub"></small></h3><label class="btn ghost" style="padding:6px 12px;font-size:12px">+ Загрузить<input type="file" id="ml-f" accept="image/*" multiple hidden></label><button data-ml="cfg" title="Подключение к GitHub">⚙</button><button data-ml="x" aria-label="Закрыть">✕</button></div><div class="mb" id="mlb"></div><div class="mf"><span class="note" id="mlf"></span></div></div>`);
}
function mlOpen(pick) {
  ML.pick = pick || null; const o = mlShell(); $("#ml-sub").textContent = pick ? "— выберите картинку" : GH.repo + "/" + GH.dir; $("#mlf").textContent = GH.token ? "токен подключён" : "токен не задан";
  o.onclick = (e) => {
    if (e.target === o) { ovClose("mlov"); return; }
    const b = e.target.closest("button"); if (!b) return; const d = b.dataset;
    if (d.ml === "x") ovClose("mlov"); else if (d.ml === "cfg") mlCfg(); else if (d.ml === "back") mlLoad();
    else if (d.mp) { if (ML.pick) { const f = ML.pick; ovClose("mlov"); f(d.mp); } else { try { navigator.clipboard.writeText(d.mp); } catch (x) {} toast("Путь скопирован: " + d.mp); } }
    else if ("mcfg" in d) { if (d.mcfg === "clear") GH.token = ""; else { GH.repo = $("#mc-r").value.trim() || GH.repo; GH.branch = $("#mc-b").value.trim() || "main"; GH.token = $("#mc-t").value.trim(); } ghSave(); toast(GH.token ? "Сохранено" : "Токен удалён"); mlOpen(ML.pick); }
  };
  $("#ml-f").onchange = async (e) => { const fs = [...e.target.files]; if (!GH.token) { toast("Для загрузки нужен токен GitHub — откройте ⚙"); mlCfg(); return; } for (const f of fs) { try { const p = await imgPrep(f, 1600, 0.85); toast("Загружаю " + p.name + "…"); await ghUpload(p); mlGrid(); } catch (x) { toast("Не удалось загрузить: " + x.message); break; } } toast("Загрузка завершена"); };
  mlLoad();
}
async function mlLoad() {
  const B = $("#mlb"); B.innerHTML = '<p class="note">Загружаю список…</p>';
  try {
    const r = await fetch(`https://api.github.com/repos/${GH.repo}/contents/${GH.dir}?ref=${GH.branch}`, { headers: ghH() });
    if (r.status === 404) ML.items = []; else if (!r.ok) throw new Error(r.status === 403 ? "лимит запросов GitHub — подождите или добавьте токен (⚙)" : "ошибка " + r.status);
    else ML.items = (await r.json()).filter((x) => x.type === "file" && /\.(png|jpe?g|webp|gif|svg|avif)$/i.test(x.name)).map((x) => ({ name: x.name, url: x.download_url }));
    mlGrid();
  } catch (e) { B.innerHTML = `<p class="note">Не удалось получить список: ${esc(e.message)}</p>`; }
}
function mlGrid() {
  const seen = new Set(), L = [...ML.fresh, ...ML.items].filter((x) => !seen.has(x.name) && seen.add(x.name));
  $("#mlb").innerHTML = L.length ? `<div class="mg">${L.map((x) => `<button data-mp="${GH.dir}/${esc(x.name)}" title="${esc(x.name)}"><img loading="lazy" src="${esc(x.url)}" alt=""><span>${esc(x.name)}</span></button>`).join("")}</div>` : `<p class="note">В папке ${GH.dir}/ пока пусто. Нажмите «+ Загрузить»${GH.token ? "" : " (нужен токен: ⚙)"}.</p>`;
}
function mlCfg() {
  $("#mlb").innerHTML = `<div style="max-width:520px;margin:0 auto"><div class="fld"><label>Репозиторий</label><input id="mc-r" value="${esc(GH.repo)}"></div><div class="fld"><label>Ветка</label><input id="mc-b" value="${esc(GH.branch)}"></div><div class="fld"><label>Токен (Contents: Read and write)</label><input id="mc-t" type="password" placeholder="github_pat_…" value="${esc(GH.token)}"></div><p><button class="pri" data-mcfg>Сохранить</button> <button data-mcfg="clear">Забыть токен</button> <button data-ml="back">Назад</button></p><ol class="note" style="line-height:1.8;padding-left:18px"><li>GitHub → Settings → Developer settings → Fine-grained tokens → Generate new token.</li><li>Repository access: Only select repositories → Tramontane.</li><li>Permissions → Repository permissions → <b>Contents: Read and write</b>.</li><li>Скопируйте токен и вставьте выше. Он хранится только в этом браузере и нужен для загрузки картинок и публикации.</li></ol></div>`;
}
