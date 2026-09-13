// ---- markup (shared by all tour pages; the stub only carries head/meta) ----
const TEMPLATE=`<div id="map"></div>
<div class="hdr"><div class="bar">
  <div class="row1"><h1 id="h1"></h1><div class="sub" id="sub"></div></div>
  <div class="chips" id="chips"></div>
</div></div>
<div class="gear" id="gear">
  <label><input type="checkbox" id="opt-hc"><span>Hoher Kontrast<small>grosse Schrift, dicke Linie – zum Lesen beim Fahren</small></span></label>
  <label><input type="checkbox" id="opt-big"><span>Grosse Symbole<small>Zelt, Hütte, Bett, Pässe 1,7×</small></span></label>
  <label><input type="checkbox" id="opt-all"><span>Unterkünfte immer zeigen<small>Betten und Hütten in allen Zoomstufen (Planung)</small></span></label>
  <label><input type="checkbox" id="opt-follow"><span>Profil folgt Karte<small>Profil zeigt den Teil der Route, der auf der Karte zu sehen ist</small></span></label>
</div>
<div class="sheet" id="sheet">
  <div class="handle" id="handle"><i></i></div>
  <div class="navrow"><div class="nav off" id="nav">GPS aus — ◎ antippen für Standort</div><a id="navwx" class="navwx" href="#" target="_blank" rel="noopener">☁ Ziel</a></div>
  <div class="stat" id="stat"></div>
  <div class="strip" id="wx"></div>
  <div class="strip" id="fx"></div>
  <canvas id="prof"></canvas>
  <div class="legend"><span><i style="background:#2C3E63"></i>Asphalt</span><span><i style="background:#E08A00"></i>Schotter</span><span><i style="background:#E0242A"></i>Pfad/schieben</span><span class="x"><i class="pm camp" style="display:inline-block;vertical-align:middle;margin-right:3px;width:11px;height:10px"></i>Zeltplatz</span><span class="x"><i class="pm hut" style="display:inline-block;vertical-align:middle;margin-right:3px;width:10px;height:10px"></i>Hütte</span><span class="x"><i class="pm bed" style="display:inline-block;vertical-align:middle;margin-right:3px"></i>Bett</span><span><i style="background:#7B3F9E;height:3px;border-top:2px dashed #7B3F9E;background:none"></i>Variante</span><span class="x"><i style="background:linear-gradient(90deg,#F2D16B,#F0A040,#E0524A,#9E1B1B);height:6px"></i>Steigung 3–12 %</span><span class="x"><i class="pm biv" style="display:inline-block;vertical-align:middle;margin-right:3px;width:9px;height:9px"></i>Biwak</span><span class="attr"><span class="ver">pr5</span> · © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OSM</a> · OpenTopoMap</span></div>
</div>`;
(function(){
document.body.insertAdjacentHTML('afterbegin',TEMPLATE);
const RT=window.RT, TOUR=RT.tour||{slug:'genova',name:'',ch:true,files:'files/'}, S=RT.stages, ND=S.length, css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const MAPCOL={p:'#2C3E63',g:'#E08A00',t:'#E0242A'};          // theme-independent: the map tiles don't flip
const GRADECOL=['','#F2D16B','#F0A040','#E0524A','#9E1B1B'];   // climb grade bins 3–6, 6–9, 9–12, >12 % under the profile line
const $=id=>document.getElementById(id);
let day=0, varSel=null;
const AP=()=>varSel?varSel.pts:P;
let OPT={hc:false,big:false,all:false,follow:true}; try{ Object.assign(OPT,JSON.parse(localStorage.getItem('rt.opt')||'{}')); }catch(e){}
function applyOpt(){ document.body.classList.toggle('hc',OPT.hc); document.body.classList.toggle('big',OPT.big); try{ localStorage.setItem('rt.opt',JSON.stringify(OPT)); }catch(e){} }
applyOpt();
// ---- flatten points ----
const P=[]; for(const s of RT.track){ for(const q of s.pts){ if(!P.length||q[3]>P[P.length-1][3]) P.push([q[0],q[1],q[2],q[3],s.c]); } }
const TOTAL=P[P.length-1][3]; const UP=S.reduce((x,s)=>x+s.up,0), DN=S.reduce((x,s)=>x+s.down,0);
$('h1').textContent=TOUR.name||''; document.title=TOUR.name||document.title; $('sub').textContent=`${Math.floor(TOTAL)} km · ↑ ${UP.toLocaleString('de')} m · ${ND} Tage`;
function idxIn(A,km){ let lo=0,hi=A.length-1; while(lo<hi){const m=(lo+hi)>>1; if(A[m][3]<km) lo=m+1; else hi=m;} return lo; }
function idxAtKm(km){ return idxIn(AP(),km); }
// grade in % at each point: index 5 over the 200 m around it (labels, zoomed profile), index 6 over 1 km (colouring of wide windows)
function eleAt(A,km){ const j=idxIn(A,km); if(j===0) return A[0][2]; const p=A[j-1], q=A[j], t=Math.min(1,Math.max(0,(km-p[3])/(q[3]-p[3]||1))); return p[2]+(q[2]-p[2])*t; }
function addGrades(A){ const kmax=A[A.length-1][3]; const g=(k,r)=>{ const k0=Math.max(0,k-r), k1=Math.min(kmax,k+r); return k1>k0?(eleAt(A,k1)-eleAt(A,k0))/((k1-k0)*10):0; }; for(const p of A){ p[5]=g(p[3],0.1); p[6]=g(p[3],0.5); } }
addGrades(P); for(const v of (RT.variants||[])) addGrades(v.pts);
function fmtKm(x){return x.toFixed(1).replace('.',',')+' km';}
function stageOf(km){ if(day){ const st=S[day-1]; if(km>=st.start_km-1e-6&&km<=st.end_km+1e-6) return st; } return S.find(s=>km<=s.end_km+1e-6)||S[ND-1]; }
function nearest(lat,lon){ const A=AP(); const cl=Math.cos(lat*Math.PI/180); let best=1e18,bi=0;
  for(let i=0;i<A.length;i++){const dy=(A[i][0]-lat),dx=(A[i][1]-lon)*cl,d=dx*dx+dy*dy; if(d<best){best=d;bi=i;}}
  return {i:bi,km:A[bi][3],dist:Math.sqrt(best)*111.32}; }
function endOf(km){ if(varSel) return {to:varSel.to||S[varSel.day-1].to,end_km:varSel.km,day:varSel.day}; const st=stageOf(km); return {to:st.to,end_km:st.end_km,day:st.day}; }
const esc=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function popt(extra){ const hdr=document.querySelector('.hdr .bar').getBoundingClientRect(), sh=sheet.getBoundingClientRect(); return Object.assign({maxWidth:300,autoPanPaddingTopLeft:[10,hdr.bottom+10],autoPanPaddingBottomRight:[10,Math.max(0,innerHeight-sh.top)+10]},extra||{}); }
function ext(lat,lon,name,o){ o=o||{}; const la=lat.toFixed(5), lo=lon.toFixed(5), q=`${la},${lo}`; const L_=[];
  L_.push(['Google Maps',`https://www.google.com/maps/search/?api=1&query=${q}`],['Street View',`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${q}`],
    ['Satellit',`https://www.google.com/maps/@${q},600m/data=!3m1!1e3`],['Mapillary',`https://www.mapillary.com/app/?lat=${la}&lng=${lo}&z=15`],
    ['Flickr',`https://www.flickr.com/map/?fLat=${la}&fLon=${lo}&zl=14`],['Commons',`https://commons.wikimedia.org/wiki/Special:Nearby#/coord/${q}`]);
  const K=[['Komoot',`https://www.komoot.com/discover/Tour/@${q}/tours?sport=mtb&map=true`],['Strava-Heatmap',`https://www.strava.com/maps/global-heatmap?sport=All&style=standard#14/${la}/${lo}`],['OSM',`https://www.openstreetmap.org/?mlat=${la}&mlon=${lo}#map=15/${la}/${lo}`]];
  if(lat>45.8&&lon<10.5&&lat<47.9) K.push(['swisstopo (CH)',swissUrl(lat,lon)]);
  if(o.peak) K.push(['PeakFinder',`https://www.peakfinder.com/?lat=${la}&lng=${lo}&azi=180&zoom=4`]);
  const row=(t,arr)=>`<div class="ext"><span class="ty">${t}</span>${arr.map(([l,u])=>`<a href="${u}" target="_blank" rel="noopener">${l}</a>`).join('')}</div>`;
  return row('Fotos',L_)+row('Karten',K); }
function swissUrl(lat,lon){ const phi=lat*3600, lam=lon*3600, p=(phi-169028.66)/1e4, l=(lam-26782.5)/1e4;
  const E=2600072.37+211455.93*l-10938.51*l*p-0.36*l*p*p-44.54*l**3, N=1200147.07+308807.95*p+3745.25*l*l+76.63*p*p-194.56*l*l*p+119.79*p**3;
  return `https://map.geo.admin.ch/#/map?lang=de&center=${E.toFixed(0)},${N.toFixed(0)}&z=9&bgLayer=ch.swisstopo.swissimage&layers=ch.swisstopo.swisstlm3d-wanderwege`; }
const wx=(lat,lon,name)=>`https://oduerr.github.io/weather/?lat=${lat.toFixed(5)}&lon=${lon.toFixed(5)}&name=${encodeURIComponent(name)}&model=bestmatch&panel=temperature&view=5d`;
// ---- map ----
const sheet=$('sheet');
const map=L.map('map',{preferCanvas:true,zoomControl:false,attributionControl:false});
L.control.zoom({position:'topright'}).addTo(map);
L.control.attribution({position:'bottomleft',prefix:false}).addTo(map);
L.control.scale({position:'bottomleft',imperial:false,maxWidth:120}).addTo(map);
const topo=L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',{maxZoom:17,attribution:'© OpenStreetMap, SRTM · © OpenTopoMap (CC-BY-SA)'});
const osm=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'});
const swiss=L.tileLayer('https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg',{maxZoom:18,attribution:'© swisstopo'});
const sat=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'© Esri, Maxar'});
topo.addTo(map);
// ---- route (non-interactive; one map click -> nearest point) ----
const routeLayer=L.layerGroup().addTo(map);
for(const s of RT.track){ L.polyline(s.pts.map(q=>[q[0],q[1]]),{color:'#fff',weight:8,opacity:.8,interactive:false}).addTo(routeLayer); }
const routeLines=RT.track.map(s=>L.polyline(s.pts.map(q=>[q[0],q[1]]),{color:MAPCOL[s.c]||MAPCOL.p,weight:4,opacity:.95,interactive:false}).addTo(routeLayer));
const casing=RT.track.map((s,i)=>routeLayer.getLayers()[i]);
function routeStyle(){ const z=map.getZoom(); const w=(z>=12?5:4)+(OPT.hc?3:0); routeLines.forEach(l=>l.setStyle({weight:w})); casing.forEach(l=>l.setStyle({weight:w+4,color:OPT.hc?'#000':'#fff',opacity:OPT.hc?.9:.8})); }
map.on('zoomend',routeStyle);
map.on('click',e=>{ const n=nearest(e.latlng.lat,e.latlng.lng); const q=AP()[n.i]; const px=map.latLngToContainerPoint([q[0],q[1]]).distanceTo(map.latLngToContainerPoint(e.latlng)); if(px<=28){ setCursor(n.km,false); cursor.closeTooltip(); cursor.openPopup(); } });
// ---- places ----
const PL=RT.places||[]; const TY={camp_site:'Zeltplatz',caravan_site:'Stellplatz (Zelt ok)',alpine_hut:'Berghütte',wilderness_hut:'Biwak / Schutzhütte (unbewirtet)',hostel:'Hostel',hotel:'Hotel',guest_house:'Pension / B&B',chalet:'Chalet',apartment:'Ferienwohnung',motel:'Motel'};
function popup(pl){ const st=stageOf(pl.km); const off=pl.off>=1?pl.off.toFixed(1).replace('.',',')+' km':Math.round(pl.off*1000)+' m';
  const hgt=pl.off>0.3?`Route auf ${pl.ele} m`:`${pl.ele} m`;
  let h=`<div class="ty">${TY[pl.t]||esc(pl.t)}${pl.e?' · <b style="font-size:12px;color:#1D6E8C">am Etappenziel</b>':''}${pl.bc?' · Naturplatz':''}</div><b>${esc(pl.n||TY[pl.t]||'?')}</b><br>km ${pl.km.toFixed(1)} (Tag ${st.day}) · ${off} neben der Route · ${hgt}`;
  if(pl.o) h+=`<br><span class="ty">Öffnung</span> ${esc(pl.o)}`;
  h+='<div class="links">'; if(pl.w) h+=`<a href="${esc(pl.w.startsWith('http')?pl.w:'https://'+pl.w)}" target="_blank" rel="noopener">Website</a>`; if(pl.p) h+=`<a href="tel:${esc(pl.p.replace(/\s/g,''))}">${esc(pl.p)}</a>`;
  h+=`<a href="${wx(pl.lat,pl.lon,pl.n||TY[pl.t])}" target="_blank" rel="noopener">Wetter</a><a href="#" data-km="${pl.km}" class="tokm">Im Profil</a></div>`+ext(pl.lat,pl.lon,pl.n); return h; }
