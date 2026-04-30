# -*- coding: utf-8 -*-
filepath = r'assets/js/faceracer.source.js'

with open(filepath, 'r', encoding='utf-8') as f:
    c = f.read()

# Reduce by additional 10% (total 40% from original)
# Portrait: 8.64 -> 7.776, Landscape: 14.4 -> 12.96
c = c.replace('const roadWidth = isPortrait ? 8.64 : 14.4;', 'const roadWidth = isPortrait ? 7.776 : 12.96;')

# Barriers and wall collision
# Portrait: 4.68 -> 4.212, Landscape: 7.92 -> 7.128
c = c.replace('const barrierOffset = isPortrait ? 4.68 : 7.92;', 'const barrierOffset = isPortrait ? 4.212 : 7.128;')
c = c.replace('const WALL_LEFT = isPortrait ? -4.68 : -7.92;', 'const WALL_LEFT = isPortrait ? -4.212 : -7.128;')
c = c.replace('const WALL_RIGHT = isPortrait ? 4.68 : 7.92;', 'const WALL_RIGHT = isPortrait ? 4.212 : 7.128;')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(c)

print('Reduced by additional 10% (total 40% from original)')
