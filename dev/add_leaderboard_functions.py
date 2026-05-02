# -*- coding: utf-8 -*-
filepath = r'assets/js/faceracer.source.js'

with open(filepath, 'r', encoding='utf-8') as f:
    c = f.read()

# Add Firebase leaderboard functions before endGame function
leaderboard_functions = '''// Firebase Leaderboard Functions
function submitScore(score) {
    if (!firebase || !firebase.database()) {
        console.error('Firebase not initialized');
        return;
    }
    
    const leaderboardRef = firebase.database().ref('leaderboard');
    const newScoreRef = leaderboardRef.push();
    
    newScoreRef.set({
        score: score,
        timestamp: Date.now(),
        car: gameState.selectedCar,
        difficulty: gameState.difficulty
    }).then(() => {
        console.log('Score submitted successfully');
        loadLeaderboard();
    }).catch((error) => {
        console.error('Error submitting score:', error);
    });
}

function loadLeaderboard() {
    if (!firebase || !firebase.database()) {
        console.error('Firebase not initialized');
        return;
    }
    
    const leaderboardRef = firebase.database().ref('leaderboard');
    leaderboardRef.orderByChild('score').limitToLast(10).once('value', (snapshot) => {
        const scores = [];
        snapshot.forEach((childSnapshot) => {
            scores.push(childSnapshot.val());
        });
        scores.reverse();
        console.log('Leaderboard loaded:', scores);
    }).catch((error) => {
        console.error('Error loading leaderboard:', error);
    });
}

// Make functions globally accessible
window.submitScore = submitScore;
window.loadLeaderboard = loadLeaderboard;

'''

# Insert before endGame function
c = c.replace('function endGame() {', leaderboard_functions + 'function endGame() {')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(c)

print('Added Firebase leaderboard functions')
