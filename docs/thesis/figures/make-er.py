# สร้างภาพที่ 3-8 (ก) และ (ข) — ER Diagram แบบ Crow's Foot
# โครงสร้างตาราง คอลัมน์ ชนิดข้อมูล และ Foreign Key ดึงจาก Supabase โปรเจกต์ Skouth
# (information_schema + pg_constraint) เมื่อ 2026-10-21 — 16 ตาราง · 18 FK
# รัน: python docs/thesis/figures/make-er.py  → fig3-8a-er-core.svg · fig3-8b-er-support.svg
import math, os

ROW, HEAD, W = 19, 26, 250
FONT = 'Arial, Helvetica, sans-serif'

# ---------- โครงสร้างตารางจริง (key: PK / FK / PK,FK / UQ / '') ----------
T = {
 'auth.users': [('PK','id','uuid')],
 'profiles': [('PK,FK','id','uuid'),('','display_name','text'),('','role','user_role'),
   ('','settings','jsonb'),('','created_at','timestamptz'),('','email','text'),('','status','account_status')],
 'candidates': [('PK','id','uuid'),('','full_name','text'),('','photo_url','text'),('','headline','text'),
   ('','location','text'),('','summary','text'),('','source','cand_source'),('','raw_data','jsonb'),
   ('','embedding','vector(768)'),('FK','created_by','uuid'),('','created_at','timestamptz'),
   ('','updated_at','timestamptz'),('','years_experience','int4'),('','linkedin_url','text'),
   ('','professional_email','text'),('','refreshed_at','timestamptz'),('FK','ingest_run_id','uuid'),
   ('','embed_hash','text'),('','industry','text')],
 'education': [('PK','id','uuid'),('FK','candidate_id','uuid'),('','institution','text'),('','country','text'),
   ('','degree','text'),('','field_of_study','text'),('','start_year','int4'),('','end_year','int4')],
 'experience': [('PK','id','uuid'),('FK','candidate_id','uuid'),('','company','text'),('','title','text'),
   ('','start_date','date'),('','end_date','date'),('','description','text')],
 'skills': [('PK','id','uuid'),('UQ','name','text')],
 'candidate_skills': [('PK,FK','candidate_id','uuid'),('PK,FK','skill_id','uuid')],
 'jobs': [('PK','id','uuid'),('','title','varchar(255)'),('','company','varchar(255)'),('','description','text'),
   ('','required_skills','text[]'),('','min_experience_years','int4'),('','location','varchar(255)'),
   ('','category','varchar(255)'),('','redirect_url','text'),('UQ','source','varchar(100)'),('UQ','external_id','varchar(255)'),
   ('','embedding','vector(768)'),('','created_at','timestamp')],
 'analyses': [('PK','id','uuid'),('FK','candidate_id','uuid'),('','requirement_text','text'),
   ('','requirement_hash','text'),('','score','int4'),('','reasoning','text'),('','created_at','timestamptz'),
   ('FK','job_id','uuid')],
 'shortlists': [('PK','id','uuid'),('','name','text'),('FK','owner_id','uuid'),('','created_at','timestamptz')],
 'shortlist_candidates': [('PK,FK','shortlist_id','uuid'),('PK,FK','candidate_id','uuid')],
 'self_profiles': [('PK','id','uuid'),('FK','owner_id','uuid'),('','file_name','text'),('','raw_text','text'),
   ('','parsed_data','jsonb'),('','assessment','jsonb'),('','embedding','vector(768)'),
   ('','created_at','timestamptz'),('','updated_at','timestamptz')],
 'resume_assessments': [('PK','id','uuid'),('FK','profile_id','uuid'),('','requirement_text','text'),
   ('','requirement_hash','text'),('','score','int4'),('','reasoning','text'),('','created_at','timestamptz')],
 'ingest_runs': [('PK','id','uuid'),('','trigger','text'),('','source','text'),('','criteria','jsonb'),
   ('','status','text'),('','imported','int4'),('','updated','int4'),('','pending','int4'),
   ('','skipped_unchanged','int4'),('','skipped_suppressed','int4'),('','errors','jsonb'),
   ('','started_at','timestamptz'),('','finished_at','timestamptz')],
 'pending_candidates': [('PK','id','uuid'),('FK','ingest_run_id','uuid'),('UQ','linkedin_url','text'),
   ('','full_name','text'),('','headline','text'),('','payload','jsonb'),('','missing','text[]'),
   ('','status','text'),('FK','reviewed_by','uuid'),('','reviewed_at','timestamptz'),('','created_at','timestamptz')],
 'suppressed_profiles': [('PK','id','uuid'),('UQ','linkedin_url','text'),('','full_name','text'),
   ('','reason','text'),('FK','created_by','uuid'),('','created_at','timestamptz')],
 'activity_log': [('PK','id','uuid'),('FK','actor_id','uuid'),('','action','text'),('','entity_type','text'),
   ('','entity_id','uuid'),('','summary','text'),('','count','int4'),('','metadata','jsonb'),('','created_at','timestamptz')],
}

