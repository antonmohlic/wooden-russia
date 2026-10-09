// Справочник → Словарь: термины деревянного зодчества со схемами.
// Термины — в TERMS ниже; схемы рисуются простыми линиями, выделенная часть — цветом.

// ---------- Схемы ----------
// Все схемы — фасад в координатах 200×200, земля на y = 185.

const GROUND = 185;
const LINE = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"';
const MARK = 'class="hl"'; // выделенная часть схемы

// Бревенчатый сруб: прямоугольник с линиями венцов
function logs(x, y, w, h, mark) {
  let lines = "";
  for (let ly = y + 7; ly < y + h - 2; ly += 7) lines += `<line x1="${x}" y1="${ly}" x2="${x + w}" y2="${ly}" class="thin"/>`;
  return `<g ${mark ? MARK : ""}><rect x="${x}" y="${y}" width="${w}" height="${h}" ${LINE}/>${lines}</g>`;
}

// Восьмерик: на фасаде видны три грани
function octagon(x, y, w, h, mark) {
  const a = x + w * 0.3, b = x + w * 0.7;
  return `<g ${mark ? MARK : ""}>${logs(x, y, w, h)}<line x1="${a}" y1="${y}" x2="${a}" y2="${y + h}" ${LINE}/><line x1="${b}" y1="${y}" x2="${b}" y2="${y + h}" ${LINE}/></g>`;
}

// Двускатная кровля
function gable(x, y, w, h, mark) {
  return `<path d="M${x - 6} ${y} L${x + w / 2} ${y - h} L${x + w + 6} ${y} Z" ${LINE} ${mark ? MARK : ""}/>`;
}

// Шатёр: высокая восьмигранная пирамида
function tent(cx, y, w, h, mark) {
  return `<g ${mark ? MARK : ""}><path d="M${cx - w / 2} ${y} L${cx} ${y - h} L${cx + w / 2} ${y} Z" ${LINE}/><line x1="${cx - w * 0.2}" y1="${y}" x2="${cx}" y2="${y - h}" class="thin"/><line x1="${cx + w * 0.2}" y1="${y}" x2="${cx}" y2="${y - h}" class="thin"/></g>`;
}

// Главка-луковица на барабане и крест. y — низ барабана
function dome(cx, y, r, mark, scales) {
  const neck = r * 0.55, drumH = r * 0.9, top = y - drumH;
  const bulb = `M${cx - neck} ${top} C${cx - r * 1.5} ${top - r * 0.6}, ${cx - r * 0.3} ${top - r * 1.5}, ${cx} ${top - r * 2.1} C${cx + r * 0.3} ${top - r * 1.5}, ${cx + r * 1.5} ${top - r * 0.6}, ${cx + neck} ${top} Z`;
  let rows = "";
  if (scales) {
    // Лемех: ряды чешуек на луковице
    for (let i = 1; i <= 4; i++) {
      const yy = top - r * 0.38 * i, half = r * (1.05 - i * 0.2);
      for (let k = -2; k <= 2; k++) {
        const sx = cx + k * half * 0.45;
        rows += `<path d="M${sx - half * 0.22} ${yy} q${half * 0.22} ${r * 0.28} ${half * 0.44} 0" class="thin"/>`;
      }
    }
  }
  return `<g ${mark ? MARK : ""}><rect x="${cx - neck}" y="${top}" width="${neck * 2}" height="${drumH}" ${LINE}/><path d="${bulb}" ${LINE}/>${rows}</g>
    <line x1="${cx}" y1="${top - r * 2.1}" x2="${cx}" y2="${top - r * 2.1 - 16}" ${LINE}/><line x1="${cx - 6}" y1="${top - r * 2.1 - 11}" x2="${cx + 6}" y2="${top - r * 2.1 - 11}" ${LINE}/>`;
}

