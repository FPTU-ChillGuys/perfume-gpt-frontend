const ACCESS_TOKEN_KEY = "accessToken";
const USER_KEY = "user";
const LOGOUT_MARKER_KEY = "authLogoutAt";

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
    safeGet(localStorage, ACCESS_TOKEN_KEY) ||
    safeGet(sessionStorage, ACCESS_TOKEN_KEY)
  );
};

export const getStoredUser = () => {
  return safeGet(localStorage, USER_KEY) || safeGet(sessionStorage, USER_KEY);
};

export const setStoredAuth = (accessToken: string, userJson: string) => {
  // Keep auth shared across tabs in the same browser profile.
  safeRemove(localStorage, LOGOUT_MARKER_KEY);
  safeRemove(sessionStorage, LOGOUT_MARKER_KEY);

  safeSet(localStorage, ACCESS_TOKEN_KEY, accessToken);
  safeSet(localStorage, USER_KEY, userJson);

  // Also write to sessionStorage for backward compatibility in current tab.
  safeSet(sessionStorage, ACCESS_TOKEN_KEY, accessToken);
  safeSet(sessionStorage, USER_KEY, userJson);
};

export const clearStoredAuth = () => {
  safeSet(localStorage, LOGOUT_MARKER_KEY, String(Date.now()));
  safeSet(sessionStorage, LOGOUT_MARKER_KEY, String(Date.now()));

  safeRemove(sessionStorage, ACCESS_TOKEN_KEY);
  safeRemove(sessionStorage, USER_KEY);
  safeRemove(localStorage, ACCESS_TOKEN_KEY);
  safeRemove(localStorage, USER_KEY);
};

export const migrateLegacyAuthToSession = () => {
  const logoutMarker = safeGet(localStorage, LOGOUT_MARKER_KEY);
  const sharedToken = safeGet(localStorage, ACCESS_TOKEN_KEY);
  const sharedUser = safeGet(localStorage, USER_KEY);
  const sessionToken = safeGet(sessionStorage, ACCESS_TOKEN_KEY);
  const sessionUser = safeGet(sessionStorage, USER_KEY);

  // If a logout was broadcast in another tab, clear stale tab-scoped auth.
  if (logoutMarker && !sharedToken && !sharedUser) {
    safeRemove(sessionStorage, ACCESS_TOKEN_KEY);
    safeRemove(sessionStorage, USER_KEY);
    return;
  }

  // Legacy path: if only sessionStorage has auth, promote it once to localStorage.
  // Skip this when a logout marker exists so we never resurrect a logged-out session.
  if (!logoutMarker) {
    if (!sharedToken && sessionToken) {
      safeSet(localStorage, ACCESS_TOKEN_KEY, sessionToken);
    }

    if (!sharedUser && sessionUser) {
      safeSet(localStorage, USER_KEY, sessionUser);
    }
  }

  // Ensure current tab sessionStorage also reflects shared auth.
  if (sharedToken) {
    safeSet(sessionStorage, ACCESS_TOKEN_KEY, sharedToken);
  }

  if (sharedUser) {
    safeSet(sessionStorage, USER_KEY, sharedUser);
  }
};
