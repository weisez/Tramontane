/* ===== BB-коды формуляров для форума =====
   Шаблон берётся так: поле «BB-шаблон» формуляра (если заполнено) → готовый шаблон из BB_DEF (по id формуляра)
   → автоматическая сборка из текстового шаблона (bbAuto). Ключи {поле} подставляются так же, как в обычном тексте. */
const BB_W = (s) => "[SIZE=3][FONT=trebuchet ms]" + s + "[/FONT][/SIZE]";
const BB_EMPTY = { sex: "М\\Ж" }; /* что показывать вместо «*звёздочек*», когда поле пустое */
const BB_DEF = {
  pfile: [
    '[TABLE width="100%"]',
    '[TR]',
    '[td][INDENT][FONT=trebuchet ms][SIZE=2][B]ЛИЧНОЕ ДЕЛО №{id} [/B][/SIZE][SIZE=3][B][FONT=trebuchet ms][SIZE=2][B]| {rank} — {post}[/B][/SIZE][/FONT][/B][/SIZE][/FONT][/INDENT]',
    '[INDENT][FONT=trebuchet ms][SIZE=3][B][SIZE=2][B][FONT=trebuchet ms][SIZE=3][B][FONT=trebuchet ms][SIZE=2][B][FONT=trebuchet ms][SIZE=3][B]ЦЕНТРАЛЬНАЯ СТАНЦИЯ ТРАМОНТАНА | ПОЛИЦЕЙСКИЙ ДЕПАРТАМЕНТ САН-ФИЕРРО[/B][/SIZE][/FONT][/B][/SIZE][/FONT][/B][/SIZE][/B][/SIZE][/FONT][/INDENT][/td]',
    '[/TR]',
    '[/TABLE]',
    '',
    '[TABLE width="100%"]',
    '[TR]',
    '[th][LEFT][SIZE=3][FONT=trebuchet ms] [B]I. ОБЩАЯ ИНФОРМАЦИЯ ОБ ОФИЦЕРЕ[/B][/FONT][/SIZE][/LEFT][/th]',
    '[/TR]',
    '[TR]',
    '[td][INDENT][SIZE=3][FONT=trebuchet ms]1. Имя и фамилия: {name}',
    '2. Описание характера: {char}[/FONT][/SIZE][/INDENT]',
    '[INDENT][SIZE=3][FONT=trebuchet ms]3. Звание и занимаемая должность: {rank} - {post}[/FONT][/SIZE][/INDENT]',
    '[HR][/HR]',
    '[INDENT][FONT=trebuchet ms][SIZE=3][I]{story}[/I][/SIZE][/FONT][/INDENT][/td]',
    '[/TR]',
    '[/TABLE]',
    '',
    '[TABLE width="100%"]',
    '[TR]',
    '[th][LEFT][SIZE=3][FONT=trebuchet ms][B]II. ЛИЧНАЯ ИНФОРМАЦИЯ ОБ ОФИЦЕРЕ[/B][/FONT][/SIZE][/LEFT][/th]',
    '[/TR]',
    '[TR]',
    '[td][INDENT][SIZE=3][FONT=trebuchet ms]1. Пол: [ICODE]{sex}[/ICODE]',
    '2. Дата рождения и возраст: {born}',
    '3. Место рождения, национальность: {place}',
    '4. Телосложение (рост, вес): {body}',
    '5. Особые приметы: {marks}',
    '6. Образование: {edu}[/FONT][/SIZE][/INDENT]',
    '[INDENT][SIZE=3][FONT=trebuchet ms]7. Предыдущая должность\\место работы (при наличии): {prev}[/FONT][/SIZE][/INDENT]',
    '[INDENT][SIZE=3][FONT=trebuchet ms]8. Владение языками: {lang}[/FONT][/SIZE][/INDENT][/td]',
    '[/TR]',
    '[/TABLE]',
    '',
    '[TABLE width="100%"]',
    '[TR]',
    '[th][LEFT][SIZE=3][FONT=trebuchet ms][B]III. ИСТОРИЯ ПООЩРЕНИЙ, ВЗЫСКАНИЙ. ОСОБЫЕ ЗАМЕТКИ.[/B][/FONT][/SIZE][/LEFT][/th]',
    '[/TR]',
    '[TR]',
    '[td][INDENT][SIZE=3][FONT=trebuchet ms][I]Заполняется командованием станции самостоятельно, либо по запросу офицера.[/I][/FONT][/SIZE][/INDENT][/td]',
    '[/TR]',
    '[/TABLE]',
  ].join("\n"),
};
/* автосборка: шапка «Кому / От» — вправо; первая строка следующего блока — заголовок по центру;
   блоки «I. …», «II. …» — таблицы с заголовком; последний блок «Дата: …» — вправо; остальное — обычным текстом */
function bbAuto(tpl) {
  const blocks = String(tpl || "").replace(/\r/g, "").split(/\n[ \t]*\n/).map((b) => b.replace(/^\n+|\n+$/g, "")).filter((b) => b.trim());
  const out = []; let i = 0, titled = false;
  if (blocks[0] && /^(Кому|От)(?=[\s:])/.test(blocks[0])) { out.push("[RIGHT]" + BB_W(blocks[0]) + "[/RIGHT]", BB_W("")); i = 1; }
  for (; i < blocks.length; i++) {
    const b = blocks[i], L = b.split("\n"), last = i === blocks.length - 1;
    if (/^[IVX]+\.\s/.test(b)) {
      out.push('[TABLE width="100%"]', "[TR]", "[th][LEFT]" + BB_W("[B]" + L[0] + "[/B]") + "[/LEFT][/th]", "[/TR]");
      if (L.length > 1) out.push("[TR]", "[td][INDENT]" + BB_W(L.slice(1).join("\n")) + "[/INDENT][/td]", "[/TR]");
      out.push("[/TABLE]");
    } else if (last && /^Дата:/.test(b)) out.push("[RIGHT][SIZE=3][FONT=trebuchet ms]\n" + b + "[/FONT][/SIZE][/RIGHT]");
    else if (!titled) { titled = true; out.push("[CENTER]" + BB_W(L[0]) + "\n[/CENTER]"); if (L.length > 1) out.push(BB_W(L.slice(1).join("\n"))); }
    else out.push(BB_W(b));
  }
  return out.join("\n");
}
function bbOut(f, vals) {
  const tpl = (f.bb && f.bb.trim()) || BB_DEF[f.id] || bbAuto(f.tpl);
  return fillTpl(f, vals, tpl, BB_EMPTY);
}
