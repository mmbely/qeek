const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export const syncRepository = async (
  repositoryName: string, 
  userId: string,
  accountId: string
) => {
  const response = await fetch(`${API_BASE_URL}/api/repository/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      repositoryName,
      userId,
      accountId
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to sync repository');
  }

  return response.json();
};
