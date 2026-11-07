const { test, expect } = require('@playwright/test');

test('Login mit falschem Passwort zeigt sichere Fehlermeldung', async ({ page }) => {
   await page.goto('/app/login');

   await page.fill('#email', 'not-existing-user@example.com');
   await page.fill('#password', 'falschespasswort');
   await page.click('#login-form button[type="submit"]');

   await expect(page.locator('#login-message')).toHaveText('Ungültige Anmeldedaten.');
});
const { test, expect } = require('@playwright/test');

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

   // 4) Optional: prüfen, dass Hauptinhalt sichtbar ist
   await expect(page.locator('main')).toBeVisible();
});
