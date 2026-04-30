# -*- coding: utf-8 -*-
filepath = r'assets/js/faceracer.source.js'

with open(filepath, 'r', encoding='utf-8') as f:
    c = f.read()

# Reduce road width by 20%
# Portrait: 12 -> 9.6
# Landscape: 20 -> 16
c = c.replace('const roadWidth = isPortrait ? 12 : 20;', 'const roadWidth = isPortrait ? 9.6 : 16;')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(c)

print('Reduced road width by 20%: portrait 12 -> 9.6, landscape 20 -> 16')
