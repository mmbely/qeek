import { Timestamp } from 'firebase/firestore';

export interface MessageReaction {
  emoji: string;
  users: string[];  // array of userIds who reacted with this emoji
}

export interface Message {
    id?: string;
    content: string;
    timestamp: number | Timestamp;
    userId: string;
    channelId: string;
    accountId: string;
    status?: string;
    participants?: string[];
    reactions?: { [key: string]: MessageReaction };  // emoji as key
    edited?: boolean;
    editedAt?: number;
  }