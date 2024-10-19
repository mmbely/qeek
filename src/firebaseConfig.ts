// import { initializeApp } from "firebase/app";
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getDatabase } from "firebase/database";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCpeIq06ukfOkxlwn3sBaZ5ruEniBMNBQQ",
  authDomain: "qap-ai.firebaseapp.com",
  databaseURL: "https://qap-ai-default-rtdb.firebaseio.com",
  projectId: "qap-ai",
  storageBucket: "qap-ai.appspot.com",
  messagingSenderId: "223595064771",
  appId: "1:223595064771:web:05c8c876579fb1c009a176",
  measurementId: "G-3XM3HKDZF9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);
export const googleProvider = new GoogleAuthProvider();
