export class GeminiError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'GeminiError';
  }
}

export class GeminiTimeoutError extends GeminiError {
  constructor(message = 'Gemini API request timed out') {
    super(message, 'TIMEOUT');
    this.name = 'GeminiTimeoutError';
  }
}

export class GeminiRateLimitError extends GeminiError {
  constructor(public readonly retryAfter?: number) {
    super('Gemini API rate limit exceeded', 'RATE_LIMIT');
    this.name = 'GeminiRateLimitError';
  }
}

export class GeminiAuthError extends GeminiError {
  constructor() {
    super('Invalid or missing Gemini API key', 'AUTH_ERROR');
    this.name = 'GeminiAuthError';
  }
}

export class GeminiContentError extends GeminiError {
  constructor(message = 'No image data in response') {
    super(message, 'NO_CONTENT');
    this.name = 'GeminiContentError';
  }
}
