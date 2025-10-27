const { createClient } = require('@supabase/supabase-js');

let supabase;
function getClient() {
    if (!supabase) {
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_KEY;

        if (!url || !key) {
            throw new Error('Supabase credentials are not configured');
        }

        supabase = createClient(url, key, {
            auth: { persistSession: false },
        });
    }
    return supabase;
}

function handleError(error, context) {
    if (error) {
        throw new Error(`${context} failed: ${error.message}`);
    }
}

function escapeLikeTerm(term = '') {
    return term.replace(/[%_]/g, (match) => `\\${match}`);
}

function pickFields(source = {}, allowed = []) {
    return allowed.reduce((acc, key) => {
        if (Object.prototype.hasOwnProperty.call(source, key) && source[key] !== undefined) {
            acc[key] = source[key];
        }
        return acc;
    }, {});
}

async function queryProducts(options = {}) {
    const { handle, category, search, limit = 5 } = options;
    const client = getClient();
    let query = client.from('products').select('*');

    if (handle) query = query.eq('handle', handle);
    if (category) query = query.eq('category', category);
    if (search) {
        const likeValue = `%${escapeLikeTerm(search)}%`;
        query = query.or(`title.ilike.${likeValue},description.ilike.${likeValue}`);
    }
    if (limit) query = query.limit(limit);

    const { data, error } = await query;
    handleError(error, 'queryProducts');
    return data ?? [];
}

async function createPost(payload = {}) {
    const allowedFields = [
        'product_id',
        'platform',
        'copy',
        'image_url',
        'brand_score',
        'status',
        'post_url',
        'platform_post_id',
        'engagement_metrics',
        'user_feedback',
        'created_by',
        'metadata',
    ];

    const body = pickFields(payload, allowedFields);
    if (Object.keys(body).length === 0) {
        throw new Error('createPost requires at least one post field');
    }
    const client = getClient();
    const { data, error } = await client.from('posts').insert(body).select().single();
    handleError(error, 'createPost');
    return data;
}

async function updatePost(postId, updates = {}) {
    if (!postId) throw new Error('updatePost requires a post_id');
    const client = getClient();
    const sanitizedUpdates = { ...updates };
    delete sanitizedUpdates.post_id;

    if (Object.keys(sanitizedUpdates).length === 0) {
        throw new Error('No update fields provided');
    }

    const { data, error } = await client
        .from('posts')
        .update(sanitizedUpdates)
        .eq('post_id', postId)
        .select()
        .maybeSingle();
    handleError(error, 'updatePost');
    return data;
}

async function getUserPreferences(userPhone) {
    if (!userPhone) throw new Error('getUserPreferences requires user_phone');
    const client = getClient();
    const { data, error } = await client
        .from('user_preferences')
        .select('*')
        .eq('user_phone', userPhone)
        .maybeSingle();
    handleError(error, 'getUserPreferences');
    return data ?? null;
}

async function logWorkflowEvent(payload = {}) {
    const client = getClient();
    const { data, error } = await client.from('workflow_events').insert(payload).select().maybeSingle();
    handleError(error, 'logWorkflowEvent');
    return data ?? null;
}

async function getImageCacheEntry(cacheKey) {
    if (!cacheKey) return null;
    const client = getClient();
    const { data, error } = await client.from('image_cache').select('*').eq('cache_key', cacheKey).maybeSingle();
    if (error) {
        if (error.code === '42P01' || error.message?.includes('image_cache')) {
            console.warn('image_cache table missing; skipping persistent cache lookup.');
            return null;
        }
        handleError(error, 'getImageCacheEntry');
    }
    return data ?? null;
}

async function upsertImageCacheEntry(record = {}) {
    if (!record.cache_key) {
        throw new Error('upsertImageCacheEntry requires cache_key');
    }
    const client = getClient();
    const { data, error } = await client
        .from('image_cache')
        .upsert(record, { onConflict: 'cache_key' })
        .select()
        .maybeSingle();
    if (error) {
        if (error.code === '42P01' || error.message?.includes('image_cache')) {
            console.warn('image_cache table missing; skipping persistent cache write.');
            return null;
        }
        handleError(error, 'upsertImageCacheEntry');
    }
    return data ?? null;
}

async function storeCompetitorPost(payload = {}) {
    const client = getClient();
    const { data, error } = await client.from('competitor_posts').insert(payload).select().single();
    handleError(error, 'storeCompetitorPost');
    return data;
}

async function storeCompetitorInsight(payload = {}) {
    const client = getClient();
    const { data, error } = await client
        .from('competitor_insights')
        .insert(payload)
        .select()
        .single();
    handleError(error, 'storeCompetitorInsight');
    return data;
}

async function fetchCompetitorInsights(filters = {}) {
    const { brand, platform, limit = 5 } = filters;
    const client = getClient();
    let query = client.from('competitor_insights').select('*,competitor_posts(*)').limit(limit);
    if (brand) query = query.eq('competitor_posts.brand', brand);
    if (platform) query = query.eq('competitor_posts.platform', platform);

    const { data, error } = await query;
    handleError(error, 'fetchCompetitorInsights');
    return data ?? [];
}

module.exports = {
    getClient,
    queryProducts,
    createPost,
    updatePost,
    getUserPreferences,
    logWorkflowEvent,
    storeCompetitorPost,
    storeCompetitorInsight,
    fetchCompetitorInsights,
    getImageCacheEntry,
    upsertImageCacheEntry,
};
