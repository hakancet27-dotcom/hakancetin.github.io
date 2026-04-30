# -*- coding: utf-8 -*-
filepath = r'assets/js/faceracer.source.js'

with open(filepath, 'r', encoding='utf-8') as f:
    c = f.read()

# Find WALL_LEFT definition and add roadWidth before it
old_text = '''      const WALL_LEFT = -roadWidth / 2;'''

new_text = '''      // Road width based on orientation
      const isPortrait = window.innerHeight > window.innerWidth;
      const roadWidth = isPortrait ? 14 : 20;
      const WALL_LEFT = -roadWidth / 2;'''

c = c.replace(old_text, new_text)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(c)

print('Fixed roadWidth definition before WALL_LEFT')
