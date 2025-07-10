// Game Data
const SHIPS = [
    { name: "Carrier", size: 5, color: "#8B4513" },
    { name: "Battleship", size: 4, color: "#696969" },
    { name: "Cruiser", size: 3, color: "#4682B4" },
    { name: "Submarine", size: 3, color: "#2F4F4F" },
    { name: "Destroyer", size: 2, color: "#800080" }
];

const GRID_SIZE = 10;
const COORDINATES = {
    rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
    cols: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
};

// Game State
class GameState {
    constructor() {
        this.currentScreen = 'welcome';
        this.playerBoard = this.createEmptyBoard();
        this.enemyBoard = this.createEmptyBoard();
        this.playerShips = [];
        this.enemyShips = [];
        this.selectedShip = null;
        this.isHorizontal = true;
        this.currentPlayer = 'player';
        this.gameStats = {
            playerHits: 0,
            playerMisses: 0,
            enemyHits: 0,
            enemyMisses: 0
        };
        this.gameOver = false;
        this.winner = null;
    }

    createEmptyBoard() {
        return Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
    }

    reset() {
        this.currentScreen = 'welcome';
        this.playerBoard = this.createEmptyBoard();
        this.enemyBoard = this.createEmptyBoard();
        this.playerShips = [];
        this.enemyShips = [];
        this.selectedShip = null;
        this.isHorizontal = true;
        this.currentPlayer = 'player';
        this.gameStats = {
            playerHits: 0,
            playerMisses: 0,
            enemyHits: 0,
            enemyMisses: 0
        };
        this.gameOver = false;
        this.winner = null;
    }
}

// Initialize game
let game = new GameState();

// Screen Management
function showScreen(screenName) {
    const screens = {
        welcome: document.getElementById('welcome-screen'),
        placement: document.getElementById('placement-screen'),
        battle: document.getElementById('battle-screen'),
        victory: document.getElementById('victory-screen')
    };
    
    Object.values(screens).forEach(screen => {
        if (screen) {
            screen.classList.remove('active');
        }
    });
    
    if (screens[screenName]) {
        screens[screenName].classList.add('active');
        game.currentScreen = screenName;
    }
}

// Board Creation
function createBoard(container, isPlacementBoard = false) {
    if (!container) return;
    
    container.innerHTML = '';
    
    // Create coordinate cells
    const emptyCell = document.createElement('div');
    emptyCell.className = 'board-cell coordinate';
    container.appendChild(emptyCell);
    
    // Column headers
    for (let col = 0; col < GRID_SIZE; col++) {
        const colHeader = document.createElement('div');
        colHeader.className = 'board-cell coordinate';
        colHeader.textContent = COORDINATES.cols[col];
        container.appendChild(colHeader);
    }
    
    // Row cells
    for (let row = 0; row < GRID_SIZE; row++) {
        // Row header
        const rowHeader = document.createElement('div');
        rowHeader.className = 'board-cell coordinate';
        rowHeader.textContent = COORDINATES.rows[row];
        container.appendChild(rowHeader);
        
        // Game cells
        for (let col = 0; col < GRID_SIZE; col++) {
            const cell = document.createElement('div');
            cell.className = 'board-cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            
            if (isPlacementBoard) {
                cell.addEventListener('click', () => handlePlacementClick(row, col));
                cell.addEventListener('mouseover', () => handlePlacementHover(row, col));
                cell.addEventListener('mouseleave', () => clearPlacementPreview());
            } else if (container.id === 'enemy-board') {
                cell.addEventListener('click', () => handleEnemyAttack(row, col));
            }
            
            container.appendChild(cell);
        }
    }
}

// Ship Inventory
function createShipInventory() {
    const shipInventory = document.getElementById('ship-inventory');
    if (!shipInventory) return;
    
    shipInventory.innerHTML = '';
    
    SHIPS.forEach((ship, index) => {
        const shipItem = document.createElement('div');
        shipItem.className = 'ship-item';
        shipItem.dataset.shipIndex = index;
        shipItem.addEventListener('click', () => selectShip(index));
        
        const shipVisual = document.createElement('div');
        shipVisual.className = 'ship-visual';
        
        for (let i = 0; i < ship.size; i++) {
            const segment = document.createElement('div');
            segment.className = 'ship-segment';
            segment.style.backgroundColor = ship.color;
            shipVisual.appendChild(segment);
        }
        
        const shipInfo = document.createElement('div');
        shipInfo.className = 'ship-info';
        shipInfo.innerHTML = `
            <div class="ship-name">${ship.name}</div>
            <div class="ship-size">${ship.size} cells</div>
        `;
        
        shipItem.appendChild(shipVisual);
        shipItem.appendChild(shipInfo);
        shipInventory.appendChild(shipItem);
    });
}

