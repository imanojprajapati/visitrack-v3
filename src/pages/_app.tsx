import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { AppProvider } from '../components/AppProvider';
import { AuthProvider } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import { App as AntApp } from 'antd';

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const isAdminPage = router.pathname.startsWith('/admin');
  const isEventRegistrationPage = router.pathname.includes('/events/') && router.pathname.includes('/register');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const content = (
    <>
      <Head>
        <title>Visitrack - Event Management Platform</title>
        <meta name="description" content="Visitrack - Your comprehensive event management solution" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="shortcut icon" type="image/x-icon" href="/favicon.ico" />
      </Head>
      {isAdminPage || isEventRegistrationPage ? (
        <Component {...pageProps} />
      ) : (
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-grow pt-20">
            <Component {...pageProps} />
          </main>
          <Footer />
        </div>
      )}
    </>
  );

  if (!mounted) {
    return null;
  }

  // Only wrap with AuthProvider for admin pages
  if (isAdminPage) {
    return (
      <AntApp>
        <AppProvider>
          <AuthProvider>
            {content}
          </AuthProvider>
        </AppProvider>
      </AntApp>
    );
  }

  return (
    <AntApp>
      <AppProvider>
        {content}
      </AppProvider>
    </AntApp>
  );
}

export default MyApp;