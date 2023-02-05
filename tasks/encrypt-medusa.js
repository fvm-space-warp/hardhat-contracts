const { Web3Storage, getFilesFromPath } = require('web3.storage');
const fs = require('node:fs');
const MedusaPackage = require("@medusa-network/medusa-sdk");
const providers = require("@ethersproject/providers");
const ethers = require("ethers");
const { expect } = require("chai");
const hre = require("hardhat");
const util = require("util");
const { execSync } = require('node:child_process')

require("dotenv").config();
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const request = util.promisify(require("request"));

const medusaAddress = "0xb0dd3eb2374b21b6efacf41a16e25ed8114734e0";
const provider = new providers.JsonRpcProvider("https://filecoin-hyperspace.chainstacklabs.com/rpc/v1");
const signer = new ethers.Wallet(PRIVATE_KEY).connect(provider);
const DEPLOYER_PRIVATE_KEY = network.config.accounts[0];
const encryptedFileName = 'tests/helloworld-encrypted.txt';

const deployer = new ethers.Wallet(DEPLOYER_PRIVATE_KEY)

const uploadToIpfs = async (encryptedData) => {
    const storage = new Web3Storage({ token: process.env.STORAGE_TOKEN })
    fs.writeFileSync(encryptedFileName, Buffer.from(encryptedData));
    const cid = await storage.put([{ stream: () => fs.createReadStream(encryptedFileName), name: 'helloworld-encrypted.txt' }]);
    return cid;
}

const submitToDataDao = async (encryptedData, encryptedKey, priorityFee, cid, DataDAO) => {
    const dataSize = encryptedData.length;
    const uri = `ipfs://${cid}/helloworld-encrypted.txt`;

<<<<<<< HEAD
    const uint8Array = Buffer.from(cid, "hex");
    const DataDAO = await hre.ethers.getContractAt("DataDAO", applicationAddress);

    DataDAO.on("AddedCID",async (cidHex,size,uri) => {
      console.log(uri.replace("ipfs://",""));
      const cidEvent = uri.replace("ipfs://","").split("/")[0]
      console.log(`ipfs pin add -r ${cidEvent}`)
      const res = await execSync(`ipfs pin add -r ${cidEvent}`);
      console.log(res.toString())
      console.log(`lotus client deal ${cidEvent} t01129 0 518400`)
      let resLotus = await execSync(`lotus client deal ${cidEvent} t01129 0 518400`);
      console.log(resLotus.toString())
      console.log(`lotus client get-deal ${resLotus.toString()}`)
      const resLotusDeal = await execSync(`lotus client get-deal ${resLotus.toString()}`);
      console.log(JSON.parse(resLotusDeal.toString()).dealId);
      const dealId = JSON.parse(resLotusDeal.toString()).dealId;
      await DataDAO.claim_bounty(dealId,{
          // value: price,
          maxPriorityFeePerGas: priorityFee
      })
      console.log("Bounty claimed hunter!!!")
    })

=======
    const uint8Array = Buffer.from(cid, 'hex');
>>>>>>> 0fed0d7e04bd05a48aa6c9c04914bf581402920e
    const tx = await DataDAO.connect(signer).addCID(uint8Array, dataSize, encryptedKey, uri, {
        // maxPriorityFeePerGas to instruct hardhat to use EIP-1559 tx format
        maxPriorityFeePerGas: priorityFee
    });
    await provider.waitForTransaction(tx.hash);
    const receipt = await provider.getTransactionReceipt(tx.hash);

    let abi = ['event AddedCID(bytes, uint256)'];
    let iface = new ethers.utils.Interface(abi);

    const logTransactionEvent = receipt.logs.filter((log) => {
        return log.topics[0] === ethers.utils.id('AddedCID(bytes,uint256)');
    });

    let cipherID = '';
    if (logTransactionEvent.length === 0) {
        console.log('Transaction does not contain AddedCID event');
    } else {
        // Decode the log data
        const log = iface.parseLog(logTransactionEvent[0]);
        cipherID = log.args[1];
    }

    return cipherID;
}

const requestDecryption = async (cipherID, medusa, priorityFee, DataDAO) => {
    const evmPoint = medusa.keypair.pubkey.toEvm();

    const requestID = await DataDAO.requestDecryption(cipherID, evmPoint, {
        // value: price,
        maxPriorityFeePerGas: priorityFee
    });
    await provider.waitForTransaction(requestID.hash);
<<<<<<< HEAD
    console.log("RequestID", requestID);

=======

    return requestID;
}

const main = async () => {
    console.log(`Wallet Ethereum Address: ${deployer.address}`);
    const priorityFee = (await provider.getFeeData()).maxPriorityFeePerGas;

    const data = fs.readFileSync('./tests/helloworld.txt');
    const msg = new Uint8Array(data);
    const applicationAddress = fs.readFileSync('./constants/contract-address.txt').toString();
    const DataDAO = await hre.ethers.getContractAt("DataDAO", applicationAddress);

    console.log(`Using contract at ${applicationAddress}`);

    const medusa = await MedusaPackage.Medusa.init(medusaAddress, signer);
    await medusa.signForKeypair();

    ///
    /// Encrypt with Medusa
    ///
    const { encryptedData, encryptedKey } = await medusa.encrypt(msg, applicationAddress);
    console.log('encrypted data size', encryptedData.length);

    ///
    /// Upload to IPFS
    ///
    console.log('Upload encrypted file to IPFS');
    const cid = await uploadToIpfs(encryptedData);
    console.log(`Uploaded file to IPFS: ${cid}`);

    ///
    /// Submit key to Medusa
    ///
    console.log('Submitting encrypted data to DataDAO');
    const cipherID = await submitToDataDao(encryptedData, encryptedKey, priorityFee, cid, DataDAO);
    console.log(`CipherID ${cipherID}`);

    ///
    /// Request decryption from Medusa
    ///
    console.log('Requesting decryption key for data');
    const requestID = await requestDecryption(cipherID, medusa, priorityFee, DataDAO);
    console.log('RequestID', requestID);
>>>>>>> 0fed0d7e04bd05a48aa6c9c04914bf581402920e
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
    process.exit()
});
