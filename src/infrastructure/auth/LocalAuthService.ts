import type { UserRepository, UserRecord } from "../repositories/types";
import { generateSalt, hashPassword, verifyPassword } from "./password";
import { id } from "@/domain/ids";

export interface SessionUser {
  userId: string;
  name: string;
  email: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export class LocalAuthService {
  constructor(private readonly users: UserRepository) {}

  async register(input: RegisterInput): Promise<SessionUser> {
    const errors = validateRegister(input);
    if (errors.length > 0) throw new ValidationError(errors);
    const email = input.email.trim().toLowerCase();
    const existing = await this.users.findByEmail(email);
    if (existing !== undefined) throw new ValidationError(["An account with this email already exists."]);
    const salt = generateSalt();
    const passwordHash = await hashPassword(input.password, salt);
    const record: UserRecord = {
      id: id.user(),
      name: input.name.trim(),
      email,
      passwordHash,
      salt,
      createdAt: new Date().toISOString(),
    };
    await this.users.save(record);
    return { userId: record.id, name: record.name, email: record.email };
  }

  async login(input: LoginInput): Promise<SessionUser> {
    const email = input.email.trim().toLowerCase();
    const record = await this.users.findByEmail(email);
    if (record === undefined) throw new ValidationError(["Invalid email or password."]);
    const ok = await verifyPassword(input.password, record.salt, record.passwordHash);
    if (!ok) throw new ValidationError(["Invalid email or password."]);
    return { userId: record.id, name: record.name, email: record.email };
  }
}

export class ValidationError extends Error {
  constructor(readonly errors: string[]) {
    super(errors.join(" "));
    this.name = "ValidationError";
  }
}

export function validateRegister(input: RegisterInput): string[] {
  const errors: string[] = [];
  if (input.name.trim().length < 2) errors.push("Name must be at least 2 characters.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) errors.push("Enter a valid email address.");
  if (input.password.length < 6) errors.push("Password must be at least 6 characters.");
  if (input.password !== input.confirmPassword) errors.push("Passwords do not match.");
  return errors;
}
