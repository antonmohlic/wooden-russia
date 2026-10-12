"""Рисует фон сайта: ступенчатый лемех внахлёст, с тенями и лёгким объёмом.
lemekh-pattern.svg — основной узор, lemekh-pattern-real.svg — реалистичнее (разный тон, изогнутые волокна).

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


def rows(cols):
    """Лемешины, задевающие плитку шириной cols плашек: (номер в ряду, ряд, центр, низ конца).
    Ряд 1 — конец на ROW, ряд 2 — на 2*ROW со сдвигом на полплашки; повтор по вертикали.
    Верхний ряд лежит поверх нижнего, поэтому порядок — снизу вверх."""
    items = []
    for k in range(-1, 3):
        for i in range(cols):
            items.append((i, 0, W / 2 + i * W, ROW + k * H))
        for i in range(cols + 1):
            items.append((i % cols, 1, i * W, 2 * ROW + k * H))
    return sorted(items, key=lambda it: -it[3])


def gradient(gid, dark, mid, light):
    # Верх лемешины в тени верхнего ряда, к концу светлее
    return f"""<linearGradient id="{gid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.5" stop-color="{mix(dark)}"/>
      <stop offset="0.65" stop-color="{mix(mid)}"/>
      <stop offset="1" stop-color="{mix(light)}"/>
    </linearGradient>"""


def simple():
    """Основной узор: одинаковые лемешины, мягкая тень, два прямых волокна."""
    parts = []
    for _, _, cx, tip_y in rows(1):
        pts = shingle(cx, tip_y)
        # Тень от конца лемешины на нижний ряд
        parts.append(f'<path d="{d(pts, 0, 1.5)}" fill="#4e2f1a" fill-opacity="0.08"/>')
        parts.append(f'<path d="{d(pts, 0, 3)}" fill="#4e2f1a" fill-opacity="0.045"/>')
        parts.append(f'<path d="{d(pts)}" fill="url(#g)" stroke="{mix(0.14)}" stroke-width="0.5"/>')
        # Волокна дерева
        for gx in (-W / 4, W / 6):
            parts.append(f'<path d="M{cx + gx:g} {tip_y - ROW + 4:g}V{tip_y - TIP - 2:g}" stroke="{mix(0.08)}" stroke-width="0.4"/>')
    return W, [gradient("g", 0.12, 0.055, 0.015)], parts


# Для реалистичного узора: тон каждой лемешины (дерево темнеет неравномерно) и изгиб волокон
TONES = [0.0, 0.02, -0.01, 0.03]
BENDS = [0.7, -0.5, 0.4, -0.8]


def realistic():
    """Лемешины разного тона, изогнутые волокна, тень сбоку и под концом глубже."""
    cols = len(TONES)
    defs = [gradient(f"g{t}", 0.11 + tone, 0.055 + tone, 0.015 + tone / 2) for t, tone in enumerate(TONES)]
    parts = []
    for i, row, cx, tip_y in rows(cols):
        t = (i + 2 * row) % cols
        pts = shingle(cx, tip_y)
        parts.append(f'<path d="{d(pts, 0, 1.2)}" fill="#3a2212" fill-opacity="0.09"/>')
        parts.append(f'<path d="{d(pts, 0.4, 3)}" fill="#3a2212" fill-opacity="0.05"/>')
        parts.append(f'<path d="{d(pts)}" fill="url(#g{t})" stroke="{mix(0.17)}" stroke-width="0.5"/>')
        # Правый край лемешины в лёгкой тени — так видно, что она выпуклая
        top, bottom = tip_y - ROW, tip_y - TIP
        parts.append(f'<path d="M{cx + W / 2 - 1.2:g} {top:g}V{bottom:g}" stroke="#3a2212" stroke-opacity="0.05" stroke-width="2"/>')
        # Изогнутые волокна
        bend = BENDS[t]
        for gx, k in ((-W / 4, 1), (0.5, -0.6), (W / 5, 0.8)):
            x = cx + gx
            y1, y2 = top + 3, bottom - 2
            parts.append(
                f'<path d="M{x:g} {y1:g}Q{x + bend * k:g} {(y1 + y2) / 2:g} {x:g} {y2:g}" fill="none" stroke="{mix(0.10 + TONES[t])}" stroke-width="0.35"/>'
            )
    return W * cols, defs, parts


def write(name, width, defs, parts):
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="{width:g}" height="{H}" viewBox="0 0 {width:g} {H}">
  <!-- Фон сайта: ступенчатый лемех внахлёст. Создан скриптом backend/scripts/make_pattern.py — правьте там. -->
  <defs>
    {chr(10).join("    " + g for g in defs).strip()}
  </defs>
  {chr(10).join("  " + p for p in parts).strip()}
</svg>
"""
    path = pathlib.Path(__file__).resolve().parents[2] / name
    path.write_text(svg, encoding="utf-8")
    print(f"Сохранено: {path.name}, {len(svg)} байт")


write("lemekh-pattern.svg", *simple())
write("lemekh-pattern-real.svg", *realistic())
