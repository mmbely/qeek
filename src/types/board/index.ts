import { Ticket } from '../ticket';

// Define all possible statuses
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

export interface Column {
  title: string;
  tickets: Ticket[];
}

export type DevelopmentColumnsType = Record<BoardStatus, Column>;
export type BacklogColumnsType = Record<BacklogStatus, Column>;

export * from './columns';