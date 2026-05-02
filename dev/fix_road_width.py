# -*- coding: utf-8 -*-
filepath = r'assets/js/faceracer.source.js'

with open(filepath, 'r', encoding='utf-8') as f:
    c = f.read()

# Fix road width to be wider than barriers in portrait mode
# Barriers: ±6.5 (total 13), so road should be at least 14
c = c.replace('const roadWidth = isPortrait ? 12 : 20;', 'const roadWidth = isPortrait ? 14 : 20;')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(c)

print('Fixed road width: portrait 12 -> 14 (wider than barriers)')
