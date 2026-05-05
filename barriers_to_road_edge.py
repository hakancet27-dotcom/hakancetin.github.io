# -*- coding: utf-8 -*-
filepath = r'assets/js/faceracer.source.js'

with open(filepath, 'r', encoding='utf-8') as f:
    c = f.read()

# Move barriers to road edge (no green space between road and barriers)
# Barriers should be at roadWidth/2
c = c.replace('const barrierOffset = isPortrait ? 4.212 : 7.128;', 'const barrierOffset = roadWidth / 2;')
c = c.replace('const WALL_LEFT = isPortrait ? -4.212 : -7.128;', 'const WALL_LEFT = -roadWidth / 2;')
c = c.replace('const WALL_RIGHT = isPortrait ? 4.212 : 7.128;', 'const WALL_RIGHT = roadWidth / 2;')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(c)

print('Moved barriers to road edge (no green space)')
