import React from 'react';
import { render, screen } from '@testing-library/react';
import Input from '../Input';

describe('Input', () => {
  it('renders label and input', () => {
    render(<Input label="Email" />);
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });
});
