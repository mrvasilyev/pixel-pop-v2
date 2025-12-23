import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import StyleSelector from '../StyleSelector';

describe('StyleSelector Component', () => {
    it('renders styles section', () => {
        render(<StyleSelector />);

        expect(screen.getByText('Discover something new')).toBeInTheDocument();
        // Check for specific style titles from the hardcoded list
        expect(screen.getAllByText('Design a birthday invitation')[0]).toBeInTheDocument();
    });
});
