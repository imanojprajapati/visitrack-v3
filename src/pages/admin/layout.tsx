import React from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';

// Dynamically import MainLayout with SSR disabled to avoid hydration issues
const MainLayout = dynamic(
  () => import('@/components/admin/MainLayout').then((mod) => {
    // Ensure the module is loaded before rendering
    return mod.default;
  }),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    ),
  }
);

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();

  // Add authentication check here if needed
  // const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  return <MainLayout>{children}</MainLayout>;
}
