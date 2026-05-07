// game.js - Matrix Setup and Grid Drawing

const boardElement = document.getElementById('board');
const ROWS = 8;
const COLS = 8;

// 1. The Logical Grid (The Matrix)
// We fill an array with 8 arrays, each containing 8 zeros.
// 0 = Empty, 1 = Filled
let grid = Array(ROWS).fill().map(() => Array(COLS).fill(0));

// 2. The Visual Grid
// This loop draws the 64 empty squares inside the #board div
function createBoard() {
    boardElement.innerHTML = ''; // Clear board first
    
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            
            // Give each square an ID so we know exactly where it is (e.g., "cell-3-4")
            cell.id = `cell-${r}-${c}`;
            
            boardElement.appendChild(cell);
        }
    }
}

// Boot up the game
createBoard();
