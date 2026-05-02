# -*- coding: utf-8 -*-
filepath = r'assets/js/faceracer.source.js'

with open(filepath, 'r', encoding='utf-8') as f:
    c = f.read()

# Add roadWidth to updateGame function before WALL_LEFT/WALL_RIGHT
old_text = '''      const now = Date.now();

      // Prevent car from going through walls
      const WALL_LEFT = -roadWidth / 2;
      const WALL_RIGHT = roadWidth / 2;'''

new_text = '''      const now = Date.now();

      // Road width based on orientation
      const isPortrait = window.innerHeight > window.innerWidth;
      const roadWidth = isPortrait ? 14 : 20;

      // Prevent car from going through walls
      const WALL_LEFT = -roadWidth / 2;
      const WALL_RIGHT = roadWidth / 2;'''

c = c.replace(old_text, new_text)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(c)

print('Fixed roadWidth scope in updateGame function')
