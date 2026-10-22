# ภาพที่ 3-9 ภาพรวมการทำงานของระบบ (System Architecture) — รูปแบบเดียวกับตัวอย่างในเล่ม
# ผู้ใช้สามบทบาทอยู่ซ้าย · ระบบอยู่กลาง · บริการภายนอกและฐานข้อมูลอยู่ขวา · ลูกศรมีคำอธิบายกลางเส้น
# ข้อความเป็นภาษาไทย → **แปลงเป็น PNG บน Windows** (sandbox ไม่มีฟอนต์ไทย) หรือแทรก .svg ลง Word ตรงๆ
# รัน: python docs/thesis/figures/make-architecture.py → fig3-9-architecture.svg
import io, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
FONT = "'TH Sarabun New', 'TH SarabunPSK', Sarabun, Tahoma, sans-serif"
W, H = 1400, 730
o = []

def esc(s): return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
def tw(s, size):
    """ประมาณความกว้างข้อความ — สระบน/ล่างและวรรณยุกต์ไม่กินที่"""
    base = re.sub(r'[ัิ-ฺ็-๎]', '', s)
    return sum(size * (0.66 if '฀' <= ch <= '๿' else 0.55) for ch in base)
def text(x, y, s, size=24, anchor='middle', weight='normal'):
    o.append(f'<text x="{x}" y="{y}" font-family="{FONT}" font-size="{size}" font-weight="{weight}" text-anchor="{anchor}" dominant-baseline="middle">{esc(s)}</text>')
def head(x, y, d):          # หัวลูกศรปลายเปิด d = 'R','L','U','D'
    v = {'R': [(-11,-6),(0,0),(-11,6)], 'L': [(11,-6),(0,0),(11,6)],
         'U': [(-6,11),(0,0),(6,11)], 'D': [(-6,-11),(0,0),(6,-11)]}[d]
    o.append('<polyline points="' + ' '.join(f'{x+a},{y+b}' for a, b in v) + '" fill="none" stroke="#000" stroke-width="1.6"/>')
def arrow(pts, label=None, lx=None, ly=None, size=20):
    o.append('<polyline points="' + ' '.join(f'{x},{y}' for x, y in pts) + '" fill="none" stroke="#000" stroke-width="1.6"/>')
    (x1, y1), (x2, y2) = pts[-2], pts[-1]
    head(x2, y2, 'R' if x2 > x1 else 'L' if x2 < x1 else 'D' if y2 > y1 else 'U')
    if label:
        if lx is None: lx, ly = (pts[0][0] + pts[1][0]) / 2, pts[0][1]
        w = tw(label, size) + 16
        o.append(f'<rect x="{lx-w/2:.0f}" y="{ly-14}" width="{w:.0f}" height="28" fill="#fff"/>')
        text(lx, ly + 1, label, size)
def person(x, y, label):
    o.append(f'<g fill="none" stroke="#000" stroke-width="3"><circle cx="{x}" cy="{y-18}" r="15"/>'
             f'<path d="M{x-26},{y+26} Q{x-26},{y+2} {x},{y+2} Q{x+26},{y+2} {x+26},{y+26} Z"/></g>')
    text(x, y + 46, label, 25, weight='bold')

# ---------- ระบบ (กลาง) — กรอบหน้าต่างเบราว์เซอร์ จำลองหน้าค้นหา ----------
SX, SY, SW, SH = 640, 230, 260, 185
o.append(f'<rect x="{SX}" y="{SY}" width="{SW}" height="{SH}" rx="6" fill="#fff" stroke="#000" stroke-width="2"/>')
o.append(f'<rect x="{SX}" y="{SY}" width="{SW}" height="22" rx="6" fill="#d9d9d9" stroke="#000" stroke-width="2"/>')
for i, c in enumerate(('#e06c6c', '#e0c06c', '#6cbf6c')):
    o.append(f'<circle cx="{SX+14+i*14}" cy="{SY+11}" r="4" fill="{c}"/>')
