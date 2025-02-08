export interface Message {
    id: string;
    content: string;
    timestamp: number;
    userId: string;
    status?: string;
    participants?: string[];
  }