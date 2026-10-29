const trickDetailContainer = document.getElementById('trick-detail');

function getCurrentTrickId() {
   const fromHash = window.location.hash.replace('#', '').trim();
   if (fromHash && tricks[fromHash]) {
      return fromHash;
   }

   return Object.keys(tricks)[0];
}

function getTrickStatus(dogId, trickId) {
   const progress = loadProgress();
   const done = progress[dogId] ?? {};
   const isDone = done[trickId] === true;
   const unlocked = isTrickUnlocked(dogId, trickId, tricks);
   return { isDone, unlocked };
}

function mapDogsToOptions(dogs, selectedDogId) {
   return dogs
      .map((dog) => {
         const selected = String(dog.id) === String(selectedDogId) ? 'selected' : '';
         return `<option value="${dog.id}" ${selected}>${dog.name}</option>`;
      })
      .join('');
}

function renderMissingTrick() {
   if (!trickDetailContainer) return;

   trickDetailContainer.innerHTML = `
      <h2>Trick nicht gefunden</h2>
      <p>Der angeforderte Trick existiert nicht.</p>
      <a class="start-button" href="tricks.html">Zurück zur Trickliste</a>
   `;
}

function renderTrickDetail({ trickId, trick, dogs, selectedDogId }) {
   if (!trickDetailContainer) return;

   const requiredText = formatRequiredTricks(trick);
   const instructions = trick.schritte.map((step) => `<li>${step}</li>`).join('');
   const hasDogs = dogs.length > 0;
   const dogOptions = mapDogsToOptions(dogs, selectedDogId);
   const { isDone, unlocked } = hasDogs ? getTrickStatus(selectedDogId, trickId) : { isDone: false, unlocked: false };

   let statusText = 'Wähle einen Hund, um den Fortschritt zu speichern.';
   if (hasDogs) {
      if (isDone) statusText = 'Status: Geschafft';
      else if (unlocked) statusText = 'Status: Freigeschaltet';
      else statusText = 'Status: Gesperrt (Voraussetzungen fehlen)';
   }

   trickDetailContainer.innerHTML = `
      <span class="schwierigkeit">${trick.stufe}</span>
      <h2>${trick.name}</h2>
      <p>${trick.beschreibung}</p>
      <p><strong>Vorher lernen:</strong> ${requiredText}</p>

      <h3>Anleitung</h3>
      <ol>${instructions}</ol>

      <div class="trick-formular">
         <label for="trick-dog-select">Hund auswählen</label>
         <select id="trick-dog-select" name="hund" ${hasDogs ? '' : 'disabled'}>
            ${hasDogs ? dogOptions : '<option>Keine Hunde vorhanden</option>'}
         </select>
         <p class="speicher-hinweis" id="trick-status-message">${statusText}</p>
         <button class="start-button" id="mark-trick-done" type="button" ${hasDogs && unlocked && !isDone ? '' : 'disabled'}>
            Geschafft speichern
         </button>
      </div>
   `;

   const dogSelect = document.getElementById('trick-dog-select');
   const markDoneButton = document.getElementById('mark-trick-done');
   const statusMessage = document.getElementById('trick-status-message');

   dogSelect?.addEventListener('change', () => {
      localStorage.setItem('selectedDogId', dogSelect.value);
      initializeTrickDetail();
   });

   markDoneButton?.addEventListener('click', () => {
      const currentDogId = dogSelect?.value;
      if (!currentDogId) return;

      markTrickDone(currentDogId, trickId);
      if (statusMessage) {
         statusMessage.textContent = 'Status: Geschafft';
      }

      markDoneButton.setAttribute('disabled', 'true');
   });
}

async function loadDogsForTrickDetail() {
   try {
      const response = await fetch('/dogs');
      const dogs = await response.json();

      if (!response.ok || !Array.isArray(dogs)) {
         return [];
      }

      return dogs;
   } catch {
      return [];
   }
}

async function initializeTrickDetail() {
   const trickId = getCurrentTrickId();
   const trick = tricks[trickId];

   if (!trick) {
      renderMissingTrick();
      return;
   }

   const dogs = await loadDogsForTrickDetail();
   const fallbackDogId = dogs[0] ? String(dogs[0].id) : '';
   const selectedDogId = localStorage.getItem('selectedDogId') || fallbackDogId;

   if (selectedDogId) {
      localStorage.setItem('selectedDogId', selectedDogId);
   }

   renderTrickDetail({ trickId, trick, dogs, selectedDogId });
}

window.addEventListener('hashchange', initializeTrickDetail);
initializeTrickDetail();
