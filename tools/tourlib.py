"""Shared helper: every build script takes the tour slug as first argument and works inside tours/<slug>/."""
import sys, os, json
ROOT=os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..'))
def tour(argv=None):
    a=[x for x in (argv if argv is not None else sys.argv)[1:] if not x.startswith('--')]
    if not a or not os.path.isdir(os.path.join(ROOT,'tours',a[0])):
        avail=sorted(d for d in os.listdir(os.path.join(ROOT,'tours')) if os.path.isfile(os.path.join(ROOT,'tours',d,'tour.json')))
        sys.exit(f"usage: {os.path.basename(sys.argv[0])} <tour-slug>   (available: {', '.join(avail)})")
    d=os.path.join(ROOT,'tours',a[0]); T=json.load(open(os.path.join(d,'tour.json'))); T['slug']=a[0]; T['_dir']=d; T['_files']=os.path.join(d,'files'); return T
def path(T,name): return os.path.join(T['_dir'],name)
