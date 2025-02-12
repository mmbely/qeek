import { migrateTicketsAddAccountId } from './tickets/add-account-id';

export type MigrationResult = {
  success: boolean;
  migratedCount?: number;
  error?: string;
  message: string;
}

export const migrations = {
  tickets: {
    addAccountId: migrateTicketsAddAccountId
  }
} as const;

export async function runMigration(
  migrationName: keyof typeof migrations.tickets
): Promise<MigrationResult> {
  console.log(`Running migration: ${migrationName}`);
  
  try {
    switch (migrationName) {
      case 'addAccountId':
        return await migrations.tickets.addAccountId();
      default:
        throw new Error(`Unknown migration: ${migrationName}`);
    }
  } catch (error) {
    console.error(`Migration failed: ${migrationName}`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: `Migration failed: ${migrationName}`
    };
  }
}
