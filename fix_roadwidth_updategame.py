# -*- coding: utf-8 -*-
filepath = r'assets/js/faceracer.source.js'

with open(filepath, 'r', encoding='utf-8') as f:
    c = f.read()

# Add roadWidth to updateGame function
old_text = '''function updateGame() {
      // Update particles
      updateParticles();'''

new_text = '''function updateGame() {
      // Road width based on orientation
      const isPortrait = window.innerHeight > window.innerWidth;
      const roadWidth = isPortrait ? 14 : 20;

      // Update particles
      updateParticles();'''

c = c.replace(old_text, new_text)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(c)

print('Added roadWidth to updateGame function')
