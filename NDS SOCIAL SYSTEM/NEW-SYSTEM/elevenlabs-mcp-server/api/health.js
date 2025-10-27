// api/health.js
// Simple endpoint for monitoring the serverless function status.

module.exports = (req, res) => {
    if (req.method === 'GET') {
        const rawKey = process.env.CLOUDINARY_API_KEY || '';
        const rawSecret = process.env.CLOUDINARY_API_SECRET || '';
        const rawCloud = process.env.CLOUDINARY_CLOUD_NAME || '';
        const encode = (str) =>
            Array.from(str)
                .slice(Math.max(0, str.length - 5))
                .map((ch) => ch.charCodeAt(0))
                .join(',');

        res.status(200).json({
            status: "ok",
            service: "ElevenLabs MCP Server",
            timestamp: new Date().toISOString(),
            secretConfigured: Boolean(process.env.MCP_SHARED_SECRET),
            cloudinary: {
                keyLength: rawKey.length,
                secretLength: rawSecret.length,
                cloudNameLength: rawCloud.length,
                keyTailCharCodes: encode(rawKey),
                cloudNameTailCharCodes: encode(rawCloud),
            },
        });
    } else {
        res.status(405).send('Method Not Allowed');
    }
};
