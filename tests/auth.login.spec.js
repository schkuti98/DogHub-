const { test, expect } = require('@playwright/test');

test('Login mit falschem Passwort zeigt sichere Fehlermeldung', async ({ page }) => {
   const email = `e2e_invalid_password_${Date.now()}@example.com`;
   const registerResponse = await page.request.post('/auth/register', {
      data: { email, password: 'richtigespasswort' }
   });
   expect(registerResponse.ok()).toBeTruthy();

   await page.goto('/app/login');

   await page.fill('#email', email);
   await page.fill('#password', 'falschespasswort');
   await page.click('#login-form button[type="submit"]');

   await expect(page.locator('#login-message')).toHaveText('Passwort ist falsch.');
});

test('Erfolgreicher Login leitet auf /app weiter', async ({ page, request }) => {
   const email = `e2e_${Date.now()}@example.com`;
   const password = 'testpass123';

   // 1) Test-User über API registrieren
   const registerResponse = await request.post('/auth/register', {
      data: { email, password }
   });
   expect(registerResponse.ok()).toBeTruthy();

   // 2) Login-Seite öffnen und einloggen
   await page.goto('/app/login');
   await page.fill('#email', email);
   await page.fill('#password', password);
   await page.click('#login-form button[type="submit"]');

   // 3) Redirect auf geschützte App-Seite prüfen
   await expect(page).toHaveURL(/\/app$/);

   // 4) Prüfen, dass der Hauptinhalt sichtbar ist
   await expect(page.locator('main')).toBeVisible();
});
