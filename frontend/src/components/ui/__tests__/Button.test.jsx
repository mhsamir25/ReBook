import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from '../Button';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick', async () => {
    const user = userEvent.setup();
    const handle = vi.fn();
    render(<Button onClick={handle}>Go</Button>);
    await user.click(screen.getByText('Go'));
    expect(handle).toHaveBeenCalled();
  });
});
