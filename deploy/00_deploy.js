require("hardhat-deploy")
require("hardhat-deploy-ethers")

const ethers = require("ethers")
const util = require("util")
const request = util.promisify(require("request"))
const { networkConfig } = require("../helper-hardhat-config")

const DEPLOYER_PRIVATE_KEY = network.config.accounts[0]

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

const deployer = new ethers.Wallet(DEPLOYER_PRIVATE_KEY)

const main = async () => {

    const priorityFee = await callRpc("eth_maxPriorityFeePerGas")

    // Wraps Hardhat's deploy, logging errors to console.
    const deployLogError = async (title, obj) => {
        let ret;
        try {
            ret = await deploy(title, obj);
        } catch (error) {
            console.log(error.toString())
            process.exit(1)
        }
        return ret;
    }

    console.log("Wallet Ethereum Address:", deployer.address)
    const chainId = network.config.chainId
    /*
    const tokenToBeMinted = networkConfig[chainId]["tokenToBeMinted"]

    const SimpleCoin = await hre.ethers.getContractFactory("SimpleCoin");
    const simplecoin = await SimpleCoin.deploy(tokenToBeMinted,{
      maxPriorityFeePerGas: priorityFee
    });
    console.log(`Token at ${simplecoin.address}`)

    const FilecoinMarketConsumer = await hre.ethers.getContractFactory("FilecoinMarketConsumer");
    const marketconsumer = await FilecoinMarketConsumer.deploy({
      maxPriorityFeePerGas: priorityFee
    });
    console.log(`MarketConsumer at ${marketconsumer.address}`)
    */
    const DealRewarder = await hre.ethers.getContractFactory("DealRewarder");
    const dealrewarder = await DealRewarder.deploy({
      maxPriorityFeePerGas: priorityFee
    });
    console.log(`DealRewarder at ${dealrewarder.address}`)

}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