const icon=pl=>L.divIcon({className:'',html:`<div class="pmw${pl.e?' end':''}"><div class="pm ${pl.k}"></div></div>`,iconSize:[28,28],iconAnchor:[14,14],popupAnchor:[0,-12]});
const campLayer=L.layerGroup().addTo(map), hutLayer=L.layerGroup().addTo(map);
const bedLayer=L.markerClusterGroup({maxClusterRadius:36,disableClusteringAtZoom:13,showCoverageOnHover:false}).addTo(map);
const PM=PL.map(pl=>({pl,m:L.marker([pl.lat,pl.lon],{icon:icon(pl),title:pl.n,zIndexOffset:(pl.e?300:0)+(pl.k==='camp'?200:pl.k==='bed'?0:100)}).bindPopup(popup(pl),popt())}));
let bedsWanted=[], bedsShown=null;
function buildPlaces(){ const [a,b]=range(); campLayer.clearLayers(); hutLayer.clearLayers(); bedsWanted=[];
  for(const {pl,m} of PM){ if(day&&(pl.km<a-2||pl.km>b+2)) continue; if(pl.k==='camp') campLayer.addLayer(m); else if(pl.k==='hut'||pl.k==='biv') hutLayer.addLayer(m); else bedsWanted.push(m); }
  bedsShown=null; syncBeds(); }
