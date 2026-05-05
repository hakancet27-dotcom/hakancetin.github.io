# -*- coding: utf-8 -*-
filepath = r'assets/js/faceracer.source.js'

with open(filepath, 'r', encoding='utf-8') as f:
    c = f.read()

# Change static -11/11 to responsive based on screen orientation
# Portrait (dikey): ±6.5, Landscape (yatay): ±11
c = c.replace('const WALL_LEFT = -11;', 'const isPortrait = window.innerHeight > window.innerWidth;\n      const WALL_LEFT = isPortrait ? -6.5 : -11;')
c = c.replace('const WALL_RIGHT = 11;', 'const WALL_RIGHT = isPortrait ? 6.5 : 11;')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(c)

print('Responsive fix: WALL_LEFT/WALL_RIGHT now responsive (portrait: ±6.5, landscape: ±11)')
