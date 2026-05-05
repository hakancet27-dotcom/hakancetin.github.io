# -*- coding: utf-8 -*-
filepath = r'game.html'

with open(filepath, 'r', encoding='utf-8') as f:
    c = f.read()

# Fix CSP header
old_csp = '''script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdn.jsdelivr.net/npm/@mediapipe https://cdnjs.cloudflare.com https://www.gstatic.com'''
new_csp = '''script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://www.gstatic.com'''
c = c.replace(old_csp, new_csp)

old_connect = '''connect-src 'self' https://cdn.jsdelivr.net https://cdn.jsdelivr.net/npm/@mediapipe wss:'''
new_connect = '''connect-src 'self' https://cdn.jsdelivr.net https://www.gstatic.com wss:'''
c = c.replace(old_connect, new_connect)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(c)

print('Fixed CSP header')
