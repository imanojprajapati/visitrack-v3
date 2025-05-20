import React, { createContext, useContext } from 'react';
import { message } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';

interface AppContextType {
  messageApi: MessageInstance | null;
}

const AppContext = createContext<AppContextType>({ messageApi: null });

export function useAppContext() {
  return useContext(AppContext);
}

export const AppContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messageApi, contextHolder] = message.useMessage();

  return (
    <AppContext.Provider value={{ messageApi }}>
      {contextHolder}
      {children}
    </AppContext.Provider>
  );
};
