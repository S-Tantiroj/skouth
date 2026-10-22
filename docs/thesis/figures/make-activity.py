# ภาพที่ 3-2 ถึง 3-7 — Activity Diagram แบบ UML พร้อม Swimlane
# ลำดับขั้นตอนร่างจากโค้ดจริง (อ้างไฟล์ไว้ในแต่ละผัง) · ข้อความภาษาไทย → แทรก .svg ลง Word ตรงๆ
# รัน: python docs/thesis/figures/make-activity.py → fig3-2 … fig3-7-activity-*.svg
#   python make-activity.py --fluid   → ไฟล์ที่ปรับขนาดตามหน้าต่าง (ใช้ตรวจภาพเท่านั้น)
import io, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
FONT = "'TH Sarabun New', 'TH SarabunPSK', Sarabun, Tahoma, sans-serif"
FS, LH = 17, 21                 # ขนาดตัวอักษรในกล่อง · ระยะบรรทัด
COLW = {'m': 300, 'e': 64}      # คอลัมน์หลัก · คอลัมน์จุดสิ้นสุดของกิ่งผิดพลาด
AW, DW, DH = 250, 190, 80       # กว้างกล่องกิจกรรม · กว้าง/สูงข้าวหลามตัด
GAP, HEADH, PAD = 34, 40, 14

def esc(s): return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')

