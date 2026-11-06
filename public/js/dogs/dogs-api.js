const JSON_HEADERS = { 'Content-Type': 'application/json' };

export async function readJsonResponse(response, fallbackMessage = 'Fehler beim Laden der Hundedaten.') {
   const data = await response.json().catch(() => ({}));

   if (!response.ok) {
      throw new Error(data.message || fallbackMessage);
   }

   return data;
}

export async function fetchDogs() {
   const response = await fetch('/dogs');
   return readJsonResponse(response);
}

// Für Seiten mit Hundeauswahl: bei fehlender Anmeldung zum Login
export async function fetchDogsOrRedirect() {
   const response = await fetch('/dogs');

   if (response.status === 401) {
      window.location.href = '/app/login';
      throw new Error('Nicht angemeldet.');
   }

   const dogs = await response.json().catch(() => []);

   if (!response.ok || !Array.isArray(dogs)) {
      throw new Error('Hunde konnten nicht geladen werden.');
   }

   return dogs;
}

export async function createDog(payload) {
   const response = await fetch('/dogs', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(payload)
   });

   return readJsonResponse(response);
}

export async function uploadDogPhoto(dogId, photo) {
   const formData = new FormData();
   formData.append('photo', photo);

   const response = await fetch(`/dogs/${encodeURIComponent(dogId)}/photo`, {
      method: 'POST',
      body: formData
   });
   return readJsonResponse(response, 'Das Hundefoto konnte nicht gespeichert werden.');
}

export async function updateDog(dogId, payload) {
   const response = await fetch(`/dogs/${dogId}`, {
      method: 'PUT',
      headers: JSON_HEADERS,
      body: JSON.stringify(payload)
   });

   return readJsonResponse(response);
}

export async function deleteDog(dogId) {
   const response = await fetch(`/dogs/${dogId}`, { method: 'DELETE' });

   if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || 'Hund konnte nicht gelöscht werden.');
   }

   return response.status === 204 ? null : response.json();
}
