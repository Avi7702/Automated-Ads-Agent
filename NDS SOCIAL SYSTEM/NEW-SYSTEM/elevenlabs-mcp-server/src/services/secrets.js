const RAW_SUPABASE_URL =
    process.env.SUPABASE_URL || 'https://fecelxcsybawzgphekyq.supabase.co';
const RAW_SUPABASE_SERVICE_KEY =
    process.env.SUPABASE_SERVICE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlY2VleGNzeWJhd3pncGhla3lxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDk1NDMwNSwiZXhwIjoyMDc2NTMwMzA1fQ.fWGtAiBcHIWDamaaPkBdOaBGLpPItkeRgTZTu3C_KrQ';

function clean(value) {
    return value
        ? value
              .replace(/^[\s"'`]+/, '')
              .replace(/[\s"'`]+$/, '')
              .replace(/\r/g, '')
              .replace(/\n/g, '')
        : value;
}

const supabaseUrl = clean(RAW_SUPABASE_URL);
const supabaseServiceKey = clean(RAW_SUPABASE_SERVICE_KEY);

if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase URL or Service Key missing for secrets loader.');
}

console.log('[secrets-loader]', {
    supabaseUrl,
    supabaseServiceKeyLength: supabaseServiceKey.length,
    supabaseServiceKeyTail: supabaseServiceKey.slice(-4),
});

let cachedSecrets = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function fetchSecrets() {
    const now = Date.now();
    if (cachedSecrets && cacheExpiresAt > now) {
        return cachedSecrets;
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/mcp_secrets?select=key,value`, {
        headers: {
            apikey: supabaseServiceKey,
            Authorization: `Bearer ${supabaseServiceKey}`,
        },
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`fetchSecrets failed: ${response.status} ${body}`);
    }

    const data = await response.json();

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
