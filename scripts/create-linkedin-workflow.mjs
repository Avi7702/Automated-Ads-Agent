/**
 * Create LinkedIn Posting Workflow in n8n
 *
 * Uses HTTP Request nodes (not the built-in LinkedIn node which has a
 * known bug with the person field: https://github.com/n8n-io/n8n/issues/16802)
 *
 * Workflow flow:
 *   Webhook (POST /webhook/post/linkedin)
 *     → Validate Payload (Code node)
 *     → Get LinkedIn Profile (HTTP Request → /v2/userinfo)
 *     → Create LinkedIn Post (HTTP Request → /rest/posts)
 *     → Build Success Callback (Code node with HMAC)
 *     → Send Success Callback (HTTP Request → our app)
 *     → Respond Success (Respond to Webhook)
 *   Error Trigger
 *     → Build Error Callback (Code node with HMAC)
 *     → Send Error Callback (HTTP Request → our app)
 */

import https from 'node:https';

const N8N_HOST = 'ndsteel.app.n8n.cloud';
const N8N_API_KEY = process.env.N8N_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5OTMyNDQ1OC01OTU4LTQxMjItOTA0OC02NDg1ZjU2MTZjY2MiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzcwNzUxOTQ3LCJleHAiOjE3NzMyNzM2MDB9.UfpIthHtVh2uoKyXziJzfmIsWy_q0M2sc-4B8COj49s';
const APP_CALLBACK_URL = 'https://automated-ads-agent-production.up.railway.app/api/n8n/callback';
const WEBHOOK_SECRET = 'c649f52c03d97124651404a511d438d48442d1ac141a910ee2b89c4a6bf84e90';

// -- Code node: Validate Payload --
const validatePayloadCode = `
// Validate incoming payload from Automated Ads Agent
const body = $input.first().json.body;

if (!body) {
  throw new Error('Empty request body');
}

const { content, metadata, platform } = body;

if (!content || !content.caption) {
  throw new Error('Missing required field: content.caption');
}

if (!metadata || !metadata.scheduledPostId) {
  throw new Error('Missing required field: metadata.scheduledPostId');
}

// Pass through validated data
return [{
  json: {
    caption: content.caption,
    hashtags: content.hashtags || [],
    imageUrl: content.imageUrl || null,
    scheduledPostId: metadata.scheduledPostId,
    generationId: metadata.generationId || null,
    userId: body.userId || 'unknown',
    platform: platform || 'linkedin',
    callbackUrl: body.callbackUrl || null
  }
}];
`.trim();

// -- Code node: Build Post Body --
const buildPostBodyCode = `
// Build LinkedIn REST API post body using the profile URN
const profile = $('Get LinkedIn Profile').first().json;
const validated = $('Validate Payload').first().json;

// Get the person URN from /v2/userinfo response
const personUrn = profile.sub ? 'urn:li:person:' + profile.sub : null;

if (!personUrn) {
  throw new Error('Could not determine LinkedIn person URN from profile');
}

// Build the post payload for LinkedIn REST API
const postBody = {
  author: personUrn,
  commentary: validated.caption,
  visibility: 'PUBLIC',
  distribution: {
    feedDistribution: 'MAIN_FEED',
    targetEntities: [],
    thirdPartyDistributionChannels: []
  },
  lifecycleState: 'PUBLISHED'
};

return [{
  json: {
    postBody: postBody,
    personUrn: personUrn,
    scheduledPostId: validated.scheduledPostId
  }
}];
`.trim();

// -- Code node: Build Success Callback --
const buildSuccessCallbackCode = `
// Build success callback payload and compute HMAC-SHA256 signature
const crypto = require('crypto');
const validated = $('Validate Payload').first().json;
const postResult = $('Create LinkedIn Post').first().json;

// LinkedIn REST API returns the post URN in the x-restli-id header or response
const postId = postResult.id || postResult['x-restli-id'] || '';

const callbackPayload = {
  scheduledPostId: validated.scheduledPostId,
  platform: 'linkedin',
  success: true,
  platformPostId: postId,
  platformPostUrl: postId
    ? 'https://www.linkedin.com/feed/update/' + postId
    : '',
  executionId: $execution.id,
  postedAt: new Date().toISOString()
};

// Compute HMAC-SHA256 signature using the shared secret
const secret = '${WEBHOOK_SECRET}';
const bodyString = JSON.stringify(callbackPayload);
const signature = crypto
  .createHmac('sha256', secret)
  .update(bodyString)
  .digest('hex');

return [{
  json: {
    payload: callbackPayload,
    signature: signature
  }
}];
`.trim();

