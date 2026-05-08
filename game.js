// game.js - The Complete Block Puzzle Engine

// ==========================================
// 🎵 AUDIO & SETTINGS MANAGER 🎵
// ==========================================
const sounds = {
    pickup: new Audio('assets/pickup.mp3'),
    drop: new Audio('assets/drop.mp3'),
    error: new Audio('assets/error.mp3'),
    shatter: new Audio('assets/shutter.mp3'), 
    combo: new Audio('assets/combo.mp3'),
    gameover: new Audio('assets/gameover.mp3'),
    revive: new Audio('assets/revive-blast.mp3'),
    click: new Audio('assets/button-click.mp3')
};

let masterVolume = localStorage.getItem('blockPuzzleVolume') !== null ? parseFloat(localStorage.getItem('blockPuzzleVolume')) : 1.0;
let isMuted = localStorage.getItem('blockPuzzleMuted') === 'true';

function playSound(name) {
    if (isMuted || masterVolume === 0) return; 
    
    const soundClone = sounds[name].cloneNode();
    soundClone.volume = masterVolume;
    soundClone.play().catch(e => console.log("Waiting for user interaction."));
}

function openSettings() {
    playSound('click');
    document.getElementById('settings-modal').style.display = 'flex';
    document.getElementById('volume-slider').value = masterVolume;
    updateMuteUI();
}

function closeSettings() {
    playSound('click');
    document.getElementById('settings-modal').style.display = 'none';
}

function updateVolume(val) {
    masterVolume = parseFloat(val);
    localStorage.setItem('blockPuzzleVolume', masterVolume);
    
    if (isMuted && masterVolume > 0) {
        isMuted = false;
        localStorage.setItem('blockPuzzleMuted', isMuted);
        updateMuteUI();
    }
}

function toggleMute() {
    playSound('click');
    isMuted = !isMuted;
    localStorage.setItem('blockPuzzleMuted', isMuted); 
    updateMuteUI();
}

function updateMuteUI() {
    const btn = document.getElementById('sound-toggle-btn');
    if (isMuted) {
        btn.innerText = '🔇 Sound Off';
        btn.classList.add('muted');
    } else {
        btn.innerText = '🔊 Sound On';
        btn.classList.remove('muted');
    }
}

// ==========================================
// 🧩 CORE GAME VARIABLES 🧩
// ==========================================
const boardElement = document.getElementById('board');
const ROWS = 8;
const COLS = 8;

let grid = Array(ROWS).fill().map(() => Array(COLS).fill(0));
let score = 0;
let hasRevived = false;
let tutorialSeen = localStorage.getItem('blockPuzzleTutorial') === 'true';

let bestScore = localStorage.getItem('blockPuzzleBest') || 0;
document.getElementById('best-score-text').innerText = bestScore;

function createBoard() {
    boardElement.innerHTML = ''; 
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.id = `cell-${r}-${c}`;
            boardElement.appendChild(cell);
        }
    }
}

const SHAPES = [
    { name: 'dot', color: 'color-purple', matrix: [[1]] },
    { name: 'square-2x2', color: 'color-yellow', matrix: [[1, 1], [1, 1]] },
    { name: 'square-3x3', color: 'color-blue', matrix: [[1, 1, 1], [1, 1, 1], [1, 1, 1]] },
    { name: 'line-h-3', color: 'color-red', matrix: [[1, 1, 1]] },
    { name: 'line-v-3', color: 'color-green', matrix: [[1], [1], [1]] },
    { name: 'line-h-4', color: 'color-red', matrix: [[1, 1, 1, 1]] },
    { name: 'line-v-4', color: 'color-green', matrix: [[1], [1], [1], [1]] },
    { name: 'l-shape-small', color: 'color-purple', matrix: [[1, 0], [1, 1]] },
    { name: 'l-shape-big', color: 'color-blue', matrix: [
        [1, 0, 0],
        [1, 0, 0],
        [1, 1, 1]
    ]},
    { name: 't-shape', color: 'color-yellow', matrix: [
        [1, 1, 1],
        [0, 1, 0]
    ]},
    { name: 'z-shape', color: 'color-red', matrix: [
        [1, 1, 0],
        [0, 1, 1]
    ]}
];

function spawnTrayBlocks() {
    for (let i = 0; i < 3; i++) {
        const slot = document.getElementById(`slot-${i}`);
        slot.innerHTML = ''; 

        const randomShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];

        const shapeElement = document.createElement('div');
        shapeElement.classList.add('shape-grid');
        
        const cols = randomShape.matrix[0].length;
        shapeElement.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

        shapeElement.dataset.matrix = JSON.stringify(randomShape.matrix);
        shapeElement.dataset.color = randomShape.color;

        randomShape.matrix.forEach(row => {
            row.forEach(val => {
                const blockCell = document.createElement('div');
                if (val === 1) {
                    blockCell.classList.add('block-cell', randomShape.color);
                } else {
                    blockCell.classList.add('block-cell', 'empty-cell');
                }
                shapeElement.appendChild(blockCell);
            });
        });

        shapeElement.addEventListener('touchstart', handleTouchStart, { passive: false });
        slot.appendChild(shapeElement);
    }
    checkGameOver();
}

