const { getClient } = require('./supabase');

let cachedSecrets = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function fetchSecrets() {
    const now = Date.now();
    if (cachedSecrets && cacheExpiresAt > now) {
        return cachedSecrets;
    }

    const client = getClient();
    const { data, error } = await client.from('mcp_secrets').select('key,value');

    if (error) {
        throw new Error(`fetchSecrets failed: ${error.message}`);
    }

    const map = {};
    for (const row of data ?? []) {
        if (row?.key) {
            map[row.key.toUpperCase()] = row.value ?? '';
        }
    }

    cachedSecrets = map;
    cacheExpiresAt = now + CACHE_TTL_MS;
    return cachedSecrets;
}

async function getSecret(key) {
    if (!key) return undefined;
    const secrets = await fetchSecrets();
    return secrets[key.toUpperCase()];
}

async function getSecrets(keys = []) {
    const secrets = await fetchSecrets();
    return keys.reduce((acc, key) => {
        acc[key] = secrets[key.toUpperCase()];
        return acc;
    }, {});
}

function clearSecretCache() {
    cachedSecrets = null;
    cacheExpiresAt = 0;
}

module.exports = {
    getSecret,
    getSecrets,
    clearSecretCache,
};
