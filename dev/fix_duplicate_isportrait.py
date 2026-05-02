# -*- coding: utf-8 -*-
filepath = r'assets/js/faceracer.source.js'

with open(filepath, 'r', encoding='utf-8') as f:
    c = f.read()

# Remove duplicate definition from function start
old_text = '''function updateGame() { const isPortrait = window.innerHeight > window.innerWidth; const roadWidth = isPortrait ? 14 : 20; const WALL_LEFT = -roadWidth / 2; const WALL_RIGHT = roadWidth / 2;'''

new_text = '''function updateGame() {'''

c = c.replace(old_text, new_text)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(c)

print('Removed duplicate definition from updateGame start')
