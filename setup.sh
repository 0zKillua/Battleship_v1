#!/bin/bash

# OnChain Battleship Setup Script
echo "🚢 Setting up OnChain Battleship project..."

# Create project directory
mkdir -p onchain-battleship
cd onchain-battleship

# Create directory structure
mkdir -p contracts scripts test

echo "📁 Created project structure"

# Initialize npm project
npm init -y

echo "📦 Installing dependencies..."

# Install dependencies
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npm install @openzeppelin/contracts dotenv

echo "✅ Dependencies installed"

# Create .env file from example
if [ -f ".env.example" ]; then
    cp .env.example .env
    echo "📝 Created .env file - please fill in your values"
else
    echo "PRIVATE_KEY=your_private_key_here" > .env
    echo "SEPOLIA_RPC_URL=https://rpc.sepolia.org" >> .env
    echo "ETHERSCAN_API_KEY=your_etherscan_api_key_here" >> .env
    echo "📝 Created .env file template"
fi

echo "🚀 Project setup complete!"
echo ""
echo "Next steps:"
echo "1. Move ImprovedOnChainBattleship.sol to contracts/"
echo "2. Move deploy.js to scripts/"
echo "3. Fill in your .env file with your private key"
echo "4. Run: npx hardhat compile"
echo "5. Run: npx hardhat run scripts/deploy.js --network sepolia"
echo ""
echo "📖 See README.md for detailed instructions"