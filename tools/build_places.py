"""data/places_raw.json -> data/places.json (filtered + typed for the map)."""
import json, os, collections
HERE=os.path.dirname(os.path.abspath(__file__)); D=os.path.join(HERE,'..','data')
raw=json.load(open(os.path.join(D,'places_raw.json'))); st=json.load(open(os.path.join(D,'stages.json')))
ends=[s['end_km'] for s in st]
out=[]; seen=set()
for r in raw:
    ty=r['type']; nm=(r['name'] or '').strip()
    key=(nm.lower(),round(r['km']))
    if nm and key in seen: continue
    if ty=='caravan_site' and r.get('tents')!='yes': continue          # motorhome-only pitches
    if ty in ('camp_site','caravan_site'):
        if r['off']>3.5 or r.get('tents')=='no': continue
        kind='camp'
    elif ty in ('alpine_hut','wilderness_hut','hostel'):
        if r['off']>2.5: continue
        kind='hut'
    else:  # hotel, guest_house, chalet, apartment, motel
        if r['off']>1.5 or not nm: continue
        kind='bed'
    near_end=min(abs(r['km']-e) for e in ends)<=3.0
    if nm: seen.add(key)
    out.append({'id':r['id'],'k':kind,'t':ty,'n':nm,'lat':r['lat'],'lon':r['lon'],'km':r['km'],'off':r['off'],'ele':r['ele'],
                'w':r['web'],'p':r['phone'],'o':r['opening'],'e':1 if near_end else 0,'bc':1 if r.get('backcountry')=='yes' else 0})
out.sort(key=lambda x:x['km'])
json.dump(out,open(os.path.join(D,'places.json'),'w'),ensure_ascii=False,separators=(',',':'))
c=collections.Counter(o['k'] for o in out); print("places.json:",dict(c),"| near stage end:",sum(o['e'] for o in out))
print("campsites:",[(o['km'],o['n'][:22]) for o in out if o['k']=='camp'][:50])
