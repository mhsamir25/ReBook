import React from 'react';
import Avatar from './Avatar';

export default { title: 'UI/Avatar', component: Avatar };

export const Default = () => <Avatar alt="User" />;
export const WithImage = () => <Avatar src="/public/avatar.png" alt="Jane" size={48} />;
