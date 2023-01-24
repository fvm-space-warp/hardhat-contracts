// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import {MarketAPI} from "../lib/filecoin-solidity/contracts/v0.8/MarketAPI.sol";
import {CommonTypes} from "../lib/filecoin-solidity/contracts/v0.8/types/CommonTypes.sol";
import {MarketTypes} from "../lib/filecoin-solidity/contracts/v0.8/types/MarketTypes.sol";
import {Actor, HyperActor} from "../lib/filecoin-solidity/contracts/v0.8/utils/Actor.sol";
import {Misc} from "../lib/filecoin-solidity/contracts/v0.8/utils/Misc.sol";

import "@openzeppelin/contracts/governance/utils/Votes.sol";

contract DataDAO {
    mapping(bytes => bool) public cidSet;
    mapping(bytes => uint256) public cidSizes;
    mapping(bytes => mapping(uint64 => bool)) public cidProviders;

    struct Deal {
        bytes32 cid;
        string status;
        uint64 dealId;
    }

    mapping(uint256 => Deal) public deals;

    mapping(address => uint256) public voterPower;

    address public owner;
    address constant CALL_ACTOR_ID = 0xfe00000000000000000000000000000000000005;
    uint64 constant DEFAULT_FLAG = 0x00000000;
    uint64 constant METHOD_SEND = 0;

    constructor() {
        owner = msg.sender;
    }

    function fund(uint64 unused) public payable {}

    function addCID(bytes calldata cidraw, uint256 size) public {
        cidSet[cidraw] = true;
        cidSizes[cidraw] = size;
    }

    // function to check if a provider has already claimed a CID
    function policyOK(bytes memory cidraw, uint64 provider) internal view returns (bool) {
        bool alreadyStoring = cidProviders[cidraw][provider];
        return !alreadyStoring;
    }

    // function to authorize a deal for a CID
    function authorizeData(
        bytes memory cidraw,
        uint64 provider,
        uint256 size
    ) internal {
        require(cidSet[cidraw], "CID must be added before authorizing");
        require(cidSizes[cidraw] == size, "Data size must match expected");
        require(
            policyOK(cidraw, provider),
            "Deal failed policy check: has provider already claimed this CID?"
        );

        cidProviders[cidraw][provider] = true;
    }

    // function to claim a bounty for a deal
    function claimBounty(uint64 deal_id) public {
        MarketTypes.GetDealDataCommitmentReturn memory commitmentRet = MarketAPI
            .getDealDataCommitment(MarketTypes.GetDealDataCommitmentParams({id: deal_id}));
        MarketTypes.GetDealProviderReturn memory providerRet = MarketAPI.getDealProvider(
            MarketTypes.GetDealProviderParams({id: deal_id})
        );

        authorizeData(commitmentRet.data, providerRet.provider, commitmentRet.size);

        MarketTypes.GetDealClientReturn memory clientRet = MarketAPI.getDealClient(
            MarketTypes.GetDealClientParams({id: deal_id})
        );

        // MarketTypes.GetDealEpochPriceReturn memory pricePerEpoch = MarketAPI.getDealTotalPrice(
        //     MarketTypes.GetDealEpochPriceParams({id: deal_id})
        // );

        uint256 reward = 0; // TBD;

        sendReward(clientRet.client, reward);
    }

    function sendReward(uint64 actorID, uint256 reward) internal {
        bytes memory emptyParams = "";
        delete emptyParams;

        HyperActor.call_actor_id(
            METHOD_SEND,
            reward,
            DEFAULT_FLAG,
            Misc.NONE_CODEC,
            emptyParams,
            actorID
        );
    }
}
