
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '@/types';
import { auth, googleProvider, db } from '@/lib/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  googleLogin: () => Promise<void>;
  logout: () => Promise<void>;
  setLanguage: (lang: 'en' | 'te') => void;
  loading: boolean;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role?: UserRole;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser({
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: userData.name || firebaseUser.displayName || 'User',
              phone: userData.phone || firebaseUser.phoneNumber || undefined,
              role: userData.role || 'citizen',
              language: userData.language || 'en',
              createdAt: userData.createdAt?.toDate() || new Date(),
            });
          } else {
            // If user doc doesn't exist (e.g. first time Google Login), create it
            const newUser: User = {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: firebaseUser.displayName || 'User',
              phone: firebaseUser.phoneNumber || null,
              role: 'citizen',
              language: 'en',
              createdAt: new Date(),
            };

            await setDoc(userDocRef, {
              ...newUser,
              createdAt: Timestamp.fromDate(newUser.createdAt)
            });
            setUser(newUser);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const register = async (data: RegisterData) => {
    const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);

    // Update profile with name
    await updateProfile(userCredential.user, {
      displayName: data.name
    });

    // Create user document in Firestore
    const newUser: User = {
      id: userCredential.user.uid,
      email: data.email,
      name: data.name,
      phone: data.phone || null,
      role: data.role || 'citizen',
      language: 'en',
      createdAt: new Date(),
    };

    await setDoc(doc(db, 'users', userCredential.user.uid), {
      ...newUser,
      createdAt: Timestamp.fromDate(newUser.createdAt)
    });

    // State update will be handled by onAuthStateChanged listener
  };

  const googleLogin = async () => {
    await signInWithPopup(auth, googleProvider);
    // User doc creation is handled in onAuthStateChanged if it doesn't exist
  };

  const logout = async () => {
    await signOut(auth);
  };

  const setLanguage = (lang: 'en' | 'te') => {
    if (user) {
      const updatedUser = { ...user, language: lang };
      setUser(updatedUser);
      // Sync language preference to Firestore
      setDoc(doc(db, 'users', user.id), { language: lang }, { merge: true });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        register,
        googleLogin,
        logout,
        setLanguage,
        loading
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
