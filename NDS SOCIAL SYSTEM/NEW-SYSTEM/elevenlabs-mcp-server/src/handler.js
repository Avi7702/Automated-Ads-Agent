const tools = require('./tools');
const {
    queryProducts,
    createPost,
    updatePost,
    getUserPreferences,
    logWorkflowEvent,
    storeCompetitorPost,
    storeCompetitorInsight,
    fetchCompetitorInsights,
} = require('./services/supabase');
const { generateAdCopy, scoreBrandAlignment } = require('./services/llm');
const { generateHeroImage, transformImage, uploadMedia } = require('./services/cloudinary');
const { sendWhatsappPreview, getWhatsappMessageStatus } = require('./services/twilio');

const WORKFLOW_LOG_ENABLED = process.env.ENABLE_WORKFLOW_LOG === 'true';

const ensureObject = (value, toolName) => {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error(`${toolName} expects an object payload`);
    }
    return value;
};

const safeLogWorkflowEvent = async ({ toolName, status, args, result, error }) => {
    if (!WORKFLOW_LOG_ENABLED) return;
    if (toolName === 'log_workflow_event') return;

    try {
        await logWorkflowEvent({
            tool_name: toolName,
            status,
            input: args,
            output: result,
            error: error ? { message: error.message } : null,
            logged_at: new Date().toISOString(),
        });
    } catch (logError) {
        console.warn('workflow_events logging failed:', logError.message);
    }
};

const toolFunctions = {
    query_products: async (rawArgs = {}) => {
        const args = ensureObject(rawArgs, 'query_products');
        const products = await queryProducts({
            handle: args.handle,
            category: args.category,
            search: args.query ?? args.search,
            limit: args.limit,
        });

        return {
            success: true,
            products,
            message: `Queried ${products.length} products`,
        };
    },
    create_post: async (rawArgs = {}) => {
        const args = ensureObject(rawArgs, 'create_post');
        const post = await createPost(args);
        return { success: true, post };
    },
    update_post: async (rawArgs = {}) => {
        const args = ensureObject(rawArgs, 'update_post');
        const postId = args.post_id;
        if (!postId) throw new Error('update_post requires post_id');
        const post = await updatePost(postId, args);
        return { success: true, post };
    },
    get_user_preferences: async (rawArgs = {}) => {
        const args = ensureObject(rawArgs, 'get_user_preferences');
        if (!args.user_phone) throw new Error('get_user_preferences requires user_phone');
        const preferences = await getUserPreferences(args.user_phone);
        return { success: true, preferences };
    },
    log_workflow_event: async (rawArgs = {}) => {
        const args = ensureObject(rawArgs, 'log_workflow_event');
        const event = await logWorkflowEvent(args);
        return { success: true, event };
    },
    generate_ad_copy: async (rawArgs = {}) => {
        const args = ensureObject(rawArgs, 'generate_ad_copy');
        if (!args.product_name || !args.target_audience) {
            throw new Error('generate_ad_copy requires product_name and target_audience');
        }
        const result = await generateAdCopy({
            productName: args.product_name,
            targetAudience: args.target_audience,
            platform: args.platform,
            tone: args.tone,
            temperature: args.temperature,
        });
        return { success: true, ...result };
    },
    score_brand_alignment: async (rawArgs = {}) => {
        const args = ensureObject(rawArgs, 'score_brand_alignment');
        if (!args.content) {
            throw new Error('score_brand_alignment requires content');
        }
        const result = await scoreBrandAlignment({
            content: args.content,
            brandVoiceSummary:
                args.brand_voice_summary ??
                "NextDaySteel is fast, reliable, and expert-focused. Voice should be confident, concise, and rooted in construction know-how.",
        });
        return { success: true, ...result };
    },
    generate_hero_image: async (rawArgs = {}) => {
        const args = ensureObject(rawArgs, 'generate_hero_image');
        if (!args.prompt) throw new Error('generate_hero_image requires prompt');
        const result = await generateHeroImage({
            prompt: args.prompt,
            size: args.size,
            format: args.format,
            folder: args.folder,
            publicId: args.public_id,
        });
        return result;
    },
    transform_image: async (rawArgs = {}) => {
        const args = ensureObject(rawArgs, 'transform_image');
        const { public_id: publicId, transformation, format } = args;
        if (!publicId || !transformation) {
            throw new Error('transform_image requires public_id and transformation');
        }
        return transformImage({
            publicId,
            transformation,
            format,
        });
    },
    upload_media: async (rawArgs = {}) => {
        const args = ensureObject(rawArgs, 'upload_media');
        if (!args.file_url) {
            throw new Error('upload_media requires file_url');
        }
        return uploadMedia({
            fileUrl: args.file_url,
            publicId: args.public_id,
            folder: args.folder,
            resourceType: args.resource_type,
        });
    },
    store_competitor_post: async (rawArgs = {}) => {
        const args = ensureObject(rawArgs, 'store_competitor_post');
        const post = await storeCompetitorPost(args);
        return { success: true, post };
    },
    store_competitor_insight: async (rawArgs = {}) => {
        const args = ensureObject(rawArgs, 'store_competitor_insight');
        const insight = await storeCompetitorInsight(args);
        return { success: true, insight };
    },
    fetch_competitor_insights: async (rawArgs = {}) => {
        const args = ensureObject(rawArgs, 'fetch_competitor_insights');
        const insights = await fetchCompetitorInsights({
            brand: args.brand,
            platform: args.platform,
            limit: args.limit,
        });
        return { success: true, insights };
    },
    send_whatsapp_preview: async (rawArgs = {}) => {
        const args = ensureObject(rawArgs, 'send_whatsapp_preview');
        if (!args.to) throw new Error('send_whatsapp_preview requires to');
        try {
            const response = await sendWhatsappPreview({
                to: args.to,
                body: args.body,
                mediaUrl: args.media_url,
            });
            return { success: true, sid: response.sid, status: response.status };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                hint: 'Verify TWILIO_WHATSAPP_NUMBER is an approved WhatsApp sender.',
            };
        }
    },
    check_whatsapp_status: async (rawArgs = {}) => {
        const args = ensureObject(rawArgs, 'check_whatsapp_status');
        if (!args.message_sid) throw new Error('check_whatsapp_status requires message_sid');
        const response = await getWhatsappMessageStatus({ messageSid: args.message_sid });
        return {
            success: true,
            sid: response.sid,
            status: response.status,
            to: response.to,
            from: response.from,
            error_code: response.error_code,
            error_message: response.error_message,
        };
    },
};

