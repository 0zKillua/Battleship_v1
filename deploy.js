const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying ImprovedOnChainBattleship...");

  // Get the ContractFactory and Signers
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy the contract
  const ImprovedOnChainBattleship = await ethers.getContractFactory("ImprovedOnChainBattleship");
  const contract = await ImprovedOnChainBattleship.deploy();

  await contract.deployed();

  console.log("ImprovedOnChainBattleship deployed to:", contract.address);
  console.log("Transaction hash:", contract.deployTransaction.hash);
  
  // Wait for a few block confirmations
  console.log("Waiting for block confirmations...");
  await contract.deployTransaction.wait(6);
  
  console.log("Contract deployed successfully!");
  console.log("Contract address:", contract.address);
  console.log("Block number:", await ethers.provider.getBlockNumber());
  
  // Verify the contract (optional)
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("Verifying contract...");
    try {
      await hre.run("verify:verify", {
        address: contract.address,
        constructorArguments: [],
      });
      console.log("Contract verified successfully!");
    } catch (error) {
      console.log("Error verifying contract:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });