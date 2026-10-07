/** In-memory stand-in for `next/headers` cookies()/headers() in integration tests. */
type Cookie = { name: string; value: string };
const store = new Map<string, Cookie>();
const headerStore = new Map<string, string>();

export const cookieJar = {
  get: (name: string) => store.get(name),
  getAll: () => [...store.values()],
  has: (name: string) => store.has(name),
  set: (name: string, value: string) => {
    store.set(name, { name, value });
  },
  delete: (name: string) => {
    store.delete(name);
  },
  clear: () => store.clear(),
};

export const headerJar = {
  get: (name: string) => headerStore.get(name.toLowerCase()) ?? null,
  set: (name: string, value: string) => headerStore.set(name.toLowerCase(), value),
  clear: () => headerStore.clear(),
};
