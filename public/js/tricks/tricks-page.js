import { fetchDogsOrRedirect } from '../dogs/dogs-api.js';
import { getSelectedDogId } from '../dogs/selected-dog.js';
import { loadTrainingStateForDog, isTrickUnlockedByDoneSet } from '../training/training-api.js';
import { loadTrickMap } from './tricks-api.js';
import { formatRequiredTricks } from './trick-utils.js';

function buildStatuses(trickMap, doneSet) {
   const result = {};

   for (const [trickId, trick] of Object.entries(trickMap)) {
      const isDone = doneSet.has(String(trickId));
      const unlocked = isTrickUnlockedByDoneSet(trick, doneSet);

      let status = 'locked';
      if (isDone) status = 'done';
      else if (unlocked) status = 'unlocked';

      result[trickId] = { done: isDone, unlocked, status };
   }

   return result;
}

function renderTrickOverview({ trickMap, statuses, hasDog }) {
   const list = document.querySelector('.trick-list');
   if (!list) return;

   const tricks = Object.entries(trickMap);

   if (tricks.length === 0) {
      list.innerHTML = '<p>Noch keine Tricks in der Datenbank.</p>';
      return;
   }

   const cards = [];

   for (const [trickId, trick] of tricks) {
      const state = statuses[trickId] || { status: 'locked' };
      const isLocked = !hasDog || state.status === 'locked';
      const requiredText = formatRequiredTricks(trick, trickMap);
      const stateLabel =
         !hasDog
            ? 'Kein Hund ausgewählt'
            : state.status === 'done'
              ? 'Geschafft'
              : state.status === 'unlocked'
                ? 'Freigeschaltet'
                : 'Gesperrt';

      cards.push(`
         <a
            class="trick-card trick-card-link ${state.status}"
            href="${isLocked ? '#' : `/app/trick#${trickId}` }"
            data-trick-id="${trickId}"
            aria-disabled="${isLocked ? 'true' : 'false'}"
            tabindex="${isLocked ? '-1' : '0'}"
         >
            <span class="difficulty-badge">${trick.levelLabel}</span>
            <h3>${trick.name}</h3>
            <p>${trick.description}</p>
            <p><strong>Vorher lernen:</strong> ${requiredText}</p>
            <p class="trick-state">${stateLabel}</p>
            <span class="start-button trick-open-button">Anleitung ansehen</span>
         </a>
      `);
   }

   list.innerHTML = cards.join('');

   list.querySelectorAll('.trick-card.locked').forEach((card) => {
      card.addEventListener('click', (event) => {
         event.preventDefault();
      });
   });
}

async function initializeTricksOverview() {
   const list = document.querySelector('.trick-list');
   if (!list) return;

   try {
      const [dogs, trickMap] = await Promise.all([fetchDogsOrRedirect(), loadTrickMap()]);
      const selectedDogId = getSelectedDogId(dogs);
      const hasDog = Boolean(selectedDogId);

      const trainingState = hasDog
         ? await loadTrainingStateForDog(selectedDogId)
         : { doneSet: new Set() };

      const statuses = buildStatuses(trickMap, trainingState.doneSet || new Set());
      renderTrickOverview({ trickMap, statuses, hasDog });
   } catch (error) {
      list.innerHTML = `<p>${error.message || 'Tricks konnten nicht geladen werden.'}</p>`;
   }
}

initializeTricksOverview();
