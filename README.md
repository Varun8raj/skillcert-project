# SkillCert – A Decentralized Marketplace for Verified Skill Credentials and Trustless Hiring

SkillCert is a decentralized application (dApp) that streamlines hiring and certification using blockchain-based job escrow and dynamic NFT-powered credentials. It ensures transparent, tamper-proof verification of freelance work and skills using smart contracts and YODA token payments.


## Features

- Post and accept jobs with YODA token escrow
- Complete tasks and mint skill NFTs upon client verification
- NFTs contain verified metadata stored on IPFS
- Freelancers can buy NFTs using YODA tokens
- Dynamic updates to NFT metadata (e.g., GPA, endorsement)
- Toggle between light/dark themes in a modern UI

## How to Run This Project

### Prerequisites

- Node.js & npm installed
- MetaMask browser extension
- Sepolia ETH & YODA test tokens
- Pinata (for IPFS upload, optional JWT config)


###  Steps to Run Frontend

cd skillnft-frontend
npm install
npm start

This will start the frontend locally at http://localhost:3000


Smart contracts were deployed manually via Remix IDE to Sepolia. If needed:

Copy SkillNFT.sol and JobEscrow.sol into Remix

Compile using Solidity ^0.8.x

Deploy to Sepolia using MetaMask wallet

Record deployed addresses and ABIs for frontend integration.


### Notes

This project uses .env to store private keys / Pinata JWT (excluded via .gitignore)

No node_modules/ or sensitive files are committed

All metadata used for minting is uploaded manually to IPFS

Add relevant screenshots or sample certificate previews in the assets/ folder if needed.