class Act:
    def __init__(s, lanes, cols):
        s.lanes, s.cols, s.nodes, s.edges = lanes, cols, {}, []
    def n(s, id, kind, col, row, text=''):
        s.nodes[id] = dict(kind=kind, col=col, row=row, text=text)
    def e(s, a, b, label=None, exit=None, pts=None, lpos=None):
        s.edges.append(dict(a=a, b=b, label=label, exit=exit, pts=pts, lpos=lpos))

    # ---------- layout ----------
    def layout(s):
        xs, x = [], PAD
        for c in s.cols: xs.append(x); x += COLW[c]
        s.W = x + PAD
        s.cx = [xs[i] + COLW[c]/2 for i, c in enumerate(s.cols)]
        s.cl = xs
        rows = max(n['row'] for n in s.nodes.values()) + 1
        rh = [0]*rows
        for n in s.nodes.values():
            k = n['kind']
            n['w'] = AW if k == 'act' else DW if k == 'dec' else 26
            n['h'] = (16 + LH*len(n['text'].split('\n'))) if k == 'act' else DH if k == 'dec' else 26
            rh[n['row']] = max(rh[n['row']], n['h'])
        ys, y = [], PAD + HEADH + 22
        for h in rh: ys.append(y); y += h + GAP
        s.H = y + 4
        for n in s.nodes.values():
            n['x'] = s.cx[n['col']]; n['y'] = ys[n['row']] + rh[n['row']]/2
            n['rowtop'] = ys[n['row']]
    def P(s, id, side):
        n = s.nodes[id]; x, y, w, h = n['x'], n['y'], n['w'], n['h']
        return {'T': (x, y-h/2), 'B': (x, y+h/2), 'L': (x-w/2, y), 'R': (x+w/2, y)}[side]

    # ---------- draw ----------
    def svg(s, fluid=False):
        s.layout(); o = []
        # lanes
        for title, c0, c1 in s.lanes:
            x0 = s.cl[c0]; x1 = s.cl[c1] + COLW[s.cols[c1]]
            o.append(f'<rect x="{x0}" y="{PAD}" width="{x1-x0}" height="{HEADH}" fill="#e6e6e6" stroke="#000" stroke-width="1.5"/>')
            o.append(f'<text x="{(x0+x1)/2}" y="{PAD+HEADH/2+1}" font-family="{FONT}" font-size="21" font-weight="bold" text-anchor="middle" dominant-baseline="middle">{esc(title)}</text>')
            o.append(f'<rect x="{x0}" y="{PAD}" width="{x1-x0}" height="{s.H-PAD}" fill="none" stroke="#000" stroke-width="1.5"/>')
        # edges first (กล่องทับปลายเส้นได้สวยกว่า)
        for e in s.edges:
            pts = e['pts'](s) if callable(e['pts']) else s.route(e)
            o.append('<polyline points="' + ' '.join(f'{x:.1f},{y:.1f}' for x, y in pts) + '" fill="none" stroke="#000" stroke-width="1.4"/>')
            (x1, y1), (x2, y2) = pts[-2], pts[-1]
            dx, dy = x2-x1, y2-y1; L = (dx*dx+dy*dy) ** .5 or 1; ux, uy = dx/L, dy/L
            a = (x2-ux*11-uy*5.5, y2-uy*11+ux*5.5); b = (x2-ux*11+uy*5.5, y2-uy*11-ux*5.5)
            o.append(f'<polygon points="{x2:.1f},{y2:.1f} {a[0]:.1f},{a[1]:.1f} {b[0]:.1f},{b[1]:.1f}" fill="#000"/>')
            if e['label']:
                lx, ly, anc = e['lpos'](s) if e['lpos'] else s.lp(pts, e)
                o.append(f'<text x="{lx:.1f}" y="{ly:.1f}" font-family="{FONT}" font-size="15" text-anchor="{anc}" dominant-baseline="middle" fill="#000">{esc(e["label"])}</text>')
        # nodes
        for n in s.nodes.values():
            x, y, w, h, k = n['x'], n['y'], n['w'], n['h'], n['kind']
            if k == 'start':
                o.append(f'<circle cx="{x}" cy="{y}" r="12" fill="#000"/>')
            elif k == 'end':
                o.append(f'<circle cx="{x}" cy="{y}" r="13" fill="#fff" stroke="#000" stroke-width="2"/><circle cx="{x}" cy="{y}" r="8" fill="#000"/>')
            elif k == 'act':
                o.append(f'<rect x="{x-w/2}" y="{y-h/2}" width="{w}" height="{h}" rx="14" fill="#fff" stroke="#000" stroke-width="1.6"/>')
                s.lines(o, x, y, n['text'], FS)
            else:
                o.append(f'<polygon points="{x},{y-h/2} {x+w/2},{y} {x},{y+h/2} {x-w/2},{y}" fill="#fff" stroke="#000" stroke-width="1.6"/>')
                s.lines(o, x, y, n['text'], 14)
        size = 'width="100%"' if fluid else f'width="{s.W}" height="{s.H}"'
        return (f'<svg xmlns="http://www.w3.org/2000/svg" {size} viewBox="0 0 {s.W} {s.H}">'
                f'<rect width="{s.W}" height="{s.H}" fill="#fff"/>\n' + '\n'.join(o) + '\n</svg>')
    def lines(s, o, x, y, text, fs):
        ls = text.split('\n'); lh = fs + 4
        for i, l in enumerate(ls):
            yy = y + (i - (len(ls)-1)/2) * lh + 1
            o.append(f'<text x="{x}" y="{yy:.1f}" font-family="{FONT}" font-size="{fs}" text-anchor="middle" dominant-baseline="middle">{esc(l)}</text>')

    def route(s, e):
        a, b = s.nodes[e['a']], s.nodes[e['b']]
        if a['kind'] == 'dec' and e['exit'] in ('L', 'R'):
            p = s.P(e['a'], e['exit'])
            if b['row'] == a['row']: return [p, s.P(e['b'], 'L' if e['exit'] == 'R' else 'R')]
            return [p, (b['x'], p[1]), s.P(e['b'], 'T')]
        if a['col'] == b['col']: return [s.P(e['a'], 'B'), s.P(e['b'], 'T')]
        if a['row'] == b['row']:
            side = 'R' if b['x'] > a['x'] else 'L'
            return [s.P(e['a'], side), s.P(e['b'], 'L' if side == 'R' else 'R')]
        p = s.P(e['a'], 'B'); t = s.P(e['b'], 'T'); ty = b['rowtop'] - 16
        return [p, (p[0], ty), (t[0], ty), t]
    def lp(s, pts, e):
        (x1, y1), (x2, y2) = pts[0], pts[1]
        if abs(y2 - y1) < 1:   # ออกด้านข้าง → ข้อความเหนือเส้น
            return ((x1 + 6, y1 - 12, 'start') if x2 > x1 else (x1 - 6, y1 - 12, 'end'))
        # ออกด้านล่าง → ข้อความซ้ายของเส้น เพราะเส้นที่มาบรรจบมักเข้าทางขวา
        # ยกเว้นคอลัมน์แรกที่ด้านซ้ายติดขอบ lane
        a = s.nodes[e['a']]
        return (x1 + 8, y1 + 16, 'start') if a['col'] == 0 else (x1 - 8, y1 + 16, 'end')

