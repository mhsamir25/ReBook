import React from 'react';
import { render, screen } from '@testing-library/react';
import Avatar from '../Avatar';

describe('Avatar', () => {
  it('shows initial when no src', () => {
    render(<Avatar alt="bob" />);
    expect(screen.getByText('B')).toBeInTheDocument();
  });
});
