import { expect, type Page } from '@playwright/test';

const DATABASE_NAME = 'c2-nightfall';
const GAME_STORES = ['profiles', 'settings', 'runs'] as const;

export interface StoredRun {
  id: string;
  characterId: 'blue' | 'purple' | 'white' | 'gray';
  victory: boolean;
  elapsedSeconds: number;
  kills: number;
  level: number;
  coins: number;
  damageDealt: number;
  endedAt: string;
}

export interface StoredProfile {
  id: 'main';
  coins: number;
  unlockedCharacters: Array<'blue' | 'purple' | 'white' | 'gray'>;
  bestTimeSeconds: number;
  bestKills: number;
  totalRuns: number;
  discoveredAbilities: string[];
  updatedAt: string;
}

export interface StoredGameData {
  runs: StoredRun[];
  profile: StoredProfile | null;
}

export async function openIsolatedApp(page: Page): Promise<void> {
  await page.goto('/?e2e=1');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('C2');
  await clearGameDatabase(page);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('C2');

  const initial = await readStoredGameData(page);
  expect(initial.runs).toEqual([]);
  expect(initial.profile?.totalRuns ?? 0).toBe(0);
  expect(initial.profile?.coins ?? 0).toBe(0);
}

export async function startRun(page: Page): Promise<void> {
  await page.getByTestId('start-run').click();
  await expect(page.getByTestId('game-viewport')).toBeVisible();
  await page.waitForFunction(() => Boolean(window.__C2_GAME__?.ready));
}

export async function waitForStoredRun(page: Page): Promise<StoredGameData> {
  await expect.poll(async () => {
    const stored = await readStoredGameData(page);
    return {
      runCount: stored.runs.length,
      totalRuns: stored.profile?.totalRuns ?? 0,
    };
  }).toEqual({ runCount: 1, totalRuns: 1 });

  return readStoredGameData(page);
}

export async function readStoredGameData(page: Page): Promise<StoredGameData> {
  return page.evaluate(async (databaseName) => {
    function openDatabase(): Promise<IDBDatabase> {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(databaseName);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error(`Could not open ${databaseName}.`));
      });
    }

    function requestResult<T>(request: IDBRequest<T>): Promise<T> {
      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
      });
    }

    const database = await openDatabase();
    try {
      if (!database.objectStoreNames.contains('runs') || !database.objectStoreNames.contains('profiles')) {
        return { runs: [], profile: null };
      }

      const transaction = database.transaction(['runs', 'profiles'], 'readonly');
      const runsRequest = transaction.objectStore('runs').getAll();
      const profileRequest = transaction.objectStore('profiles').get('main');
      const [runs, profile] = await Promise.all([
        requestResult(runsRequest),
        requestResult(profileRequest),
      ]);

      return {
        runs: runs as StoredRun[],
        profile: (profile as StoredProfile | undefined) ?? null,
      };
    } finally {
      database.close();
    }
  }, DATABASE_NAME);
}

async function clearGameDatabase(page: Page): Promise<void> {
  await page.evaluate(async ({ databaseName, storeNames }) => {
    function openDatabase(): Promise<IDBDatabase> {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(databaseName);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error(`Could not open ${databaseName}.`));
      });
    }

    function transactionComplete(transaction: IDBTransaction): Promise<void> {
      return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction was aborted.'));
        transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed.'));
      });
    }

    const database = await openDatabase();
    try {
      const existingStores = storeNames.filter((storeName) => database.objectStoreNames.contains(storeName));
      if (existingStores.length === 0) return;

      const transaction = database.transaction(existingStores, 'readwrite');
      const completion = transactionComplete(transaction);
      for (const storeName of existingStores) transaction.objectStore(storeName).clear();
      await completion;
    } finally {
      database.close();
    }
  }, { databaseName: DATABASE_NAME, storeNames: GAME_STORES });
}
