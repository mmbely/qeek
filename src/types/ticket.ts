import { BoardStatus, BacklogStatus } from './board';

// Use the same status types from board
export type TicketStatus = BoardStatus | BacklogStatus;

export type TicketPriority = 'low' | 'medium' | 'high';

export interface Ticket {
    id: string;
    ticket_id: string;
    accountId: string;  // Add this field to tie tickets to accounts
    title: string;
    description: string;
    status: TicketStatus;
    priority: TicketPriority;
    assigneeId?: string;
    createdBy: string;
    createdAt: number;
    updatedAt: number;
    order: number;
}
