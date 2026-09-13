"""tour.json features (passes/pushes/notes with links, checked) -> features.json; tour.json weather points (or stage ends) -> weather.json"""
import numpy as np, json, os, urllib.request, urllib.error
import tourlib; T=tourlib.tour(); D=T['_dir']
t=np.load(os.path.join(D,'track.npy')); KM=t[:,3]/1000; N=len(t)
def at(km): i=min(int(np.searchsorted(KM,km)),N-1); return round(float(t[i,0]),5),round(float(t[i,1]),5),int(t[i,2])
def ok(url):
    try:
        req=urllib.request.Request(url,method='HEAD',headers={'User-Agent':'Mozilla/5.0'}); return urllib.request.urlopen(req,timeout=12).status<400
    except Exception as e:
        try:
            req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'}); return urllib.request.urlopen(req,timeout=12).status<400
        except urllib.error.HTTPError as e: return e.code in (403,429)   # anti-bot sites (hikr) answer 403 to scripts but are alive
        except Exception: return False
F=T.get('features',[])   # [{km,k,n,ele,txt,links:[{l,u}]}]
out=[]
for f in F:
    lat,lon,ele=at(f['km']); L=[]
    for lk in f.get('links',[]):
        good=ok(lk['u']); print(("  ok  " if good else "  DEAD"),lk['u'],flush=True)
        if good: L.append({'l':lk['l'],'u':lk['u']})
    out.append({'km':f['km'],'k':f['k'],'n':f['n'],'ele':f['ele'],'lat':lat,'lon':lon,'txt':f['txt'],'links':L})
json.dump(out,open(os.path.join(D,'features.json'),'w'),ensure_ascii=False,indent=0)
W=[(w['km'],w['n'],w.get('h',0)) for w in T.get('weather',[])]
if not W:   # default: start + every stage end
    st=json.load(open(os.path.join(D,'stages.json'))); W=[(0,T.get('from','Start'),0)]+[(s_['end_km'],s_['to'],0) for s_ in st]
wx=[]
for km,n,hi in W:
    lat,lon,ele=at(km); wx.append({'km':km,'n':n,'h':hi,'lat':lat,'lon':lon,'ele':ele})
json.dump(wx,open(os.path.join(D,'weather.json'),'w'),ensure_ascii=False,indent=0)
print("features:",len(out),"weather points:",len(wx),"high:",sum(w['h'] for w in wx))
