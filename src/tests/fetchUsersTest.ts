import { fetchUsers } from '../services/chat';

async function testFetchUsers() {
  try {
    const companyId = 'default'; // Replace with an actual company ID
    console.log(`Fetching users for company: ${companyId}`);
    const users = await fetchUsers(companyId);
    console.log('Fetched users:', users);
  } catch (error) {
    console.error('Error fetching users:', error);
  }
}

testFetchUsers();