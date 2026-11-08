// Einheitlicher Key für Login-Session im Browser
export const CURRENT_USER_KEY = 'currentUser';

export function clearCurrentUserStorage() {
   localStorage.removeItem(CURRENT_USER_KEY);
   sessionStorage.removeItem(CURRENT_USER_KEY);
}

function getStoredCurrentUserRaw() {
   return localStorage.getItem(CURRENT_USER_KEY) || sessionStorage.getItem(CURRENT_USER_KEY);
}

// Speichert User entweder dauerhaft oder nur für die Session
export function setCurrentUser(user, remember) {
   const payload = JSON.stringify(user);

   if (remember) {
      localStorage.setItem(CURRENT_USER_KEY, payload);
      sessionStorage.removeItem(CURRENT_USER_KEY);
      return;
   }

   sessionStorage.setItem(CURRENT_USER_KEY, payload);
   localStorage.removeItem(CURRENT_USER_KEY);
}

function redirectToLogin() {
   window.location.href = '/app/login';
}

// Prüft, ob ein Benutzer serverseitig wirklich angemeldet ist
export async function requireAuth() {
   try {
      const response = await fetch('/auth/session', { cache: 'no-store' });

      if (!response.ok) {
         clearCurrentUserStorage();
         redirectToLogin();
         return;
      }

      const data = await response.json();
      if (!data?.user) {
         clearCurrentUserStorage();
         redirectToLogin();
         return;
      }

      const normalized = JSON.stringify(data.user);

      if (localStorage.getItem(CURRENT_USER_KEY)) {
         localStorage.setItem(CURRENT_USER_KEY, normalized);
      } else {
         sessionStorage.setItem(CURRENT_USER_KEY, normalized);
      }
   } catch {
      clearCurrentUserStorage();
      redirectToLogin();
   }
}

// Logout: lokale Session + Server-Cookie beenden
export async function logout() {
   clearCurrentUserStorage();

   try {
      await fetch('/auth/logout', { method: 'POST' });
   } catch {
      // Client-Fallback: auch ohne Serverantwort weiter
   }

   redirectToLogin();
}
