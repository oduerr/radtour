#!/bin/zsh
# Offline screenshots of the map for stretches with (probably) no mobile data.
# Usage: tools/coverage_shots.sh [output-dir]   (renders the LOCAL index.html; tiles need internet at render time)
set -e
R=$(cd "$(dirname "$0")/.." && pwd)
OUT=${1:-"/Users/oli/Library/Mobile Documents/iCloud~md~obsidian/Documents/root/09_private/Radtouren/2026-Konstanz-Genua/Offline-Karten"}
mkdir -p "$OUT"
C="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
typeset -a SPOTS
SPOTS=(
 "01_Kunkelspass|2|46.885,9.425|13"
 "02_Lukmanier-Uomo-Piora|4|46.560,8.760|12"
 "03_Val-Termine-Uomo-Detail|4|46.552,8.770|14"
 "04_Bedretto-SanGiacomo-Toggia|5|46.470,8.440|12"
 "05_SanGiacomo-Detail|5|46.471,8.441|14"
 "06_Marcarolo|10|44.575,8.720|13"
)
for s in $SPOTS; do
  name=${s%%|*}; rest=${s#*|}; day=${rest%%|*}; rest=${rest#*|}; c=${rest%%|*}; z=${rest#*|}
  url="file://$R/index.html#d${day}/${c}/${z}"
  "$C" --headless=new --disable-gpu --hide-scrollbars --window-size=1400,1000 --virtual-time-budget=12000 --screenshot="$OUT/${name}_PC.png" "$url" 2>/dev/null
  "$C" --headless=new --disable-gpu --hide-scrollbars --window-size=800,900 --virtual-time-budget=12000 --screenshot="$OUT/${name}_Handy.png" "file://$R/tools/shot.html?w=390&h=844&u=../index.html%23d${day}/${c}/${z}" 2>/dev/null
  echo "$name"
done
ls -la "$OUT"
