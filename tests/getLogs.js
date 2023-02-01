async function getAllLogs() {


    const contractAddress = "0xAA30f3bd0D708962EaE59715BbDfD69D642c2A9e";

    const debayContract = await hre.ethers.getContractAt("DeBay", contractAddress);


    console.log("Getting EntryDecryption logs");
    const logs = await debayContract.queryFilter(debayContract.filters.EntryDecryption());
    for (const log of logs) {
        console.log(log);

    }
}

getAllLogs();




