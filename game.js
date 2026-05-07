// game.js - Matrix Setup, Spawning, and Drag & Drop

const boardElement = document.getElementById('board');
const ROWS = 8;
const COLS = 8;

let grid = Array(ROWS).fill().map(() => Array(COLS).fill(0));

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

        // Store the matrix data inside the HTML element so we can read it later
        shapeElement.dataset.matrix = JSON.stringify(randomShape.matrix);

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

        // 🚨 ADD TOUCH LISTENERS 🚨
        shapeElement.addEventListener('touchstart', handleTouchStart, { passive: false });

        slot.appendChild(shapeElement);
    }
}

// ==========================================
// 👆 DRAG AND DROP SYSTEM 👆
// ==========================================
let activeShape = null;
let originalSlot = null;

function handleTouchStart(e) {
    e.preventDefault(); // Stop screen from scrolling
    
    activeShape = e.currentTarget;
    originalSlot = activeShape.parentElement;

    // Grab the first finger touching the screen
    const touch = e.touches[0];

    // Add the dragging CSS class to make it pop up
    activeShape.classList.add('dragging');

    // Move it to exactly where the finger is
    moveShapeToFinger(touch.clientX, touch.clientY);

    // Turn on the move and end listeners
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
    // The magic UX trick: Offset the Y coordinate by -100 pixels 
    // so the shape hovers ABOVE your finger!
    const offsetX = activeShape.offsetWidth / 2;
    const offsetY = activeShape.offsetHeight + 50; 

    activeShape.style.left = `${x - offsetX}px`;
    activeShape.style.top = `${y - offsetY}px`;
}

function handleTouchEnd(e) {
    if (!activeShape) return;

    // Remove the dragging state
    activeShape.classList.remove('dragging');
    
    // Clear the absolute positioning so it goes back to normal
    activeShape.style.left = '';
    activeShape.style.top = '';

    // Snap it back into its original tray slot
    originalSlot.appendChild(activeShape);

    // Turn off the listeners until they touch another block
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);
    
    activeShape = null;
}

// Boot up the game
createBoard();
spawnTrayBlocks();