M, E = 'm', 'e'
figs = {}

# =============== 3-2 เข้าสู่ระบบและการอนุมัติบัญชี ===============
# signup/page.tsx · login/page.tsx · auth/confirm/page.tsx · lib/auth/profileGate.ts · api/admin/users/[id]/status
# บัญชีถูกสร้างเป็น "รออนุมัติ" ตั้งแต่ลงทะเบียน (trigger บน auth.users) ไม่ใช่หลังยืนยันอีเมล
d = Act([('ผู้ใช้', 0, 0), ('ระบบ', 1, 3), ('ผู้ดูแลระบบ', 4, 4)], [M, M, M, E, M])
d.n('s', 'start', 0, 0)
d.n('a1', 'act', 0, 1, 'กรอกอีเมลและรหัสผ่าน\nเพื่อลงทะเบียน')
d.n('s1', 'act', 1, 2, 'สร้างบัญชีสถานะ "รออนุมัติ"\nส่งอีเมลยืนยัน และแจ้งว่า\nได้รับคำขอลงทะเบียนแล้ว')
d.n('a2', 'act', 0, 3, 'กดลิงก์ยืนยันในอีเมล')
d.n('s2', 'act', 1, 4, 'ยืนยันอีเมล\nและแจ้งว่ารอการอนุมัติ')
d.n('ad1', 'act', 4, 5, 'เปิดคิวบัญชีที่รออนุมัติ\nพร้อมสถานะการยืนยันอีเมล')
d.n('ad2', 'act', 4, 6, 'อนุมัติหรือปฏิเสธบัญชี')
d.n('s3', 'act', 1, 7, 'บันทึกสถานะบัญชี\nและบันทึกกิจกรรม')
d.n('a3', 'act', 0, 8, 'กรอกอีเมลและรหัสผ่าน\nเพื่อเข้าสู่ระบบ')
d.n('d1', 'dec', 1, 9, 'ยืนยันตัวตน\nสำเร็จหรือไม่')
d.n('f1', 'act', 2, 9, 'แจ้งข้อผิดพลาด เช่น\nรหัสผ่านไม่ถูกต้อง\nหรือยังไม่ยืนยันอีเมล')
d.n('x1', 'end', 3, 9)
d.n('s4', 'act', 1, 10, 'อ่านบทบาทและสถานะบัญชี')
d.n('d2', 'dec', 1, 11, 'บัญชีได้รับ\nการอนุมัติหรือไม่')
d.n('f2', 'act', 2, 11, 'ออกจากระบบ\nและแจ้งสถานะบัญชี')
d.n('x2', 'end', 3, 11)
d.n('s5', 'act', 1, 12, 'เข้าสู่หน้าแดชบอร์ด')
d.n('x3', 'end', 1, 13)
for a, b in (('s','a1'),('a1','s1'),('s1','a2'),('a2','s2'),('s2','ad1'),('ad1','ad2'),('ad2','s3'),
             ('s3','a3'),('a3','d1'),('f1','x1'),('s4','d2'),('f2','x2'),('s5','x3')): d.e(a, b)
d.e('d1', 'f1', '[ไม่สำเร็จ]', 'R'); d.e('d1', 's4', '[สำเร็จ]')
d.e('d2', 'f2', '[ไม่ได้รับ]', 'R'); d.e('d2', 's5', '[ได้รับ]')
figs['fig3-2-activity-login'] = d

