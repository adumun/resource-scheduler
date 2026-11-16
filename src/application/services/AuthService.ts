import type { LocalAuthService, SessionUser, RegisterInput, LoginInput } from "@/infrastructure/auth/LocalAuthService";
import { LABS_PUBLIC_DEMO, LABS_DEMO_USER_ID } from "../labsMode";

const SESSION_KEY = "rs.session";

export class AuthService {
  constructor(private readonly localAuth: LocalAuthService) {}

  async register(input: RegisterInput): Promise<SessionUser> {
    if (LABS_PUBLIC_DEMO) throw new Error("Registration is disabled in the public Labs experiment.");
    const session = await this.localAuth.register(input);
    this.persistSession(session);
    return session;
  }

  async login(input: LoginInput): Promise<SessionUser> {
    if (LABS_PUBLIC_DEMO) throw new Error("Login is disabled in the public Labs experiment.");
    const session = await this.localAuth.login(input);
    this.persistSession(session);
    return session;
  }

  startDemo(): SessionUser {
    // The same ID is scoped to each visitor's own browser storage; never a server account.
    const session: SessionUser = {
      userId: LABS_DEMO_USER_ID,
      name: "Explorador Labs",
      email: "demo@local.invalid",
    };
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
      if (
        typeof parsed.userId === "string" &&
        typeof parsed.email === "string" &&
        (!LABS_PUBLIC_DEMO || parsed.userId === LABS_DEMO_USER_ID)
      ) return parsed;
      return null;
    } catch {
      return null;
    }
  }

  private persistSession(session: SessionUser): void {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
}