# Foreign Key ทั้ง 18 เส้น (pg_constraint ของ Supabase จริง 2026-10-21) — ใช้ร่วมกับตารางข้อมูล
FK = {
 ('profiles','id'): 'auth.users(id)', ('candidates','created_by'): 'profiles(id)',
 ('candidates','ingest_run_id'): 'ingest_runs(id)', ('education','candidate_id'): 'candidates(id)',
 ('experience','candidate_id'): 'candidates(id)', ('candidate_skills','candidate_id'): 'candidates(id)',
 ('candidate_skills','skill_id'): 'skills(id)', ('shortlists','owner_id'): 'profiles(id)',
 ('shortlist_candidates','shortlist_id'): 'shortlists(id)', ('shortlist_candidates','candidate_id'): 'candidates(id)',
 ('analyses','candidate_id'): 'candidates(id)', ('analyses','job_id'): 'jobs(id)',
 ('self_profiles','owner_id'): 'profiles(id)', ('resume_assessments','profile_id'): 'self_profiles(id)',
 ('pending_candidates','ingest_run_id'): 'ingest_runs(id)', ('pending_candidates','reviewed_by'): 'profiles(id)',
 ('suppressed_profiles','created_by'): 'profiles(id)', ('activity_log','actor_id'): 'profiles(id)',
}

def esc(s): return s.replace('&','&amp;').replace('<','&lt;').replace('>','&gt;')

