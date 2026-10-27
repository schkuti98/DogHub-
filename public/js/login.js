const CURRENT_USER_KEY = 'currentUser';
const USERS_KEY = 'dogtrainer_users';

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const toggleRegisterButton = document.getElementById('toggle-register');
const message = document.getElementById('login-message');

function setMessage(text) {
   if (!message) return;
   message.textContent = text;
}

function normalizeEmail(email) {
   return email.trim().toLowerCase();
}

function getUsers() {
   const raw = localStorage.getItem(USERS_KEY);
   if (!raw) return [];

   try {
      const users = JSON.parse(raw);
      return Array.isArray(users) ? users : [];
   } catch {
      return [];
   }
}

function saveUsers(users) {
   localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function setCurrentUser(user, remember) {
   const payload = JSON.stringify(user);

   if (remember) {
      localStorage.setItem(CURRENT_USER_KEY, payload);
      sessionStorage.removeItem(CURRENT_USER_KEY);
      return;
   }

   sessionStorage.setItem(CURRENT_USER_KEY, payload);
   localStorage.removeItem(CURRENT_USER_KEY);
}

toggleRegisterButton?.addEventListener('click', () => {
   const isHidden = registerForm?.hasAttribute('hidden');

   if (isHidden) {
      registerForm?.removeAttribute('hidden');
      setMessage('Neues Konto erstellen');
      return;
   }

   registerForm?.setAttribute('hidden', '');
   setMessage('');
});

loginForm?.addEventListener('submit', (event) => {
   event.preventDefault();

   const email = normalizeEmail(document.getElementById('email')?.value || '');
   const password = document.getElementById('password')?.value || '';
   const remember = document.getElementById('remember')?.checked;

   if (!email || !password) {
      setMessage('Bitte E-Mail und Passwort eingeben.');
      return;
   }

   const users = getUsers();
   const user = users.find((entry) => entry.email === email);

   if (!user) {
      setMessage('Kein Konto gefunden. Bitte zuerst registrieren.');
      return;
   }

   if (user.password !== password) {
      setMessage('Passwort ist falsch.');
      return;
   }

   setCurrentUser({ email: user.email, loginAt: new Date().toISOString() }, Boolean(remember));
   setMessage('Erfolgreich angemeldet...');
   window.location.href = 'index.html';
});

registerForm?.addEventListener('submit', (event) => {
   event.preventDefault();

   const email = normalizeEmail(document.getElementById('register-email')?.value || '');
   const password = document.getElementById('register-password')?.value || '';
   const repeatPassword = document.getElementById('register-password-repeat')?.value || '';

   if (!email || !password || !repeatPassword) {
      setMessage('Bitte alle Registrierungsfelder ausfüllen.');
      return;
   }

   if (password.length < 6) {
      setMessage('Passwort muss mindestens 6 Zeichen lang sein.');
      return;
   }

   if (password !== repeatPassword) {
      setMessage('Passwörter stimmen nicht überein.');
      return;
   }

   const users = getUsers();
   const alreadyExists = users.some((entry) => entry.email === email);

   if (alreadyExists) {
      setMessage('Für diese E-Mail existiert bereits ein Konto.');
      return;
   }

   users.push({ email, password, createdAt: new Date().toISOString() });
   saveUsers(users);

   registerForm.reset();
   registerForm.setAttribute('hidden', '');
   setMessage('Registrierung erfolgreich. Jetzt bitte anmelden.');
});
