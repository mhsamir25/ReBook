import React from 'react';
import Badge from './Badge';

export default { title: 'UI/Badge', component: Badge };

export const Sale = () => <Badge variant="sale">Sale</Badge>;
export const Rent = () => <Badge variant="rent">Rent</Badge>;
export const Success = () => <Badge variant="success">Good</Badge>;
