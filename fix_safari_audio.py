# -*- coding: utf-8 -*-
filepath = r'assets/js/faceracer.source.js'

with open(filepath, 'r', encoding='utf-8') as f:
    c = f.read()

# Add audioContext.resume() in playWallFrictionSound to fix Safari autoplay policy
old_sound = '''function playWallFrictionSound() {
      if (!audioContext) return;'''

new_sound = '''function playWallFrictionSound() {
      if (!audioContext) return;
      if (audioContext.state === 'suspended') {
          audioContext.resume();
      }'''

c = c.replace(old_sound, new_sound)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(c)

print('Fixed Safari audio: added audioContext.resume() check')
