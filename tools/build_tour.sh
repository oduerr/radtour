#!/bin/sh
# Build one tour end to end: tools/build_tour.sh <slug> [--fetch]   (--fetch also queries Overpass for surfaces and lodging)
set -e; cd "$(dirname "$0")/.."; S=$1; [ -n "$S" ] || { echo "usage: tools/build_tour.sh <slug> [--fetch]"; exit 1; }
if [ "$2" = "--fetch" ]; then python3 tools/fetch_surface.py "$S"; fi
python3 tools/build_track.py "$S"
if [ "$2" = "--fetch" ]; then python3 tools/fetch_places.py "$S"; fi
if [ -f "tours/$S/places_raw.json" ]; then python3 tools/build_places.py "$S"; else echo "no places_raw.json (run with --fetch) - no lodging"; fi
python3 tools/build_features.py "$S"
python3 tools/build_data_js.py "$S"
python3 tools/build_pages.py
