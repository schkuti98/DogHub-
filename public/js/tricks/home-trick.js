import { fetchDogsOrRedirect } from '../dogs/dogs-api.js';
import { getSelectedDogId } from '../dogs/selected-dog.js';
import { loadTrainingStateForDog, isTrickUnlockedByDoneSet } from '../training/training-api.js';
import { loadTrickMap } from './tricks-api.js';

const trickList = document.querySelector('.trick-list');

function escapeHtml(value) {
   return String(value ?? '').replace(
      /[&<>"']/g,
      (character) =>
         ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
         })[character]
   );
}

function getNewestTrick(tricks) {
   return tricks.sort((a, b) => {
      const dateDifference = new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      return dateDifference || b.id.localeCompare(a.id);
   })[0];
}

async function renderNewestTrick() {
   if (!trickList) return;

   try {
      const [trickMap, dogs] = await Promise.all([loadTrickMap(), fetchDogsOrRedirect()]);
      const newestTrick = getNewestTrick(Object.values(trickMap));

      if (!newestTrick) {
         trickList.innerHTML = '<p>Noch keine Tricks in der Datenbank.</p>';
         return;
      }

      const selectedDogId = getSelectedDogId(dogs);
      const trainingState = selectedDogId ? await loadTrainingStateForDog(selectedDogId) : { doneSet: new Set() };
      const doneSet = trainingState.doneSet || new Set();
      const isDone = doneSet.has(newestTrick.id);
      const isUnlocked = isTrickUnlockedByDoneSet(newestTrick, doneSet);
      const status = !selectedDogId
         ? 'Kein Hund ausgewählt'
         : isDone
           ? 'Geschafft'
           : isUnlocked
             ? 'Freigeschaltet'
             : 'Gesperrt';

      trickList.innerHTML = `
         <a class="trick-card trick-card-link ${isDone ? 'done' : isUnlocked ? 'unlocked' : 'locked'}"
            href="/app/trick#${encodeURIComponent(newestTrick.id)}">
            <span class="difficulty-badge">${escapeHtml(newestTrick.levelLabel)}</span>
            <h3>${escapeHtml(newestTrick.name)}</h3>
            <p>${escapeHtml(newestTrick.description)}</p>
            <p class="trick-state">${status}</p>
            <span class="start-button trick-open-button">Anleitung ansehen</span>
         </a>
      `;
   } catch (error) {
      trickList.innerHTML = `<p>${escapeHtml(error.message || 'Der neueste Trick konnte nicht geladen werden.')}</p>`;
   }
}

renderNewestTrick();
