export type StoredScan = {
  id: string;
  url: string;
  finalUrl: string;
  pageTitle: string;
  httpStatus: number;
  loadTime: number;
  createdAt: string;
  summary: string;
};

export type StoredUser = {
  id: string;
  name: string;
  email: string;
};

const USER_STORAGE_KEY = "launch-check-user";
const HISTORY_STORAGE_KEY = "launch-check-history";

let memoryUser: StoredUser | null = null;
let memoryHistory: StoredScan[] = [];

function getStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

export function getCurrentUser(): StoredUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const storage = getStorage();
  if (!storage) {
    return memoryUser;
  }

  const storedUser = storage.getItem(USER_STORAGE_KEY);
  if (!storedUser) {
    return memoryUser;
  }

  try {
    return JSON.parse(storedUser) as StoredUser;
  } catch {
    return null;
  }
}

export function loginUser(name: string, email: string): StoredUser {
  const user: StoredUser = {
    id: `user-${Date.now()}`,
    name,
    email,
  };

  memoryUser = user;

  const storage = getStorage();
  if (storage) {
    storage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  }

  return user;
}

export function logoutUser(): void {
  memoryUser = null;

  const storage = getStorage();
  if (storage) {
    storage.removeItem(USER_STORAGE_KEY);
  }
}

export function saveScanToHistory(scan: Omit<StoredScan, "id" | "createdAt">): StoredScan {
  const entry: StoredScan = {
    id: `scan-${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...scan,
  };

  const currentHistory = getScanHistory();
  const nextHistory = [entry, ...currentHistory];
  memoryHistory = nextHistory;

  const storage = getStorage();
  if (storage) {
    storage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(nextHistory));
  }

  return entry;
}

export function getScanHistory(): StoredScan[] {
  const storage = getStorage();
  if (!storage) {
    return memoryHistory;
  }

  const storedHistory = storage.getItem(HISTORY_STORAGE_KEY);
  if (!storedHistory) {
    return memoryHistory;
  }

  try {
    return JSON.parse(storedHistory) as StoredScan[];
  } catch {
    return [];
  }
}

export function deleteScanFromHistory(id: string): void {
  const history = getScanHistory().filter((item) => item.id !== id);
  memoryHistory = history;

  const storage = getStorage();
  if (storage) {
    storage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  }
}

export function searchScanHistory(query: string): StoredScan[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return getScanHistory();
  }

  return getScanHistory().filter((item) =>
    [item.url, item.finalUrl, item.pageTitle, item.summary].some((value) =>
      value.toLowerCase().includes(normalizedQuery),
    ),
  );
}
