import React from 'react';
import { theme, commonStyles, typography, layout, animations } from '../../styles';

interface ChatHeaderProps {
  title: string;
  subtitle: string;
  className?: string;
  actions?: React.ReactNode;
}

export default function ChatHeader({ 
  title, 
  subtitle, 
  className = '',
  actions
}: ChatHeaderProps) {
  return (
    <header className={`
      ${commonStyles.header.wrapper}
      ${className}
    `}>
      <div className={commonStyles.header.container}>
        <div className={commonStyles.header.titleWrapper}>
          <h2 className={commonStyles.header.title}>{title}</h2>
          <p className={commonStyles.header.subtitle}>{subtitle}</p>
        </div>
        {actions && (
          <div className={commonStyles.header.actions}>
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}