async function handleMCP(payload) {
    const { method, id } = payload;

    try {
        switch (method) {
            case 'initialize':
                return {
                    jsonrpc: '2.0',
                    result: {
                        capabilities: { tools: true, sse: false },
                        tools: Object.keys(tools).map((name) => ({
                            name,
                            description: tools[name].description,
                            parameters: tools[name].parameters,
                        })),
                    },
                    id,
                };
            case 'tools.list':
                return {
                    jsonrpc: '2.0',
                    result: Object.keys(tools).map((name) => ({
                        name,
                        description: tools[name].description,
                        parameters: tools[name].parameters,
                    })),
                    id,
                };
            case 'tools.call':
            const toolName = payload.params?.name;
            const args = payload.params?.arguments || {};
            if (!toolFunctions[toolName]) {
                return {
                    jsonrpc: '2.0',
                        error: { code: -32601, message: `Method not found: ${toolName}` },
                        id,
                    };
                }
                const toolResult = await toolFunctions[toolName](args);
                await safeLogWorkflowEvent({
                    toolName,
                    status: 'success',
                    args,
                    result: toolResult,
                });
                return {
                    jsonrpc: '2.0',
                    result: {
                        content: [{ type: 'text', text: JSON.stringify(toolResult) }],
                    },
                    id,
                };
            default:
                return {
                    jsonrpc: '2.0',
                    error: { code: -32601, message: 'Method not found or not supported.' },
                    id,
                };
        }
    } catch (error) {
        if (payload?.method === 'tools.call' && payload?.params?.name) {
            safeLogWorkflowEvent({
                toolName: payload.params.name,
                status: 'error',
                args: payload.params.arguments,
                error,
            }).catch(() => {});
        }
        console.error('MCP Execution Error:', error);
        return {
            jsonrpc: '2.0',
            error: { code: -32000, message: `Server error: ${error.message}` },
            id,
        };
    }
}

module.exports = { handleMCP, toolFunctions };
