"""Curated passes/notes with tour-description links -> data/features.json; weather points -> data/weather.json"""
import numpy as np, json, os, urllib.request, urllib.error
HERE=os.path.dirname(os.path.abspath(__file__)); D=os.path.join(HERE,'..','data')
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
LINKS={'quaeldich':'quäldich','hikr':'hikr.org','trailch':'trail.ch','mtbiker':'mountainbiker.ch','itin':'itinerarium','rif':'Rifugio','park':'Parco','climb':'climbfinder','gravelz':'Gravel Zürich','passzwang':'passzwang','bikesophy':'bikesophy','tourispo':'tourispo'}
F=[
 dict(km=83.8,k='pass',n='Wildhaus-Sattel',ele=1038,txt='Höchster Punkt des Toggenburgs, dann Abfahrt ins Rheintal.',links=[]),
 dict(km=144.4,k='pass',n='Kunkelspass',ele=1357,txt='Alte Römer-Säumerroute, autofrei. Vättis-Seite asphaltiert, ~4 km Schotter über den Pass; die Tamins-Seite (Abfahrt) 5,9 km mit 12 % Schnitt, Rampen bis 20 %.',
      links=[('quaeldich','https://www.quaeldich.de/paesse/kunkelspass/'),('climb','https://climbfinder.com/de/anstiege/kunkelspass'),('bikesophy','https://www.bikesophy.com/gravel/gravelbike-tour-ueber-den-kunkelspass'),('gravelz','https://gravelzuerich.wordpress.com/2021/01/25/vom-taminatal-ins-rheintal/')]),
 dict(km=223.7,k='pass',n='Lukmanierpass',ele=1915,txt='Asphalt-Passstrasse, mässiger Verkehr. Hospezi Santa Maria direkt am Pass (km 225,6).',
      links=[('quaeldich','https://www.quaeldich.de/paesse/lukmanierpass/'),('passzwang','https://www.passzwang.net/de/lukmanier.php')]),
 dict(km=227.5,k='push',n='Schieben 1 · Beginn',ele=1929,txt='Track wird Pfad: 1,9 km, +278 m, Ø 15 %, steilste 200 m 18 %. OSM: smoothness very_horrible, mtb:scale 2. Bachbett-artig, praktisch alle schieben.',links=[]),
 dict(km=231.4,k='pass',n="Passo dell'Uomo",ele=2218,txt='Autofrei. Danach 9 km Naturstrasse durchs Val Piora zum Lago Ritom – fahrbar, aber grob.',
      links=[('hikr','https://www.hikr.org/dir/Passo_dell_Uomo_7353/mtb/'),('trailch','https://www.trail.ch/tour/ritomsee/ritomsee.htm'),('mtbiker','https://mountainbiker.ch/touren/passo-dell-uomo-passo-del-sole')]),
 dict(km=240.0,k='note',n='Lago Ritom',ele=1811,txt='Rifugio Lago Ritom (220 m abseits). Abfahrt zur Staumauer und nach Piotta auf schmaler Asphaltstrasse.',links=[]),
 dict(km=265.5,k='push',n='Schieben 2 · Beginn',ele=1923,txt='Abzweig von der Nufenenstrasse auf den Bergweg (weiss-rot-weiss): 3,3 km, +374 m, steilste 200 m 26 %, dann langes flaches Gipfelplateau. Teils sac_scale mountain_hiking (T2).',links=[]),
 dict(km=268.8,k='pass',n='Passo San Giacomo',ele=2313,txt='Höchster Punkt der Tour. Grenze CH/IT, alte Finanzkaserne. Ab hier die alte ENEL-Staudammstrasse: 9 km Schotterkehren am Lago Toggia vorbei nach Riale.',
      links=[('quaeldich','https://www.quaeldich.de/paesse/passo-san-giacomo/'),('hikr','https://www.hikr.org/dir/Passo_San_Giacomo_6930/'),('itin','https://www.itinerarium.it/escursioni/31/passo-san-giacomo'),('tourispo','https://www.tourispo.com/biketrack/over-the-passo-san-giacomo.html')]),
 dict(km=272.5,k='note',n='Rifugio Maria Luisa',ele=2157,txt='2 160 m am Lago Toggia. Juni–September, mittwochs geschlossen. +39 0324 63086.',links=[('rif','https://www.rifugiomarialuisa.it/')]),
 dict(km=441.7,k='note',n='Ghislarengo · Reisebene',ele=149,txt='Einziges Hotel in 61 km (2,3 km abseits). Alternative: 12 km nach Vercelli. Kein Zeltplatz, kein Wald – hier nicht wild campen.',links=[]),
 dict(km=616.8,k='pass',n='Capanne di Marcarolo',ele=709,txt='9 km Schotteranstieg durch den Naturpark (260 → 709 m). Zelt zählt im Park nur oberhalb 900 m als Biwak – die Route bleibt darunter, also durchfahren.',
      links=[('park','https://www.areeprotetteappenninopiemontese.it/2011/03/08/domande-frequenti/')]),
 dict(km=635.5,k='pass',n='Passo del Turchino',ele=542,txt='SS 456, Hauptstrasse mit Tunnel am Scheitel; die Autobahn nimmt den meisten Verkehr.',links=[('quaeldich','https://www.quaeldich.de/paesse/passo-del-turchino/')]),
 dict(km=652.0,k='note',n='Genova Voltri',ele=18,txt='Die letzten 15 km Aurelia sind Stadtverkehr. Regionalzug Voltri → Genova Piazza Principe, 20 min, Fahrrad erlaubt.',links=[]),
]
out=[]
for f in F:
    lat,lon,ele=at(f['km']); L=[]
    for key,url in f['links']:
        good=ok(url); print(("  ok  " if good else "  DEAD"),url,flush=True)
        if good: L.append({'l':LINKS[key],'u':url})
    out.append({'km':f['km'],'k':f['k'],'n':f['n'],'ele':f['ele'],'lat':lat,'lon':lon,'txt':f['txt'],'links':L})
