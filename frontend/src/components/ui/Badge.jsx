import React from 'react';
import './Badge.css';

export default function Badge({ children, variant = 'sale' }) {
  return <span className={`ds-badge ds-badge-${variant}`}>{children}</span>;
}
