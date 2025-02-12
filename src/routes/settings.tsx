import { RouteObject } from 'react-router-dom';
import { SettingsLayout, GitHubSettings, UserManagement } from '../components/Settings';

export const settingsRoutes: RouteObject[] = [
  {
    path: '/settings',
    element: <SettingsLayout />,
    children: [
      {
        index: true,
        element: <GitHubSettings />
      },
      {
        path: 'github',
        element: <GitHubSettings />
      },
      {
        path: 'users',
        element: <UserManagement />
      }
    ]
  }
];

export default settingsRoutes;
