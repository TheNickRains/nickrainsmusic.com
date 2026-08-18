#!/usr/bin/env python3
"""Tag songs.json: nashville (Nick's set + all Country) and hundred ($100 goal songs).
Re-run after any master-list CSV re-import."""
import json, re, unicodedata
from difflib import SequenceMatcher

def norm(t):
    t = unicodedata.normalize('NFKD', t).lower()
    t = re.sub(r'\(.*?\)', ' ', t)          # drop parentheticals
    t = re.sub(r"[^a-z0-9 ]", ' ', t)       # punctuation
    t = re.sub(r'\b(the|a|an)\b', ' ', t)   # articles
    return ' '.join(t.split())

songs = json.load(open('src/songs.json'))
by_norm = {}
for s in songs:
    by_norm.setdefault(norm(s['title']), []).append(s)

wanted, unmatched = [], []
for line in open('scripts/nashville-list.txt'):
    line = line.strip()
    if not line or line.startswith('#'):
        continue
    hundred = line.startswith('[hundred]')
    title = line.replace('[hundred]', '').strip()
    n = norm(title)
    # exact normalized match, then containment either way
    hits = by_norm.get(n)
    if not hits:
        nc = n.replace(' ', '')
        hits = [s for k, lst in by_norm.items() for s in lst
                if ((n in k or k in n) and min(len(n), len(k)) >= 6)
                or (nc == k.replace(' ', ''))
                or (min(len(n), len(k)) >= 8 and SequenceMatcher(None, nc, k.replace(' ', '')).ratio() >= 0.87)]
    if hits:
        for s in hits:
            s['nashville'] = True
            if hundred:
                s['hundred'] = True
        wanted.append(title)
    else:
        unmatched.append(title)

country = 0
for s in songs:
    if s.get('genre') == 'Country' and not s.get('nashville'):
        s['nashville'] = True
        country += 1

json.dump(songs, open('src/songs.json', 'w'), indent=1)
tagged = sum(1 for s in songs if s.get('nashville'))
print(f"matched from set list: {len(wanted)} · plus {country} more Country-genre songs")
print(f"nashville total: {tagged} · hundred: {sum(1 for s in songs if s.get('hundred'))}")
print("NOT IN MASTER LIST:")
for t in unmatched:
    print("  -", t)
