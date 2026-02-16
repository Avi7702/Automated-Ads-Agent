import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ReactNode } from 'react';
import {
  StudioProvider,
  useStudioContext,
  studioReducer,
  initialStudioState,
  StudioState,
} from '../StudioContext';

// ============================================
// Test Wrapper
// ============================================

const createWrapper = (initialState?: Partial<StudioState>) => {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <StudioProvider initialState={initialState}>{children}</StudioProvider>;
  };
};

// ============================================
// StudioProvider Tests (15 tests)
// ============================================

describe('StudioProvider', () => {
  it('provides initial state', () => {
    const { result } = renderHook(() => useStudioContext(), {
      wrapper: createWrapper(),
    });

    expect(result.current.state).toEqual(initialStudioState);
  });

  it('allows custom initial state', () => {
    const customState = { prompt: 'Custom prompt', platform: 'Instagram' };
    const { result } = renderHook(() => useStudioContext(), {
      wrapper: createWrapper(customState),
    });

    expect(result.current.state.prompt).toBe('Custom prompt');
    expect(result.current.state.platform).toBe('Instagram');
  });

  it('provides dispatch function', () => {
    const { result } = renderHook(() => useStudioContext(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.dispatch).toBe('function');
  });

  it('updates state when dispatch is called', () => {
    const { result } = renderHook(() => useStudioContext(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.dispatch({ type: 'SET_PROMPT', prompt: 'New prompt' });
    });

    expect(result.current.state.prompt).toBe('New prompt');
  });

  it('renders children correctly', () => {
    const { result } = renderHook(() => useStudioContext(), {
      wrapper: createWrapper(),
    });

    expect(result.current).toBeDefined();
  });
});

describe('useStudioContext', () => {
  it('throws when used outside provider', () => {
    // Suppress error output for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useStudioContext());
    }).toThrow('useStudioContext must be used within a StudioProvider');

    consoleSpy.mockRestore();
  });
});

// ============================================
// studioReducer Tests (35 tests)
// ============================================

