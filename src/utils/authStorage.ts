const ACCESS_TOKEN_KEY = "accessToken";
const USER_KEY = "user";

const safeGet = (storage: Storage, key: string) => {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
};

const safeSet = (storage: Storage, key: string, value: string) => {
  try {
    storage.setItem(key, value);
  } catch {
    // ignore storage write errors
  }
};

const safeRemove = (storage: Storage, key: string) => {
  try {
    storage.removeItem(key);
  } catch {
    // ignore storage remove errors
  }
};

export const getStoredAccessToken = () => {
  return (
    safeGet(sessionStorage, ACCESS_TOKEN_KEY) ||
    safeGet(localStorage, ACCESS_TOKEN_KEY)
  );
};

export const getStoredUser = () => {
  return safeGet(sessionStorage, USER_KEY) || safeGet(localStorage, USER_KEY);
};

export const setStoredAuth = (accessToken: string, userJson: string) => {
  // Keep auth session per-tab/window to avoid account collisions.
  safeSet(sessionStorage, ACCESS_TOKEN_KEY, accessToken);
  safeSet(sessionStorage, USER_KEY, userJson);

  // Clear legacy shared storage to prevent session bleeding across windows.
  safeRemove(localStorage, ACCESS_TOKEN_KEY);
  safeRemove(localStorage, USER_KEY);
};

export const clearStoredAuth = () => {
  safeRemove(sessionStorage, ACCESS_TOKEN_KEY);
  safeRemove(sessionStorage, USER_KEY);
  safeRemove(localStorage, ACCESS_TOKEN_KEY);
  safeRemove(localStorage, USER_KEY);
};

export const migrateLegacyAuthToSession = () => {
  const legacyToken = safeGet(localStorage, ACCESS_TOKEN_KEY);
  const legacyUser = safeGet(localStorage, USER_KEY);

  if (legacyToken) {
    safeSet(sessionStorage, ACCESS_TOKEN_KEY, legacyToken);
    safeRemove(localStorage, ACCESS_TOKEN_KEY);
  }

  if (legacyUser) {
    safeSet(sessionStorage, USER_KEY, legacyUser);
    safeRemove(localStorage, USER_KEY);
  }
};