// -- Code node: Build Error Callback --
const buildErrorCallbackCode = `
// Build failure callback payload and compute HMAC-SHA256 signature
const crypto = require('crypto');
const errorData = $input.first().json;

let scheduledPostId = 'unknown';
let errorMessage = 'Unknown error during LinkedIn posting';
let errorCode = 'workflow_error';

try {
  if (errorData.execution && errorData.execution.error) {
    errorMessage = errorData.execution.error.message || errorMessage;
  }
} catch (e) {
  errorMessage = 'Error building callback: ' + e.message;
}

const callbackPayload = {
  scheduledPostId: scheduledPostId,
  platform: 'linkedin',
  success: false,
  error: errorMessage,
  errorCode: errorCode,
  executionId: $execution.id
};

const secret = '${WEBHOOK_SECRET}';
const bodyString = JSON.stringify(callbackPayload);
const signature = crypto
  .createHmac('sha256', secret)
  .update(bodyString)
  .digest('hex');

return [{
  json: {
    payload: callbackPayload,
    signature: signature
  }
}];
`.trim();

// -- Workflow JSON --
const workflow = {
  name: 'AdAgent - LinkedIn Post',
  nodes: [
    // 1. Webhook Trigger
    {
      parameters: {
        path: 'post/linkedin',
        httpMethod: 'POST',
        responseMode: 'responseNode',
        options: {}
      },
      id: 'webhook-trigger',
      name: 'Webhook',
      type: 'n8n-nodes-base.webhook',
      typeVersion: 2,
      position: [0, 300],
      webhookId: 'ad-agent-linkedin-post'
    },
    // 2. Validate Payload
    {
      parameters: {
        mode: 'runOnceForAllItems',
        jsCode: validatePayloadCode
      },
      id: 'validate-payload',
      name: 'Validate Payload',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [220, 300]
    },
    // 3. Get LinkedIn Profile — fetches the person URN
    {
      parameters: {
        method: 'GET',
        url: 'https://api.linkedin.com/v2/userinfo',
        authentication: 'predefinedCredentialType',
        nodeCredentialType: 'linkedInOAuth2Api',
        options: {}
      },
      id: 'get-profile',
      name: 'Get LinkedIn Profile',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.2,
      position: [440, 300],
      credentials: {
        linkedInOAuth2Api: {
          id: 'teqnsCd8EeUwk3Hs',
          name: 'LinkedIn account'
        }
      }
    },
    // 4. Build Post Body — constructs the LinkedIn API payload
    {
      parameters: {
        mode: 'runOnceForAllItems',
        jsCode: buildPostBodyCode
      },
      id: 'build-post-body',
      name: 'Build Post Body',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [660, 300]
    },
    // 5. Create LinkedIn Post — calls LinkedIn REST API directly
    {
      parameters: {
        method: 'POST',
        url: 'https://api.linkedin.com/rest/posts',
        authentication: 'predefinedCredentialType',
        nodeCredentialType: 'linkedInOAuth2Api',
        sendHeaders: true,
        headerParameters: {
          parameters: [
            { name: 'LinkedIn-Version', value: '202401' },
            { name: 'X-Restli-Protocol-Version', value: '2.0.0' }
          ]
        },
        sendBody: true,
        specifyBody: 'json',
        jsonBody: '={{ JSON.stringify($json.postBody) }}',
        options: {}
      },
      id: 'create-post',
      name: 'Create LinkedIn Post',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.2,
      position: [880, 300],
      credentials: {
        linkedInOAuth2Api: {
          id: 'teqnsCd8EeUwk3Hs',
          name: 'LinkedIn account'
        }
      }
    },
    // 6. Build Success Callback
    {
      parameters: {
        mode: 'runOnceForAllItems',
        jsCode: buildSuccessCallbackCode
      },
      id: 'success-callback-builder',
      name: 'Build Success Callback',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [1100, 300]
    },
    // 7. Send Success Callback
    {
      parameters: {
        method: 'POST',
        url: APP_CALLBACK_URL,
        sendHeaders: true,
        headerParameters: {
          parameters: [
            { name: 'Content-Type', value: 'application/json' },
            { name: 'x-n8n-signature', value: '={{ $json.signature }}' }
          ]
        },
        sendBody: true,
        specifyBody: 'json',
        jsonBody: '={{ JSON.stringify($json.payload) }}',
        options: { timeout: 10000 }
      },
      id: 'success-callback',
      name: 'Send Success Callback',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.2,
      position: [1320, 300]
    },
    // 8. Respond to Webhook — success
    {
      parameters: {
        respondWith: 'json',
        responseBody: '={{ JSON.stringify({ success: true, executionId: $execution.id, message: "Post published to LinkedIn" }) }}'
      },
      id: 'respond-success',
      name: 'Respond Success',
      type: 'n8n-nodes-base.respondToWebhook',
      typeVersion: 1.1,
      position: [1540, 300]
    },
    // 9. Error Trigger
    {
      parameters: {},
      id: 'error-trigger',
      name: 'Error Trigger',
      type: 'n8n-nodes-base.errorTrigger',
      typeVersion: 1,
      position: [440, 560]
    },
    // 10. Build Error Callback
    {
      parameters: {
        mode: 'runOnceForAllItems',
        jsCode: buildErrorCallbackCode
      },
      id: 'error-callback-builder',
      name: 'Build Error Callback',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [660, 560]
    },
    // 11. Send Error Callback
    {
      parameters: {
        method: 'POST',
        url: APP_CALLBACK_URL,
        sendHeaders: true,
        headerParameters: {
          parameters: [
            { name: 'Content-Type', value: 'application/json' },
            { name: 'x-n8n-signature', value: '={{ $json.signature }}' }
          ]
        },
        sendBody: true,
        specifyBody: 'json',
        jsonBody: '={{ JSON.stringify($json.payload) }}',
        options: { timeout: 10000 }
      },
      id: 'error-callback',
      name: 'Send Error Callback',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.2,
      position: [880, 560]
    }
  ],
  connections: {
    'Webhook': {
      main: [[{ node: 'Validate Payload', type: 'main', index: 0 }]]
    },
    'Validate Payload': {
      main: [[{ node: 'Get LinkedIn Profile', type: 'main', index: 0 }]]
    },
    'Get LinkedIn Profile': {
      main: [[{ node: 'Build Post Body', type: 'main', index: 0 }]]
    },
    'Build Post Body': {
      main: [[{ node: 'Create LinkedIn Post', type: 'main', index: 0 }]]
    },
    'Create LinkedIn Post': {
      main: [[{ node: 'Build Success Callback', type: 'main', index: 0 }]]
    },
    'Build Success Callback': {
      main: [[{ node: 'Send Success Callback', type: 'main', index: 0 }]]
    },
    'Send Success Callback': {
      main: [[{ node: 'Respond Success', type: 'main', index: 0 }]]
    },
    'Error Trigger': {
      main: [[{ node: 'Build Error Callback', type: 'main', index: 0 }]]
    },
    'Build Error Callback': {
      main: [[{ node: 'Send Error Callback', type: 'main', index: 0 }]]
    }
  },
  settings: {
    executionOrder: 'v1'
  }
};

