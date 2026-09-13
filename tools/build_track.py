"""tours/<slug>/route.gpx (+ osm_points.json from fetch_surface.py) -> track.json (surface-coloured segments), stages.json, track.npy"""
import xml.etree.ElementTree as ET, numpy as np, json, os, sys
import tourlib; T=tourlib.tour(); D=T['_dir']
ns={'g':'http://www.topografix.com/GPX/1/1'}
root=ET.parse(os.path.join(D,T.get('gpx','route.gpx'))).getroot()
pts=[(float(p.get('lat')),float(p.get('lon')),float(p.find('g:ele',ns).text)) for p in root.findall('.//g:trkpt',ns)]
a=np.array(pts); lat=np.radians(a[:,0]); lon=np.radians(a[:,1])
h=np.sin(np.diff(lat)/2)**2+np.cos(lat[:-1])*np.cos(lat[1:])*np.sin(np.diff(lon)/2)**2
cum=np.concatenate([[0],np.cumsum(2*6371000*np.arcsin(np.sqrt(h)))])
t=np.column_stack([a,cum]); np.save(os.path.join(D,'track.npy'),t)
KM=cum/1000; N=len(t)
op=os.path.join(D,'osm_points.json')
if os.path.exists(op):
    osm=json.load(open(op)); assert len(osm)==N, (len(osm),N)
else:
    print('WARNING: no osm_points.json (run fetch_surface.py) - whole route shown as paved'); osm=[{'cls':'paved'}]*N
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
# stages from tour.json: [{day,to,end_km}], end_km null = end of the route
ENDS=[(s_['day'],s_['to'],float(KM[-1]) if s_.get('end_km') is None else float(s_['end_km'])) for s_ in T['stages']]
def gain(k0,k1,thr=5.0):
    i0=np.searchsorted(KM,k0); i1=min(np.searchsorted(KM,k1),N-1); e=t[i0:i1+1,2]
    up=dn=0.0; ref=e[0]
    for x in e[1:]:
        if x-ref>=thr: up+=x-ref; ref=x
        elif ref-x>=thr: dn+=ref-x; ref=x
    return up,dn
st=[]; prev=0.0; pf=T.get('from','Start')
for d,to,e in ENDS:
    up,dn=gain(prev,e); j=min(np.searchsorted(KM,e),N-1)
    st.append({'day':d,'from':pf,'to':to,'start_km':round(prev,1),'end_km':round(float(e),1),'km':round(e-prev,1),'up':int(up),'down':int(dn),
               'lat':round(float(t[j,0]),5),'lon':round(float(t[j,1]),5),'ele':int(t[j,2])})
    prev=e; pf=to
json.dump(st,open(os.path.join(D,'stages.json'),'w'),indent=1)
print("stages:",[(s_['day'],s_['km'],s_['up']) for s_ in st])
