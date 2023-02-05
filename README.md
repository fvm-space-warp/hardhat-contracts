## FEVM Hardhat Kit

Repository cloned from the FEVM Hardhat Kit


## DataDAO


This repository consist in a standard DataDAO implementation where we have a voting system with ERC20 value, user has the possibility to initialize his DataDAO with a determined list of voting members or let people adquire votes by funding the contract with a 1-1 conversion Filecoin to DataDAO $token


## Medusa

We can encrypt and decrypt with medusa controlling the access control for only the DAO members to be able to see the contents of CID files


## Tasks

We can deploy the DataDAO contract with the following commands:

```
yarn hardhat run tasks/deploy-data-dao.js
```

We can encrypt with task

```
yarn hardhat run tasks/encrypt-medusa.js
```


We can decrypt with task

```
yarn hardhat run tasks/decrypt-medusa.js
```

DaBounty Hunter can claim bounties. It will check "AddedCID" event emited by DataDAO contract in order to pin the ipfs hash locally and then make a deal with lotus client. To run that script the hunter needs to have ipfs and lotus connected to hyperspace running locally

```
yarn hardhat run tasks/claim_bounty.js
```
