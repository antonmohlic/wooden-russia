"""Рисует фон сайта lemekh-pattern.svg: ступенчатый лемех внахлёст, с тенями и лёгким объёмом.

Запуск:  python backend/scripts/make_pattern.py
Размер плитки на странице задаётся в style.css (html { background: … }).
"""
import pathlib
import sys

sys.stdout.reconfigure(encoding="utf-8")

# Лемешина: ширина W, видимая длина ROW (из них STEPS ступеней по STEP на конце)
W, ROW, STEP, STEPS = 16, 26, 3, 2
H = 2 * ROW
TIP = STEP * STEPS

BG = (246, 241, 233)    # --bg
WOOD = (107, 66, 38)    # --wood


def mix(a):
    r, g, b = (round(bg + (w - bg) * a) for bg, w in zip(BG, WOOD))
    return f"#{r:02x}{g:02x}{b:02x}"


def shingle(cx, tip_y):
    """Контур лемешины: верх уходит под верхний ряд, внизу — ступенчатый конец с низом на tip_y."""
    half = W / 2
    top = tip_y - 2 * ROW
    y = tip_y - TIP
    pts = [(cx - half, top), (cx - half, y)]
    for i in range(STEPS):
        x = cx - half + STEP * (i + 1)
        pts += [(x, y), (x, y + STEP)]
        y += STEP
    for i in range(STEPS):
        x = cx + half - STEP * (STEPS - i)
        pts += [(x, y), (x, y - STEP)]
        y -= STEP
    pts += [(cx + half, y), (cx + half, top)]
    return pts


def d(pts, dx=0, dy=0):
    return "M" + " L".join(f"{x + dx:g} {y + dy:g}" for x, y in pts) + "Z"


# Все лемешины, задевающие плитку: ряд 1 (конец на ROW), ряд 2 (конец на 2*ROW, сдвиг на полплашки), с повтором по вертикали
items = []
for k in range(-1, 3):
    items.append((W / 2, ROW + k * H))
    for cx in (0, W):
        items.append((cx, 2 * ROW + k * H))
# Верхний ряд лежит поверх нижнего: рисуем снизу вверх
items.sort(key=lambda it: -it[1])

parts = []
for cx, tip_y in items:
    pts = shingle(cx, tip_y)
    # Тень от конца лемешины на нижний ряд
    parts.append(f'<path d="{d(pts, 0, 1.5)}" fill="#4e2f1a" fill-opacity="0.08"/>')
    parts.append(f'<path d="{d(pts, 0, 3)}" fill="#4e2f1a" fill-opacity="0.045"/>')
    parts.append(f'<path d="{d(pts)}" fill="url(#g)" stroke="{mix(0.14)}" stroke-width="0.5"/>')
    # Волокна дерева
    for gx in (-W / 4, W / 6):
        parts.append(f'<path d="M{cx + gx:g} {tip_y - ROW + 4:g}V{tip_y - TIP - 2:g}" stroke="{mix(0.08)}" stroke-width="0.4"/>')

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
  <!-- Фон сайта: ступенчатый лемех внахлёст. Создан скриптом backend/scripts/make_pattern.py — правьте там. -->
  <defs>
    <!-- Верх лемешины в тени верхнего ряда, к концу светлее -->
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.5" stop-color="{mix(0.12)}"/>
      <stop offset="0.65" stop-color="{mix(0.055)}"/>
      <stop offset="1" stop-color="{mix(0.015)}"/>
    </linearGradient>
  </defs>
  {chr(10).join("  " + p for p in parts).strip()}
</svg>
'''
path = pathlib.Path(__file__).resolve().parents[2] / "lemekh-pattern.svg"
path.write_text(svg, encoding="utf-8")
print(f"Сохранено: {path.name}, {len(svg)} байт")
