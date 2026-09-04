"""One KML for Google My Maps: 10 day lines (simplified, coloured) + campsites, huts, stage ends, passes. Stays under My Maps limits (≤2000 rows, 5 MB)."""
import json, os, html, numpy as np
HERE=os.path.dirname(os.path.abspath(__file__)); D=os.path.join(HERE,'..','data'); OUT=os.path.join(HERE,'..','files','Google-MyMaps-Konstanz-Genua.kml')
t=np.load(os.path.join(D,'track.npy')); KM=t[:,3]/1000; N=len(t)
S=json.load(open(os.path.join(D,'stages.json'))); PL=json.load(open(os.path.join(D,'places.json'))); FE=json.load(open(os.path.join(D,'features.json')))
def rdp(pts,eps):
    # Douglas-Peucker on (lon,lat) in degrees
    if len(pts)<3: return pts
    a,b=np.array(pts[0]),np.array(pts[-1]); P=np.array(pts); d=np.abs(np.cross(b-a,P-a))/ (np.linalg.norm(b-a)+1e-12)
    i=int(d.argmax())
    if d[i]>eps: return rdp(pts[:i+1],eps)[:-1]+rdp(pts[i:],eps)
    return [pts[0],pts[-1]]
COL=['ff2C3E63','ffE08A00','ffE0242A','ff2E8B57','ff8B5A2B','ff1D6E8C','ff7B3F9E','ff008B8B','ffB8860B','ff333333']  # aabbggrr for KML
esc=lambda x:html.escape(str(x),quote=True)
k=['<?xml version="1.0" encoding="UTF-8"?>','<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>Konstanz → Genova 2026</name>']
for i,c in enumerate(COL): k.append(f'<Style id="d{i+1}"><LineStyle><color>{c}</color><width>4</width></LineStyle></Style>')
for nm,ic in [('camp','http://maps.google.com/mapfiles/kml/paddle/grn-blank.png'),('hut','http://maps.google.com/mapfiles/kml/paddle/orange-blank.png'),('end','http://maps.google.com/mapfiles/kml/paddle/blu-stars.png'),('pass','http://maps.google.com/mapfiles/kml/shapes/triangle.png'),('push','http://maps.google.com/mapfiles/kml/paddle/red-diamond.png'),('note','http://maps.google.com/mapfiles/kml/paddle/ltblu-circle.png')]:
    k.append(f'<Style id="{nm}"><IconStyle><Icon><href>{ic}</href></Icon></IconStyle></Style>')
k.append('<Folder><name>Etappen</name>')
prev=0.0; total=0
for st in S:
    i0=int(np.searchsorted(KM,prev)); i1=int(np.searchsorted(KM,st['end_km'])); seg=[(round(float(t[i,1]),5),round(float(t[i,0]),5)) for i in range(i0,min(i1+1,N))]
    eps=0.00012
    while True:
        simp=rdp(seg,eps)
        if len(simp)<=1500 or eps>0.002: break
        eps*=1.5
    total+=len(simp)
    coords=" ".join(f"{lo},{la},0" for lo,la in simp)
    k.append(f'<Placemark><name>Tag {st["day"]}: {esc(st["from"])} → {esc(st["to"])}</name><description>{st["km"]} km · ↑ {st["up"]} m · ↓ {st["down"]} m</description><styleUrl>#d{st["day"]}</styleUrl><LineString><tessellate>1</tessellate><coordinates>{coords}</coordinates></LineString></Placemark>')
    prev=st['end_km']
k.append('</Folder><Folder><name>Etappenziele</name>')
for st in S: k.append(f'<Placemark><name>{st["day"]} · {esc(st["to"])}</name><description>Etappenziel Tag {st["day"]}, km {st["end_km"]}, {st["ele"]} m</description><styleUrl>#end</styleUrl><Point><coordinates>{st["lon"]},{st["lat"]},0</coordinates></Point></Placemark>')
k.append('</Folder><Folder><name>Pässe und Hinweise</name>')
for f in FE: k.append(f'<Placemark><name>{esc(f["n"])} {f["ele"]} m</name><description>{esc(f["txt"])} (km {f["km"]})</description><styleUrl>#{f["k"]}</styleUrl><Point><coordinates>{f["lon"]},{f["lat"]},0</coordinates></Point></Placemark>')
k.append('</Folder><Folder><name>Zeltplätze</name>')
n=0
for p in PL:
    if p['k']!='camp': continue
    n+=1; k.append(f'<Placemark><name>⛺ {esc(p["n"] or "Camping")}</name><description>km {p["km"]}, {p["off"]} km neben der Route{(" · "+esc(p["w"])) if p["w"] else ""}{(" · "+esc(p["p"])) if p["p"] else ""}</description><styleUrl>#camp</styleUrl><Point><coordinates>{p["lon"]},{p["lat"]},0</coordinates></Point></Placemark>')
k.append('</Folder><Folder><name>Hütten und Biwaks</name>')
for p in PL:
    if p['k'] not in ('hut','biv'): continue
    n+=1; k.append(f'<Placemark><name>🏠 {esc(p["n"] or p["t"])}</name><description>km {p["km"]}, {p["off"]} km neben der Route{(" · "+esc(p["p"])) if p["p"] else ""}</description><styleUrl>#hut</styleUrl><Point><coordinates>{p["lon"]},{p["lat"]},0</coordinates></Point></Placemark>')
k.append('</Folder></Document></kml>')
s="\n".join(k); open(OUT,'w').write(s)
print(f"{os.path.basename(OUT)}: {total} line vertices, {10+len(S)+len(FE)+n} placemarks, {len(s)//1024} KB")
