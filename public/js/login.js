const CURRENT_USER_KEY = 'currentUser';

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

async function postJson(url, payload) {
   const response = await fetch(url, {
      method: 'POST',
      headers: {
         'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
   });

   const data = await response.json().catch(() => ({}));

   if (!response.ok) {
      throw new Error(data.message || 'Ein Fehler ist aufgetreten.');
   }

   return data;
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

loginForm?.addEventListener('submit', async (event) => {
   event.preventDefault();

   const email = normalizeEmail(document.getElementById('email')?.value || '');
   const password = document.getElementById('password')?.value || '';
   const remember = document.getElementById('remember')?.checked;

   if (!email || !password) {
      setMessage('Bitte E-Mail und Passwort eingeben.');
      return;
   }

   try {
      const data = await postJson('/auth/login', { email, password });
      setCurrentUser(data.user, Boolean(remember));
      setMessage(data.message || 'Erfolgreich angemeldet...');
      window.location.href = 'index.html';
   } catch (error) {
      setMessage(error.message);
   }
});

registerForm?.addEventListener('submit', async (event) => {
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

   try {
      const data = await postJson('/auth/register', { email, password });
      registerForm.reset();
      registerForm.setAttribute('hidden', '');
      setMessage(data.message || 'Registrierung erfolgreich. Jetzt bitte anmelden.');
   } catch (error) {
      setMessage(error.message);
   }
});
