// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IJobEscrow {
    function jobs(uint256 jobId) external view returns (
        address client,
        address freelancer,
        string memory description,
        uint256 amount,
        uint8 status
    );
}

contract SkillNFT is ERC721URIStorage, Ownable {
    uint256 public tokenCounter;
    IERC20 public yodaToken;
    IJobEscrow public jobEscrow;

    mapping(uint256 => uint256) public nftPrices;
    mapping(uint256 => address) public originalMinters;
    mapping(uint256 => uint256) public tokenToJobId;

    event CertificatePurchased(uint256 indexed tokenId, address indexed buyer, address indexed seller);

    constructor(address initialOwner, address _yodaToken) ERC721("SkillCertificate", "SKILL") Ownable(initialOwner) {
        tokenCounter = 0;
        yodaToken = IERC20(_yodaToken);
    }

    function setJobEscrowAddress(address _jobEscrow) public onlyOwner {
        require(_jobEscrow != address(0), "Invalid address");
        jobEscrow = IJobEscrow(_jobEscrow);
    }

    function mintCertificate(
        address recipient,
        string memory tokenURI,
        uint256 price,
        uint256 jobId
    ) public returns (uint256) {
        uint256 newItemId = tokenCounter;
        _mint(recipient, newItemId);
        _setTokenURI(newItemId, tokenURI);
        nftPrices[newItemId] = price;
        originalMinters[newItemId] = recipient;
        tokenToJobId[newItemId] = jobId;
        tokenCounter += 1;
        return newItemId;
    }

    function buyCertificate(uint256 tokenId) public {
        uint256 jobId = tokenToJobId[tokenId];
        (, address freelancer,, , uint8 status) = jobEscrow.jobs(jobId);

        require(msg.sender == freelancer, "Only assigned freelancer can buy NFT");
        require(status == 2, "Job not completed");

        uint256 price = nftPrices[tokenId];
        address seller = ownerOf(tokenId);
        require(msg.sender != seller, "Cannot buy your own NFT");

        uint256 allowance = yodaToken.allowance(msg.sender, address(this));
        require(allowance >= price, "Approve contract to spend YODA first");

        require(yodaToken.transferFrom(msg.sender, seller, price), "YODA transfer failed");

        _transfer(seller, msg.sender, tokenId);
        emit CertificatePurchased(tokenId, msg.sender, seller);
    }

    function updateCertificateURI(uint256 tokenId, string memory newURI) public {
        require(ownerOf(tokenId) == msg.sender, "Only NFT owner can update");
        _setTokenURI(tokenId, newURI);
    }

    function getCertificatePrice(uint256 tokenId) public view returns (uint256) {
        return nftPrices[tokenId];
    }

    function getJobIdOfToken(uint256 tokenId) public view returns (uint256) {
        return tokenToJobId[tokenId];
    }
}
