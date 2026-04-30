# -*- coding: utf-8 -*-
filepath = r'assets/js/faceracer.source.js'

with open(filepath, 'r', encoding='utf-8') as f:
    c = f.read()

# Fix barriers to use roadWidth/2 instead of hardcoded -11/11
c = c.replace('leftBarrier.position.set(-11, 1, -200);', 'leftBarrier.position.set(-roadWidth / 2, 1, -200);')
c = c.replace('rightBarrier.position.set(11, 1, -200);', 'rightBarrier.position.set(roadWidth / 2, 1, -200);')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(c)

print('Fixed barriers to use roadWidth/2')
