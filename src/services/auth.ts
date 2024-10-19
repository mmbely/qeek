import { auth, database } from './firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { ref, set } from "firebase/database";
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
    const userRef = ref(database, `users/${user.uid}`);
    await set(userRef, {
      displayName: user.displayName || 'Anonymous',
      email: user.email,
      photoURL: user.photoURL || '/placeholder.svg?height=40&width=40',
      companyId: user.companyId || 'default'
    });
    console.log("User saved to database successfully");
  } catch (error) {
    console.error("Error saving user to database:", error);
    throw error;
  }
};
