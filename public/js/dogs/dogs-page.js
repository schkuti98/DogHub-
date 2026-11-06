import { fetchDogs, createDog, updateDog, deleteDog, uploadDogPhoto } from './dogs-api.js';
import { validateDogText, validateDogAge } from './dog-validation.js';

const dogForm = document.getElementById('dog-form');
const dogList = document.getElementById('dog-list');
const dogMessage = document.getElementById('dog-message');

function setMessage(text, isError = false) {
   if (!dogMessage) return;
   dogMessage.textContent = text;
   dogMessage.style.color = isError ? '#c0392b' : '';
}

function escapeHtml(value) {
   return String(value ?? '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
   })[character]);
}

function renderDogs(dogs) {
   if (!dogList) return;

   if (!Array.isArray(dogs) || dogs.length === 0) {
      dogList.innerHTML = '<p>Noch keine Hunde angelegt.</p>';
      return;
   }

   dogList.innerHTML = dogs
      .map(
         (dog) => `
            <article class="dog-card">
               ${dog.photoUrl
                  ? `<img class="dog-picture dog-photo" src="${escapeHtml(dog.photoUrl)}" alt="Foto von ${escapeHtml(dog.name)}">`
                  : '<div class="dog-picture" aria-hidden="true">🐕</div>'}
               <div>
                  <h3>${escapeHtml(dog.name)}</h3>
                  <p>${escapeHtml(dog.breed)}</p>
                  <p>Alter: ${escapeHtml(dog.age ?? 'unbekannt')}</p>
                  <button
                     class="btn btn-outline-light btn-sm mt-2 me-2"
                     type="button"
                     data-action="edit"
                     data-dog-id="${escapeHtml(dog.id)}"
                     data-dog-name="${escapeHtml(dog.name)}"
                     data-dog-breed="${escapeHtml(dog.breed)}"
                     data-dog-age="${escapeHtml(dog.age ?? '')}"
                  >
                     Hund bearbeiten
                  </button>
                  <button
                     class="btn btn-outline-danger btn-sm mt-2"
                     type="button"
                     data-action="delete"
                     data-dog-id="${escapeHtml(dog.id)}"
                     data-dog-name="${escapeHtml(dog.name)}"
                  >
                     Hund löschen
                  </button>
                  <label class="btn btn-outline-light btn-sm mt-2 dog-photo-upload">
                     ${dog.photoUrl ? 'Foto ändern' : 'Foto hochladen'}
                     <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        data-action="upload-photo"
                        data-dog-id="${escapeHtml(dog.id)}"
                        aria-label="Foto für ${escapeHtml(dog.name)} hochladen"
                     >
                  </label>
               </div>
            </article>
         `
      )
      .join('');
}

async function loadDogs() {
   renderDogs(await fetchDogs());
}

// Validiert Name, Rasse und Alter; liefert Fehlertext oder bereinigte Werte
function validateDogInput(name, breed, ageInput) {
   const nameError = validateDogText(name, 'Name');
   if (nameError) return { error: nameError };

   const breedError = validateDogText(breed, 'Rasse');
   if (breedError) return { error: breedError };

   const ageCheck = validateDogAge(ageInput);
   if (ageCheck.error) return { error: ageCheck.error };

   return { value: { name, breed, age: ageCheck.age } };
}

async function handleDogFormSubmit(event) {
   event.preventDefault();

   const formData = new FormData(dogForm);
   const name = String(formData.get('name') || '').trim();
   const breed = String(formData.get('breed') || '').trim();
   const ageInput = String(formData.get('age') || '').trim();

   const result = validateDogInput(name, breed, ageInput);
   if (result.error) {
      setMessage(result.error, true);
      return;
   }

   try {
      await createDog(result.value);
      dogForm.reset();
      setMessage('Hund erfolgreich angelegt.');
      await loadDogs();
   } catch (error) {
      setMessage(error.message, true);
   }
}

async function handleDeleteDog(button, dogId) {
   const dogName = button.getAttribute('data-dog-name') || 'diesen Hund';
   const confirmed = window.confirm(`Möchtest du ${dogName} wirklich löschen?`);

   if (!confirmed) return;

   try {
      const result = await deleteDog(dogId);
      setMessage(result?.warning ? `${result.message} ${result.warning}` : 'Hund erfolgreich gelöscht.');
      await loadDogs();
   } catch (error) {
      setMessage(error.message, true);
   }
}

async function handleEditDog(button, dogId) {
   const currentName = button.getAttribute('data-dog-name') || '';
   const currentBreed = button.getAttribute('data-dog-breed') || '';
   const currentAge = button.getAttribute('data-dog-age') || '';

   const newName = window.prompt('Neuer Name:', currentName);
   if (newName === null) return;

   const newBreed = window.prompt('Neue Rasse:', currentBreed);
   if (newBreed === null) return;

   const newAgeInput = window.prompt('Neues Alter (leer lassen = unbekannt):', currentAge);
   if (newAgeInput === null) return;

   const result = validateDogInput(String(newName).trim(), String(newBreed).trim(), String(newAgeInput).trim());
   if (result.error) {
      setMessage(result.error, true);
      return;
   }

   try {
      await updateDog(dogId, result.value);
      setMessage('Hund erfolgreich bearbeitet.');
      await loadDogs();
   } catch (error) {
      setMessage(error.message, true);
   }
}

dogForm?.addEventListener('submit', handleDogFormSubmit);

dogList?.addEventListener('click', async (event) => {
   const button = event.target.closest('[data-action][data-dog-id]');
   if (!button) return;

   const action = button.getAttribute('data-action');
   const dogId = button.getAttribute('data-dog-id');
   if (!action || !dogId) return;

   if (action === 'delete') {
      await handleDeleteDog(button, dogId);
      return;
   }

   if (action === 'edit') {
      await handleEditDog(button, dogId);
   }
});

dogList?.addEventListener('change', async (event) => {
   const input = event.target.closest('input[data-action="upload-photo"][data-dog-id]');
   const photo = input?.files?.[0];
   const dogId = input?.getAttribute('data-dog-id');
   if (!input || !photo || !dogId) return;

   input.disabled = true;
   try {
      const result = await uploadDogPhoto(dogId, photo);
      setMessage(result.warning ? `${result.message} ${result.warning}` : result.message);
      await loadDogs();
   } catch (error) {
      setMessage(error.message, true);
   } finally {
      input.disabled = false;
      input.value = '';
   }
});

loadDogs().catch((error) => setMessage(error.message, true));
