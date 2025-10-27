const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_JSON_URL = 'https://api.openai.com/v1/responses';

async function callOpenAIChat({ apiKey, model, messages, temperature = 0.7 }) {
    if (!apiKey) {
        throw new Error('OPENAI_API_KEY is not configured');
    }

    const response = await fetch(OPENAI_CHAT_URL, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model,
            temperature,
            messages,
        }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`OpenAI chat call failed (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
        throw new Error('OpenAI chat response missing content');
    }

    return content.trim();
}

async function callOpenAIJson({ apiKey, model, messages }) {
    if (!apiKey) {
        throw new Error('OPENAI_API_KEY is not configured');
    }

    const response = await fetch(OPENAI_CHAT_URL, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model,
            response_format: { type: 'json_object' },
            messages,
        }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`OpenAI JSON call failed (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    const raw = data?.choices?.[0]?.message?.content;
    if (typeof raw !== 'string' || !raw.trim()) {
        throw new Error('OpenAI JSON response missing content');
    }

    try {
        return JSON.parse(raw);
    } catch (err) {
        throw new Error(`Failed to parse OpenAI JSON response: ${err.message}`);
    }
}

async function generateAdCopy({
    productName,
    targetAudience,
    platform,
    tone = 'professional',
    temperature = 0.7,
}) {
    const apiKey = process.env.OPENAI_API_KEY;
    const messages = [
        {
            role: 'system',
            content: [
                'You are Will, NextDaySteel\'s senior marketing copywriter.',
                'Produce concise, high-converting copy tailored to the requested platform.',
                'Return only the final copy without additional commentary or formatting instructions.',
            ].join(' '),
        },
        {
            role: 'user',
            content: [
                `Product: ${productName}`,
                `Audience: ${targetAudience}`,
                platform ? `Platform: ${platform}` : null,
                `Tone: ${tone}`,
                '',
                'Write a single piece of ad copy that highlights the unique value proposition.',
            ]
                .filter(Boolean)
                .join('\n'),
        },
    ];

    const copy = await callOpenAIChat({
        apiKey,
        model: 'gpt-4o-mini',
        messages,
        temperature,
    });

    return { copy };
}

async function scoreBrandAlignment({ content, brandVoiceSummary }) {
    const apiKey = process.env.OPENAI_API_KEY;
    const messages = [
        {
            role: 'system',
            content: [
                'You are a marketing QA assistant for NextDaySteel.',
                'Evaluate copy against the provided brand summary.',
                'Respond with JSON containing keys: score (0-1), rationale (string), suggestions (array of strings).',
            ].join(' '),
        },
        {
            role: 'user',
            content: [
                `Brand summary:\n${brandVoiceSummary}`,
                '',
                `Copy to evaluate:\n${content}`,
            ].join('\n'),
        },
    ];

    const result = await callOpenAIJson({
        apiKey,
        model: 'gpt-4o-mini',
        messages,
    });

    const score = typeof result.score === 'number' ? result.score : Number(result.score ?? 0);
    const rationale = typeof result.rationale === 'string' ? result.rationale : '';
    const suggestions = Array.isArray(result.suggestions)
        ? result.suggestions.map((entry) => String(entry))
        : [];

    return { score, rationale, suggestions };
}

module.exports = {
    generateAdCopy,
    scoreBrandAlignment,
};
