const { Web3Storage, getFilesFromPath } = require('web3.storage')
const fs = require('node:fs');
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
        url: "https://filecoin-hyperspace.chainstacklabs.com/rpc/v1",
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

    const data = fs.readFileSync('tests/helloworld.txt');
    const msg = new Uint8Array(data);
    console.log('data size', msg.length);

    const DataDAOFac = await hre.ethers.getContractFactory("DataDAO");
    const DataDAO = await DataDAOFac.connect(signer).deploy(medusaAddress, false, [], {
        // maxPriorityFeePerGas to instruct hardhat to use EIP-1559 tx format
        maxPriorityFeePerGas: priorityFee,
    });
    await DataDAO.deployed();

    console.log(
        `DataDAO deployed to ${DataDAO.address}`
    );
    fs.writeFileSync('tests/contract-address.txt', Buffer.from(DataDAO.address));

    const applicationAddress = DataDAO.address

    const medusa = await MedusaPackage.Medusa.init(medusaAddress, signer);
    await medusa.signForKeypair();

    const { encryptedData, encryptedKey } = await medusa.encrypt(msg, applicationAddress);
    console.log('encrypted data size', encryptedData.length);

    console.log('Upload encrypted file to IPFS');
    const storage = new Web3Storage({ token: process.env.STORAGE_TOKEN })
    const encryptedFileName = 'tests/helloworld-encrypted.txt';
    fs.writeFileSync(encryptedFileName, Buffer.from(encryptedData));
    const cid = await storage.put([{ stream: () => fs.createReadStream(encryptedFileName), name: 'helloworld-encrypted.txt' }]);
    console.log(`Uploaded file to IPFS: ${cid}`);

    console.log(`Submitting encrypted data to DataDAO`);
    const randomSize = encryptedData.length;
    const testUrl = `ipfs://${cid}/helloworld-encrypted.txt`;

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
        return log.topics[0] === ethers.utils.id("AddedCID(bytes,uint256)");
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


    const requestID = await DataDAO.requestDecryption(cipherID, evmPoint, {
        // value: price,
        maxPriorityFeePerGas: priorityFee
    });
    await provider.waitForTransaction(requestID.hash);
    console.log("RequestID", requestID);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
    process.exit()
});
