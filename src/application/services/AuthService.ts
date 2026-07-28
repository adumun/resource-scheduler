import type { LocalAuthService, SessionUser, RegisterInput, LoginInput } from "@/infrastructure/auth/LocalAuthService";

const SESSION_KEY = "rs.session";

export class AuthService {
  constructor(private readonly localAuth: LocalAuthService) {}

  async register(input: RegisterInput): Promise<SessionUser> {
    const session = await this.localAuth.register(input);
    this.persistSession(session);
    return session;
  }

  async login(input: LoginInput): Promise<SessionUser> {
    const session = await this.localAuth.login(input);
    this.persistSession(session);
    return session;
  }

  logout(): void {
    localStorage.removeItem(SESSION_KEY);
  }

  currentSession(): SessionUser | null {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw === null) return null;
    try {
      const parsed = JSON.parse(raw) as SessionUser;
      if (typeof parsed.userId === "string" && typeof parsed.email === "string") return parsed;
      return null;
    } catch {
      return null;
    }
  }

  private persistSession(session: SessionUser): void {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
}
