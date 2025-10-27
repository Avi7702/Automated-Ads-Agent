// api/mcp.js - Vercel Serverless Entry Point

const { json } = require('micro');
const { handleMCP } = require('../src/handler');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({
            jsonrpc: '2.0',
            error: { code: -32601, message: 'Method not allowed. Only POST is supported.' },
            id: null,
        });
    }

    const authHeader = req.headers.authorization;
    const sharedSecret = (process.env.MCP_SHARED_SECRET || '').trim();

    if (!sharedSecret) {
        console.error('MCP_SHARED_SECRET is not configured');
        return res.status(500).json({
            jsonrpc: '2.0',
            error: { code: -32603, message: 'Server misconfiguration: missing shared secret.' },
            id: null,
        });
    }

    const incomingSecret = authHeader?.replace(/^Bearer\s+/i, '').trim();

    if (!incomingSecret || incomingSecret !== sharedSecret) {
        return res.status(401).json({
            jsonrpc: '2.0',
            error: { code: -32000, message: 'Unauthorized: Invalid or missing Bearer token.' },
            id: null,
        });
    }

    let payload;
    try {
        payload = await json(req);
    } catch (e) {
        return res.status(400).json({
            jsonrpc: '2.0',
            error: { code: -32700, message: 'Parse Error: Invalid JSON was received by the server.' },
            id: null,
        });
    }

    const mcpResponse = await handleMCP(payload);
    res.status(200).json(mcpResponse);
};
