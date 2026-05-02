# -*- coding: utf-8 -*-
filepath = r'assets/js/faceracer.source.js'

with open(filepath, 'r', encoding='utf-8') as f:
    c = f.read()

# Reduce road width by additional 10% (total 30% from original)
# Portrait: 9.6 -> 8.64
# Landscape: 16 -> 14.4
c = c.replace('const roadWidth = isPortrait ? 9.6 : 16;', 'const roadWidth = isPortrait ? 8.64 : 14.4;')

# Reduce barriers and wall collision by additional 10% (total 30% from original)
# Portrait: 5.2 -> 4.68
# Landscape: 8.8 -> 7.92
c = c.replace('const barrierOffset = isPortrait ? 5.2 : 8.8;', 'const barrierOffset = isPortrait ? 4.68 : 7.92;')
c = c.replace('const WALL_LEFT = isPortrait ? -5.2 : -8.8;', 'const WALL_LEFT = isPortrait ? -4.68 : -7.92;')
c = c.replace('const WALL_RIGHT = isPortrait ? 5.2 : 8.8;', 'const WALL_RIGHT = isPortrait ? 4.68 : 7.92;')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(c)

print('Reduced by additional 10% (total 30%): road, barriers, and wall collision')