class Fig:
    def __init__(s, w, h): s.w, s.h, s.o, s.box = w, h, [], {}
    def ent(s, name, x, y, cols=None, note=None):
        cols = cols or T[name]
        h = HEAD + ROW*len(cols)
        s.box[name] = (x, y, cols)
        s.o.append(f'<rect x="{x}" y="{y}" width="{W}" height="{h}" fill="#fff" stroke="#000" stroke-width="1.3"/>')
        s.o.append(f'<rect x="{x}" y="{y}" width="{W}" height="{HEAD}" fill="#e6e6e6" stroke="#000" stroke-width="1.3"/>')
        s.o.append(f'<text x="{x+W/2}" y="{y+17.5}" font-family="{FONT}" font-size="13.5" font-weight="bold" text-anchor="middle">{esc(name)}</text>')
        s.o.append(f'<line x1="{x+46}" y1="{y+HEAD}" x2="{x+46}" y2="{y+h}" stroke="#000" stroke-width="0.8"/>')
        for i,(k,c,t) in enumerate(cols):
            yy = y + HEAD + i*ROW + 13.5
            bold = 'bold' if 'PK' in k else 'normal'
            s.o.append(f'<text x="{x+6}" y="{yy}" font-family="{FONT}" font-size="10.5" font-weight="bold">{k.replace(",","/")}</text>')
            ul = ' text-decoration="underline"' if 'PK' in k else ''
            s.o.append(f'<text x="{x+52}" y="{yy}" font-family="{FONT}" font-size="12" font-weight="{bold}"{ul}>{esc(c)}</text>')
            s.o.append(f'<text x="{x+W-6}" y="{yy}" font-family="{FONT}" font-size="11" fill="#444" text-anchor="end">{esc(t)}</text>')
        if note:
            s.o.append(f'<text x="{x}" y="{y+h+15}" font-family="{FONT}" font-size="10.5" font-style="italic" fill="#444">{esc(note)}</text>')
    def a(s, name, col, side):
        x, y, cols = s.box[name]
        i = [c for _,c,_ in cols].index(col)
        return (x + (W if side=='R' else 0), y + HEAD + i*ROW + ROW/2)
    def tb(s, name, side, dx=W/2):   # จุดกึ่งกลางขอบบน ('T') หรือขอบล่าง ('B')
        x, y, cols = s.box[name]
        return (x + dx, y if side=='T' else y + HEAD + ROW*len(cols))
    # crow's foot end symbol at point p, line arrives travelling in direction d (into the entity)
    def sym(s, p, d, kind):
        px, py = p; dx, dy = d; nx, ny = -dy, dx
        L = lambda a,b,c,e: s.o.append(f'<line x1="{a:.1f}" y1="{b:.1f}" x2="{c:.1f}" y2="{e:.1f}" stroke="#000" stroke-width="1.3"/>')
        C = lambda cx,cy: s.o.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="4.5" fill="#fff" stroke="#000" stroke-width="1.3"/>')
        back = lambda k: (px - dx*k, py - dy*k)
        if kind in ('one','zeroone'):
            bx,by = back(9); L(bx+nx*7,by+ny*7,bx-nx*7,by-ny*7)
            if kind=='one':
                bx,by = back(15); L(bx+nx*7,by+ny*7,bx-nx*7,by-ny*7)
            else:
                cx,cy = back(20); C(cx,cy)
        else:  # many / zeromany / onemany
            bx,by = back(14)
            L(bx,by,px+nx*8,py+ny*8); L(bx,by,px-nx*8,py-ny*8); L(bx,by,px,py)
            if kind=='zeromany': cx,cy = back(21); C(cx,cy)
            if kind=='onemany': bx,by = back(19); L(bx+nx*7,by+ny*7,bx-nx*7,by-ny*7)
    def rel(s, pts, parent_kind, child_kind, dash=False, label=None):
        d = ' stroke-dasharray="6,4"' if dash else ''
        s.o.append(f'<polyline points="{" ".join(f"{x:.1f},{y:.1f}" for x,y in pts)}" fill="none" stroke="#000" stroke-width="1.2"{d}/>')
        def unit(a,b):
            dx,dy = b[0]-a[0], b[1]-a[1]; n = math.hypot(dx,dy) or 1; return (dx/n, dy/n)
        s.sym(pts[0], unit(pts[1], pts[0]), parent_kind)
        s.sym(pts[-1], unit(pts[-2], pts[-1]), child_kind)
        if label:
            (lx,ly,t) = label
            s.o.append(f'<text x="{lx}" y="{ly}" font-family="{FONT}" font-size="10.5" font-style="italic" fill="#333">{esc(t)}</text>')
    def h2(s, A, B, mx):   # elbow: horizontal-vertical-horizontal
        return [A, (mx, A[1]), (mx, B[1]), B]
    def save(s, fn):
        body = '\n'.join(s.o)
        svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{s.w}" height="{s.h}" viewBox="0 0 {s.w} {s.h}"><rect width="{s.w}" height="{s.h}" fill="#fff"/>\n{body}\n</svg>'
        open(os.path.join(os.path.dirname(os.path.abspath(__file__)), fn), 'w', encoding='utf-8').write(svg)
        print('wrote', fn)

# ================= (ก) ส่วนหลัก =================
f = Fig(1430, 840)
f.ent('auth.users', 40, 30, note='Supabase Auth schema (passwords are stored here)')
f.ent('profiles', 40, 130)
f.ent('shortlists', 40, 400)
f.ent('shortlist_candidates', 40, 560)
f.ent('candidates', 400, 30)
f.ent('analyses', 400, 470)
f.ent('education', 790, 30)
f.ent('experience', 790, 230)
f.ent('candidate_skills', 790, 410)
f.ent('skills', 1140, 410)
f.ent('jobs', 790, 540)

