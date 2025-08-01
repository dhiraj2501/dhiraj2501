const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startMenu = document.getElementById('startMenu');
const startButton = document.getElementById('startButton');
const pauseMenu = document.getElementById('pauseMenu');
const resumeButton = document.getElementById('resumeButton');
const playerNameInput = document.getElementById('playerNameInput');
const highScoreDisplay = document.getElementById('highScoreDisplay');
const highScoreList = document.getElementById('highScoreList');
const scoreSpan = document.getElementById('score');
const livesSpan = document.getElementById('lives');


let gameState = 'start'; // 'start', 'playing', 'paused'

// Audio context
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// Sound functions
function playBrickSound() {
    if (audioCtx.state === 'suspended') return;
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);

    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.5);
}

function playPaddleSound() {
    if (audioCtx.state === 'suspended') return;
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);

    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.3);
}

function playWallSound() {
    if (audioCtx.state === 'suspended') return;
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(220, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);

    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.2);
}

function playLossSound() {
    if (audioCtx.state === 'suspended') return;
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(110, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);

    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1);
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 1);
}

// Game variables
let ball = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 10,
    dx: 0,
    dy: 0,
    speed: 6.2
};

let paddle = {
    width: 150,
    height: 20,
    x: (canvas.width - 150) / 2,
    y: canvas.height - 20 - 10,
    speed: 12
};

let bricks = [];
const brickInfo = {
    rows: 5,
    cols: 10,
    width: 80,
    height: 20,
    padding: 10,
    offsetTop: 50,
    offsetLeft: 60
};

let score = 0;
let lives = 3;
let particles = [];
let playerName = '';
let highScores = JSON.parse(localStorage.getItem('highScores')) || [];

function updateHighScores() {
    highScoreList.innerHTML = highScores
        .map(score => `<li>${score.name}: ${score.score}</li>`)
        .join('');
}

function addHighScore(score) {
    const newScore = { name: playerName, score };
    highScores.push(newScore);
    highScores.sort((a, b) => b.score - a.score);
    highScores.splice(5); // Keep top 5 scores
    localStorage.setItem('highScores', JSON.stringify(highScores));
    updateHighScores();
}


// Create particles
function createParticles(x, y) {
    for (let i = 0; i < 10; i++) {
        particles.push({
            x: x,
            y: y,
            radius: Math.random() * 3 + 1,
            color: '#00ff00',
            dx: (Math.random() - 0.5) * 5,
            dy: (Math.random() - 0.5) * 5,
            lifespan: 30
        });
    }
}

// Create bricks
function createBricks() {
    bricks = [];
    const colors = ['#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff'];
    for (let c = 0; c < brickInfo.cols; c++) {
        bricks[c] = [];
        for (let r = 0; r < brickInfo.rows; r++) {
            const brickX = c * (brickInfo.width + brickInfo.padding) + brickInfo.offsetLeft;
            const brickY = r * (brickInfo.height + brickInfo.padding) + brickInfo.offsetTop;
            const color = colors[r % colors.length];
            const points = (brickInfo.rows - r) * 10;
            bricks[c][r] = { x: brickX, y: brickY, status: 1, color: color, points: points };
        }
    }
}

// Draw everything
function drawBall() {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#00ff00';
    ctx.fill();
    ctx.closePath();
}

function drawPaddle() {
    ctx.beginPath();
    ctx.rect(paddle.x, paddle.y, paddle.width, paddle.height);
    ctx.fillStyle = '#00ff00';
    ctx.fill();
    ctx.closePath();
}

function drawBricks() {
    bricks.forEach(column => {
        column.forEach(brick => {
            if (brick.status === 1) {
                ctx.beginPath();
                ctx.rect(brick.x, brick.y, brickInfo.width, brickInfo.height);
                ctx.fillStyle = brick.color;
                ctx.fill();
                ctx.closePath();
            }
        });
    });
}

function drawParticles() {
    particles.forEach((particle, index) => {
        if (particle.lifespan <= 0) {
            particles.splice(index, 1);
        } else {
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            ctx.fillStyle = particle.color;
            ctx.globalAlpha = particle.lifespan / 30;
            ctx.fill();
            ctx.closePath();
            ctx.globalAlpha = 1.0;

            particle.x += particle.dx;
            particle.y += particle.dy;
            particle.lifespan--;
        }
    });
}

// Move paddle
let rightPressed = false;
let leftPressed = false;

document.addEventListener('keydown', (e) => {
    if (e.key === 'Right' || e.key === 'ArrowRight') {
        rightPressed = true;
    } else if (e.key === 'Left' || e.key === 'ArrowLeft') {
        leftPressed = true;
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'Right' || e.key === 'ArrowRight') {
        rightPressed = false;
    } else if (e.key === 'Left' || e.key === 'ArrowLeft') {
        leftPressed = false;
    }
});

