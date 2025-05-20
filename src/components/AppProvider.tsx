import React from 'react';
import { ConfigProvider } from 'antd';
import { StyleProvider } from '@ant-design/cssinjs';
import { AppContextProvider } from '../context/AppContext';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 6,
        },
      }}
    >
      <StyleProvider hashPriority="high">
        <AppContextProvider>
          {children}
        </AppContextProvider>
      </StyleProvider>
    </ConfigProvider>
  );
};
