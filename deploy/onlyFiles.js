const hre = require("hardhat");
const ethers = require("ethers")
const util = require("util")
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


const DEPLOYER_PRIVATE_KEY = network.config.accounts[0]

const deployer = new ethers.Wallet(DEPLOYER_PRIVATE_KEY)

async function main() {

  console.log("Wallet Ethereum Address:", deployer.address)
  // Hyperspace
  const medusaOracleAddr = "0xf1d5A4481F44fe0818b6E7Ef4A60c0c9b29E3118";
  const priorityFee = await callRpc("eth_maxPriorityFeePerGas")

  const onlyFIlesFac = await hre.ethers.getContractFactory("OnlyFiles");
  const onlyFiles = await onlyFIlesFac.deploy(medusaOracleAddr, {
    // maxPriorityFeePerGas to instruct hardhat to use EIP-1559 tx format
    maxPriorityFeePerGas: priorityFee,
  });
  await onlyFiles.deployed();

  console.log(
    `DeBay deployed to ${onlyFiles.address}`
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
