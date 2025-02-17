const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export const syncRepository = async (repositoryName: string, userId: string) => {
  const response = await fetch(`${API_BASE_URL}/api/repository/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ repositoryName, userId }),
  });

  if (!response.ok) {
    throw new Error('Failed to start repository sync');
  }

  return response.json();
};