function hideTutorial(isButton = false) {
    if (tutorialSeen) return;
    if (isButton) playSound('click'); 
    tutorialSeen = true;
    localStorage.setItem('blockPuzzleTutorial', 'true');
    document.getElementById('tutorial-overlay').style.display = 'none';
}

// ==========================================
// 👆 DRAG AND DROP SYSTEM 👆
// ==========================================
let activeShape = null;
let originalSlot = null;

function handleTouchStart(e) {
    e.preventDefault(); 
    activeShape = e.currentTarget;
    originalSlot = activeShape.parentElement;

    const touch = e.touches[0];
    activeShape.classList.add('dragging');
    moveShapeToFinger(touch.clientX, touch.clientY);

    playSound('pickup');

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
}

function handleTouchMove(e) {
    e.preventDefault();
    if (!activeShape) return;
    const touch = e.touches[0];
    moveShapeToFinger(touch.clientX, touch.clientY);

    clearGhost();

    const shapeRect = activeShape.getBoundingClientRect();
    const boardRect = boardElement.getBoundingClientRect();
    const cellSize = boardRect.width / 8;

    const relativeX = shapeRect.left - boardRect.left;
    const relativeY = shapeRect.top - boardRect.top;
    
    const targetCol = Math.round(relativeX / cellSize);
    const targetRow = Math.round(relativeY / cellSize);

    const shapeMatrix = JSON.parse(activeShape.dataset.matrix);

    if (canPlaceShape(shapeMatrix, targetRow, targetCol)) {
        drawGhost(shapeMatrix, targetRow, targetCol);
    }
}

function moveShapeToFinger(x, y) {
    const offsetX = activeShape.offsetWidth / 2;
    const offsetY = activeShape.offsetHeight + 50; 
    activeShape.style.left = `${x - offsetX}px`;
    activeShape.style.top = `${y - offsetY}px`;
}

function addScore(points) {
    score += points;
    document.getElementById('score-display').innerText = score;
    
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('blockPuzzleBest', bestScore);
        document.getElementById('best-score-text').innerText = bestScore;
    }
}

function handleTouchEnd(e) {
    if (!activeShape) return;

    clearGhost();

    const shapeRect = activeShape.getBoundingClientRect();
    const boardRect = boardElement.getBoundingClientRect();
    const cellSize = boardRect.width / 8;

    activeShape.classList.remove('dragging');
    activeShape.style.left = '';
    activeShape.style.top = '';

    const relativeX = shapeRect.left - boardRect.left;
    const relativeY = shapeRect.top - boardRect.top;
    
    const targetCol = Math.round(relativeX / cellSize);
    const targetRow = Math.round(relativeY / cellSize);

    const shapeMatrix = JSON.parse(activeShape.dataset.matrix);
    const colorClass = activeShape.dataset.color;

    if (canPlaceShape(shapeMatrix, targetRow, targetCol)) {
        placeShape(shapeMatrix, colorClass, targetRow, targetCol);
        activeShape.remove(); 
        
        playSound('drop');
        if (navigator.vibrate) navigator.vibrate(20);

        hideTutorial();

        addScore(10); 

        const linesCleared = checkAndClearLines();
        if (linesCleared === 0) {
            checkTrayEmpty();
            checkGameOver();
        }

    } else {
        originalSlot.appendChild(activeShape); 
        playSound('error');
    }

    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);
    activeShape = null;
}

// ==========================================
// 💥 THE MATRIX LOGIC 💥
// ==========================================
function canPlaceShape(matrix, startRow, startCol) {
    for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
            if (matrix[r][c] === 1) {
                const tr = startRow + r;
                const tc = startCol + c;
                if (tr < 0 || tr >= ROWS || tc < 0 || tc >= COLS) return false;
                if (grid[tr][tc] !== 0) return false;
            }
        }
    }
    return true; 
}

function placeShape(matrix, colorClass, startRow, startCol) {
    for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
            if (matrix[r][c] === 1) {
                const tr = startRow + r;
                const tc = startCol + c;
                grid[tr][tc] = 1; 
                const cell = document.getElementById(`cell-${tr}-${tc}`);
                cell.className = `cell block-cell ${colorClass}`; 
            }
        }
    }
}

function drawGhost(matrix, startRow, startCol) {
    for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
            if (matrix[r][c] === 1) {
                const cell = document.getElementById(`cell-${startRow + r}-${startCol + c}`);
                if (cell && cell.className === 'cell') {
                    cell.classList.add('ghost-cell');
                }
            }
        }
    }
}

function clearGhost() {
    document.querySelectorAll('.ghost-cell').forEach(cell => {
        cell.classList.remove('ghost-cell');
    });
}