function movePaddle() {
    if (rightPressed && paddle.x < canvas.width - paddle.width) {
        paddle.x += paddle.speed;
    } else if (leftPressed && paddle.x > 0) {
        paddle.x -= paddle.speed;
    }
}

// Collision detection
function collisionDetection() {
    // Ball and walls
    if (ball.x + ball.dx > canvas.width - ball.radius || ball.x + ball.dx < ball.radius) {
        ball.dx = -ball.dx;
        playWallSound();
    }
    if (ball.y + ball.dy < ball.radius) {
        ball.dy = -ball.dy;
        playWallSound();
    } else if (ball.y + ball.dy > canvas.height - ball.radius) {
        if (ball.x > paddle.x && ball.x < paddle.x + paddle.width) {
            ball.dy = -ball.dy;
            playPaddleSound();
        } else {
            lives--;
            livesSpan.textContent = lives;
            playLossSound();
            if (!lives) {
                addHighScore(score);
                gameState = 'start';
                startMenu.classList.remove('hidden');
                resetGame();
            } else {
                ball.x = canvas.width / 2;
                ball.y = paddle.y - 30;
                ball.dx = ball.speed;
                ball.dy = -ball.speed;
                paddle.x = (canvas.width - paddle.width) / 2;
            }
        }
    }

    // Ball and bricks
    bricks.forEach(column => {
        column.forEach(brick => {
            if (brick.status === 1) {
                if (
                    ball.x > brick.x &&
                    ball.x < brick.x + brickInfo.width &&
                    ball.y > brick.y &&
                    ball.y < brick.y + brickInfo.height
                ) {
                    ball.dy = -ball.dy;
                    brick.status = 0;
                    score += brick.points;
                    scoreSpan.textContent = score;
                    playBrickSound();
                    createParticles(ball.x, ball.y);

                    // Increase speed every 5 bricks broken
                    if (score % 50 === 0) {
                        ball.speed *= 1.1;
                        ball.dx = ball.dx > 0 ? ball.speed : -ball.speed;
                        ball.dy = ball.dy > 0 ? ball.speed : -ball.speed;
                    }

                    let allBricksBroken = true;
                    for (let c = 0; c < brickInfo.cols; c++) {
                        for (let r = 0; r < brickInfo.rows; r++) {
                            if (bricks[c][r].status === 1) {
                                allBricksBroken = false;
                                break;
                            }
                        }
                        if (!allBricksBroken) break;
                    }

                    if (allBricksBroken) {
                        alert('YOU WIN, CONGRATULATIONS!');
                        addHighScore(score);
                        gameState = 'start';
                        startMenu.classList.remove('hidden');
                        resetGame();
                    }
                }
            }
        });
    });
}

function resetGame() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    paddle.x = (canvas.width - paddle.width) / 2;
    paddle.y = canvas.height - paddle.height - 10;

    const availableWidth = canvas.width - 20; // 10px padding on each side
    brickInfo.cols = Math.floor(availableWidth / (brickInfo.width + brickInfo.padding));
    brickInfo.offsetLeft = (canvas.width - (brickInfo.cols * (brickInfo.width + brickInfo.padding) - brickInfo.padding)) / 2;

    ball.x = canvas.width / 2;
    ball.y = paddle.y - 30;
    ball.dx = 0;
    ball.dy = 0;
    ball.speed = 6.2;
    paddle.speed = 12;
    
    score = 0;
    lives = 3;
    bricksBroken = 0;
    scoreSpan.textContent = score;
    livesSpan.textContent = lives;

    createBricks();
}

function update() {
    if (gameState === 'playing') {
        // Move objects
        movePaddle();
        ball.x += ball.dx;
        ball.y += ball.dy;

        // Collision detection
        collisionDetection();
    }

    // Draw objects
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBricks();
    drawBall();
    drawPaddle();
    drawParticles();

    requestAnimationFrame(update);
}

playerNameInput.addEventListener('input', () => {
    startButton.disabled = playerNameInput.value.trim() === '';
});


startButton.addEventListener('click', () => {
    playerName = playerNameInput.value;
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    resetGame(); // Start a new game
    ball.dx = ball.speed;
    ball.dy = -ball.speed;
    gameState = 'playing';
    startMenu.classList.add('hidden');
});

resumeButton.addEventListener('click', () => {
    gameState = 'playing';
    pauseMenu.classList.add('hidden');
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (gameState === 'playing') {
            gameState = 'paused';
            pauseMenu.classList.remove('hidden');
        } else if (gameState === 'paused') {
            gameState = 'playing';
            pauseMenu.classList.add('hidden');
        }
    }
});

window.addEventListener('resize', () => {
    resetGame();
    gameState = 'start';
    startMenu.classList.remove('hidden');
    pauseMenu.classList.add('hidden');
});

resetGame();
updateHighScores();
update();