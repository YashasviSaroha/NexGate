import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client.js';

export interface User {
  id: string;
  name: string;
  email: string;
  demo?: boolean;
}

export interface OrgSummary {
  id: string;
  name: string;
  slug: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  organizations: OrgSummary[];
  currentOrg: OrgSummary | null;
  isLoading: boolean;
  login: (data: any) => Promise<void>;
  register: (data: any) => Promise<void>;
  startDemo: () => Promise<void>;
  logout: () => Promise<void>;
  switchOrg: (org: OrgSummary) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organizations, setOrganizations] = useState<OrgSummary[]>([]);
  const [currentOrg, setCurrentOrg] = useState<OrgSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/v1/auth/me');
      if (res.data?.success && res.data.data) {
        const u = res.data.data;
        setUser({ id: u.id, name: u.name, email: u.email, demo: u.demo === true });

        const orgs = (u.memberships || []).map((m: any) => ({
          id: m.organization.id,
          name: m.organization.name,
          slug: m.organization.slug,
          role: m.role,
        }));
        setOrganizations(orgs);

        if (orgs.length > 0 && !currentOrg) {
          const storedOrgId = localStorage.getItem('nexgate-org-id');
          const matched = orgs.find((o: OrgSummary) => o.id === storedOrgId);
          setCurrentOrg(matched || orgs[0]);
        }
      }
    } catch {
      setUser(null);
      setOrganizations([]);
      setCurrentOrg(null);
    } finally {
      setIsLoading(false);
    }
  }, [currentOrg]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (credentials: any) => {
    const res = await apiClient.post('/api/v1/auth/login', credentials);
    if (res.data?.success) {
      setUser({ ...res.data.data.user, demo: false });
      const orgs = res.data.data.organizations || [];
      setOrganizations(orgs);
      if (orgs.length > 0) {
        setCurrentOrg(orgs[0]);
        localStorage.setItem('nexgate-org-id', orgs[0].id);
      }
    }
  };

  const register = async (data: any) => {
    const res = await apiClient.post('/api/v1/auth/register', data);
    if (res.data?.success) {
      setUser({ ...res.data.data.user, demo: false });
      if (res.data.data.organization) {
        const org = res.data.data.organization;
        setOrganizations([org]);
        setCurrentOrg(org);
        localStorage.setItem('nexgate-org-id', org.id);
      }
    }
  };

  const startDemo = useCallback(async () => {
    const res = await apiClient.post('/api/v1/auth/demo');
    if (res.data?.success) {
      setUser({ ...res.data.data.user, demo: true });
      const orgs = res.data.data.organizations || [];
      setOrganizations(orgs);
      if (orgs.length > 0) {
        setCurrentOrg(orgs[0]);
        localStorage.setItem('nexgate-org-id', orgs[0].id);
      }
      if (res.data.data.sandboxKey) {
        sessionStorage.setItem('nexgate-sandbox-key', res.data.data.sandboxKey);
      }
    }
  }, []);

  const logout = async () => {
    try {
      await apiClient.post('/api/v1/auth/logout');
    } finally {
      setUser(null);
      setOrganizations([]);
      setCurrentOrg(null);
      localStorage.removeItem('nexgate-org-id');
      sessionStorage.removeItem('nexgate-sandbox-key');
    }
  };

  const switchOrg = (org: OrgSummary) => {
    setCurrentOrg(org);
    localStorage.setItem('nexgate-org-id', org.id);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organizations,
        currentOrg,
        isLoading,
        login,
        register,
        startDemo,
        logout,
        switchOrg,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
