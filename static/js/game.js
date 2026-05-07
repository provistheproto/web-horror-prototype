const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game state
let gameState = null;
let playerX = 400;
let playerY = 300;
let keys = {};
let mouseX = canvas.width / 2;
let mouseY = canvas.height / 2;
let gameRunning = true;

// Event listeners
document.addEventListener('keydown', (e) => keys[e.key] = true);
document.addEventListener('keyup', (e) => keys[e.key] = false);

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});

canvas.addEventListener('click', () => {
    if (!gameState || gameState.game_over) return;
    
    const dx = mouseX - playerX;
    const dy = mouseY - playerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 0) {
        fetch('/api/shoot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                x: playerX,
                y: playerY,
                vx: (dx / dist) * 7,
                vy: (dy / dist) * 7
            })
        });
    }
});

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !gameState.game_over) {
        e.preventDefault();
        fetch('/api/spawn-enemy', { method: 'POST' });
    }
});

// Initialize game
async function initGame() {
    const response = await fetch('/api/game-state');
    gameState = await response.json();
}

// Update player position based on input
function handleInput() {
    let vx = 0, vy = 0;
    const speed = 5;
    
    if (keys['w'] || keys['W']) vy -= speed;
    if (keys['s'] || keys['S']) vy += speed;
    if (keys['a'] || keys['A']) vx -= speed;
    if (keys['d'] || keys['D']) vx += speed;
    
    playerX += vx;
    playerY += vy;
    
    // Boundary check
    playerX = Math.max(20, Math.min(canvas.width - 20, playerX));
    playerY = Math.max(20, Math.min(canvas.height - 20, playerY));
}

// Update game state
async function updateGameState() {
    try {
        const response = await fetch('/api/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                playerX: playerX,
                playerY: playerY
            })
        });
        gameState = await response.json();
        
        if (gameState.game_over && gameRunning) {
            gameRunning = false;
            showGameOver();
        }
    } catch (error) {
        console.error('Error updating game state:', error);
    }
}

// Draw player
function drawPlayer() {
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(playerX - 10, playerY - 10, 20, 20);
    
    // Draw health circle
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(playerX, playerY, 15, 0, Math.PI * 2);
    ctx.stroke();
}

// Draw enemies
function drawEnemies() {
    if (!gameState.enemies) return;
    
    gameState.enemies.forEach(enemy => {
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(enemy.x - 12, enemy.y - 12, 24, 24);
        
        // Enemy health indicator
        const healthPercent = enemy.health / 30;
        ctx.fillStyle = healthPercent > 0.5 ? '#ff6b6b' : '#ff0000';
        ctx.fillRect(enemy.x - 12, enemy.y - 18, 24 * healthPercent, 3);
    });
}

// Draw projectiles
function drawProjectiles() {
    if (!gameState.projectiles) return;
    
    gameState.projectiles.forEach(proj => {
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Trail effect
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(proj.x, proj.y);
        ctx.lineTo(proj.x - proj.vx * 2, proj.y - proj.vy * 2);
        ctx.stroke();
    });
}

// Draw fog effect
function drawFog() {
    const fogIntensity = (gameState.player.fear || 0) / 100;
    
    const gradient = ctx.createRadialGradient(playerX, playerY, 100, playerX, playerY, 400);
    gradient.addColorStop(0, `rgba(0, 0, 0, 0)`);
    gradient.addColorStop(1, `rgba(0, 0, 0, ${0.3 + fogIntensity * 0.5})`);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// Update UI
function updateUI() {
    if (!gameState) return;
    
    const health = gameState.player.health;
    const fear = gameState.player.fear;
    
    document.getElementById('healthBar').style.width = (health / 100) * 100 + '%';
    document.getElementById('healthText').textContent = Math.max(0, Math.round(health)) + '/100';
    
    document.getElementById('fearBar').style.width = Math.min(fear / 100, 1) * 100 + '%';
    document.getElementById('fearText').textContent = Math.min(Math.round(fear), 100) + '/100';
    
    document.getElementById('scoreText').textContent = gameState.score;
    document.getElementById('waveText').textContent = gameState.wave;
}

// Show game over screen
function showGameOver() {
    const screen = document.getElementById('gameOverScreen');
    document.getElementById('finalScore').textContent = gameState.score;
    
    const reason = gameState.player.health <= 0 
        ? 'You were overwhelmed by the enemies...'
        : 'Your fear consumed you...';
    document.getElementById('gameOverReason').textContent = reason;
    
    screen.classList.remove('hidden');
}

// Reset game
async function resetGame() {
    await fetch('/api/reset', { method: 'POST' });
    gameRunning = true;
    playerX = 400;
    playerY = 300;
    await initGame();
    document.getElementById('gameOverScreen').classList.add('hidden');
    gameLoop();
}

// Main game loop
async function gameLoop() {
    // Clear canvas
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (gameRunning) {
        handleInput();
        await updateGameState();
        updateUI();
    }
    
    // Draw game
    drawEnemies();
    drawProjectiles();
    drawPlayer();
    drawFog();
    
    // Draw grid for atmosphere
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 50) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 50) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
    }
    
    requestAnimationFrame(gameLoop);
}

// Start game
window.addEventListener('load', async () => {
    await initGame();
    gameLoop();
});
