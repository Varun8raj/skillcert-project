import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import { motion } from 'framer-motion';

const SKILLNFT_ADDRESS = "0x5B08782042E545aFd3C2aa4b219427d7187aD71A";
const JOBESCROW_ADDRESS = "0xE358db0952567F182251e9F75422ca3910cb69fC";
const YODA_ADDRESS = "0xe1d6e2F8F036179656bEb0E2BDb8E326b0E6b094";

const SKILLNFT_ABI = [
  "function mintCertificate(address recipient, string memory tokenURI, uint256 price, uint256 jobId) public returns (uint256)",
  "function buyCertificate(uint256 tokenId) public",
  "function tokenURI(uint256 tokenId) public view returns (string memory)",
  "function getCertificatePrice(uint256 tokenId) public view returns (uint256)",
  "function ownerOf(uint256 tokenId) public view returns (address)",
  "function updateCertificateURI(uint256 tokenId, string memory newURI) public"
];

const JOBESCROW_ABI = [
  "function postJob(string memory description, uint256 amount) public returns (uint256)",
  "function acceptJob(uint256 jobId) public",
  "function completeJob(uint256 jobId) public",
  "function mintCertificateForCompletedJob(uint256 jobId, string memory tokenURI, uint256 price) public returns (uint256)",
  "function jobs(uint256) public view returns (address client, address freelancer, string memory description, uint256 amount, uint8 status)",
  "function jobCounter() public view returns (uint256)"
];

const YODA_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)"
];

const PINATA_JWT = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiI0OWZiNjEwZi00OGNlLTQ2OGEtYTk1OS1iZWRkMTQwN2VhMDkiLCJlbWFpbCI6InZhcnVucmFqLnRlbnVndUBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiOGQ4MGE0YzM2NjJmM2Q3MjgyYTUiLCJzY29wZWRLZXlTZWNyZXQiOiIyNGU3NjA0M2IwY2M5NTFiZGRlMjdmYWY2NTZjODk3ZGEyODNhNmNiNTRiMDFiZmUzNTNiOGQ0ZTU4MDkyOGY3IiwiZXhwIjoxNzc3MDU2ODgyfQ.dRmTtPq2HOovIdejGQKuuFKBU9UqHPrNkOzpBFYLcsE"; 

