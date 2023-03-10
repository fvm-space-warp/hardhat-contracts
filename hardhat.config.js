require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-chai-matchers");
require("hardhat-deploy")
require("hardhat-deploy-ethers")
require("dotenv").config()

const PRIVATE_KEY = process.env.PRIVATE_KEY
/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.17",
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
  },
  defaultNetwork: "hyperspace",
  networks: {
    hyperspace: {
      chainId: 3141,
      url: "https://filecoin-hyperspace.chainstacklabs.com/rpc/v1",
      accounts: [PRIVATE_KEY],
    },
    arbitrum: {
      chainId: 421613,
      url: "https://endpoints.omniatech.io/v1/arbitrum/goerli/public",
      accounts: [PRIVATE_KEY],
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
}
