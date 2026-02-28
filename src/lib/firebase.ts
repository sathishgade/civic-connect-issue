import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyArvpN7gJCIO1s4q-aO4_g7Iccyl0uR5VU",
    authDomain: "smart-civic-issue.firebaseapp.com",
    projectId: "smart-civic-issue",
    storageBucket: "smart-civic-issue.firebasestorage.app",
    messagingSenderId: "348447613316",
    appId: "1:348447613316:web:fbb8a66aa19f1fcf097dd1"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