# =============== 3-3 นำเข้าข้อมูลผู้สมัคร ===============
# api/ingest/route.ts · lib/ingest/upsert.ts
d = Act([('ผู้จัดการข้อมูล', 0, 0), ('ระบบ', 1, 3)], [M, M, M, E])
d.n('s', 'start', 0, 0)
d.n('a1', 'act', 0, 1, 'เลือกไฟล์ CSV และชนิดไฟล์\nแล้วกดนำเข้า')
d.n('d0', 'dec', 1, 2, 'มีสิทธิ์ผู้จัดการ\nข้อมูลหรือไม่')
d.n('f0', 'act', 2, 2, 'ปฏิเสธคำขอ\nก่อนประมวลผลใด ๆ')
d.n('x0', 'end', 3, 2)
d.n('s1', 'act', 1, 3, 'อ่านไฟล์ จับคู่ชื่อคอลัมน์\nและทำความสะอาดข้อมูล')
d.n('d1', 'dec', 1, 4, 'อยู่ในรายชื่อ\nผู้ขอระงับหรือไม่')
d.n('k1', 'act', 2, 4, 'ข้ามรายการนี้\nไม่บันทึกสิ่งใด')
d.n('s2', 'act', 1, 5, 'สร้างเวกเตอร์ความหมาย\n768 มิติ')
d.n('d2', 'dec', 1, 6, 'มีผู้สมัครนี้\nอยู่แล้วหรือไม่')
d.n('s3', 'act', 1, 7, 'เพิ่มผู้สมัครใหม่')
d.n('s4', 'act', 2, 7, 'ปรับปรุงข้อมูลเดิม')
d.n('s5', 'act', 1, 8, 'บันทึกการศึกษา\nประสบการณ์ และทักษะ')
d.n('d3', 'dec', 1, 9, 'ครบทุกรายการ\nหรือยัง')
d.n('s6', 'act', 1, 10, 'บันทึกกิจกรรม และแสดงจำนวน\nที่เพิ่ม ปรับปรุง ข้าม ผิดพลาด')
d.n('x1', 'end', 1, 11)
for a, b in (('s','a1'),('a1','d0'),('f0','x0'),('s1','d1'),('s2','d2'),('s3','s5'),('s4','s5'),('s5','d3'),('s6','x1')): d.e(a, b)
d.e('d0', 'f0', '[ไม่มี]', 'R'); d.e('d0', 's1', '[มี]')
d.e('d1', 'k1', '[อยู่]', 'R'); d.e('d1', 's2', '[ไม่อยู่]')
d.e('d2', 's4', '[มี]', 'R'); d.e('d2', 's3', '[ไม่มี]')
d.e('d3', 's6', '[ครบ]')
d.e('k1', 'd3', pts=lambda g: [g.P('k1','R'), (g.P('k1','R')[0]+16, g.P('k1','R')[1]),
                                (g.P('k1','R')[0]+16, g.P('d3','R')[1]), g.P('d3','R')])
d.e('d3', 'd1', '[ยัง]', pts=lambda g: [g.P('d3','L'), (g.cl[1]+8, g.P('d3','L')[1]),
                                        (g.cl[1]+8, g.P('d1','L')[1]), g.P('d1','L')])
figs['fig3-3-activity-import'] = d

