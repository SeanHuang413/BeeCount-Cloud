"""Build the complete, editable pastel category illustration family (stdlib only).

Original geometry; the approved imagegen sheet is the visual reference, not a
runtime dependency. Run from any directory; missing catalog IDs fail the build.
"""

import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FEATURE = ROOT / 'frontend/packages/web-features/src/features/sean_category-icons'
DEST = FEATURE / 'assets/pastel-vector-v2'
REVIEW = ROOT / 'output/category-icons/pastel-vector-v2'
C = dict(ink='#40566F', blue='#A9D3F5', mint='#AFE3D1', yellow='#F8D889',
         peach='#F5C0A6', coral='#F3A29C', purple='#C9BCEB', paper='#F2F7FC', green='#8CC8AC')


def path(d, color='none', **attrs):
    return el('path', d=d, fill=C.get(color, color), **attrs)


def el(tag, **attrs):
    return '<' + tag + ' ' + ' '.join(f'{k.replace("_", "-")}="{html.escape(str(v), quote=True)}"' for k, v in attrs.items()) + '/>'


def rect(x, y, w, h, color, r=3):
    return el('rect', x=x, y=y, width=w, height=h, rx=r, fill=C.get(color, color))


def circle(x, y, r, color):
    return el('circle', cx=x, cy=y, r=r, fill=C.get(color, color))


def line(d):
    return path(d)


def group(body, transform):
    return f'<g transform="{transform}">{body}</g>'


def small(body):
    return group(body, 'translate(34 33) scale(.43)')


def coin(x=32, y=32, r=12):
    return circle(x, y, r, 'yellow') + path(f'M{x-3} {y-5}h6m-6 5h6m-3-5v10', stroke_width=1.6)


def heart(color='coral'):
    return path('M32 49 13 31C1 18 20 5 32 20 44 5 63 18 51 31Z', color)


def check():
    return circle(32, 32, 19, 'mint') + path('m22 32 7 7 14-15', stroke_width=3)


def arrow():
    return path('M49 31A17 17 0 1 0 44 44M49 19v12H37', stroke_width=3)


def shield():
    return path('M32 8 51 16v16c0 12-19 22-19 22S13 44 13 32V16Z', 'mint')


def star(x=32, y=30, color='yellow'):
    return path(f'M{x} {y-16}l5 10 11 2-8 8 2 11-10-5-10 5 2-11-8-8 11-2Z', color)


def document(color='paper'):
    return path('M15 8h27l8 8v40H15Z', color) + path('M42 8v10h8M23 28h18M23 36h18M23 44h11', stroke_width=2)


def house():
    return rect(16, 28, 33, 27, 'peach') + path('m9 29 23-21 23 21Z', 'mint') + rect(27, 39, 11, 16, 'paper', 2) + rect(19, 33, 7, 7, 'blue', 1)


def wallet():
    return rect(9, 17, 44, 34, 'peach', 6) + path('M13 17V12h34v5', 'yellow') + rect(37, 29, 19, 13, 'purple') + circle(43, 35, 1.3, 'ink')


def bag(color='peach'):
    return path('M13 20h38l3 35H10Z', color) + path('M23 22v-6a9 9 0 0 1 18 0v6', stroke_width=2.5)


def cart(color='purple'):
    return path('M7 14h7l7 31h29') + path('M18 25h37l-5 15H21Z', color) + circle(26, 53, 3, 'blue') + circle(46, 53, 3, 'blue')


def box():
    return path('M10 21 32 10l22 11v27L32 59 10 48Z', 'peach') + path('m10 21 22 11 22-11M32 32v27M22 15l22 11v10', 'yellow')


def briefcase():
    return rect(10, 21, 44, 32, 'purple', 5) + path('M24 21v-9h16v9M10 33q22 13 44 0') + rect(28, 33, 8, 7, 'yellow', 1)


def book():
    return path('M32 17Q17 8 8 15v35q11-5 24 2 13-7 24-2V15q-11-7-24 2Z', 'blue') + path('M32 17v35M16 24l9 2M16 32l9 2M40 26l8-2M40 34l8-2', stroke_width=1.8)


