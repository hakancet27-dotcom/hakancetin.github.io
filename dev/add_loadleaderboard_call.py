# -*- coding: utf-8 -*-
filepath = r'assets/js/faceracer.source.js'

# Read with UTF-8
with open(filepath, 'r', encoding='utf-8') as f:
    c = f.read()

# Add loadLeaderboard call after initializeFirebase in endGame
c = c.replace('function endGame() {\n    initializeFirebase(); // Initialize Firebase for leaderboard\n    saveBestScore(gameState.score);', 'function endGame() {\n    initializeFirebase(); // Initialize Firebase for leaderboard\n    saveBestScore(gameState.score);\n    \n    // Load leaderboard after a short delay\n    setTimeout(() => {\n        loadLeaderboard();\n    }, 500);')

# Write with UTF-8
with open(filepath, 'w', encoding='utf-8') as f:
    f.write(c)

print('loadLeaderboard call added to endGame')
