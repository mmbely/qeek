import { Ticket } from '../ticket';

// Define status types
export type BoardStatus = 
  | 'SELECTED_FOR_DEV'
  | 'IN_PROGRESS'
  | 'READY_FOR_TESTING'
  | 'DEPLOYED';

export type BacklogStatus = 
  | 'BACKLOG_ICEBOX'
  | 'BACKLOG_NEW'
  | 'BACKLOG_REFINED'
  | 'BACKLOG_DEV_NEXT';

export type TicketStatus = BoardStatus | BacklogStatus;

export interface Column {
  title: string;
  tickets: Ticket[];
}

export type BacklogColumnsType = Record<BacklogStatus, Column>;
export type DevelopmentColumnsType = Record<BoardStatus, Column>;

export * from './columns';