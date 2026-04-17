import { create } from 'zustand';

interface User {
  _id: string; name: string; email?: string; phone?: string;
  role: 'super_admin' | 'org_admin' | 'branch_manager' | 'staff' | 'citizen';
  organization?: any; branch?: any;
  isActive: boolean; createdAt: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: JSON.parse(localStorage.getItem('ql_user') || 'null'),
  token: localStorage.getItem('ql_token'),
  isAuthenticated: !!localStorage.getItem('ql_token'),
  setAuth: (user, token) => {
    localStorage.setItem('ql_token', token);
    localStorage.setItem('ql_user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('ql_token');
    localStorage.removeItem('ql_user');
    set({ user: null, token: null, isAuthenticated: false });
  },
  updateUser: (partial) => set((state) => {
    const updated = { ...state.user!, ...partial };
    localStorage.setItem('ql_user', JSON.stringify(updated));
    return { user: updated };
  }),
}));
