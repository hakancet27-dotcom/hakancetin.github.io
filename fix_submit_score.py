# -*- coding: utf-8 -*-
obfuscated_file = r'assets/js/faceracer.js'

firebase_functions = '''
// Firebase Leaderboard Functions (not obfuscated)
function submitScore(score) {
    console.log('submitScore called with score:', score);
    console.log('firebase:', firebase);
    console.log('firebase.database():', firebase ? firebase.database() : 'undefined');
    
    if (!firebase || !firebase.database()) {
        console.error('Firebase not initialized');
        const submitMessage = document.getElementById('submitMessage');
        if (submitMessage) {
            submitMessage.textContent = 'Firebase not initialized';
            submitMessage.style.color = '#ff0000';
        }
        return;
    }
    
    const leaderboardRef = firebase.database().ref('leaderboard');
    const newScoreRef = leaderboardRef.push();
    
    console.log('newScoreRef:', newScoreRef);
    
    const scoreData = {
        score: score,
        timestamp: Date.now(),
        car: gameState.selectedCar,
        difficulty: gameState.difficulty
    };
    
    console.log('scoreData:', scoreData);
    
    newScoreRef.set(scoreData).then(() => {
        console.log('Score submitted successfully');
        const submitMessage = document.getElementById('submitMessage');
        if (submitMessage) {
            submitMessage.textContent = 'Skor kaydedildi!';
            submitMessage.style.color = '#00ff88';
        }
        loadLeaderboard();
    }).catch((error) => {
        console.error('Error submitting score:', error);
        const submitMessage = document.getElementById('submitMessage');
        if (submitMessage) {
            submitMessage.textContent = 'Hata: ' + error.message;
            submitMessage.style.color = '#ff0000';
        }
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
        
        // Update UI if leaderboard element exists
        const leaderboardElement = document.getElementById('leaderboard');
        if (leaderboardElement) {
            leaderboardElement.innerHTML = scores.map((score, index) => 
                `<div style="padding: 8px; border-bottom: 1px solid #444; display: flex; justify-content: space-between;">
                    <span>#${index + 1}</span>
                    <span>${score.score}</span>
                </div>`
            ).join('');
        }
    }).catch((error) => {
        console.error('Error loading leaderboard:', error);
    });
}

window.submitScore = submitScore;
window.loadLeaderboard = loadLeaderboard;
'''

with open(obfuscated_file, 'r', encoding='utf-8') as f:
    obfuscated = f.read()

# Remove old Firebase functions if they exist
import re
obfuscated = re.sub(r'// Firebase Leaderboard Functions.*?window\.loadLeaderboard = loadLeaderboard;', '', obfuscated, flags=re.DOTALL)
obfuscated = re.sub(r'function loadLeaderboard.*?window\.loadLeaderboard = loadLeaderboard;', '', obfuscated, flags=re.DOTALL)

# Add new Firebase functions at the end
obfuscated_with_firebase = obfuscated + '\n\n' + firebase_functions

with open(obfuscated_file, 'w', encoding='utf-8') as f:
    f.write(obfuscated_with_firebase)

print('Firebase functions added to obfuscated code (not obfuscated)')
