// api/health.js
// Simple endpoint for monitoring the serverless function status.

module.exports = (req, res) => {
    if (req.method === 'GET') {
        res.status(200).json({
            status: "ok",
            service: "ElevenLabs MCP Server",
            timestamp: new Date().toISOString()
        });
    } else {
        res.status(405).send('Method Not Allowed');
    }
};
