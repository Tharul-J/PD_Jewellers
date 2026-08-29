import React, { createContext, useContext, useState, useEffect } from 'react';

// Card-on-file. Masked details only — a CVV is never stored or transmitted here.
export interface SavedCard {
  cardHolderName: string;
  lastFour: string;
  maskedNumber: string;
  expiryDate: string;
}

// Define user type
export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'customer' | 'administrator';
  profilePicture?: string;
  savedCard?: SavedCard;
  token: string;
}

interface AuthContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
  updateUser: (patch: Partial<User>) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('userInfo');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Failed to parse stored user', error);
      }
    }
    setIsLoading(false);
  }, []);

  // Intercept any 401 response while a user session is active and expire it.
  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const response = await originalFetch(...args);
      if (response.status === 401 && localStorage.getItem('userInfo')) {
        localStorage.removeItem('userInfo');
        setUser(null);
        sessionStorage.setItem('pd_session_expired', '1');
      }
      return response;
    };
    return () => { window.fetch = originalFetch; };
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('userInfo', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('userInfo');
  };

  // Merge server-side changes (e.g. a newly saved card) into the cached session
  // so they survive a reload without forcing the user to sign in again.
  const updateUser = (patch: Partial<User>) => {
    setUser(prev => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      localStorage.setItem('userInfo', JSON.stringify(next));
      return next;
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
