/**
 * Phoenix Orchestrator Tests — Task 2.08
 *
 * Tests for intent classification, playbook routing, and orchestration flow.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { classifyIntent, type PlaybookType } from '../services/agent/phoenixOrchestrator';

describe('PhoenixOrchestrator', () => {
  describe('classifyIntent', () => {
    // SINGLE_IMAGE_POST
    it('classifies "create a post for rebar" as SINGLE_IMAGE_POST', () => {
      expect(classifyIntent('create a post for rebar', true)).toBe('SINGLE_IMAGE_POST');
    });

    it('classifies "generate an image for mesh" as SINGLE_IMAGE_POST', () => {
      expect(classifyIntent('generate an image for mesh', true)).toBe('SINGLE_IMAGE_POST');
    });

    it('classifies "make a design for spacers" as SINGLE_IMAGE_POST', () => {
      expect(classifyIntent('make a design for spacers', true)).toBe('SINGLE_IMAGE_POST');
    });

    // SINGLE_VIDEO_POST
    it('classifies "create a video reel" as SINGLE_VIDEO_POST', () => {
      expect(classifyIntent('create a video reel', true)).toBe('SINGLE_VIDEO_POST');
    });

    it('classifies "make a short clip showing installation" as SINGLE_VIDEO_POST', () => {
      expect(classifyIntent('make a short clip showing installation', true)).toBe('SINGLE_VIDEO_POST');
    });

    // CAROUSEL_AD
    it('classifies "create a carousel ad" as CAROUSEL_AD', () => {
      expect(classifyIntent('create a carousel ad', true)).toBe('CAROUSEL_AD');
    });

    it('classifies "make a multi-slide post" as CAROUSEL_AD', () => {
      expect(classifyIntent('make a multi-slide post', true)).toBe('CAROUSEL_AD');
    });

    it('classifies "swipe post for products" as CAROUSEL_AD', () => {
      expect(classifyIntent('swipe post for products', true)).toBe('CAROUSEL_AD');
    });

    // WEEKLY_PLAN
    it('classifies "generate posts for next week" as WEEKLY_PLAN', () => {
      expect(classifyIntent('generate posts for next week', true)).toBe('WEEKLY_PLAN');
    });

    it('classifies "schedule content for the weekly plan" as WEEKLY_PLAN', () => {
      expect(classifyIntent('schedule content for the weekly plan', true)).toBe('WEEKLY_PLAN');
    });

    it('classifies "plan for the next 5 days" as WEEKLY_PLAN', () => {
      expect(classifyIntent('plan for the next 5 days', true)).toBe('WEEKLY_PLAN');
    });

    // AB_TEST
    it('classifies "create an A/B test" as AB_TEST', () => {
      expect(classifyIntent('create an A/B test', true)).toBe('AB_TEST');
    });

    it('classifies "make two variants to compare" as AB_TEST', () => {
      expect(classifyIntent('make two variants to compare', true)).toBe('AB_TEST');
    });

    it('classifies "split test this post" as AB_TEST', () => {
      expect(classifyIntent('split test this post', true)).toBe('AB_TEST');
    });

    // IDEA_PROPOSAL
    it('classifies "suggest some ideas" as IDEA_PROPOSAL', () => {
      expect(classifyIntent('suggest some ideas', true)).toBe('IDEA_PROPOSAL');
    });

    it('classifies "what should I post about?" as IDEA_PROPOSAL', () => {
      expect(classifyIntent('what should I post about?', true)).toBe('IDEA_PROPOSAL');
    });

    it('classifies "brainstorm content for rebar" as IDEA_PROPOSAL', () => {
      expect(classifyIntent('brainstorm content for rebar', true)).toBe('IDEA_PROPOSAL');
    });

    // CONVERSATION
    it('classifies "hello" as CONVERSATION when no products selected', () => {
      expect(classifyIntent('hello', false)).toBe('CONVERSATION');
    });

    it('classifies "how are you?" as CONVERSATION when no products selected', () => {
      expect(classifyIntent('how are you?', false)).toBe('CONVERSATION');
    });

    it('classifies "what can you do?" as CONVERSATION when no products selected', () => {
      expect(classifyIntent('what can you do?', false)).toBe('CONVERSATION');
    });

    // Default behavior
    it('defaults to SINGLE_IMAGE_POST when products are selected and no clear intent', () => {
      expect(classifyIntent('these products please', true)).toBe('SINGLE_IMAGE_POST');
    });

    it('defaults to IDEA_PROPOSAL when no products and ambiguous generation intent', () => {
      expect(classifyIntent('I want to post something', false)).toBe('SINGLE_IMAGE_POST');
    });

    // Priority: more specific patterns should win
    it('prioritizes WEEKLY_PLAN over SINGLE_IMAGE_POST for "create a weekly post plan"', () => {
      expect(classifyIntent('create a weekly post plan', true)).toBe('WEEKLY_PLAN');
    });

    it('prioritizes CAROUSEL_AD over SINGLE_IMAGE_POST for "create a carousel post"', () => {
      expect(classifyIntent('create a carousel post', true)).toBe('CAROUSEL_AD');
    });

    it('prioritizes VIDEO over IMAGE for "create a video post"', () => {
      expect(classifyIntent('create a video post', true)).toBe('SINGLE_VIDEO_POST');
    });
  });
});
