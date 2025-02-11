export interface Account {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    ownerId: string;
    settings: {
      githubRepository?: string;
      // Other account-wide settings can go here
    };
    members: {
      [userId: string]: {
        role: 'owner' | 'admin' | 'member';
        joinedAt: string;
      };
    };
  }