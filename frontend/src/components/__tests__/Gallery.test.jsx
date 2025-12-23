// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
import Gallery from '../Gallery';
import { generateImage, uploadImage } from '../../api/client';
import headerData from '../../content/header.json';

// Extend expect matchers manually
expect.extend(matchers);

// Ensure cleanup runs
afterEach(() => {
    cleanup();
});

// Mock API client
vi.mock('../../api/client', () => ({
    generateImage: vi.fn(),
    uploadImage: vi.fn(),
    fetchGenerations: vi.fn().mockResolvedValue([])
}));

// Mock hooks
vi.mock('../../hooks/useGallery', () => ({
    useGallery: vi.fn().mockReturnValue({
        data: null,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isLoading: false
    })
}));

// Mock useGeneration context
vi.mock('../../context/GenerationContext', () => ({
    useGeneration: vi.fn().mockReturnValue({
        isGenerating: false,
        loadingWord: 'Loading',
        dots: '...',
        previewUrl: null,
        startGeneration: vi.fn(),
        stopGeneration: vi.fn()
    })
}));

// Mock Photo Action callback capture
const mockTriggerPhotoAction = vi.fn();
let photoSelectedCallback = null;

vi.mock('../../hooks/usePhotoAction', () => ({
    usePhotoAction: (options) => {
        if (options?.onPhotoSelected) {
            photoSelectedCallback = options.onPhotoSelected;
        }
        return {
            triggerPhotoAction: mockTriggerPhotoAction,
            PhotoInputs: () => <div data-testid="photo-inputs" />
        };
    }
}));


describe('Gallery Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        photoSelectedCallback = null;
        if (typeof window !== 'undefined') {
            window.HTMLElement.prototype.scrollIntoView = vi.fn();
        }
    });

    it('renders empty state correctly', () => {
        render(<Gallery />);

        // Header
        expect(screen.getByText('My images')).toBeInTheDocument();

        // Empty State Content
        expect(screen.getByText('Start your journey')).toBeInTheDocument();

        // CTA Button with dynamic text
        expect(screen.getByRole('button', { name: headerData.ctaButtonText || "Try a Style" })).toBeInTheDocument();
    });

    it('handles interaction flow (CTA triggers photo action -> upload -> generate)', async () => {
        render(<Gallery />);

        // 1. Click CTA
        // We use queryAllByRole and take the last one or specific one if duplicates exist due to other components
        // But with cleanup, duplicates should be gone. 
        // If "Try a 80's style" is on screen, getByRole should find it.
        const ctaButton = screen.getByRole('button', { name: "Try a 80's style" });
        fireEvent.click(ctaButton);

        // Check if triggerPhotoAction was called
        expect(mockTriggerPhotoAction).toHaveBeenCalledWith("Try a 80's style");

        // 2. Simulate File Selection (Trigger callback)
        const mockFile = new File(['(⌐□_□)'], 'cool_selfie.png', { type: 'image/png' });

        // Mock API responses
        uploadImage.mockResolvedValue('https://example.com/uploaded-selfie.png');
        generateImage.mockResolvedValue({
            image_url: 'https://example.com/new-80s-image.png',
            metadata: { model: 'gpt-image-1.5' }
        });

        // Mock URL.createObjectURL
        global.URL.createObjectURL = vi.fn(() => 'blob:test');

        // Trigger the callback manually
        await act(async () => {
            if (photoSelectedCallback) {
                await photoSelectedCallback(mockFile);
            } else {
                throw new Error("photoSelectedCallback not captured!");
            }
        });

        // 3. Verify Upload
        expect(uploadImage).toHaveBeenCalledWith(mockFile);

        // 4. Verify Generation
        expect(generateImage).toHaveBeenCalledWith(
            expect.stringContaining('1980s studio portrait'), // Prompt matches partially or fully
            'header-special',
            'header-cta',
            { init_image_url: 'https://example.com/uploaded-selfie.png' }
        );
    });
});
