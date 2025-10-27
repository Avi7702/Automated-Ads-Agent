const crypto = require('crypto');
const { getImageCacheEntry, upsertImageCacheEntry } = require('./supabase');
const { getSecrets, getSecret } = require('./secrets');
const { getFromMemory, setInMemory, withInFlight } = require('../lib/cache');
const { fetchWithRetry, DEFAULT_TIMEOUT_MS } = require('../lib/fetch');
const { ProviderError, isProviderError } = require('../lib/errors');
const { logEvent } = require('../lib/logger');

const OPENAI_IMAGE_URL = 'https://api.openai.com/v1/images/generations';
const POLLINATIONS_BASE_URL = 'https://image.pollinations.ai/prompt/';
const DEFAULT_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

function cleanSecret(value) {
    if (!value) return value;
    return value
        .replace(/^[\s"'`]+/, '') // leading whitespace or quotes
        .replace(/[\s"'`]+$/, '') // trailing whitespace or quotes
        .replace(/\r/g, '')
        .replace(/\n/g, '');
}

async function getCloudinaryConfig() {
    const secretMap = await getSecrets([
        'CLOUDINARY_CLOUD_NAME',
        'CLOUDINARY_API_KEY',
        'CLOUDINARY_API_SECRET',
    ]);

    if (!secretMap.CLOUDINARY_CLOUD_NAME || !secretMap.CLOUDINARY_API_KEY || !secretMap.CLOUDINARY_API_SECRET) {
        throw new ProviderError('Cloudinary secrets are missing in Supabase (mcp_secrets)', {
            code: 'missing_credentials',
            provider: 'cloudinary',
        });
    }

    const cloudName = cleanSecret(secretMap.CLOUDINARY_CLOUD_NAME);
    const apiKey = cleanSecret(secretMap.CLOUDINARY_API_KEY);
    const apiSecret = cleanSecret(secretMap.CLOUDINARY_API_SECRET);

    if (!cloudName || !apiKey || !apiSecret) {
        throw new ProviderError('Cloudinary credentials are not fully configured', {
            code: 'missing_credentials',
            provider: 'cloudinary',
        });
    }

    return { cloudName, apiKey, apiSecret };
}

async function getOpenAIKey() {
    const key = await getSecret('OPENAI_API_KEY');
    return cleanSecret(key ?? process.env.OPENAI_API_KEY);
}

function slugify(value = '') {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
}

function buildCacheKey({ prompt, style, size, format }) {
    const hash = crypto
        .createHash('sha256')
        .update(`${prompt}|${style ?? ''}|${size ?? ''}|${format ?? ''}`)
        .digest('hex');
    return hash;
}

function ensureDataUri(file, format = 'png') {
    if (typeof file !== 'string' || file.length === 0) {
        throw new ProviderError('Image payload is empty', {
            code: 'invalid_response',
            provider: 'cloudinary',
        });
    }
    if (file.startsWith('data:image/')) {
        return file;
    }
    if (/^https?:\/\//i.test(file)) {
        return file;
    }
    // Assume base64 string without data URI prefix
    return `data:image/${format};base64,${file}`;
}

function normalizePublicId({ publicId, prompt, style }) {
    if (publicId && typeof publicId === 'string') {
        return publicId;
    }
    const base = slugify(style ? `${prompt} ${style}` : prompt) || 'hero-image';
    const suffix = crypto.randomBytes(3).toString('hex');
    return `${base}-${suffix}`;
}

async function uploadToCloudinary({ file, publicId, folder, resourceType = 'image', format }) {
    const config = await getCloudinaryConfig();
    const endpoint = `https://api.cloudinary.com/v1_1/${config.cloudName}/${resourceType}/upload`;
    const form = new FormData();

    const timestamp = Math.floor(Date.now() / 1000);
    const params = { timestamp };
    if (folder) params.folder = folder;
    if (publicId) params.public_id = publicId;
    if (format) params.format = format;

    const signatureBase = Object.keys(params)
        .sort()
        .map((key) => `${key}=${params[key]}`)
        .join('&');
    const signature = crypto.createHash('sha1').update(signatureBase + config.apiSecret).digest('hex');

    form.append('file', file);
    form.append('api_key', config.apiKey);
    form.append('timestamp', timestamp.toString());
    form.append('signature', signature);
    if (folder) form.append('folder', folder);
    if (publicId) form.append('public_id', publicId);
    if (format) form.append('format', format);

    const response = await fetchWithRetry(
        endpoint,
        {
            method: 'POST',
            body: form,
        },
        {
            provider: 'cloudinary',
            timeout: DEFAULT_TIMEOUT_MS,
            retries: 2,
        },
    );

    if (!response.ok) {
        const errorBody = await response.text();
        throw new ProviderError(`Cloudinary upload failed (${response.status})`, {
            code: response.status === 401 ? 'missing_credentials' : 'upload_failed',
            provider: 'cloudinary',
            status: response.status,
            metadata: { body: errorBody.slice(0, 500) },
        });
    }

    return response.json();
}

async function generateViaOpenAI({ prompt, size, format }) {
    const openaiKey = await getOpenAIKey();
    if (!openaiKey) {
        throw new ProviderError('OPENAI_API_KEY is not configured', {
            code: 'missing_credentials',
            provider: 'openai',
        });
    }

    const response = await fetchWithRetry(
        OPENAI_IMAGE_URL,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${openaiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-image-1',
                prompt,
                size,
            }),
        },
        {
            provider: 'openai',
            timeout: 30000,
            retries: 1,
        },
    );

    if (!response.ok) {
        const errBody = await response.text();
        const trimmed = errBody.slice(0, 500);
        const baseOptions = {
            provider: 'openai',
            status: response.status,
            metadata: { body: trimmed },
        };

        if (response.status === 403) {
            throw new ProviderError('OpenAI image generation requires organizational verification', {
                ...baseOptions,
                code: 'verification_required',
            });
        }

        if (response.status === 401) {
            throw new ProviderError('OpenAI credentials rejected', {
                ...baseOptions,
                code: 'missing_credentials',
            });
        }

        throw new ProviderError(`OpenAI image generation failed (${response.status})`, {
            ...baseOptions,
            code: response.status >= 500 ? 'upstream_error' : 'invalid_request',
            retryable: response.status >= 500,
        });
    }

    const payload = await response.json();
    const dataEntry = payload?.data?.[0] ?? {};

    if (typeof dataEntry.b64_json === 'string' && dataEntry.b64_json.length > 0) {
        return {
            file: ensureDataUri(dataEntry.b64_json, format),
            provider: 'openai',
            metadata: {
                model: payload?.model ?? 'gpt-image-1',
                revised_prompt: dataEntry.revised_prompt,
            },
        };
    }

    if (typeof dataEntry.url === 'string' && dataEntry.url.length > 0) {
        return {
            file: dataEntry.url,
            provider: 'openai',
            metadata: {
                model: payload?.model ?? 'gpt-image-1',
                revised_prompt: dataEntry.revised_prompt,
            },
        };
    }

    throw new ProviderError('OpenAI response missing image data', {
        provider: 'openai',
        code: 'invalid_response',
    });
}

async function generateViaPollinations({ prompt, style, format }) {
    const styledPrompt = style ? `${prompt}, ${style}` : prompt;
    const encodedPrompt = encodeURIComponent(`${styledPrompt}, cinematic, photorealistic`);
    const url = `${POLLINATIONS_BASE_URL}${encodedPrompt}`;

    const response = await fetchWithRetry(
        url,
        {
            headers: { Accept: 'image/png' },
        },
        {
            provider: 'pollinations',
            timeout: 20000,
            retries: 3,
            retryDelay: (attempt) => 1000 * Math.pow(2, attempt - 1),
        },
    );

    if (!response.ok) {
        const body = await response.text();
        throw new ProviderError(`Pollinations fallback failed (${response.status})`, {
            provider: 'pollinations',
            status: response.status,
            code: response.status === 404 ? 'not_found' : 'upstream_error',
            retryable: response.status === 429 || response.status >= 500,
            metadata: { body: body.slice(0, 300) },
        });
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.startsWith('image/')) {
        throw new ProviderError('Pollinations response was not an image', {
            provider: 'pollinations',
            code: 'invalid_response',
            metadata: { contentType },
        });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length === 0) {
        throw new ProviderError('Pollinations returned an empty image', {
            provider: 'pollinations',
            code: 'invalid_response',
        });
    }

    if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
        throw new ProviderError('Pollinations image exceeds allowed size', {
            provider: 'pollinations',
            code: 'payload_too_large',
            metadata: { bytes: buffer.length },
        });
    }

    const base64 = buffer.toString('base64');
    return {
        file: `data:${contentType};base64,${base64}`,
        provider: 'pollinations',
        metadata: {
            bytes: buffer.length,
        },
    };
}

function buildResultPayload({
    prompt,
    style,
    size,
    format,
    uploadResult,
    provider,
    providerMetadata,
    cacheKey,
    cached,
    durationMs,
}) {
    return {
        success: true,
        prompt,
        style: style ?? null,
        size,
        format: uploadResult?.format ?? format,
        bytes: uploadResult?.bytes ?? providerMetadata?.bytes ?? null,
        width: uploadResult?.width ?? null,
        height: uploadResult?.height ?? null,
        secure_url: uploadResult?.secure_url,
        public_id: uploadResult?.public_id,
        provider,
        provider_metadata: providerMetadata ?? null,
        cached,
        cache_key: cacheKey,
        duration_ms: durationMs,
    };
}

async function generateHeroImage({
    prompt,
    style,
    size = '1024x1024',
    format = 'png',
    folder = 'generated',
    publicId,
    cache = true,
    idempotencyKey,
    requestId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(8).toString('hex'),
}) {
    if (!prompt) {
        throw new ProviderError('generate_hero_image requires prompt', {
            code: 'validation_error',
            provider: 'cloudinary',
        });
    }

    const startedAt = Date.now();
    const cacheKey = idempotencyKey || buildCacheKey({ prompt, style, size, format });
    const memoryKey = cacheKey ? `hero:${cacheKey}` : null;

    return withInFlight(memoryKey, async () => {
        if (cache !== false && memoryKey) {
            const memoized = getFromMemory(memoryKey);
            if (memoized) {
                logEvent({
                    requestId,
                    tool: 'generate_hero_image',
                    phase: 'cache_hit_memory',
                    success: true,
                    provider: memoized.provider,
                    metadata: { cache_key: cacheKey },
                });
                return { ...memoized, cached: true };
            }

            const cachedRecord = await getImageCacheEntry(cacheKey);
            if (cachedRecord?.secure_url) {
                const result = {
                    success: true,
                    prompt: cachedRecord.prompt ?? prompt,
                    style: cachedRecord.style ?? style ?? null,
                    size: cachedRecord.size ?? size,
                    format: cachedRecord.format ?? format,
                    bytes: cachedRecord.metadata?.bytes ?? null,
                    width: cachedRecord.metadata?.width ?? null,
                    height: cachedRecord.metadata?.height ?? null,
                    secure_url: cachedRecord.secure_url,
                    public_id: cachedRecord.public_id,
                    provider: cachedRecord.provider ?? 'cloudinary',
                    provider_metadata: cachedRecord.metadata?.provider_metadata ?? null,
                    cached: true,
                    cache_key: cacheKey,
                    duration_ms: Date.now() - startedAt,
                };
                setInMemory(memoryKey, result, DEFAULT_CACHE_TTL_MS);
                logEvent({
                    requestId,
                    tool: 'generate_hero_image',
                    phase: 'cache_hit_supabase',
                    success: true,
                    provider: result.provider,
                    metadata: { cache_key: cacheKey, public_id: result.public_id },
                });
                return result;
            }
        }

        const attempts = [];
        let asset = null;
        let providerMetadata = null;

        const tryOpenAI = async () => {
            const openaiKey = await getOpenAIKey();
            if (!openaiKey) {
                throw new ProviderError('OPENAI_API_KEY missing', {
                    code: 'missing_credentials',
                    provider: 'openai',
                });
            }
            return generateViaOpenAI({ prompt, size, format });
        };

        try {
            asset = await tryOpenAI();
            providerMetadata = asset.metadata ?? null;
            logEvent({
                requestId,
                tool: 'generate_hero_image',
                phase: 'provider_success',
                success: true,
                provider: 'openai',
                metadata: providerMetadata,
            });
        } catch (error) {
            attempts.push({
                provider: 'openai',
                success: false,
                error: error?.message,
                code: error?.code,
            });
            logEvent({
                requestId,
                tool: 'generate_hero_image',
                phase: 'provider_failure',
                success: false,
                provider: 'openai',
                error,
            });

            if (!isProviderError(error) || (error.code !== 'verification_required' && error.code !== 'missing_credentials')) {
                if (!error.retryable) {
                    // Non-retryable OpenAI error; proceed to fallback.
                }
            }
        }

        if (!asset) {
            try {
                asset = await generateViaPollinations({ prompt, style, format });
                providerMetadata = asset.metadata ?? null;
                logEvent({
                    requestId,
                    tool: 'generate_hero_image',
                    phase: 'provider_success',
                    success: true,
                    provider: 'pollinations',
                    metadata: providerMetadata,
                });
            } catch (error) {
                attempts.push({
                    provider: 'pollinations',
                    success: false,
                    error: error?.message,
                    code: error?.code,
                });
                logEvent({
                    requestId,
                    tool: 'generate_hero_image',
                    phase: 'provider_failure',
                    success: false,
                    provider: 'pollinations',
                    error,
                });
                throw error;
            }
        }

        if (!asset) {
            throw new ProviderError('All image providers failed', {
                provider: 'cloudinary',
                code: 'providers_exhausted',
                metadata: { attempts },
            });
        }

        const normalizedPublicId = normalizePublicId({ publicId, prompt, style });
        const uploadStarted = Date.now();
        const uploadResult = await uploadToCloudinary({
            file: ensureDataUri(asset.file, format),
            publicId: normalizedPublicId,
            folder,
            format,
        });
        const uploadDuration = Date.now() - uploadStarted;

        logEvent({
            requestId,
            tool: 'generate_hero_image',
            phase: 'upload_success',
            success: true,
            provider: 'cloudinary',
            durationMs: uploadDuration,
            metadata: { public_id: uploadResult.public_id, bytes: uploadResult.bytes },
        });

        const durationMs = Date.now() - startedAt;
        const result = buildResultPayload({
            prompt,
            style,
            size,
            format,
            uploadResult,
            provider: asset.provider,
            providerMetadata,
            cacheKey,
            cached: false,
            durationMs,
        });

        if (cache !== false && cacheKey) {
            setInMemory(memoryKey, result, DEFAULT_CACHE_TTL_MS);
            upsertImageCacheEntry({
                cache_key: cacheKey,
                prompt,
                style,
                size,
                format: result.format,
                public_id: result.public_id,
                secure_url: result.secure_url,
                provider: result.provider,
                metadata: {
                    ...providerMetadata,
                    bytes: result.bytes,
                    width: result.width,
                    height: result.height,
                },
            }).catch((error) => {
                console.warn('Failed to persist image cache entry:', error?.message ?? error);
            });
        }

        logEvent({
            requestId,
            tool: 'generate_hero_image',
            phase: 'complete',
            success: true,
            provider: result.provider,
            durationMs,
            metadata: { cache_key: cacheKey, public_id: result.public_id },
        });

        return result;
    });
}

async function buildTransformedUrl({ publicId, transformation, format = 'png' }) {
    const { cloudName } = await getCloudinaryConfig();
    const safeTransformation = transformation?.replace(/^\//, '') ?? '';
    const safePublicId = publicId.replace(/^\//, '');
    return `https://res.cloudinary.com/${cloudName}/image/upload/${safeTransformation}/${safePublicId}.${format}`;
}

async function transformImage({ publicId, transformation, format = 'png' }) {
    if (!publicId || !transformation) {
        throw new ProviderError('transform_image requires public_id and transformation', {
            code: 'validation_error',
            provider: 'cloudinary',
        });
    }

    const url = await buildTransformedUrl({ publicId, transformation, format });
    return {
        success: true,
        public_id: publicId,
        transformation,
        url,
    };
}

async function uploadMedia({ fileUrl, publicId, folder = 'uploads', resourceType = 'auto' }) {
    if (!fileUrl) {
        throw new ProviderError('upload_media requires file_url', {
            code: 'validation_error',
            provider: 'cloudinary',
        });
    }
    const result = await uploadToCloudinary({
        file: fileUrl,
        publicId,
        folder,
        resourceType,
    });

    return {
        success: true,
        resource_type: result.resource_type,
        public_id: result.public_id,
        secure_url: result.secure_url,
        bytes: result.bytes,
        format: result.format,
    };
}

module.exports = {
    generateHeroImage,
    transformImage,
    uploadMedia,
};