// beds: the cluster group must stay attached to the map while its contents change (markercluster needs _map); shown from zoom 10
function syncBeds(){ if(!map.hasLayer(bedLayer)) return; const show=OPT.all||map.getZoom()>=12; if(show===bedsShown) return; bedLayer.clearLayers(); if(show) bedLayer.addLayers(bedsWanted); bedsShown=show; }
map.on('zoomend',syncBeds); map.on('overlayadd',e=>{ if(e.layer===bedLayer){ bedsShown=null; syncBeds(); } });
// huts: plain layer group, safe to detach; shown from zoom 9 unless the user switched them off
let hutWant=true, auto=false; map.on('overlayadd',e=>{ if(e.layer===hutLayer&&!auto) hutWant=true; }); map.on('overlayremove',e=>{ if(e.layer===hutLayer&&!auto) hutWant=false; });
function declutter(){ auto=true; const sh=hutWant&&(OPT.all||map.getZoom()>=10); if(sh&&!map.hasLayer(hutLayer)) hutLayer.addTo(map); if(!sh&&map.hasLayer(hutLayer)) map.removeLayer(hutLayer); auto=false; }
map.on('zoomend',declutter);
// ---- variants (alternative routes, dashed) ----
const VR=RT.variants||[]; const varLayer=L.layerGroup().addTo(map); const varLines=[];
for(const v of VR){ const ll=v.pts.map(q=>[q[0],q[1]]);
  L.polyline(ll,{color:'#fff',weight:7,opacity:.7,interactive:false}).addTo(varLayer);
  const l=L.polyline(ll,{color:'#7B3F9E',weight:4,opacity:.95,dashArray:'10 8'}).bindPopup(()=>`<div class="ty">Variante · Tag ${v.day}</div><b>${esc(v.n)}</b><br>${v.km} km · ↑ ${v.up} m<br>${esc(v.txt)}<div class="links"><a href="#" class="varsel" data-day="${v.day}">Profil zeigen</a><a href="${TOUR.files}${v.file}" download>GPX laden</a></div>`,popt()).addTo(varLayer); varLines.push({v,l}); }
function syncVariants(){ for(const {v,l} of varLines){ const show=!day||day===v.day||day===v.day-1; if(show&&!varLayer.hasLayer(l)) l.addTo(varLayer); if(!show&&varLayer.hasLayer(l)) varLayer.removeLayer(l); } }
// ---- features + weather ----
const FE=RT.features||[], WX=RT.weather||[]; const KIND={pass:'Pass',push:'Schiebepassage',note:'Hinweis'};
function fpopup(f){ const st=stageOf(f.km); let h=`<div class="ty">${KIND[f.k]} · km ${f.km.toFixed(1)} · Tag ${st.day}</div><b>${f.n}</b> <span style="color:var(--muted)">${f.ele} m</span><br>${f.txt}<div class="links">`;
  for(const l of f.links) h+=`<a href="${l.u}" target="_blank" rel="noopener">${l.l}</a>`;
  h+=`<a href="${wx(f.lat,f.lon,f.n)}" target="_blank" rel="noopener">Wetter</a><a href="#" data-km="${f.km}" class="tokm">Im Profil</a></div>`+ext(f.lat,f.lon,f.n,{peak:f.k==='pass'}); return h; }
const featLayer=L.layerGroup().addTo(map), featMarkers={};
for(const f of FE){ const m=L.marker([f.lat,f.lon],{icon:L.divIcon({className:'',html:`<div class="pm ${f.k}"></div>`,iconSize:[18,16],iconAnchor:[9,8],popupAnchor:[0,-8]}),title:f.n,zIndexOffset:500}).bindPopup(fpopup(f),popt());
  if(f.k==='pass') m.bindTooltip(`${f.n} ${f.ele} m`,{permanent:true,direction:'right',offset:[8,0],className:'passlbl',interactive:true});
  featLayer.addLayer(m); featMarkers[f.km]=m; }
const stageMarkers=[];
function relabel(){ const z=map.getZoom(); for(const f of FE){ if(f.k!=='pass') continue; const m=featMarkers[f.km], tt=m.getTooltip(); if(!tt) continue; if(z>=10) m.openTooltip(); else m.closeTooltip(); }
  for(const {m,st} of stageMarkers){ const short=z<9; const html=short?`<div class="stagelbl">${st.day}</div>`:`<div class="stagelbl">${st.day}·${esc(st.to)}</div>`; if(m._lblShort!==short){ m.setIcon(L.divIcon({className:'',html,iconAnchor:short?[-6,18]:[-7,24]})); m._lblShort=short; } } }
map.on('zoomend',relabel);
const wxLayer=L.layerGroup(), wxHi=L.layerGroup(), wxAll=L.layerGroup(); let wxOn=true, wxAuto=false;
const nearPassOrEnd=w=>FE.some(f=>f.k==='pass'&&Math.abs(f.km-w.km)<0.6)||S.some(st=>Math.abs(st.end_km-w.km)<0.6);
const offEle=w=>{ const f=FE.find(f=>f.k==='pass'&&Math.abs(f.km-w.km)<0.6); return f?f.ele:w.ele; };
for(const w of WX){ if(nearPassOrEnd(w)) continue; const m=L.marker([w.lat,w.lon],{icon:L.divIcon({className:'',html:`<div class="wxm${w.h?' hi':''}">☁ ${w.n}</div>`,iconAnchor:[0,10]}),zIndexOffset:w.h?400:100});
  m.bindPopup(`<div class="ty">Wetter · km ${w.km} · ${offEle(w)} m</div><b>${esc(w.n)}</b><div class="links"><a href="${wx(w.lat,w.lon,w.n)}" target="_blank" rel="noopener">5-Tage-Wetter öffnen</a></div>`+ext(w.lat,w.lon,w.n,{peak:!!w.h}),popt()); (w.h?wxHi:wxAll).addLayer(m); }
function wxZoom(){ const z=map.getZoom(); wxAuto=true; try{ if(!wxOn||z<8){ if(map.hasLayer(wxLayer)) map.removeLayer(wxLayer); return; } if(!map.hasLayer(wxLayer)) wxLayer.addTo(map);
  if(!wxLayer.hasLayer(wxHi)) wxLayer.addLayer(wxHi); if(z>=11&&!wxLayer.hasLayer(wxAll)) wxLayer.addLayer(wxAll); if(z<11&&wxLayer.hasLayer(wxAll)) wxLayer.removeLayer(wxAll); } finally { wxAuto=false; } }
