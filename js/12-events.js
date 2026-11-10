/* ===== «События»: слайдер анонсов на главной, страница события, список и архив =====
   Данные: S.events (data.json). Публикуются обычной кнопкой «Опубликовать», как документы.
   Поля события: id, title, tag, date (дд.мм.гггг), time, place, summary, banner (+bannerPos), body (HTML),
   link + linkLabel (кнопка на странице события), until (дд.мм.гггг), draft.
   Событие показывается на слайдере, пока не прошла дата «until» (если её нет — дата события; если нет и её — без ограничения). */
const evKey = () => today().replace(/-/g, "");
const evEnd = (e) => { const v = String(e.until || e.date || "").trim(); return /^\d{2}\.\d{2}\.\d{4}$/.test(v) ? dkey(v) : ""; };
const evOver = (e) => { const k = evEnd(e); return !!k && k < evKey(); };
const evLive = (e) => !e.draft && !evOver(e);
const evById = (id) => (S.events || []).find((e) => e.id === id);
const evOwn = () => OWN && !VIEW();
const evWhen = (e) => [e.date, e.time].filter(Boolean).join(", ");
const evMeta = (e) => { const a = [evWhen(e), e.place].filter(Boolean); return a.length ? `<div class="evs-meta">${a.map((x) => `<span>${E(x)}</span>`).join("")}</div>` : ""; };
const evHref = (u) => (okHref(u) ? u : "#/");

/* ---------- слайдер на главной ---------- */
const evSlide = (e, i, n) => `<article class="evs-s${i ? "" : " on"}" role="group" aria-roledescription="slide" aria-label="${i + 1} / ${n}"${i ? " inert" : ""}>
  <div class="evs-img">${e.banner ? fimg(e.banner, cropOf(e, "banner"), "", i === 0) : `<div class="evs-ph">${BADGE}</div>`}</div>
  <div class="evs-cap">
    ${e.tag ? `<span class="evs-tag">${E(e.tag)}</span>` : ""}
    <h3>${E(e.title)}</h3>
    ${evMeta(e)}
    ${e.summary ? `<p>${E(e.summary)}</p>` : ""}
    <a class="btn" href="#/event/${e.id}">Подробнее</a>
  </div>
  ${eb("events", e.id)}${mvb("events", e.id)}
</article>`;

const ICN = {
  prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
  pause: '<svg class="i-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>',
  play: '<svg class="i-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z"/></svg>',
};

function evsHome() {
  const L = (S.events || []).filter(evLive).slice(0, 8), n = L.length;
  if (!n) return evOwn() ? `<div class="wrap evs-add">${addb("events", "Событие на главной")}</div>` : "";
  return `<section class="sec evs-sec"><div class="wrap">
    <div class="evs-hd reveal"><div><div class="eb">Афиша станции</div><h2>События и анонсы</h2></div><a class="btn ghost" href="#/events">Все события</a></div>
    <div class="evs" id="evs" role="region" aria-roledescription="carousel" aria-label="События станции">
      <div class="evs-stage">
        ${L.map((e, i) => evSlide(e, i, n)).join("")}
        ${n > 1 ? `<div class="evs-ctl"><button type="button" data-nav="-1" aria-label="Предыдущее событие">${ICN.prev}</button><button type="button" class="evs-pp" aria-label="Остановить автопрокрутку">${ICN.pause}${ICN.play}</button><button type="button" data-nav="1" aria-label="Следующее событие">${ICN.next}</button></div>` : ""}
      </div>
      ${n > 1 ? `<div class="evs-rail">${L.map((e, i) => `<button type="button" class="evs-t${i ? "" : " on"}" data-go="${i}" data-n="${i + 1}" aria-label="${esc(e.title)}" aria-current="${i ? "false" : "true"}"><i class="evs-pg"><u></u></i><span class="evs-td">${E(e.date || e.tag || "")}</span><b>${E(e.title)}</b></button>`).join("")}</div>` : ""}
    </div>
    ${addb("events", "Событие")}
  </div></section>`;
}

