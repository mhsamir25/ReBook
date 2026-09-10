import React from 'react';
import Button from './Button';

export default {
  title: 'UI/Button',
  component: Button,
};

export const Primary = () => <Button variant="primary">Primary Button</Button>;
export const Secondary = () => <Button variant="secondary">Secondary</Button>;
export const Ghost = () => <Button variant="ghost">Ghost</Button>;
export const Sizes = () => (
  <div style={{ display: 'flex', gap: 12 }}>
    <Button size="sm">Small</Button>
    <Button size="md">Medium</Button>
    <Button size="lg">Large</Button>
  </div>
);
