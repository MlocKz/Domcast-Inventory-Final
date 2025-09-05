import React, { useEffect } from 'react';
import { X as XIcon, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';

interface NotificationProps {
  notification: { show: boolean; message: string; type: string };
  setNotification: (notification: { show: boolean; message: string; type: string }) => void;
}

export function Notification({ notification, setNotification }: NotificationProps) {
  useEffect(() => {
    if (notification.show) {
      const timer = setTimeout(() => {
        setNotification({ ...notification, show: false });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification, setNotification]);

  if (!notification.show) return null;

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="h-5 w-5" />;
      case 'error':
        return <AlertCircle className="h-5 w-5" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return <AlertCircle className="h-5 w-5" />;
    }
  };

  const getStyles = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-success text-success-foreground border-success';
      case 'error':
        return 'bg-destructive text-destructive-foreground border-destructive';
      case 'warning':
        return 'bg-warning text-warning-foreground border-warning';
      default:
        return 'bg-info text-info-foreground border-info';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 animate-scale-in">
      <div className={`
        flex items-start space-x-3 p-4 rounded-lg shadow-lg border max-w-md
        ${getStyles()}
      `}>
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">
            {notification.message}
          </p>
        </div>
        <button
          onClick={() => setNotification({ ...notification, show: false })}
          className="flex-shrink-0 ml-4 hover:opacity-80 transition-opacity"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}