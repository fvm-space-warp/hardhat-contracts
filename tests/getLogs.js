const hre = require("hardhat");
const providers = require("@ethersproject/providers")
const MedusaPackage = require("@medusa-network/medusa-sdk")
require("dotenv").config();




async function getAllLogs() {

    const provider = new providers.JsonRpcProvider("https://filecoin-hyperspace.chainstacklabs.com/rpc/v1");
    // const signer = new ethers.Wallet(PRIVATE_KEY).connect(provider);


    const PRIVATE_KEY = process.env.PRIVATE_KEY

    const signer = new ethers.Wallet(PRIVATE_KEY).connect(provider);

    const contractAddress = "0xf64e2FBfFaA321b9a45E114213f942d07d04eAd3";
    const medusaOracleAddr = "0xb0dd3eb2374b21b6efacf41a16e25ed8114734e0";

    const debayContract = await hre.ethers.getContractAt("DataDAO", contractAddress);
    const medusa = await MedusaPackage.Medusa.init(medusaOracleAddr, signer);


    const encryptedData = new Uint8Array([193, 82, 47, 98, 38, 206, 240, 42, 238, 154, 103, 142, 202, 78, 75, 94, 156, 34, 94, 93, 140, 200, 169, 130, 196, 218, 90, 146, 138, 15, 5, 76, 252, 133, 116, 30, 62, 250, 54, 55])


    console.log("encryptedData", encryptedData)
    console.log("Getting EntryDecryption logs");
    const logs = await debayContract.connect(signer).queryFilter(debayContract.filters.EntryDecryption(), -1000);

    const cipherText = logs[0].args.ciphertext
    console.log("cipherText", cipherText)

    const decryptedBytes = await medusa.decrypt(cipherText, encryptedData)

    console.log("decryptedBytes", decryptedBytes)
    const msg = new TextDecoder().decode(decryptedBytes)

    console.log("msg", msg);




}

getAllLogs();




