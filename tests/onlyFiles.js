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
    url: "https://endpoints.omniatech.io/v1/arbitrum/goerli/public",
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

const medusaAddress = "0xf1d5A4481F44fe0818b6E7Ef4A60c0c9b29E3118";
const provider = new providers.JsonRpcProvider("https://endpoints.omniatech.io/v1/arbitrum/goerli/public");
const signer = new ethers.Wallet(PRIVATE_KEY).connect(provider);
// applicationAddress is the dApp contract address for which you are encrypting.
const applicationAddress = "0x7481bFDe9F3f4E9a569399175e61F58B6F0F29BE"
const main = async () => {
  const priorityFee = await callRpc("eth_maxPriorityFeePerGas")

  const medusa = await MedusaPackage.Medusa.init(medusaAddress, signer);


  // msg is the plaintext message to encrypt as a Uint8Array
  // const msg = new Uint8Array("Hello World!")

  const buff = new TextEncoder().encode("Hello World")

  await medusa.fetchPublicKey()

  const { encryptedData, encryptedKey } = await medusa.encrypt(buff, applicationAddress);
  console.log(`Data encrypted ${encryptedData}`)

  console.log(`Encrypted cypher KEy ${encryptedKey}`)

  const debayContract = await hre.ethers.getContractAt("Debay", applicationAddress);
  console.log(`Contract DeBay loaded from ${debayContract.address}`)
  let price = ethers.utils.parseEther("1");
  console.log(`Submiting encrypted data to DeBay`)
  const cipherID = await debayContract.createListing(encryptedKey, price, "ipfs://test");
  console.log(`CipherID ${cipherID}`);
  const { private, public } = await medusa.generateKeypair();
  price = await debayContract.itemToPrice(cipherId);
  const requestID = await debayContract.buyEntry(cipherID, public.toEvm(), {
    value: price,
    maxPriorityFeePerGas: priorityFee
  });
  console.log(`RequestID ${requestId}`);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
  process.exit()
});