// Ship Selection
function selectShip(shipIndex) {
    if (game.playerShips.some(s => s.index === shipIndex)) return;
    
    game.selectedShip = shipIndex;
    document.querySelectorAll('.ship-item').forEach(item => item.classList.remove('selected'));
    const selectedItem = document.querySelector(`[data-ship-index="${shipIndex}"]`);
    if (selectedItem) {
        selectedItem.classList.add('selected');
    }
}

// Ship Placement
function handlePlacementClick(row, col) {
    if (game.selectedShip === null) return;
    
    const ship = SHIPS[game.selectedShip];
    if (canPlaceShip(row, col, ship.size, game.isHorizontal)) {
        placeShip(row, col, ship.size, game.selectedShip, game.isHorizontal);
        const shipItem = document.querySelector(`[data-ship-index="${game.selectedShip}"]`);
        if (shipItem) {
            shipItem.classList.add('placed');
        }
        game.selectedShip = null;
        updateReadyButton();
    }
}

function handlePlacementHover(row, col) {
    if (game.selectedShip === null) return;
    
    const ship = SHIPS[game.selectedShip];
    showPlacementPreview(row, col, ship.size, game.isHorizontal);
}

function clearPlacementPreview() {
    document.querySelectorAll('.ship-preview, .valid-drop, .invalid-drop').forEach(cell => {
        cell.classList.remove('ship-preview', 'valid-drop', 'invalid-drop');
    });
}

function showPlacementPreview(row, col, size, isHorizontal) {
    clearPlacementPreview();
    
    const canPlace = canPlaceShip(row, col, size, isHorizontal);
    
    for (let i = 0; i < size; i++) {
        const currentRow = isHorizontal ? row : row + i;
        const currentCol = isHorizontal ? col + i : col;
        
        if (currentRow < GRID_SIZE && currentCol < GRID_SIZE) {
            const cell = document.querySelector(`#player-board [data-row="${currentRow}"][data-col="${currentCol}"]`);
            if (cell) {
                cell.classList.add('ship-preview');
                cell.classList.add(canPlace ? 'valid-drop' : 'invalid-drop');
            }
        }
    }
}

function canPlaceShip(row, col, size, isHorizontal) {
    for (let i = 0; i < size; i++) {
        const currentRow = isHorizontal ? row : row + i;
        const currentCol = isHorizontal ? col + i : col;
        
        if (currentRow >= GRID_SIZE || currentCol >= GRID_SIZE) return false;
        if (game.playerBoard[currentRow][currentCol] !== null) return false;
    }
    return true;
}

function placeShip(row, col, size, shipIndex, isHorizontal) {
    const positions = [];
    
    for (let i = 0; i < size; i++) {
        const currentRow = isHorizontal ? row : row + i;
        const currentCol = isHorizontal ? col + i : col;
        
        game.playerBoard[currentRow][currentCol] = shipIndex;
        positions.push({ row: currentRow, col: currentCol });
        
        const cell = document.querySelector(`#player-board [data-row="${currentRow}"][data-col="${currentCol}"]`);
        if (cell) {
            cell.classList.add('ship');
            cell.style.backgroundColor = SHIPS[shipIndex].color;
        }
    }
    
    game.playerShips.push({
        index: shipIndex,
        positions: positions,
        hits: 0,
        sunk: false
    });
}

// AI Ship Placement
function placeEnemyShips() {
    game.enemyShips = [];
    
    SHIPS.forEach((ship, index) => {
        let placed = false;
        let attempts = 0;
        
        while (!placed && attempts < 100) {
            const row = Math.floor(Math.random() * GRID_SIZE);
            const col = Math.floor(Math.random() * GRID_SIZE);
            const isHorizontal = Math.random() < 0.5;
            
            if (canPlaceEnemyShip(row, col, ship.size, isHorizontal)) {
                placeEnemyShip(row, col, ship.size, index, isHorizontal);
                placed = true;
            }
            attempts++;
        }
    });
}

function canPlaceEnemyShip(row, col, size, isHorizontal) {
    for (let i = 0; i < size; i++) {
        const currentRow = isHorizontal ? row : row + i;
        const currentCol = isHorizontal ? col + i : col;
        
        if (currentRow >= GRID_SIZE || currentCol >= GRID_SIZE) return false;
        if (game.enemyBoard[currentRow][currentCol] !== null) return false;
    }
    return true;
}