function App() {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [skillContract, setSkillContract] = useState(null);
  const [escrowContract, setEscrowContract] = useState(null);
  const [yodaContract, setYodaContract] = useState(null);

  const [jobDesc, setJobDesc] = useState("");
  const [jobAmount, setJobAmount] = useState("");
  const [availableJobs, setAvailableJobs] = useState([]);
  const [jobId, setJobId] = useState("");
  const [file, setFile] = useState(null);
  const [nftName, setNftName] = useState("");
  const [nftDesc, setNftDesc] = useState("");
  const [nftPrice, setNftPrice] = useState("");
  const [tokenId, setTokenId] = useState("");
  const [newTokenURI, setNewTokenURI] = useState("");
  const [updateTokenId, setUpdateTokenId] = useState("");
  const [tokenURI, setTokenURI] = useState("");
  const [previewURL, setPreviewURL] = useState("");
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    if (window.ethereum) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      setProvider(provider);
    }
  }, []);

  const connectWallet = async () => {
    try {
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setAccount(address);
      setSkillContract(new ethers.Contract(SKILLNFT_ADDRESS, SKILLNFT_ABI, signer));
      setEscrowContract(new ethers.Contract(JOBESCROW_ADDRESS, JOBESCROW_ABI, signer));
      setYodaContract(new ethers.Contract(YODA_ADDRESS, YODA_ABI, signer));
    } catch (err) {
      setError(err.message);
    }
  };

  const approveYodaForJob = async () => {
    try {
      setLoading(true);
      const amount = ethers.parseUnits(jobAmount, 2);
      const tx = await yodaContract.approve(JOBESCROW_ADDRESS, amount);
      await tx.wait();
      alert("YODA approved for JobEscrow!");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const approveYodaForNFT = async () => {
    const price = await skillContract.getCertificatePrice(tokenId);
    const tx = await yodaContract.approve(SKILLNFT_ADDRESS, price);
    await tx.wait();
    alert("YODA approved for NFT!");
  };

  const postJob = async () => {
    const tx = await escrowContract.postJob(jobDesc, ethers.parseUnits(jobAmount, 2));
    await tx.wait();
    alert("Job posted!");
  };

  const listAvailableJobs = async () => {
    const count = await escrowContract.jobCounter();
    const jobList = [];
    for (let i = 0; i < Number(count); i++) {
      const job = await escrowContract.jobs(i);
      if (Number(job[4]) === 0) {
        jobList.push({
          jobId: i,
          client: job[0],
          freelancer: job[1],
          description: job[2],
          amount: job[3],
          status: job[4]
        });
      }
    }
    setAvailableJobs(jobList);
  };

  const acceptJob = async (jobId) => {
    const tx = await escrowContract.acceptJob(jobId);
    await tx.wait();
    alert("Job accepted!");
    listAvailableJobs();
  };

  const completeJob = async () => {
    const tx = await escrowContract.completeJob(jobId);
    await tx.wait();
    alert("Job completed!");
  };

  const handleFileChange = (e) => setFile(e.target.files[0]);

  const uploadMetadata = async () => {
    try {
      setLoading(true);
      const form = new FormData();
      form.append("file", file);
      const imageRes = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", form, {
        headers: { Authorization: PINATA_JWT, "Content-Type": "multipart/form-data" }
      });
      const imageUrl = `https://gateway.pinata.cloud/ipfs/${imageRes.data.IpfsHash}`;
      setPreviewURL(imageUrl);
      const metadata = { name: nftName, description: nftDesc, image: imageUrl };
      const metaRes = await axios.post("https://api.pinata.cloud/pinning/pinJSONToIPFS", metadata, {
        headers: { Authorization: PINATA_JWT }
      });
      setTokenURI(`https://gateway.pinata.cloud/ipfs/${metaRes.data.IpfsHash}`);
      alert("Metadata uploaded!");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const mintCertificate = async () => {
    const tx = await escrowContract.mintCertificateForCompletedJob(jobId, tokenURI, ethers.parseUnits(nftPrice, 2));
    await tx.wait();
    alert("NFT Minted!");
  };

  const buyCertificate = async () => {
    const tx = await skillContract.buyCertificate(tokenId);
    await tx.wait();
    alert("NFT Purchased!");
  };

  const updateMetadata = async () => {
    const tx = await skillContract.updateCertificateURI(updateTokenId, newTokenURI);
    await tx.wait();
    alert("Metadata Updated!");
  };

  return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} className="min-h-screen bg-gradient-to-tr from-indigo-100 via-white to-purple-100 dark:from-gray-900 dark:via-gray-800 dark:to-black flex items-center justify-center px-4">
        <div className="absolute top-4 right-4">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="px-3 py-2 text-sm font-medium rounded shadow bg-white dark:bg-gray-800 dark:text-white border border-gray-300 dark:border-gray-700"
          >
            Toggle {theme === "dark" ? "Light" : "Dark"} Mode
          </button>
        </div>
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.6, delay: 0.1 }} className="w-full max-w-4xl bg-white dark:bg-gray-900 p-10 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 backdrop-blur-sm">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-indigo-600 text-center tracking-tight mb-8">
            🚀 SkillNFT Job Board
          </h2>
          {!account ? (
      <div className="flex justify-center mb-6">
      <button
        onClick={connectWallet}
        className="bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-700 hover:to-purple-700 text-white px-8 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
      >
        🔗 Connect Wallet
      </button>
    </div>
    
    ) : (
      <p className="text-center text-green-700 font-medium">
        Connected: {account}
      </p>
    )}

        <div className="mt-10 grid gap-10">
          {/* 📌 Post Job */}
          <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 border border-gray-200 dark:border-gray-700"
        >
          <h3 className="text-xl font-semibold mb-4 text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
            📌 Post Job
          </h3>
          <input
            className="border p-2 rounded w-full mb-3 dark:bg-gray-900 dark:border-gray-600 dark:text-white"
            placeholder="Description"
            value={jobDesc}
            onChange={(e) => setJobDesc(e.target.value)}
          />
          <input
            className="border p-2 rounded w-full mb-3 dark:bg-gray-900 dark:border-gray-600 dark:text-white"
            placeholder="YODA Amount"
            value={jobAmount}
            onChange={(e) => setJobAmount(e.target.value)}
          />
          <div className="flex flex-wrap gap-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.05 }}
              onClick={approveYodaForJob}
              className="bg-yellow-400 hover:bg-yellow-500 px-4 py-2 rounded shadow"
            >
              Approve YODA
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.05 }}
              onClick={postJob}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow"
            >
              Post Job
            </motion.button>
          </div>
        </motion.section>


          {/* 🧑‍💻 Available Jobs */}
          <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 border border-gray-200 dark:border-gray-700"
        >
          <h3 className="text-xl font-semibold mb-4 text-indigo-700 dark:text-indigo-300">
            🧑‍💻 Available Jobs
          </h3>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={listAvailableJobs}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow mb-4"
          >
            Show Jobs
          </motion.button>

          <div className="space-y-4">
          {availableJobs.map((job) => (
            <motion.div
              key={job.jobId}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="p-4 border rounded-lg shadow-sm bg-gray-50 dark:bg-gray-900 dark:border-gray-600"
            >
              <p className="text-sm font-medium text-black dark:text-yellow-300">
                <strong>ID:</strong> {job.jobId}
              </p>
              <p className="text-sm font-medium text-black dark:text-yellow-300">
                <strong>Description:</strong> {job.description}
              </p>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => acceptJob(job.jobId)}
                className="mt-2 bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1 rounded shadow"
              >
                Accept
              </motion.button>
            </motion.div>
          ))}
        </div>

        </motion.section>


          {/* ✅ Complete Job */}
          <motion.section
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 border border-gray-200 dark:border-gray-700"
        >
          <h3 className="text-xl font-semibold mb-4 text-indigo-700 dark:text-indigo-300">
            ✅ Complete Job
          </h3>
          <motion.input
            whileFocus={{ scale: 1.02 }}
            type="text"
            className="border p-2 rounded w-full mb-3 dark:bg-gray-900 dark:border-gray-600 dark:text-white"
            placeholder="Job ID"
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
          />
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={completeJob}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded shadow"
          >
            Complete
          </motion.button>
        </motion.section>


          {/* 🎓 Mint Certificate */}
          <motion.section
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 border border-gray-200 dark:border-gray-700"
        >
          <h3 className="text-xl font-semibold mb-4 text-indigo-700 dark:text-indigo-300">
            🎓 Mint Certificate
          </h3>
          <div className="grid gap-3">
            <motion.input
              whileFocus={{ scale: 1.02 }}
              className="border p-2 rounded w-full dark:bg-gray-900 dark:border-gray-600 dark:text-white"
              placeholder="Name"
              value={nftName}
              onChange={(e) => setNftName(e.target.value)}
            />
            <motion.input
              whileFocus={{ scale: 1.02 }}
              className="border p-2 rounded w-full dark:bg-gray-900 dark:border-gray-600 dark:text-white"
              placeholder="Description"
              value={nftDesc}
              onChange={(e) => setNftDesc(e.target.value)}
            />
            <motion.input
              whileFocus={{ scale: 1.02 }}
              className="border p-2 rounded w-full dark:bg-gray-900 dark:border-gray-600 dark:text-white"
              placeholder="Price"
              value={nftPrice}
              onChange={(e) => setNftPrice(e.target.value)}
            />
            <motion.input
              whileFocus={{ scale: 1.02 }}
              className="border p-2 rounded w-full dark:bg-gray-900 dark:border-gray-600 dark:text-white"
              placeholder="Job ID"
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
            />
            <motion.input
              whileHover={{ scale: 1.01 }}
              type="file"
              className="border p-2 rounded w-full dark:bg-gray-900 dark:border-gray-600 dark:text-white"
              onChange={handleFileChange}
            />
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={uploadMetadata}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded shadow"
            >
              Upload Metadata
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={mintCertificate}
              className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded shadow"
            >
              Mint NFT
            </motion.button>
          </div>
        </motion.section>


          {/* 🛒 Buy NFT */}
          <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 border border-gray-200 dark:border-gray-700"
        >
          <h3 className="text-xl font-semibold mb-4 text-indigo-700 dark:text-indigo-300">🛒 Buy NFT</h3>
          <motion.input
            whileFocus={{ scale: 1.02 }}
            className="border p-2 rounded w-full mb-3 dark:bg-gray-900 dark:border-gray-600 dark:text-white"
            placeholder="Token ID"
            value={tokenId}
            onChange={(e) => setTokenId(e.target.value)}
          />
          <div className="flex gap-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={approveYodaForNFT}
              className="bg-yellow-500 hover:bg-yellow-600 px-4 py-2 rounded shadow"
            >
              Approve YODA
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={buyCertificate}
              className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded shadow"
            >
              Buy NFT
            </motion.button>
          </div>
        </motion.section>


          {/* 🛠 Update NFT Metadata */}
          <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 border border-gray-200 dark:border-gray-700"
        >
          <h3 className="text-xl font-semibold mb-4 text-indigo-700 dark:text-indigo-300">🛠 Update NFT Metadata</h3>
          <div className="grid gap-3">
            <motion.input
              whileFocus={{ scale: 1.02 }}
              className="border p-2 rounded w-full dark:bg-gray-900 dark:border-gray-600 dark:text-white"
              placeholder="Token ID"
              value={updateTokenId}
              onChange={(e) => setUpdateTokenId(e.target.value)}
            />
            <motion.input
              whileFocus={{ scale: 1.02 }}
              className="border p-2 rounded w-full dark:bg-gray-900 dark:border-gray-600 dark:text-white"
              placeholder="New URI"
              value={newTokenURI}
              onChange={(e) => setNewTokenURI(e.target.value)}
            />
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={updateMetadata}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded shadow"
            >
              Update Metadata
            </motion.button>
          </div>
        </motion.section>

        </div>
        </motion.div>
      </motion.div>
  );
}

export default App;
