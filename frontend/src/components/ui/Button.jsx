import React from 'react';
import './Button.css';

export default function Button({ children, variant = 'primary', size = 'md', onClick, ...props }) {
  const cls = `ds-btn ds-btn-${variant} ds-btn-${size}`;
  return (
    <button className={cls} onClick={onClick} {...props}>
      {children}
    </button>
  );
}
