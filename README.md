# OnChain Battleship - Complete MVP

A fully functional Battleship game implementation using Merkle proofs for verification without zero-knowledge proofs.

## 📥 How to Download Everything

### Method 1: Download Individual Files

Click on each file name below to download:

- **Smart Contract**: `ImprovedOnChainBattleship.sol`
- **Package Config**: `package.json`
- **Hardhat Config**: `hardhat.config.js`
- **Deployment Script**: `deploy.js`
- **Environment Template**: `.env.example`


## 🚀 Smart Contract Setup

### 1. Create Project Directory
```bash
mkdir onchain-battleship
cd onchain-battleship
```

### 2. Initialize Node.js Project
```bash
npm init -y
```

### 3. Install Dependencies
```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npm install @openzeppelin/contracts
```

### 4. Create Directory Structure
```bash
mkdir contracts
mkdir scripts
mkdir test
```

### 5. Move Files to Correct Locations
- Move `ImprovedOnChainBattleship.sol` to `contracts/`
- Move `deploy.js` to `scripts/`
- Keep `hardhat.config.js` and `package.json` in root directory
- Copy `.env.example` to `.env` and fill in your values

## 🔧 Environment Setup

### 1. Create `.env` File
```bash
cp .env.example .env
```

### 2. Fill in Your Values
```env
PRIVATE_KEY=your_private_key_here
SEPOLIA_RPC_URL=https://rpc.sepolia.org
ETHERSCAN_API_KEY=your_etherscan_api_key_here
```

**⚠️ IMPORTANT**: Never share your private key! Use a testnet wallet.

## 🎯 Deploy Contract

### 1. Compile Contract
```bash
npx hardhat compile
```

### 2. Deploy to Sepolia Testnet
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

### 3. Verify Contract (Optional)
```bash
npx hardhat verify CONTRACT_ADDRESS --network sepolia
```

## 📋 Project Structure

```
onchain-battleship/
├── contracts/
│   └── ImprovedOnChainBattleship.sol
├── scripts/
│   └── deploy.js
├── test/
├── hardhat.config.js
├── package.json
├── .env.example
└── README.md
```

## 🎮 Frontend Usage

The frontend is completely standalone and works without any blockchain connection:

1. **Ship Placement**: Drag and drop 5 ships onto your 10x10 grid
2. **Battle Phase**: Click enemy grid squares to attack
3. **Visual Effects**: See explosions for hits, splashes for misses
4. **Victory**: Game ends when all ships are destroyed

## 🔒 Security Features

### Smart Contract Security
- **ReentrancyGuard**: Prevents reentrancy attacks
- **Pausable**: Emergency stop functionality
- **Ownable**: Owner controls for emergency situations
- **Input Validation**: Coordinate and state validation
- **Timeout System**: Prevents griefing attacks

### Game Integrity
- **Merkle Proof Verification**: All moves verified cryptographically
- **Anti-Cheat System**: Economic penalties for invalid proofs
- **Timeout Mechanisms**: 24-hour move timeout, 7-day reveal timeout
- **Slashing Logic**: Cheaters forfeit their stakes

## 💰 Game Economics

- **Stake**: 0.1 ETH per game (perfect for testnet)
- **Winner Takes All**: Winner receives both stakes (0.2 ETH total)
- **Slashing**: Cheaters lose their stake to honest players
- **Timeouts**: Non-responsive players forfeit their stakes

## 🧪 Testing

### Run Tests
```bash
npx hardhat test
```

### Local Development
```bash
npx hardhat node
```

## 🌐 Network Support

- **Sepolia Testnet**: Recommended for testing
- **Goerli Testnet**: Alternative testnet
- **Mainnet**: Production deployment

## 📖 Game Rules

1. **Standard Battleship**: 5 ships (Carrier:5, Battleship:4, Cruiser:3, Submarine:3, Destroyer:2)
2. **Turn-Based**: Players alternate making guesses
3. **Merkle Proofs**: All hits/misses verified cryptographically
4. **Win Condition**: First to sink all opponent ships wins
5. **Anti-Cheat**: Invalid proofs result in automatic loss

## 🆘 Troubleshooting

### Common Issues

1. **"Invalid private key"**: Make sure your private key is 64 characters (without 0x prefix)
2. **"Insufficient funds"**: Ensure your wallet has testnet ETH
3. **"Contract not found"**: Check if contract address is correct
4. **"Network error"**: Verify RPC URL is working

### Get Testnet ETH
- Sepolia: https://sepoliafaucet.com/
- Goerli: https://goerlifaucet.com/

## 📚 Additional Resources

- [Hardhat Documentation](https://hardhat.org/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)
- [Ethereum Testnets](https://ethereum.org/en/developers/docs/networks/)

## 🎯 Next Steps

1. **Test Locally**: Deploy to local hardhat network
2. **Testnet Deployment**: Deploy to Sepolia testnet
3. **Frontend Integration**: Connect frontend to deployed contract
4. **Security Audit**: Professional security review
5. **Mainnet Launch**: Production deployment

## 🤝 Support

For questions or issues:
1. Check the troubleshooting section
2. Review Hardhat documentation
3. Test on local network first
4. Verify all environment variables are set correctly

**Status: Ready for deployment and testing! 🚢⚓**