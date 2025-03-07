import React, { FC } from 'react';
import { AlertTriangle } from 'lucide-react';
import { theme } from '../../styles/theme';

export type NotificationType = 'success' | 'error';

export interface NotificationProps {
  type: NotificationType;
  message: string;
}

const Notification: FC<NotificationProps> = ({ type, message }) => {
  const isSuccess = type === 'success';

  const SuccessIcon = () => (
    <svg className={`h-5 w-5 text-[${theme.colors.shared.notification[type].text.light}] dark:text-[${theme.colors.shared.notification[type].text.dark}]`} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  );

  return (
    <div className={`mb-6 bg-[${theme.colors.shared.notification[type].background.light}] dark:bg-[${theme.colors.shared.notification[type].background.dark}] rounded-lg p-4 border border-[${theme.colors.shared.notification[type].border.light}] dark:border-[${theme.colors.shared.notification[type].border.dark}]`}>
      <div className="flex items-center">
        <div className="flex-shrink-0">
          {isSuccess ? (
            <SuccessIcon />
          ) : (
            <AlertTriangle className={`h-5 w-5 text-[${theme.colors.shared.notification[type].text.light}] dark:text-[${theme.colors.shared.notification[type].text.dark}]`} />
          )}
        </div>
        <div className="ml-3">
          <p className={`text-sm font-medium text-[${theme.colors.shared.notification[type].text.light}] dark:text-[${theme.colors.shared.notification[type].text.dark}]`}>
            {message}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Notification;
