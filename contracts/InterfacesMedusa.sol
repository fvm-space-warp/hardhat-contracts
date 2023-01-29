// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

struct G1Point {
    uint256 x;
    uint256 y;
}

struct DleqProof {
    uint256 f;
    uint256 e;
}

/// @notice A 32-byte encrypted ciphertext
struct Ciphertext {
    G1Point random;
    uint256 cipher;
    /// DLEQ part
    G1Point random2;
    DleqProof dleq;
}

interface IEncryptionClient {
    /// @notice Callback to client contract when medusa posts a result
    /// @dev Implement in client contracts of medusa
    /// @param requestId The id of the original request
    /// @param _cipher the reencryption result
    function oracleResult(uint256 requestId, Ciphertext calldata _cipher) external;
}

interface IEncryptionOracle {
    /// @notice submit a ciphertext that can be retrieved at the given link and
    /// has been created by this encryptor address. The ciphertext proof is checked
    /// and if correct, being signalled to Medusa.
    function submitCiphertext(
        Ciphertext calldata _cipher,
        bytes calldata _link,
        address _encryptor
    ) external returns (uint256);

    function requestReencryption(uint256 _cipherId, G1Point calldata _publickey)
        external
        returns (uint256);

    function distributedKey() external view returns (G1Point memory);
}

error CallbackNotAuthorized();
error ListingDoesNotExist();
error InsufficentFunds();
