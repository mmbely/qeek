import { collection, getDocs, updateDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../../config/firebase';

const DEFAULT_ACCOUNT_ID = 'RnInDl1twWVwyWWMcEkB1sETtoq1';
const BATCH_SIZE = 500;

export async function migrateTicketsAddAccountId() {
  try {
    console.log('Starting ticket migration...');
    const ticketsRef = collection(db, 'tickets');
    const snapshot = await getDocs(ticketsRef);
    
    let migratedCount = 0;
    let currentBatch = writeBatch(db);
    let operationsInBatch = 0;

    for (const ticketDoc of snapshot.docs) {
      const ticket = ticketDoc.data();
      
      if (!ticket.accountId) {
        currentBatch.update(doc(db, 'tickets', ticketDoc.id), {
          accountId: DEFAULT_ACCOUNT_ID,
          updatedAt: Date.now()
        });
        
        operationsInBatch++;
        migratedCount++;

        if (operationsInBatch === BATCH_SIZE) {
          await currentBatch.commit();
          currentBatch = writeBatch(db);
          operationsInBatch = 0;
          console.log(`Committed batch of ${BATCH_SIZE} operations`);
        }
      }
    }

    if (operationsInBatch > 0) {
      await currentBatch.commit();
      console.log(`Committed final batch of ${operationsInBatch} operations`);
    }

    console.log(`Successfully migrated ${migratedCount} tickets`);
    return {
      success: true,
      migratedCount,
      message: `Successfully migrated ${migratedCount} tickets`
    };
  } catch (error) {
    console.error('Error migrating tickets:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to migrate tickets'
    };
  }
}

export async function verifyTicketMigration() {
  try {
    console.log('[Migration] Starting ticket verification...');
    const ticketsRef = collection(db, 'tickets');
    const snapshot = await getDocs(ticketsRef);
    
    const ticketsByAccount: Record<string, number> = {};
    const ticketsWithoutAccount: string[] = [];
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.accountId) {
        ticketsByAccount[data.accountId] = (ticketsByAccount[data.accountId] || 0) + 1;
      } else {
        ticketsWithoutAccount.push(doc.id);
      }
    });
    
    console.log('[Migration] Verification results:', {
      total: snapshot.docs.length,
      byAccount: ticketsByAccount,
      withoutAccount: ticketsWithoutAccount
    });
    
    return {
      success: ticketsWithoutAccount.length === 0,
      ticketsByAccount,
      ticketsWithoutAccount
    };
  } catch (error) {
    console.error('[Migration] Verification error:', error);
    throw error;
  }
}