def car(color='blue'):
    return rect(12, 42, 8, 12, 'ink', 2) + rect(44, 42, 8, 12, 'ink', 2) + path('m13 29 5-14q1-4 6-4h16q5 0 6 4l5 14', color) + path('m19 27 4-10h18l4 10Z', 'paper') + rect(8, 28, 48, 20, color, 7) + circle(18, 37, 4, 'yellow') + circle(46, 37, 4, 'yellow') + line('M28 41h8')


def plant():
    return path('M32 44V25M32 32Q12 34 12 15q20 0 20 17M32 25Q32 10 51 10q0 17-19 15', 'mint')


def envelope():
    return rect(10, 17, 44, 34, 'coral', 4) + path('m11 20 21 17 21-17') + circle(32, 38, 5, 'yellow')


def bottle(color='mint'):
    return rect(25, 7, 14, 10, 'purple', 2) + path('M24 17h16v7q9 4 9 12v17H15V36q0-8 9-12Z', color) + rect(20, 33, 24, 14, 'paper', 2)


def mug(color='peach'):
    return path('M47 27h5c13 0 10 19-5 18', 'paper') + path('M14 23h33v21q0 10-10 10H24q-10 0-10-10Z', color) + line('M23 15v-5M34 15v-5')


def bowl():
    return path('M9 29h46q-2 23-23 23T9 29Z', 'mint') + path('M16 29q2-14 10-9 7-15 14-2 10-5 9 11', 'paper') + line('m41 12 14-5M43 18l14-5')


def card():
    return rect(9, 16, 46, 34, 'purple', 5) + rect(10, 24, 44, 7, 'blue', 0) + rect(17, 37, 9, 6, 'yellow', 1)


def train():
    return rect(16, 8, 32, 43, 'blue', 8) + rect(21, 18, 22, 17, 'paper', 3) + circle(24, 43, 2, 'yellow') + circle(40, 43, 2, 'yellow') + line('M23 51l-5 7M41 51l5 7M27 13h10')


def building():
    return rect(14, 10, 36, 46, 'mint') + ''.join(rect(x, y, 6, 6, 'blue', 1) for x in (21, 37) for y in (19, 32)) + rect(27, 45, 10, 11, 'paper', 1)


def brush():
    return rect(11, 10, 33, 13, 'mint') + path('M44 16h9v16H31v9') + rect(26, 40, 10, 17, 'peach')


def cap():
    return path('M15 27v16q17 12 34 0V27', 'purple') + path('M5 24 32 11l27 13-27 13Z', 'blue') + path('M54 27v17', stroke_width=2)


def faucet():
    return path('M10 24h21v-8h14v8h6q5 0 5 5v7H44v-3H10Z', 'mint') + path('M30 12h16M38 12v5') + path('M48 42q-11 13 0 15 11-2 0-15Z', 'blue')


def food():
    fork = path('M17 8v14q0 7 7 8v25h5V30q7-1 7-8V8h-5v14h-2V8h-5v14h-2V8Z', 'yellow')
    spoon = path('M43 30C28 27 33 7 43 7S58 27 43 30v25h-6V30', 'blue')
    return group(fork, 'rotate(-35 32 32)') + group(spoon, 'rotate(35 32 32)')


def wrench():
    return path('M42 9q-16-4-16 13l-16 22q-5 7 2 11 5 3 9-3l16-24q15 2 17-12l-10 7-8-8Z', 'purple')


def truck():
    return rect(7, 18, 31, 28, 'blue') + path('M38 27h11l8 12v7H38Z', 'peach') + path('M43 30v9h10', 'paper') + circle(18, 49, 5, 'ink') + circle(47, 49, 5, 'ink')


def tag():
    return path('M9 16h23l23 23-17 17L9 28Z', 'mint') + circle(19, 23, 2, 'paper')


def coins():
    return coin(23, 41, 12) + coin(40, 28, 13)


def chart():
    return rect(12, 35, 9, 19, 'mint', 2) + rect(27, 25, 9, 29, 'blue', 2) + rect(42, 13, 9, 41, 'purple', 2) + path('m10 27 15-9 11 2L53 8M44 8h9v9', stroke_width=2)


