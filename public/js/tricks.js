function getTrickStatuses(dogId, tricks) {
   const progress = loadProgress();
   const done = progress[dogId] ?? {};
   const result = {};

   for (const trickId of Object.keys(tricks)) {
      const isDone = done[trickId] === true;
      const unlocked = isTrickUnlocked(dogId, trickId, tricks);

      let status = 'locked';
      if (isDone) status = 'done';
      else if (unlocked) status = 'unlocked';

      result[trickId] = { done: isDone, unlocked, status };
   }

   return result;
}

//  Render
function renderTrickOverview(dogId, tricks) {
   const list = document.querySelector('.trick-list');
   if (!list) return;

   const statuses = getTrickStatuses(dogId, tricks);
   const cards = [];

   for (const [trickId, trick] of Object.entries(tricks)) {
      const state = statuses[trickId];
      const isLocked = state.status === 'locked';
      const stateLabel = state.status === 'done' ? 'Geschafft' : state.status === 'unlocked' ? 'Freigeschaltet' : 'Gesperrt';

      cards.push(`
         <a
            class="trick-card ${state.status}"
            href="${isLocked ? '#' : `trick.html#${trickId}`}"
            data-trick-id="${trickId}"
            aria-disabled="${isLocked ? 'true' : 'false'}"
            tabindex="${isLocked ? '-1' : '0'}"
         >
            <h3>${trick.name}</h3>
            <p>${trick.stufe}</p>
            <p class="trick-state">${stateLabel}</p>
         </a>
      `);
   }

   list.innerHTML = cards.join('');

   // Klick auf gesperrte Karten blockieren
   list.querySelectorAll('.trick-card.locked').forEach((card) => {
      card.addEventListener('click', (event) => {
         event.preventDefault();
      });
   });
}

//  Init
// TODO: dogId dynamisch aus Auswahl/Login holen
const selectedDogId = localStorage.getItem('selectedDogId') || 'defaultDog';
// `tricks` muss aus deiner Trick-Datenquelle kommen (z. B. global aus trick.js)
renderTrickOverview(selectedDogId, tricks);
