import { TicketStatus } from '../ticket';
import { DevelopmentColumnsType, BacklogColumnsType } from './index';

export const developmentColumns: DevelopmentColumnsType = {
  'SELECTED_FOR_DEV': { title: 'Selected for Development', tickets: [] },
  'IN_PROGRESS': { title: 'In Progress', tickets: [] },
  'READY_FOR_TESTING': { title: 'Ready for Testing', tickets: [] },
  'DEPLOYED': { title: 'Deployed', tickets: [] }
};

export const backlogColumns: BacklogColumnsType = {
  'BACKLOG_ICEBOX': { title: 'Icebox', tickets: [] },
  'BACKLOG_NEW': { title: 'New', tickets: [] },
  'BACKLOG_REFINED': { title: 'Refined', tickets: [] },
  'BACKLOG_DEV_NEXT': { title: 'Next for Development', tickets: [] }
};

export const COLUMN_STATUS_LABELS: Record<TicketStatus, string> = {
  // Development statuses
  'SELECTED_FOR_DEV': 'Selected for Development',
  'IN_PROGRESS': 'In Progress',
  'READY_FOR_TESTING': 'Ready for Testing',
  'DEPLOYED': 'Deployed',
  
  // Backlog statuses
  'BACKLOG_ICEBOX': 'Icebox',
  'BACKLOG_NEW': 'New',
  'BACKLOG_REFINED': 'Refined',
  'BACKLOG_DEV_NEXT': 'Next for Development'
} as const;