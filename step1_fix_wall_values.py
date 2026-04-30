# -*- coding: utf-8 -*-
filepath = r'assets/js/faceracer.source.js'

with open(filepath, 'r', encoding='utf-8') as f:
    c = f.read()

# Fix 1: Change WALL_LEFT/WALL_RIGHT from -8/8 to -11/11 to match barriers
c = c.replace('const WALL_LEFT = -8;', 'const WALL_LEFT = window.innerHeight > window.innerWidth ? -6.5 : -11;')
c = c.replace('const WALL_RIGHT = 8;', 'const WALL_RIGHT = window.innerHeight > window.innerWidth ? 6.5 : 11;')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(c)

print('Step 1: Fixed wall collision values to match barriers')
