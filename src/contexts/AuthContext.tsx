import React, { createContext, useContext, useState, useCallback } from 'react';
import { User, UserRole } from '@/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  setLanguage: (lang: 'en' | 'te') => void;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role?: UserRole;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Demo users for testing
const DEMO_USERS: Record<string, User & { password: string }> = {
  'citizen@demo.com': {
    id: '1',
    email: 'citizen@demo.com',
    name: 'Ravi Kumar',
    phone: '+91 9876543210',
    role: 'citizen',
    language: 'en',
    createdAt: new Date(),
    password: 'demo123',
  },
  'admin@demo.com': {
    id: '2',
    email: 'admin@demo.com',
    name: 'Admin User',
    phone: '+91 9876543211',
    role: 'admin',
    language: 'en',
    createdAt: new Date(),
    password: 'demo123',
  },
  'employee@demo.com': {
    id: '3',
    email: 'employee@demo.com',
    name: 'Suresh Babu',
    phone: '+91 9876543212',
    role: 'employee',
    language: 'en',
    createdAt: new Date(),
    password: 'demo123',
  },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const demoUser = DEMO_USERS[email.toLowerCase()];
    if (demoUser && demoUser.password === password) {
      const { password: _, ...userWithoutPassword } = demoUser;
      setUser(userWithoutPassword);
      return;
    }
    
    throw new Error('Invalid email or password');
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const newUser: User = {
      id: Date.now().toString(),
      email: data.email,
      name: data.name,
      phone: data.phone,
      role: data.role || 'citizen',
      language: 'en',
      createdAt: new Date(),
    };
    
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const setLanguage = useCallback((lang: 'en' | 'te') => {
    if (user) {
      setUser({ ...user, language: lang });
    }
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        setLanguage,
      }}
    >
      {children}
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
