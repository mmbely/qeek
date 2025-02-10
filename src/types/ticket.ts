export interface Ticket {
    id?: string;           // Firestore document ID
    ticket_id: string;     // Human readable ID (e.g., Q-1, Q-2)
    title: string;
    description: string;
    status: TicketStatus;
    priority: 'low' | 'medium' | 'high';
    assigneeId?: string;
    createdAt: number;
    updatedAt?: number;
    createdBy: string;
    order: number;
    key?: string;
}

export type TicketStatus = 
  | 'BACKLOG_ICEBOX' 
  | 'BACKLOG_NEW' 
  | 'BACKLOG_REFINED' 
  | 'BACKLOG_DEV_NEXT'
  | 'SELECTED_FOR_DEV'
  | 'IN_PROGRESS'
  | 'READY_FOR_TESTING'
  | 'DEPLOYED';
