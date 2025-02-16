import { auth, database, db } from './firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { ref, set } from "firebase/database";
import { 
  collection,
  doc, 
  setDoc,
  addDoc
} from "firebase/firestore";
import { CustomUser } from '../types/user';

export const registerUser = async (email: string, password: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user as CustomUser;
    user.companyId = 'default';
    await saveUserToDatabase(user);
    return user;
  } catch (error) {
    console.error("Error registering user:", error);
    throw error;
  }
};

export const loginUser = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user as CustomUser;
    user.companyId = 'default'; // You might want to fetch this from the database instead
    await saveUserToDatabase(user);
    return user;
  } catch (error) {
    console.error("Error logging in user:", error);
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error logging out user:", error);
    throw error;
  }
};

const saveUserToDatabase = async (user: CustomUser) => {
  try {
    // Save to Realtime Database for online status
    const rtdbRef = ref(database, `users/${user.uid}`);
    await set(rtdbRef, {
      displayName: user.displayName || 'Anonymous',
      email: user.email,
      photoURL: user.photoURL || '/placeholder.svg?height=40&width=40',
      companyId: user.companyId || 'default'
    });

    // Create new account in Firestore with auto-generated ID
    const accountsRef = collection(db, 'accounts');
    const accountData = {
      name: 'My Account',
      members: {
        [user.uid]: {
          role: 'admin',
          joinedAt: new Date().getTime()
        }
      },
      settings: {},
      createdAt: new Date().getTime(),
      updatedAt: new Date().getTime(),
      ownerId: user.uid
    };
    
    const accountDoc = await addDoc(accountsRef, accountData);
    console.log('[Auth] Created account with ID:', accountDoc.id);

    // Save to Firestore for account association
    const firestoreRef = doc(db, 'users', user.uid);
    await setDoc(firestoreRef, {
      displayName: user.displayName || 'Anonymous',
      email: user.email,
      photoURL: user.photoURL || '/placeholder.svg?height=40&width=40',
      accountIds: [accountDoc.id],
      updatedAt: new Date().getTime()
    });

    console.log("User saved to databases successfully");
  } catch (error) {
    console.error("Error saving user to databases:", error);
    throw error;
  }
};

export const createUserRecord = async (user: any, companyId: string) => {
  if (user) {
    try {
      // Save to Realtime Database
      const rtdbRef = ref(database, `users/${user.uid}`);
      await set(rtdbRef, {
        email: user.email,
        companyId: companyId,
      });

      // Create new account in Firestore with auto-generated ID
      const accountsRef = collection(db, 'accounts');
      const accountData = {
        name: 'My Account',
        members: {
          [user.uid]: {
            role: 'admin',
            joinedAt: new Date().getTime()
          }
        },
        settings: {},
        createdAt: new Date().getTime(),
        updatedAt: new Date().getTime(),
        ownerId: user.uid
      };
      
      const accountDoc = await addDoc(accountsRef, accountData);
      console.log('[Auth] Created account with ID:', accountDoc.id);

      // Save to Firestore
      const firestoreRef = doc(db, 'users', user.uid);
      await setDoc(firestoreRef, {
        displayName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
        email: user.email,
        photoURL: user.photoURL || '/placeholder.svg?height=40&width=40',
        accountIds: [accountDoc.id],
        updatedAt: Date.now()
      });

      console.log("User record created successfully");
    } catch (error) {
      console.error("Error creating user record:", error);
      throw error;
    }
  }
};

export const signUp = async (email: string, password: string, companyId: string) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  await createUserRecord(userCredential.user, companyId);
};

export const login = async (email: string, password: string, companyId: string) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  await createUserRecord(userCredential.user, companyId);
};
