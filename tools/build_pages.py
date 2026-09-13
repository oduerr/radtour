"""Write <slug>/index.html + <slug>/manifest.json for every tour, tours/index.js for the start page."""
import json, os, html
ROOT=os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..')); TD=os.path.join(ROOT,'tours')
idx=[]
for slug in sorted(os.listdir(TD)):
    tj=os.path.join(TD,slug,'tour.json')
    if not os.path.isfile(tj): continue
    T=json.load(open(tj)); st=json.load(open(os.path.join(TD,slug,'stages.json'))) if os.path.exists(os.path.join(TD,slug,'stages.json')) else []
    name=T['name']; short=T.get('short',name); d=os.path.join(ROOT,slug); os.makedirs(d,exist_ok=True)
    page=f"""<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{html.escape(name)}</title>
<meta name="theme-color" content="#1D6E8C">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="{html.escape(short)}">
<link rel="manifest" href="manifest.json">
<link rel="apple-touch-icon" href="../icon-180.png">
<link rel="icon" href="../icon.svg" type="image/svg+xml">
<link rel="stylesheet" href="../vendor/leaflet/leaflet.css">
<link rel="stylesheet" href="../vendor/markercluster/MarkerCluster.css">
<link rel="stylesheet" href="../vendor/markercluster/MarkerCluster.Default.css">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&display=swap" media="print" onload="this.media='all'">
<link rel="stylesheet" href="../app.css">
</head>
<body>
<script src="../vendor/leaflet/leaflet.js"></script>
<script src="../vendor/markercluster/leaflet.markercluster.js"></script>
<script src="../tours/{slug}/data.js"></script>
<script src="../app.js"></script>
</body>
</html>
"""
    open(os.path.join(d,'index.html'),'w').write(page)
    man={"name":name,"short_name":short,"start_url":".","scope":".","display":"standalone","background_color":"#F2F3EF","theme_color":"#1D6E8C",
         "icons":[{"src":"../icon.svg","sizes":"any","type":"image/svg+xml","purpose":"any"},{"src":"../icon-180.png","sizes":"180x180","type":"image/png"},{"src":"../icon-512.png","sizes":"512x512","type":"image/png","purpose":"any maskable"}]}
    json.dump(man,open(os.path.join(d,'manifest.json'),'w'),ensure_ascii=False)
    # downloads page: generated unless a hand-written tours/<slug>/files/index.html exists
    fd=os.path.join(TD,slug,'files'); fi=os.path.join(fd,'index.html')
    if os.path.isdir(fd) and not os.path.exists(fi):
        items=''.join(f'<li><a href="{html.escape(f)}" download>{html.escape(f)}</a> <small>{os.path.getsize(os.path.join(fd,f))//1024} KB</small></li>' for f in sorted(os.listdir(fd)) if f.lower().endswith(('.gpx','.kml')))
        open(fi,'w').write(f'<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{html.escape(name)} – Dateien</title><style>body{{font-family:system-ui,sans-serif;margin:24px;max-width:640px;line-height:1.5}}li{{margin:8px 0}}a{{font-weight:600}}small{{color:#666;margin-left:6px}}</style><h1>{html.escape(name)} – Dateien</h1><p>Etappen als GPX zum Herunterladen.</p><ul>{items}</ul><p><a href="../../../{slug}/">← zur Karte</a></p></html>')
        print(f"  {slug}/files/index.html generated")
    km=round(sum(s['km'] for s in st),1); up=sum(s['up'] for s in st)
    idx.append({'slug':slug,'name':name,'short':short,'dates':T.get('dates',''),'from':T.get('from',''),'to':st[-1]['to'] if st else '','days':len(st),'km':km,'up':up})
    print(f"{slug}: {name} · {len(st)} days · {km} km · ↑ {up} m -> {slug}/index.html")
open(os.path.join(TD,'index.js'),'w').write("window.TOURS="+json.dumps(idx,ensure_ascii=False,separators=(',',':'))+";\n")
