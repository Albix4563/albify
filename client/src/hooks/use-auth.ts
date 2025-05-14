import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { QUERY_KEYS } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';

export interface User {
  id: number;
  email: string;
  username: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Fix TypeScript error by providing a proper default value for user
const defaultAuthContextValue: AuthContextType = {
  user: null,
  isLoading: false,
  isAuthenticated: false,
  login: async () => {},
  register: async () => {},
  logout: async () => {}
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Fetch authenticated user
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: [QUERY_KEYS.user],
    queryFn: async () => {
      try {
        const res = await fetch(QUERY_KEYS.user, { 
          credentials: 'include',
          // Aggiungi un parametro di cache-busting per evitare cache del browser
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        if (res.status === 401) {
          setIsAuthenticated(false);
          return null;
        }
        
        if (!res.ok) {
          throw new Error('Failed to fetch user');
        }
        
        const userData = await res.json();
        setIsAuthenticated(true);
        return userData;
      } catch (error) {
        setIsAuthenticated(false);
        return null;
      }
    },
    retry: false,
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      // Prima di fare login, assicuriamoci che non ci siano sessioni attive
      try {
        // Proviamo a fare logout silenziosamente se c'è una sessione
        if (isAuthenticated) {
          await fetch('/api/auth/logout', { 
            method: 'POST',
            credentials: 'include',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          });
        }
      } catch (e) {
        // Ignoriamo eventuali errori nel logout silenzioso
      }
      
      // Ora procediamo con il login
      const res = await apiRequest('POST', '/api/auth/login', { email, password });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData([QUERY_KEYS.user], data);
      setIsAuthenticated(true);
      toast({
        title: 'Accesso effettuato con successo',
        description: `Bentornato, ${data.username}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Accesso fallito',
        description: error.message || 'Si è verificato un errore durante l\'accesso',
        variant: 'destructive',
      });
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async ({ 
      email, 
      username, 
      password 
    }: { 
      email: string; 
      username: string; 
      password: string 
    }) => {
      const res = await apiRequest('POST', '/api/auth/register', { email, username, password });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData([QUERY_KEYS.user], data);
      setIsAuthenticated(true);
      toast({
        title: 'Registrazione completata',
        description: `Benvenuto su Albify, ${data.username}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Registrazione fallita',
        description: error.message || 'Si è verificato un errore durante la registrazione',
        variant: 'destructive',
      });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/auth/logout', {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.setQueryData([QUERY_KEYS.user], null);
      setIsAuthenticated(false);
      
      // Clear all cached data
      queryClient.clear();
      
      // Force refresh the page after logout to ensure clean state
      setTimeout(() => {
        window.location.reload();
      }, 100);
      
      toast({
        title: 'Disconnessione effettuata',
        description: 'Hai effettuato la disconnessione dal tuo account',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Disconnessione fallita',
        description: error.message || 'Si è verificato un errore durante la disconnessione',
        variant: 'destructive',
      });
    },
  });

  // Authentication methods
  const login = async (email: string, password: string) => {
    await loginMutation.mutateAsync({ email, password });
  };

  const register = async (email: string, username: string, password: string) => {
    await registerMutation.mutateAsync({ email, username, password });
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  const value = {
    user: user || null, // Fix TypeScript error by ensuring user is never undefined
    isLoading: isLoading || loginMutation.isPending || registerMutation.isPending,
    isAuthenticated,
    login,
    register,
    logout,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
