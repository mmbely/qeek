export interface Ticket {
    id?: string;
    title: string;
    description: string;
    status: TicketStatus;
    priority: 'low' | 'medium' | 'high';
    assigneeId?: string;
    createdAt: number;
    updatedAt?: number;
    createdBy: string;
    order: number;
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
