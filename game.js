const ROWS = 8;
const COLS = 8;
const boardElement = document.getElementById('board');
let grid = Array(ROWS).fill().map(() => Array(COLS).fill(0));
let score = 0;
let bestScore = localStorage.getItem('blockPuzzleBest') || 0;
document.getElementById('best-score-text').innerText = bestScore;

let tutorialSeen = localStorage.getItem('blockPuzzleTutorial') === 'true';
let sfxEnabled = true;

// 💣 BOMB SURVIVAL GLOBALS
let currentMode = 'classic';
let activeBombs = [];
const BOMB_START_TIMER = 9;

// 🪙 ECONOMY & INVENTORY GLOBALS
let coins = parseInt(localStorage.getItem('blockPuzzleCoins')) || 0;
document.getElementById('coin-text').innerText = coins;

let inventory = JSON.parse(localStorage.getItem('blockInventory')) || { classic: true, wood: false, retro: false, neon: false };
let activeTheme = localStorage.getItem('activeTheme') || 'classic';

// ----------------------------------------------------
// AUDIO ENGINE
// ----------------------------------------------------
function playSound(id) {
    if (!sfxEnabled) return;
    const sound = document.getElementById('sfx-' + id);
    if (sound) {
        sound.currentTime = 0;
        sound.play().catch(e => console.log("Audio play prevented:", e));
    }
}
function toggleSfx() {
    sfxEnabled = !sfxEnabled;
    const btn = document.getElementById('sfx-toggle');
    btn.innerText = sfxEnabled ? "ON" : "OFF";
    btn.className = sfxEnabled ? "toggle-btn on" : "toggle-btn off";
    playSound('click');
}

// ----------------------------------------------------
// THEME & SHOP SYSTEM
// ----------------------------------------------------
function applyTheme(themeName) {
    const container = document.getElementById('game-container');
    container.classList.remove('theme-wood', 'theme-retro', 'theme-neon');
    if (themeName !== 'classic') container.classList.add('theme-' + themeName);
    activeTheme = themeName;
    localStorage.setItem('activeTheme', themeName);
}
applyTheme(activeTheme); // Init on startup

function addCoins(amount) {
    coins += amount;
    localStorage.setItem('blockPuzzleCoins', coins);
    const coinEl = document.getElementById('coin-text');
    coinEl.innerText = coins;
    
    const balanceContainer = document.getElementById('coin-balance');
    balanceContainer.classList.remove('coin-pop-anim');
    void balanceContainer.offsetWidth; // Force reflow
    balanceContainer.classList.add('coin-pop-anim');
}

const SHOP_ITEMS = [
    { id: 'classic', name: 'Classic Glass', price: 0 },
    { id: 'wood', name: 'Wooden Forest', price: 500 },
    { id: 'retro', name: 'Retro 8-Bit', price: 1500 },
    { id: 'neon', name: 'Neon Arcade', price: 5000 }
];

function renderShop() {
    const container = document.getElementById('shop-items-container');
    document.getElementById('shop-coin-balance').innerText = coins;
    container.innerHTML = ''; 

    SHOP_ITEMS.forEach(item => {
        const card = document.createElement('div');
        card.className = 'shop-card';
        let buttonHTML = '';
        let buttonAction = '';

        if (activeTheme === item.id) {
            buttonHTML = `<button class="shop-btn btn-equipped">EQUIPPED</button>`;
        } else if (inventory[item.id]) {
            buttonAction = `onclick="equipTheme('${item.id}')"`;
            buttonHTML = `<button class="shop-btn btn-equip" ${buttonAction}>EQUIP</button>`;
        } else {
            if (coins >= item.price) {
                buttonAction = `onclick="buyTheme('${item.id}', ${item.price})"`;
                buttonHTML = `<button class="shop-btn btn-buy" ${buttonAction}>BUY</button>`;
            } else {
                buttonHTML = `<button class="shop-btn btn-locked">BUY</button>`;
            }
        }

        let priceText = item.price === 0 ? 'Starter' : `🪙 ${item.price}`;
        if (inventory[item.id]) priceText = 'Owned';

        card.innerHTML = `
            <div class="shop-card-info">
                <div class="shop-card-title">${item.name}</div>
                <div class="shop-card-price">${priceText}</div>
            </div>
            <div>${buttonHTML}</div>
        `;
        container.appendChild(card);
    });
}

function buyTheme(themeId, price) {
    if (coins >= price) {
        playSound('combo');
        addCoins(-price); 
        inventory[themeId] = true;
        localStorage.setItem('blockInventory', JSON.stringify(inventory));
        equipTheme(themeId); 
    } else {
        playSound('error');
    }
}

function equipTheme(themeId) {
    playSound('click');
    applyTheme(themeId);
    renderShop();
}

