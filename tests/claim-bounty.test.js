const MedusaPackage = require("@medusa-network/medusa-sdk")

const providers = require("@ethersproject/providers")
const ethers = require("ethers");
const hre = require("hardhat");
const util = require("util");
const CID = require('cids')

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
const DEPLOYER_PRIVATE_KEY = network.config.accounts[0]

const deployer = new ethers.Wallet(DEPLOYER_PRIVATE_KEY)


const main = async () => {



    console.log("Wallet Ethereum Address:", deployer.address)
    // Hyperspace
    const medusaOracleAddr = "0xd466a3c66ad402aa296ab7544bce90bbe298f6a0";
    const priorityFee = await callRpc("eth_maxPriorityFeePerGas")


    const DataDAOFac = await hre.ethers.getContractFactory("DataDAO");
    const DataDAO = await DataDAOFac.connect(signer).deploy(medusaOracleAddr, {
        // maxPriorityFeePerGas to instruct hardhat to use EIP-1559 tx format
        maxPriorityFeePerGas: priorityFee,
    });
    await DataDAO.deployed();


    const medusa = await MedusaPackage.Medusa.init(medusaAddress, signer);


    const { encryptedData, encryptedKey } = await medusa.encrypt(msg, applicationAddress);



    const cid = "bafy2bzacea2t6tjfj3gefjxasg7xqzgpwouwrxfsqxgdsfhftcordnmxcae3y";
    const cidHexRaw = new CID(cid).toString('base16').substring(1)
    const cidHex = "0x00" + cidHexRaw
    const randomSize = 1;
    const testUrl = "ipfs://testCID"


    const dealId = "1"

    const tx = await DataDAO.addCID(cidHex, randomSize, encryptedKey, testUrl, {
        // maxPriorityFeePerGas to instruct hardhat to use EIP-1559 tx format
        maxPriorityFeePerGas: priorityFee
    });

    await provider.waitForTransaction(tx.hash);



    console.log("CID added");
    await DataDAO.claim_bounty(dealId, {
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
