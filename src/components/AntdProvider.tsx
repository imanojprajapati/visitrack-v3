import { ReactNode } from 'react';
import { ConfigProvider } from 'antd';
import { StyleProvider } from '@ant-design/cssinjs';

interface AntdProviderProps {
  children: ReactNode;
}

export function AntdProvider({ children }: AntdProviderProps) {
  return (
    <StyleProvider hashPriority="high">
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#1890ff',
          },
        }}
      >
        {children}
      </ConfigProvider>
    </StyleProvider>
  );
}
