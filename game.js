// game.js - The Complete Block Puzzle Engine

const boardElement = document.getElementById('board');
const ROWS = 8;
const COLS = 8;

let grid = Array(ROWS).fill().map(() => Array(COLS).fill(0));
let score = 0;

// ==========================================
// 1. BOARD INITIALIZATION
// ==========================================
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

// ==========================================
// 2. THE SHAPE DICTIONARY
// ==========================================
const SHAPES = [
    { name: 'dot', color: 'color-purple', matrix: [[1]] },
    { name: 'square-2x2', color: 'color-yellow', matrix: [[1, 1], [1, 1]] },
    { name: 'square-3x3', color: 'color-blue', matrix: [[1, 1, 1], [1, 1, 1], [1, 1, 1]] },
    { name: 'line-h-3', color: 'color-red', matrix: [[1, 1, 1]] },
    { name: 'line-v-3', color: 'color-green', matrix: [[1], [1], [1]] },
    { name: 'l-shape-right', color: 'color-purple', matrix: [[1, 0], [1, 0], [1, 1]] }
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

        // Save data to the HTML element so the drop logic can read it later
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
}

// ==========================================
// 3. DRAG AND DROP LOGIC
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

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
}

function handleTouchMove(e) {
    e.preventDefault();
    if (!activeShape) return;
    const touch = e.touches[0];
    moveShapeToFinger(touch.clientX, touch.clientY);
}

function moveShapeToFinger(x, y) {
    const offsetX = activeShape.offsetWidth / 2;
    const offsetY = activeShape.offsetHeight + 50; 
    activeShape.style.left = `${x - offsetX}px`;
    activeShape.style.top = `${y - offsetY}px`;
}

// ==========================================
// 4. THE MATRIX SNAP & SHATTER SYSTEM
// ==========================================
function handleTouchEnd(e) {
    if (!activeShape) return;

    // 1. Get exact pixel coordinates of the floating shape before we reset it
    const shapeRect = activeShape.getBoundingClientRect();
    const boardRect = boardElement.getBoundingClientRect();
    const cellSize = boardRect.width / 8;

    activeShape.classList.remove('dragging');
    activeShape.style.left = '';
    activeShape.style.top = '';

    // 2. Convert raw pixels to 8x8 Grid Rows and Columns
    const relativeX = shapeRect.left - boardRect.left;
    const relativeY = shapeRect.top - boardRect.top;
    
    const targetCol = Math.round(relativeX / cellSize);
    const targetRow = Math.round(relativeY / cellSize);

    const shapeMatrix = JSON.parse(activeShape.dataset.matrix);
    const colorClass = activeShape.dataset.color;

    // 3. Check if it fits, lock it in, and check for shattered lines!
    if (canPlaceShape(shapeMatrix, targetRow, targetCol)) {
        placeShape(shapeMatrix, colorClass, targetRow, targetCol);
        activeShape.remove(); // Delete it from the tray
        
        score += 10; // 10 points just for placing a piece
        document.getElementById('score-display').innerText = score;

        checkAndClearLines();
        checkTrayEmpty();
    } else {
        originalSlot.appendChild(activeShape); // Snap back to tray
    }

    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);
    activeShape = null;
}

function canPlaceShape(matrix, startRow, startCol) {
    for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
            if (matrix[r][c] === 1) {
                const tr = startRow + r;
                const tc = startCol + c;
                // Out of bounds check
                if (tr < 0 || tr >= ROWS || tc < 0 || tc >= COLS) return false;
                // Spot already taken check
                if (grid[tr][tc] !== 0) return false;
            }
        }
    }
    return true; // The piece fits perfectly!
}

function placeShape(matrix, colorClass, startRow, startCol) {
    for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
            if (matrix[r][c] === 1) {
                const tr = startRow + r;
                const tc = startCol + c;
                
                // Tell the computer's invisible matrix the spot is taken
                grid[tr][tc] = 1; 
                
                // Visually paint the 3D block onto the screen
                const cell = document.getElementById(`cell-${tr}-${tc}`);
                cell.className = `cell block-cell ${colorClass}`; 
            }
        }
    }
}

function checkAndClearLines() {
    let rowsToClear = [];
    let colsToClear = [];

    // Scan Rows
    for (let r = 0; r < ROWS; r++) {
        let isFull = true;
        for (let c = 0; c < COLS; c++) {
            if (grid[r][c] === 0) isFull = false;
        }
        if (isFull) rowsToClear.push(r);
    }

    // Scan Columns
    for (let c = 0; c < COLS; c++) {
        let isFull = true;
        for (let r = 0; r < ROWS; r++) {
            if (grid[r][c] === 0) isFull = false;
        }
        if (isFull) colsToClear.push(c);
    }

    // Erase the full rows visually and logically
    rowsToClear.forEach(r => {
        for (let c = 0; c < COLS; c++) {
            grid[r][c] = 0;
            document.getElementById(`cell-${r}-${c}`).className = 'cell'; 
        }
    });

    // Erase the full columns visually and logically
    colsToClear.forEach(c => {
        for (let r = 0; r < ROWS; r++) {
            grid[r][c] = 0;
            document.getElementById(`cell-${r}-${c}`).className = 'cell'; 
        }
    });

    // Big Score Bonus!
    const linesCleared = rowsToClear.length + colsToClear.length;
    if (linesCleared > 0) {
        score += linesCleared * 100;
        document.getElementById('score-display').innerText = score;
    }
}

function checkTrayEmpty() {
    const slots = [document.getElementById('slot-0'), document.getElementById('slot-1'), document.getElementById('slot-2')];
    // If every slot has 0 children, the tray is empty!
    const isEmpty = slots.every(slot => slot.children.length === 0);
    if (isEmpty) {
        spawnTrayBlocks();
    }
}

// Boot up the game
createBoard();
spawnTrayBlocks();
