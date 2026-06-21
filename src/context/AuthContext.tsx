import React, { createContext, useContext, useState, useEffect } from 'react';

// Define user type
export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'customer' | 'administrator';
  token: string;
}

interface AuthContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
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

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
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
