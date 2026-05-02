# -*- coding: utf-8 -*-
filepath = r'assets/js/faceracer.source.js'

with open(filepath, 'r', encoding='utf-8') as f:
    c = f.read()

# Fix: Change health check logic
# Old: health % 20 === 0 (true at start when health=100)
# New: Check health decreased AND is at 80, 60, 40, 20

# First find what the current wall collision code looks like
old_logic = '''if (now - gameState.lastWallDamage >= 100) {
                  gameState.health = Math.max(0, gameState.health - 2);
                  gameState.lastWallDamage = now;
                  if (gameState.health % 20 === 0 || gameState.health <= 0) {
                      playWallFrictionSound();
                      createWallFrictionParticles(car.position.x <= WALL_LEFT ? WALL_LEFT : WALL_RIGHT);
                  }
                  if (gameState.health <= 0) {
                      endGame();
                      return;
                  }
              }'''

# Track previous health to detect when it crosses 20-boundary
new_logic = '''if (now - gameState.lastWallDamage >= 100) {
                  const oldHealth = gameState.health;
                  gameState.health = Math.max(0, gameState.health - 2);
                  gameState.lastWallDamage = now;
                  // Play sound when health crosses a 20-boundary (80, 60, 40, 20)
                  if ((oldHealth > 80 && gameState.health <= 80) ||
                      (oldHealth > 60 && gameState.health <= 60) ||
                      (oldHealth > 40 && gameState.health <= 40) ||
                      (oldHealth > 20 && gameState.health <= 20) ||
                      gameState.health <= 0) {
                      playWallFrictionSound();
                      createWallFrictionParticles(car.position.x <= WALL_LEFT ? WALL_LEFT : WALL_RIGHT);
                  }
                  if (gameState.health <= 0) {
                      endGame();
                      return;
                  }
              }'''

c = c.replace(old_logic, new_logic)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(c)

print('Step 2 v2: Fixed health check logic (track oldHealth for 20-boundary crossing)')
