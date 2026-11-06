import { fetchDogsOrRedirect } from '../dogs/dogs-api.js';
import { getSelectedDogId, setSelectedDogId } from '../dogs/selected-dog.js';
import { loadTrainingStateForDog, isTrickUnlockedByDoneSet, markTrickDone } from '../training/training-api.js';
import { loadTrickMap } from './tricks-api.js';
import { formatRequiredTricks } from './trick-utils.js';

const trickDetailContainer = document.getElementById('trick-detail');

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
      <a class="start-button" href="/app/tricks">Zurück zur Trickliste</a>
   `;
}

function renderError(message) {
   if (!trickDetailContainer) return;

   trickDetailContainer.innerHTML = `
      <h2>Fehler</h2>
      <p>${message}</p>
      <a class="start-button" href="/app/tricks">Zurück zur Trickliste</a>
   `;
}

function getCurrentTrickId(trickMap) {
   const fromHash = window.location.hash.replace('#', '').trim();
   if (fromHash && trickMap[fromHash]) {
      return fromHash;
   }

   return Object.keys(trickMap)[0] || null;
}

function renderTrickDetail({ trickId, trick, trickMap, dogs, selectedDogId, doneSet }) {
   if (!trickDetailContainer) return;

   const requiredText = formatRequiredTricks(trick, trickMap);
   const instructions = (
      trick.steps && trick.steps.length > 0 ? trick.steps : ['Noch keine Schritt-für-Schritt-Anleitung gespeichert.']
   )
      .map((step) => `<li>${step}</li>`)
      .join('');

   const hasDogs = dogs.length > 0;
   const dogOptions = mapDogsToOptions(dogs, selectedDogId);
   const isDone = doneSet.has(String(trickId));
   const unlocked = isTrickUnlockedByDoneSet(trick, doneSet);

   let statusText = 'Wähle einen Hund, um den Fortschritt zu speichern.';
   if (hasDogs) {
      if (isDone) statusText = 'Status: Geschafft';
      else if (unlocked) statusText = 'Status: Freigeschaltet';
      else statusText = 'Status: Gesperrt (Voraussetzungen fehlen)';
   }

   trickDetailContainer.innerHTML = `
      <span class="difficulty-badge">${trick.levelLabel}</span>
      <h2>${trick.name}</h2>
      <p>${trick.description}</p>
      <p><strong>Vorher lernen:</strong> ${requiredText}</p>

      <h3>Anleitung</h3>
      <ol>${instructions}</ol>

      <div class="trick-form">
         <label for="trick-dog-select">Hund auswählen</label>
         <select id="trick-dog-select" name="dog" ${hasDogs ? '' : 'disabled'}>
            ${hasDogs ? dogOptions : '<option>Keine Hunde vorhanden</option>'}
         </select>
         <p class="status-note" id="trick-status-message">${statusText}</p>
         <button class="start-button" id="mark-trick-done" type="button" ${hasDogs && unlocked && !isDone ? '' : 'disabled'}>
            Geschafft speichern
         </button>
      </div>
   `;
}

async function initializeTrickDetail() {
   if (!trickDetailContainer) return;

   try {
      const [trickMap, dogs] = await Promise.all([loadTrickMap(), fetchDogsOrRedirect()]);
      const trickId = getCurrentTrickId(trickMap);

      if (!trickId || !trickMap[trickId]) {
         renderMissingTrick();
         return;
      }

      const trick = trickMap[trickId];
      const selectedDogId = getSelectedDogId(dogs);

      const trainingState = selectedDogId ? await loadTrainingStateForDog(selectedDogId) : { doneSet: new Set() };

      renderTrickDetail({
         trickId,
         trick,
         trickMap,
         dogs,
         selectedDogId,
         doneSet: trainingState.doneSet || new Set()
      });

      const dogSelect = document.getElementById('trick-dog-select');
      const markDoneButton = document.getElementById('mark-trick-done');

      dogSelect?.addEventListener('change', () => {
         setSelectedDogId(dogSelect.value);
         initializeTrickDetail();
      });

      markDoneButton?.addEventListener('click', async () => {
         const currentDogId = dogSelect?.value;
         if (!currentDogId) return;

         try {
            await markTrickDone(currentDogId, trickId);
            await initializeTrickDetail();
         } catch (error) {
            const statusMessage = document.getElementById('trick-status-message');
            if (statusMessage) {
               statusMessage.textContent = error.message || 'Speichern fehlgeschlagen.';
            }
         }
      });
   } catch (error) {
      renderError(error.message || 'Trickdaten konnten nicht geladen werden.');
   }
}

window.addEventListener('hashchange', initializeTrickDetail);
initializeTrickDetail();