# auth.users 1 — 1 profiles
f.rel([f.a('auth.users','id','L'), (22, f.a('auth.users','id','L')[1]), (22, f.a('profiles','id','L')[1]), f.a('profiles','id','L')], 'one', 'one')
# profiles 0..1 — 0..* candidates.created_by
f.rel(f.h2(f.a('profiles','id','R'), f.a('candidates','created_by','L'), 340), 'zeroone', 'zeromany')
# profiles 1 — 0..* shortlists.owner_id
f.rel([f.tb('profiles','B'), f.tb('shortlists','T')], 'one', 'zeromany')
# shortlists 1 — 0..* shortlist_candidates
A=f.a('shortlists','id','L'); B=f.a('shortlist_candidates','shortlist_id','L')
f.rel([A,(22,A[1]),(22,B[1]),B], 'one', 'zeromany')
# candidates 1 — 0..* shortlist_candidates.candidate_id
A=f.a('candidates','id','L'); B=f.a('shortlist_candidates','candidate_id','R')
f.rel([A,(372,A[1]),(372,B[1]),B], 'one', 'zeromany')
# candidates 1 — 0..* education / experience / candidate_skills
for t,mx in (('education',765),('experience',765),('candidate_skills',765)):
    f.rel(f.h2(f.a('candidates','id','R'), f.a(t,'candidate_id','L'), mx), 'one', 'zeromany')
# skills 1 — 0..* candidate_skills
f.rel([f.a('skills','id','L'), f.a('candidate_skills','skill_id','R')], 'one', 'zeromany')
# candidates 1 — 0..* analyses
A=f.a('candidates','id','L'); B=f.a('analyses','candidate_id','L')
f.rel([A,(372,A[1]),(372,B[1]),B], 'one', 'zeromany')
# jobs 0..1 — 0..* analyses.job_id
f.rel(f.h2(f.a('jobs','id','L'), f.a('analyses','job_id','R'), 715), 'zeroone', 'zeromany')
f.save('fig3-8a-er-core.svg')

# ================= (ข) ส่วนสนับสนุน =================
g = Fig(1190, 880)
g.ent('profiles', 40, 300, cols=[('PK,FK','id','uuid'),('','…','')], note='full columns: see figure (a)')
g.ent('self_profiles', 400, 30)
g.ent('resume_assessments', 790, 30)
g.ent('activity_log', 400, 270)
g.ent('suppressed_profiles', 400, 560)
g.ent('pending_candidates', 790, 270)
g.ent('ingest_runs', 790, 560)
g.ent('candidates', 40, 720, cols=[('PK','id','uuid'),('FK','ingest_run_id','uuid'),('','…','')], note='full columns: see figure (a)')

P=g.a('profiles','id','R')
T0=g.tb('profiles','T'); B=g.a('self_profiles','owner_id','L')
g.rel([T0,(T0[0],B[1]),B], 'one', 'zeromany')
g.rel(g.h2(P, g.a('activity_log','actor_id','L'), 350), 'zeroone', 'zeromany')
g.rel(g.h2(P, g.a('suppressed_profiles','created_by','L'), 350), 'zeroone', 'zeromany')
A=g.a('profiles','id','R'); B=g.a('pending_candidates','reviewed_by','L')
g.rel([A,(320,A[1]),(320,252),(745,252),(745,B[1]),B], 'zeroone', 'zeromany')
g.rel([g.a('self_profiles','id','R'), g.a('resume_assessments','profile_id','L')], 'one', 'zeromany')
A=g.a('ingest_runs','id','R'); B=g.a('pending_candidates','ingest_run_id','R')
g.rel([A,(1080,A[1]),(1080,B[1]),B], 'zeroone', 'zeromany')
A=g.a('ingest_runs','id','L'); B=g.a('candidates','ingest_run_id','R')
g.rel([A,(700,A[1]),(700,B[1]),B], 'zeroone', 'zeromany')
g.o.append(f'<text x="400" y="{270+HEAD+ROW*9+32}" font-family="{FONT}" font-size="10.5" font-style="italic" fill="#444">entity_id is intentionally not a foreign key (keeps a trace of deleted records)</text>')
g.save('fig3-8b-er-support.svg')