ICONS = {
    'receipt': document() + small(check()),
    'devices': rect(8, 13, 37, 29, 'blue') + path('m8 42-4 9h45l-4-9Z', 'purple') + rect(41, 25, 16, 30, 'peach') + line('M47 49h4'),
    'wealth': coin(24, 45, 11) + coin(43, 46, 10) + group(plant(), 'translate(6 -6) scale(.85)'),
    'home': house(), 'car': car(), 'cashback': coin(28, 33, 18) + small(arrow()),
    'shopping': rect(25, 15, 11, 17, 'peach', 2) + rect(39, 19, 11, 13, 'mint', 2) + cart(),
    'game': path('M18 20h28q8 0 10 12l3 15q1 12-9 5L40 44H24l-10 8Q4 59 5 47l3-15q2-12 10-12Z', 'purple') + path('M18 28v13M12 34h13') + circle(43, 29, 2, 'coral') + circle(49, 36, 2, 'mint'),
    'food': food(), 'transfer': envelope() + small(arrow()),
    'bus': rect(13, 8, 38, 44, 'mint', 7) + rect(18, 19, 28, 18, 'blue') + path('M32 19v18M21 13h22M20 55v3M44 55v3') + circle(22, 45, 2, 'yellow') + circle(42, 45, 2, 'yellow'),
    'child': circle(18, 15, 7, 'peach') + circle(46, 15, 7, 'peach') + circle(32, 29, 20, 'yellow') + circle(25, 26, 1.5, 'ink') + circle(39, 26, 1.5, 'ink') + path('M28 34q4 5 8 0') + small(heart()),
    'payment': rect(17, 7, 29, 49, 'mint') + rect(23, 15, 17, 14, 'blue', 1) + ''.join(circle(x,y,1,'ink') for x in (25,32,39) for y in (37,44)),
    'book': book(), 'gift': rect(13, 27, 38, 28, 'peach') + rect(9, 21, 46, 10, 'purple') + rect(28, 21, 8, 34, 'purple', 0) + path('M32 21C6 22 17-1 32 21 47-1 58 22 32 21Z', 'yellow'),
    'phone': rect(19, 7, 27, 50, 'purple', 5) + rect(23, 14, 19, 31, 'blue', 2) + circle(32, 51, 1.5, 'ink'),
    'medical': rect(9, 26, 46, 29, 'mint') + rect(20, 15, 24, 40, 'mint') + path('M29 18v-7h6v7h7v6h-7v7h-6v-7h-7v-6Z', 'coral') + rect(26, 40, 13, 15, 'blue', 1) + line('M14 35h7M44 35h6'),
    'company-reimbursement': briefcase() + small(check()), 'family-reimbursement': house() + small(check()),
    'balance': path('M32 10v43M17 54h30M13 22h38M19 22 9 41h20ZM45 22 35 41h20Z', 'yellow') + circle(32, 14, 4, 'purple'),
    'salary': envelope() + group(coin(), 'translate(9 -9) scale(.7)'), 'envelope': envelope(),
    'property': group(building(), 'translate(-5 7) scale(.85)') + group(building(), 'translate(26 0) scale(.65)'),
    'electricity': path('M35 5 13 35h17l-3 24 25-34H35Z', 'yellow'),
    'gas': path('M32 6Q34 19 45 25 63 41 45 54 14 68 11 42q-1-13 12-23 0 14 7 14 9-11 2-27Z', 'peach') + path('M33 32q-17 20 0 24 19-5 0-24Z', 'yellow'),
    'moving': truck() + group(box(), 'translate(5 8) scale(.45)'), 'renovation': brush(),
    'furniture': rect(15, 16, 34, 29, 'purple', 6) + rect(23, 23, 16, 13, 'yellow') + rect(8, 32, 48, 20, 'purple', 5) + path('M16 53v5M48 53v5M18 33v11h28V33'),
    'deposit': rect(10, 12, 42, 42, 'peach', 6) + rect(17, 19, 28, 28, 'paper') + circle(31, 33, 8, 'purple') + path('M31 25v16M23 33h16'),
    'fuel': rect(13, 9, 28, 44, 'yellow') + rect(18, 16, 18, 14, 'blue', 2) + path('M41 30h5v13q0 7 6 7t5-7V24l-9-9M10 54h34') + path('M49 17v10h8', 'peach'),
    'parking': rect(13, 23, 5, 32, 'mint', 1) + rect(47, 23, 5, 32, 'mint', 1) + path('m7 23 25-15 25 15Z', 'mint') + group(car(), 'translate(16 30) scale(.5)') + line('M9 56h47'),
    'toll': rect(11, 23, 19, 32, 'peach') + rect(15, 28, 11, 12, 'blue', 1) + path('m7 24 14-12 14 12Z', 'mint') + path('M42 55V22l15-12', stroke_width=4) + circle(42, 24, 3, 'coral'),
    'maintenance': car() + small(bottle('mint')), 'repair': car() + small(wrench()),
    'liquor-trade': bottle('paper') + small(arrow()),
    'supermarket': circle(22, 23, 8, 'coral') + path('M32 28 37 10l8 2-5 18', 'mint') + path('M9 28h46l-6 27H15Z', 'yellow') + line('M23 35v12M33 35v12M43 35v12'),
    'parcel': box(), 'liquor': bottle('peach') + group(path('M17 17h25v15q0 12-12 12T17 32ZM30 44v12M21 56h18','purple'), 'translate(27 17) scale(.62)'),
    'union-shopping': bag('mint') + small(heart()),
    'vacation': path('M10 54q22-13 44 0Z', 'yellow') + path('M30 50q8-17 5-26', stroke_width=4) + path('M35 25Q13 28 12 16q16-6 23 9Q32 4 49 8q8 14-14 17Q55 14 57 31q-10 8-22-6Z', 'mint') + circle(15, 10, 5, 'yellow'),
    'haircut': circle(16, 46, 7, 'mint') + circle(35, 48, 7, 'mint') + path('m20 40 26-30M32 41 18 11M45 15l9 36M49 22l8-2M51 29l8-2M53 36l8-2', stroke_width=2.7),
    'gathering': bowl() + path('M21 14v-6M30 13V6', stroke_width=2) + rect(8, 37, 7, 8, 'peach', 2) + rect(49, 37, 7, 8, 'peach', 2),
    'music': path('M12 37V29a20 20 0 0 1 40 0v8', stroke_width=4) + rect(8, 31, 12, 22, 'purple', 5) + rect(44, 31, 12, 22, 'purple', 5) + path('M34 26v16l-8 3v-9l8-3', 'coral'),
    'film': rect(10, 23, 44, 31, 'purple') + path('m9 17 42-9 3 12-42 9Z', 'paper') + line('m18 15 7 9M32 12l7 9M46 9l6 8') + path('m28 33 12 7-12 7Z', 'coral'),
    'groceries': path('m21 38 3-29 10 2-6 29', 'peach') + circle(42, 25, 12, 'mint') + path('M9 32h46l-6 23H15Z', 'yellow') + line('M23 38v10M33 38v10M43 38v10'),
    'breakfast': path('M14 24Q3 8 21 8h22q18 0 7 16v30H14Z', 'yellow') + path('M25 27c-13 2-10 21 4 20 17 10 26-16 9-20Z', 'paper') + circle(33, 35, 6, 'peach'),
    'lunch': bowl(), 'dinner': path('M10 44a22 22 0 0 1 44 0Z', 'purple') + path('M7 48h50M32 22v-6') + path('M42 7q0 12 12 11Q41 32 37 17Z', 'yellow'),
    'drink': path('M18 17h30l-4 38H22Z', 'blue') + path('M35 36V10l14-3', stroke_width=3) + circle(46, 26, 9, 'yellow') + line('M46 17v18M38 26h16'),
    'milk-tea': path('M15 20h34l-5 36H20Z', 'peach') + rect(13, 15, 38, 7, 'paper', 2) + path('m32 36 5-29', stroke_width=4) + ''.join(circle(x,y,2,'ink') for x,y in [(25,46),(35,49),(41,42),(28,39)]),
    'snack': path('M17 8h30l-3 24 3 24H17l3-24Z', 'yellow') + circle(32, 33, 11, 'peach') + ''.join(circle(x,y,1,'ink') for x,y in [(28,29),(37,32),(31,39)]),
    'fruit': path('M31 20q-14-10-21 6-5 20 14 29 9-2 16-13 6-20-9-22Z', 'coral') + path('M30 20Q28 6 41 8q3 10-11 12', 'mint') + path('M47 25q-4 14-10 19-5 12 8 13 18-1 13-13-9-8-11-19Z', 'yellow'),
    'repayment': card() + small(arrow()), 'metro': train(),
    'bike': circle(15, 43, 11, 'paper') + circle(49, 43, 11, 'paper') + path('m15 43 12-22 10 22H15l13-14h14l7 14M42 29l-4-15h7M23 21h10', stroke=C['green'], stroke_width=3),
    'charging': rect(12, 10, 29, 44, 'mint') + path('m30 17-12 17h10l-2 13 13-20H29Z', 'yellow') + path('M41 27h7v18q0 7 6 7t5-7V25M53 25V15M59 25V15'),
    'dha': bottle('peach') + path('M23 39q8-9 15 0-7 9-15 0l-4 5V34Z', 'blue'),
    'school-lunch': rect(9, 18, 46, 36, 'yellow', 7) + rect(15, 24, 21, 23, 'paper') + circle(45, 30, 5, 'mint') + circle(45, 43, 5, 'peach') + line('m15 11 36-5'),
    'reading': book() + small(path('M9 10h43v31H29L17 53V41H9Z', 'mint')),
    'bonus': path('m20 10 12 7 12-7v21H20Z', 'coral') + circle(32, 38, 17, 'yellow') + group(star(), 'translate(13 21) scale(.6)'),
    'side-job': briefcase() + small(document('blue')), 'commission': path('M9 48h21l15-10q5-7-2-9l-13 6H19M8 37h13l8 5', 'mint') + coin(42, 18, 10),
    'interest': coins() + group(plant(), 'translate(8 -6) scale(.68)'),
    'dividend': coin(32, 21, 13) + path('M32 35v9H14m0 0 6-6m-6 6 6 6M32 44h18m0 0-6-6m6 6-6 6', stroke=C['green'], stroke_width=3),
    'investment-gain': chart(), 'rental-income': house() + small(coin()), 'refund': bag('peach') + small(arrow()),
    'secondhand-sale': box() + small(tag()), 'royalty': document() + path('m26 44 23-31 7 5-23 31-9 5Z', 'purple'),
    'allowance': wallet() + small(heart()), 'pension': wallet() + path('M48 36V13q0-10 10-6', stroke=C['green'], stroke_width=4),
    'scholarship': cap() + small(coin()), 'business-income': house() + small(coins()), 'service-income': briefcase() + small(coin()),
    'cash-gift': envelope() + small(coin()), 'insurance-payout': shield() + small(coin()), 'tax-refund': document('blue') + small(arrow()),
    'lottery': path('M9 18h46v10q-10 4 0 10v12H9V38q10-4 0-10Z', 'yellow') + group(star(), 'translate(13 15) scale(.6)'),
    'income-account': wallet() + path('M34 8v19m-7-7 7 7 7-7', stroke=C['green'], stroke_width=3),
    'clothing': path('m21 12 11 6 11-6 15 14-10 10-5-4v24H21V32l-5 4L6 26Z', 'purple'),
    'beauty': group(bottle('peach'), 'translate(-1 0) scale(.8)') + rect(34, 34, 23, 21, 'purple') + rect(32, 30, 27, 8, 'paper'),
    'fitness': rect(9, 18, 10, 30, 'mint') + rect(45, 18, 10, 30, 'mint') + rect(19, 28, 26, 10, 'purple') + path('M5 25v16M59 25v16'),
    'pet': path('M15 41q17-27 34 0 13 21-17 10-30 11-17-10Z', 'yellow') + circle(13, 26, 5, 'peach') + circle(25, 15, 6, 'peach') + circle(40, 15, 6, 'peach') + circle(52, 26, 5, 'peach'),
    'coffee': mug(), 'takeout': bag('mint') + small(path('M7 19h45v28H7Z', 'peach') + circle(17,49,5,'ink') + circle(44,49,5,'ink')),
    'flight': path('m8 36 18-10 3-16q3-9 7 0l3 16 18 10v7l-18-4-2 12 7 4v5l-12-3-12 3v-5l7-4-2-12-17 4Z', 'blue'),
    'rail': train() + path('M27 27h10', stroke_width=1.5), 'taxi': car('yellow') + rect(25, 5, 14, 7, 'coral', 2),
    'hotel': building() + path('M10 12 32 5l22 7Z', 'purple'),
    'travel-luggage': rect(14, 16, 36, 37, 'purple', 5) + path('M25 16V8h14v8M23 26v18M41 26v18M20 54v5M44 54v5') + rect(39, 21, 15, 10, 'peach', 2),
    'water-bill': faucet(), 'internet': rect(9, 35, 46, 19, 'mint', 4) + path('M16 35V22M48 35V22M21 15q11-9 22 0M26 23q6-5 12 0') + circle(32, 29, 1.5, 'ink') + circle(18, 44, 1, 'coral') + line('M27 44h18'),
    'cleaning': path('M17 24h14l5 31H12ZM17 17h20v7H17ZM27 17V9h17v8l-9 5', 'mint') + rect(37, 36, 21, 19, 'yellow', 5),
    'appliance': rect(13, 9, 38, 46, 'mint', 5) + circle(32, 36, 13, 'purple') + path('M21 38q10 6 22-2', 'blue') + line('M20 17h9') + circle(43, 17, 1.5, 'coral'),
    'education': group(book(), 'translate(5 24) scale(.85 .6)') + group(cap(), 'translate(5 0) scale(.85)'),
    'stationery': path('m20 40-5-28 7-2 6 30M32 41l8-33 7 2-7 33', 'mint') + path('M13 30h38l-5 26H18Z', 'peach') + path('M42 31V13h9v18M46 18h5M46 24h5', 'purple'),
    'insurance': shield() + group(heart(), 'translate(15 15) scale(.53)'), 'loan': house() + small(card()),
    'charity': heart() + path('M8 45q10 0 24 13 14-13 24-13', stroke=C['green'], stroke_width=4),
    'membership': card() + group(star(), 'translate(23 19) scale(.55)'),
    'feige-wedding': circle(25, 31, 14, 'yellow') + circle(25, 31, 9, 'paper') + circle(40, 36, 14, 'yellow') + circle(40, 36, 9, 'paper') + group(heart(), 'translate(26 0) scale(.45)'),
    'wedding-banquet': path('M13 11h16v15q0 10-8 10t-8-10ZM37 11h16v15q0 10-8 10t-8-10Z', 'peach') + path('M21 36v17M13 53h16M45 36v17M37 53h16') + path('M14 22h14M38 22h14', stroke=C['coral'], stroke_width=3) + group(heart(), 'translate(23 35) scale(.3)'),
    'balance-adjustment': document('blue') + small(check()) + path('M19 14h11M24 9v10', stroke=C['green'], stroke_width=2.5),
    'home-living': house() + small(path('M11 22h42l-5 30H16Z', 'purple') + path('M21 22V13h23v9M24 31v12M39 31v12')),
    'shoes': path('M12 18h13l4 13 21 8q7 2 7 12H8V33Z', 'mint') + path('M8 46h49v7H8Z', 'paper') + path('m30 31-5 6m13-3-5 6m13-3-5 6', stroke_width=1.8),
    'everyday-clothes': path('m21 12 11 6 11-6 15 14-10 10-5-4v24H21V32l-5 4L6 26Z', 'peach') + path('M25 14q7 12 14 0M22 46h20', stroke_width=1.6),
    'handbag': path('M15 24h34l6 30H9Z', 'purple') + path('M23 24V17a9 9 0 0 1 18 0v7') + path('M14 29q18 14 36 0', 'peach') + rect(28, 34, 8, 7, 'yellow', 1),
    'other-reimbursement': document('mint') + small(wallet()),
}

