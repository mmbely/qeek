import React from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { Users, Github, Settings, User, Shield, Code2, FileText, LucideIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface NavItem {
  label: string;
  path?: string;
  icon?: LucideIcon;
  type?: 'divider' | 'header';
}

export default function SettingsLayout() {
  const { user } = useAuth();
  const location = useLocation();

  const navItems: NavItem[] = [
    {
      label: 'Profile',
      path: '/settings/profile',
      icon: User
    },
    {
      label: 'GitHub Integration',
      path: '/settings/github',
      icon: Github
    },
    {
      label: 'User Management',
      path: '/settings/users',
      icon: Users
    },
    // Only show admin section to super admin
    ...(user?.uid === 'RnInDl1twWVwyWWMcEkB1sETtoq1' ? [{
      label: 'Admin',
      path: '/settings/admin',
      icon: Shield
    }] : []),
    {
      label: 'Cursor Integration',
      path: '/settings/cursor',
      icon: Code2
    }
  ];

  return (
    <div className="flex h-full">
      {/* Settings Sidebar */}
      <div className="w-64 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e2132]">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <Settings className="h-5 w-5" />
            Settings
          </h2>
        </div>
        <nav className="p-2">
          {navItems.map((item, index) => {
            if (item.type === 'divider') {
              return <div key={index} className="my-2 border-t border-gray-200 dark:border-gray-700" />;
            }

            if (item.type === 'header') {
              return (
                <div key={index} className="px-3 py-2 text-sm font-semibold text-gray-500 dark:text-gray-400">
                  {item.label}
                </div>
              );
            }

            if (!item.path || !item.icon) {
              return null;
            }

            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-md mb-1
                  ${isActive 
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }
                `}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}