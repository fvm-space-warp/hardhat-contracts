const MedusaPackage = require("@medusa-network/medusa-sdk")
const providers = require("@ethersproject/providers")
const ethers = require("ethers");
const { expect } = require("chai");
const hre = require("hardhat");
const util = require("util");
require("dotenv").config();
const PRIVATE_KEY = process.env.PRIVATE_KEY

const request = util.promisify(require("request"))


async function callRpc(method, params) {
    var options = {
        method: "POST",
        url: "https://api.hyperspace.node.glif.io/rpc/v1",
        // url: "http://localhost:1234/rpc/v0",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            jsonrpc: "2.0",
            method: method,
            params: params,
            id: 1,
        }),
    }
    const res = await request(options)
    return JSON.parse(res.body).result
}



// Filecoin Hyperspace Testnet
// const medusaAddress = "0xd466a3c66ad402aa296ab7544bce90bbe298f6a0";

const medusaAddress = "0xd466a3c66ad402aa296ab7544bce90bbe298f6a0";
const provider = new providers.JsonRpcProvider("https://api.hyperspace.node.glif.io/rpc/v1");
const signer = new ethers.Wallet(PRIVATE_KEY).connect(provider);
// applicationAddress is the dApp contract address for which you are encrypting.
const DEPLOYER_PRIVATE_KEY = network.config.accounts[0]

const deployer = new ethers.Wallet(DEPLOYER_PRIVATE_KEY)


const main = async () => {



    console.log("Wallet Ethereum Address:", deployer.address)
    // Hyperspace
    const medusaOracleAddr = "0xd466a3c66ad402aa296ab7544bce90bbe298f6a0";
    const priorityFee = parseInt(await callRpc("eth_maxPriorityFeePerGas"), 16);

    const DataDAOFac = await hre.ethers.getContractFactory("DataDAO");
    const DataDAO = await DataDAOFac.connect(signer).deploy(medusaOracleAddr, {
        // maxPriorityFeePerGas to instruct hardhat to use EIP-1559 tx format
        maxPriorityFeePerGas: priorityFee,
    });
    await DataDAO.deployed();

    console.log(
        `DataDAO deployed to ${DataDAO.address}`
    );

    const applicationAddress = DataDAO.address


    const medusa = await MedusaPackage.Medusa.init(medusaAddress, signer);



    const msg = new Uint8Array("Hello World!")
    console.log(medusa);
    const { encryptedData, encryptedKey } = await medusa.encrypt(msg, applicationAddress);
    console.log(`Data encrypted ${encryptedData}`)


    let price = ethers.utils.parseEther("1");
    console.log(`Submiting encrypted data to DataDAO`)


    await medusa.signForKeypair()


    const cid = "bafy2bzacea2t6tjfj3gefjxasg7xqzgpwouwrxfsqxgdsfhftcordnmxcae3y";
    const randomSize = 1;
    const testUrl = "ipfs://testCID"




    const uint8Array = Buffer.from(cid, "hex");

    const tx = await DataDAO.addCID(uint8Array, randomSize, encryptedKey, testUrl, {
        // maxPriorityFeePerGas to instruct hardhat to use EIP-1559 tx format
        maxPriorityFeePerGas: priorityFee
    });


    await provider.waitForTransaction(tx.hash);

    const receipt = await provider.getTransactionReceipt(tx.hash);
    let abi = ["event AddedCID(bytes, uint256)"];
    let iface = new ethers.utils.Interface(abi);

    const logTransactionEvent = receipt.logs.filter((log) => {
        return log.topics[0] === ethers.utils.id("AddedCID(bytes, uint256)");
    });

    let cipherID = '';

    if (logTransactionEvent.length === 0) {
        console.log("Transaction does not contain AddedCID event");
    } else {
        // Decode the log data
        const log = iface.parseLog(logTransactionEvent[0]);
        cipherID = log.args[1];
    }
    let evmPoint = null;

    if (medusa?.keypair) {
        const { x, y } = medusa.keypair.pubkey.toEvm()
        evmPoint = { x, y }
    }

    console.log(`CipherID  ${cipherID}`);

    console.log(evmPoint);

    // Get evm point from the key pair of medusa

    // Create key pair
    // price = await debayContract.itemToPrice(cipherID);
    const requestID = await DataDAO.buyEntry(cipherID, evmPoint, {
        value: price,
        maxPriorityFeePerGas: priorityFee
    });
    console.log(`RequestID ${requestID}`);

}




// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
    process.exit()
});
