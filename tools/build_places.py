"""data/places_raw.json -> data/places.json (filtered + typed for the map)."""
import json, os, collections, re
HERE=os.path.dirname(os.path.abspath(__file__)); D=os.path.join(HERE,'..','data')
raw=json.load(open(os.path.join(D,'places_raw.json'))); st=json.load(open(os.path.join(D,'stages.json')))
ends=[s['end_km'] for s in st]
first=lambda v:(v or '').split(';')[0].strip()
out=[]; seen=set()
for r in raw:
    ty=r['type']; nm=(r['name'] or '').strip()
    key=(nm.lower(),round(r['km']))
    if nm and key in seen: continue
    if ty=='caravan_site' and r.get('tents')!='yes': continue
    if ty in ('camp_site','caravan_site'):
        if r['off']>3.5 or r.get('tents')=='no': continue
        kind='camp'
    elif ty=='wilderness_hut':
        if r['off']>2.5: continue
        kind='biv'
    elif ty=='hostel' and re.search(r'b\s*&\s*b|bed\s*(and|&)\s*break|zimmer|pension',nm,re.I):
        if r['off']>1.5: continue
        kind='bed'
    elif ty in ('alpine_hut','hostel'):
        if r['off']>2.5: continue
        kind='hut'
    else:
        if r['off']>3.5 or not nm: continue
        if r['off']>1.5: r['_far']=1          # keep only if nothing closer nearby (thin stretches like the rice plain)
        kind='bed'
    if nm: seen.add(key)
    op=first(r['opening']); op=op if len(op)<=40 else ''
    out.append({'id':r['id'],'k':kind,'t':ty,'n':nm,'lat':r['lat'],'lon':r['lon'],'km':r['km'],'off':r['off'],'ele':r['ele'],
                'w':first(r['web']),'p':first(r['phone']),'o':op,'e':0,'bc':1 if r.get('backcountry')=='yes' else 0})
# far beds: keep only where no near bed exists within ±5 km along the route
near=[o['km'] for o in out if o['k']=='bed' and o['off']<=1.5]
out=[o for o in out if not (o['k']=='bed' and o['off']>1.5 and any(abs(k-o['km'])<=5 for k in near))]
# stage-end flags: nearest camp, nearest hut/biv, and up to 3 nearest beds within 2 km of each stage end
for e in ends:
    cand=[o for o in out if abs(o['km']-e)<=2.0]
    if not any(o['k']=='bed' for o in cand): cand=[o for o in out if abs(o['km']-e)<=4.0]   # thin stretches (Ghislarengo)
    for kinds,n in ((('camp',),1),(('hut','biv'),1),(('bed',),3)):
        cs=sorted([o for o in cand if o['k'] in kinds],key=lambda o:(o['off'],abs(o['km']-e)))[:n]
        for o in cs: o['e']=1
out.sort(key=lambda x:x['km'])
json.dump(out,open(os.path.join(D,'places.json'),'w'),ensure_ascii=False,separators=(',',':'))
c=collections.Counter(o['k'] for o in out); print("places.json:",dict(c),"| flagged at stage ends:",sum(o['e'] for o in out))
for s_ in st:
    n=[o for o in out if o['e'] and abs(o['km']-s_['end_km'])<=2.0]
    print(f"  Tag {s_['day']:2d} {s_['to']:24s}: "+", ".join(f"{o['k']}:{o['n'][:18] or o['t']}" for o in n))
