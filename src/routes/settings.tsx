import { RouteObject } from 'react-router-dom';
import SettingsLayout from '../components/Settings/SettingsLayout';
import GitHubSettings from '../components/Settings/GitHubSettings';
import UserManagement from '../components/Settings/UserManagement';
import CursorSettings from '../components/Settings/CursorSettings';
import ToolSection from '../components/Codebase/ToolSection/ToolSection';

export const settingsRoutes: RouteObject[] = [
  {
    path: 'settings',
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
      },
      {
        path: 'cursor',
        element: <CursorSettings />
      },
      {
        path: 'codebase/cursor-extractor',
        element: <ToolSection files={[]} />
      }
    ]
  }
];

export default settingsRoutes;
