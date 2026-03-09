import Dexie, { type Table } from "dexie";

interface CacheEntry {
    key: string;
    data: unknown;
    expiresAt: number; // Unix ms timestamp
}

class CacheDatabase extends Dexie {
    entries!: Table<CacheEntry, string>;

    constructor() {
        super("perfume_gpt_cache");
        this.version(1).stores({
            entries: "key, expiresAt",
        });
    }
}

const db = new CacheDatabase();

/** Automatically purge expired entries (call once at startup if desired). */
export const purgeExpired = () =>
    db.entries.where("expiresAt").below(Date.now()).delete();

export const dexieCache = {
    async get<T>(key: string): Promise<T | null> {
        const entry = await db.entries.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expiresAt) {
            await db.entries.delete(key);
            return null;
        }
        return entry.data as T;
    },

    async set<T>(key: string, data: T, ttlMs: number): Promise<void> {
        await db.entries.put({ key, data, expiresAt: Date.now() + ttlMs });
    },

    async getOrFetch<T>(key: string, fetcher: () => Promise<T>, ttlMs: number): Promise<T> {
        const cached = await dexieCache.get<T>(key);
        if (cached !== null) return cached;
        const fresh = await fetcher();
        await dexieCache.set(key, fresh, ttlMs);
        return fresh;
    },

    async delete(key: string): Promise<void> {
        await db.entries.delete(key);
    },

    async clear(): Promise<void> {
        await db.entries.clear();
    },
};
