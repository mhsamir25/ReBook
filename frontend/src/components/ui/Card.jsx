import React from 'react';
import './Card.css';

export default function Card({ children, title, footer }) {
  return (
    <div className="ds-card">
      {title && <div className="ds-card-title"><strong>{title}</strong></div>}
      <div className="ds-card-body">{children}</div>
      {footer && <div className="ds-card-footer">{footer}</div>}
    </div>
  );
}
