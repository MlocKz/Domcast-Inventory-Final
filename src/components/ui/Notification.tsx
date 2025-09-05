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
        return 'bg-green-500 text-white border-green-600';
      case 'error':
        return 'bg-red-500 text-white border-red-600';
      case 'warning':
        return 'bg-yellow-500 text-white border-yellow-600';
      default:
        return 'bg-blue-500 text-white border-blue-600';
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
          className="flex-shrink-0 ml-4 text-white hover:text-gray-200 transition-colors"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}