json.dump(out,open(os.path.join(D,'features.json'),'w'),ensure_ascii=False,indent=0)
W=[(0,'Konstanz',0),(31,'Wil',0),(62,'Ebnat-Kappel',0),(83.8,'Wildhaus-Sattel',1),(97,'Gams / Rheintal',0),(120.6,'Bad Ragaz',0),(137,'Vättis',0),(144.4,'Kunkelspass',1),(153,'Bonaduz',0),
   (166,'Versam',0),(174.3,'Ilanz',0),(194,'Trun',0),(208,'Disentis',0),(211.5,'Curaglia',0),(223.7,'Lukmanierpass',1),(231.4,"Passo dell'Uomo",1),(240,'Lago Ritom',0),
   (249.9,'Airolo',0),(262,"All'Acqua",0),(268.8,'Passo San Giacomo',1),(277.9,'Riale',0),(285,'Formazza',0),(300,'Baceno / Premia',0),(324,'Domodossola',0),(358.7,'Mergozzo',0),(369.4,'Omegna',0),
   (380,'Lago d\'Orta Ostufer',0),(388,'Gozzano',0),(406,'Romagnano Sesia',0),(425,'Reisebene',0),(441.7,'Ghislarengo',0),(457,'Santhià',0),(481,'Crescentino',0),(492,'Monferrato Brozolo',1),(510,'Cortazzone',0),(533.5,'Asti',0),
   (555,'Felizzano',0),(570,'Castellazzo Bormida',0),(590,'Predosa',0),(597.5,"Silvano d'Orba",0),(616.8,'Capanne di Marcarolo',1),(627,'Campo Ligure',0),(635.5,'Passo del Turchino',1),(652,'Voltri',0),(667.5,'Genova',0)]
wx=[]
for km,n,hi in W:
    lat,lon,ele=at(km); wx.append({'km':km,'n':n,'h':hi,'lat':lat,'lon':lon,'ele':ele})
json.dump(wx,open(os.path.join(D,'weather.json'),'w'),ensure_ascii=False,indent=0)
print("features:",len(out),"weather points:",len(wx),"high:",sum(w['h'] for w in wx))
