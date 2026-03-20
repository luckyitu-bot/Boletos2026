import React from 'react';
import { useAuth } from '../AuthContext';
import AdminFiles from './AdminFiles';
import CustomerFiles from './CustomerFiles';

export default function Files() {
  const { user } = useAuth();

  if (user?.role === 'admin') {
    return <AdminFiles />;
  }

  return <CustomerFiles />;
}
