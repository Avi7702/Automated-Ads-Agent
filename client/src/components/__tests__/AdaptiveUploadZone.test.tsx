// @vitest-environment jsdom
/**
 * AdaptiveUploadZone Component Tests
 *
 * Covers:
 * 1. Empty state rendering (feature highlights, CTA)
 * 2. Compact mode rendering (drag & drop zone)
 * 3. Drag & drop interactions
 * 4. File validation (type, size)
 * 5. Metadata form dialog
 * 6. Upload progress & error states
 * 7. Edge cases
 */
import React from 'react';
import { vi, describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test-utils';
import '@testing-library/jest-dom';
import { AdaptiveUploadZone } from '../AdaptiveUploadZone';

// ============================================
// TEST FIXTURES
// ============================================

const defaultProps = {
  patterns: [] as unknown[],
  onUpload: vi.fn(),
  isUploading: false,
  uploadProgress: 0,
  uploadStatus: undefined as 'pending' | 'scanning' | 'extracting' | 'completed' | 'failed' | undefined,
  uploadError: undefined as string | undefined,
};

function renderComponent(overrides: Partial<typeof defaultProps> = {}) {
  return render(<AdaptiveUploadZone {...defaultProps} {...overrides} />);
}

// Helper to create a mock File
function createMockFile(
  name: string,
  sizeInBytes: number,
  type: string,
): File {
  const content = new Uint8Array(sizeInBytes);
  return new File([content], name, { type });
}

// ============================================
// 1. EMPTY STATE TESTS
// ============================================

describe('AdaptiveUploadZone - Empty State', () => {
  it('renders the empty state when patterns array is empty', () => {
    renderComponent({ patterns: [] });
    expect(screen.getByText('Learn from Your Winners')).toBeInTheDocument();
  });

  it('shows the upload CTA button', () => {
    renderComponent({ patterns: [] });
    expect(screen.getByRole('button', { name: /Upload Your First Ad/i })).toBeInTheDocument();
  });

  it('displays feature highlight cards', () => {
    renderComponent({ patterns: [] });
    expect(screen.getByText('Layout Patterns')).toBeInTheDocument();
    expect(screen.getByText('Color Psychology')).toBeInTheDocument();
    expect(screen.getByText('Hook Patterns')).toBeInTheDocument();
  });

  it('shows descriptive text for the upload zone', () => {
    renderComponent({ patterns: [] });
    expect(
      screen.getByText(/Upload high-performing ads to extract success patterns/i),
    ).toBeInTheDocument();
  });
});

// ============================================
// 2. COMPACT MODE TESTS
// ============================================

describe('AdaptiveUploadZone - Compact Mode', () => {
  const compactProps = { patterns: [{ id: 1 }] };

  it('renders the compact upload zone when patterns exist', () => {
    renderComponent(compactProps);
    expect(screen.getByText('Upload a winning ad')).toBeInTheDocument();
  });

  it('shows file type and size instructions', () => {
    renderComponent(compactProps);
    expect(screen.getByText(/JPG, PNG, WebP, GIF/)).toBeInTheDocument();
    expect(screen.getByText(/Max 5MB/)).toBeInTheDocument();
  });

  it('shows privacy notice', () => {
    renderComponent(compactProps);
    expect(screen.getByText(/AI extracts patterns only/)).toBeInTheDocument();
  });

  it('does NOT show empty-state content when patterns exist', () => {
    renderComponent(compactProps);
    expect(screen.queryByText('Learn from Your Winners')).not.toBeInTheDocument();
    expect(screen.queryByText('Upload Your First Ad')).not.toBeInTheDocument();
  });
});

// ============================================
// 3. DRAG & DROP TESTS
// ============================================

describe('AdaptiveUploadZone - Drag & Drop', () => {
  const compactProps = { patterns: [{ id: 1 }] };

  it('changes text on drag over', () => {
    renderComponent(compactProps);
    const zone = screen.getByText('Upload a winning ad').closest('div[class*="cursor-pointer"]');
    expect(zone).toBeTruthy();

    fireEvent.dragOver(zone!, { dataTransfer: { files: [] } });

    expect(screen.getByText('Drop your ad here')).toBeInTheDocument();
  });

  it('reverts text on drag leave', () => {
    renderComponent(compactProps);
    const zone = screen.getByText('Upload a winning ad').closest('div[class*="cursor-pointer"]');
    expect(zone).toBeTruthy();

    fireEvent.dragOver(zone!, { dataTransfer: { files: [] } });
    expect(screen.getByText('Drop your ad here')).toBeInTheDocument();

    fireEvent.dragLeave(zone!, { dataTransfer: { files: [] } });
    expect(screen.getByText('Upload a winning ad')).toBeInTheDocument();
  });

  it('opens metadata form on valid file drop', async () => {
    renderComponent(compactProps);
    const zone = screen.getByText('Upload a winning ad').closest('div[class*="cursor-pointer"]');
    const file = createMockFile('test-ad.jpg', 1024, 'image/jpeg');

    // Mock URL.createObjectURL
    const mockUrl = 'blob:http://localhost/fake';
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue(mockUrl);

    fireEvent.drop(zone!, {
      dataTransfer: {
        files: [file],
      },
    });

    await waitFor(() => {
      expect(screen.getByText('Describe Your Winning Ad')).toBeInTheDocument();
    });

    createObjectURLSpy.mockRestore();
  });

  it('does NOT open metadata form for invalid file type', () => {
    renderComponent(compactProps);
    const zone = screen.getByText('Upload a winning ad').closest('div[class*="cursor-pointer"]');
    const file = createMockFile('document.pdf', 1024, 'application/pdf');

    fireEvent.drop(zone!, {
      dataTransfer: {
        files: [file],
      },
    });

    expect(screen.queryByText('Describe Your Winning Ad')).not.toBeInTheDocument();
  });

  it('does NOT open metadata form for file exceeding 5MB', () => {
    renderComponent(compactProps);
    const zone = screen.getByText('Upload a winning ad').closest('div[class*="cursor-pointer"]');
    const file = createMockFile('large.jpg', 6 * 1024 * 1024, 'image/jpeg');

    fireEvent.drop(zone!, {
      dataTransfer: {
        files: [file],
      },
    });

    expect(screen.queryByText('Describe Your Winning Ad')).not.toBeInTheDocument();
  });
});

// ============================================
// 4. METADATA FORM TESTS
// ============================================

describe('AdaptiveUploadZone - Metadata Form', () => {
  function openMetadataForm() {
    renderComponent({ patterns: [{ id: 1 }] });
    const zone = screen.getByText('Upload a winning ad').closest('div[class*="cursor-pointer"]');
    const file = createMockFile('my-ad.png', 2048, 'image/png');
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:http://localhost/fake');

    fireEvent.drop(zone!, {
      dataTransfer: { files: [file] },
    });
  }

  it('pre-fills pattern name from filename (without extension)', async () => {
    openMetadataForm();

    await waitFor(() => {
      const input = screen.getByPlaceholderText(/High-Converting Product Hero/i) as HTMLInputElement;
      expect(input.value).toBe('my-ad');
    });
  });

  it('shows category and platform selects', async () => {
    openMetadataForm();

    await waitFor(() => {
      expect(screen.getByText('Category *')).toBeInTheDocument();
      expect(screen.getByText('Platform *')).toBeInTheDocument();
    });
  });

  it('shows optional industry and performance tier fields', async () => {
    openMetadataForm();

    await waitFor(() => {
      expect(screen.getByText('Industry')).toBeInTheDocument();
      expect(screen.getByText(/Performance Tier/i)).toBeInTheDocument();
    });
  });

  it('disables Extract Patterns button when name is empty', async () => {
    openMetadataForm();

    await waitFor(() => {
      expect(screen.getByText('Describe Your Winning Ad')).toBeInTheDocument();
    });

    // Clear the pre-filled name
    const input = screen.getByPlaceholderText(/High-Converting Product Hero/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '' } });

    const submitButton = screen.getByRole('button', { name: /Extract Patterns/i });
    expect(submitButton).toBeDisabled();
  });

  it('calls onUpload with file and metadata on submit', async () => {
    const onUpload = vi.fn();
    render(
      <AdaptiveUploadZone
        {...defaultProps}
        patterns={[{ id: 1 }]}
        onUpload={onUpload}
      />,
    );

    const zone = screen.getByText('Upload a winning ad').closest('div[class*="cursor-pointer"]');
    const file = createMockFile('hero-ad.jpg', 2048, 'image/jpeg');
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:http://localhost/fake');

    fireEvent.drop(zone!, {
      dataTransfer: { files: [file] },
    });

    await waitFor(() => {
      expect(screen.getByText('Describe Your Winning Ad')).toBeInTheDocument();
    });

    const submitButton = screen.getByRole('button', { name: /Extract Patterns/i });
    fireEvent.click(submitButton);

    expect(onUpload).toHaveBeenCalledTimes(1);
    expect(onUpload).toHaveBeenCalledWith(
      expect.any(File),
      expect.objectContaining({
        name: 'hero-ad',
        category: 'product_showcase',
        platform: 'general',
      }),
    );
  });

  it('closes dialog and resets state on cancel', async () => {
    openMetadataForm();

    await waitFor(() => {
      expect(screen.getByText('Describe Your Winning Ad')).toBeInTheDocument();
    });

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText('Describe Your Winning Ad')).not.toBeInTheDocument();
    });
  });
});

