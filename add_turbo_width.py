# -*- coding: utf-8 -*-
filepath = r'assets/css/faceracer.css'

with open(filepath, 'r', encoding='utf-8') as f:
    c = f.read()

# Add mobile turbo bar width in portrait mode
# Find the portrait mode media query and add turbo bar width
portrait_section = '''/* Portrait Mode - Dikey mod için özel ayarlar */
@media (max-width: 768px) and (orientation: portrait) {'''

new_portrait_section = '''/* Portrait Mode - Dikey mod için özel ayarlar */
@media (max-width: 768px) and (orientation: portrait) {
    /* Turbo bar width in portrait mode */
    #turboBar[style*="width: 300px"] {
        width: 150px !important;
    }
    
    #turboBarContainer {
        transform: translateX(-50%) scale(0.75);
        transform-origin: center bottom;
    }'''

c = c.replace(portrait_section, new_portrait_section)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(c)

print('Added mobile turbo bar width for portrait mode')
