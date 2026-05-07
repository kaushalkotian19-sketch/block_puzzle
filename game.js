// game.js - Matrix Setup and Spawning Shapes

const boardElement = document.getElementById('board');
const ROWS = 8;
const COLS = 8;

// 1. The Logical Grid (The Matrix)
let grid = Array(ROWS).fill().map(() => Array(COLS).fill(0));

// 2. The Visual Grid Setup
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
// 🧩 THE SHAPE DICTIONARY 🧩
// ==========================================
// 1 = solid block, 0 = empty space
const SHAPES = [
    { name: 'dot', color: 'color-purple', matrix: [[1]] },
    { name: 'square-2x2', color: 'color-yellow', matrix: [
        [1, 1],
        [1, 1]
    ]},
    { name: 'square-3x3', color: 'color-blue', matrix: [
        [1, 1, 1],
        [1, 1, 1],
        [1, 1, 1]
    ]},
    { name: 'line-h-3', color: 'color-red', matrix: [
        [1, 1, 1]
    ]},
    { name: 'line-v-3', color: 'color-green', matrix: [
        [1],
        [1],
        [1]
    ]},
    { name: 'l-shape-right', color: 'color-purple', matrix: [
        [1, 0],
        [1, 0],
        [1, 1]
    ]}
];

// ==========================================
// 🎲 SPAWN RANDOM SHAPES INTO THE TRAY 🎲
// ==========================================
function spawnTrayBlocks() {
    for (let i = 0; i < 3; i++) {
        const slot = document.getElementById(`slot-${i}`);
        slot.innerHTML = ''; // Clear old shape

        // Pick a random shape from our dictionary
        const randomShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];

        // Create a mini CSS grid just for this shape
        const shapeElement = document.createElement('div');
        shapeElement.classList.add('shape-grid');
        
        // Tell the CSS grid exactly how many columns this specific shape needs
        const cols = randomShape.matrix[0].length;
        shapeElement.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

        // Draw the 1s and 0s!
        randomShape.matrix.forEach(row => {
            row.forEach(val => {
                const blockCell = document.createElement('div');
                if (val === 1) {
                    // It's a 1! Give it the 3D block look and the color
                    blockCell.classList.add('block-cell', randomShape.color);
                } else {
                    // It's a 0! Make it an invisible placeholder
                    blockCell.classList.add('block-cell', 'empty-cell');
                }
                shapeElement.appendChild(blockCell);
            });
        });

        // Add the finished shape to the tray slot
        slot.appendChild(shapeElement);
    }
}

// Boot up the game
createBoard();
spawnTrayBlocks();