map.on('zoomend',wxZoom); map.on('overlayadd',e=>{ if(e.layer===wxLayer&&!wxAuto){wxOn=true; wxZoom();} }); map.on('overlayremove',e=>{ if(e.layer===wxLayer&&!wxAuto) wxOn=false; });
L.control.layers(Object.assign({'OpenTopoMap':topo},TOUR.ch?{'swisstopo (nur CH)':swiss}:{},{'Satellit':sat,'OSM':osm}),{'Zeltplätze':campLayer,'Hütten & Biwaks (ab Zoom 10)':hutLayer,'Betten (ab Zoom 12)':bedLayer,'Pässe & Hinweise':featLayer,'Asphalt-Varianten (gestrichelt)':varLayer,'Wetterpunkte':wxLayer},{position:'topright',collapsed:true}).addTo(map);
// stage-end labels
for(const st of S){ const m=L.marker([st.lat,st.lon],{icon:L.divIcon({className:'',html:`<div class="stagelbl">${st.day}·${esc(st.to)}</div>`,iconAnchor:[-7,24]}),zIndexOffset:600}); stageMarkers.push({m,st}); m
  .bindPopup(()=>{ const lo=PL.filter(pl=>pl.e&&Math.abs(pl.km-st.end_km)<=4).sort((x,y)=>(x.k==='camp'?0:x.k==='bed'?2:1)-(y.k==='camp'?0:y.k==='bed'?2:1)||x.off-y.off);
    const li=lo.map(pl=>`<div>${pl.k==='camp'?'⛺':pl.k==='bed'?'🛏':'🏠'} ${esc(pl.n||TY[pl.t])} <span style="color:var(--muted)">${pl.off>=1?pl.off.toFixed(1).replace('.',',')+' km':Math.round(pl.off*1000)+' m'}</span>${pl.p?` · <a href="tel:${esc(pl.p.replace(/\s/g,''))}">${esc(pl.p)}</a>`:''}</div>`).join('');
    return `<div class="ty">Etappenziel Tag ${st.day} · km ${st.end_km}</div><b>${esc(st.to)}</b> <span style="color:var(--muted)">${st.ele} m</span><br>${esc(st.from)} → ${esc(st.to)}: ${st.km} km · ↑ ${st.up} m · ↓ ${st.down} m${li?`<div style="margin-top:6px;font-size:13px">${li}</div>`:'<div style="margin-top:6px;font-size:13px;color:var(--muted)">Keine Unterkunft im Umkreis erfasst</div>'}<div class="links"><a href="#" class="today" data-day="${st.day}">Tag ${st.day} zeigen</a><a href="${wx(st.lat,st.lon,st.to)}" target="_blank" rel="noopener">Wetter</a></div>`+ext(st.lat,st.lon,st.to); },popt()).addTo(map); }
map.on('popupopen',e=>{ const el=e.popup.getElement(); const a=el.querySelector('.tokm'); if(a) a.onclick=ev=>{ev.preventDefault(); const km=+a.dataset.km; const [ra,rb]=range(); if(km<ra||km>rb) selectDay(stageOf(km).day,true); const wasMin=sheet.classList.contains('min'); sheet.classList.remove('min');
    const go=()=>{ syncWin(); if(OPT.follow&&!(km>=win.a&&km<=win.b)){ const p=AP()[idxAtKm(km)]; map.panTo([p[0],p[1]]); } setCursor(km,true); }; wasMin?setTimeout(go,280):go(); };
  const b=el.querySelector('.today'); if(b) b.onclick=ev=>{ev.preventDefault(); selectDay(+b.dataset.day); map.closePopup();};
  const c=el.querySelector('.varsel'); if(c) c.onclick=ev=>{ev.preventDefault(); const v=VR.find(x=>x.day===+c.dataset.day); if(v) selectVariant(v); map.closePopup();}; });
// ---- strips ----
function strips(){ let [a,b]=range(); if(varSel){ const st=S[varSel.day-1]; a=st.start_km; b=st.end_km; }
  const st=varSel&&varSel.to?{to:varSel.to,lat:varSel.tlat,lon:varSel.tlon,end_km:S[varSel.day-1].end_km}:(day?S[day-1]:S[ND-1]); const wl=WX.filter(w=>day?(w.km>=a-0.1&&w.km<=b+2.5&&Math.abs(w.km-st.end_km)>0.6):(w.h||w.km===0));
  $('wx').innerHTML='<span class="lbl">Wetter</span>'+`<a class="ziel" style="background:#1D6E8C;color:#fff" href="${wx(st.lat,st.lon,st.to)}" target="_blank" rel="noopener">🏁 ${esc(st.to)}</a>`+wl.map(w=>`<a class="${w.h?'hi':''}" href="${wx(w.lat,w.lon,w.n)}" target="_blank" rel="noopener">${w.h?'▲ ':''}${esc(w.n)}</a>`).join('');
  const nw=$('navwx'); if(nw){ nw.href=wx(st.lat,st.lon,st.to); nw.textContent='☁ '+st.to; }
  const fl=FE.filter(f=>f.km>=a-0.1&&f.km<=b+(day?2.5:0.1)); const fx=$('fx'); fx.style.display=(fl.length||day)?'':'none';
  let hint=''; if(day){ const cs=PL.filter(pl=>pl.k==='camp'&&pl.km>=a-2&&pl.km<=b+2); if(!cs.length){ const nx=PL.find(pl=>pl.k==='camp'&&pl.km>b); hint=`<button data-km="${nx?nx.km:b}" class="hi" style="background:#2E8B57;color:#fff">⛺ kein Zeltplatz auf dieser Etappe${nx?' · nächster bei km '+nx.km.toFixed(0)+' ('+esc(nx.n||'Camping')+')':''}</button>`; } }
  const vh=VR.filter(v=>day&&v.day===day).map(v=>`<button data-var="${v.day}" style="background:${varSel===v?'#4B1F6E':'#7B3F9E'};color:#fff">${varSel===v?'✓ ':'⇄ '}${esc(v.n)}</button>`).join('')+(varSel?`<button data-orig="1">↩ Original Tag ${varSel.day}</button>`:'');
  fx.innerHTML='<span class="lbl">Punkte</span>'+hint+vh+fl.map(f=>`<button data-km="${f.km}">${f.k==='push'?'⚠ ':f.k==='pass'?'▲ ':'ⓘ '}${esc(f.n)}</button>`).join('');
  fx.style.display=(hint||vh||fl.length)?'':'none';   // nothing to show on this day: no empty row
  fx.querySelectorAll('button[data-var]').forEach(bt=>bt.onclick=()=>{ const v=VR.find(x=>x.day===+bt.dataset.var); if(v) varSel===v?selectDay(v.day):selectVariant(v); });
  fx.querySelectorAll('button[data-orig]').forEach(bt=>bt.onclick=()=>selectDay(varSel.day));
  fx.querySelectorAll('button[data-km]').forEach(bt=>bt.onclick=()=>{ const km=+bt.dataset.km; const m=featMarkers[km]; if(m){ map.setView(m.getLatLng(),Math.max(map.getZoom(),13)); m.openPopup(); } else { const p=AP()[idxAtKm(km)]; map.setView([p[0],p[1]],12); } setCursor(km,false); }); }
