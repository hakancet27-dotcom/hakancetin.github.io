# -*- coding: utf-8 -*-
filepath = r'assets/js/faceracer.source.js'

with open(filepath, 'r', encoding='utf-8') as f:
    c = f.read()

# Remove duplicate WALL_LEFT/WALL_RIGHT definition
old_text = '''      const WALL_LEFT = -roadWidth / 2;
    const WALL_RIGHT = roadWidth / 2;
      const now = Date.now();'''

new_text = '''      const now = Date.now();'''

c = c.replace(old_text, new_text)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(c)

print('Removed duplicate WALL_LEFT/WALL_RIGHT definition')
