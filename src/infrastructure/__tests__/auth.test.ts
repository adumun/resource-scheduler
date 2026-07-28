import { describe, it, expect, beforeEach } from "vitest";
import { LocalAuthService, validateRegister } from "@/infrastructure/auth/LocalAuthService";
import { IndexedDbUserRepository } from "@/infrastructure/repositories/IndexedDbUserRepository";
import { resetDb } from "@/infrastructure/db/idb";

describe("LocalAuthService", () => {
  let service: LocalAuthService;

  beforeEach(async () => {
    await resetDb();
    service = new LocalAuthService(new IndexedDbUserRepository());
  });

  it("registers and logs in a user", async () => {
    const session = await service.register({ name: "Carlos", email: "carlos@example.com", password: "secret123", confirmPassword: "secret123" });
    expect(session.email).toBe("carlos@example.com");
    const login = await service.login({ email: "carlos@example.com", password: "secret123" });
    expect(login.userId).toBe(session.userId);
  });

  it("rejects duplicate email", async () => {
    await service.register({ name: "Al", email: "dup@example.com", password: "secret123", confirmPassword: "secret123" });
    await expect(
      service.register({ name: "Bo", email: "dup@example.com", password: "secret123", confirmPassword: "secret123" }),
    ).rejects.toThrow();
  });

  it("rejects wrong password", async () => {
    await service.register({ name: "Al", email: "a@example.com", password: "secret123", confirmPassword: "secret123" });
    await expect(service.login({ email: "a@example.com", password: "wrong" })).rejects.toThrow();
  });

  it("rejects unknown email", async () => {
    await expect(service.login({ email: "ghost@example.com", password: "x" })).rejects.toThrow();
  });
});

describe("validateRegister", () => {
  it("flags short name, bad email, short password, mismatch", () => {
    const errors = validateRegister({ name: "a", email: "bad", password: "123", confirmPassword: "456" });
    expect(errors.length).toBe(4);
  });

  it("passes for valid input", () => {
    const errors = validateRegister({ name: "Carlos", email: "c@example.com", password: "secret", confirmPassword: "secret" });
    expect(errors).toHaveLength(0);
  });
});
