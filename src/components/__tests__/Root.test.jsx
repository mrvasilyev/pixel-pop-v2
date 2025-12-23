import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Root from '../Root';

// Mock child components
vi.mock('../../App', () => ({ default: () => <div data-testid="mock-app">Mock App</div> }));
vi.mock('./SafeAreaDebug', () => ({ default: () => <div>Debug</div> }));

// Mock Telegram SDK
vi.mock('@telegram-apps/sdk-react', () => {
    const mockMaybe = {
        mount: vi.fn().mockResolvedValue(true),
        isMounted: vi.fn().mockReturnValue(false),
        bindCssVars: vi.fn(),
    };

    const mockViewport = {
        ...mockMaybe,
        expand: vi.fn(),
        height: 800,
        on: vi.fn(),
    };

    return {
        init: vi.fn(),
        mockTelegramEnv: vi.fn(),
        miniApp: { ...mockMaybe, ready: vi.fn() },
        themeParams: { ...mockMaybe },
        viewport: mockViewport,
        swipeBehavior: { ...mockMaybe, disableVerticalSwipe: vi.fn() },
    };
});

describe('Root Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset window mocks if needed
        window.Telegram = { WebApp: {} };
    });

    it('renders loading state initially', () => {
        render(<Root />);
        expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('initializes SDK and renders App', async () => {
        render(<Root />);

        // Wait for SDK init effect to finish and state to update
        await waitFor(() => {
            expect(screen.getByTestId('mock-app')).toBeInTheDocument();
        }, { timeout: 3000 });
    });
});