// -- Send to n8n API --
const WORKFLOW_ID = 'c4l9oMIIMxQtd1Yf';
const body = JSON.stringify(workflow);

const options = {
  hostname: N8N_HOST,
  path: `/api/v1/workflows/${WORKFLOW_ID}`,
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'accept': 'application/json',
    'X-N8N-API-KEY': N8N_API_KEY,
    'Content-Length': Buffer.byteLength(body)
  }
};

console.log('Updating workflow "AdAgent - LinkedIn Post" (v2 — HTTP Request nodes)...');
console.log(`Target: https://${N8N_HOST}/api/v1/workflows/${WORKFLOW_ID}`);
console.log(`Nodes: ${workflow.nodes.length}`);

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log(`\nResponse Status: ${res.statusCode}`);

    try {
      const response = JSON.parse(data);
      if (res.statusCode === 200 || res.statusCode === 201) {
        console.log('SUCCESS! Workflow updated.');
        console.log(`  ID: ${response.id}`);
        console.log(`  Name: ${response.name}`);
        console.log(`  URL: https://${N8N_HOST}/workflow/${response.id}`);
        console.log(`  Active: ${response.active}`);
      } else {
        console.log('FAILED:', JSON.stringify(response, null, 2));
      }
    } catch (e) {
      console.log('Raw response:', data.substring(0, 2000));
    }
  });
});

req.on('error', (err) => {
  console.error('Request error:', err.message);
});

req.write(body);
req.end();