function openShop() { playSound('click'); renderShop(); document.getElementById('shop-modal').style.display = 'flex'; }
function closeShop() { playSound('click'); document.getElementById('shop-modal').style.display = 'none'; }
function openSettings() { playSound('click'); document.getElementById('settings-modal').style.display = 'flex'; }
function closeSettings() { playSound('click'); document.getElementById('settings-modal').style.display = 'none'; }
function closeTutorial() {
    playSound('click');
    document.getElementById('tutorial-overlay').style.display = 'none';
    tutorialSeen = true;
    localStorage.setItem('blockPuzzleTutorial', 'true');
}

// ----------------------------------------------------
// BOOT & INITIALIZATION
// ----------------------------------------------------
window.onload = () => {
    setTimeout(() => {
        document.getElementById('splash-1').classList.remove('active');
        document.getElementById('splash-2').classList.add('active');
    }, 2000);

    setTimeout(() => {
        document.getElementById('splash-2').classList.remove('active');
        document.getElementById('splash-3').classList.add('active');
    }, 4000);
};

function startGame(mode) {
    playSound('click');
    currentMode = mode;
    activeBombs = []; // Clear bombs
    
    document.getElementById('boot-sequence').style.opacity = '0';
    document.getElementById('game-container').style.opacity = '1';
    document.getElementById('game-container').style.transition = 'opacity 1s ease';

    setTimeout(() => {
        document.getElementById('boot-sequence').style.display = 'none';
        
        grid = Array(ROWS).fill().map(() => Array(COLS).fill(0));
        score = 0;
        document.getElementById('score-display').innerText = score;
        
        createBoard();
        spawnTrayBlocks();
        
        if (!tutorialSeen) document.getElementById('tutorial-overlay').style.display = 'flex';
    }, 500);
}

// ----------------------------------------------------
// SHAPES & LOGIC
// ----------------------------------------------------
const SHAPES = [
    { matrix: [[1]], color: 'red' }, // 1x1
    { matrix: [[1,1]], color: 'blue' }, // 2x1
    { matrix: [[1],[1]], color: 'blue' }, // 1x2
    { matrix: [[1,1,1]], color: 'green' }, // 3x1
    { matrix: [[1],[1],[1]], color: 'green' }, // 1x3
    { matrix: [[1,1],[1,1]], color: 'yellow' }, // 2x2
    { matrix: [[1,1,1],[1,1,1],[1,1,1]], color: 'purple' }, // 3x3
    { matrix: [[1,0],[1,1]], color: 'orange' }, // Small L
    { matrix: [[1,1,1],[1,0,0],[1,0,0]], color: 'cyan' }, // Big L
    { matrix: [[1,1,1],[0,0,1],[0,0,1]], color: 'cyan' } // Big L Mirrored
];

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

