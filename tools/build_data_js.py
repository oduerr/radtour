"""Bundle data/*.json into data/data.js (works from file:// too)."""
import json, os
HERE=os.path.dirname(os.path.abspath(__file__)); D=os.path.join(HERE,'..','data')
def load(n, default):
    p=os.path.join(D,n)
    return json.load(open(p)) if os.path.exists(p) else default
bundle={'track':load('track.json',[]),'stages':load('stages.json',[]),'places':load('places.json',[]),'features':load('features.json',[]),'weather':load('weather.json',[])}
s="window.RT="+json.dumps(bundle,separators=(',',':'),ensure_ascii=False)+";\n"
open(os.path.join(D,'data.js'),'w').write(s)
print("data.js",len(s)//1024,"KB;",{k:len(v) for k,v in bundle.items()})
