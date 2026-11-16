import { create } from "zustand";
import { authService } from "@/application/compositionRoot";
import type { SessionUser, RegisterInput, LoginInput } from "@/infrastructure/auth/LocalAuthService";

interface AuthState {
  session: SessionUser | null;
  loading: boolean;
  error: string[] | null;
  init: () => void;
  login: (input: LoginInput) => Promise<boolean>;
  register: (input: RegisterInput) => Promise<boolean>;
  enterDemo: () => void;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  loading: false,
  error: null,
  init: () => {
    set({ session: authService.currentSession() });
  },
  login: async (input) => {
    set({ loading: true, error: null });
    try {
      const session = await authService.login(input);
      set({ session, loading: false });
      return true;
    } catch (err) {
      set({ loading: false, error: (err as { errors?: string[] }).errors ?? ["Login failed."] });
      return false;
    }
  },
  register: async (input) => {
    set({ loading: true, error: null });
    try {
      const session = await authService.register(input);
      set({ session, loading: false });
      return true;
    } catch (err) {
      set({ loading: false, error: (err as { errors?: string[] }).errors ?? ["Registration failed."] });
      return false;
    }
  },
  enterDemo: () => {
    set({ session: authService.startDemo(), loading: false, error: null });
  },
  logout: () => {
    authService.logout();
    set({ session: null });
  },
  clearError: () => set({ error: null }),
}));