o.append(f'<rect x="{SX+70}" y="{SY+5}" width="150" height="12" rx="6" fill="#fff"/>')
o.append(f'<rect x="{SX+2}" y="{SY+22}" width="52" height="{SH-24}" fill="#2f3542"/>')
for i in range(6):
    o.append(f'<rect x="{SX+10}" y="{SY+36+i*20}" width="34" height="7" rx="3" fill="#8a93a6"/>')
o.append(f'<rect x="{SX+66}" y="{SY+34}" width="150" height="16" rx="3" fill="#fff" stroke="#999"/>')
o.append(f'<rect x="{SX+222}" y="{SY+34}" width="28" height="16" rx="3" fill="#3b6fd8"/>')
for i, cc in enumerate(('#dbe7ff', '#e9f5e9', '#fff3d6', '#dbe7ff')):
    o.append(f'<rect x="{SX+66+i*44}" y="{SY+58}" width="38" height="11" rx="5" fill="{cc}" stroke="#bbb"/>')
for i in range(4):
    yy = SY + 80 + i*24
    o.append(f'<rect x="{SX+66}" y="{yy}" width="184" height="19" rx="3" fill="#fafafa" stroke="#ccc"/>')
    o.append(f'<circle cx="{SX+78}" cy="{yy+9.5}" r="6" fill="#3b6fd8"/>')
    o.append(f'<rect x="{SX+90}" y="{yy+5}" width="{100-i*12}" height="4" fill="#555"/>')
    o.append(f'<rect x="{SX+90}" y="{yy+12}" width="70" height="3" fill="#aaa"/>')
text(SX + SW/2, SY + SH + 26, 'ระบบ Skouth', 27, weight='bold')
text(SX + SW/2, SY + SH + 54, '(Next.js บน Vercel)', 22)

# ---------- ผู้ใช้ (ซ้าย) — เส้นซ้อนกันแบบไม่ตัดกัน: เส้นที่อยู่นอกสุดเลี้ยวไกลสุด ----------
LX = 420   # ตำแหน่งข้อความบนเส้นฝั่งซ้าย
person(115, 112, 'Member')
arrow([(180, 70), (820, 70), (820, SY)], 'ค้นหาและประเมินผู้สมัคร', LX, 70)
arrow([(180, 112), (770, 112), (770, SY)], 'บันทึก Shortlist / ประเมินตนเอง', LX, 112)
arrow([(690, SY), (690, 156), (180, 156)], 'แสดงผลลัพธ์และคะแนน', LX, 156)

person(115, 322, 'Data Manager')
arrow([(180, 300), (SX, 300)], 'นำเข้าข้อมูลผู้สมัคร (CSV)', LX, 300)
arrow([(180, 344), (SX, 344)], 'จัดการตำแหน่งงาน / ระงับข้อมูล', LX, 344)

person(115, 590, 'Admin')
arrow([(180, 565), (740, 565), (740, SY+SH)], 'อนุมัติบัญชีผู้ใช้', LX, 565)
arrow([(180, 610), (800, 610), (800, SY+SH)], 'กำหนดสิทธิ์ผู้ใช้', LX, 610)

# ---------- บริการภายนอก (ขวา) ----------
def service(x, y, title, sub, icon):
    o.append(f'<rect x="{x}" y="{y}" width="225" height="78" rx="10" fill="#f4f6fb" stroke="#000" stroke-width="2"/>')
    o.append(icon(x + 34, y + 39))
    text(x + 138, y + 30, title, 22, weight='bold')
    text(x + 138, y + 56, sub, 18)
lock = lambda cx, cy: (f'<g fill="none" stroke="#000" stroke-width="2.5"><path d="M{cx-9},{cy-4} v-7 a9,9 0 0 1 18,0 v7"/>'
                       f'<rect x="{cx-14}" y="{cy-4}" width="28" height="22" rx="3" fill="#fff"/></g>'
                       f'<circle cx="{cx}" cy="{cy+7}" r="3" fill="#000"/>')
