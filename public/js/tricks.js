function getTrickStatuses(dogId, trickMap) {
   const progress = loadProgress();
   const done = progress[dogId] ?? {};
   const result = {};

   for (const trickId of Object.keys(trickMap)) {
      const isDone = done[trickId] === true;
      const unlocked = isTrickUnlocked(dogId, trickId, trickMap);

      let status = 'locked';
      if (isDone) status = 'done';
      else if (unlocked) status = 'unlocked';

      result[trickId] = { done: isDone, unlocked, status };
   }

   return result;
}

function renderTrickOverview(dogId, trickMap) {
   const list = document.querySelector('.trick-list');
   if (!list) return;

   const statuses = getTrickStatuses(dogId, trickMap);
   const cards = [];

   for (const [trickId, trick] of Object.entries(trickMap)) {
      const state = statuses[trickId];
      const isLocked = state.status === 'locked';
      const requiredText = formatRequiredTricks(trick);
      const stateLabel = state.status === 'done' ? 'Geschafft' : state.status === 'unlocked' ? 'Freigeschaltet' : 'Gesperrt';

      cards.push(`
         <a
            class="trick-card trick-card-link ${state.status}"
            href="${isLocked ? '#' : `trick.html#${trickId}`}"
            data-trick-id="${trickId}"
            aria-disabled="${isLocked ? 'true' : 'false'}"
            tabindex="${isLocked ? '-1' : '0'}"
         >
            <span class="schwierigkeit">${trick.stufe}</span>
            <h3>${trick.name}</h3>
            <p>${trick.beschreibung}</p>
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

const selectedDogId = localStorage.getItem('selectedDogId') || 'defaultDog';
renderTrickOverview(selectedDogId, tricks);