// Бочка: покрытие с заострённым верхом, как у лежащей бочки
function barrel(x, y, w, h, mark) {
  // Бока поднимаются почти отвесно и сходятся острым гребнем — не шире сруба, в отличие от куба
  return `<path d="M${x} ${y} C${x} ${y - h * 0.55}, ${x + w * 0.42} ${y - h * 0.7}, ${x + w / 2} ${y - h} C${x + w * 0.58} ${y - h * 0.7}, ${x + w} ${y - h * 0.55}, ${x + w} ${y} Z" ${LINE} ${mark ? MARK : ""}/>`;
}

// Куб: четырёхгранное покрытие, выпуклое, как луковица
function cube(x, y, w, h, mark) {
  const cx = x + w / 2;
  return `<path d="M${x - 2} ${y} C${x - 14} ${y - h * 0.45}, ${x + w * 0.15} ${y - h * 0.85}, ${cx} ${y - h} C${x + w * 0.85} ${y - h * 0.85}, ${x + w + 14} ${y - h * 0.45}, ${x + w + 2} ${y} Z" ${LINE} ${mark ? MARK : ""}/><line x1="${cx}" y1="${y}" x2="${cx}" y2="${y - h}" class="thin"/>`;
}

function svg(body, label) {
  return `<svg viewBox="0 0 200 200" role="img" aria-label="${label}"><line x1="10" y1="${GROUND}" x2="190" y2="${GROUND}" class="thin"/>${body}</svg>`;
}

// Клетская церковь: сруб-клеть под двускатной кровлей, восточнее — меньший алтарный прируб
const klet = (mark) =>
  svg(`${logs(40, 115, 90, 70, mark === "klet")}${gable(40, 115, 90, 45, mark === "klet")}
       ${logs(130, 135, 40, 50, mark === "prirub")}${gable(130, 135, 40, 22, mark === "prirub")}
       ${dome(85, 70, 12)}`, "Клетская церковь");

// Шатровая церковь: восьмерик на четверике, шатёр, главка
const tented = (mark) =>
  svg(`${logs(55, 130, 90, 55, mark === "chetverik")}${octagon(65, 88, 70, 42, mark === "vosmerik")}
       <path d="M60 88 L140 88 L136 82 L64 82 Z" ${LINE} ${mark === "poval" ? MARK : ""}/>
       ${tent(100, 82, 64, 62, mark === "shatyor")}${dome(100, 20, 6, mark === "glava")}`, "Шатровая церковь: восьмерик на четверике");

// Ярусная церковь: восьмерики, уменьшающиеся кверху
const tiered = (mark) =>
  svg(`${logs(50, 135, 100, 50)}${octagon(62, 100, 76, 35, mark === "yarus")}${octagon(72, 72, 56, 28, mark === "yarus")}
       ${octagon(81, 50, 38, 22, mark === "yarus")}${dome(100, 50, 9)}`, "Ярусная церковь");

// Кубоватая церковь: четверик, покрытый кубом, с главкой
const cubic = (mark) =>
  svg(`${logs(55, 120, 90, 65)}${cube(55, 120, 90, 52, mark === "kub")}${dome(100, 68, 9)}`, "Кубоватая церковь");

// Многоглавая: несколько глав на кровле
const manyDomes = () =>
  svg(`${logs(40, 125, 120, 60)}${barrel(40, 125, 120, 30)}${dome(100, 95, 11)}${dome(62, 112, 7)}${dome(138, 112, 7)}
       ${dome(81, 104, 6)}${dome(119, 104, 6)}`, "Многоглавая церковь");

// Бочка на срубе
const barrelRoof = (mark) => svg(`${logs(55, 125, 90, 60)}${barrel(55, 125, 90, 62, mark === "bochka")}${dome(100, 63, 8)}`, "Покрытие бочкой");

// Главка крупно, с лемехом
const domeClose = (mark) =>
  svg(`<path d="M50 185 L150 185 L130 160 L70 160 Z" ${LINE}/>${dome(100, 160, 32, mark === "lemekh" || mark === "glava", true)}`, "Главка, покрытая лемехом");

