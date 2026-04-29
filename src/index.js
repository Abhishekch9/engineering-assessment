const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const path = require('path');
const killPort = require('kill-port');
const { ethers } = require('ethers');

require('dotenv').config();

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 3001;

const checkPort = async (port, maxPort = 65535) => {

    if (port > maxPort) {
        throw new Error("No available ports found");
    }

    try {
        await killPort(port, "tcp");
        await killPort(port, "udp");
        return port;
    } catch (err) {
        return checkPort(port + 1, maxPort);
    }
};

(async () => {
    const safePort = await checkPort(PORT);
    const getPort = (await import('get-port')).default; // dynamic import
    const final_port = await getPort({ port: safePort });

    console.log(`Port ${final_port} is free. Ready to start server.`);

    // Middleware
    app.use(cors({ origin: `http://localhost:${final_port}` }));
    app.use(express.json());
    app.use(morgan('dev'));

    // Routes
    app.use('/api/items', require('./routes/items'));
    app.use('/api/stats', require('./routes/stats'));

    require('./config/dbHandler.js').connect();

    /**
  * @route    GET /api/AbhishekApiTest
  * @desc     Fetches live data from the LINK token contract on Sepolia testnet
  *           including name, symbol, decimals and total supply.
  * @author   Abhishek Chaudhary
  * @access   public
  * @param    {Request}  req  - No params required
  * @param    {Response} res  - Express response object
  * @returns  {JSON}     { name, symbol, decimals, totalSupply, network }
  * @throws   500 on RPC or contract failure
  *
  * @example
  * // Example request
  * curl http://localhost:3001/api/YourNameApiTest
  *
  * // Example response
  * {
  *   "name": "ChainLink Token",
  *   "symbol": "LINK",
  *   "decimals": 18,
  *   "totalSupply": "1,000,000,000.00",
  *   "network": "Sepolia Testnet"
  * }
  */
    app.get('/api/AbhishekApiTest', async (req, res) => {
        try {
            const provider = new ethers.JsonRpcProvider(
                `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
            );

            // Chainlink LINK token — deployed on Sepolia testnet
            const LINK_ADDRESS = '0x779877A7B0D9E8603169DdbD7836e478b4624789';

            const ERC20_ABI = [
                'function name() view returns (string)',
                'function symbol() view returns (string)',
                'function decimals() view returns (uint8)',
                'function totalSupply() view returns (uint256)',
            ];

            const contract = new ethers.Contract(LINK_ADDRESS, ERC20_ABI, provider);

            const [name, symbol, decimals, rawSupply] = await Promise.all([
                contract.name(),
                contract.symbol(),
                contract.decimals(),
                contract.totalSupply(),
            ]);

            const totalSupply = (
                Number(rawSupply) / Math.pow(10, Number(decimals))
            ).toLocaleString('en-US', { maximumFractionDigits: 2 });

            const result = {
                name,
                symbol,
                decimals: Number(decimals),
                totalSupply,
                contractAddress: LINK_ADDRESS,
                network: 'Sepolia Testnet',
                fetchedAt: new Date().toISOString(),
            };

            console.log('\n✅ [AbhishekApiTest] Smart Contract Data Fetched:');
            console.table(result);

            return res.status(200).json(result);

        } catch (error) {
            console.error('❌ [AbhishekApiTest] Error:', error.message);
            return res.status(500).json({
                error: 'Failed to fetch contract data',
                details: error.message,
            });
        }
    });

    // Serve static files in production
    if (process.env.NODE_ENV === 'production') {
        app.use(express.static('client/build'));
        app.get('*', (req, res) => {
            res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
        });
    }

    // Start server
    app.listen(final_port, () => {
        console.log(`Backend running on http://localhost:${final_port}`);
    });
})();