# Independent merchant recognition marks, not official logos. Keep text to one
# large glyph (matching the previous presets), with differentiated shop forms.
MERCHANTS = [
    ('taobao', '淘', 'peach'), ('tmall', '猫', 'coral'), ('jd', '京', 'coral'),
    ('pinduoduo', '拼', 'peach'), ('douyin-shop', '抖', 'purple'), ('kuaishou-shop', '快', 'peach'),
    ('vipshop', '唯', 'purple'), ('suning', '苏', 'yellow'), ('mi-shop', '米', 'peach'),
    ('dewu', '物', 'mint'), ('xianyu', '闲', 'yellow'), ('yanxuan', '严', 'paper'),
    ('sams', 'S', 'blue'), ('walmart', '沃', 'blue'), ('hema', '盒', 'blue'),
    ('pupu', '朴', 'mint'), ('yonghui', '永', 'coral'), ('rtmart', '润', 'peach'),
    ('vanguard', '华', 'mint'), ('rainbow', '虹', 'purple'), ('metro-store', '麦', 'blue'),
    ('costco', 'C', 'coral'), ('pangdonglai', '胖', 'purple'), ('carrefour', '家', 'blue'),
    ('parknshop', '百', 'mint'), ('jiarong', '嘉', 'peach'), ('lawson', '罗', 'blue'),
    ('familymart', '全', 'mint'), ('seven-eleven', '7', 'peach'), ('meiyijia', '美', 'coral'),
]