spark = lambda cx, cy: (f'<path d="M{cx},{cy-20} Q{cx+3},{cy-3} {cx+20},{cy} Q{cx+3},{cy+3} {cx},{cy+20} '
                        f'Q{cx-3},{cy+3} {cx-20},{cy} Q{cx-3},{cy-3} {cx},{cy-20} Z" fill="#fff" stroke="#000" stroke-width="2.5"/>')
RX = 1160   # กล่องบริการภายนอก
service(RX, 30, 'Supabase Auth', 'ยืนยันตัวตน', lock)
arrow([(850, SY), (850, 48), (RX, 48)], 'API Request', 1020, 48)
arrow([(RX, 95), (880, 95), (880, SY)], 'ส่งผลการยืนยันตัวตน', 1030, 95)

service(RX, 262, 'Google Gemini', 'API ปัญญาประดิษฐ์', spark)
arrow([(SX+SW, 280), (RX, 280)], 'ส่งข้อมูลให้วิเคราะห์', 1030, 280)
arrow([(RX, 322), (SX+SW, 322)], 'ส่งผลการวิเคราะห์กลับ', 1030, 322)

# ---------- ฐานข้อมูล (ขวาล่าง) — รายชื่อตารางจริงจาก Supabase ----------
DX, DY = 1150, 430
tables = ['activity_log', 'analyses', 'candidate_skills', 'candidates', 'education', 'experience',
          'ingest_runs', 'jobs', 'pending_candidates', 'profiles', 'resume_assessments',
          'self_profiles', 'shortlist_candidates', 'shortlists', 'skills', 'suppressed_profiles']
o.append(f'<rect x="{DX}" y="{DY}" width="230" height="{26+len(tables)*13+6}" fill="#fff" stroke="#999"/>')
o.append(f'<rect x="{DX}" y="{DY}" width="230" height="22" fill="#eef1f6" stroke="#999"/>')
o.append(f'<text x="{DX+8}" y="{DY+15}" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#3b4a6b">Table (public)</text>')
o.append(f'<text x="{DX+222}" y="{DY+15}" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#3b4a6b" text-anchor="end">Rows</text>')
for i, t in enumerate(tables):
    yy = DY + 26 + i*13
    if i % 2: o.append(f'<rect x="{DX+1}" y="{yy-1}" width="228" height="13" fill="#f6f7f9"/>')
    o.append(f'<rect x="{DX+8}" y="{yy+2}" width="7" height="7" fill="none" stroke="#999"/>')
    o.append(f'<text x="{DX+21}" y="{yy+9}" font-family="Arial, sans-serif" font-size="10" fill="#2d4b8e">{t}</text>')
    o.append(f'<text x="{DX+222}" y="{yy+9}" font-family="Arial, sans-serif" font-size="9" fill="#888" text-anchor="end">▸ Browse</text>')
DB_BOTTOM = DY + 26 + len(tables)*13 + 6
text(DX + 115, DB_BOTTOM + 26, 'Database', 25, weight='bold')
text(DX + 115, DB_BOTTOM + 52, 'Supabase · PostgreSQL + pgvector', 17)
arrow([(SX+SW, 362), (1300, 362), (1300, DY)], 'บันทึกข้อมูล', 1035, 362)
arrow([(1215, DY), (1215, 400), (SX+SW, 400)], 'ดึงข้อมูลมาแสดงผล', 1035, 400)

svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">'
       f'<rect width="{W}" height="{H}" fill="#fff"/>\n' + '\n'.join(o) + '\n</svg>')
io.open(os.path.join(HERE, 'fig3-9-architecture.svg'), 'w', encoding='utf-8').write(svg)
print('wrote fig3-9-architecture.svg')
