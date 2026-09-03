"""Regenerate data/track.json (surface-coloured segments) and data/stages.json from data/route.gpx + data/osm_points.json."""
import xml.etree.ElementTree as ET, numpy as np, json, os, sys
HERE=os.path.dirname(os.path.abspath(__file__)); D=os.path.join(HERE,'..','data')
ns={'g':'http://www.topografix.com/GPX/1/1'}
root=ET.parse(os.path.join(D,'route.gpx')).getroot()
pts=[(float(p.get('lat')),float(p.get('lon')),float(p.find('g:ele',ns).text)) for p in root.findall('.//g:trkpt',ns)]
a=np.array(pts); lat=np.radians(a[:,0]); lon=np.radians(a[:,1])
h=np.sin(np.diff(lat)/2)**2+np.cos(lat[:-1])*np.cos(lat[1:])*np.sin(np.diff(lon)/2)**2
cum=np.concatenate([[0],np.cumsum(2*6371000*np.arcsin(np.sqrt(h)))])
t=np.column_stack([a,cum]); np.save(os.path.join(D,'track.npy'),t)
KM=cum/1000; N=len(t)
osm=json.load(open(os.path.join(D,'osm_points.json')))
assert len(osm)==N, (len(osm),N)
B={'paved':'p','track':'g','track_g1':'g','unpaved_road':'g','path':'t'}
cls=[B.get(o['cls'],'p') for o in osm]
# smooth: absorb runs < 150 m into neighbours (same as the original analysis)
runs=[]; s=0
for i in range(1,N+1):
    if i==N or cls[i]!=cls[s]:
        runs.append([cls[s],s,i-1]); s=i
def merge(runs):
    out=[]
    for c,i0,i1 in runs:
        L=cum[i1]-cum[i0]
        if out and L<150 and out[-1][0]!=c: out[-1][2]=i1; continue
        if out and out[-1][0]==c: out[-1][2]=i1; continue
        out.append([c,i0,i1])
    return out
for _ in range(3): runs=merge(runs)
segs=[]
for c,i0,i1 in runs:
    P=[[round(float(t[i,0]),5),round(float(t[i,1]),5),int(round(t[i,2])),round(float(KM[i]),2)] for i in range(i0,min(i1+2,N))]
    segs.append({'c':c,'pts':P})
json.dump(segs,open(os.path.join(D,'track.json'),'w'),separators=(',',':'))
tot={}
for s_ in segs: tot[s_['c']]=tot.get(s_['c'],0)+(s_['pts'][-1][3]-s_['pts'][0][3])
print("track.json:",len(segs),"segments,",N,"points, km by class",{k:round(v,1) for k,v in tot.items()})
# stages (end km from the plan in the vault note)
ENDS=[(1,"Wildhaus",83.4),(2,"Bonaduz / Rhäzüns",153.0),(3,"Disentis",208.0),(4,"Lago Ritom",240.7),(5,"Formazza (Ponte)",285.3),
      (6,"Lago d'Orta (Pescone)",369.5),(7,"Ghislarengo",441.7),(8,"Asti",533.5),(9,"Silvano d'Orba",597.5),(10,"Genova",float(KM[-1]))]
def gain(k0,k1,thr=5.0):
    i0=np.searchsorted(KM,k0); i1=min(np.searchsorted(KM,k1),N-1); e=t[i0:i1+1,2]
    up=dn=0.0; ref=e[0]
    for x in e[1:]:
        if x-ref>=thr: up+=x-ref; ref=x
        elif ref-x>=thr: dn+=ref-x; ref=x
    return up,dn
st=[]; prev=0.0; pf="Konstanz"
for d,to,e in ENDS:
    up,dn=gain(prev,e); j=min(np.searchsorted(KM,e),N-1)
    st.append({'day':d,'from':pf,'to':to,'start_km':round(prev,1),'end_km':round(float(e),1),'km':round(e-prev,1),'up':int(up),'down':int(dn),
               'lat':round(float(t[j,0]),5),'lon':round(float(t[j,1]),5),'ele':int(t[j,2])})
    prev=e; pf=to
json.dump(st,open(os.path.join(D,'stages.json'),'w'),indent=1)
print("stages:",[(s_['day'],s_['km'],s_['up']) for s_ in st])
