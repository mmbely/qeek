export interface Ticket {
    id?: string;
    title: string;
    description: string;
    status: 'BACKLOG' | 'SELECTED_FOR_DEV' | 'IN_PROGRESS' | 'READY_FOR_TESTING' | 'DEPLOYED';
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    assigneeId?: string;
    createdAt: number;
    updatedAt: number;
  }