// Рубка углов сруба: в обло (с остатком) и в лапу (без остатка)
const corners = (mark) => {
  const oblo = [0, 1, 2, 3, 4, 5].map((i) => `<rect x="20" y="${90 + i * 15}" width="70" height="13" rx="6" ${LINE}/><circle cx="80" cy="${96 + i * 15}" r="5" class="thin" fill="none" stroke="currentColor"/>`).join("");
  const lapa = [0, 1, 2, 3, 4, 5].map((i) => `<rect x="115" y="${90 + i * 15}" width="60" height="13" ${LINE}/>`).join("");
  return svg(`<g ${mark === "oblo" ? MARK : ""}>${oblo}</g><g ${mark === "lapa" ? MARK : ""}>${lapa}</g>
    <text x="55" y="80" text-anchor="middle" class="label">в обло</text><text x="145" y="80" text-anchor="middle" class="label">в лапу</text>`, "Рубка углов: в обло и в лапу");
};

// Фронтон избы: самцы, причелины, полотенце, охлупень
const gableEnd = (mark) =>
  svg(`${logs(45, 120, 110, 65)}
       <g ${mark === "samtsy" ? MARK : ""}>${[0, 1, 2, 3, 4].map((i) => `<rect x="${52 + i * 9}" y="${113 - i * 9}" width="${96 - i * 18}" height="7" ${LINE}/>`).join("")}</g>
       <path d="M36 122 L100 62 L164 122" ${LINE} ${mark === "prichelina" ? MARK : ""} stroke-width="5"/>
       <path d="M96 66 L104 66 L104 96 L100 102 L96 96 Z" ${LINE} ${mark === "polotentse" ? MARK : ""}/>
       <path d="M80 60 L128 60 Q140 52 140 42 L134 44 Q132 50 124 54 L80 54 Z" ${LINE} ${mark === "okhlupen" ? MARK : ""}/>
       <rect x="88" y="140" width="24" height="22" ${LINE}/>`, "Фронтон избы");

// Тройник: зимняя и летняя церкви и колокольня
const troinik = () =>
  svg(`${logs(15, 140, 50, 45)}${gable(15, 140, 50, 25)}${dome(40, 115, 7)}
       ${logs(80, 135, 40, 50)}${octagon(86, 105, 28, 30)}${tent(100, 105, 30, 50)}
       ${logs(135, 120, 50, 65)}${octagon(143, 95, 34, 25)}${tent(160, 95, 40, 55)}${dome(160, 40, 5)}`, "Тройник: две церкви и колокольня");

// Мельница-столбовка: короб на столбе, поворачивается целиком
const windmill = (mark) =>
  svg(`<path d="M85 185 L100 150 L115 185" ${LINE}/><g ${mark === "stolbovka" ? MARK : ""}>${logs(80, 95, 40, 55)}${gable(80, 95, 40, 20)}</g>
       <line x1="120" y1="100" x2="175" y2="45" ${LINE}/><line x1="120" y1="100" x2="175" y2="155" ${LINE}/>
       <line x1="120" y1="100" x2="65" y2="155" class="thin"/><line x1="120" y1="100" x2="65" y2="45" class="thin"/>
       <line x1="80" y1="135" x2="40" y2="180" ${LINE}/>`, "Мельница-столбовка");

// Острог: частокол с башней
const ostrog = (mark) =>
  svg(`<g ${mark === "tyn" ? MARK : ""}>${Array.from({ length: 14 }, (_, i) => `<path d="M${12 + i * 7} 185 L${12 + i * 7} 140 L${15.5 + i * 7} 133 L${19 + i * 7} 140 L${19 + i * 7} 185" ${LINE}/>`).join("")}</g>
       ${logs(115, 105, 50, 80)}<path d="M108 105 L172 105 L168 95 L112 95 Z" ${LINE}/>${tent(140, 95, 56, 45)}`, "Острог: тын и башня");

