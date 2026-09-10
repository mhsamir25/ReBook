import React from 'react';
import './Modal.css';

export default function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="ds-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="ds-modal" onClick={(e) => e.stopPropagation()}>
        {title && <div className="ds-modal-title"><strong>{title}</strong></div>}
        <div className="ds-modal-body">{children}</div>
        <div className="ds-modal-actions">
          <button className="ds-btn ds-btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
