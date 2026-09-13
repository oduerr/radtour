"""Surface class per track point from OSM (Overpass) -> tours/<slug>/osm_points.json (input of build_track.py). --reclass: only recompute classes from stored tags.
Queries the highways within 40 m of the route in chunks, then matches every GPX point to the nearest way (<= 35 m)."""
import xml.etree.ElementTree as ET, numpy as np, json, os, sys, time, urllib.request, urllib.parse
import tourlib; T=tourlib.tour(); D=T['_dir']
ns={'g':'http://www.topografix.com/GPX/1/1'}
root=ET.parse(os.path.join(D,T.get('gpx','route.gpx'))).getroot()
pts=[(float(p.get('lat')),float(p.get('lon')),float(p.find('g:ele',ns).text) if p.find('g:ele',ns) is not None else 0.0) for p in root.findall('.//g:trkpt',ns)]
a=np.array(pts); N=len(a); lat=np.radians(a[:,0]); lon=np.radians(a[:,1])
h=np.sin(np.diff(lat)/2)**2+np.cos(lat[:-1])*np.cos(lat[1:])*np.sin(np.diff(lon)/2)**2
KM=np.concatenate([[0],np.cumsum(2*6371*np.arcsin(np.sqrt(h)))])
EPS=["https://overpass.openstreetmap.fr/api/interpreter","https://overpass-api.de/api/interpreter"]
def q(query):
    for ep in EPS:
        for _ in range(2):
            try: return json.load(urllib.request.urlopen(urllib.request.Request(ep,data=urllib.parse.urlencode({'data':query}).encode(),headers={'User-Agent':'radtour-map/1.0'}),timeout=240))
            except Exception as e: print("  err",ep.split('/')[2],str(e)[:60],flush=True); time.sleep(5)
    return None
UNP={'unpaved','gravel','fine_gravel','compacted','dirt','ground','grass','sand','earth','pebblestone','rock','mud','woodchips'}
PAV={'asphalt','paved','concrete','sett','paving_stones','cobblestone','unhewn_cobblestone','wood','metal'}
def cls(t):
    """paved | track_g1 (paved farm road) | track (gravel) | unpaved_road | path (push). Cycle paths tagged highway=path/footway + bicycle=designated/yes are ridable."""
    hw=t.get('highway',''); sf=t.get('surface',''); tt=t.get('tracktype',''); sac=t.get('sac_scale',''); bic=t.get('bicycle','')
    if sac and sac!='hiking': return 'path'
    if hw in ('path','footway','bridleway','steps'):
        if hw=='steps' or bic=='no' or (bic in ('','dismount') and sf in UNP): return 'path'
        if sf in PAV: return 'paved'
        return 'unpaved_road' if sf in UNP else 'track'
    if hw=='track': return 'track_g1' if tt=='grade1' or sf in PAV else 'track'
    if sf in UNP: return 'unpaved_road'
    return 'paved'
if '--reclass' in sys.argv:   # recompute the classes from the tags stored in osm_points.json, no Overpass
    op=os.path.join(D,'osm_points.json'); o=json.load(open(op))
    for p in o: p['cls']=cls({'highway':p.get('hw') or '','surface':p.get('sf') or '','tracktype':p.get('tt') or '','sac_scale':p.get('sac') or '','bicycle':p.get('bic') or ''})
    json.dump(o,open(op,'w'),ensure_ascii=False); import collections; print("reclassified:",dict(collections.Counter(p['cls'] for p in o))); sys.exit(0)
# 1. fetch ways along the route, one query per ~150 points (about 4-5 km), thinned to every 3rd point
ways={}; step=4; per=450   # ~12 km per query: fewer requests, Overpass rate-limits per request
for c0 in range(0,N,per):
    ii=list(range(c0,min(N,c0+per+1),step))
    if ii[-1]!=min(N-1,c0+per): ii.append(min(N-1,c0+per))
    pl=",".join(f"{a[i,0]:.5f},{a[i,1]:.5f}" for i in ii)
    r=q(f'[out:json][timeout:120];way(around:40,{pl})["highway"];out geom tags;')
    if not r: print("chunk at km",round(KM[c0],1),"FAILED",flush=True); continue
    for w in r.get('elements',[]):
        if w.get('type')=='way' and 'geometry' in w: ways[w['id']]=w
    print(f"km {KM[c0]:6.1f}: {len(r.get('elements',[]))} ways ({len(ways)} total)",flush=True); time.sleep(2)
# 2. all way segments as arrays (local metric projection)
lat0=np.radians(a[:,0].mean()); kx=111.32*np.cos(lat0); ky=111.32
segs=[]; owner=[]
for wid,w in ways.items():
    g=w['geometry']
    for j in range(len(g)-1):
        segs.append((g[j]['lon']*kx,g[j]['lat']*ky,g[j+1]['lon']*kx,g[j+1]['lat']*ky)); owner.append(wid)
S=np.array(segs) if segs else np.zeros((0,4)); owner=np.array(owner)
print("segments:",len(S))
# 3. nearest segment per point (vectorised over segments within a coarse box)
out=[]; miss=0
x=a[:,1]*kx; y=a[:,0]*ky
sx0,sy0,sx1,sy1=S[:,0],S[:,1],S[:,2],S[:,3]; dx=sx1-sx0; dy=sy1-sy0; L2=dx*dx+dy*dy+1e-12
minx=np.minimum(sx0,sx1)-0.06; maxx=np.maximum(sx0,sx1)+0.06; miny=np.minimum(sy0,sy1)-0.06; maxy=np.maximum(sy0,sy1)+0.06
prev=None
for i in range(N):
    px,py=x[i],y[i]; cand=np.nonzero((minx<=px)&(maxx>=px)&(miny<=py)&(maxy>=py))[0]
    best=None
    if len(cand):
        t=np.clip(((px-sx0[cand])*dx[cand]+(py-sy0[cand])*dy[cand])/L2[cand],0,1)
        d=np.hypot(sx0[cand]+t*dx[cand]-px, sy0[cand]+t*dy[cand]-py)*1000
        k=int(d.argmin())
        if d[k]<=35: best=owner[cand[k]]
    if best is None: miss+=1; best=prev
    prev=best; tg=ways[best]['tags'] if best is not None else {}
    out.append({'km':round(float(KM[i]),3),'ele':int(round(a[i,2])),'cls':cls(tg) if best is not None else 'paved','hw':tg.get('highway'),'sf':tg.get('surface'),'tt':tg.get('tracktype'),
                'sac':tg.get('sac_scale'),'mtb':tg.get('mtb:scale'),'name':tg.get('name'),'bic':tg.get('bicycle'),'sm':tg.get('smoothness'),'wid':int(best) if best is not None else None})
json.dump(out,open(os.path.join(D,'osm_points.json'),'w'),ensure_ascii=False)
import collections; print("osm_points.json:",N,"points, unmatched (carried from previous):",miss,"| classes",dict(collections.Counter(o['cls'] for o in out)))
