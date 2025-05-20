import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { ConfigProvider } from 'antd';
import { StyleProvider } from '@ant-design/cssinjs';
// Import dayjs
import dayjs from '../utils/dayjs';

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const isAdminPage = router.pathname.startsWith('/admin');

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 6,
        },
        components: {
          Layout: {
            bodyBg: '#f5f5f5',
            siderBg: '#ffffff',
          },
          Menu: {
            itemBg: '#ffffff',
            itemSelectedBg: '#e6f4ff',
            itemHoverBg: '#f5f5f5',
          },
        },
      }}
    >
      <StyleProvider hashPriority="high">
        <Head>
          <title>Visitrack - Event Management Platform</title>
          <meta name="description" content="Visitrack - Your comprehensive event management solution" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        {isAdminPage ? (
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
      </StyleProvider>
    </ConfigProvider>
  );
}

export default MyApp;