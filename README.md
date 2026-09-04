# radtour — Konstanz → Genova

Interactive map for the September 2026 gravel trip. Live: **https://oduerr.github.io/radtour/**

- Route coloured by surface (asphalt / gravel / path-push), overview and 10 day views (`#d4`), elevation
  profile coupled to the map, campsites / huts / beds (OSM), passes and push sections with links to
  tour descriptions, weather links to the `weather` app, GPS position with distance to tonight's stop.
- Hash: `#d4` (day), `#d4/46.54,8.76/14` (day + centre/zoom). View and day persist in localStorage.
- ⚙ menu: high-contrast mode (large type, thick line — for reading while riding), big symbols (1.7×), show beds/huts at every zoom (planning). Stored in localStorage.
- Keyboard on PC: ← → change day, `l` locate. Add to home screen on the phone (PWA manifest).

## Files
- `index.html` — the app (Leaflet 1.9.4 + markercluster, vendored in `vendor/`, no build step)
- `data/data.js` — bundled data, built by `tools/build_data_js.py` from `data/*.json`
- `tools/build_track.py` — track + stages from `data/route.gpx` and `data/osm_points.json` (surface classes from an Overpass match)
- `tools/fetch_places.py` → `data/places_raw.json` (Overpass, lodging within 3.5 km); `tools/build_places.py` → `data/places.json`
- `tools/build_features.py` — passes/pushes/notes with verified links, weather points
- `tools/coverage_shots.sh` — offline PNGs of the stretches without mobile data (headless Chrome)
- `tools/shot.html` — iframe harness for true phone-width screenshots

## Rebuild
```
python3 tools/build_track.py && python3 tools/fetch_places.py && python3 tools/build_places.py \
  && python3 tools/build_features.py && python3 tools/build_data_js.py
```
Tiles: OpenTopoMap (default), swisstopo (CH only), Esri imagery, OSM. Data © OpenStreetMap contributors.
