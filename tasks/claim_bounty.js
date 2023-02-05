const { Web3Storage, getFilesFromPath } = require('web3.storage')
const fs = require('node:fs');
const MedusaPackage = require("@medusa-network/medusa-sdk")
const providers = require("@ethersproject/providers")
const ethers = require("ethers");
const { expect } = require("chai");
const hre = require("hardhat");
const util = require("util");
const { execSync } = require('node:child_process')

require("dotenv").config();
const PRIVATE_KEY = process.env.PRIVATE_KEY

const request = util.promisify(require("request"))

const medusaAddress = "0xb0dd3eb2374b21b6efacf41a16e25ed8114734e0";
const provider = new providers.JsonRpcProvider("https://filecoin-hyperspace.chainstacklabs.com/rpc/v1");
const signer = new ethers.Wallet(PRIVATE_KEY).connect(provider);

const DEPLOYER_PRIVATE_KEY = network.config.accounts[0]

const deployer = new ethers.Wallet(DEPLOYER_PRIVATE_KEY)


const main = async () => {
    console.log("Wallet Ethereum Address:", deployer.address)
    // Hyperspace
    const priorityFee = (await provider.getFeeData()).maxPriorityFeePerGas;

    const data = fs.readFileSync('./tests/helloworld.txt');
    const msg = new Uint8Array(data);
    const applicationAddress = fs.readFileSync('./constants/contract-address.txt').toString();

    console.log(`Using contract at ${applicationAddress}`);

    const medusa = await MedusaPackage.Medusa.init(medusaAddress, signer);
    await medusa.signForKeypair();

    const { encryptedData, encryptedKey } = await medusa.encrypt(msg, applicationAddress);
    console.log('encrypted data size', encryptedData.length);

    console.log('Upload encrypted file to IPFS');
    console.log(`ipfs add --cid-version 1 -r tests/hello.txt`)
    const res = await execSync(`ipfs add -r tests/hello.txt`);
    const cid = res.toString().split(" ")[1];
    console.log(`Uploaded file to IPFS: ${cid}`);

    console.log(`Submitting encrypted data to DataDAO`);
    const dataSize = encryptedData.length;
    const uri = `ipfs://${cid}`;

    const uint8Array = Buffer.from(cid, "hex");
    const DataDAO = await hre.ethers.getContractAt("DataDAO", applicationAddress);

    DataDAO.on("AddedCID",async (cidHex,size,uri) => {
      try{
        console.log(`Bounty Hunter saw cid ${uri.replace("ipfs://","")}, he will hunt that DataDAO bounty!!!!!!!`);
        const cidEvent = uri.replace("ipfs://","").split("/")[0]
        console.log(`ipfs pin add -r ${cidEvent}`)
        const res = await execSync(`ipfs pin add -r ${cidEvent}`);
        console.log(res.toString())
        console.log(`lotus client deal ${cidEvent} t01129 0 518400`)
        let resLotus = await execSync(`lotus client deal ${cidEvent} t01129 0 518400`);
        console.log(`Waiting 8 minutes to be able to get dealId of message ${resLotus.toString()}`);

        setTimeout(async () =>  {
          console.log(`lotus client get-deal ${resLotus.toString()}`)
          const resLotusDeal = await execSync(`lotus client get-deal ${resLotus.toString()}`);
          console.log(JSON.parse(resLotusDeal.toString()));
          const dealId = JSON.parse(resLotusDeal.toString())['DealInfo: '].DealID;
          console.log(`DealID: ${dealId}`)
          await DataDAO.claimBounty(dealId,{
              maxPriorityFeePerGas: priorityFee
          })
          console.log("Bounty claimed hunter!")
        },480000);
      } catch(err){
        console.log(err)
      }
    })

    const tx = await DataDAO.connect(signer).addCID(uint8Array, dataSize, encryptedKey, uri, {
        // maxPriorityFeePerGas to instruct hardhat to use EIP-1559 tx format
        maxPriorityFeePerGas: priorityFee
    });

    await provider.waitForTransaction(tx.hash);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
    process.exit()
});
