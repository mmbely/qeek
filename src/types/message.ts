export interface Message {
    id?: string;
    content: string;
    timestamp: number;
    userId: string;
    channelId: string;
    accountId: string;
    status?: string;
    participants?: string[];
  }