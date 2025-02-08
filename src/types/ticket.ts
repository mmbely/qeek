export interface Ticket {
    id?: string;
    title: string;
    description: string;
    status: 'BACKLOG' | 'SELECTED_FOR_DEV' | 'IN_PROGRESS' | 'READY_FOR_TESTING' | 'DEPLOYED';
    priority: 'low' | 'medium' | 'high';
    assigneeId?: string;
    createdAt: number;
    updatedAt?: number;
    createdBy: string;
    order: number;
}