// Дом-кошель: жилая часть и двор под одной несимметричной кровлей
const koshel = () =>
  svg(`${logs(25, 120, 75, 65)}<rect x="100" y="135" width="80" height="50" ${LINE}/>
       <path d="M18 122 L75 70 L188 140" ${LINE}/><rect x="45" y="138" width="16" height="16" ${LINE}/><rect x="70" y="138" width="16" height="16" ${LINE}/>`, "Дом-кошель");

// ---------- Термины ----------
// see — связанные термины (по полю id)

const GROUPS = ["Типы храмов", "Части здания", "Покрытия и завершения", "Конструкции", "Постройки и ансамбли"];

const TERMS = [
  // Типы храмов
  { id: "kletskiy", term: "Клетский храм", group: "Типы храмов", svg: klet("klet"),
    def: "Самый простой и древний тип деревянной церкви: прямоугольный сруб-клеть под высокой двускатной кровлей, как у избы. С востока к нему пристраивают меньший алтарный прируб, с запада — трапезную. Самый распространённый тип деревянной церкви на протяжении веков.",
    see: ["prirub", "trapeznaya", "kub"] },
  { id: "shatrovyy", term: "Шатровый храм", group: "Типы храмов", svg: tented(),
    def: "Церковь, завершённая высоким шатром. Чаще всего шатёр ставят на восьмерик, поднятый на четверик («восьмерик на четверике»), реже — прямо на восьмигранный сруб от земли. Главный образ русского деревянного зодчества XVI–XVII веков.",
    see: ["shatyor", "vosmerik", "chetverik", "poval"] },
  { id: "yarusnyy", term: "Ярусный храм", group: "Типы храмов", svg: tiered("yarus"),
    def: "Церковь, у которой над нижним срубом поставлены друг на друга несколько уменьшающихся кверху восьмериков (или четвериков) — ярусов. Ярусные храмы распространились с конца XVII века; знаменитый пример — Преображенская церковь в Кижах.",
    see: ["vosmerik", "chetverik"] },
  { id: "kubovatyy", term: "Кубоватый храм", group: "Типы храмов", svg: cubic("kub"),
    def: "Церковь, четверик которой покрыт кубом — пышной четырёхгранной кровлей, похожей на огромную луковицу. На кубе ставят одну или несколько глав. Тип характерен для Поморья и Онеги XVII–XVIII веков.",
    see: ["kub", "chetverik", "glava"] },
  { id: "mnogoglavyy", term: "Многоглавый храм", group: "Типы храмов", svg: manyDomes(),
    def: "Церковь с большим числом глав — на бочках, кокошниках, ярусах. Высшее достижение типа — 22-главая Преображенская церковь в Кижах (1714).",
    see: ["glava", "bochka", "yarusnyy"] },

  // Части здания
  { id: "srub", term: "Сруб", group: "Части здания",
    def: "Основа любой деревянной постройки: стены из горизонтальных брёвен, связанных на углах врубками. Брёвна каждого ряда называются венцом.",
    see: ["venets", "v-oblo", "v-lapu"] },
  { id: "chetverik", term: "Четверик", group: "Части здания", svg: tented("chetverik"),
    def: "Сруб, квадратный или прямоугольный в плане, — с четырьмя стенами. Обычно нижняя, главная часть храма.",
    see: ["vosmerik", "srub"] },
  { id: "vosmerik", term: "Восьмерик", group: "Части здания", svg: tented("vosmerik"),
    def: "Восьмигранный сруб. Стоит на четверике («восьмерик на четверике»), служит основанием шатра или ярусов. Восьмигранник лучше квадрата держит высокий шатёр.",
    see: ["chetverik", "shatyor", "yarusnyy"] },
  { id: "prirub", term: "Прируб", group: "Части здания", svg: klet("prirub"),
    def: "Меньший сруб, пристроенный к основному: с востока — алтарь, с запада — трапезная или притвор. В северных храмах алтарный прируб часто пятигранный.",
    see: ["altar", "trapeznaya"] },
  { id: "altar", term: "Алтарь (апсида)", group: "Части здания",
    def: "Восточная, самая священная часть храма, где стоит престол. В деревянных церквях это отдельный прируб, обычно с собственной кровлей — бочкой или двускатной.",
    see: ["prirub"] },
  { id: "trapeznaya", term: "Трапезная", group: "Части здания",
    def: "Западная пристройка к храму, шире и ниже его. Здесь собирались прихожане, а в старину устраивались и общие трапезы — отсюда название.",
    see: ["prirub", "papert"] },
  { id: "papert", term: "Паперть", group: "Части здания",
    def: "Площадка или крытая галерея перед входом в храм. На Севере паперть часто превращается в гульбище — галерею, охватывающую храм с нескольких сторон.",
    see: ["gulbishche", "kryltso"] },
  { id: "gulbishche", term: "Гульбище", group: "Части здания",
    def: "Открытая или крытая галерея вокруг храма на уровне пола, поднятого на подклет. По гульбищу обходили храм во время крестного хода.",
    see: ["papert", "podklet"] },
  { id: "kryltso", term: "Крыльцо", group: "Части здания",
    def: "Вход с лестницей. В северных храмах и домах крыльцо бывает очень нарядным: высокое, на резных столбах, под отдельной кровлей.",
    see: ["papert"] },
  { id: "podklet", term: "Подклет", group: "Части здания",
    def: "Нижний этаж сруба под основными помещениями — для хранения, хозяйства или тепла. Поднимает храм или жилые покои над землёй и снегом.",
    see: ["gulbishche"] },

  // Покрытия и завершения
  { id: "shatyor", term: "Шатёр", group: "Покрытия и завершения", svg: tented("shatyor"),
    def: "Высокое восьмигранное пирамидальное покрытие. Издалека видное с реки, оно служило ориентиром. Над шатром ставят небольшую главку с крестом.",
    see: ["shatrovyy", "vosmerik", "poval"] },
  { id: "poval", term: "Повал", group: "Покрытия и завершения", svg: tented("poval"),
    def: "Расширение верхних венцов сруба наружу — выпуск брёвен, на котором покоится основание шатра или кровли. Повал отводит воду от стен и подчёркивает переход от сруба к покрытию.",
    see: ["shatyor", "vosmerik", "politsa"] },
  { id: "bochka", term: "Бочка", group: "Покрытия и завершения", svg: barrelRoof("bochka"),
    def: "Покрытие с полукруглым боком и острым гребнем — похоже на лежащую бочку. Им кроют алтари, крыльца, пристройки; несколько бочек крест-накрест дают нарядное многоглавие.",
    see: ["kub", "kokoshnik"] },
  { id: "kub", term: "Куб", group: "Покрытия и завершения", svg: cubic("kub"),
    def: "Четырёхгранное покрытие с выпуклыми гранями, напоминающее огромную луковицу. Дало название кубоватым храмам.",
    see: ["kubovatyy", "bochka"] },
  { id: "kokoshnik", term: "Кокошник", group: "Покрытия и завершения",
    def: "Декоративное полукруглое или заострённое завершение — по сути, торец бочки. Ряды кокошников украшают переход к главам.",
    see: ["bochka", "glava"] },
  { id: "glava", term: "Главка", group: "Покрытия и завершения", svg: domeClose("glava"),
    def: "Завершение храма в форме луковицы, увенчанное крестом. Стоит на шейке-барабане и в деревянных церквях покрывается лемехом.",
    see: ["baraban", "lemekh"] },
  { id: "baraban", term: "Барабан (шейка)", group: "Покрытия и завершения",
    def: "Цилиндрическое основание главки. В деревянных храмах барабан обычно глухой и узкий — «шейка».",
    see: ["glava"] },
  { id: "lemekh", term: "Лемех", group: "Покрытия и завершения", svg: domeClose("lemekh"),
    def: "Фигурные осиновые дощечки-чешуйки, которыми кроют главки, бочки и шатры. Свежий лемех золотистый, со временем серебрится. Отсюда и название нашего сайта.",
    see: ["glava", "bochka"] },
  { id: "politsa", term: "Полица", group: "Покрытия и завершения",
    def: "Небольшой навес-карниз, опоясывающий сруб, чтобы дождевая вода не стекала по стенам. Выполняет ту же задачу, что и повал.",
    see: ["poval"] },
  { id: "okhlupen", term: "Охлупень", group: "Покрытия и завершения", svg: gableEnd("okhlupen"),
    def: "Тяжёлое выдолбленное бревно, надетое на конёк двускатной кровли и прижимающее её. Передний конец часто вырезали в виде конской головы — отсюда «конёк».",
    see: ["prichelina", "samtsy"] },
  { id: "prichelina", term: "Причелина", group: "Покрытия и завершения", svg: gableEnd("prichelina"),
    def: "Доска вдоль ската кровли на фронтоне, закрывающая торцы брёвен и слег. Часто покрыта пропильной или глухой резьбой.",
    see: ["polotentse", "okhlupen"] },
  { id: "polotentse", term: "Полотенце", group: "Покрытия и завершения", svg: gableEnd("polotentse"),
    def: "Короткая вертикальная доска, свисающая под стыком причелин на вершине фронтона. Как и причелины, украшается резьбой.",
    see: ["prichelina"] },

  // Конструкции
  { id: "venets", term: "Венец", group: "Конструкции",
    def: "Один горизонтальный ряд брёвен сруба, связанных на углах. Нижний, самый толстый — окладной венец.",
    see: ["srub"] },
  { id: "v-oblo", term: "Рубка в обло", group: "Конструкции", svg: corners("oblo"),
    def: "Соединение брёвен на углу «с остатком»: концы выступают за стену, а бревно ложится в выбранную чашку. Самая древняя и тёплая врубка; другие названия — «в чашу», «в обло».",
    see: ["v-lapu", "srub"] },
  { id: "v-lapu", term: "Рубка в лапу", group: "Конструкции", svg: corners("lapa"),
    def: "Соединение «без остатка»: концы брёвен стёсаны в форме лапы и не выступают за стену. Позволяет обшить сруб тёсом; распространилась в XVIII–XIX веках.",
    see: ["v-oblo"] },
  { id: "samtsy", term: "Самцы", group: "Конструкции", svg: gableEnd("samtsy"),
    def: "Укорачивающиеся кверху брёвна фронтона, на которые укладываются продольные слеги. Самцовая кровля обходилась без стропил и гвоздей.",
    see: ["okhlupen", "kuritsa"] },
  { id: "kuritsa", term: "Курица", group: "Конструкции",
    def: "Тонкое бревно с крюком из корневища, закреплённое на слеге. Крюк держит водосточный жёлоб-поток, а тот — нижние концы тесин кровли. Часть «безгвоздевой» кровли.",
    see: ["samtsy", "okhlupen"] },

  // Постройки и ансамбли
  { id: "pogost", term: "Погост", group: "Постройки и ансамбли",
    def: "В старину — центр сельского прихода: церкви, колокольня, кладбище, дома причта, обнесённые оградой. Позже словом стали называть и само сельское кладбище.",
    see: ["troinik"] },
  { id: "troinik", term: "Тройник", group: "Постройки и ансамбли", svg: troinik(),
    def: "Ансамбль северного погоста из трёх построек: большой летней церкви, малой тёплой зимней и колокольни. Знаменитые тройники — в Кижах, Лядинах, Неноксе. Тройник изображён и в знаке нашего сайта.",
    see: ["pogost", "shatrovyy"] },
  { id: "chasovnya", term: "Часовня", group: "Постройки и ансамбли",
    def: "Небольшое культовое здание без алтаря: в нём молятся, но не служат литургию. В северных деревнях без церкви часовня была главным общественным зданием.",
    see: ["kletskiy"] },
  { id: "ostrog", term: "Острог", group: "Постройки и ансамбли", svg: ostrog("tyn"),
    def: "Деревянная крепость: стена-тын из заострённых вертикальных брёвен с рублеными башнями. Остроги ставили при освоении Урала и Сибири; уцелевшие башни перевезены в музеи — Коломенское, Хохловку.",
    see: ["shatyor"] },
  { id: "stolbovka", term: "Мельница-столбовка", group: "Постройки и ансамбли", svg: windmill("stolbovka"),
    def: "Ветряная мельница, корпус которой стоит на одном вертикальном столбе и целиком поворачивается против ветра длинным рычагом-«водилом». У мельницы-шатровки поворачивается только верх.",
    see: [] },
  { id: "koshel", term: "Дом-кошель", group: "Постройки и ансамбли", svg: koshel(),
    def: "Северный дом, где жилая изба и крытый хозяйственный двор стоят под одной несимметричной двускатной кровлей. Одна сторона кровли длиннее — похоже на заплечный короб-кошель.",
    see: ["pyatistenok"] },
  { id: "pyatistenok", term: "Пятистенок", group: "Постройки и ансамбли",
    def: "Изба, разделённая внутри пятой рубленой стеной на две части — жилую и «чистую» горницу.",
    see: ["koshel", "srub"] },
];

