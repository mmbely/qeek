export interface Account {
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    ownerId: string;
    settings: {
      githubRepository?: string;
      // Other account-wide settings can go here
    };
    members: {
      [key: string]: {
        role: 'admin' | 'member';
        joinedAt: Date;
      };
    };
  }