function spawnTrayBlocks() {
    for (let i = 0; i < 3; i++) {
        const slot = document.getElementById(`slot-${i}`);
        slot.innerHTML = ''; 

        const randomShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
        const shapeMatrix = JSON.parse(JSON.stringify(randomShape.matrix));
        let bombCell = null;

        // 🚨 7% chance to spawn a bomb if in Bomb Mode!
        if (currentMode === 'bomb' && Math.random() < 0.07) { 
            let validCells = [];
            for(let r=0; r<shapeMatrix.length; r++) {
                for(let c=0; c<shapeMatrix[r].length; c++) {
                    if(shapeMatrix[r][c] === 1) validCells.push({r, c});
                }
            }
            if(validCells.length > 0) bombCell = validCells[Math.floor(Math.random() * validCells.length)];
        }

        const shapeElement = document.createElement('div');
        shapeElement.classList.add('shape-grid');
        shapeElement.style.gridTemplateColumns = `repeat(${shapeMatrix[0].length}, 1fr)`;
        
        shapeElement.dataset.matrix = JSON.stringify(shapeMatrix);
        shapeElement.dataset.color = randomShape.color;
        if (bombCell) shapeElement.dataset.bomb = JSON.stringify(bombCell);

        shapeMatrix.forEach((row, r) => {
            row.forEach((val, c) => {
                const blockCell = document.createElement('div');
                if (val === 1) {
                    blockCell.classList.add('block-cell', randomShape.color);
                    if (bombCell && bombCell.r === r && bombCell.c === c) {
                        blockCell.classList.add('bomb-block');
                        blockCell.innerText = BOMB_START_TIMER;
                    }
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

// ----------------------------------------------------
// DRAG & DROP LOGIC
// ----------------------------------------------------
let activeShape = null;
let offsetX = 0; let offsetY = 0;
let originalSlot = null;
let boardRect = null;
let cellWidth = 0;

function handleTouchStart(e) {
    playSound('pickup');
    activeShape = e.currentTarget;
    originalSlot = activeShape.parentElement;
    
    const touch = e.touches[0];
    const rect = activeShape.getBoundingClientRect();
    
    offsetX = touch.clientX - rect.left;
    offsetY = touch.clientY - rect.top;
    
    activeShape.classList.add('dragging');
    activeShape.style.position = 'absolute';
    activeShape.style.zIndex = '1000';
    activeShape.style.width = `${rect.width * 1.2}px`;
    
    document.body.appendChild(activeShape);
    moveShape(touch.clientX, touch.clientY);

    boardRect = boardElement.getBoundingClientRect();
    cellWidth = boardRect.width / COLS;
    
    activeShape.addEventListener('touchmove', handleTouchMove, { passive: false });
    activeShape.addEventListener('touchend', handleTouchEnd);
}

function handleTouchMove(e) {
    e.preventDefault(); 
    const touch = e.touches[0];
    
    // Offset Y significantly so the user's finger doesn't block the shape
    moveShape(touch.clientX, touch.clientY - 60); 

    const shapeMatrix = JSON.parse(activeShape.dataset.matrix);
    const colorClass = activeShape.dataset.color;
    
    clearGhost();

    if (isOverBoard(touch.clientX, touch.clientY - 60)) {
        const { row, col } = getBoardCoordinates(touch.clientX, touch.clientY - 60);
        if (canPlaceShape(shapeMatrix, row, col)) {
            drawGhost(shapeMatrix, colorClass, row, col);
        }
    }
}

function handleTouchEnd(e) {
    activeShape.removeEventListener('touchmove', handleTouchMove);
    activeShape.removeEventListener('touchend', handleTouchEnd);
    
    clearGhost();

    const touch = e.changedTouches[0];
    const shapeMatrix = JSON.parse(activeShape.dataset.matrix);
    const colorClass = activeShape.dataset.color;

    let placed = false;

    if (isOverBoard(touch.clientX, touch.clientY - 60)) {
        const { row, col } = getBoardCoordinates(touch.clientX, touch.clientY - 60);
        if (canPlaceShape(shapeMatrix, row, col)) {
            placeShape(shapeMatrix, colorClass, row, col);
            
            // 🚨 Move Bomb from Tray to Board
            if (activeShape.dataset.bomb) {
                const b = JSON.parse(activeShape.dataset.bomb);
                const bombR = row + b.r;
                const bombC = col + b.c;
                activeBombs.push({ r: bombR, c: bombC, timer: BOMB_START_TIMER });
                const boardCell = document.getElementById(`cell-${bombR}-${bombC}`);
                boardCell.classList.add('bomb-block');
                boardCell.innerText = BOMB_START_TIMER;
            }

            activeShape.remove(); 
            placed = true;
            addScore(shapeMatrix.flat().filter(v => v === 1).length);
            
            playSound('drop');
            const lines = checkAndClearLines();
            if (lines !== -1) { // If lines === -1, a bomb exploded
                checkTrayEmpty();
                checkGameOver();
            }
        }
    }

    if (!placed) {
        playSound('error');
        activeShape.classList.remove('dragging');
        activeShape.style.position = 'static';
        activeShape.style.width = '100%';
        activeShape.style.transform = 'none';
        originalSlot.appendChild(activeShape);
    }

    activeShape = null;
}

function moveShape(x, y) {
    activeShape.style.left = `${x - offsetX}px`;
    activeShape.style.top = `${y - offsetY}px`;
}

function isOverBoard(x, y) {
    return x >= boardRect.left && x <= boardRect.right && 
           y >= boardRect.top && y <= boardRect.bottom;
}

function getBoardCoordinates(x, y) {
    const col = Math.floor((x - boardRect.left) / cellWidth);
    const row = Math.floor((y - boardRect.top) / cellWidth);
    return { row, col };
}

function canPlaceShape(matrix, startRow, startCol) {
    for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
            if (matrix[r][c] === 1) {
                let targetRow = startRow + r;
                let targetCol = startCol + c;
                if (targetRow < 0 || targetRow >= ROWS || targetCol < 0 || targetCol >= COLS) return false;
                if (grid[targetRow][targetCol] !== 0) return false;
            }
        }
    }
    return true;
}

function placeShape(matrix, color, startRow, startCol) {
    for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
            if (matrix[r][c] === 1) {
                grid[startRow + r][startCol + c] = 1;
                const cell = document.getElementById(`cell-${startRow + r}-${startCol + c}`);
                cell.className = `cell block-cell ${color}`;
            }
        }
    }
}

// ----------------------------------------------------
// GHOST SYSTEM
// ----------------------------------------------------
function drawGhost(matrix, color, startRow, startCol) {
    for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
            if (matrix[r][c] === 1) {
                const cell = document.getElementById(`cell-${startRow + r}-${startCol + c}`);
                if (cell && grid[startRow + r][startCol + c] === 0) {
                    cell.className = `cell block-cell ${color} ghost-hover`;
                }
            }
        }
    }
}

function clearGhost() {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (grid[r][c] === 0) {
                document.getElementById(`cell-${r}-${c}`).className = 'cell';
            }
        }
    }
}