# =============== 3-4 ค้นหาและคัดกรองผู้สมัคร ===============
# search/page.tsx · api/search/parse · api/search · lib/search/*
d = Act([('ผู้ใช้', 0, 0), ('ระบบ', 1, 3)], [M, M, M, E])
d.n('s', 'start', 0, 0)
d.n('a1', 'act', 0, 1, 'พิมพ์คำค้นหาภาษาธรรมชาติ\nแล้วกดค้นหา')
d.n('d0', 'dec', 1, 2, 'เข้าสู่ระบบ\nอยู่หรือไม่')
d.n('f0', 'act', 2, 2, 'แจ้งให้เข้าสู่ระบบใหม่')
d.n('x0', 'end', 3, 2)
d.n('s1', 'act', 1, 3, 'ให้ AI สกัดคำอธิบายและตัวกรอง\n(เรียกแบบจำลอง 1 ครั้ง)')
d.n('d1', 'dec', 1, 4, 'สกัดสำเร็จ\nหรือไม่')
d.n('f1', 'act', 2, 4, 'ใช้ข้อความเดิม\nโดยไม่มีตัวกรอง')
d.n('s2', 'act', 1, 5, 'รวมตัวกรองของ AI\nกับตัวกรองของผู้ใช้')
d.n('s3', 'act', 1, 6, 'แปลงคำอธิบายเป็นเวกเตอร์\n(ใช้ค่าที่เก็บไว้ถ้ามี)')
d.n('s4', 'act', 1, 7, 'กรองเงื่อนไขในฐานข้อมูล\nแล้วจัดอันดับด้วยระยะโคไซน์')
d.n('d2', 'dec', 1, 8, 'ค้นหาสำเร็จ\nหรือไม่')
d.n('f2', 'act', 2, 8, 'แจ้งว่าค้นหาไม่สำเร็จ')
d.n('x2', 'end', 3, 8)
d.n('d3', 'dec', 1, 9, 'พบผู้สมัคร\nหรือไม่')
d.n('f3', 'act', 2, 9, 'แจ้งว่าไม่พบผู้สมัคร\nและตัวกรองที่ไม่ได้ใช้')
d.n('x3', 'end', 3, 9)
d.n('s5', 'act', 1, 10, 'แสดงผลเรียงตามความใกล้เคียง\nพร้อมคะแนน 0–100')
d.n('d4', 'dec', 0, 11, 'แก้ตัวกรอง\nหรือไม่')
d.n('x4', 'end', 0, 12)
for a, b in (('s','a1'),('a1','d0'),('f0','x0'),('s1','d1'),('f1','s2'),('s2','s3'),('s3','s4'),('s4','d2'),
             ('f2','x2'),('f3','x3'),('s5','d4')): d.e(a, b)
d.e('d0', 'f0', '[ไม่]', 'R'); d.e('d0', 's1', '[ใช่]')
d.e('d1', 'f1', '[ไม่สำเร็จ]', 'R'); d.e('d1', 's2', '[สำเร็จ]')
d.e('d2', 'f2', '[ไม่สำเร็จ]', 'R'); d.e('d2', 'd3', '[สำเร็จ]')
d.e('d3', 'f3', '[ไม่พบ]', 'R'); d.e('d3', 's5', '[พบ]')
d.e('d4', 'x4', '[ไม่แก้]')
d.e('d4', 's2', '[แก้ตัวกรอง — ไม่เรียก AI ซ้ำ]', pts=lambda g: [g.P('d4','L'), (g.cl[0]+10, g.P('d4','L')[1]),
                                (g.cl[0]+10, g.P('s2','L')[1]), g.P('s2','L')],
    lpos=lambda g: (g.cl[0]+16, g.P('s2','L')[1]-12, 'start'))
figs['fig3-4-activity-search'] = d

# =============== 3-5 ประเมินความเหมาะสมของผู้สมัคร ===============
# components/AnalyzePanel.tsx · api/analyze · lib/gemini/score.ts
d = Act([('ผู้ใช้', 0, 0), ('ระบบ', 1, 3)], [M, M, M, E])
d.n('s', 'start', 0, 0)
d.n('a1', 'act', 0, 1, 'เปิดหน้ารายละเอียดผู้สมัคร')
d.n('a2', 'act', 0, 2, 'กรอกความต้องการของตำแหน่งงาน\nแล้วกดประเมิน')
d.n('s1', 'act', 1, 3, 'คำนวณค่าแฮช\nของข้อความความต้องการ')
d.n('d1', 'dec', 1, 4, 'เคยประเมินด้วย\nความต้องการนี้หรือไม่')
d.n('c1', 'act', 2, 4, 'คืนผลเดิม\nโดยไม่เรียก AI')
d.n('s2', 'act', 1, 5, 'ส่งข้อมูลผู้สมัคร\nและความต้องการให้ AI ประเมิน')
d.n('d2', 'dec', 1, 6, 'AI ตอบภายในเวลา\nที่กำหนดหรือไม่')
d.n('f2', 'act', 2, 6, 'แจ้งให้ลองใหม่\nและไม่บันทึกผล')
d.n('x2', 'end', 3, 6)
d.n('s3', 'act', 1, 7, 'บันทึกคะแนนและเหตุผล\nเพื่อใช้ซ้ำ')
d.n('s4', 'act', 1, 8, 'แสดงคะแนน 0–100\nและเหตุผลภาษาไทย')
d.n('a3', 'act', 0, 9, 'อ่านผลการประเมิน')
d.n('x3', 'end', 0, 10)
for a, b in (('s','a1'),('a1','a2'),('a2','s1'),('s1','d1'),('s2','d2'),('f2','x2'),('s3','s4'),('s4','a3'),('a3','x3')): d.e(a, b)
d.e('d1', 'c1', '[เคย]', 'R'); d.e('d1', 's2', '[ยังไม่เคย]')
d.e('d2', 'f2', '[ไม่ตอบ]', 'R'); d.e('d2', 's3', '[ตอบ]')
# เส้น "คืนผลเดิม" อ้อมด้านนอกจุดสิ้นสุดของกิ่ง AI ไม่ตอบ เพื่อไม่ตัดกับลูกศรเข้าจุดนั้น
d.e('c1', 's4', pts=lambda g: [g.P('c1','R'), (g.cx[3]+22, g.P('c1','R')[1]),
                                (g.cx[3]+22, g.P('s4','R')[1]), g.P('s4','R')])
