# -*- coding: utf-8 -*-
filepath = r'assets/css/faceracer.css'

with open(filepath, 'r', encoding='utf-8') as f:
    c = f.read()

# Add turbo bar width to mobile responsive section
# Find the first @media (max-width: 768px) and add turbo bar width
mobile_section = '''@media (max-width: 768px) {
    #hud {'''

new_mobile_section = '''@media (max-width: 768px) {
    /* Turbo bar width in mobile */
    #turboBar[style*="width: 300px"] {
        width: 150px !important;
    }
    
    #turboBarContainer {
        transform: translateX(-50%) scale(0.75);
        transform-origin: center bottom;
    }
    
    #hud {'''

c = c.replace(mobile_section, new_mobile_section)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(c)

print('Added mobile turbo bar width')
