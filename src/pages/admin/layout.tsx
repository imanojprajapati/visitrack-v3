import React from 'react';
import { useRouter } from 'next/router';
import type { ReactNode } from 'react';
import MainLayout from '../../components/admin/MainLayout';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();

  // Add authentication check here if needed
  // const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  return <MainLayout>{children}</MainLayout>;
}