// ============================================
// 5. UPLOAD PROGRESS & ERROR STATES
// ============================================

describe('AdaptiveUploadZone - Upload Progress', () => {
  it('shows uploading overlay with progress', () => {
    renderComponent({
      patterns: [{ id: 1 }],
      isUploading: true,
      uploadProgress: 50,
    });

    expect(screen.getByText('Analyzing patterns...')).toBeInTheDocument();
  });

  it('shows scanning status when progress is low', () => {
    renderComponent({
      patterns: [{ id: 1 }],
      isUploading: true,
      uploadProgress: 10,
    });

    expect(screen.getByText('Scanning for privacy...')).toBeInTheDocument();
  });

  it('shows extracting status at mid progress', () => {
    renderComponent({
      patterns: [{ id: 1 }],
      isUploading: true,
      uploadProgress: 50,
    });

    expect(screen.getByText('Extracting visual patterns...')).toBeInTheDocument();
  });

  it('shows saving status at high progress', () => {
    renderComponent({
      patterns: [{ id: 1 }],
      isUploading: true,
      uploadProgress: 80,
    });

    expect(screen.getByText('Saving to your library...')).toBeInTheDocument();
  });
});

describe('AdaptiveUploadZone - Error State', () => {
  it('shows error overlay when uploadError is provided', () => {
    renderComponent({
      patterns: [{ id: 1 }],
      isUploading: false,
      uploadError: 'Image analysis failed due to network error',
    });

    expect(screen.getByText('Upload Failed')).toBeInTheDocument();
    expect(screen.getByText('Image analysis failed due to network error')).toBeInTheDocument();
  });

  it('shows Try Again button in error state', () => {
    renderComponent({
      patterns: [{ id: 1 }],
      isUploading: false,
      uploadError: 'Something went wrong',
    });

    expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument();
  });

  it('does NOT show error overlay when uploading', () => {
    renderComponent({
      patterns: [{ id: 1 }],
      isUploading: true,
      uploadProgress: 50,
      uploadError: 'Previous error',
    });

    expect(screen.queryByText('Upload Failed')).not.toBeInTheDocument();
  });
});