// ----------------------------------------------------
// CLEARING, BOMBS & SCORING
// ----------------------------------------------------
function checkAndClearLines() {
    let rowsToClear = []; let colsToClear = [];

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

    let cellsToShatter = new Set();
    rowsToClear.forEach(r => { for (let c = 0; c < COLS; c++) cellsToShatter.add(`${r}-${c}`); });
    colsToClear.forEach(c => { for (let r = 0; r < ROWS; r++) cellsToShatter.add(`${r}-${c}`); });

    // 🚨 BOMB DEFUSAL CHECK
    activeBombs = activeBombs.filter(bomb => {
        if (cellsToShatter.has(`${bomb.r}-${bomb.c}`)) {
            addScore(50); 
            addCoins(12); // 🪙 BONUS
            return false; 
        }
        return true;
    });

    // 🚨 BOMB TICK DOWN
    let bombExploded = false;
    activeBombs.forEach(bomb => {
        bomb.timer--;
        const cell = document.getElementById(`cell-${bomb.r}-${bomb.c}`);
        if (cell) cell.innerText = bomb.timer;
        if (bomb.timer <= 0) bombExploded = true;
    });

    if (bombExploded) {
        boardElement.classList.add('shake');
        setTimeout(() => {
            playSound('gameover');
            document.getElementById('game-over').querySelector('h2').innerText = "BOOM! You Exploded.";
            document.getElementById('revive-btn').style.display = 'none'; 
            document.getElementById('game-over').style.display = 'flex';
        }, 400);
        return -1; 
    }

    const linesCleared = rowsToClear.length + colsToClear.length;
    if (linesCleared === 0) return 0; 

    // 🪙 BASE PAYOUT
    addCoins(linesCleared * 4);

    playSound('shatter');
    if (linesCleared >= 2) {
        setTimeout(() => playSound('combo'), 100); 
        addCoins(12); // 🪙 COMBO BONUS
    }

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
            const cell = document.getElementById(`cell-${id}`);
            cell.className = 'cell'; 
            cell.innerText = ''; 
        });

        checkTrayEmpty();
        checkGameOver();
    }, 300);

    return linesCleared;
}

function addScore(points) {
    score += points;
    document.getElementById('score-display').innerText = score;
    if (score > bestScore) {
        bestScore = score;
        document.getElementById('best-score-text').innerText = bestScore;
        localStorage.setItem('blockPuzzleBest', bestScore);
    }
}

// ----------------------------------------------------
// GAME OVER & REVIVE
// ----------------------------------------------------
function checkTrayEmpty() {
    let empty = true;
    for (let i = 0; i < 3; i++) {
        if (document.getElementById(`slot-${i}`).children.length > 0) {
            empty = false;
        }
    }
    if (empty) spawnTrayBlocks();
}

function checkGameOver() {
    const shapesInTray = [];
    for (let i = 0; i < 3; i++) {
        const slot = document.getElementById(`slot-${i}`);
        if (slot.children.length > 0) {
            shapesInTray.push(JSON.parse(slot.children[0].dataset.matrix));
        }
    }

    let canPlay = false;
    shapesInTray.forEach(matrix => {
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (canPlaceShape(matrix, r, c)) canPlay = true;
            }
        }
    });

    if (!canPlay && shapesInTray.length > 0) {
        playSound('gameover');
        document.getElementById('final-score').innerText = score;
        document.getElementById('game-over').querySelector('h2').innerText = "Out of Moves!";
        document.getElementById('revive-btn').style.display = 'block';
        document.getElementById('game-over').style.display = 'flex';
    }
}

function resetGame() {
    playSound('click');
    grid = Array(ROWS).fill().map(() => Array(COLS).fill(0));
    score = 0;
    activeBombs = [];
    document.getElementById('score-display').innerText = score;
    document.getElementById('game-over').style.display = 'none';
    createBoard();
    spawnTrayBlocks();
}

function revive() {
    playSound('revive');
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    document.getElementById('game-over').style.display = 'none';
    
    // Clear a 4x4 area in the center
    for(let r=2; r<6; r++){
        for(let c=2; c<6; c++){
            grid[r][c] = 0;
            const cell = document.getElementById(`cell-${r}-${c}`);
            cell.className = 'cell';
            cell.innerText = '';
            
            // Remove any bombs in this blast radius
            activeBombs = activeBombs.filter(b => !(b.r === r && b.c === c));
        }
    }
    
    boardElement.classList.add('shake');
    checkGameOver(); // Re-check if the cleared space helped
}
