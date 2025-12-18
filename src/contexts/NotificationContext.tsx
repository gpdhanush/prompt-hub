import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface NotificationData {
  id: string;
  title: string;
  body: string;
  icon?: string;
  image?: string;
  link?: string;
  type?: string;
  data?: Record<string, any>;
  timestamp: Date;
}

interface NotificationContextType {
  currentNotification: NotificationData | null;
  showNotification: (notification: Omit<NotificationData, 'id' | 'timestamp'>) => void;
  dismissNotification: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [currentNotification, setCurrentNotification] = useState<NotificationData | null>(null);

  const showNotification = useCallback((notification: Omit<NotificationData, 'id' | 'timestamp'>) => {
    const notificationData: NotificationData = {
      ...notification,
      id: `notification-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
    };
    setCurrentNotification(notificationData);
  }, []);

  const dismissNotification = useCallback(() => {
    setCurrentNotification(null);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        currentNotification,
        showNotification,
        dismissNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}

