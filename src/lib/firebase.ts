import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCpKqaL60EDeWcfa2CNO4yZhAXj0lK-0QM",
    authDomain: "civic-issue-reporting-b2255.firebaseapp.com",
    projectId: "civic-issue-reporting-b2255",
    storageBucket: "civic-issue-reporting-b2255.firebasestorage.app",
    messagingSenderId: "623590505991",
    appId: "1:623590505991:web:314558a5b21360f969b4a2"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
