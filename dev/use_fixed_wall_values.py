# -*- coding: utf-8 -*-
filepath = r'assets/js/faceracer.source.js'

with open(filepath, 'r', encoding='utf-8') as f:
    c = f.read()

# Replace WALL_LEFT/WALL_RIGHT with fixed values
c = c.replace('const WALL_LEFT = -roadWidth / 2;', 'const WALL_LEFT = -7;')
c = c.replace('const WALL_RIGHT = roadWidth / 2;', 'const WALL_RIGHT = 7;')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(c)

print('Replaced WALL_LEFT/WALL_RIGHT with fixed values (-7, 7)')