# ================= ภาพรวมทั้งหมดในภาพเดียว (fig3-8-er-full) =================
h = Fig(1430, 1320)
for n,x,y in (('auth.users',40,30),('profiles',40,130),('shortlists',40,400),('shortlist_candidates',40,560),
              ('candidates',400,30),('analyses',400,470),('education',790,30),('experience',790,230),
              ('candidate_skills',790,410),('skills',1140,410),('jobs',790,540),
              ('self_profiles',40,880),('resume_assessments',40,1135),('activity_log',400,880),
              ('suppressed_profiles',400,1120),('pending_candidates',790,880),('ingest_runs',1140,880)):
    h.ent(n, x, y, note='Supabase Auth schema (passwords are stored here)' if n=='auth.users' else None)
# --- ส่วนหลัก (เหมือนภาพ ก) ---
h.rel([h.a('auth.users','id','L'), (22, h.a('auth.users','id','L')[1]), (22, h.a('profiles','id','L')[1]), h.a('profiles','id','L')], 'one', 'one')
h.rel(h.h2(h.a('profiles','id','R'), h.a('candidates','created_by','L'), 340), 'zeroone', 'zeromany')
h.rel([h.tb('profiles','B'), h.tb('shortlists','T')], 'one', 'zeromany')
A=h.a('shortlists','id','L'); B=h.a('shortlist_candidates','shortlist_id','L')
h.rel([A,(22,A[1]),(22,B[1]),B], 'one', 'zeromany')
A=h.a('candidates','id','L')
for t,c in (('shortlist_candidates','candidate_id'),('analyses','candidate_id')):
    B=h.a(t,c,'R' if t=='shortlist_candidates' else 'L')
    h.rel([A,(372,A[1]),(372,B[1]),B], 'one', 'zeromany')
for t in ('education','experience','candidate_skills'):
    h.rel(h.h2(h.a('candidates','id','R'), h.a(t,'candidate_id','L'), 765), 'one', 'zeromany')
h.rel([h.a('skills','id','L'), h.a('candidate_skills','skill_id','R')], 'one', 'zeromany')
h.rel(h.h2(h.a('jobs','id','L'), h.a('analyses','job_id','R'), 715), 'zeroone', 'zeromany')
# --- ส่วนสนับสนุน ---
# profiles 1 — 0..* self_profiles (owner_id NOT NULL)
A=h.a('profiles','status','R'); T1=h.tb('self_profiles','T')
h.rel([A,(310,A[1]),(310,860),(T1[0],860),T1], 'one', 'zeromany')
# profiles 0..1 — 0..* activity_log / pending_candidates / suppressed_profiles (FK เป็นค่าว่างได้)
S=h.a('profiles','settings','R')
for t in ('activity_log','pending_candidates'):
    T1=h.tb(t,'T'); h.rel([S,(325,S[1]),(325,868),(T1[0],868),T1], 'zeroone', 'zeromany')
B=h.a('suppressed_profiles','created_by','L'); h.rel([S,(325,S[1]),(325,B[1]),B], 'zeroone', 'zeromany')
h.rel([h.tb('self_profiles','B'), h.tb('resume_assessments','T')], 'one', 'zeromany')
h.rel(h.h2(h.a('ingest_runs','id','L'), h.a('pending_candidates','ingest_run_id','R'), 1090), 'zeroone', 'zeromany')
A=h.tb('ingest_runs','T'); B=h.a('candidates','ingest_run_id','R')
h.rel([A,(A[0],850),(700,850),(700,B[1]),B], 'zeroone', 'zeromany')
h.o.append(f'<text x="400" y="{880+HEAD+ROW*9+16}" font-family="{FONT}" font-size="10.5" font-style="italic" fill="#444">entity_id is intentionally not a foreign key (keeps a trace of deleted records)</text>')
h.save('fig3-8-er-full.svg')
