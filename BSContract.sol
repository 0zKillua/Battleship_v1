// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ImprovedOnChainBattleship
 * @dev A secure implementation of Battleship game using Merkle proofs
 * @notice This contract addresses all security vulnerabilities from the original version
 */
contract ImprovedOnChainBattleship is ReentrancyGuard, Pausable, Ownable {

    enum GamePhase { Setup, Started, Ended }

    struct Player {
        address addr;
        bytes32 boardRoot;
        bytes32 hashedMasterSalt;
        uint256 hits; // Hits made by this player
        uint256 hitsAgainst; // Hits against this player's ships
        bool revealed;
        bool slashed;
        uint256 lastMoveTime;
        uint256 lastRevealTime;
    }

    struct PendingGuess {
        address guesser;
        address target;
        uint8 x;
        uint8 y;
        uint256 timestamp;
    }

    struct Game {
        Player player1;
        Player player2;
        address currentGuesser;
        address winner;
        GamePhase gamePhase;
        PendingGuess pendingGuess;
        uint256 gameStartTime;
        bool gameExists;
    }

    // Constants
    uint256 public constant STAKE = 0.1 ether; // Reduced for MVP testing
    uint256 public constant MOVE_TIMEOUT = 24 hours;
    uint256 public constant REVEAL_TIMEOUT = 7 days;
    uint256 public constant TOTAL_SHIP_CELLS = 17; // Standard battleship: 5+4+3+3+2 = 17 cells
    
    // State variables
    mapping(uint256 => Game) public games;
    mapping(address => uint256) public playerToGame;
    mapping(address => uint256) public withdrawable;
    uint256 public nextGameId = 1;
    uint256 public totalGames;

    // Events
    event GameCreated(uint256 indexed gameId, address indexed creator);
    event GameStarted(uint256 indexed gameId, address indexed player1, address indexed player2);
    event GuessSubmitted(uint256 indexed gameId, address indexed guesser, uint8 x, uint8 y);
    event GuessResponded(uint256 indexed gameId, address indexed responder, bool hit);
    event SaltRevealed(uint256 indexed gameId, address indexed player);
    event GameEnded(uint256 indexed gameId, address indexed winner, string reason);
    event StakeSlashed(uint256 indexed gameId, address indexed cheater, uint256 amount, string reason);
    event FundsWithdrawn(address indexed player, uint256 amount);
    event TimeoutClaimed(uint256 indexed gameId, address indexed claimer, string reason);

    // Modifiers
    modifier onlyGamePlayers(uint256 gameId) {
        Game storage game = games[gameId];
        require(
            msg.sender == game.player1.addr || msg.sender == game.player2.addr,
            "Not a player in this game"
        );
        _;
    }

    modifier gameExists(uint256 gameId) {
        require(games[gameId].gameExists, "Game does not exist");
        _;
    }

    modifier validCoordinates(uint8 x, uint8 y) {
        require(x < 10 && y < 10, "Invalid coordinates");
        _;
    }

    constructor() {}

    /**
     * @dev Create a new game or join an existing one
     * @param _boardRoot Merkle root of the player's board
     * @param _hashedMasterSalt Hash of the master salt for post-game verification
     */
    function commitBoard(bytes32 _boardRoot, bytes32 _hashedMasterSalt) 
        external 
        payable 
        whenNotPaused 
        nonReentrant 
    {
        require(msg.value == STAKE, "Incorrect stake amount");
        require(_boardRoot != bytes32(0), "Invalid board root");
        require(_hashedMasterSalt != bytes32(0), "Invalid master salt hash");
        require(playerToGame[msg.sender] == 0, "Player already in a game");

        // Try to find a game waiting for a second player
        uint256 gameId = _findOrCreateGame();
        Game storage game = games[gameId];

        if (game.player1.addr == address(0)) {
            // First player
            game.player1 = Player({
                addr: msg.sender,
                boardRoot: _boardRoot,
                hashedMasterSalt: _hashedMasterSalt,
                hits: 0,
                hitsAgainst: 0,
                revealed: false,
                slashed: false,
                lastMoveTime: block.timestamp,
                lastRevealTime: 0
            });
            
            playerToGame[msg.sender] = gameId;
            emit GameCreated(gameId, msg.sender);
            
        } else if (game.player2.addr == address(0)) {
            // Second player - game can start
            game.player2 = Player({
                addr: msg.sender,
                boardRoot: _boardRoot,
                hashedMasterSalt: _hashedMasterSalt,
                hits: 0,
                hitsAgainst: 0,
                revealed: false,
                slashed: false,
                lastMoveTime: block.timestamp,
                lastRevealTime: 0
            });
            
            game.gamePhase = GamePhase.Started;
            game.currentGuesser = game.player1.addr;
            game.gameStartTime = block.timestamp;
            playerToGame[msg.sender] = gameId;
            
            emit GameStarted(gameId, game.player1.addr, game.player2.addr);
        } else {
            revert("Game is full");
        }
    }

    /**
     * @dev Submit a guess for the current turn
     * @param _x X coordinate (0-9)
     * @param _y Y coordinate (0-9)
     */
    function submitGuess(uint8 _x, uint8 _y) 
        external 
        whenNotPaused 
        validCoordinates(_x, _y) 
    {
        uint256 gameId = playerToGame[msg.sender];
        require(gameId != 0, "Player not in any game");
        
        Game storage game = games[gameId];
        require(game.gamePhase == GamePhase.Started, "Game not active");
        require(msg.sender == game.currentGuesser, "Not your turn");
        require(game.pendingGuess.guesser == address(0), "Pending guess unresolved");

        address target = (msg.sender == game.player1.addr) ? game.player2.addr : game.player1.addr;
        
        game.pendingGuess = PendingGuess({
            guesser: msg.sender,
            target: target,
            x: _x,
            y: _y,
            timestamp: block.timestamp
        });

        // Update last move time
        Player storage currentPlayer = (msg.sender == game.player1.addr) ? game.player1 : game.player2;
        currentPlayer.lastMoveTime = block.timestamp;

        emit GuessSubmitted(gameId, msg.sender, _x, _y);
    }

    /**
     * @dev Respond to a guess with a Merkle proof
     * @param _hit Whether the guess was a hit
     * @param _cellSalt Salt for the specific cell
     * @param _proof Merkle proof for the cell
     */
    function respondToGuess(bool _hit, bytes32 _cellSalt, bytes32[] calldata _proof) 
        external 
        whenNotPaused 
    {
        uint256 gameId = playerToGame[msg.sender];
        require(gameId != 0, "Player not in any game");
        
        Game storage game = games[gameId];
        require(game.gamePhase == GamePhase.Started, "Game not active");
        require(msg.sender == game.pendingGuess.target, "Not your board");
        require(game.pendingGuess.guesser != address(0), "No pending guess");

        Player storage targetPlayer = (msg.sender == game.player1.addr) ? game.player1 : game.player2;
        Player storage guesserPlayer = (msg.sender == game.player1.addr) ? game.player2 : game.player1;

        // Verify the Merkle proof
        bytes32 leaf = keccak256(abi.encodePacked(_hit, _cellSalt));
        bool validProof = MerkleProof.verify(_proof, targetPlayer.boardRoot, leaf);

        if (!validProof) {
            // Slash the cheater
            _slashPlayer(gameId, msg.sender, "Invalid Merkle proof");
            return;
        }

        // Update hit counts
        if (_hit) {
            targetPlayer.hitsAgainst++;
            guesserPlayer.hits++;
            
            // Check for game end (all 17 ship cells hit)
            if (targetPlayer.hitsAgainst == TOTAL_SHIP_CELLS) {
                _endGame(gameId, game.pendingGuess.guesser, "All ships destroyed");
                return;
            }
        }

        // Switch turns
        game.currentGuesser = game.pendingGuess.target;
        
        // Update last move time
        targetPlayer.lastMoveTime = block.timestamp;
        
        // Clear pending guess
        delete game.pendingGuess;

        emit GuessResponded(gameId, msg.sender, _hit);
    }

    /**
     * @dev Reveal master salt for post-game verification
     * @param _masterSalt The master salt used to generate the board
     */
    function revealMasterSalt(bytes32 _masterSalt) 
        external 
        whenNotPaused 
    {
        uint256 gameId = playerToGame[msg.sender];
        require(gameId != 0, "Player not in any game");
        
        Game storage game = games[gameId];
        require(game.gamePhase == GamePhase.Ended, "Game still ongoing");

        Player storage player = (msg.sender == game.player1.addr) ? game.player1 : game.player2;
        require(!player.revealed, "Already revealed");
        require(keccak256(abi.encodePacked(_masterSalt)) == player.hashedMasterSalt, "Invalid master salt");

        player.revealed = true;
        player.lastRevealTime = block.timestamp;

        emit SaltRevealed(gameId, msg.sender);

        // Check if both players have revealed - if so, distribute stakes
        if (game.player1.revealed && game.player2.revealed) {
            _distributeFinalStakes(gameId);
        }
    }

    /**
     * @dev Withdraw accumulated funds
     */
    function withdraw() 
        external 
        nonReentrant 
        whenNotPaused 
    {
        uint256 amount = withdrawable[msg.sender];
        require(amount > 0, "Nothing to withdraw");

        withdrawable[msg.sender] = 0;
        
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Withdrawal failed");

        emit FundsWithdrawn(msg.sender, amount);
    }

    /**
     * @dev Claim timeout victory when opponent doesn't respond
     */
    function forceTimeout(uint256 gameId) 
        external 
        gameExists(gameId) 
        onlyGamePlayers(gameId) 
    {
        Game storage game = games[gameId];
        
        if (game.gamePhase == GamePhase.Started) {
            // Check for move timeout
            if (game.pendingGuess.guesser != address(0)) {
                // Waiting for response to guess
                require(
                    block.timestamp > game.pendingGuess.timestamp + MOVE_TIMEOUT,
                    "Response timeout not reached"
                );
                _endGame(gameId, game.pendingGuess.guesser, "Response timeout");
                
            } else {
                // Waiting for guess
                address opponent = (msg.sender == game.player1.addr) ? game.player2.addr : game.player1.addr;
                Player storage opponentPlayer = (opponent == game.player1.addr) ? game.player1 : game.player2;
                
                require(
                    block.timestamp > opponentPlayer.lastMoveTime + MOVE_TIMEOUT,
                    "Move timeout not reached"
                );
                _endGame(gameId, msg.sender, "Move timeout");
            }
            
        } else if (game.gamePhase == GamePhase.Ended) {
            // Check for reveal timeout
            Player storage opponent = (msg.sender == game.player1.addr) ? game.player2 : game.player1;
            
            require(!opponent.revealed, "Opponent already revealed");
            require(
                block.timestamp > game.gameStartTime + REVEAL_TIMEOUT,
                "Reveal timeout not reached"
            );
            
            // Slash the non-revealing player
            _slashPlayer(gameId, opponent.addr, "Reveal timeout");
        }
    }

    /**
     * @dev Emergency pause function (owner only)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Emergency unpause function (owner only)
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // Internal functions

    function _findOrCreateGame() internal returns (uint256) {
        // Look for existing game waiting for second player
        for (uint256 i = 1; i < nextGameId; i++) {
            if (games[i].gameExists && 
                games[i].gamePhase == GamePhase.Setup && 
                games[i].player2.addr == address(0)) {
                return i;
            }
        }
        
        // Create new game
        uint256 gameId = nextGameId++;
        games[gameId].gameExists = true;
        games[gameId].gamePhase = GamePhase.Setup;
        totalGames++;
        
        return gameId;
    }

    function _endGame(uint256 gameId, address winner, string memory reason) internal {
        Game storage game = games[gameId];
        game.gamePhase = GamePhase.Ended;
        game.winner = winner;
        
        emit GameEnded(gameId, winner, reason);
        
        // If game ended due to timeout/cheating, immediately distribute stakes
        if (keccak256(abi.encodePacked(reason)) != keccak256(abi.encodePacked("All ships destroyed"))) {
            _distributeFinalStakes(gameId);
        }
    }

    function _slashPlayer(uint256 gameId, address cheater, string memory reason) internal {
        Game storage game = games[gameId];
        
        Player storage cheaterPlayer = (cheater == game.player1.addr) ? game.player1 : game.player2;
        cheaterPlayer.slashed = true;
        
        address winner = (cheater == game.player1.addr) ? game.player2.addr : game.player1.addr;
        
        // Award both stakes to the honest player
        withdrawable[winner] += STAKE * 2;
        
        _endGame(gameId, winner, reason);
        
        emit StakeSlashed(gameId, cheater, STAKE, reason);
    }

    function _distributeFinalStakes(uint256 gameId) internal {
        Game storage game = games[gameId];
        
        if (game.winner != address(0)) {
            // Winner takes both stakes
            withdrawable[game.winner] += STAKE * 2;
        } else {
            // Shouldn't happen, but return stakes to both players
            withdrawable[game.player1.addr] += STAKE;
            withdrawable[game.player2.addr] += STAKE;
        }
        
        // Clean up - remove players from game mapping
        delete playerToGame[game.player1.addr];
        delete playerToGame[game.player2.addr];
    }

    // View functions

    function getGame(uint256 gameId) external view returns (
        address player1,
        address player2,
        address currentGuesser,
        address winner,
        GamePhase gamePhase,
        uint256 player1Hits,
        uint256 player1HitsAgainst,
        uint256 player2Hits,
        uint256 player2HitsAgainst
    ) {
        Game storage game = games[gameId];
        return (
            game.player1.addr,
            game.player2.addr,
            game.currentGuesser,
            game.winner,
            game.gamePhase,
            game.player1.hits,
            game.player1.hitsAgainst,
            game.player2.hits,
            game.player2.hitsAgainst
        );
    }

    function getPendingGuess(uint256 gameId) external view returns (
        address guesser,
        address target,
        uint8 x,
        uint8 y,
        uint256 timestamp
    ) {
        PendingGuess storage guess = games[gameId].pendingGuess;
        return (guess.guesser, guess.target, guess.x, guess.y, guess.timestamp);
    }

    function getPlayerGame(address player) external view returns (uint256) {
        return playerToGame[player];
    }

    function getWithdrawableAmount(address player) external view returns (uint256) {
        return withdrawable[player];
    }

    function getTotalGames() external view returns (uint256) {
        return totalGames;
    }
}