function placeEnemyShip(row, col, size, shipIndex, isHorizontal) {
    const positions = [];
    
    for (let i = 0; i < size; i++) {
        const currentRow = isHorizontal ? row : row + i;
        const currentCol = isHorizontal ? col + i : col;
        
        game.enemyBoard[currentRow][currentCol] = shipIndex;
        positions.push({ row: currentRow, col: currentCol });
    }
    
    game.enemyShips.push({
        index: shipIndex,
        positions: positions,
        hits: 0,
        sunk: false
    });
}

// Random Player Ship Placement
function randomPlacement() {
    // Clear existing ships
    game.playerShips = [];
    game.playerBoard = game.createEmptyBoard();
    document.querySelectorAll('.ship-item').forEach(item => item.classList.remove('placed'));
    
    // Clear board visually
    const playerBoard = document.getElementById('player-board');
    if (playerBoard) {
        createBoard(playerBoard, true);
    }
    
    // Place ships randomly
    SHIPS.forEach((ship, index) => {
        let placed = false;
        let attempts = 0;
        
        while (!placed && attempts < 100) {
            const row = Math.floor(Math.random() * GRID_SIZE);
            const col = Math.floor(Math.random() * GRID_SIZE);
            const isHorizontal = Math.random() < 0.5;
            
            if (canPlaceShip(row, col, ship.size, isHorizontal)) {
                placeShip(row, col, ship.size, index, isHorizontal);
                const shipItem = document.querySelector(`[data-ship-index="${index}"]`);
                if (shipItem) {
                    shipItem.classList.add('placed');
                }
                placed = true;
            }
            attempts++;
        }
    });
    
    updateReadyButton();
}

// Battle Logic
function handleEnemyAttack(row, col) {
    if (game.currentPlayer !== 'player' || game.gameOver) return;
    
    const cell = document.querySelector(`#enemy-board [data-row="${row}"][data-col="${col}"]`);
    if (!cell || cell.classList.contains('hit') || cell.classList.contains('miss')) return;
    
    const isHit = game.enemyBoard[row][col] !== null;
    
    if (isHit) {
        cell.classList.add('hit');
        game.gameStats.playerHits++;
        
        const shipIndex = game.enemyBoard[row][col];
        const ship = game.enemyShips.find(s => s.index === shipIndex);
        if (ship) {
            ship.hits++;
            
            if (ship.hits === SHIPS[shipIndex].size) {
                ship.sunk = true;
                markShipAsSunk(ship, 'enemy');
            }
        }
        
        if (checkVictory('player')) {
            endGame('player');
            return;
        }
    } else {
        cell.classList.add('miss');
        game.gameStats.playerMisses++;
    }
    
    updateStats();
    game.currentPlayer = 'enemy';
    const currentTurn = document.getElementById('current-turn');
    if (currentTurn) {
        currentTurn.textContent = 'Enemy Turn';
    }
    
    setTimeout(enemyTurn, 1000);
}

function enemyTurn() {
    if (game.currentPlayer !== 'enemy' || game.gameOver) return;
    
    let row, col;
    let validMove = false;
    
    while (!validMove) {
        row = Math.floor(Math.random() * GRID_SIZE);
        col = Math.floor(Math.random() * GRID_SIZE);
        
        const cell = document.querySelector(`#player-battle-board [data-row="${row}"][data-col="${col}"]`);
        if (cell && !cell.classList.contains('hit') && !cell.classList.contains('miss')) {
            validMove = true;
        }
    }
    
    const cell = document.querySelector(`#player-battle-board [data-row="${row}"][data-col="${col}"]`);
    if (!cell) return;
    
    const isHit = game.playerBoard[row][col] !== null;
    
    if (isHit) {
        cell.classList.add('hit');
        game.gameStats.enemyHits++;
        
        const shipIndex = game.playerBoard[row][col];
        const ship = game.playerShips.find(s => s.index === shipIndex);
        if (ship) {
            ship.hits++;
            
            if (ship.hits === SHIPS[shipIndex].size) {
                ship.sunk = true;
                markShipAsSunk(ship, 'player');
            }
        }
        
        if (checkVictory('enemy')) {
            endGame('enemy');
            return;
        }
    } else {
        cell.classList.add('miss');
        game.gameStats.enemyMisses++;
    }
    
    game.currentPlayer = 'player';
    const currentTurn = document.getElementById('current-turn');
    if (currentTurn) {
        currentTurn.textContent = 'Your Turn';
    }
}

