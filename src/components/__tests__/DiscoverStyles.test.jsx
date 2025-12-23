import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import DiscoverStyles from '../DiscoverStyles';

describe('DiscoverStyles Component', () => {
    it('renders section header', () => {
        render(<DiscoverStyles />);
        expect(screen.getByText('Discover something new')).toBeInTheDocument();
    });
});
