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


const provider = new providers.JsonRpcProvider("https://api.hyperspace.node.glif.io/rpc/v1");
const signer = new ethers.Wallet(PRIVATE_KEY).connect(provider);
const dealAddr = "0xD7fEDe8EC27C0eee1670e58A2321ee03EaC8F3F6";
const cid = "bafy2bzacea2t6tjfj3gefjxasg7xqzgpwouwrxfsqxgdsfhftcordnmxcae3y";
const dealId = "2"
const main = async () => {

  const priorityFee = await callRpc("eth_maxPriorityFeePerGas")

  const dealRewarder = await hre.ethers.getContractAt("DealRewarder", dealAddr);

  await dealRewarder.addCID(new Uint8Array(cid),10,{
    maxPriorityFeePerGas: priorityFee
  })
  console.log("CID added");
  await dealRewarder.claim_bounty(dealId,{
    maxPriorityFeePerGas: priorityFee
  });
  console.log("Bounty Claimed");
}




// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
  process.exit()
});
