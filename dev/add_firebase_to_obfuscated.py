# -*- coding: utf-8 -*-
obfuscated_file = r'assets/js/faceracer.js'
source_file = r'assets/js/faceracer.source.js'

with open(source_file, 'r', encoding='utf-8') as f:
    source = f.read()

# Extract Firebase functions
start = source.find('function submitScore')
end = source.find('// Make functions globally accessible')
firebase_functions = source[start:end] + '''// Make functions globally accessible
window.submitScore = submitScore;
window.loadLeaderboard = loadLeaderboard;
'''

with open(obfuscated_file, 'r', encoding='utf-8') as f:
    obfuscated = f.read()

# Add Firebase functions to the end
obfuscated_with_firebase = obfuscated + '\n\n' + firebase_functions

with open(obfuscated_file, 'w', encoding='utf-8') as f:
    f.write(obfuscated_with_firebase)

print('Firebase functions added to obfuscated code')
