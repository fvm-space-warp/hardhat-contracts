// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import {MarketAPI} from "./lib/filecoin-solidity/contracts/v0.8/MarketAPI.sol";
import {CommonTypes} from "./lib/filecoin-solidity/contracts/v0.8/types/CommonTypes.sol";
import {MarketTypes} from "./lib/filecoin-solidity/contracts/v0.8/types/MarketTypes.sol";
import {Actor, HyperActor} from "./lib/filecoin-solidity/contracts/v0.8/utils/Actor.sol";
import {Misc} from "./lib/filecoin-solidity/contracts/v0.8/utils/Misc.sol";

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/governance/utils/Votes.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "./InterfacesMedusa.sol";

contract DataDAO is ERC20, ERC20Permit, ERC20Votes, IEncryptionClient, Ownable {
    IEncryptionOracle public oracle;

    mapping(bytes => bool) public cidSet;
    mapping(bytes => uint256) public cidSizes;
    mapping(bytes => uint256) cidToCipher;

    mapping(bytes => mapping(uint64 => bool)) public cidProviders;

    mapping(address => mapping(bytes => uint256)) public pendingAccessRequests;

    event EntryDecryption(uint256 indexed requestId, Ciphertext ciphertext);

    event AddedCID(bytes, uint256);

    address public constant CALL_ACTOR_ID = 0xfe00000000000000000000000000000000000005;
    uint64 public constant DEFAULT_FLAG = 0x00000000;
    uint64 public constant METHOD_SEND = 0;

    modifier onlyOracle() {
        if (msg.sender != address(oracle)) {
            revert CallbackNotAuthorized();
        }
        _;
    }

    constructor(IEncryptionOracle _medusaOracle)
        ERC20("DataToken", "DATA")
        ERC20Permit("DataToken")
    {
        oracle = _medusaOracle;
    }

    function fund() external payable {
        // 1 -1 conversion for voting power
        _mint(msg.sender, msg.value);
    }

    // All these CIDS will be for encrypted Files
    function addCID(
        bytes calldata cidraw,
        uint256 size,
        Ciphertext calldata cipher,
        string calldata uri
    ) external onlyOwner {
        uint256 cipherId = oracle.submitCiphertext(cipher, bytes(uri), msg.sender);
        cidToCipher[cidraw] = cipherId;
        cidSet[cidraw] = true;
        cidSizes[cidraw] = size;

        emit AddedCID(cidraw, cipherId);
    }

    // function to check if a provider has already claimed a CID
    function _policyOK(bytes memory cidraw, uint64 provider) internal view returns (bool) {
        bool alreadyStoring = cidProviders[cidraw][provider];
        return !alreadyStoring;
    }

    function requestDecryption(uint256 cipherId, G1Point calldata buyerPublicKey)
        external
        payable
        returns (uint256)
    {
        require(
            ERC20(address(this)).balanceOf(msg.sender) > 0 || msg.value > 1,
            "Not given access"
        );
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
    function claimBounty(uint64 dealId) public {
        MarketTypes.GetDealDataCommitmentReturn memory commitmentRet = MarketAPI
            .getDealDataCommitment(MarketTypes.GetDealDataCommitmentParams({id: dealId}));
        MarketTypes.GetDealProviderReturn memory providerRet = MarketAPI.getDealProvider(
            MarketTypes.GetDealProviderParams({id: dealId})
        );

        _authorizeData(commitmentRet.data, providerRet.provider, commitmentRet.size);

        MarketTypes.GetDealClientReturn memory clientRet = MarketAPI.getDealClient(
            MarketTypes.GetDealClientParams({id: dealId})
        );

        // MarketTypes.GetDealEpochPriceReturn memory pricePerEpoch = MarketAPI.getDealTotalPrice(
        //     MarketTypes.GetDealEpochPriceParams({id: dealId})
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

    function oracleResult(uint256 requestId, Ciphertext calldata cipher) external onlyOracle {
        emit EntryDecryption(requestId, cipher);
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
}
