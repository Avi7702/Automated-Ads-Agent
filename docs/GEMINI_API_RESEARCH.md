# Gemini API Models Research Report

## Current Models in Use

| Service | Model | Purpose |
|---------|-------|---------|
| Vision Analysis | `gemini-3-flash-preview` | Analyzing product images |
| Idea Bank | `gemini-3-flash-preview` | Generating ad concepts/reasoning |
| File Search (RAG) | `gemini-3-flash-preview` | Querying knowledge base |
| Image Generation | `gemini-3-pro-preview` | Creating/editing marketing images |
| Copywriting | `gemini-3-pro-preview` | Generating ad copy |

---

## Root Cause of 429 Errors

**Your API key is on the FREE TIER.** Preview models have extremely strict free tier limits:

| Model | Free Tier Limit |
|-------|-----------------|
| `gemini-3-flash-preview` | **5 RPM** (requests per minute), 50 RPD (requests per day) |
| `gemini-3-pro-preview` | **0 RPM** (no free tier API access for Gemini 3 Pro!) |
| `gemini-3-pro-image` | **0 RPD** (no free tier for image generation!) |

> [!CAUTION]
> **Gemini 3 Pro Preview has NO free API tier.** You can experiment in AI Studio UI for free, but API calls require a paid account.

---

## Paid Tier Rate Limits (After Enabling Billing)

| Model | Paid Tier Limit |
|-------|-----------------|
| `gemini-3-flash-preview` | **3,000,000 TPM** (tokens per minute) |
| `gemini-3-pro-preview` | **5,000,000 TPM** |

These are **massive** limits. A single user would never hit these.

---

## Pricing (Paid Tier)

### Gemini 3 Flash Preview
| Type | Cost per Million Tokens |
|------|-------------------------|
| Input | $0.50 |
| Output | $3.00 |

### Gemini 3 Pro Preview
| Type | Cost per Million Tokens |
|------|-------------------------|
| Input | $2.00 (≤200k context), $4.00 (>200k) |
| Output | $12.00 (≤200k context), $18.00 (>200k) |
| Image Output | ~$0.13-$0.24 per image |

---

## Solution: Enable Paid Tier

### Steps to Enable Billing:
1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Navigate to **Settings** → **Billing**
3. Enable Cloud Billing for your project
4. Link a payment method

> [!IMPORTANT]
> After enabling billing, your rate limits automatically upgrade. The app code does NOT need to change.

### Expected Costs (Single User Scenario)

For a single user generating ~50-100 ad sets per day:
- **Flash (reasoning/analysis):** ~$0.10-$0.50/day
- **Pro (copywriting/images):** ~$1-$5/day
- **Total Estimate:** ~$30-$150/month

---

## Alternative: Rate Limiting in Code

If you prefer to stay on the **free tier** (limited to Flash only, no Pro):

1. Implement request queuing (max 5 RPM)
2. Add retry logic with exponential backoff
3. Replace `gemini-3-pro-preview` with `gemini-2.0-flash-exp` (has limited free image gen)

**I will NOT implement this unless you explicitly request it, as it would require model downgrades.**

---

## Recommendation

**Enable billing on your Google Cloud project.** This immediately unlocks:
- Full access to Gemini 3 Pro Preview
- 3-5 million tokens per minute (effectively unlimited for single user)
- Native image generation
- Context caching (90% cost reduction for repeated prompts)

The models you're using are the best available. The only issue is the billing tier.