// ============================================
// 6. EDGE CASES
// ============================================

describe('AdaptiveUploadZone - Edge Cases', () => {
  it('handles empty dataTransfer.files on drop', () => {
    renderComponent({ patterns: [{ id: 1 }] });
    const zone = screen.getByText('Upload a winning ad').closest('div[class*="cursor-pointer"]');

    fireEvent.drop(zone!, {
      dataTransfer: { files: [] },
    });

    expect(screen.queryByText('Describe Your Winning Ad')).not.toBeInTheDocument();
  });

  it('accepts all valid file types (jpeg, png, webp, gif)', async () => {
    const validTypes = [
      { name: 'test.jpg', type: 'image/jpeg' },
      { name: 'test.png', type: 'image/png' },
      { name: 'test.webp', type: 'image/webp' },
      { name: 'test.gif', type: 'image/gif' },
    ];

    for (const { name, type } of validTypes) {
      const { unmount } = renderComponent({ patterns: [{ id: 1 }] });
      const zone = screen.getByText('Upload a winning ad').closest('div[class*="cursor-pointer"]');
      const file = createMockFile(name, 1024, type);
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:http://localhost/fake');

      fireEvent.drop(zone!, {
        dataTransfer: { files: [file] },
      });

      await waitFor(() => {
        expect(screen.getByText('Describe Your Winning Ad')).toBeInTheDocument();
      });

      unmount();
    }
  });

  it('renders file input with correct accept attribute', () => {
    renderComponent({ patterns: [{ id: 1 }] });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();
    expect(fileInput.accept).toBe('image/jpeg,image/png,image/webp,image/gif');
  });

  it('shows preview image in metadata form for dropped file', async () => {
    renderComponent({ patterns: [{ id: 1 }] });
    const zone = screen.getByText('Upload a winning ad').closest('div[class*="cursor-pointer"]');
    const file = createMockFile('preview.jpg', 2048, 'image/jpeg');
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:http://localhost/preview');

    fireEvent.drop(zone!, {
      dataTransfer: { files: [file] },
    });

    await waitFor(() => {
      const previewImg = screen.getByAltText('Preview');
      expect(previewImg).toBeInTheDocument();
      expect(previewImg).toHaveAttribute('src', 'blob:http://localhost/preview');
    });
  });
});
