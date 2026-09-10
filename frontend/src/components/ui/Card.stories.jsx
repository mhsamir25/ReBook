import React from 'react';
import Card from './Card';

export default { title: 'UI/Card', component: Card };

export const Default = () => (
  <Card title="Card title" footer={<span>Footer</span>}>
    <p>This is a card body with some content.</p>
  </Card>
);
