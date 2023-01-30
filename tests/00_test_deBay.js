const MedusaPackage = require("@medusa-network/medusa-sdk")
const providers = require("@ethersproject/providers")
const ethers = require("ethers");
const { expect } = require("chai");
const hre = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
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
const applicationAddress = "0x6eFA7a4c3aeEcE2C7a6ee91C17c5b3e3590c5A7F"
const main = async () => {
  const priorityFee = await callRpc("eth_maxPriorityFeePerGas")

  const medusa = await MedusaPackage.Medusa.init(medusaAddress, signer);



  console.log(medusa);
  // msg is the plaintext message to encrypt as a Uint8Array
  const msg = new Uint8Array("Hello World!")
  const { encryptedData, encryptedKey } = await medusa.encrypt(msg, applicationAddress);
  console.log(`Data encrypted ${encryptedData}`)
  const debayContract = await hre.ethers.getContractAt("DeBay", applicationAddress);
  console.log(`Contract DeBay loaded from ${debayContract.address}`)
  let price = ethers.utils.parseEther("1");
  console.log(`Submiting encrypted data to DeBay`)

  const testUrl = "ipfs://testCID"

  await medusa.signForKeypair()


  const cipherID = await debayContract.submitEntry(encryptedKey, price, testUrl, {
    // maxPriorityFeePerGas to instruct hardhat to use EIP-1559 tx format
    maxPriorityFeePerGas: priorityFee
  });

  let evmPoint = null;
  if (medusa?.keypair) {
    const { x, y } = medusa.keypair.pubkey.toEvm()
    evmPoint = { x, y }
  }

  console.log(`CipherID ${cipherID}`);

  console.log(evmPoint);

  // Get evm point from the key pair of medusa

  // Create key pair
  // price = await debayContract.itemToPrice(cipherID);
  const requestID = await debayContract.buyEntry(cipherID, evmPoint, {
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
