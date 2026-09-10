import React from 'react';
import './Avatar.css';

export default function Avatar({ src, alt = '', size = 40 }) {
  const style = { width: size, height: size };
  return (
    <div className="ds-avatar" style={style} title={alt}>
      {src ? <img src={src} alt={alt} /> : <span className="ds-avatar-initial">{alt?.[0]?.toUpperCase() || '?'}</span>}
    </div>
  );
}
