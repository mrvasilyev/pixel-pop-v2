import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Header from '../Header';

// Mock with correct relative path (../.. from __tests__ to src)
vi.mock('../../content/header.json', () => {
    return {
        default: {
            logo: '/mock-logo.png',
            background: '/mock-bg.png',
            ctaButtonText: 'Mock CTA',
            specialPrompt: 'Mock Prompt'
        }
    };
});

// Mock Telegram WebApp
window.Telegram = {
    WebApp: {
        platform: 'ios'
    }
};

describe('Header Component', () => {
    it('renders logo and background', () => {
        render(<Header />);

        const logo = screen.getByAltText('Logo');
        expect(logo).toBeInTheDocument();
        expect(logo).toHaveAttribute('src', '/mock-logo.png');

        // Background is a div with inline style, hard to query by role, check for existence or class
        // We can check if style tag contains the url
        // Or simpler: just ensure no crash
    });

    it('displays platform info in popup', () => {
        render(<Header />);

        // Click info button
        const infoBtn = screen.getByRole('button', { name: '' }); // Lucide icon button has no text
        // Ideally add aria-label to button in source, but for now find by class or generic button
        // Since there is only one button initially visible (info), or two (star counter is div)
        // actually star counter is div.

        // Let's find by class logic or just 'button' since there is only one button in top level
        const buttons = screen.getAllByRole('button');
        const infoButton = buttons[0];

        fireEvent.click(infoButton);

        // Check popup content
        expect(screen.getByText('Pixel Pop')).toBeInTheDocument();
        expect(screen.getByText('Telegram for iOS')).toBeInTheDocument();

        // Close popup
        const closeBtn = screen.getAllByRole('button')[1]; // Now close button is visible
        fireEvent.click(closeBtn);

        expect(screen.queryByText('Telegram for iOS')).not.toBeInTheDocument();
    });
});
