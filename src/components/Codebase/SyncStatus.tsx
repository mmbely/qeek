import { Button } from '../ui/button';
import { Settings, Loader2, AlertTriangle } from 'lucide-react';

interface SyncStatusProps {
  syncStatus: {
    status: 'idle' | 'syncing' | 'completed' | 'failed';
    lastSynced?: Date;
    error?: string;
  };
  onSync: () => void;
  onSettings: () => void;
}

export default function SyncStatus({ syncStatus, onSync, onSettings }: SyncStatusProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <div className="flex items-center gap-2">
        {syncStatus.status === 'syncing' && (
          <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
        )}
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {syncStatus.status === 'syncing' ? 'Syncing...' : 'Sync complete'}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={onSync} disabled={syncStatus.status === 'syncing'}>
          Sync Now
        </Button>
        <Button onClick={onSettings}>Settings</Button>
      </div>
    </div>
  );
}