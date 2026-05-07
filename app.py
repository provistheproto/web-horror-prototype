from flask import Flask, render_template, jsonify, request
import json
import random
import math

app = Flask(__name__)

# Game state
game_state = {
    'player': {'x': 400, 'y': 300, 'health': 100, 'fear': 0},
    'enemies': [],
    'projectiles': [],
    'score': 0,
    'game_over': False,
    'wave': 1
}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/game-state')
def get_game_state():
    return jsonify(game_state)

@app.route('/api/spawn-enemy', methods=['POST'])
def spawn_enemy():
    """Spawn a new enemy at a random location"""
    if not game_state['game_over']:
        x = random.choice([random.randint(0, 150), random.randint(650, 800)])
        y = random.choice([random.randint(0, 150), random.randint(550, 600)])
        
        enemy = {
            'id': len(game_state['enemies']),
            'x': x,
            'y': y,
            'health': 30,
            'speed': 1.5 + (game_state['wave'] * 0.3)
        }
        game_state['enemies'].append(enemy)
    
    return jsonify(game_state)

@app.route('/api/shoot', methods=['POST'])
def shoot():
    """Add a projectile to the game"""
    data = request.json
    projectile = {
        'x': data['x'],
        'y': data['y'],
        'vx': data['vx'],
        'vy': data['vy'],
        'id': len(game_state['projectiles'])
    }
    game_state['projectiles'].append(projectile)
    return jsonify({'status': 'ok'})

@app.route('/api/update', methods=['POST'])
def update():
    """Update game logic"""
    data = request.json
    
    if game_state['game_over']:
        return jsonify(game_state)
    
    # Update player position
    game_state['player']['x'] = max(0, min(800, data['playerX']))
    game_state['player']['y'] = max(0, min(600, data['playerY']))
    
    # Update projectiles
    for projectile in game_state['projectiles'][:]:
        projectile['x'] += projectile['vx']
        projectile['y'] += projectile['vy']
        
        # Remove if out of bounds
        if projectile['x'] < 0 or projectile['x'] > 800 or projectile['y'] < 0 or projectile['y'] > 600:
            game_state['projectiles'].remove(projectile)
            continue
        
        # Check collision with enemies
        for enemy in game_state['enemies'][:]:
            dist = math.sqrt((projectile['x'] - enemy['x'])**2 + (projectile['y'] - enemy['y'])**2)
            if dist < 20:
                enemy['health'] -= 25
                if projectile in game_state['projectiles']:
                    game_state['projectiles'].remove(projectile)
                
                if enemy['health'] <= 0:
                    game_state['enemies'].remove(enemy)
                    game_state['score'] += 100
                break
    
    # Update enemies
    for enemy in game_state['enemies'][:]:
        # Move towards player
        dx = game_state['player']['x'] - enemy['x']
        dy = game_state['player']['y'] - enemy['y']
        dist = math.sqrt(dx**2 + dy**2)
        
        if dist > 0:
            enemy['x'] += (dx / dist) * enemy['speed']
            enemy['y'] += (dy / dist) * enemy['speed']
        
        # Check collision with player
        if dist < 25:
            game_state['player']['health'] -= 0.5
            game_state['player']['fear'] += 0.3
    
    # Increase fear over time
    game_state['player']['fear'] += 0.1
    
    # Spawn new enemies based on score
    if game_state['score'] > 0 and game_state['score'] % 500 == 0:
        game_state['wave'] = (game_state['score'] // 500) + 1
    
    # Game over conditions
    if game_state['player']['health'] <= 0 or game_state['player']['fear'] >= 100:
        game_state['game_over'] = True
    
    return jsonify(game_state)

@app.route('/api/reset', methods=['POST'])
def reset():
    """Reset the game"""
    global game_state
    game_state = {
        'player': {'x': 400, 'y': 300, 'health': 100, 'fear': 0},
        'enemies': [],
        'projectiles': [],
        'score': 0,
        'game_over': False,
        'wave': 1
    }
    return jsonify(game_state)

if __name__ == '__main__':
    app.run(debug=True)
