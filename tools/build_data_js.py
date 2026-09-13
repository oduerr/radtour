"""Bundle tours/<slug>/*.json into tours/<slug>/data.js (window.RT; a script tag works from file:// too)."""
import json, os
import tourlib; T=tourlib.tour(); D=T['_dir']
def load(n, default):
    p=os.path.join(D,n)
    return json.load(open(p)) if os.path.exists(p) else default
meta={k:T[k] for k in ('slug','name','short','dates','from') if k in T}; meta['ch']=bool(T.get('ch')); meta['files']=f"../tours/{T['slug']}/files/"
bundle={'tour':meta,'track':load('track.json',[]),'stages':load('stages.json',[]),'places':load('places.json',[]),'features':load('features.json',[]),'weather':load('weather.json',[]),'variants':load('variants.json',[])}
s="window.RT="+json.dumps(bundle,separators=(',',':'),ensure_ascii=False)+";\n"
open(os.path.join(D,'data.js'),'w').write(s)
print("data.js",len(s)//1024,"KB;",{k:len(v) for k,v in bundle.items()})