def merchant(index, mark, color):
    if index < 12:
        body = bag(color)
        y = 40
    elif index < 26:
        body = rect(9, 29, 46, 26, color) + path('M14 11h36l7 18H7Z', 'paper') + path('M18 11 15 29M29 11v18M40 11l3 18M50 11l6 18', stroke=C[color], stroke_width=5)
        y = 43
    else:
        body = rect(10, 25, 44, 30, color) + rect(7, 15, 50, 12, 'paper') + rect(22, 36, 20, 19, 'paper', 2)
        y = 46
    # The Web rasterizes the mark into the saved PNG, using the same system
    # font stack as the previous presets. Mobile never needs this SVG font.
    return body + f'<text x="32" y="{y}" text-anchor="middle" dominant-baseline="central" stroke="none" fill="{C["ink"]}" font-family="Microsoft YaHei,Arial,sans-serif" font-size="18" font-weight="700">{mark}</text>'


for i, (name, mark, color) in enumerate(MERCHANTS):
    ICONS['merchant-' + name] = merchant(i, mark, color)


def svg(body):
    return '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 64 64"><g stroke="' + C['ink'] + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' + body + '</g></svg>\n'


def main():
    catalog = (FEATURE / 'catalog.ts').read_text(encoding='utf-8')
    entries = re.findall(r'id: "([^"]+)", (?:merchantGroup: "[^"]+", )?label: "([^"]+)"', catalog)
    assert len(entries) == len(ICONS) and {x[0] for x in entries} == set(ICONS), 'Catalog and illustrations must match exactly'
    DEST.mkdir(parents=True, exist_ok=True)
    REVIEW.mkdir(parents=True, exist_ok=True)
    for key, _ in entries:
        (DEST / f'{key}.svg').write_text(svg(ICONS[key]), encoding='utf-8')
    cards = ''.join(f'<article><img src="../../../frontend/packages/web-features/src/features/sean_category-icons/assets/pastel-vector-v2/{key}.svg"><p>{html.escape(label)}</p><small>{key}</small><div class="sizes"><img width="42" height="42" src="../../../frontend/packages/web-features/src/features/sean_category-icons/assets/pastel-vector-v2/{key}.svg"><img width="32" height="32" src="../../../frontend/packages/web-features/src/features/sean_category-icons/assets/pastel-vector-v2/{key}.svg"></div></article>' for key, label in entries)
    review = '<!doctype html><html lang="zh-CN"><meta charset="UTF-8"><title>柔彩分类图标 · 130 项</title><style>body{margin:0;padding:32px;background:#f5f7fa;color:#40566f;font-family:"Microsoft YaHei",sans-serif}h1{font-size:24px;margin:0 0 8px}header{margin-bottom:24px}main{display:grid;grid-template-columns:repeat(10,minmax(0,1fr));gap:12px}article{background:white;border-radius:16px;padding:14px 4px;text-align:center}article>img{width:88px;height:88px}p{margin:8px 0 4px;font-size:13px}small{font-size:9px;color:#7a8795}.sizes{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:8px}@media(max-width:900px){main{grid-template-columns:repeat(5,minmax(0,1fr))}}@media(prefers-color-scheme:dark){body{background:#172230;color:#ecf1f8}article{background:#263447}}</style><header><h1>柔彩分类图标</h1><p>130 项 · 原尺寸预览 / 42px / 32px · 商家为自制识别图形</p></header><main>' + cards + '</main></html>'
    review = review.replace('130 项', f'{len(entries)} 项')
    (REVIEW / 'index.html').write_text(review, encoding='utf-8')
    (REVIEW / 'manifest.json').write_text(json.dumps({'version': 'pastel-vector-v2', 'source': 'Original SVG geometry; approved imagegen style reference', 'palette': C, 'icons': [{'id': key, 'label': label} for key, label in entries]}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Built {len(entries)} SVGs and review sheet: {REVIEW}')


if __name__ == '__main__':
    main()
