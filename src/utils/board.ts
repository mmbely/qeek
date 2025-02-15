import { Ticket, TicketStatus } from '../types/ticket';
import { 
  Column, 
  DevelopmentColumnsType, 
  BacklogColumnsType,
  COLUMN_STATUS_LABELS 
} from '../types/board';

type ColumnsType = DevelopmentColumnsType | BacklogColumnsType;
type OrganizedColumns = { [key in TicketStatus]?: Column };

export const organizeTickets = (tickets: Ticket[], mode: 'development' | 'backlog'): ColumnsType => {
  // First pass: organize tickets into columns
  const organized = tickets.reduce((acc, ticket) => {
    if (!acc[ticket.status]) {
      acc[ticket.status] = {
        title: COLUMN_STATUS_LABELS[ticket.status],
        tickets: []
      };
    }
    acc[ticket.status]!.tickets.push(ticket);
    return acc;
  }, {} as OrganizedColumns);

  // Sort tickets within each column by order
  Object.values(organized).forEach(column => {
    if (column) {
      column.tickets.sort((a, b) => (a.order || 0) - (b.order || 0));
    }
  });

  // Return the appropriate column structure based on mode
  if (mode === 'development') {
    const developmentColumns: DevelopmentColumnsType = {
      SELECTED_FOR_DEV: {
        title: COLUMN_STATUS_LABELS.SELECTED_FOR_DEV,
        tickets: organized.SELECTED_FOR_DEV?.tickets || []
      },
      IN_PROGRESS: {
        title: COLUMN_STATUS_LABELS.IN_PROGRESS,
        tickets: organized.IN_PROGRESS?.tickets || []
      },
      READY_FOR_TESTING: {
        title: COLUMN_STATUS_LABELS.READY_FOR_TESTING,
        tickets: organized.READY_FOR_TESTING?.tickets || []
      },
      DEPLOYED: {
        title: COLUMN_STATUS_LABELS.DEPLOYED,
        tickets: organized.DEPLOYED?.tickets || []
      }
    };
    return developmentColumns;
  } else {
    const backlogColumns: BacklogColumnsType = {
      BACKLOG_ICEBOX: {
        title: COLUMN_STATUS_LABELS.BACKLOG_ICEBOX,
        tickets: organized.BACKLOG_ICEBOX?.tickets || []
      },
      BACKLOG_NEW: {
        title: COLUMN_STATUS_LABELS.BACKLOG_NEW,
        tickets: organized.BACKLOG_NEW?.tickets || []
      },
      BACKLOG_REFINED: {
        title: COLUMN_STATUS_LABELS.BACKLOG_REFINED,
        tickets: organized.BACKLOG_REFINED?.tickets || []
      },
      BACKLOG_DEV_NEXT: {
        title: COLUMN_STATUS_LABELS.BACKLOG_DEV_NEXT,
        tickets: organized.BACKLOG_DEV_NEXT?.tickets || []
      }
    };
    return backlogColumns;
  }
};