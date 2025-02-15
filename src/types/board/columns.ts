import { Column, BacklogColumnsType, DevelopmentColumnsType } from './index';

export const COLUMN_STATUS_LABELS = {
  // Backlog statuses
  'BACKLOG_ICEBOX': 'Icebox',
  'BACKLOG_NEW': 'New',
  'BACKLOG_REFINED': 'Refined',
  'BACKLOG_DEV_NEXT': 'Next for Development',
  // Development statuses
  'SELECTED_FOR_DEV': 'Selected for Development',
  'IN_PROGRESS': 'In Progress',
  'READY_FOR_TESTING': 'Ready for Testing',
  'DEPLOYED': 'Deployed'
} as const;

export const backlogColumns: BacklogColumnsType = {
  'BACKLOG_ICEBOX': { title: COLUMN_STATUS_LABELS['BACKLOG_ICEBOX'], tickets: [] },
  'BACKLOG_NEW': { title: COLUMN_STATUS_LABELS['BACKLOG_NEW'], tickets: [] },
  'BACKLOG_REFINED': { title: COLUMN_STATUS_LABELS['BACKLOG_REFINED'], tickets: [] },
  'BACKLOG_DEV_NEXT': { title: COLUMN_STATUS_LABELS['BACKLOG_DEV_NEXT'], tickets: [] }
};

export const developmentColumns: DevelopmentColumnsType = {
  'SELECTED_FOR_DEV': { title: COLUMN_STATUS_LABELS['SELECTED_FOR_DEV'], tickets: [] },
  'IN_PROGRESS': { title: COLUMN_STATUS_LABELS['IN_PROGRESS'], tickets: [] },
  'READY_FOR_TESTING': { title: COLUMN_STATUS_LABELS['READY_FOR_TESTING'], tickets: [] },
  'DEPLOYED': { title: COLUMN_STATUS_LABELS['DEPLOYED'], tickets: [] }
};