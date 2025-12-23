import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TopStyles from '../TopStyles';

// Mock import.meta.glob
// Since we can't easily mock import.meta.glob in strict unit tests without build tool support, 
// and the component relies on it for data.
// We will mock the module behavior effectively if possible, but import.meta is special.
// STRATEGY: For this simple test, we will assume Vitest handles glob correctly and checks if Renders "Try a style..." 
// If data is empty (no files found in test env), strictly checking "Try a style" is still valid for component mount.

describe('TopStyles Component', () => {
    it('renders section header', () => {
        render(<TopStyles />);
        expect(screen.getByText('Try a style on an image')).toBeInTheDocument();
    });
});
