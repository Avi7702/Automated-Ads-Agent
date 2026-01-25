/**
 * Unit tests for Generation DTO Transformer
 *
 * Tests the toGenerationDTO and toGenerationDTOArray functions
 * that transform database Generation models into API-friendly DTOs.
 */

import { describe, it, expect } from '@jest/globals';
import { toGenerationDTO, toGenerationDTOArray } from '../dto/generationDTO';
import { Generation } from '@shared/schema';

describe('Generation DTO Transformer', () => {
  // Base generation object with all required fields
  const baseGen: Partial<Generation> = {
    id: '123-test-id',
    userId: 'user-1',
    prompt: 'test prompt',
    originalImagePaths: [],
    resolution: '2K',
    model: 'gemini-3-pro-image',
    aspectRatio: '1:1',
    status: 'completed',
    parentGenerationId: null,
    editPrompt: null,
    editCount: 0,
    createdAt: new Date('2026-01-25T12:00:00Z'),
    updatedAt: new Date('2026-01-25T12:00:00Z'),
    conversationHistory: null,
    imagePath: null,
  };

  describe('toGenerationDTO', () => {
    it('transforms Cloudinary URLs without modification', () => {
      const gen = {
        ...baseGen,
        generatedImagePath: 'https://res.cloudinary.com/test-cloud/image/upload/v123/test.png',
      } as Generation;

      const dto = toGenerationDTO(gen);

      expect(dto.imageUrl).toBe('https://res.cloudinary.com/test-cloud/image/upload/v123/test.png');
    });

    it('prepends / to local paths', () => {
      const gen = {
        ...baseGen,
        generatedImagePath: 'attached_assets/generations/results/test-image.png',
      } as Generation;

      const dto = toGenerationDTO(gen);

      expect(dto.imageUrl).toBe('/attached_assets/generations/results/test-image.png');
    });

    it('handles http URLs (not just https)', () => {
      const gen = {
        ...baseGen,
        generatedImagePath: 'http://example.com/image.png',
      } as Generation;

      const dto = toGenerationDTO(gen);

      expect(dto.imageUrl).toBe('http://example.com/image.png');
    });

    it('falls back to imagePath if generatedImagePath is null', () => {
      const gen = {
        ...baseGen,
        generatedImagePath: null,
        imagePath: 'fallback/path/image.png',
      } as Generation;

      const dto = toGenerationDTO(gen);

      expect(dto.imageUrl).toBe('/fallback/path/image.png');
    });

    it('handles empty string imageUrl when both paths are null', () => {
      const gen = {
        ...baseGen,
        generatedImagePath: null,
        imagePath: null,
      } as Generation;

      const dto = toGenerationDTO(gen);

      expect(dto.imageUrl).toBe('/');
    });

    it('sets canEdit to true when conversationHistory exists', () => {
      const gen = {
        ...baseGen,
        generatedImagePath: 'test.png',
        conversationHistory: [
          { role: 'user', parts: [{ text: 'test' }] }
        ],
      } as Generation;

      const dto = toGenerationDTO(gen);

      expect(dto.canEdit).toBe(true);
    });

    it('sets canEdit to false when conversationHistory is null', () => {
      const gen = {
        ...baseGen,
        generatedImagePath: 'test.png',
        conversationHistory: null,
      } as Generation;

      const dto = toGenerationDTO(gen);

      expect(dto.canEdit).toBe(false);
    });

    it('sets canEdit to false when conversationHistory is empty array', () => {
      const gen = {
        ...baseGen,
        generatedImagePath: 'test.png',
        conversationHistory: [],
      } as Generation;

      const dto = toGenerationDTO(gen);

      expect(dto.canEdit).toBe(false);
    });

    it('handles null originalImagePaths by defaulting to empty array', () => {
      const gen = {
        ...baseGen,
        generatedImagePath: 'test.png',
        originalImagePaths: null as any,
      } as Generation;

      const dto = toGenerationDTO(gen);

      expect(dto.originalImagePaths).toEqual([]);
    });

    it('preserves all other fields correctly', () => {
      const gen = {
        ...baseGen,
        generatedImagePath: 'test.png',
        editPrompt: 'make it darker',
        editCount: 3,
        parentGenerationId: 'parent-123',
      } as Generation;

      const dto = toGenerationDTO(gen);

      expect(dto.id).toBe('123-test-id');
      expect(dto.userId).toBe('user-1');
      expect(dto.prompt).toBe('test prompt');
      expect(dto.resolution).toBe('2K');
      expect(dto.model).toBe('gemini-3-pro-image');
      expect(dto.aspectRatio).toBe('1:1');
      expect(dto.status).toBe('completed');
      expect(dto.editPrompt).toBe('make it darker');
      expect(dto.editCount).toBe(3);
      expect(dto.parentGenerationId).toBe('parent-123');
      expect(dto.createdAt).toEqual(new Date('2026-01-25T12:00:00Z'));
      expect(dto.updatedAt).toEqual(new Date('2026-01-25T12:00:00Z'));
    });
  });

  describe('toGenerationDTOArray', () => {
    it('transforms empty array correctly', () => {
      const gens: Generation[] = [];
      const dtos = toGenerationDTOArray(gens);

      expect(dtos).toEqual([]);
    });

    it('transforms single item array', () => {
      const gens = [
        {
          ...baseGen,
          generatedImagePath: 'test-image-1.png',
        }
      ] as Generation[];

      const dtos = toGenerationDTOArray(gens);

      expect(dtos).toHaveLength(1);
      expect(dtos[0].imageUrl).toBe('/test-image-1.png');
    });

    it('transforms multiple items correctly', () => {
      const gens = [
        {
          ...baseGen,
          id: 'gen-1',
          generatedImagePath: 'image-1.png',
        },
        {
          ...baseGen,
          id: 'gen-2',
          generatedImagePath: 'https://cloudinary.com/image-2.png',
        },
        {
          ...baseGen,
          id: 'gen-3',
          generatedImagePath: 'image-3.png',
          conversationHistory: [{ role: 'user', parts: [] }],
        },
      ] as Generation[];

      const dtos = toGenerationDTOArray(gens);

      expect(dtos).toHaveLength(3);
      expect(dtos[0].id).toBe('gen-1');
      expect(dtos[0].imageUrl).toBe('/image-1.png');
      expect(dtos[0].canEdit).toBe(false);

      expect(dtos[1].id).toBe('gen-2');
      expect(dtos[1].imageUrl).toBe('https://cloudinary.com/image-2.png');
      expect(dtos[1].canEdit).toBe(false);

      expect(dtos[2].id).toBe('gen-3');
      expect(dtos[2].imageUrl).toBe('/image-3.png');
      expect(dtos[2].canEdit).toBe(true);
    });

    it('maintains order of input array', () => {
      const gens = [
        { ...baseGen, id: 'first', generatedImagePath: 'a.png' },
        { ...baseGen, id: 'second', generatedImagePath: 'b.png' },
        { ...baseGen, id: 'third', generatedImagePath: 'c.png' },
      ] as Generation[];

      const dtos = toGenerationDTOArray(gens);

      expect(dtos[0].id).toBe('first');
      expect(dtos[1].id).toBe('second');
      expect(dtos[2].id).toBe('third');
    });
  });

  describe('Edge Cases', () => {
    it('handles undefined generatedImagePath', () => {
      const gen = {
        ...baseGen,
        generatedImagePath: undefined as any,
      } as Generation;

      const dto = toGenerationDTO(gen);

      expect(dto.imageUrl).toBe('/');
    });

    it('handles very long Cloudinary URLs', () => {
      const longUrl = 'https://res.cloudinary.com/abc/image/upload/v1234567890/very/long/path/to/generated/image/with/many/segments/and/transformations/w_800,h_600,c_fill/test-image.png';
      const gen = {
        ...baseGen,
        generatedImagePath: longUrl,
      } as Generation;

      const dto = toGenerationDTO(gen);

      expect(dto.imageUrl).toBe(longUrl);
    });

    it('handles paths with special characters', () => {
      const gen = {
        ...baseGen,
        generatedImagePath: 'attached_assets/gen-123_test-image (copy).png',
      } as Generation;

      const dto = toGenerationDTO(gen);

      expect(dto.imageUrl).toBe('/attached_assets/gen-123_test-image (copy).png');
    });
  });
});
