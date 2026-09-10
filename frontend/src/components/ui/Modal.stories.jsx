import React from 'react';
import Modal from './Modal';
import { useState } from 'react';

export default { title: 'UI/Modal', component: Modal };

export const Basic = () => {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button onClick={() => setOpen(true)}>Open</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Modal Title">
        <p>Modal content goes here.</p>
      </Modal>
    </div>
  );
};