function checkAndClearLines() {
    let rowsToClear = [];
    let colsToClear = [];

    for (let r = 0; r < ROWS; r++) {
        let isFull = true;
        for (let c = 0; c < COLS; c++) { if (grid[r][c] === 0) isFull = false; }
        if (isFull) rowsToClear.push(r);
    }

    for (let c = 0; c < COLS; c++) {
        let isFull = true;
        for (let r = 0; r < ROWS; r++) { if (grid[r][c] === 0) isFull = false; }
        if (isFull) colsToClear.push(c);
    }

    const linesCleared = rowsToClear.length + colsToClear.length;
    if (linesCleared === 0) return 0; 

    playSound('shatter');
    if (linesCleared >= 2) {
        setTimeout(() => playSound('combo'), 100); 
    }

    let cellsToShatter = new Set();
    rowsToClear.forEach(r => { for (let c = 0; c < COLS; c++) cellsToShatter.add(`${r}-${c}`); });
    colsToClear.forEach(c => { for (let r = 0; r < ROWS; r++) cellsToShatter.add(`${r}-${c}`); });

    boardElement.classList.add('shake');
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

    cellsToShatter.forEach(id => {
        document.getElementById(`cell-${id}`).classList.add('shatter-anim');
    });

    addScore(linesCleared * 100);

    setTimeout(() => {
        boardElement.classList.remove('shake');
        cellsToShatter.forEach(id => {
            const [r, c] = id.split('-').map(Number);
            grid[r][c] = 0; 
            document.getElementById(`cell-${id}`).className = 'cell'; 
        });

        checkTrayEmpty();
        checkGameOver();
        
    }, 300);

    return linesCleared;
}

function checkTrayEmpty() {
    const slots = [document.getElementById('slot-0'), document.getElementById('slot-1'), document.getElementById('slot-2')];
    const isEmpty = slots.every(slot => slot.children.length === 0);
    if (isEmpty) spawnTrayBlocks();
}

function checkGameOver() {
    const slots = [document.getElementById('slot-0'), document.getElementById('slot-1'), document.getElementById('slot-2')];
    let canPlayAnywhere = false;

    slots.forEach(slot => {
        if (slot.children.length > 0) {
            const shapeElement = slot.children[0];
            const matrix = JSON.parse(shapeElement.dataset.matrix);
            
            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                    if (canPlaceShape(matrix, r, c)) canPlayAnywhere = true; 
                }
            }
        }
    });

    if (!canPlayAnywhere) {
        playSound('gameover');
        document.getElementById('game-over').style.display = 'flex';
    }
}

// ==========================================
// 🚨 THE REVIVE & RESET LOGIC 🚨
// ==========================================

function reviveGame() {
    if (hasRevived) return; 
    hasRevived = true;

    playSound('click');
    playSound('revive');

    document.getElementById('game-over').style.display = 'none';

    let cellsToShatter = new Set();
    for (let r = 2; r <= 5; r++) {
        for (let c = 2; c <= 5; c++) {
            if (grid[r][c] === 1) {
                cellsToShatter.add(`${r}-${c}`);
            }
        }
    }

    if (cellsToShatter.size > 0) {
        boardElement.classList.add('shake');
        if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 100]); 

        cellsToShatter.forEach(id => {
            document.getElementById(`cell-${id}`).classList.add('shatter-anim');
        });

        setTimeout(() => {
            boardElement.classList.remove('shake');
            cellsToShatter.forEach(id => {
                const [r, c] = id.split('-').map(Number);
                grid[r][c] = 0; 
                document.getElementById(`cell-${id}`).className = 'cell'; 
            });

            document.getElementById('revive-btn').style.display = 'none';
            checkGameOver(); 
        }, 300);
    } else {
        document.getElementById('revive-btn').style.display = 'none';
    }
}

function resetGame() {
    playSound('click');

    grid = Array(ROWS).fill().map(() => Array(COLS).fill(0));
    score = 0;
    document.getElementById('score-display').innerText = score;
    hasRevived = false;
    
    document.getElementById('revive-btn').style.display = 'block'; 
    document.getElementById('game-over').style.display = 'none';
    
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            document.getElementById(`cell-${r}-${c}`).className = 'cell'; 
        }
    }
    
    spawnTrayBlocks();
}

// ==========================================
// 🎬 BOOT SEQUENCE TIMELINE 🎬
// ==========================================

const splash1 = document.getElementById('splash-1');
const splash2 = document.getElementById('splash-2');
const splash3 = document.getElementById('splash-3');
const bootSequence = document.getElementById('boot-sequence');

document.getElementById('game-container').style.opacity = '0';

function runBootSequence() {
    setTimeout(() => {
        splash1.classList.remove('active');
        splash2.classList.add('active');
    }, 5000);

    setTimeout(() => {
        splash2.classList.remove('active');
        splash3.classList.add('active');
    }, 7500);
}

function startActualGame() {
    playSound('click');

    bootSequence.style.opacity = '0';
    document.getElementById('game-container').style.opacity = '1';
    document.getElementById('game-container').style.transition = 'opacity 1s ease';

    setTimeout(() => {
        bootSequence.style.display = 'none';
        createBoard();
        spawnTrayBlocks();
        
        if (!tutorialSeen) {
            document.getElementById('tutorial-overlay').style.display = 'flex';
        }
    }, 500);
}

runBootSequence();
