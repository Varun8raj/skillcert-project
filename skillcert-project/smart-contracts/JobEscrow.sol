// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ISkillNFT {
    function mintCertificate(address recipient, string memory tokenURI, uint256 price, uint256 jobId) external returns (uint256);
}

contract JobEscrow is Ownable {
    IERC20 public yodaToken;
    ISkillNFT public skillNFT;

    uint256 public jobCounter;

    enum JobStatus { Posted, Accepted, Completed, Cancelled }

    struct Job {
        address client;
        address freelancer;
        string description;
        uint256 amount;
        JobStatus status;
    }

    mapping(uint256 => Job) public jobs;
    mapping(uint256 => uint256) public jobToTokenId;

    event JobPosted(uint256 indexed jobId, address indexed client, uint256 amount, string description);
    event JobAccepted(uint256 indexed jobId, address indexed freelancer);
    event JobCompleted(uint256 indexed jobId);
    event JobCancelled(uint256 indexed jobId);
    event NFTMinted(uint256 indexed jobId, uint256 tokenId);

    constructor(address _yodaToken, address _skillNFT, address _initialOwner) Ownable(_initialOwner) {
        yodaToken = IERC20(_yodaToken);
        skillNFT = ISkillNFT(_skillNFT);
    }

    function postJob(string memory description, uint256 amount) external returns (uint256) {
        require(amount > 0, "Amount must be greater than 0");
        require(yodaToken.allowance(msg.sender, address(this)) >= amount, "Approve tokens first");
        require(yodaToken.transferFrom(msg.sender, address(this), amount), "Token transfer failed");

        jobs[jobCounter] = Job({
            client: msg.sender,
            freelancer: address(0),
            description: description,
            amount: amount,
            status: JobStatus.Posted
        });

        emit JobPosted(jobCounter, msg.sender, amount, description);
        jobCounter++;
        return jobCounter - 1;
    }

    function acceptJob(uint256 jobId) external {
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.Posted, "Job not available");
        require(msg.sender != job.client, "Client cannot accept own job");

        job.freelancer = msg.sender;
        job.status = JobStatus.Accepted;

        emit JobAccepted(jobId, msg.sender);
    }

    function completeJob(uint256 jobId) external {
        Job storage job = jobs[jobId];
        require(msg.sender == job.client, "Only client can complete");
        require(job.status == JobStatus.Accepted, "Job not accepted");

        job.status = JobStatus.Completed;
        require(yodaToken.transfer(job.freelancer, job.amount), "YODA payout failed");

        emit JobCompleted(jobId);
    }

    function mintCertificateForCompletedJob(
        uint256 jobId,
        string memory tokenURI,
        uint256 price
    ) external returns (uint256) {
        Job memory job = jobs[jobId];
        require(msg.sender == job.client, "Only client can mint");
        require(job.status == JobStatus.Completed, "Job not completed");
        require(jobToTokenId[jobId] == 0, "Certificate already minted");

        uint256 tokenId = skillNFT.mintCertificate(msg.sender, tokenURI, price, jobId);
        jobToTokenId[jobId] = tokenId;

        emit NFTMinted(jobId, tokenId);
        return tokenId;
    }

    function cancelJob(uint256 jobId) external {
        Job storage job = jobs[jobId];
        require(msg.sender == job.client, "Only client can cancel");
        require(job.status == JobStatus.Posted, "Job cannot be cancelled");

        job.status = JobStatus.Cancelled;
        require(yodaToken.transfer(job.client, job.amount), "Refund failed");

        emit JobCancelled(jobId);
    }
}