// ---------- Страница ----------

const glossaryRoot = document.getElementById("glossary");
const byId = Object.fromEntries(TERMS.map((t) => [t.id, t]));

function termCardHtml(t) {
  const see = (t.see || []).filter((id) => byId[id]);
  return `
    <article class="term" id="${t.id}">
      ${t.svg ? `<div class="term-scheme">${t.svg}</div>` : ""}
      <div class="term-body">
        <h2>${escapeHtml(t.term)}</h2>
        <p class="term-group">${escapeHtml(t.group)}</p>
        <p>${escapeHtml(t.def)}</p>
        ${see.length ? `<p class="term-see">См. также: ${see.map((id) => `<a href="#${id}">${escapeHtml(byId[id].term)}</a>`).join(", ")}</p>` : ""}
      </div>
    </article>`;
}

function renderGlossary() {
  const sorted = [...TERMS].sort((a, b) => a.term.localeCompare(b.term, "ru"));
  glossaryRoot.innerHTML = `
    <div class="glossary-tools">
      <input type="search" id="term-search" placeholder="Найти термин…" autocomplete="off">
      <div class="chips" id="term-groups">
        <button type="button" class="chip active" data-group="">Все</button>
        ${GROUPS.map((g) => `<button type="button" class="chip" data-group="${escapeHtml(g)}">${escapeHtml(g)}</button>`).join("")}
      </div>
    </div>
    <p class="results-count" id="term-count"></p>
    <div class="term-list" id="term-list">${sorted.map(termCardHtml).join("")}</div>`;

  const search = document.getElementById("term-search");
  const count = document.getElementById("term-count");
  let group = "";

  const apply = () => {
    const query = normalize(search.value.trim());
    let shown = 0;
    sorted.forEach((t) => {
      const visible = (!group || t.group === group) && (!query || normalize(`${t.term} ${t.def}`).includes(query));
      document.getElementById(t.id).hidden = !visible;
      if (visible) shown++;
    });
    count.textContent = shown === TERMS.length ? `Терминов: ${TERMS.length}` : `Найдено: ${shown} из ${TERMS.length}`;
  };

  search.addEventListener("input", apply);
  document.getElementById("term-groups").addEventListener("click", (event) => {
    const chip = event.target.closest(".chip");
    if (!chip) return;
    group = chip.dataset.group;
    document.querySelectorAll("#term-groups .chip").forEach((c) => c.classList.toggle("active", c === chip));
    apply();
  });

  // Переход по «См. также»: сбрасываем фильтры, чтобы нужный термин был виден
  glossaryRoot.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || !byId[link.hash.slice(1)]) return;
    search.value = "";
    group = "";
    document.querySelectorAll("#term-groups .chip").forEach((c) => c.classList.toggle("active", !c.dataset.group));
    apply();
  });

  apply();
  if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
}

renderGlossary();