// ---- cursor ----
const cursor=L.marker([P[0][0],P[0][1]],{icon:L.divIcon({className:'cursordot',iconSize:[16,16]}),zIndexOffset:900,title:'Punkt auf der Route – antippen für Links'}).addTo(map);
cursor.bindPopup(()=>{ const i=idxAtKm(curKm), q=AP()[i], st=endOf(curKm); return `<div class="ty">${varSel?'Variante':'Route'} · Tag ${st.day} · Fotos &amp; Karten für diesen Punkt</div><b>km ${curKm.toFixed(1)} · ${q[2]} m</b><br>noch ${fmtKm(st.end_km-curKm)} bis ${esc(st.to)}<div class="links"><a href="${wx(q[0],q[1],'km '+curKm.toFixed(1))}" target="_blank" rel="noopener">Wetter</a><a href="#" class="share" data-km="${curKm.toFixed(1)}">Link kopieren</a></div>`+ext(q[0],q[1],'km '+curKm.toFixed(1)); },popt());
map.on('popupopen',e=>{ const a=e.popup.getElement().querySelector('.share'); if(a) a.onclick=ev=>{ ev.preventDefault(); const q=AP()[idxAtKm(curKm)]; const u=location.origin+location.pathname+`#d${endOf(curKm).day}/${q[0].toFixed(5)},${q[1].toFixed(5)}/15/p`; (navigator.clipboard?navigator.clipboard.writeText(u):Promise.reject()).then(()=>{a.textContent='Kopiert ✓';},()=>{prompt('Link:',u);}); }; });
cursor.bindTooltip('',{direction:'top',className:'rt',offset:[0,-8]});
let curKm=0;
function setCursor(km,openTip){ curKm=km; const i=idxAtKm(km), p=AP()[i]; cursor.setLatLng([p[0],p[1]]); const st=endOf(km);
  cursor.setTooltipContent(`${varSel?'Variante · ':''}km ${km.toFixed(1)} · ${p[2]} m<br>Tag ${st.day}: noch ${fmtKm(st.end_km-km)} bis ${st.to}`); if(openTip) cursor.openTooltip(); drawProfile(); }
// ---- day selection ----
const chips=$('chips');
function chip(label,d){const b=document.createElement('button');b.className='chip';b.textContent=label;b.onclick=()=>selectDay(d);chips.appendChild(b);return b;}
chip('Alle',0); for(const st of S) chip(String(st.day),st.day);
function range(){ if(varSel) return [0,varSel.km]; if(!day) return [0,TOTAL]; const st=S[day-1]; return [st.start_km,st.end_km]; }
function fitPad(){ const sh=sheet.getBoundingClientRect(), W=innerWidth, H=innerHeight, hdr=document.querySelector('.hdr .bar').getBoundingClientRect();
  const bottom=Math.max(0,H-sh.top); return W>=900?{paddingTopLeft:[24,hdr.bottom+16],paddingBottomRight:[sh.width+24,16]}:{paddingTopLeft:[16,hdr.bottom+12],paddingBottomRight:[16,bottom+12]}; }
let prog=false; function progMove(fn){ prog=true; try{ fn(); } finally { setTimeout(()=>{prog=false;},50); } }
// Leaflet ignores setView while a zoom animation runs (rapid chip taps / arrow keys): queue the latest fit until zoomend
let pendingFit=null; map.on('zoomend',()=>{ if(pendingFit&&!map._animatingZoom){ const g=pendingFit; pendingFit=null; g(); } });
function fitRoute(b){ const pad=fitPad(), go=()=>progMove(()=>map.fitBounds(b,pad)); if(map._animatingZoom) pendingFit=go; else { pendingFit=null; go(); } return map._loaded?map._getBoundsCenterZoom(b,pad):null; }
function selectDay(d,noFit){ varSel=null; day=Math.max(0,Math.min(ND,d|0)); if(!noFit) userMoved=false; [...chips.children].forEach((c,i)=>{c.classList.toggle('on',i===day); if(i===day) c.scrollIntoView({inline:'center',block:'nearest'});});
  const [a,b]=range();
  const stat=$('stat');
  if(!day) stat.innerHTML=`<b>Gesamt</b><span>${Math.floor(TOTAL)} km</span><span>↑ ${UP.toLocaleString('de')} m</span><span>↓ ${DN.toLocaleString('de')} m</span><span>${ND} Tage</span><span class="win" id="win"></span><span class="ci" id="ci"></span>`;
  else { const st=S[day-1]; stat.innerHTML=`<b>Tag ${st.day}</b><span><span class="from">${esc(st.from)} → </span><strong>${esc(st.to)}</strong></span><span>${st.km} km</span><span>↑ ${st.up.toLocaleString('de')} m</span><span>↓ ${st.down.toLocaleString('de')} m</span><span class="win" id="win"></span><span class="ci" id="ci"></span>`; }
  history.replaceState(null,'',day?('#d'+day):location.pathname); if(curKm<a||curKm>b) curKm=a; buildPlaces(); strips(); syncVariants();
  // fit first: a fitted day shows the whole stage, so the window is the full range until moveend refines it
  if(!noFit){ const pts=P.slice(idxAtKm(a),idxAtKm(b)+1).map(p=>[p[0],p[1]]); const v=fitRoute(L.latLngBounds(pts)); syncWin(v); } else syncWin();
  drawProfile(); updateNav(); }
function selectVariant(v){ varSel=v; day=v.day; [...chips.children].forEach((c,i)=>c.classList.toggle('on',i===day)); userMoved=false;
  const stat=$('stat'); stat.innerHTML=`<b>Tag ${v.day}b</b><span><strong>${esc(v.n.replace(/^Tag \d+b · /,''))}</strong></span><span>${v.km} km</span><span>↑ ${v.up} m</span><span class="win" id="win"></span><span class="ci" id="ci"></span>`;
  history.replaceState(null,'',`#d${v.day}v`); curKm=0; buildPlaces(); strips(); syncVariants();
  const e=varLines.find(x=>x.v===v); syncWin(e?fitRoute(e.l.getBounds()):null);
  updateNav(); setCursor(0,false); }