describe('studioReducer', () => {
  describe('Generation Actions', () => {
    it('SET_GENERATION_STATE updates generationState', () => {
      const result = studioReducer(initialStudioState, {
        type: 'SET_GENERATION_STATE',
        state: 'generating',
      });
      expect(result.generationState).toBe('generating');
    });

    it('SET_GENERATED_IMAGE sets image, id, and state', () => {
      const result = studioReducer(initialStudioState, {
        type: 'SET_GENERATED_IMAGE',
        image: 'http://example.com/image.jpg',
        id: 'gen-123',
      });
      expect(result.generatedImage).toBe('http://example.com/image.jpg');
      expect(result.generationId).toBe('gen-123');
      expect(result.generationState).toBe('result');
    });

    it('CLEAR_GENERATION resets generation state', () => {
      const state: StudioState = {
        ...initialStudioState,
        generationState: 'result',
        generatedImage: 'http://example.com/image.jpg',
        generationId: 'gen-123',
      };
      const result = studioReducer(state, { type: 'CLEAR_GENERATION' });
      expect(result.generationState).toBe('idle');
      expect(result.generatedImage).toBeNull();
      expect(result.generationId).toBeNull();
    });
  });

  describe('Product Actions', () => {
    const mockProduct = {
      id: 'prod-1',
      name: 'Test Product',
      cloudinaryUrl: 'http://example.com/product.jpg',
    } as any;

    it('SELECT_PRODUCT adds product to selection', () => {
      const result = studioReducer(initialStudioState, {
        type: 'SELECT_PRODUCT',
        product: mockProduct,
      });
      expect(result.selectedProducts).toHaveLength(1);
      expect(result.selectedProducts[0]).toEqual(mockProduct);
    });

    it('SELECT_PRODUCT does not add duplicate products', () => {
      const state: StudioState = {
        ...initialStudioState,
        selectedProducts: [mockProduct],
      };
      const result = studioReducer(state, {
        type: 'SELECT_PRODUCT',
        product: mockProduct,
      });
      expect(result.selectedProducts).toHaveLength(1);
    });

    it('DESELECT_PRODUCT removes product from selection', () => {
      const state: StudioState = {
        ...initialStudioState,
        selectedProducts: [mockProduct],
      };
      const result = studioReducer(state, {
        type: 'DESELECT_PRODUCT',
        productId: 'prod-1',
      });
      expect(result.selectedProducts).toHaveLength(0);
    });

    it('CLEAR_PRODUCTS empties product selection', () => {
      const state: StudioState = {
        ...initialStudioState,
        selectedProducts: [mockProduct],
      };
      const result = studioReducer(state, { type: 'CLEAR_PRODUCTS' });
      expect(result.selectedProducts).toHaveLength(0);
    });

    it('SET_PRODUCTS replaces entire selection', () => {
      const products = [mockProduct, { ...mockProduct, id: 'prod-2' }] as any[];
      const result = studioReducer(initialStudioState, {
        type: 'SET_PRODUCTS',
        products,
      });
      expect(result.selectedProducts).toHaveLength(2);
    });
  });

  describe('Template Actions', () => {
    const mockTemplate = {
      id: 'template-1',
      name: 'Test Template',
    } as any;

    it('SELECT_TEMPLATE sets selected template', () => {
      const result = studioReducer(initialStudioState, {
        type: 'SELECT_TEMPLATE',
        template: mockTemplate,
      });
      expect(result.selectedTemplate).toEqual(mockTemplate);
    });

    it('CLEAR_TEMPLATE removes selected template', () => {
      const state: StudioState = {
        ...initialStudioState,
        selectedTemplate: mockTemplate,
      };
      const result = studioReducer(state, { type: 'CLEAR_TEMPLATE' });
      expect(result.selectedTemplate).toBeNull();
    });
  });

  describe('Upload Actions', () => {
    const mockUpload = {
      id: 'upload-1',
      previewUrl: 'http://example.com/upload.jpg',
      status: 'confirmed',
    } as any;

    it('SET_UPLOADS replaces all uploads', () => {
      const uploads = [mockUpload];
      const result = studioReducer(initialStudioState, {
        type: 'SET_UPLOADS',
        uploads,
      });
      expect(result.tempUploads).toEqual(uploads);
    });

    it('ADD_UPLOAD appends an upload', () => {
      const result = studioReducer(initialStudioState, {
        type: 'ADD_UPLOAD',
        upload: mockUpload,
      });
      expect(result.tempUploads).toHaveLength(1);
      expect(result.tempUploads[0]).toEqual(mockUpload);
    });

    it('UPDATE_UPLOAD modifies specific upload', () => {
      const state: StudioState = {
        ...initialStudioState,
        tempUploads: [mockUpload],
      };
      const result = studioReducer(state, {
        type: 'UPDATE_UPLOAD',
        id: 'upload-1',
        updates: { status: 'processing' },
      });
      expect(result.tempUploads[0]?.status).toBe('processing');
    });

    it('REMOVE_UPLOAD deletes specific upload', () => {
      const state: StudioState = {
        ...initialStudioState,
        tempUploads: [mockUpload],
      };
      const result = studioReducer(state, {
        type: 'REMOVE_UPLOAD',
        id: 'upload-1',
      });
      expect(result.tempUploads).toHaveLength(0);
    });

    it('CLEAR_UPLOADS empties all uploads', () => {
      const state: StudioState = {
        ...initialStudioState,
        tempUploads: [mockUpload],
      };
      const result = studioReducer(state, { type: 'CLEAR_UPLOADS' });
      expect(result.tempUploads).toHaveLength(0);
    });
  });

  describe('Prompt Actions', () => {
    it('SET_PROMPT updates prompt', () => {
      const result = studioReducer(initialStudioState, {
        type: 'SET_PROMPT',
        prompt: 'New creative prompt',
      });
      expect(result.prompt).toBe('New creative prompt');
    });

    it('SET_SUGGESTION updates suggestion and prompt', () => {
      const suggestion = {
        id: 'sug-1',
        prompt: 'Suggested prompt text',
        reasoning: 'This would work because...',
      };
      const result = studioReducer(initialStudioState, {
        type: 'SET_SUGGESTION',
        suggestion,
      });
      expect(result.selectedSuggestion).toEqual(suggestion);
      expect(result.prompt).toBe('Suggested prompt text');
    });

    it('SET_SUGGESTION with null clears suggestion but keeps prompt', () => {
      const state: StudioState = {
        ...initialStudioState,
        selectedSuggestion: { id: '1', prompt: 'test' },
        prompt: 'existing prompt',
      };
      const result = studioReducer(state, {
        type: 'SET_SUGGESTION',
        suggestion: null,
      });
      expect(result.selectedSuggestion).toBeNull();
      expect(result.prompt).toBe('existing prompt');
    });
  });

  describe('Output Settings Actions', () => {
    it('SET_PLATFORM updates platform', () => {
      const result = studioReducer(initialStudioState, {
        type: 'SET_PLATFORM',
        platform: 'Instagram',
      });
      expect(result.platform).toBe('Instagram');
    });

    it('SET_ASPECT_RATIO updates aspectRatio', () => {
      const result = studioReducer(initialStudioState, {
        type: 'SET_ASPECT_RATIO',
        aspectRatio: '1080x1080',
      });
      expect(result.aspectRatio).toBe('1080x1080');
    });

    it('SET_RESOLUTION updates resolution', () => {
      const result = studioReducer(initialStudioState, {
        type: 'SET_RESOLUTION',
        resolution: '4K',
      });
      expect(result.resolution).toBe('4K');
    });
  });

  describe('Mode Actions', () => {
    it('SET_IDEABANK_MODE updates ideaBankMode', () => {
      const result = studioReducer(initialStudioState, {
        type: 'SET_IDEABANK_MODE',
        mode: 'guided',
      });
      expect(result.ideaBankMode).toBe('guided');
    });

    it('SET_GENERATION_MODE updates generationMode', () => {
      const result = studioReducer(initialStudioState, {
        type: 'SET_GENERATION_MODE',
        mode: 'template',
      });
      expect(result.generationMode).toBe('template');
    });

    it('SET_TEMPLATE_FOR_MODE updates selectedTemplateForMode', () => {
      const template = { id: 't1', name: 'Template' } as any;
      const result = studioReducer(initialStudioState, {
        type: 'SET_TEMPLATE_FOR_MODE',
        template,
      });
      expect(result.selectedTemplateForMode).toEqual(template);
    });

    it('SET_RECIPE updates generationRecipe', () => {
      const recipe = { id: 'r1', steps: [] } as any;
      const result = studioReducer(initialStudioState, {
        type: 'SET_RECIPE',
        recipe,
      });
      expect(result.generationRecipe).toEqual(recipe);
    });
  });

  describe('Copy Actions', () => {
    it('SET_GENERATED_COPY updates generatedCopy', () => {
      const result = studioReducer(initialStudioState, {
        type: 'SET_GENERATED_COPY',
        copy: 'Amazing ad copy for your product!',
      });
      expect(result.generatedCopy).toBe('Amazing ad copy for your product!');
    });
  });

  describe('Reset and Load Actions', () => {
    it('RESET returns to initial state', () => {
      const modifiedState: StudioState = {
        ...initialStudioState,
        prompt: 'Modified',
        platform: 'Instagram',
        generationState: 'result',
      };
      const result = studioReducer(modifiedState, { type: 'RESET' });
      expect(result).toEqual(initialStudioState);
    });

    it('LOAD_FROM_HISTORY merges payload into state', () => {
      const payload = {
        prompt: 'History prompt',
        generatedImage: 'http://example.com/history.jpg',
      };
      const result = studioReducer(initialStudioState, {
        type: 'LOAD_FROM_HISTORY',
        payload,
      });
      expect(result.prompt).toBe('History prompt');
      expect(result.generatedImage).toBe('http://example.com/history.jpg');
      // Other values unchanged
      expect(result.platform).toBe(initialStudioState.platform);
    });
  });

  describe('Default case', () => {
    it('returns current state for unknown actions', () => {
      const result = studioReducer(initialStudioState, {
        type: 'UNKNOWN_ACTION' as any,
      });
      expect(result).toEqual(initialStudioState);
    });
  });
});