figs['fig3-5-activity-assess'] = d

# =============== 3-6 จัดการ Shortlist ===============
# components/SaveToShortlist.tsx · lib/shortlists/saveState.ts
d = Act([('ผู้ใช้', 0, 0), ('ระบบ', 1, 3)], [M, M, M, E])
d.n('s', 'start', 0, 0)
d.n('a1', 'act', 0, 1, 'กดปุ่มบันทึกที่ผลการค้นหา\nหรือหน้ารายละเอียดผู้สมัคร')
d.n('s1', 'act', 1, 2, 'แสดงรายการ Shortlist ของผู้ใช้\nพร้อมติ๊กรายการที่อยู่แล้ว')
d.n('d1', 'dec', 0, 3, 'ผู้ใช้ทำอะไร')
d.n('a2', 'act', 0, 4, 'พิมพ์ชื่อรายการใหม่\nแล้วกดสร้าง')
d.n('t1', 'act', 2, 4, 'เพิ่มหรือนำผู้สมัครออก\nจากรายการที่เลือก')
d.n('s2', 'act', 1, 5, 'ตรวจชื่อ 1–60 ตัวอักษร\nสร้างรายการและเพิ่มผู้สมัคร')
d.n('d2', 'dec', 1, 6, 'บันทึกสำเร็จ\nหรือไม่')
d.n('f2', 'act', 2, 6, 'แจ้งเหตุผล และ\nไม่เปลี่ยนเครื่องหมายติ๊ก')
d.n('x2', 'end', 3, 6)
d.n('s3', 'act', 1, 7, 'เปลี่ยนเครื่องหมายติ๊ก\nและบันทึกกิจกรรม')
d.n('d3', 'dec', 0, 8, 'ทำรายการต่อ\nหรือไม่')
d.n('x3', 'end', 0, 9)
for a, b in (('s','a1'),('a1','s1'),('s1','d1'),('a2','s2'),('s2','d2'),('t1','d2'),('f2','x2'),('s3','d3')): d.e(a, b)
d.e('d1', 't1', '[ติ๊กเพิ่มหรือติ๊กออก]', 'R', lpos=lambda g: (g.cl[1]+12, g.P('d1','R')[1]-12, 'start')); d.e('d1', 'a2', '[สร้างรายการใหม่]')
d.e('d2', 'f2', '[ไม่สำเร็จ]', 'R'); d.e('d2', 's3', '[สำเร็จ]')
d.e('d3', 'x3', '[ปิดแผง]')
d.e('d3', 'd1', '[ทำต่อ]', pts=lambda g: [g.P('d3','L'), (g.cl[0]+10, g.P('d3','L')[1]),
                                        (g.cl[0]+10, g.P('d1','L')[1]), g.P('d1','L')],
    lpos=lambda g: (g.cl[0]+16, g.P('d3','L')[1]-12, 'start'))
