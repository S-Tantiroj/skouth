# สร้าง figures/fig3-1-use-case-diagram.svg (ภาพที่ 3-1 Use Case Diagram)
# รัน: python figures/make-usecase.py  → แล้วแปลงเป็น PNG ด้วย Inkscape / เบราว์เซอร์ หรือวาง SVG ลง Word ตรงๆ
# แก้ชื่อ Use Case ที่ main / right ด้านล่าง ตำแหน่งจะคำนวณใหม่เอง
import math
W,H=1060,1015
BX0,BY0,BX1,BY1=170,20,1040,995
MX=440; MW=230; MH=46      # main oval center x, width, height
RX=850; RW=210; RH=46      # right oval
out=[]
def esc(t): return t.replace('&','&amp;').replace('<','&lt;').replace('>','&gt;')
def text(x,y,t,size=13,anchor='middle',weight='normal',style='normal'):
    lines=t.split('\n'); n=len(lines)
    for i,l in enumerate(lines):
        yy=y+(i-(n-1)/2)*(size+2)+size*0.35
        out.append(f'<text x="{x:.1f}" y="{yy:.1f}" font-family="Arial, Helvetica, sans-serif" font-size="{size}" text-anchor="{anchor}" font-weight="{weight}" font-style="{style}" fill="#000">{esc(l)}</text>')
def oval(cx,cy,w,h,label,size=13):
    out.append(f'<ellipse cx="{cx}" cy="{cy}" rx="{w/2}" ry="{h/2}" fill="#fff" stroke="#000" stroke-width="1.2"/>')
    text(cx,cy,label,size)
def arrowhead(x1,y1,x2,y2,kind):
    a=math.atan2(y2-y1,x2-x1)
    if kind=='open':
        L,S=12,5.5
        p1=(x2-L*math.cos(a)+S*math.sin(a), y2-L*math.sin(a)-S*math.cos(a))
        p2=(x2-L*math.cos(a)-S*math.sin(a), y2-L*math.sin(a)+S*math.cos(a))
        out.append(f'<polyline points="{p1[0]:.1f},{p1[1]:.1f} {x2:.1f},{y2:.1f} {p2[0]:.1f},{p2[1]:.1f}" fill="none" stroke="#000" stroke-width="1.2"/>')
    else:
        L,S=16,8
        p1=(x2-L*math.cos(a)+S*math.sin(a), y2-L*math.sin(a)-S*math.cos(a))
        p2=(x2-L*math.cos(a)-S*math.sin(a), y2-L*math.sin(a)+S*math.cos(a))
        out.append(f'<polygon points="{p1[0]:.1f},{p1[1]:.1f} {x2:.1f},{y2:.1f} {p2[0]:.1f},{p2[1]:.1f}" fill="#fff" stroke="#000" stroke-width="1.3"/>')
def line(x1,y1,x2,y2,dash=False,head=None,w=1.1):
    d=' stroke-dasharray="6,4"' if dash else ''
    if head=='tri':
        a=math.atan2(y2-y1,x2-x1); ex,ey=x2-16*math.cos(a),y2-16*math.sin(a)
    else: ex,ey=x2,y2
    out.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{ex:.1f}" y2="{ey:.1f}" stroke="#000" stroke-width="{w}"{d}/>')
    if head: arrowhead(x1,y1,x2,y2,head)
def label(x,y,t):
    w=len(t)*6.2+8
    out.append(f'<rect x="{x-w/2:.1f}" y="{y-9:.1f}" width="{w:.1f}" height="14" fill="#fff"/>')
    text(x,y-2,t,11,style='italic')
def poly(pts,dash=True,head='open'):
    dd=' stroke-dasharray="6,4"' if dash else ''
    ps=' '.join(f'{x:.1f},{y:.1f}' for x,y in pts)
    out.append(f'<polyline points="{ps}" fill="none" stroke="#000" stroke-width="1.1"{dd}/>')
    arrowhead(*pts[-2],*pts[-1],head)
def edge(cx,cy,w,h,tx,ty):
    # point on ellipse boundary toward (tx,ty)
    a=math.atan2(ty-cy,tx-cx); return cx+(w/2)*math.cos(a), cy+(h/2)*math.sin(a)
