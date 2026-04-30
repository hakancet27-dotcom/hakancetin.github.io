# -*- coding: utf-8 -*-
filepath = r'assets/js/faceracer.source.js'

with open(filepath, 'r', encoding='utf-8') as f:
    c = f.read()

# Minimal fix: Change wall collision values from -8/8 to -11/11 to match barriers
# ONLY this change, nothing else!
c = c.replace('const WALL_LEFT = -8;', 'const WALL_LEFT = -11;')
c = c.replace('const WALL_RIGHT = 8;', 'const WALL_RIGHT = 11;')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(c)

print('Minimal fix: WALL_LEFT/WALL_RIGHT changed from -8/8 to -11/11')
