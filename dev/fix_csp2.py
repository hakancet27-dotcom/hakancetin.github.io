# -*- coding: utf-8 -*-
filepath = r'game.html'

with open(filepath, 'r', encoding='utf-8') as f:
    c = f.read()

# Fix CSP header - replace entire CSP line
old_csp = '''<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://www.gstatic.com; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self' https://cdn.jsdelivr.net https://www.gstatic.com wss: https://*.firebaseio.com https://*.googleapis.com; font-src 'self' https://cdnjs.cloudflare.com; object-src 'none'; base-uri 'self';">'''

new_csp = '''<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://www.gstatic.com; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self' https://cdn.jsdelivr.net https://www.gstatic.com wss: https://*.firebaseio.com https://*.googleapis.com; font-src 'self' https://cdnjs.cloudflare.com; object-src 'none'; base-uri 'self';">'''

c = c.replace(old_csp, new_csp)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(c)

print('Fixed CSP header - full replacement')
