# -*- coding: utf-8 -*-
filepath = r'assets/js/faceracer.source.js'

with open(filepath, 'r', encoding='utf-8') as f:
    c = f.read()

# Remove duplicate wallTouching, wallTouchStart, lastWallDamage variables
# First occurrence is at line 35, second at line 52
# We need to remove the second occurrence (after selectedCarColor)

old_text = '''    selectedCarColor: null,  // Custom color selected by user

    cameraPreset: 1,
    wallTouching: false,
    wallTouchStart: null,
    lastWallDamage: 0,
    lastSpeed: -1,
    lastSpeedClass: ''
};'''

new_text = '''    selectedCarColor: null,  // Custom color selected by user

    cameraPreset: 1,
    lastSpeed: -1,
    lastSpeedClass: ''
};'''

c = c.replace(old_text, new_text)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(c)

print('Fixed duplicate wallTouching, wallTouchStart, lastWallDamage variables')
