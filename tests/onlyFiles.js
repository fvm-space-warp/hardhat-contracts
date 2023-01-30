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
const applicationAddress = "0x8AE40B519dF44AA7BabE48971976e07eD1a8183a"
const main = async () => {
  const priorityFee = await callRpc("eth_maxPriorityFeePerGas")

  const medusa = await MedusaPackage.Medusa.init(medusaAddress, signer);


  // msg is the plaintext message to encrypt as a Uint8Array
  // const msg = new Uint8Array("Hello World!")

  const buff = new TextEncoder().encode("Hello World")




  const { encryptedData, encryptedKey } = await medusa.encrypt(buff, applicationAddress);
  console.log(`Data encrypted ${encryptedData}`)

  console.log(`Encrypted cypher KEy ${encryptedKey}`)

  const debayContract = await hre.ethers.getContractAt("OnlyFiles", applicationAddress);
  console.log(`Contract DeBay loaded from ${debayContract.address}`)
  let price = ethers.utils.parseEther("1");
  console.log(`Submiting encrypted data to DeBay`)

  await medusa.signForKeypair()



  const cipherID = await debayContract.createListing(encryptedKey, "test", "test", price, "ipfs://test");

  console.log(`CipherID ${cipherID}`);



  let evmPoint = null;
  if (medusa?.keypair) {
    const { x, y } = medusa.keypair.pubkey.toEvm()
    evmPoint = { x, y }
  }


  console.log(evmPoint);
  console.log(`CipherID ${cipherID}`);
  const requestID = await debayContract.buyListing(cipherID, evmPoint, {
    value: 1,
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
