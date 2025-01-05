/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

exports.api = functions.https.onRequest((request, response) => {
  return cors(request, response, function() {
    console.log('Function invoked with method:', request.method);
    console.log('Request headers:', request.headers);
    console.log('Request body:', request.body);

    if (request.method === 'OPTIONS') {
      // Send response to OPTIONS requests
      response.set('Access-Control-Allow-Methods', 'GET, POST');
      response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      response.set('Access-Control-Max-Age', '3600');
      response.status(204).send('');
      return;
    }

    if (request.method !== 'POST') {
      return response.status(405).send('Method Not Allowed');
    }

    // Verify Firebase ID token
    if (!request.headers.authorization ||
        !request.headers.authorization.startsWith('Bearer ')) {
      console.error('No Authorization header or incorrect format');
      return response.status(403).send('Unauthorized');
    }
    const idToken = request.headers.authorization.split('Bearer ')[1];
    admin.auth().verifyIdToken(idToken)
      .then((decodedToken) => {
        console.log('Token verified for user:', decodedToken.uid);

        const { companyId } = request.body;

        if (!companyId) {
          return response.status(400).send('Company ID is required');
        }

        return admin.database().ref('users')
          .orderByChild('companyId')
          .equalTo(companyId)
          .once('value');
      })
      .then((usersSnapshot) => {
        const users = usersSnapshot.val();
        console.log('Users fetched:', users);
        return response.status(200).json(users || {});
      })
      .catch((error) => {
        console.error('Error:', error);
        return response.status(401).send('Unauthorized: ' + error.message);
      });
  });
});

// Function to add a user
exports.addUser = functions.https.onCall(async (data, context) => {
  console.log("addUser function called");
  console.log("Received data:", JSON.stringify(data));

  try {
    // Check if user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to add a user.');
    }

    const { name, email, companyId } = data;

    if (!name || !email || !companyId) {
      throw new functions.https.HttpsError('invalid-argument', 'Name, email, and companyId are required.');
    }

    const userRef = admin.database().ref('users').push();
    await userRef.set({
      name,
      email,
      companyId
    });

    return { success: true, message: 'User added successfully', userId: userRef.key };
  } catch (error) {
    console.error('Error adding user:', error);
    throw new functions.https.HttpsError('internal', 'Error adding user: ' + error.message);
  }
});

// Function to retrieve users by company ID
exports.getUsers = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to retrieve users.');
  }

  const { companyId } = data;

  if (!companyId) {
    throw new functions.https.HttpsError('invalid-argument', 'Company ID is required.');
  }

  try {
    const usersSnapshot = await admin.database().ref('users')
      .orderByChild('companyId')
      .equalTo(companyId)
      .once('value');

    const users = usersSnapshot.val();
    return users || {};
  } catch (error) {
    console.error('Error retrieving users:', error);
    throw new functions.https.HttpsError('internal', 'Error retrieving users: ' + error.message);
  }
});

// Function to get all users
exports.getAllUsers = functions.https.onCall(async (data, context) => {
  console.log("getAllUsers function called");

  try {
    // For testing in emulator, we'll pass an empty object if no data is provided
    const requestData = data || {};
    console.log("Request data:", JSON.stringify(requestData));

    // Skip auth check in emulator
    if (!process.env.FUNCTIONS_EMULATOR && !context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to retrieve users.');
    }

    console.log("Fetching all users from database");
    const usersSnapshot = await admin.database().ref('users').once('value');
    const users = usersSnapshot.val();
    
    console.log("Users fetched:", JSON.stringify(users, null, 2));
    return users || {};
  } catch (error) {
    console.error('Error retrieving users:', error);
    throw new functions.https.HttpsError('internal', 'Error retrieving users: ' + error.message);
  }
});
