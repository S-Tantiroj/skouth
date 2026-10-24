# ภาพที่ 3-8 ER Diagram ฉบับพิมพ์ — A4 แนวตั้ง ภาพเดียว อ่านได้เมื่อพิมพ์
# ใช้โครงสร้างตารางชุดเดียวกับ make-er.py (ดึงจาก Supabase จริง 2026-10-21)
# ต่างจากฉบับเต็มตรงที่ **ไม่แสดงชนิดข้อมูล** เพื่อให้ตัวอักษรใหญ่พอพิมพ์
# ชนิดข้อมูลของทุกคอลัมน์อยู่ในตารางข้อมูล (ตารางที่ 3-18 ถึง 3-33)
# รัน: python docs/thesis/figures/make-er-portrait.py → fig3-8-er-portrait.svg
import math, os, io

HERE = os.path.dirname(os.path.abspath(__file__))
src = io.open(os.path.join(HERE, 'make-er.py'), encoding='utf-8').read()
ns = {}; exec(src.split('def esc')[0], ns); T = ns['T']; doc = ns['doc']

W, ROW, HEAD = 186, 20, 27
CW, CH = 860, 1255                      # สัดส่วน ~0.69 เข้ากับพื้นที่พิมพ์ A4 แนวตั้ง
FONT = 'Arial, Helvetica, sans-serif'
# สามคอลัมน์ เว้นช่องซ้าย 60 · ช่องระหว่างคอลัมน์ 100 · ช่องขวา 40 ไว้เดินเส้นความสัมพันธ์
# ทุกเส้นออกจากแถว PK ของตารางแม่ และเข้าที่แถว FK ของตารางลูก โดยเดินในช่องว่างเท่านั้น
XA = 60; XB = XA + W + 100; XC = XB + W + 100
o, box = [], {}

def esc(s): return s.replace('&','&amp;').replace('<','&lt;').replace('>','&gt;')
def ent(name, x, y):
    cols = T[name]; h = HEAD + ROW*len(cols); box[name] = (x, y, cols)
    o.append(f'<rect x="{x}" y="{y}" width="{W}" height="{h}" fill="#fff" stroke="#000" stroke-width="1.4"/>')
    o.append(f'<rect x="{x}" y="{y}" width="{W}" height="{HEAD}" fill="#e6e6e6" stroke="#000" stroke-width="1.4"/>')
    o.append(f'<text x="{x+W/2}" y="{y+19}" font-family="{FONT}" font-size="15" font-weight="bold" text-anchor="middle">{esc(name)}</text>')
    o.append(f'<line x1="{x+42}" y1="{y+HEAD}" x2="{x+42}" y2="{y+h}" stroke="#000" stroke-width="0.8"/>')
    for i,(k,c,t) in enumerate(cols):
        yy = y + HEAD + i*ROW + 14.5
        o.append(f'<text x="{x+5}" y="{yy}" font-family="{FONT}" font-size="11" font-weight="bold">{k.replace(",","/")}</text>')
        pk = 'PK' in k
        fw = 'bold' if pk else 'normal'; ul = ' text-decoration="underline"' if pk else ''
        o.append(f'<text x="{x+47}" y="{yy}" font-family="{FONT}" font-size="13" font-weight="{fw}"{ul}>{esc(doc(name, c))}</text>')
def a(name, col, side, dy=0):   # dy เลื่อนจุดต่อในแถวเดียวกัน เมื่อแถวนั้นมีเส้นออกสองกลุ่ม
    x, y, cols = box[name]; i = [c for _,c,_ in cols].index(col)
    return (x + (W if side=='R' else 0), y + HEAD + i*ROW + ROW/2 + dy)
def tb(name, side, dx=W/2):
    x, y, cols = box[name]; return (x+dx, y if side=='T' else y+HEAD+ROW*len(cols))
def L(a,b,c,d,w=1.4): o.append(f'<line x1="{a:.1f}" y1="{b:.1f}" x2="{c:.1f}" y2="{d:.1f}" stroke="#000" stroke-width="{w}"/>')
def sym(p, d, kind):
    px,py = p; dx,dy = d; nx,ny = -dy,dx; back = lambda k:(px-dx*k, py-dy*k)
    circ = lambda cx,cy: o.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="4.5" fill="#fff" stroke="#000" stroke-width="1.4"/>')
    if kind in ('one','zeroone'):
        bx,by = back(9); L(bx+nx*7,by+ny*7,bx-nx*7,by-ny*7)
        if kind=='one': bx,by = back(15); L(bx+nx*7,by+ny*7,bx-nx*7,by-ny*7)
        else: circ(*back(20))
    else:
        bx,by = back(14); L(bx,by,px+nx*8,py+ny*8); L(bx,by,px-nx*8,py-ny*8); L(bx,by,px,py)
        circ(*back(21))