// ============================================
// Integration Tests (5 tests)
// ============================================

describe('StudioContext Integration', () => {
  it('handles full generation workflow', () => {
    const { result } = renderHook(() => useStudioContext(), {
      wrapper: createWrapper(),
    });

    // Select product
    act(() => {
      result.current.dispatch({
        type: 'SELECT_PRODUCT',
        product: { id: '1', name: 'Product' } as any,
      });
    });

    // Set prompt
    act(() => {
      result.current.dispatch({ type: 'SET_PROMPT', prompt: 'Generate ad' });
    });

    // Start generating
    act(() => {
      result.current.dispatch({ type: 'SET_GENERATION_STATE', state: 'generating' });
    });

    // Complete generation
    act(() => {
      result.current.dispatch({
        type: 'SET_GENERATED_IMAGE',
        image: 'http://result.jpg',
        id: 'gen-1',
      });
    });

    expect(result.current.state.generationState).toBe('result');
    expect(result.current.state.generatedImage).toBe('http://result.jpg');
  });

  it('handles upload workflow', () => {
    const { result } = renderHook(() => useStudioContext(), {
      wrapper: createWrapper(),
    });

    // Add upload
    act(() => {
      result.current.dispatch({
        type: 'ADD_UPLOAD',
        upload: { id: 'u1', status: 'pending' } as any,
      });
    });

    // Update upload status
    act(() => {
      result.current.dispatch({
        type: 'UPDATE_UPLOAD',
        id: 'u1',
        updates: { status: 'confirmed' },
      });
    });

    expect(result.current.state.tempUploads[0]?.status).toBe('confirmed');
  });

  it('preserves state across multiple dispatches', () => {
    const { result } = renderHook(() => useStudioContext(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.dispatch({ type: 'SET_PROMPT', prompt: 'Test' });
    });

    act(() => {
      result.current.dispatch({ type: 'SET_PLATFORM', platform: 'Facebook' });
    });

    expect(result.current.state.prompt).toBe('Test');
    expect(result.current.state.platform).toBe('Facebook');
  });

  it('handles complex mode switching', () => {
    const { result } = renderHook(() => useStudioContext(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.dispatch({ type: 'SET_IDEABANK_MODE', mode: 'guided' });
      result.current.dispatch({ type: 'SET_GENERATION_MODE', mode: 'template' });
    });

    expect(result.current.state.ideaBankMode).toBe('guided');
    expect(result.current.state.generationMode).toBe('template');
  });

  it('clears all state on reset', () => {
    const { result } = renderHook(() => useStudioContext(), {
      wrapper: createWrapper(),
    });

    // Modify multiple state values
    act(() => {
      result.current.dispatch({ type: 'SET_PROMPT', prompt: 'Modified' });
      result.current.dispatch({ type: 'SET_PLATFORM', platform: 'TikTok' });
      result.current.dispatch({
        type: 'SELECT_PRODUCT',
        product: { id: '1' } as any,
      });
    });

    // Reset
    act(() => {
      result.current.dispatch({ type: 'RESET' });
    });

    expect(result.current.state).toEqual(initialStudioState);
  });
});
