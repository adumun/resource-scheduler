import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthService } from "./AuthService";
import { LABS_DEMO_USER_ID } from "../labsMode";
import type { LocalAuthService } from "@/infrastructure/auth/LocalAuthService";

const localAuth = {
  login: vi.fn(),
  register: vi.fn(),
} as unknown as LocalAuthService;

afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe("ADÜMÜN Labs credential-free demo", () => {
  it("opens a browser-only session without registering a user or password", () => {
    const service = new AuthService(localAuth);
    const session = service.startDemo();

    expect(session.userId).toBe(LABS_DEMO_USER_ID);
    expect(session.name).toBe("Explorador Labs");
    expect(service.currentSession()).toEqual(session);
    expect(localAuth.login).not.toHaveBeenCalled();
    expect(localAuth.register).not.toHaveBeenCalled();

    const stored = localStorage.getItem("rs.session") ?? "";
    expect(stored).not.toContain("password");
    expect(stored).not.toContain("secret");
  });

  it("clears the browser-only demo session on logout", () => {
    const service = new AuthService(localAuth);
    service.startDemo();
    service.logout();
    expect(service.currentSession()).toBeNull();
  });

  it("ignores corrupt local session data", () => {
    const service = new AuthService(localAuth);
    localStorage.setItem("rs.session", "not-json");
    expect(service.currentSession()).toBeNull();
  });
});