figs['fig3-6-activity-shortlist'] = d

# =============== 3-7 ประเมินโปรไฟล์ของตนเอง ===============
# SelfAssessmentStart · ProfileForm · api/self-assessment/parse · api/self-assessment
d = Act([('ผู้ใช้', 0, 0), ('ระบบ', 1, 3)], [M, M, M, E])
d.n('s', 'start', 0, 0)
d.n('d0', 'dec', 0, 1, 'เลือกวิธีกรอก\nข้อมูล')
d.n('a1', 'act', 0, 2, 'เลือกไฟล์ประวัติย่อ PDF')
d.n('s1', 'act', 1, 3, 'ให้ AI อ่านไฟล์แล้วสกัดเป็นร่าง\nไม่สกัดข้อมูลอ่อนไหว')
d.n('d1', 'dec', 1, 4, 'อ่านไฟล์สำเร็จ\nหรือไม่')
d.n('f1', 'act', 2, 4, 'แจ้งข้อผิดพลาด\nและเสนอให้กรอกเอง')
d.n('s2', 'act', 1, 5, 'แสดงแบบฟอร์มให้ตรวจสอบ\n(ยังไม่บันทึกข้อมูล)')
d.n('a2', 'act', 0, 6, 'ตรวจสอบ แก้ไข\nแล้วกดยืนยัน')
d.n('d2', 'dec', 1, 7, 'ข้อมูลถูกต้อง\nหรือไม่')
d.n('f2', 'act', 2, 7, 'แจ้งช่องที่ต้องแก้ไข')
d.n('s3', 'act', 1, 8, 'วิเคราะห์ด้วย AI สร้างเวกเตอร์\nและบันทึกในคำขอเดียว')
d.n('d3', 'dec', 1, 9, 'ทุกขั้นตอน\nสำเร็จหรือไม่')
d.n('f3', 'act', 2, 9, 'แจ้งข้อผิดพลาด\nไม่บันทึกข้อมูลใดเลย')
d.n('x3', 'end', 3, 9)
d.n('s4', 'act', 1, 10, 'แสดงผลวิเคราะห์ และจัดอันดับ\nตำแหน่งงานที่เหมาะสม')
d.n('a3', 'act', 0, 11, 'ดูผลวิเคราะห์\nและตำแหน่งงานที่แนะนำ')
d.n('x4', 'end', 0, 12)
for a, b in (('s','d0'),('a1','s1'),('s1','d1'),('s2','a2'),('a2','d2'),('s3','d3'),('f3','x3'),('s4','a3'),('a3','x4')): d.e(a, b)
d.e('d0', 'a1', '[อัปโหลดไฟล์]')
d.e('d0', 's2', '[กรอกเอง]', pts=lambda g: [g.P('d0','L'), (g.cl[0]+10, g.P('d0','L')[1]),
                                          (g.cl[0]+10, g.P('s2','L')[1]), g.P('s2','L')],
    lpos=lambda g: (g.cl[0]+16, g.P('s2','L')[1]-12, 'start'))
d.e('d1', 'f1', '[ไม่สำเร็จ]', 'R'); d.e('d1', 's2', '[สำเร็จ]')
d.e('f1', 's2', pts=lambda g: [g.P('f1','B'), (g.P('f1','B')[0], g.P('s2','R')[1]), g.P('s2','R')])
d.e('d2', 'f2', '[ไม่ถูกต้อง]', 'R'); d.e('d2', 's3', '[ถูกต้อง]')
d.e('f2', 'a2', pts=lambda g: [g.P('f2','T'), (g.P('f2','T')[0], g.P('a2','R')[1]), g.P('a2','R')])
d.e('d3', 'f3', '[ไม่สำเร็จ]', 'R'); d.e('d3', 's4', '[สำเร็จ]')
figs['fig3-7-activity-self-assessment'] = d

fluid = '--fluid' in sys.argv
for name, g in figs.items():
    io.open(os.path.join(HERE, name + '.svg'), 'w', encoding='utf-8').write(g.svg(fluid))
    print('wrote', name + '.svg', f'{g.W}x{g.H:.0f}')
