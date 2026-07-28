import type { UserRecord, UserRepository } from "./types";
import { getDb, STORES } from "../db/idb";

export class IndexedDbUserRepository implements UserRepository {
  async findByEmail(email: string): Promise<UserRecord | undefined> {
    const db = await getDb();
    const index = db.transaction(STORES.users).store.index("byEmail");
    return (await index.get(email)) as UserRecord | undefined;
  }

  async getById(id: string): Promise<UserRecord | undefined> {
    const db = await getDb();
    return (await db.get(STORES.users, id)) as UserRecord | undefined;
  }

  async save(user: UserRecord): Promise<void> {
    const db = await getDb();
    await db.put(STORES.users, user);
  }
}
