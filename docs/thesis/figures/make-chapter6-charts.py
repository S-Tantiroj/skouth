# ภาพที่ 6-1 ถึง 6-3 ของบทที่ 6 — ตัวเลขจาก scripts/compare-gemini-models.ts (7–8 ก.ย. 2569) และ scripts/ablate-embedding.ts
# ป้ายภาษาอังกฤษเพื่อให้สร้างได้โดยไม่ต้องมีฟอนต์ไทย · รัน: python docs/thesis/figures/make-chapter6-charts.py
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':11})
import os; OUT=os.path.dirname(os.path.abspath(__file__))+os.sep
# Fig 6-1: latency and cost, two tasks
tasks=['Search filter\nextraction','Candidate\nfit scoring']
lat={'gemini-3.8-flash':[2501,2783],'gemini-3.5-flash-lite':[854,921]}
cost={'gemini-3.8-flash':[1.98,1.63],'gemini-3.5-flash-lite':[0.19,0.16]}
x=np.arange(2); w=0.36
fig,ax=plt.subplots(1,2,figsize=(10,4.2))
for i,(k,c) in enumerate(zip(lat,['#7f7f7f','#1f4e79'])):
    b=ax[0].bar(x+(i-0.5)*w,lat[k],w,label=k,color=c)
    ax[0].bar_label(b,fmt='%d',fontsize=9)
    b=ax[1].bar(x+(i-0.5)*w,cost[k],w,label=k,color=c)
    ax[1].bar_label(b,fmt='$%.2f',fontsize=9)
ax[0].set_title('(a) Response time per call'); ax[0].set_ylabel('milliseconds')
ax[1].set_title('(b) Cost per 1,000 calls'); ax[1].set_ylabel('USD')
for a in ax: a.set_xticks(x); a.set_xticklabels(tasks); a.spines[['top','right']].set_visible(False)
ax[0].set_ylim(0,3300); ax[1].set_ylim(0,2.4)
ax[0].legend(frameon=False,fontsize=9,loc='upper left')
fig.tight_layout(); fig.savefig(OUT+'fig6-1-model-latency-cost.png',dpi=200); plt.close(fig)
# Fig 6-2: PDF parsing ranges over 3 runs
fig,ax=plt.subplots(1,2,figsize=(10,4.0))
names=['3.8-flash\n(full thinking)','3.8-flash\n(thinking LOW)']
t=[(13.9,19.0),(4.6,6.6)]; c=[(7.03,19.09),(7.12,7.14)]
for a,data,unit,title,fmt in ((ax[0],t,'seconds','(a) Time per PDF (min–max of 3 runs)','%.1f s'),(ax[1],c,'USD','(b) Cost per 1,000 PDFs (min–max of 3 runs)','$%.2f')):
    for i,(lo,hi) in enumerate(data):
        col=['#7f7f7f','#1f4e79'][i]
        a.bar(i,hi-lo if hi-lo>0.05 else 0.08,bottom=lo,width=0.5,color=col,alpha=0.85)
        a.text(i,hi,(fmt%hi),ha='center',va='bottom',fontsize=9)
        a.text(i,lo,(fmt%lo),ha='center',va='top',fontsize=9)
    a.set_xticks([0,1]); a.set_xticklabels(names); a.set_ylabel(unit); a.set_title(title,fontsize=11)
    a.spines[['top','right']].set_visible(False); a.set_xlim(-0.6,1.6)
ax[0].set_ylim(0,21); ax[1].set_ylim(0,21)
fig.tight_layout(); fig.savefig(OUT+'fig6-2-pdf-parse-range.png',dpi=200); plt.close(fig)
# Fig 6-3: ranking agreement after removing fields
fig,ax=plt.subplots(figsize=(6,3.6))
lab=['Remove skills','Remove skills\nand summary']; v=[0.951,0.856]
b=ax.bar(lab,v,color=['#1f4e79','#7f7f7f'],width=0.5); ax.bar_label(b,fmt='%.3f')
ax.set_ylim(0,1.05); ax.set_ylabel("Spearman's ρ vs. full profile"); ax.axhline(1,color='#bbb',lw=0.8,ls='--')
ax.spines[['top','right']].set_visible(False)
fig.tight_layout(); fig.savefig(OUT+'fig6-3-ablation-spearman.png',dpi=200); plt.close(fig)
print('ok')