window.addEventListener('hashchange',()=>{ const h=location.hash.match(/^#d(\d+)/); if(!h) return; const d=+h[1]; if(d!==day) selectDay(d); });
// ---- profile window: the part of the route inside the visible map (between header and sheet) ----
let win={a:0,b:TOTAL,part:false,out:false};
function visLatLon(center,zoom){ const sz=map.getSize(), hdr=document.querySelector('.hdr .bar').getBoundingClientRect(), sh=sheet.getBoundingClientRect(), desk=innerWidth>=900;
  const x1=desk?Math.min(sz.x,sh.left):sz.x, y1=desk?sz.y:Math.min(sz.y,sh.top); if(x1<=0||y1<=hdr.bottom) return null;
  if(center===undefined){ center=map.getCenter(); zoom=map.getZoom(); } const c=map.project(center,zoom), h=sz.divideBy(2);
  const nw=map.unproject(c.subtract(h).add([0,hdr.bottom]),zoom), se=map.unproject(c.subtract(h).add([x1,y1]),zoom); return [se.lat,nw.lat,nw.lng,se.lng]; }
// km span of A[i0..i1] whose segments touch the lat/lon box B, or null. Segments, not just points: at high zoom a straight stretch can cross the view with both ends outside
// B = [lonMin,latMin,lonMax,latMax]. Own Liang–Barsky test (Leaflet's clipSegment rounds to whole degrees and can loop forever)
function segHits(x0,y0,x1,y1,B){ let t0=0,t1=1; const dx=x1-x0, dy=y1-y0;
  const clip=(p,q)=>{ if(p===0) return q>=0; const r=q/p; if(p<0){ if(r>t1) return false; if(r>t0) t0=r; } else { if(r<t0) return false; if(r<t1) t1=r; } return true; };
  return clip(-dx,x0-B[0])&&clip(dx,B[2]-x0)&&clip(-dy,y0-B[1])&&clip(dy,B[3]-y0); }
function visSpan(A,i0,i1,B){ let lo=Infinity,hi=-Infinity,q=null,qc=0; const code=p=>(p[1]<B[0]?1:p[1]>B[2]?2:0)|(p[0]<B[1]?4:p[0]>B[3]?8:0);
  for(let i=i0;i<=i1;i++){ const p=A[i], pc=code(p);
    if(!pc||(q&&!(qc&pc)&&(!qc||segHits(q[1],q[0],p[1],p[0],B)))){ if(q&&q[3]<lo) lo=q[3]; if(p[3]<lo) lo=p[3]; if(p[3]>hi) hi=p[3]; }
    q=p; qc=pc; }
  return lo===Infinity?null:[lo,hi]; }
// The profile shows the part of the route that is on screen (whole route, or the selected variant), whatever the zoom.
// The day only decides where the map is fitted. Toggle off (or nothing visible): the whole selected stage.
function srange(){ return varSel?[0,varSel.km]:[0,TOTAL]; }
function syncWin(view){ const [ra,rb]=range(), [sa,sb]=srange(); const o=win; let w={a:ra,b:rb,part:false,out:false};
  if(OPT.follow&&map._loaded){ const V=view?visLatLon(view.center,view.zoom):visLatLon(); if(V){ const sp=visSpan(AP(),idxAtKm(sa),idxAtKm(sb),[V[2],V[0],V[3],V[1]]);
    if(!sp) w.out=true;
    else { let [lo,hi]=sp; if(hi-lo<2){ const m=(lo+hi)/2; lo=Math.max(sa,m-1); hi=Math.min(sb,lo+2); lo=Math.max(sa,hi-2); }
      w.a=lo; w.b=hi; w.part=lo>sa||hi<sb; } } }
  win=w; return w.a!==o.a||w.b!==o.b||w.part!==o.part||w.out!==o.out; }
map.on('moveend',()=>{ if(syncWin()) drawProfile(); });   // ~0.5 ms per update, no debounce needed
// ---- profile ----
const cv=$('prof'), ctx=cv.getContext('2d');
function syncSheet(){ const h=sheet.classList.contains('min')?66+Math.max(0,parseFloat(getComputedStyle(sheet).paddingBottom)-8):sheet.offsetHeight; const v=Math.round(h)+'px'; const r=document.documentElement.style; if(r.getPropertyValue('--sheet-h')!==v) r.setProperty('--sheet-h',v); }
function drawProfile(){ syncSheet(); const dpr=window.devicePixelRatio||1, W=cv.clientWidth, H=cv.clientHeight; if(!W) return;
  if(cv.width!==W*dpr||cv.height!==H*dpr){cv.width=W*dpr;cv.height=H*dpr;} ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,W,H);
  const P=AP(), {a,b}=win, F=OPT.hc?13:11, L0=OPT.hc?40:34,R0=8,T0=14,B0=18, i0=idxAtKm(a), i1=idxAtKm(b), overview=!varSel&&(b-a)>=150;
  let emin=1e9,emax=-1e9; for(let i=i0;i<=i1;i++){emin=Math.min(emin,P[i][2]);emax=Math.max(emax,P[i][2]);}
  const span=emax-emin, step=span>1500?500:span>600?250:100; emin=Math.floor(Math.max(0,emin-40)/step)*step; emax=Math.ceil((emax+60)/step)*step;
  const X=km=>L0+(km-a)/(b-a)*(W-L0-R0), Y=e=>T0+(1-(e-emin)/(emax-emin))*(H-T0-B0);
  const C_GRID=css('--grid'), C_MUTED=css('--muted'), C_INK=css('--ink'), C_ACC=css('--accent'), C_AREA=css('--area');
  ctx.strokeStyle=C_GRID; ctx.lineWidth=1; ctx.fillStyle=C_MUTED; ctx.font=F+'px system-ui'; ctx.textAlign='right';
  for(let e=emin;e<=emax;e+=step){ ctx.beginPath();ctx.moveTo(L0,Y(e));ctx.lineTo(W-R0,Y(e));ctx.stroke(); ctx.fillText(e,L0-4,Y(e)+4); }
  const j0=Math.max(0,i0-1), j1=Math.min(P.length-1,i1+1); ctx.save(); ctx.beginPath(); ctx.rect(L0,0,W-L0-R0,H); ctx.clip();   // one point beyond each edge, clipped: the line reaches the border
  // area below the line coloured by climb grade (descents and <3 % stay neutral); one polygon per run of equal bin
  const GI=(b-a)>25?6:5, gbin=g=>g<3?0:g<6?1:g<9?2:g<12?3:4, sbin=i=>gbin((P[i][GI]+P[i+1][GI])/2); for(let r0=j0;r0<j1;){ const bin=sbin(r0); let r1=r0; while(r1+1<j1&&sbin(r1+1)===bin) r1++; const e=r1+1;
    ctx.beginPath(); ctx.moveTo(X(P[r0][3]),Y(emin)); for(let i=r0;i<=e;i++) ctx.lineTo(X(P[i][3]),Y(P[i][2])); ctx.lineTo(X(P[e][3]),Y(emin)); ctx.closePath(); ctx.fillStyle=bin?GRADECOL[bin]:C_AREA; ctx.fill(); r0=e; }
  if(j0===j1){ ctx.beginPath(); ctx.moveTo(X(P[j0][3]),Y(emin)); ctx.lineTo(X(P[j0][3]),Y(P[j0][2])); ctx.stroke(); }
  ctx.lineWidth=OPT.hc?3.6:2.4; let cur=null; for(let i=j0;i<=j1;i++){ const c=P[i][4]; if(c!==cur){ if(cur!==null) ctx.stroke(); ctx.beginPath(); ctx.strokeStyle=varSel?'#7B3F9E':(MAPCOL[c]||MAPCOL.p); if(i>j0) ctx.moveTo(X(P[i-1][3]),Y(P[i-1][2])); cur=c;} ctx.lineTo(X(P[i][3]),Y(P[i][2])); } ctx.stroke(); ctx.restore();
  ctx.fillStyle=C_MUTED; ctx.textAlign='center'; ctx.font=F+'px system-ui'; const kstep=(b-a)>300?100:(b-a)>120?20:(b-a)>40?10:(b-a)>15?5:(b-a)>6?2:1;
  const wlbl=win.part&&innerWidth<900?`Ausschnitt ${fmtKm(b-a)}`:''; ctx.font=`600 ${F}px "Barlow Condensed",system-ui`; const wlw=wlbl?ctx.measureText(wlbl).width:0; ctx.font=F+'px system-ui';
  for(let k=Math.ceil(a/kstep)*kstep;k<=b;k+=kstep){ if(wlw&&X(k)+14>W-R0-wlw-8) break; ctx.fillText(k+(k===Math.ceil(a/kstep)*kstep?' km':''),X(k),H-4); }
  if(wlbl){ ctx.fillStyle=C_ACC; ctx.textAlign='right'; ctx.font=`600 ${F}px "Barlow Condensed",system-ui`; ctx.fillText(wlbl,W-R0-4,H-4); }
  ctx.font='600 11px "Barlow Condensed",system-ui';
  if(varSel){ ctx.fillStyle='#7B3F9E'; ctx.textAlign='left'; ctx.fillText(`Variante ${varSel.day}b · Asphalt`, L0+4, T0+6); ctx.textAlign='right'; ctx.fillText(`${varSel.to||S[varSel.day-1].to} ${P[i1][2]} m`, W-R0-3, T0+6); }
  for(const st of S){ if(!varSel&&st.end_km>a&&st.end_km<=b+1e-6){ const x=X(st.end_km); ctx.strokeStyle=C_ACC; ctx.setLineDash([3,3]); ctx.beginPath();ctx.moveTo(x,T0-4);ctx.lineTo(x,H-B0);ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle=C_ACC; if(overview){ ctx.textAlign='right'; ctx.fillText(st.day, x-3, T0+6); } else { ctx.textAlign=(x>W-70)?'right':'left'; ctx.fillText(`${st.to} ${st.ele} m`, x+(x>W-70?-3:3), T0+6); } } }
  const endSpans=S.filter(st=>st.end_km>a&&st.end_km<=b+1e-6).map(st=>{ const ex=X(st.end_km); const ew=overview?12:ctx.measureText(`${st.to} ${st.ele} m`).width+6; return ex>W-70?[ex-ew,ex]:[ex,ex+ew]; });
  if(!varSel&&(!overview||W>700)){ for(const f of FE){ if(f.k!=='pass'||f.km<a||f.km>b) continue; const x=X(f.km), y=Y(f.ele); ctx.fillStyle=C_INK; ctx.beginPath(); ctx.moveTo(x,y-9); ctx.lineTo(x+4,y-2); ctx.lineTo(x-4,y-2); ctx.closePath(); ctx.fill();
    if(!overview||f.ele>1300){ const lbl=`${f.n.replace('Passo ','P. ').replace('Capanne di ','')} ${f.ele}`; const tw=ctx.measureText(lbl).width; const right=x+6+tw>W-R0; const span=right?[x-6-tw,x-6]:[x+6,x+6+tw];
      const clash=y-12<T0+14&&endSpans.some(es=>span[0]<es[1]&&span[1]>es[0]); ctx.textAlign=right?'right':'left'; ctx.fillText(lbl, x+(right?-6:6), clash?y+18:y-12); } } }
  for(const pl of PL){ if(varSel||pl.k==='bed'||pl.km<a||pl.km>b||(overview&&pl.k!=='camp')) continue; const x=X(pl.km); ctx.fillStyle=pl.k==='camp'?'#2E8B57':'#8B5A2B'; ctx.beginPath(); if(pl.k==='camp'){ctx.moveTo(x,H-B0-9);ctx.lineTo(x+4,H-B0-1);ctx.lineTo(x-4,H-B0-1);ctx.closePath();} else ctx.rect(x-3,H-B0-8,6,6); ctx.fill(); }
  // altitude + grade beside a dot; above by default (GPS: below), flipped at the canvas edges
  const dotLabel=(km,col,below)=>{ const p=P[idxAtKm(km)], g=p[5]||0, x=X(km), y=Y(p[2]); const t=`${p[2]} m · ${g>=1?'↗':g<=-1?'↘':'→'} ${Math.abs(Math.round(g))} %`;
    ctx.font=`600 ${F}px "Barlow Condensed",system-ui`; const tw=ctx.measureText(t).width, right=x+9+tw>W-R0; if(below?y+F+6>H-B0:y-F-6<0) below=!below;
    ctx.textAlign=right?'right':'left'; const tx=x+(right?-9:9), ty=below?y+F+4:y-7; ctx.lineWidth=3; ctx.lineJoin='round'; ctx.strokeStyle=css('--bg'); ctx.strokeText(t,tx,ty); ctx.fillStyle=col; ctx.fillText(t,tx,ty); };
  if(gps&&gps.km>=a&&gps.km<=b){ const x=X(gps.km); ctx.fillStyle='#1E88E5'; ctx.beginPath(); ctx.arc(x,Y(P[idxAtKm(gps.km)][2]),5,0,7); ctx.fill(); dotLabel(gps.km,'#1E88E5',true); }
  if(curKm>=a&&curKm<=b){ const x=X(curKm), e=P[idxAtKm(curKm)][2]; ctx.strokeStyle=C_INK; ctx.lineWidth=1; ctx.beginPath();ctx.moveTo(x,T0);ctx.lineTo(x,H-B0);ctx.stroke(); ctx.fillStyle=C_INK; ctx.beginPath(); ctx.arc(x,Y(e),4,0,7); ctx.fill(); dotLabel(curKm,C_INK,false); }
  { const ci=$('ci'); if(ci){ const st2=endOf(curKm); ci.textContent=`▸ km ${curKm.toFixed(1)} · ${P[idxAtKm(curKm)][2]} m · noch ${fmtKm(st2.end_km-curKm)} bis ${st2.to}`; } if(!gps) updateNav(); }
  if(win.part){ ctx.strokeStyle=C_ACC; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(L0+1.5,T0-4); ctx.lineTo(L0+1.5,H-B0+3); ctx.moveTo(W-R0-1.5,T0-4); ctx.lineTo(W-R0-1.5,H-B0+3); ctx.stroke(); }
  const wl=$('win'); if(wl) wl.textContent=win.part?`Ausschnitt ${fmtKm(b-a)}`:'';
  if(win.out){ ctx.fillStyle=css('--bg'); ctx.globalAlpha=.6; ctx.fillRect(L0,0,W-L0-R0,H-B0); ctx.globalAlpha=1; ctx.fillStyle=C_INK; ctx.font='600 13px "Barlow Condensed",system-ui'; ctx.textAlign='center'; ctx.fillText(`${varSel?'Variante':'Route'} ausserhalb des Ausschnitts`,L0+(W-L0-R0)/2,T0+(H-T0-B0)/2+4); }
  cv._X={a,b,L0,R0,W}; }
function kmFromEvent(ev){ const r=cv.getBoundingClientRect(), x=ev.clientX-r.left; const {a,b,L0,R0,W}=cv._X; return Math.min(b,Math.max(a,a+(x-L0)/(W-L0-R0)*(b-a))); }
let dragging=false;
cv.addEventListener('pointerdown',e=>{dragging=true;cv.setPointerCapture(e.pointerId);setCursor(kmFromEvent(e),true);});
cv.addEventListener('pointermove',e=>{ if(dragging||e.pointerType==='mouse') setCursor(kmFromEvent(e),true); });
cv.addEventListener('pointerup',()=>{dragging=false;}); cv.addEventListener('pointercancel',()=>{dragging=false;});
cv.addEventListener('dblclick',()=>{ const p=AP()[idxAtKm(curKm)]; map.setView([p[0],p[1]],Math.max(map.getZoom(),14)); });
let userMoved=false; map.on('dragstart zoomstart',()=>{ if(!prog) userMoved=true; });
$('handle').onclick=()=>{ sheet.classList.toggle('min'); syncSheet(); setTimeout(()=>{ if(!userMoved&&varSel) selectVariant(varSel); else if(!userMoved&&day) selectDay(day); else { syncWin(); drawProfile(); } },280); };
// ---- GPS ----
let gps=null, gpsM=null, gpsC=null, watchId=null, follow=false, ctl=null;
const Locate=L.Control.extend({onAdd(){ const d=L.DomUtil.create('div','leaflet-bar leaflet-control leaflet-control-locate'); const a=L.DomUtil.create('a','',d); a.href='#'; a.title='Standort (l)'; a.innerHTML='◎';
  L.DomEvent.on(a,'click',e=>{L.DomEvent.stop(e); locateTap();}); ctl=d; return d; }});
new Locate({position:'topright'}).addTo(map);
const Gear=L.Control.extend({onAdd(){ const d=L.DomUtil.create('div','leaflet-bar leaflet-control leaflet-control-gear'); const a=L.DomUtil.create('a','',d); a.href='#'; a.title='Anzeige'; a.innerHTML='⚙';
  L.DomEvent.on(a,'click',e=>{ L.DomEvent.stop(e); const g=$('gear'); const open=!g.classList.contains('open'); g.classList.toggle('open',open); d.classList.toggle('on',open); if(open){ const r=d.getBoundingClientRect(); g.style.top=r.top+'px'; } }); return d; }});
new Gear({position:'topright'}).addTo(map);
map.on('click dragstart',()=>{ $('gear').classList.remove('open'); document.querySelector('.leaflet-control-gear').classList.remove('on'); });
for(const k of ['hc','big','all','follow']){ const el=$('opt-'+k); el.checked=!!OPT[k]; el.onchange=()=>{ OPT[k]=el.checked; applyOpt(); routeStyle(); bedsShown=null; syncBeds(); declutter(); syncWin(); drawProfile(); }; }
function locateTap(){ if(watchId===null) startGps(); else if(!follow){ follow=true; ctl.classList.add('follow'); if(gps) progMove(()=>map.setView([gps.lat,gps.lon],Math.max(map.getZoom(),14))); } else stopGps(); }
function startGps(){ if(!navigator.geolocation){ setNav('Kein GPS im Browser — auf dem Handy braucht die Seite https.',true); return; }
  ctl.classList.add('on','follow'); follow=true; setNav('Suche Standort …',true);
  watchId=navigator.geolocation.watchPosition(pos=>{ const {latitude:la,longitude:lo,accuracy:acc}=pos.coords; const n=nearest(la,lo); const seen=gps&&gps.seen; gps={lat:la,lon:lo,acc,km:n.km,off:n.dist,seen};
    if(!gpsM){ gpsC=L.circle([la,lo],{radius:acc,color:'#1E88E5',weight:1,fillOpacity:.12,interactive:false}).addTo(map); gpsM=L.marker([la,lo],{icon:L.divIcon({className:'gpsdot',iconSize:[14,14]}),interactive:false,zIndexOffset:1000}).addTo(map); }
    else { gpsC.setLatLng([la,lo]).setRadius(acc); gpsM.setLatLng([la,lo]); }
    if(follow){ if(!gps.seen){ gps.seen=1; progMove(()=>map.setView([la,lo],Math.max(map.getZoom(),14))); } else { const pt=map.latLngToContainerPoint([la,lo]), sz=map.getSize(), hdr=document.querySelector('.hdr .bar').getBoundingClientRect(), top=hdr.bottom+20, bot=Math.min(sz.y*.8,sheet.getBoundingClientRect().top-20); if(pt.x<sz.x*.15||pt.x>sz.x*.85||pt.y<top||pt.y>bot) progMove(()=>map.panTo([la,lo])); } }
    updateNav(); drawProfile(); },
   err=>{ if(err.code===3) return; if(err.code===2){ setNav('📍 kein GPS-Signal — warte …',true); return; } stopGps(); setNav(err.code===1?'Standort verweigert — in den Browser-Einstellungen erlauben.':'Standort nicht verfügbar: '+err.message,true); },
   {enableHighAccuracy:true,maximumAge:5000,timeout:20000}); }
function stopGps(){ if(watchId!==null) navigator.geolocation.clearWatch(watchId); watchId=null; follow=false; ctl.classList.remove('on','follow'); if(gpsM){map.removeLayer(gpsM);map.removeLayer(gpsC);gpsM=gpsC=null;} gps=null; updateNav(); drawProfile(); }
map.on('dragstart zoomstart',()=>{ if(follow&&!prog){ follow=false; ctl.classList.remove('follow'); } });
function setNav(t,off){ const n=$('nav'); n.textContent=t; n.classList.toggle('off',!!off); }
function updateNav(){ if(!gps){ if(watchId===null){ const st=endOf(curKm), e=AP()[idxAtKm(curKm)][2]; setNav(curKm>0?`▸ km ${curKm.toFixed(1)} · ${e} m · noch ${fmtKm(st.end_km-curKm)} → ${st.to}  (GPS: ◎)`:'GPS aus — ◎ antippen für Standort',true); } return; }
  const st=endOf(gps.km);
  let nc=null,nb=null; for(const pl of PL){ if(pl.km<gps.km-0.5) continue; if(pl.k==='camp'&&pl.off<=2&&(!nc||pl.km<nc.km)) nc=pl; if(pl.k!=='camp'&&pl.off<=1.0&&(!nb||pl.km<nb.km)) nb=pl; }
  const off=gps.off>0.3?` · ${gps.off>=1?gps.off.toFixed(1).replace('.',',')+' km':Math.round(gps.off*1000)+' m'} neben Route`:'';
  setNav(`📍 ${varSel?'Variante · ':''}noch ${fmtKm(st.end_km-gps.km)} → ${st.to}`+(nc?` · ⛺ ${fmtKm(nc.km-gps.km)}`:'')+(nb?` · ${nb.k==='bed'?'🛏':'🏠'} ${fmtKm(nb.km-gps.km)}`:'')+` · km ${gps.km.toFixed(1)}`+off,false); }
// ---- init ----
let saved=null; try{ saved=JSON.parse(localStorage.getItem('rt.'+TOUR.slug+'.view')||'null'); }catch(e){}
// hash: #d4  |  #d4/46.54,8.76/13  |  #46.54,8.76/13   (day, optional centre/zoom)
const hv=location.hash.match(/^#d(\d+)v$/); const h=location.hash.match(/^#(?:d(\d+))?\/?(?:(-?[\d.]+),(-?[\d.]+)\/(\d+))?(\/p)?/);
const hd=h&&h[1]?+h[1]:null, hc=h&&h[2]?[+h[2],+h[3]]:null, hz=h&&h[4]?+h[4]:null;
selectDay(hd!==null?hd:(hc?day:(saved&&saved.day)||0), !!hc||(hd===null&&saved&&saved.c));
if(hv){ const v=VR.find(x=>x.day===+hv[1]); if(v) selectVariant(v); } else if(hc){ map.setView(hc,hz||13); if(h[5]){ const n=nearest(hc[0],hc[1]); setCursor(n.km,false); setTimeout(()=>cursor.openPopup(),400); } } else if(hd===null&&saved&&saved.c){ try{ map.setView(saved.c,saved.z); }catch(e){} }
let saveT=null; map.on('moveend',()=>{ clearTimeout(saveT); saveT=setTimeout(()=>{ try{ localStorage.setItem('rt.'+TOUR.slug+'.view',JSON.stringify({day,c:map.getCenter(),z:map.getZoom()})); }catch(e){} },400); });
document.addEventListener('keydown',e=>{ if(e.metaKey||e.ctrlKey||e.altKey) return; const t=e.target; if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable)) return; if(e.key==='ArrowRight'&&day<ND) selectDay(day+1); else if(e.key==='ArrowLeft'&&day>0) selectDay(day-1); else if(e.key==='l'||e.key==='L') locateTap(); });
wxZoom(); declutter(); relabel(); routeStyle(); if(innerHeight<600) sheet.classList.add('min'); window.addEventListener('resize',()=>{ syncWin(); drawProfile(); }); if(document.fonts) document.fonts.ready.then(drawProfile); setTimeout(drawProfile,60);
})();