function markShipAsSunk(ship, player) {
    ship.positions.forEach(pos => {
        const boardId = player === 'player' ? 'player-battle-board' : 'enemy-board';
        const cell = document.querySelector(`#${boardId} [data-row="${pos.row}"][data-col="${pos.col}"]`);
        if (cell) {
            cell.classList.remove('hit');
            cell.classList.add('sunk');
        }
    });
}

function checkVictory(player) {
    const ships = player === 'player' ? game.enemyShips : game.playerShips;
    return ships.every(ship => ship.sunk);
}

function endGame(winner) {
    game.gameOver = true;
    game.winner = winner;
    
    setTimeout(() => {
        const victoryTitle = document.getElementById('victory-title');
        const victorySubtitle = document.getElementById('victory-subtitle');
        const finalStats = document.getElementById('final-stats');
        
        if (victoryTitle) {
            victoryTitle.textContent = winner === 'player' ? 'Victory!' : 'Defeat!';
        }
        
        if (victorySubtitle) {
            victorySubtitle.textContent = winner === 'player' 
                ? 'You have proven your naval supremacy!' 
                : 'The enemy has outmaneuvered you!';
        }
        
        if (finalStats) {
            finalStats.innerHTML = `
                Your Performance:<br>
                Hits: ${game.gameStats.playerHits}<br>
                Misses: ${game.gameStats.playerMisses}<br>
                Accuracy: ${Math.round(game.gameStats.playerHits / (game.gameStats.playerHits + game.gameStats.playerMisses) * 100)}%
            `;
        }
        
        showScreen('victory');
    }, 1500);
}

// Utility Functions
function updateReadyButton() {
    const readyBtn = document.getElementById('ready-btn');
    if (readyBtn) {
        readyBtn.disabled = game.playerShips.length !== SHIPS.length;
    }
}

function updateStats() {
    const playerHits = document.getElementById('player-hits');
    const playerMisses = document.getElementById('player-misses');
    
    if (playerHits) {
        playerHits.textContent = game.gameStats.playerHits;
    }
    if (playerMisses) {
        playerMisses.textContent = game.gameStats.playerMisses;
    }
}

function copyBoardForBattle() {
    const playerBoard = document.getElementById('player-board');
    const playerBattleBoard = document.getElementById('player-battle-board');
    
    if (playerBoard && playerBattleBoard) {
        playerBattleBoard.innerHTML = playerBoard.innerHTML;
        
        // Remove placement event listeners and add battle styling
        playerBattleBoard.querySelectorAll('.board-cell').forEach(cell => {
            cell.classList.remove('ship-preview', 'valid-drop', 'invalid-drop');
        });
    }
}

// Initialize the game
function initializeGame() {
    console.log('Initializing Battleship Game...');
    showScreen('welcome');
    
    // Set up event listeners
    const startGameBtn = document.getElementById('start-game-btn');
    if (startGameBtn) {
        startGameBtn.addEventListener('click', () => {
            console.log('Start game clicked');
            showScreen('placement');
            const playerBoard = document.getElementById('player-board');
            if (playerBoard) {
                createBoard(playerBoard, true);
            }
            createShipInventory();
        });
    }
    
    const rotateBtn = document.getElementById('rotate-btn');
    if (rotateBtn) {
        rotateBtn.addEventListener('click', () => {
            game.isHorizontal = !game.isHorizontal;
            rotateBtn.textContent = game.isHorizontal ? '🔄 Rotate' : '🔄 Rotate';
        });
    }
    
    const randomPlacementBtn = document.getElementById('random-placement-btn');
    if (randomPlacementBtn) {
        randomPlacementBtn.addEventListener('click', randomPlacement);
    }
    
    const readyBtn = document.getElementById('ready-btn');
    if (readyBtn) {
        readyBtn.addEventListener('click', () => {
            placeEnemyShips();
            copyBoardForBattle();
            const enemyBoard = document.getElementById('enemy-board');
            if (enemyBoard) {
                createBoard(enemyBoard);
            }
            showScreen('battle');
            updateStats();
        });
    }
    
    const playAgainBtn = document.getElementById('play-again-btn');
    if (playAgainBtn) {
        playAgainBtn.addEventListener('click', () => {
            game.reset();
            showScreen('placement');
            const playerBoard = document.getElementById('player-board');
            if (playerBoard) {
                createBoard(playerBoard, true);
            }
            createShipInventory();
        });
    }
    
    const mainMenuBtn = document.getElementById('main-menu-btn');
    if (mainMenuBtn) {
        mainMenuBtn.addEventListener('click', () => {
            game.reset();
            showScreen('welcome');
        });
    }
}

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', initializeGame);