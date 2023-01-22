// SPDX-License-Identifier: MIT

pragma solidity ^0.8.13;

import {MarketAPI} from "../lib/filecoin-solidity/contracts/v0.8/MarketAPI.sol";
import {CommonTypes} from "../lib/filecoin-solidity/contracts/v0.8/types/CommonTypes.sol";
import {MarketTypes} from "../lib/filecoin-solidity/contracts/v0.8/types/MarketTypes.sol";
import {Actor, HyperActor} from "../lib/filecoin-solidity/contracts/v0.8/utils/Actor.sol";
import {Misc} from "../lib/filecoin-solidity/contracts/v0.8/utils/Misc.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/contracts/voting/Voting.sol";

contract DataDAO is Voting {
    mapping(bytes => bool) public cidSet;
    mapping(bytes => uint256) public cidSizes;
    mapping(bytes => mapping(address => bool)) public cidProviders;
    mapping(bytes => uint64) public dealIds;
    mapping(address => uint256) public voterPower;
    address public owner;

    constructor() public {
        owner = msg.sender;
    }

    function fund(uint64 unused) public payable {}

    function addCID(bytes calldata cidraw, uint256 size) public {
        require(msg.sender == owner, "Only the owner can add CIDs to the DataDAO");
        cidSet[cidraw] = true;
        cidSizes[cidraw] = size;
    }

    // function to check if a provider has already claimed a CID
    function policyOK(bytes memory cidraw, address provider) internal view returns (bool) {
        bool alreadyStoring = cidProviders[cidraw][provider];
        return !alreadyStoring;
    }

    // function to authorize a deal for a CID
    function authorizeData(
        bytes memory cidraw,
        address provider,
        uint256 size,
        uint64 dealId
    ) public {
        require(cidSet[cidraw], "CID must be added before authorizing");
        require(cidSizes[cidraw] == size, "Data size must match expected");
        require(
            policyOK(cidraw, provider),
            "Deal failed policy check: has provider already claimed this CID?"
        );

        // check if the vote passes
        require(voteFor(cidraw), "CID authorization vote failed");

        cidProviders[cidraw][provider] = true;
        dealIds[cidraw] = dealId;
    }

    // function to claim a bounty for a deal
    function claimBounty(bytes memory cidraw) public {
        require(
            cidProviders[cidraw][msg.sender],
            "Only the provider that has been authorized can claim the bounty"
        );
        require(
            commitmentRet.data == cidraw,
            "Deal data commitment does not match the authorized CID"
        );
        require(
            providerRet.provider == msg.sender,
            "Deal provider does not match the authorized provider"
        );

        // get the total FIL locked for this deal
        uint256 lockedFIL = MarketAPI
            .getDealFunds(MarketTypes.GetDealFundsParams({id: dealId}))
            .funds;

        // calculate the reward for the provider
        uint256 reward = (lockedFIL * 90) / 100; // 90% of the locked FIL goes to the provider

        // send the reward to the provider
        msg.sender.transfer(reward);

        // send the remaining 10% of the locked FIL to the DataDAO
        address(this).transfer(lockedFIL - reward);
    }

    // function to vote for a CID authorization
    function voteFor(bytes memory cidraw) public view returns (bool) {
        // get the total voter power for the vote
        uint256 totalVoterPower = totalVoters();

        // get the voter power of the msg.sender
        uint256 voterPower = voterInfo(msg.sender).voterPower;

        // calculate the threshold for passing the vote
        uint256 voteThreshold = (totalVoterPower * 2) / 3;

        // check if the vote passes
        return voterPower >= voteThreshold;
    }

    // function to add voter power for an address
    function assignVotingPower(uint64 dealId) public {
        // get deal parameters
        MarketTypes.GetDealDataCommitmentReturn memory commitmentRet = MarketAPI
            .getDealDataCommitment(MarketTypes.GetDealDataCommitmentParams({id: dealId}));
        MarketTypes.GetDealProviderReturn memory providerRet = MarketAPI.getDealProvider(
            MarketTypes.GetDealProviderParams({id: dealId})
        );
        MarketTypes.GetDealProposalReturn memory proposalRet = MarketAPI.getDealProposal(
            MarketTypes.GetDealProposalParams({id: dealId})
        );

        // calculate voting power based on deal parameters
        uint256 power = commitmentRet.size * proposalRet.duration;

        // assign voting power to provider
        voterPower[providerRet.provider] += power;
    }
}