def rel(pts, pk, ck):
    o.append(f'<polyline points="{" ".join(f"{x:.1f},{y:.1f}" for x,y in pts)}" fill="none" stroke="#000" stroke-width="1.3"/>')
    u = lambda p,q: ((q[0]-p[0])/(math.hypot(q[0]-p[0],q[1]-p[1]) or 1), (q[1]-p[1])/(math.hypot(q[0]-p[0],q[1]-p[1]) or 1))
    sym(pts[0], u(pts[1],pts[0]), pk); sym(pts[-1], u(pts[-2],pts[-1]), ck)
def note(x, y, t): o.append(f'<text x="{x}" y="{y}" font-family="{FONT}" font-size="10.5" font-style="italic" fill="#444">{esc(t)}</text>')

# ---------- วางตาราง ----------
# ตารางที่ต่อกันตรงในแนวตั้งเว้น 52 หน่วย เพื่อให้สัญลักษณ์ทั้งสองปลายไม่ซ้อนกัน
for n,x,y in (('auth.users',XA,20),('profiles',XA,130),('shortlists',XA,349),('shortlist_candidates',XA,486),
              ('self_profiles',XA,583),('resume_assessments',XA,842),('suppressed_profiles',XA,1039),
              ('candidates',XB,20),('analyses',XB,479),('activity_log',XB,696),('pending_candidates',XB,933),
              ('education',XC,20),('experience',XC,237),('candidate_skills',XC,434),('skills',XC,531),
              ('jobs',XC,628),('ingest_runs',XC,945)):
    ent(n, x, y)
note(XA, 83, 'Supabase Auth (passwords stored here)')
note(XB, 918, 'entity_id is not a foreign key (by design)')

# ---------- ความสัมพันธ์ 18 เส้น ----------
# ช่องเดินเส้น (x) — เส้นที่มีตารางแม่เดียวกันใช้ช่องร่วมกันเป็น "บัส" แยกกิ่งไปแต่ละตารางลูก
LO, LI = XA - 50, XA - 26                         # ช่องซ้าย: นอก · ใน
G3, G2, G1 = XA + W + 26, XA + W + 50, XA + W + 74 # ระหว่างคอลัมน์ A–B
H3, H2, H1 = XB + W + 26, XB + W + 50, XB + W + 74 # ระหว่างคอลัมน์ B–C
R1 = XC + W + 26                                   # ช่องขวา
def link(P, ch, C, pk, ck): rel([P, (ch, P[1]), (ch, C[1]), C], pk, ck)

# profiles.user_id → auth.users (ช่องซ้ายนอก · จุดต่อเลื่อนขึ้น)
link(a('auth.users','id','L'), LO, a('profiles','id','L',-5), 'one', 'one')
# profiles.user_id → owner_id ที่บังคับมีค่า (ช่องซ้ายใน · จุดต่อเลื่อนลง)
for t in ('shortlists','self_profiles'):
    link(a('profiles','id','L',5), LI, a(t,'owner_id','L'), 'one', 'zeromany')
# profiles.user_id → FK ที่เป็นค่าว่างได้ (ช่อง G1)
P = a('profiles','id','R')
for t,c,sd in (('candidates','created_by','L'),('activity_log','actor_id','L'),
               ('pending_candidates','reviewed_by','L'),('suppressed_profiles','created_by','R')):
    link(P, G1, a(t,c,sd), 'zeroone', 'zeromany')
# shortlists.sl_id → shortlist_candidates · self_profiles.sp_id → resume_assessments (ช่อง G3)
link(a('shortlists','id','R'), G3, a('shortlist_candidates','shortlist_id','R'), 'one', 'zeromany')
link(a('self_profiles','id','R'), G3, a('resume_assessments','profile_id','R'), 'one', 'zeromany')
# candidates.can_id → shortlist_candidates · analyses (ช่อง G2)
P = a('candidates','id','L')
link(P, G2, a('shortlist_candidates','candidate_id','R'), 'one', 'zeromany')
link(P, G2, a('analyses','candidate_id','L'), 'one', 'zeromany')
# candidates.can_id → education · experience · candidate_skills (ช่อง H1)
P = a('candidates','id','R')
for t in ('education','experience','candidate_skills'):
    link(P, H1, a(t,'candidate_id','L'), 'one', 'zeromany')
# jobs.job_id → analyses.job_id (ช่อง H2)
link(a('jobs','id','L'), H2, a('analyses','job_id','R'), 'zeroone', 'zeromany')
# ingest_runs.run_id → candidates · pending_candidates (ช่อง H3)
P = a('ingest_runs','id','L')
for t in ('candidates','pending_candidates'):
    link(P, H3, a(t,'ingest_run_id','R'), 'zeroone', 'zeromany')
# skills.skill_id → candidate_skills.skill_id (ช่องขวา)
link(a('skills','id','R'), R1, a('candidate_skills','skill_id','R'), 'one', 'zeromany')

svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{CW}" height="{CH}" viewBox="0 0 {CW} {CH}"><rect width="{CW}" height="{CH}" fill="#fff"/>\n' + '\n'.join(o) + '\n</svg>'
io.open(os.path.join(HERE, 'fig3-8-er-portrait.svg'), 'w', encoding='utf-8').write(svg)
print('wrote fig3-8-er-portrait.svg')
