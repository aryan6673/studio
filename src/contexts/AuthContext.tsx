
"use client";

import type { User, AuthError } from 'firebase/auth';
import { 
  createContext, 
  useContext, 
  useEffect, 
  useState, 
  type ReactNode,
  type Dispatch,
  type SetStateAction
} from 'react';
import { 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut 
} from 'firebase/auth';
import { auth } from '@/lib/firebase'; // Assuming your firebase init is in lib/firebase
import type { z } from 'zod';
import type { loginSchema, signupSchema } from '@/lib/auth-schemas'; // We'll create these schemas

type AuthContextType = {
  currentUser: User | null;
  loading: boolean;
  error: string | null;
  setError: Dispatch<SetStateAction<string | null>>;
  login: (values: z.infer<typeof loginSchema>) => Promise<User | null>;
  signup: (values: z.infer<typeof signupSchema>) => Promise<User | null>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe; // Cleanup subscription on unmount
  }, []);

  const login = async (values: z.infer<typeof loginSchema>): Promise<User | null> => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      setCurrentUser(userCredential.user);
      return userCredential.user;
    } catch (err) {
      const authError = err as AuthError;
      console.error("Login error:", authError);
      setError(authError.message || 'Failed to login.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (values: z.infer<typeof signupSchema>): Promise<User | null> => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      // You might want to update the user's profile here if needed, e.g., with a display name
      setCurrentUser(userCredential.user);
      return userCredential.user;
    } catch (err) {
      const authError = err as AuthError;
      console.error("Signup error:", authError);
      setError(authError.message || 'Failed to create account.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    setError(null);
    try {
      await signOut(auth);
      setCurrentUser(null);
    } catch (err) {
      const authError = err as AuthError;
      console.error("Logout error:", authError);
      setError(authError.message || 'Failed to logout.');
    } finally {
      setLoading(false);
    }
  };

  const value = {
    currentUser,
    loading,
    error,
    setError,
    login,
    signup,
    logout,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};
