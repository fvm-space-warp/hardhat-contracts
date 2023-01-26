// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import {MarketAPI} from "../lib/filecoin-solidity/contracts/v0.8/MarketAPI.sol";
import {CommonTypes} from "../lib/filecoin-solidity/contracts/v0.8/types/CommonTypes.sol";
import {MarketTypes} from "../lib/filecoin-solidity/contracts/v0.8/types/MarketTypes.sol";
import {Actor, HyperActor} from "../lib/filecoin-solidity/contracts/v0.8/utils/Actor.sol";
import {Misc} from "../lib/filecoin-solidity/contracts/v0.8/utils/Misc.sol";

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/governance/utils/Votes.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import {IEncryptionOracle, IEncryptionClient} from "../lib/medusa/EncryptionOracle.sol";

contract DataDAO is ERC20, ERC20Permit, ERC20Votes, IEncryptionClient, Ownable {
    IEncryptionOracle public medusaOracle;

    mapping(bytes => bool) public cidSet;
    mapping(bytes => uint256) public cidSizes;
    mapping(bytes => mapping(uint64 => bool)) public cidProviders;

    mapping(address => mapping(bytes => uint256)) public pendingAccessRequests;

    mapping(uint256 => uint256) public cipherIdAccess;

    event EntryDecryption(uint256 indexed requestId, Ciphertext ciphertext);

    struct Deal {
        bytes32 cid;
        string status;
        uint64 dealId;
    }

    mapping(uint256 => Deal) public deals;

    mapping(address => uint256) public voterPower;

    mapping(bytes => mapping(address => bool)) public cipherIdAccess;

    address public owner;
    address public constant CALL_ACTOR_ID = 0xfe00000000000000000000000000000000000005;
    uint64 public constant DEFAULT_FLAG = 0x00000000;
    uint64 public constant METHOD_SEND = 0;

    constructor(IEncryptionOracle _medusaOracle)
        ERC20("DataToken", "DATA")
        ERC20Permit("DataToken")
    {
        medusaOracle = _medusaOracle;
    }

    function fund() external payable {
        // 1 -1 conversion for voting power
        _mint(msg.sender, msg.value);
    }

    function addCID(bytes calldata cidraw, uint256 size) external onlyOwner {
        cidSet[cidraw] = true;
        cidSizes[cidraw] = size;
    }

    // function to check if a provider has already claimed a CID
    function _policyOK(bytes memory cidraw, uint64 provider) internal view returns (bool) {
        bool alreadyStoring = cidProviders[cidraw][provider];
        return !alreadyStoring;
    }

    // These cipherIds are the encryptions of specific messages, we need a way to get the relationship
    // Between cipherIds and CIDS

    function grantAccess(address _address, uint256 cipherId) external onlyOwner {
        cipherIdAccess[cipherId][_address] = true;
    }

    function revokeAccess(address _address, uint256 cipherId) external onlyOwner {
        cipherIdAccess[cipherId][_address] = false;
    }

    function decryptmessage(uint256 cipherId, G1Point calldata buyerPublicKey)
        external
        payable
        returns (uint256)
    {
        require(cipherIdAccess[cipherId][msg.sender], "Not given access");
        uint256 requestId = oracle.requestReencryption(cipherId, buyerPublicKey);
        return requestId;
    }

    // function to authorize a deal for a CID
    function _authorizeData(
        bytes memory cidraw,
        uint64 provider,
        uint256 size
    ) internal {
        require(cidSet[cidraw], "CID must be added before authorizing");
        require(cidSizes[cidraw] == size, "Data size must match expected");
        require(
            _policyOK(cidraw, provider),
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

        _authorizeData(commitmentRet.data, providerRet.provider, commitmentRet.size);

        MarketTypes.GetDealClientReturn memory clientRet = MarketAPI.getDealClient(
            MarketTypes.GetDealClientParams({id: deal_id})
        );

        // MarketTypes.GetDealEpochPriceReturn memory pricePerEpoch = MarketAPI.getDealTotalPrice(
        //     MarketTypes.GetDealEpochPriceParams({id: deal_id})
        // );

        uint256 reward = 1; // TBD  if there is a way to get the price per epoch and the amount of epochs

        _sendReward(clientRet.client, reward);
    }

    function _sendReward(uint64 actorID, uint256 reward) internal {
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

    // The functions below are overrides required by Solidity for Governor implementation

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20, ERC20Votes) {
        super._afterTokenTransfer(from, to, amount);
    }

    function _mint(address to, uint256 amount) internal override(ERC20, ERC20Votes) {
        super._mint(to, amount);
    }

    function _burn(address account, uint256 amount) internal override(ERC20, ERC20Votes) {
        super._burn(account, amount);
    }

    function oracleResult(uint256 requestId, Ciphertext calldata cipher) external onlyOracle {
        emit EntryDecryption(requestId, cipher);
    }
}
