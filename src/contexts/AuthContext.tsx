
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
  signOut,
  GoogleAuthProvider, // Added
  signInWithPopup     // Added
} from 'firebase/auth';
import { auth } from '@/lib/firebase'; 
import type { z } from 'zod';
import type { loginSchema, signupSchema } from '@/lib/auth-schemas';

type AuthContextType = {
  currentUser: User | null;
  loading: boolean;
  error: string | null;
  setError: Dispatch<SetStateAction<string | null>>;
  login: (values: z.infer<typeof loginSchema>) => Promise<User | null>;
  signup: (values: z.infer<typeof signupSchema>) => Promise<User | null>;
  loginWithGoogle: () => Promise<User | null>; // Added
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
    return unsubscribe; 
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

  const loginWithGoogle = async (): Promise<User | null> => {
    setLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      setCurrentUser(result.user);
      return result.user;
    } catch (err) {
      const authError = err as AuthError;
      console.error("Google login error:", authError);
      // Handle specific Google auth errors if needed
      // Example: authError.code === 'auth/popup-closed-by-user'
      setError(authError.message || 'Failed to login with Google.');
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
    loginWithGoogle, // Added
    logout,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};