def actor(x,y,label):
    out.append(f'<g stroke="#000" stroke-width="1.4" fill="none"><circle cx="{x}" cy="{y-30}" r="9" fill="#fff"/><line x1="{x}" y1="{y-21}" x2="{x}" y2="{y+5}"/><line x1="{x-15}" y1="{y-12}" x2="{x+15}" y2="{y-12}"/><line x1="{x}" y1="{y+5}" x2="{x-12}" y2="{y+24}"/><line x1="{x}" y1="{y+5}" x2="{x+12}" y2="{y+24}"/></g>')
    text(x,y+40,label,13)

main=['Login','Search candidates','Assess candidate fit','Manage shortlist','View dashboard',
      'Manage personal settings','Self-assess own profile',
      'Import candidate data','Suppress data on request','Review import queue','Manage job positions',
      'Manage users']
Y=[105+79*i for i in range(12)]
right={ # label : (y, base index)
 'Extract search filters\nwith AI':(150,1),
 'Rank by vector\nsimilarity':(222,1),
 'Score with AI and\ncache the result':(290,2),
 'Review extracted\ndraft before saving':(578,6),
 'Check suppression list':(650,7),
 'Record suppression\nbefore deleting':(735,8),
 'Rank matching\ncandidates':(895,10),
 'Approve / reject\naccount':(990,11),
}
out.append(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">')
out.append('''<defs>
<marker id="open" markerWidth="12" markerHeight="10" refX="11" refY="5" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L11,5 L0,10" fill="none" stroke="#000" stroke-width="1.2"/></marker>
<marker id="tri" markerWidth="16" markerHeight="14" refX="15" refY="7" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L15,7 L0,14 Z" fill="#fff" stroke="#000" stroke-width="1.2"/></marker>
</defs>''')
out.append(f'<rect width="{W}" height="{H}" fill="#fff"/>')
out.append(f'<rect x="{BX0}" y="{BY0}" width="{BX1-BX0}" height="{BY1-BY0}" fill="none" stroke="#000" stroke-width="1.4"/>')
out.append('<g transform="translate(0,-45)">')  # ไม่มีชื่อระบบในกรอบ จึงเลื่อนเนื้อหาขึ้น

# actors
A={'Member':(70,345),'Data Manager':(70,775),'Admin':(70,990)}
for k,(x,y) in A.items(): actor(x,y,k)
# generalization (child -> parent, hollow triangle at parent)
line(70,775-42,70,345+68,head='tri',w=1.3)
line(70,990-42,70,775+68,head='tri',w=1.3)
# associations
assoc={'Member':range(0,7),'Data Manager':range(7,11),'Admin':[11]}
for k,idx in assoc.items():
    ax,ay=A[k]; sx=ax+18; sy=ay-12
    for i in idx:
        ex,ey=edge(MX,Y[i],MW,MH,sx,sy)
        line(sx,sy,ex,ey)
# main ovals
for i,l in enumerate(main): oval(MX,Y[i],MW,MH,l)
# right ovals + include arrows (base -> included)
for lab,(ry,bi) in right.items():
    oval(RX,ry,RW,RH,lab,12)
    x1,y1=edge(MX,Y[bi],MW,MH,RX,ry); x2,y2=edge(RX,ry,RW,RH,MX,Y[bi])
    line(x1,y1,x2,y2,dash=True,head='open')
    label((x1+x2)/2,(y1+y2)/2,'«include»')
# Search include Login (vertical, between ovals)
line(MX+60,Y[1]-MH/2,MX+60,Y[0]+MH/2+1,dash=True,head='open')
label(MX+108,(Y[0]+Y[1])/2+4,'«include»')
# Review queue extend Import (extension -> base) routed on the right of main column
xr=MX+MW/2+38
x1,y1=edge(MX,Y[9],MW,MH,xr,Y[9]); x2,y2=edge(MX,Y[7],MW,MH,xr,Y[7])
poly([(x1,Y[9]),(xr,Y[9]),(xr,Y[7]+14),(MX+MW/2-8,Y[7]+14)])
label(xr+40,(Y[7]+Y[9])/2+40,'«extend»')
out.append('</g>')
out.append('</svg>')
open(__import__('os').path.join(__import__('os').path.dirname(__file__),'fig3-1-use-case-diagram.svg'),'w',encoding='utf-8').write('\n'.join(out))
print('svg ok')
