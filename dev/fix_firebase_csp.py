# -*- coding: utf-8 -*-
filepath = r'game.html'

with open(filepath, 'r', encoding='utf-8') as f:
    c = f.read()

# Add Firebase domains to CSP
old_csp = '''connect-src 'self' https://cdn.jsdelivr.net https://www.gstatic.com wss: https://*.firebaseio.com https://*.googleapis.com'''
new_csp = '''connect-src 'self' https://cdn.jsdelivr.net https://www.gstatic.com wss: https://*.firebaseio.com https://*.googleapis.com https://*.firebaseapp.com https://*.gstatic.com https://faceracer-leaderboard-default-rtdb.firebaseio.com https://faceracer-leaderboard.firebaseapp.com'''

c = c.replace(old_csp, new_csp)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(c)

print('Added Firebase domains to CSP')
