import React from 'react';
import './Input.css';

export default function Input({ label, ...props }) {
  return (
    <label className="ds-form-field">
      {label && <div className="ds-label">{label}</div>}
      <input className="ds-input" {...props} />
    </label>
  );
}
