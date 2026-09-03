"""Query OSM (Overpass) for lodging and campsites near the route -> data/places_raw.json"""
import numpy as np, json, urllib.request, urllib.parse, time, math, os
HERE=os.path.dirname(os.path.abspath(__file__)); D=os.path.join(HERE,'..','data')
t=np.load(os.path.join(D,'track.npy')); KM=t[:,3]/1000; N=len(t)
idx=[0]; last=0
for i in range(N):
    if t[i,3]-last>=400: idx.append(i); last=t[i,3]
chunks=[]; cur=[]; start=t[idx[0],3]
for i in idx:
    cur.append(i)
    if t[i,3]-start>=50000: chunks.append(cur); cur=[i]; start=t[i,3]
if len(cur)>1: chunks.append(cur)
EPS=["https://overpass.openstreetmap.fr/api/interpreter","https://overpass-api.de/api/interpreter"]
def q(query):
    for ep in EPS:
        for a in range(2):
            try: return json.load(urllib.request.urlopen(urllib.request.Request(ep,data=urllib.parse.urlencode({'data':query}).encode(),headers={'User-Agent':'radtour-map/1.0'}),timeout=240))
            except Exception as e: print("  err",ep.split('/')[2],str(e)[:60],flush=True); time.sleep(5)
    return None
TYPES="hotel|guest_house|hostel|alpine_hut|wilderness_hut|chalet|apartment|camp_site|motel|caravan_site"
out=[]
for ci,c in enumerate(chunks):
    pl=",".join(f"{t[i,0]:.5f},{t[i,1]:.5f}" for i in c)
    r=q(f'[out:json][timeout:200];nwr(around:3500,{pl})["tourism"~"^({TYPES})$"];out center tags;')
    if not r: print("chunk",ci,"FAILED",flush=True); continue
    for el in r.get('elements',[]):
        la=el.get('lat') or el.get('center',{}).get('lat'); lo=el.get('lon') or el.get('center',{}).get('lon')
        if la is None: continue
        out.append({'id':f"{el['type'][0]}{el['id']}",'lat':la,'lon':lo,'tags':el.get('tags',{})})
    print(f"chunk {ci} km {KM[c[0]]:.0f}-{KM[c[-1]]:.0f}: {len(r.get('elements',[]))}",flush=True); time.sleep(1)
lat=np.radians(t[:,0]); lon=np.radians(t[:,1]); seen=set(); rows=[]
for o in out:
    if o['id'] in seen: continue
    seen.add(o['id'])
    lar,lor=math.radians(o['lat']),math.radians(o['lon'])
    d=6371*np.arccos(np.clip(np.sin(lat)*np.sin(lar)+np.cos(lat)*np.cos(lar)*np.cos(lon-lor),-1,1))
    i=int(d.argmin()); tg=o['tags']
    rows.append({'id':o['id'],'lat':round(o['lat'],6),'lon':round(o['lon'],6),'km':round(float(KM[i]),1),'off':round(float(d[i]),2),
                 'type':tg.get('tourism'),'name':tg.get('name',''),'web':(tg.get('website') or tg.get('contact:website') or ''),
                 'phone':(tg.get('phone') or tg.get('contact:phone') or ''),'tents':tg.get('tents',''),'backcountry':tg.get('backcountry',''),
                 'opening':tg.get('opening_hours',''),'ele':int(t[i,2])})
rows.sort(key=lambda r:r['km'])
json.dump(rows,open(os.path.join(D,'places_raw.json'),'w'),indent=0,ensure_ascii=False)
print("DONE",len(rows),"places")
