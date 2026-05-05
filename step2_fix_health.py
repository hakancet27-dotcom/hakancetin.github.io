# -*- coding: utf-8 -*-
filepath = r'assets/js/faceracer.source.js'

with open(filepath, 'r', encoding='utf-8') as f:
    c = f.read()

# Step 2: Fix damageLevel -> health in wall collision
# Old: damageLevel increases from 0 to 100
# New: health decreases from 100 to 0

# Replace damageLevel with health in wall collision only
# But be careful not to break other parts

# Find and replace in wall collision section only
old_collision = '''if (now - gameState.lastWallDamage >= 100) {
                  gameState.damageLevel = Math.min(100, gameState.damageLevel + 2);
                  gameState.lastWallDamage = now;
                  if (gameState.damageLevel > 0 && gameState.damageLevel % 20 === 0) {
                      playWallFrictionSound();
                      createWallFrictionParticles(car.position.x <= WALL_LEFT ? WALL_LEFT : WALL_RIGHT);
                  }
                  if (gameState.damageLevel >= 100) {
                      endGame();
                      return;
                  }
              }'''

new_collision = '''if (now - gameState.lastWallDamage >= 100) {
                  gameState.health = Math.max(0, gameState.health - 2);
                  gameState.lastWallDamage = now;
                  if (gameState.health < 100 && gameState.health % 20 === 0) {
                      playWallFrictionSound();
                      createWallFrictionParticles(car.position.x <= WALL_LEFT ? WALL_LEFT : WALL_RIGHT);
                  }
                  if (gameState.health <= 0) {
                      endGame();
                      return;
                  }
              }'''

c = c.replace(old_collision, new_collision)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(c)

print('Step 2: Fixed health variable in wall collision (damageLevel -> health)')
