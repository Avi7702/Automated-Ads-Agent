// src/tools.js

const tools = {
    query_products: {
        description: 'Query the Supabase catalog for products by handle, category, or free text.',
        parameters: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Free-text search across title and description.' },
                handle: { type: 'string', description: 'Exact product handle (e.g., T12).' },
                category: { type: 'string', description: 'Category filter (rebar, mesh, etc.).' },
                limit: { type: 'integer', description: 'Maximum number of products to return.' },
            },
        },
    },
    create_post: {
        description: 'Insert a drafted social post into Supabase.',
        parameters: {
            type: 'object',
            properties: {
                product_id: { type: 'integer', description: 'Related product record.' },
                platform: { type: 'string', description: 'Destination platform (linkedin, twitter, etc.).' },
                copy: { type: 'string', description: 'Rendered copy for the post.' },
                image_url: { type: 'string', description: 'Associated creative asset URL.' },
                brand_score: { type: 'number', description: '0-1 score describing brand alignment.' },
                status: { type: 'string', description: 'draft, approved, published, etc.' },
                post_url: { type: 'string', description: 'Link to the published asset if applicable.' },
                platform_post_id: { type: 'string', description: 'Platform-native identifier.' },
                engagement_metrics: { type: 'object', description: 'Structured engagement numbers.' },
                user_feedback: { type: 'string', description: 'Notes from the approver/user.' },
                created_by: { type: 'string', description: 'User phone number or identifier.' },
                metadata: { type: 'object', description: 'Arbitrary JSON metadata.' },
            },
        },
    },
    update_post: {
        description: 'Update fields on an existing post by post_id.',
        parameters: {
            type: 'object',
            properties: {
                post_id: { type: 'string', description: 'UUID of the post to update.' },
            },
            required: ['post_id'],
            additionalProperties: true,
        },
    },
    get_user_preferences: {
        description: 'Fetch stored user preference profile by phone number.',
        parameters: {
            type: 'object',
            properties: {
                user_phone: { type: 'string', description: 'E.164 formatted phone number.' },
            },
            required: ['user_phone'],
        },
    },
    log_workflow_event: {
        description: 'Log a workflow event (telemetry/audit) to Supabase.',
        parameters: {
            type: 'object',
            properties: {
                event_type: { type: 'string', description: 'Event category or slug.' },
                status: { type: 'string', description: 'ok|error|retry etc.' },
                metadata: { type: 'object', description: 'Arbitrary JSON payload for observability.' },
            },
            additionalProperties: true,
        },
    },
    generate_ad_copy: {
        description: 'Generate ad copy text for a specific product and audience.',
        parameters: {
            type: 'object',
            properties: {
                product_name: { type: 'string', description: 'Name of the product.' },
                target_audience: { type: 'string', description: 'Target audience description.' },
                platform: { type: 'string', description: 'Optional platform context (LinkedIn, etc.).' },
                tone: { type: 'string', description: 'Desired tone for the copy.' },
                temperature: { type: 'number', description: 'Sampling temperature (0-1).' },
            },
            required: ['product_name', 'target_audience'],
        },
    },
    score_brand_alignment: {
        description: 'Evaluate generated copy against the brand voice and return a score.',
        parameters: {
            type: 'object',
            properties: {
                content: { type: 'string', description: 'Copy to evaluate.' },
                brand_voice_summary: {
                    type: 'string',
                    description: 'Optional override for the brand voice summary.',
                },
            },
            required: ['content'],
        },
    },
    generate_hero_image: {
        description:
            'Generate a hero image with provider fallback, cache the asset in Supabase, and return the Cloudinary URL.',
        parameters: {
            type: 'object',
            properties: {
                prompt: { type: 'string', description: 'Prompt describing the desired image.' },
                size: { type: 'string', description: 'Image size (e.g., 1024x1024).' },
                format: { type: 'string', description: 'Image format (png, jpg).' },
                folder: { type: 'string', description: 'Cloudinary folder to store in.' },
                public_id: { type: 'string', description: 'Optional Cloudinary public ID override.' },
                style: { type: 'string', description: 'Optional styling directive appended to the prompt.' },
                cache: {
                    type: 'boolean',
                    description: 'Disable cache lookup/persist when false. Defaults to true.',
                },
                idempotency_key: {
                    type: 'string',
                    description: 'Custom cache key to reuse generated assets across calls.',
                },
            },
            required: ['prompt'],
        },
    },
    transform_image: {
        description: 'Return a Cloudinary URL with the requested transformation applied.',
        parameters: {
            type: 'object',
            properties: {
                public_id: { type: 'string', description: 'Cloudinary public ID of the asset.' },
                transformation: { type: 'string', description: 'Transformation string (e.g., c_fill,w_1080,h_608).' },
                format: { type: 'string', description: 'Output format (default png).' },
            },
            required: ['public_id', 'transformation'],
        },
    },
    upload_media: {
        description: 'Upload remote media to Cloudinary for serving/sharing.',
        parameters: {
            type: 'object',
            properties: {
                file_url: { type: 'string', description: 'Source URL or data URI to upload.' },
                public_id: { type: 'string', description: 'Cloudinary public ID override.' },
                folder: { type: 'string', description: 'Cloudinary folder path.' },
                resource_type: {
                    type: 'string',
                    description: 'Cloudinary resource type (image, video, auto).',
                },
            },
            required: ['file_url'],
        },
    },
    store_competitor_post: {
        description: 'Persist a scraped competitor post into Supabase.',
        parameters: {
            type: 'object',
            properties: {
                source_url: { type: 'string', description: 'Canonical URL of the post.' },
                brand: { type: 'string', description: 'Competitor brand name.' },
                platform: { type: 'string', description: 'Social platform.' },
                author: { type: 'string', description: 'Author handle/name.' },
                headline: { type: 'string', description: 'Headline or key takeaway.' },
                body: { type: 'string', description: 'Primary text content.' },
                media_urls: { type: 'array', description: 'Array of media URLs.', items: { type: 'string' } },
                engagement: { type: 'object', description: 'Structured engagement metrics.' },
            },
            required: ['source_url'],
            additionalProperties: true,
        },
    },
    store_competitor_insight: {
        description: 'Store an AI-generated insight tied to a competitor post.',
        parameters: {
            type: 'object',
            properties: {
                post_id: { type: 'integer', description: 'Foreign key referencing competitor_posts.id.' },
                analysis: { type: 'object', description: 'Insight payload (JSON).' },
            },
            required: ['post_id', 'analysis'],
            additionalProperties: true,
        },
    },
    fetch_competitor_insights: {
        description: 'Fetch stored competitor insights, optionally filtered by brand/platform.',
        parameters: {
            type: 'object',
            properties: {
                brand: { type: 'string', description: 'Filter by competitor brand.' },
                platform: { type: 'string', description: 'Filter by platform.' },
                limit: { type: 'integer', description: 'Max number of insights to return.' },
            },
        },
    },
    send_whatsapp_preview: {
        description: 'Send a WhatsApp preview message with optional media via Twilio.',
        parameters: {
            type: 'object',
            properties: {
                to: { type: 'string', description: 'Recipient phone number (E.164).' },
                body: { type: 'string', description: 'Message body text.' },
                media_url: { type: 'string', description: 'Optional media URL to include.' },
                note: {
                    type: 'string',
                    description: 'Ensure TWILIO_WHATSAPP_NUMBER is the provisioned WhatsApp sender.',
                },
            },
            required: ['to'],
        },
    },
    check_whatsapp_status: {
        description: 'Check the delivery status of a previously sent WhatsApp message.',
        parameters: {
            type: 'object',
            properties: {
                message_sid: { type: 'string', description: 'Twilio Message SID.' },
            },
            required: ['message_sid'],
        },
    },
};

module.exports = tools;
