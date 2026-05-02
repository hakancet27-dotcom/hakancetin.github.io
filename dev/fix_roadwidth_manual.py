# -*- coding: utf-8 -*-
filepath = r'assets/js/faceracer.source.js'

with open(filepath, 'r', encoding='utf-8') as f:
    c = f.read()

# Find and replace the WALL_LEFT/WALL_RIGHT definition without roadWidth
old_text = '''    const now = Date.now();

      // Prevent car from going through walls
      if (car.position.x < WALL_LEFT) {
          car.position.x = WALL_LEFT;
      } else if (car.position.x > WALL_RIGHT) {
          car.position.x = WALL_RIGHT;'''

new_text = '''    const now = Date.now();

      // Road width based on orientation
      const isPortrait = window.innerHeight > window.innerWidth;
      const roadWidth = isPortrait ? 14 : 20;

      // Prevent car from going through walls
      const WALL_LEFT = -roadWidth / 2;
      const WALL_RIGHT = roadWidth / 2;

      if (car.position.x < WALL_LEFT) {
          car.position.x = WALL_LEFT;
      } else if (car.position.x > WALL_RIGHT) {
          car.position.x = WALL_RIGHT;'''

c = c.replace(old_text, new_text)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(c)

print('Fixed roadWidth definition in updateGame')
