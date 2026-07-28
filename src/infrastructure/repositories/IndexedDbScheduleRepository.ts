import type { Schedule } from "@/domain/schedule";
import type { ScheduleRepository } from "./types";
import { getDb, STORES } from "../db/idb";

export class IndexedDbScheduleRepository implements ScheduleRepository {
  async list(ownerId: string): Promise<Schedule[]> {
    const db = await getDb();
    const all = (await db.getAll(STORES.schedules)) as Schedule[];
    return all
      .filter((s) => s.ownerId === ownerId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async get(id: string): Promise<Schedule | undefined> {
    const db = await getDb();
    return (await db.get(STORES.schedules, id)) as Schedule | undefined;
  }

  async save(schedule: Schedule): Promise<void> {
    const db = await getDb();
    await db.put(STORES.schedules, schedule);
  }

  async remove(id: string): Promise<void> {
    const db = await getDb();
    await db.delete(STORES.schedules, id);
  }
}
