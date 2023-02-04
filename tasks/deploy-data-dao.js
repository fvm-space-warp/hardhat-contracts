const fs = require('node:fs');
const MedusaPackage = require("@medusa-network/medusa-sdk")
const providers = require("@ethersproject/providers")
const ethers = require("ethers");
const hre = require("hardhat");
require("dotenv").config();
const PRIVATE_KEY = process.env.PRIVATE_KEY


const medusaAddress = "0xb0dd3eb2374b21b6efacf41a16e25ed8114734e0";
const provider = new providers.JsonRpcProvider("https://filecoin-hyperspace.chainstacklabs.com/rpc/v1");
const signer = new ethers.Wallet(PRIVATE_KEY).connect(provider);
const DEPLOYER_PRIVATE_KEY = network.config.accounts[0]

const deployer = new ethers.Wallet(DEPLOYER_PRIVATE_KEY)


const main = async () => {
    console.log("Wallet Ethereum Address:", deployer.address)
    // Hyperspace
    // const priorityFee = parseInt(await callRpc("eth_maxPriorityFeePerGas"), 16);
    const priorityFee = (await provider.getFeeData()).maxPriorityFeePerGas;

    const DataDAOFac = await hre.ethers.getContractFactory("DataDAO");
    const DataDAO = await DataDAOFac.connect(signer).deploy(medusaAddress, false, [], {
        // maxPriorityFeePerGas to instruct hardhat to use EIP-1559 tx format
        maxPriorityFeePerGas: priorityFee,
    });
    await DataDAO.deployed();

    console.log(
        `DataDAO deployed to ${DataDAO.address}`
    );
    fs.writeFileSync('./constants/contract-address.txt', Buffer.from(DataDAO.address));


}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
    process.exit()
});
