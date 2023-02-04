const fs = require('node:fs');
const hre = require("hardhat");
const providers = require("@ethersproject/providers")
const MedusaPackage = require("@medusa-network/medusa-sdk")
require("dotenv").config();

async function getAllLogs() {
    const contractAddress = fs.readFileSync('./constants/contract-address.txt').toString();
    const medusaOracleAddr = "0xb0dd3eb2374b21b6efacf41a16e25ed8114734e0";

    const provider = new providers.JsonRpcProvider("https://filecoin-hyperspace.chainstacklabs.com/rpc/v1");
    const PRIVATE_KEY = process.env.PRIVATE_KEY
    const signer = new ethers.Wallet(PRIVATE_KEY).connect(provider);

    console.log(`Using contract at ${contractAddress}`);
    console.log("Getting EntryDecryption logs");
    const debayContract = await hre.ethers.getContractAt("DataDAO", contractAddress);
    const logs = await debayContract.connect(signer).queryFilter(debayContract.filters.EntryDecryption(), -1000);

    if (logs.length === 0) {
        console.error('No logs found!');
        return;
    }

    const medusa = await MedusaPackage.Medusa.init(medusaOracleAddr, signer);
    await medusa.signForKeypair();

    const data = fs.readFileSync('./tests/helloworld-encrypted.txt');
    const encryptedData = new Uint8Array(data);
    console.log("encrypted data size", encryptedData.length);

    const cipherText = logs[0].args.ciphertext

    const decryptedBytes = await medusa.decrypt(cipherText, encryptedData)

    console.log('decrypted data size', decryptedBytes.length);
    const msg = new TextDecoder().decode(decryptedBytes)

    console.log("msg", msg);
}

getAllLogs();




