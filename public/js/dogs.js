const dogForm = document.getElementById('dog-form');
const dogList = document.getElementById('dog-list');
const dogMessage = document.getElementById('dog-message');

const DOG_TEXT_REGEX = /^[A-Za-zÄÖÜäöüß\s-]{2,40}$/;

function setMessage(text, isError = false) {
   if (!dogMessage) return;
   dogMessage.textContent = text;
   dogMessage.style.color = isError ? '#c0392b' : '';
}

function validateDogText(value, fieldName) {
   const text = String(value || '').trim();

   if (!text) {
      return `${fieldName} ist erforderlich.`;
   }

   if (!DOG_TEXT_REGEX.test(text)) {
      return `${fieldName} darf nur Buchstaben, Leerzeichen und Bindestriche enthalten (2-40 Zeichen).`;
   }

   return null;
}

function validateDogAge(ageInput) {
   if (ageInput === '') {
      return { age: null };
   }

   const age = Number(ageInput);
   if (!Number.isInteger(age) || age < 0 || age > 30) {
      return { error: 'Alter muss eine ganze Zahl zwischen 0 und 30 sein.' };
   }

   return { age };
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

async function readJsonResponse(response) {
   const data = await response.json().catch(() => ({}));

   if (!response.ok) {
      throw new Error(data.message || 'Fehler beim Laden der Hundedaten.');
   }

   return data;
}

async function loadDogs() {
   const response = await fetch('/dogs');
   const dogs = await readJsonResponse(response);
   renderDogs(dogs);
}

dogForm?.addEventListener('submit', async (event) => {
   event.preventDefault();

   const formData = new FormData(dogForm);
   const name = String(formData.get('name') || '').trim();
   const breed = String(formData.get('breed') || '').trim();
   const ageInput = String(formData.get('age') || '').trim();

   const nameError = validateDogText(name, 'Name');
   if (nameError) {
      setMessage(nameError, true);
      return;
   }

   const breedError = validateDogText(breed, 'Rasse');
   if (breedError) {
      setMessage(breedError, true);
      return;
   }

   const ageCheck = validateDogAge(ageInput);
   if (ageCheck.error) {
      setMessage(ageCheck.error, true);
      return;
   }

   const payload = {
      name,
      breed,
      age: ageCheck.age
   };

   try {
      const response = await fetch('/dogs', {
         method: 'POST',
         headers: {
            'Content-Type': 'application/json'
         },
         body: JSON.stringify(payload)
      });

      await readJsonResponse(response);
      dogForm.reset();
      setMessage('Hund erfolgreich angelegt.');
      await loadDogs();
   } catch (error) {
      setMessage(error.message, true);
   }
});

dogList?.addEventListener('click', async (event) => {
   const button = event.target.closest('[data-action][data-dog-id]');
   if (!button) return;

   const action = button.getAttribute('data-action');
   const dogId = button.getAttribute('data-dog-id');
   if (!action || !dogId) return;

   if (action === 'delete') {
      const dogName = button.getAttribute('data-dog-name') || 'diesen Hund';
      const confirmed = window.confirm(`Möchtest du ${dogName} wirklich löschen?`);

      if (!confirmed) return;

      try {
         const response = await fetch(`/dogs/${dogId}`, {
            method: 'DELETE'
         });

         if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || 'Hund konnte nicht gelöscht werden.');
         }

         setMessage('Hund erfolgreich gelöscht.');
         await loadDogs();
      } catch (error) {
         setMessage(error.message, true);
      }

      return;
   }

   if (action === 'edit') {
      const currentName = button.getAttribute('data-dog-name') || '';
      const currentBreed = button.getAttribute('data-dog-breed') || '';
      const currentAge = button.getAttribute('data-dog-age') || '';

      const newName = window.prompt('Neuer Name:', currentName);
      if (newName === null) return;

      const newBreed = window.prompt('Neue Rasse:', currentBreed);
      if (newBreed === null) return;

      const newAgeInput = window.prompt('Neues Alter (leer lassen = unbekannt):', currentAge);
      if (newAgeInput === null) return;

      const nameError = validateDogText(newName, 'Name');
      if (nameError) {
         setMessage(nameError, true);
         return;
      }

      const breedError = validateDogText(newBreed, 'Rasse');
      if (breedError) {
         setMessage(breedError, true);
         return;
      }

      const ageCheck = validateDogAge(String(newAgeInput).trim());
      if (ageCheck.error) {
         setMessage(ageCheck.error, true);
         return;
      }

      try {
         const response = await fetch(`/dogs/${dogId}`, {
            method: 'PUT',
            headers: {
               'Content-Type': 'application/json'
            },
            body: JSON.stringify({
               name: String(newName).trim(),
               breed: String(newBreed).trim(),
               age: ageCheck.age
            })
         });

         await readJsonResponse(response);
         setMessage('Hund erfolgreich bearbeitet.');
         await loadDogs();
      } catch (error) {
         setMessage(error.message, true);
      }
   }
});

loadDogs().catch((error) => setMessage(error.message, true));
