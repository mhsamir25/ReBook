import React from 'react';
import { render, screen } from '@testing-library/react';
import Card from '../Card';

describe('Card', () => {
  it('renders title and body', () => {
    render(<Card title="T">Body</Card>);
    expect(screen.getByText('T')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
  });
});
