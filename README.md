# radtour — Konstanz → Genova

Interactive map for the September 2026 gravel trip: route coloured by surface, elevation profile,
campsites and beds, weather links, GPS position. Served at https://oduerr.github.io/radtour/

- `index.html` — the app (Leaflet, no build step)
- `data/data.js` — bundled data (`tools/build_data_js.py` from `data/*.json`)
- `tools/build_track.py` — track + stages from `data/route.gpx` and `data/osm_points.json`
- `tools/fetch_places.py` — lodging/campsites from Overpass → `data/places_raw.json`
- `vendor/` — Leaflet 1.9.4, Leaflet.markercluster 1.5.3
