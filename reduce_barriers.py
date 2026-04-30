# -*- coding: utf-8 -*-
filepath = r'assets/js/faceracer.source.js'

with open(filepath, 'r', encoding='utf-8') as f:
    c = f.read()

# Reduce barriers by 20% to match road width reduction
# Portrait: 6.5 -> 5.2
# Landscape: 11 -> 8.8
c = c.replace('const barrierOffset = isPortrait ? 6.5 : 11;', 'const barrierOffset = isPortrait ? 5.2 : 8.8;')

# Also update wall collision values
c = c.replace('const WALL_LEFT = isPortrait ? -6.5 : -11;', 'const WALL_LEFT = isPortrait ? -5.2 : -8.8;')
c = c.replace('const WALL_RIGHT = isPortrait ? 6.5 : 11;', 'const WALL_RIGHT = isPortrait ? 5.2 : 8.8;')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(c)

print('Reduced barriers and wall collision by 20%: portrait 6.5 -> 5.2, landscape 11 -> 8.8')
