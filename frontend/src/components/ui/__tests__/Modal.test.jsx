import React from 'react';
import { render, screen } from '@testing-library/react';
import Modal from '../Modal';

describe('Modal', () => {
  it('does not render when closed', () => {
    render(<Modal open={false} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('renders when open', () => {
    render(<Modal open={true} onClose={() => {}} title="Hi">Content</Modal>);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });
});
