import type { Schedule } from "@/domain/schedule";

export interface ScheduleRepository {
  list(ownerId: string): Promise<Schedule[]>;
  get(id: string): Promise<Schedule | undefined>;
  save(schedule: Schedule): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
}

export interface UserRepository {
  findByEmail(email: string): Promise<UserRecord | undefined>;
  getById(id: string): Promise<UserRecord | undefined>;
  save(user: UserRecord): Promise<void>;
}
