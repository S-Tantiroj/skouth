# ภาพที่ 3-8 ER Diagram ฉบับพิมพ์ — A4 แนวตั้ง ภาพเดียว อ่านได้เมื่อพิมพ์
# ใช้โครงสร้างตารางชุดเดียวกับ make-er.py (ดึงจาก Supabase จริง 2026-10-21)
# ต่างจากฉบับเต็มตรงที่ **ไม่แสดงชนิดข้อมูล** เพื่อให้ตัวอักษรใหญ่พอพิมพ์
# ชนิดข้อมูลของทุกคอลัมน์อยู่ในตารางข้อมูล (ตารางที่ 3-18 ถึง 3-33)
# รัน: python docs/thesis/figures/make-er-portrait.py → fig3-8-er-portrait.svg
import math, os, io

HERE = os.path.dirname(os.path.abspath(__file__))
src = io.open(os.path.join(HERE, 'make-er.py'), encoding='utf-8').read()
ns = {}; exec(src.split('def esc')[0], ns); T = ns['T']

W, ROW, HEAD = 200, 20, 27
CW, CH = 860, 1255                      # สัดส่วน ~0.69 เข้ากับพื้นที่พิมพ์ A4 แนวตั้ง
FONT = 'Arial, Helvetica, sans-serif'
XA, XB, XC = 40, 330, 620               # สามคอลัมน์
o, box = [], {}

def esc(s): return s.replace('&','&amp;').replace('<','&lt;').replace('>','&gt;')
def ent(name, x, y):
    cols = T[name]; h = HEAD + ROW*len(cols); box[name] = (x, y, cols)
    o.append(f'<rect x="{x}" y="{y}" width="{W}" height="{h}" fill="#fff" stroke="#000" stroke-width="1.4"/>')
    o.append(f'<rect x="{x}" y="{y}" width="{W}" height="{HEAD}" fill="#e6e6e6" stroke="#000" stroke-width="1.4"/>')
    o.append(f'<text x="{x+W/2}" y="{y+19}" font-family="{FONT}" font-size="15" font-weight="bold" text-anchor="middle">{esc(name)}</text>')
    o.append(f'<line x1="{x+44}" y1="{y+HEAD}" x2="{x+44}" y2="{y+h}" stroke="#000" stroke-width="0.8"/>')
    for i,(k,c,t) in enumerate(cols):
        yy = y + HEAD + i*ROW + 14.5
        o.append(f'<text x="{x+5}" y="{yy}" font-family="{FONT}" font-size="11" font-weight="bold">{k.replace(",","/")}</text>')
        pk = 'PK' in k
        fw = 'bold' if pk else 'normal'; ul = ' text-decoration="underline"' if pk else ''
        o.append(f'<text x="{x+50}" y="{yy}" font-family="{FONT}" font-size="14" font-weight="{fw}"{ul}>{esc(c)}</text>')
def a(name, col, side):
    x, y, cols = box[name]; i = [c for _,c,_ in cols].index(col)
    return (x + (W if side=='R' else 0), y + HEAD + i*ROW + ROW/2)
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
A=a('auth.users','id','L'); B=a('profiles','id','L'); rel([A,(22,A[1]),(22,B[1]),B],'one','one')
A=a('profiles','id','R'); B=a('candidates','created_by','L'); rel([A,(270,A[1]),(270,B[1]),B],'zeroone','zeromany')
rel([tb('profiles','B'), tb('shortlists','T')],'one','zeromany')
A=a('shortlists','id','L'); B=a('shortlist_candidates','shortlist_id','L'); rel([A,(22,A[1]),(22,B[1]),B],'one','zeromany')
A=tb('candidates','B',40); B=a('shortlist_candidates','candidate_id','R'); rel([A,(A[0],453),(300,453),(300,B[1]),B],'one','zeromany')
rel([tb('candidates','B'), tb('analyses','T')],'one','zeromany')
for t in ('education','experience','candidate_skills'):
    A=a('candidates','id','R'); B=a(t,'candidate_id','L'); rel([A,(565,A[1]),(565,B[1]),B],'one','zeromany')
A=a('skills','id','R'); B=a('candidate_skills','skill_id','R'); rel([A,(842,A[1]),(842,B[1]),B],'one','zeromany')
A=a('jobs','id','L'); B=a('analyses','job_id','R'); rel([A,(555,A[1]),(555,B[1]),B],'zeroone','zeromany')
A=a('profiles','status','R'); B=a('self_profiles','owner_id','R'); rel([A,(255,A[1]),(255,B[1]),B],'one','zeromany')
P=a('profiles','email','R')
for t,c,s in (('activity_log','actor_id','L'),('pending_candidates','reviewed_by','L'),('suppressed_profiles','created_by','R')):
    B=a(t,c,s); rel([P,(285,P[1]),(285,B[1]),B],'zeroone','zeromany')
rel([tb('self_profiles','B'), tb('resume_assessments','T')],'one','zeromany')
I=a('ingest_runs','id','L')
B=a('candidates','ingest_run_id','R'); rel([I,(595,I[1]),(595,B[1]),B],'zeroone','zeromany')
B=a('pending_candidates','ingest_run_id','R'); rel([I,(555,I[1]),(555,B[1]),B],'zeroone','zeromany')

svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{CW}" height="{CH}" viewBox="0 0 {CW} {CH}"><rect width="{CW}" height="{CH}" fill="#fff"/>\n' + '\n'.join(o) + '\n</svg>'
io.open(os.path.join(HERE, 'fig3-8-er-portrait.svg'), 'w', encoding='utf-8').write(svg)
print('wrote fig3-8-er-portrait.svg')
