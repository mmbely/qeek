import type { BoardStatus, BacklogStatus } from './board';

// Use the union type directly instead of importing TicketStatus
export type TicketStatus = BoardStatus | BacklogStatus;

export type TicketPriority = 'low' | 'medium' | 'high';

export type TicketType = 'bug' | 'task' | 'story';

export interface Ticket {
    id: string;
    ticket_id: string;
    accountId: string;  // Add this field to tie tickets to accounts
    title: string;
    description: string;
    status: TicketStatus;
    priority: TicketPriority;
    assigneeId?: string;
    type: TicketType;
    createdBy: string;
    createdAt: number;
    updatedAt: number;
    order: number;
}
