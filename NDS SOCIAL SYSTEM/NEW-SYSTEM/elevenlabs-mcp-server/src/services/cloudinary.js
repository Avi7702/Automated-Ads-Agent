const OPENAI_IMAGE_URL = 'https://api.openai.com/v1/images/generations';

function getCloudinaryConfig() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
        throw new Error('Cloudinary credentials are not fully configured');
    }

    return { cloudName, apiKey, apiSecret };
}

function getOpenAIKey() {
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
        throw new Error('OPENAI_API_KEY is not configured');
    }
    return key;
}

function buildBasicAuth({ apiKey, apiSecret }) {
    return Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
}

async function uploadToCloudinary({ file, publicId, folder, resourceType = 'image', format }) {
    const config = getCloudinaryConfig();
    const endpoint = `https://api.cloudinary.com/v1_1/${config.cloudName}/${resourceType}/upload`;
    const form = new FormData();

    form.append('file', file);
    if (publicId) form.append('public_id', publicId);
    if (folder) form.append('folder', folder);
    if (format) form.append('format', format);
    form.append('overwrite', 'true');

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            Authorization: `Basic ${buildBasicAuth(config)}`,
        },
        body: form,
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Cloudinary upload failed (${response.status}): ${errorBody}`);
    }

    return response.json();
}

async function generateHeroImage({
    prompt,
    size = '1024x1024',
    format = 'png',
    folder = 'generated',
    publicId,
}) {
    if (!prompt) {
        throw new Error('generateHeroImage requires prompt');
    }

    const openaiKey = getOpenAIKey();

    const openaiResponse = await fetch(OPENAI_IMAGE_URL, {
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
    });

    if (!openaiResponse.ok) {
        const err = await openaiResponse.text();
        throw new Error(`OpenAI image generation failed (${openaiResponse.status}): ${err}`);
    }

    const payload = await openaiResponse.json();
    const imageUrl = payload?.data?.[0]?.url;
    if (typeof imageUrl !== 'string' || !imageUrl) {
        throw new Error('OpenAI image response missing url');
    }

    const uploadResult = await uploadToCloudinary({
        file: imageUrl,
        publicId,
        folder,
    });

    return {
        success: true,
        prompt,
        size,
        format: uploadResult.format,
        bytes: uploadResult.bytes,
        width: uploadResult.width,
        height: uploadResult.height,
        secure_url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
    };
}

function buildTransformedUrl({ publicId, transformation, format = 'png' }) {
    const { cloudName } = getCloudinaryConfig();
    const safeTransformation = transformation?.replace(/^\//, '') ?? '';
    const safePublicId = publicId.replace(/^\//, '');
    return `https://res.cloudinary.com/${cloudName}/image/upload/${safeTransformation}/${safePublicId}.${format}`;
}

async function transformImage({ publicId, transformation, format = 'png' }) {
    if (!publicId || !transformation) {
        throw new Error('transformImage requires publicId and transformation');
    }

    const url = buildTransformedUrl({ publicId, transformation, format });
    return {
        success: true,
        public_id: publicId,
        transformation,
        url,
    };
}

async function uploadMedia({ fileUrl, publicId, folder = 'uploads', resourceType = 'auto' }) {
    if (!fileUrl) {
        throw new Error('uploadMedia requires fileUrl');
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
