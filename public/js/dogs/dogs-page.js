import { fetchDogs, createDog, updateDog, deleteDog } from './dogs-api.js';
import { validateDogText, validateDogAge } from './dog-validation.js';

const dogForm = document.getElementById('dog-form');
const dogList = document.getElementById('dog-list');
const dogMessage = document.getElementById('dog-message');

function setMessage(text, isError = false) {
   if (!dogMessage) return;
   dogMessage.textContent = text;
   dogMessage.style.color = isError ? '#c0392b' : '';
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
               <div class="dog-picture" aria-hidden="true">🐕</div>
               <div>
                  <h3>${dog.name}</h3>
                  <p>${dog.breed}</p>
                  <p>Alter: ${dog.age ?? 'unbekannt'}</p>
                  <button
                     class="btn btn-outline-light btn-sm mt-2 me-2"
                     type="button"
                     data-action="edit"
                     data-dog-id="${dog.id}"
                     data-dog-name="${dog.name}"
                     data-dog-breed="${dog.breed}"
                     data-dog-age="${dog.age ?? ''}"
                  >
                     Hund bearbeiten
                  </button>
                  <button
                     class="btn btn-outline-danger btn-sm mt-2"
                     type="button"
                     data-action="delete"
                     data-dog-id="${dog.id}"
                     data-dog-name="${dog.name}"
                  >
                     Hund löschen
                  </button>
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
      await deleteDog(dogId);
      setMessage('Hund erfolgreich gelöscht.');
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

loadDogs().catch((error) => setMessage(error.message, true));
