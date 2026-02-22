// @ts-nocheck
/**
 * Agent Plan Types
 * Shared interfaces for the Agent Mode pipeline:
 *   GET /api/agent/suggestions
 *   POST /api/agent/plan/preview
 *   POST /api/agent/plan/execute
 *   POST /api/agent/plan/revise
 */

export interface AgentSuggestion {
  id: string;
  type: 'content_series' | 'single_post' | 'campaign' | 'gap_fill';
  title: string;
  description: string;
  products: { id: number; name: string }[];
  platform: string;
  confidence: number; // 0-100
  reasoning: string;
  tags: string[];
}

export interface ClarifyingQuestion {
  id: string;
  question: string;
  type: 'select' | 'text' | 'multiselect';
  options?: string[];
  required: boolean;
}

export interface PlanBrief {
  id: string;
  userId?: string;
  status?: string; // draft, approved, executing, completed, failed, cancelled
  objective: string;
  cadence: string; // e.g. "3 posts/week for 2 weeks"
  platform: string;
  contentMix: { type: string; count: number }[];
  approvalScore: number; // 0-100
  scoreBreakdown: { criterion: string; score: number; max: number }[];
  estimatedCost: { credits: number; currency: string };
  posts: PlanPost[];
  createdAt: string;
}

export interface PlanPost {
  index: number;
  productIds: number[];
  prompt: string;
  platform: string;
  scheduledDate?: string;
  contentType: 'image' | 'carousel' | 'video';
  hookAngle: string;
}

export interface ExecutionStep {
  index: number;
  action: string;
  status: 'pending' | 'running' | 'complete' | 'failed';
  result?: Record<string, unknown>;
}
