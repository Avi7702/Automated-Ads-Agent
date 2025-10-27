const TWILIO_API_BASE = 'https://api.twilio.com/2010-04-01';

function getTwilioConfig() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;

    if (!accountSid || !authToken || !whatsappNumber) {
        throw new Error('Twilio WhatsApp credentials are not fully configured');
    }

    return { accountSid, authToken, whatsappNumber };
}

function ensureWhatsappPrefix(number) {
    if (!number) {
        throw new Error('Recipient number is required');
    }
    return number.startsWith('whatsapp:') ? number : `whatsapp:${number}`;
}

function buildBasicAuth({ accountSid, authToken }) {
    return Buffer.from(`${accountSid}:${authToken}`).toString('base64');
}

async function sendWhatsappPreview({ to, body, mediaUrl }) {
    const config = getTwilioConfig();
    const endpoint = `${TWILIO_API_BASE}/Accounts/${config.accountSid}/Messages.json`;
    const params = new URLSearchParams();

    params.append('From', ensureWhatsappPrefix(config.whatsappNumber));
    params.append('To', ensureWhatsappPrefix(to));
    if (body) params.append('Body', body);
    if (mediaUrl) params.append('MediaUrl', mediaUrl);

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            Authorization: `Basic ${buildBasicAuth(config)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Twilio send message failed (${response.status}): ${errorBody}`);
    }

    return response.json();
}

async function getWhatsappMessageStatus({ messageSid }) {
    if (!messageSid) {
        throw new Error('getWhatsappMessageStatus requires messageSid');
    }

    const config = getTwilioConfig();
    const endpoint = `${TWILIO_API_BASE}/Accounts/${config.accountSid}/Messages/${messageSid}.json`;

    const response = await fetch(endpoint, {
        headers: {
            Authorization: `Basic ${buildBasicAuth(config)}`,
        },
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Twilio status fetch failed (${response.status}): ${errorBody}`);
    }

    return response.json();
}

module.exports = {
    sendWhatsappPreview,
    getWhatsappMessageStatus,
};