let EVS = { raf: 0, io: null };
function evsInit(app) {
  cancelAnimationFrame(EVS.raf); if (EVS.io) { EVS.io.disconnect(); EVS.io = null; }
  const root = $("#evs", app); if (!root) return;
  const slides = $$(".evs-s", root), tabs = $$(".evs-t", root), n = slides.length;
  const stage = $(".evs-stage", root), pp = $(".evs-pp", root);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches, DUR = 7000;
  let cur = 0, acc = 0, last = 0, paused = reduce, hover = false, focus = false, vis = true;
  const fill = (i, v) => { const u = tabs[i] && $("u", tabs[i]); if (u) u.style.transform = `scaleX(${v})`; };
  const live = () => stage.setAttribute("aria-live", paused ? "polite" : "off");
  const go = (i) => {
    if (n < 2) return;
    cur = (i + n) % n; acc = 0;
    slides.forEach((s, k) => { const on = k === cur; s.classList.toggle("on", on); if (on) s.removeAttribute("inert"); else s.setAttribute("inert", ""); });
    tabs.forEach((t, k) => { const on = k === cur; t.classList.toggle("on", on); t.setAttribute("aria-current", on ? "true" : "false"); fill(k, on && reduce ? 1 : 0); });
  };
  const sync = () => { root.classList.toggle("paused", paused); if (pp) pp.setAttribute("aria-label", paused ? "Включить автопрокрутку" : "Остановить автопрокрутку"); live(); };
  if (n > 1) {
    root.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b || !root.contains(b)) return;
      if (b.dataset.nav) go(cur + +b.dataset.nav);
      else if (b.dataset.go != null) go(+b.dataset.go);
      else if (b === pp) { paused = !paused; sync(); }
    });
    root.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); go(cur - 1); } else if (e.key === "ArrowRight") { e.preventDefault(); go(cur + 1); }
    });
    if (matchMedia("(hover:hover)").matches) { root.addEventListener("pointerenter", () => { hover = true; }); root.addEventListener("pointerleave", () => { hover = false; }); }
    const fc = () => { focus = !!root.querySelector(":focus-visible"); };
    root.addEventListener("focusin", fc); root.addEventListener("focusout", () => setTimeout(fc, 0));
    /* свайп на телефоне */
    let sx = 0, sy = 0, sid = null;
    stage.addEventListener("pointerdown", (e) => { if (e.pointerType === "mouse") return; sx = e.clientX; sy = e.clientY; sid = e.pointerId; });
    stage.addEventListener("pointerup", (e) => { if (sid !== e.pointerId) return; sid = null; const dx = e.clientX - sx, dy = e.clientY - sy; if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) go(cur + (dx < 0 ? 1 : -1)); });
    stage.addEventListener("pointercancel", () => { sid = null; });
    if (window.IntersectionObserver) { EVS.io = new IntersectionObserver((es) => { vis = es[0].isIntersecting; }, { threshold: 0.25 }); EVS.io.observe(root); }
    fill(0, reduce ? 1 : 0);
    const tick = (ts) => {
      if (!root.isConnected) return;
      const dt = last ? Math.min(ts - last, 200) : 0; last = ts;
      if (!paused && !hover && !focus && vis && !document.hidden && !evOwnEditing()) { acc += dt; fill(cur, Math.min(1, acc / DUR)); if (acc >= DUR) go(cur + 1); }
      EVS.raf = requestAnimationFrame(tick);
    };
    EVS.raf = requestAnimationFrame(tick);
  }
  sync();
}
/* пока владелец правит страницу, слайды не листаются сами */
const evOwnEditing = () => document.body.classList.contains("editing");

/* ---------- страница события ---------- */
route("event/:id", (id) => {
  const e = evById(id);
  if (!e || (e.draft && !evOwn())) return { html: notFound() };
  const over = evOver(e), rows = [["Дата", e.date], ["Время", e.time], ["Место", e.place]].filter((r) => r[1]);
  return { title: e.title, html: `${phead(E(e.tag || "Событие"), E(e.title), E(e.summary || ""), "", `<a href="#/">Главная</a> / <a href="#/events">События</a>`)}
  <section class="sec"><div class="wrap two"><div>
    ${e.draft ? `<p><span class="chip warn">Черновик: виден только вам</span></p>` : ""}
    ${e.banner ? `<figure class="evp reveal"><img src="${E(e.banner)}" alt="${E(e.title)}"></figure>` : ""}
    <div class="prose reveal">${H(e.body)}</div>
  </div><div class="aside">
    <div class="box reveal"><h4>Подробности</h4>
      ${rows.length ? `<dl class="evi">${rows.map((r) => `<div><dt>${r[0]}</dt><dd>${E(r[1])}</dd></div>`).join("")}</dl>` : `<p class="note" style="margin:0">Время и место уточняются.</p>`}
      ${evEnd(e) ? `<p style="margin:14px 0 0"><span class="chip ${over ? "" : "ok"}">${over ? "Завершено" : "Предстоит"}</span></p>` : ""}
    </div>
    ${e.link ? `<a class="btn" href="${esc(evHref(e.link))}"${/^https?:/i.test(e.link) ? ' target="_blank" rel="noopener noreferrer"' : ""}>${E(e.linkLabel || "Перейти")}</a>` : ""}
    <a class="btn ghost" href="#/events">Все события</a>
    <button class="ed addb" data-ed="events:${e.id}">✎ Править событие</button>
  </div></div></section>` };
}, "events");

/* ---------- список событий и архив ---------- */
const evCard = (e) => `<a class="card evc reveal${evOver(e) ? " past" : ""}" href="#/event/${e.id}"><div class="cimgw"><div class="cimg">${e.banner ? fimg(e.banner, cropOf(e, "banner"), "") : `<div class="evs-ph">${BADGE}</div>`}</div></div><div class="pad">
  <div class="evc-top">${e.tag ? `<span class="chip">${E(e.tag)}</span>` : ""}${e.draft ? `<span class="chip warn">Черновик</span>` : ""}<span class="sub">${E(evWhen(e))}</span></div>
  <h3>${E(e.title)}</h3>${e.summary ? `<p>${E(e.summary)}</p>` : ""}</div>${eb("events", e.id)}${mvb("events", e.id)}</a>`;

route("events", () => {
  const all = (S.events || []).filter((e) => evOwn() || !e.draft), up = all.filter((e) => !evOver(e)), old = all.filter(evOver);
  return { title: "События", html: `${phead("Афиша станции", "События и анонсы", "Мероприятия, собрания и учения центральной станции Трамонтана. Нажмите на событие, чтобы прочитать подробности.", S.meta.hero, null, cropOf(S.meta, "hero"))}
  <section class="sec"><div class="wrap">${sech("Ближайшие", "Предстоящие события")}
    ${up.length ? `<div class="grid g3">${up.map(evCard).join("")}</div>` : `<p class="note">Сейчас ничего не запланировано. Новые анонсы появятся здесь и на главной странице.</p>`}
    ${addb("events", "Событие")}</div></section>
  ${old.length ? `<section class="sec alt"><div class="wrap">${sech("Архив", "Прошедшие события")}<div class="grid g3">${old.map(evCard).join("")}</div></div></section>` : ""}` };
}, "events");
