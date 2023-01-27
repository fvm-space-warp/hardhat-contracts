struct G1Point {
    uint256 x;
    uint256 y;
}

struct DleqProof {
    uint256 f;
    uint256 e;
}
/// A 32-byte encrypted ciphertext that a client submits to Medusa
struct Ciphertext {
    G1Point random;
    uint256 cipher;
    G1Point random2;
    DleqProof dleq;
}

/// Struct that Medusa nodes submits in response to a request
struct ReencryptedCipher {
    G1Point random;
    uint256 cipher;
}

interface IEncryptionOracle {
    /// @notice submit a ciphertext and has been created by the encryptor address.
    /// The ciphertext proof is checked and if correct, will be signalled to Medusa.
    function submitCiphertext(Ciphertext calldata _cipher, address _encryptor) external returns (uint256);
    /// @notice requests the Medusa nodes to reencrypt the ciphertext denoted by _cipherId
    /// to the publickey given.
    function requestReencryption(uint256 _cipherId, G1Point calldata _publickey) external payable returns (uint256);
}

interface IEncryptionClient {
    /// @notice Callback to client contract when medusa posts a result
    /// @dev Implement in client contracts of medusa
    /// @param requestId The id of the original request
    /// @param _cipher the reencryption result
    function oracleResult(uint256 requestId, ReencryptedCipher calldata _cipher) external;
}

error CallbackNotAuthorized();
error ListingDoesNotExist();
error InsufficentFunds();
