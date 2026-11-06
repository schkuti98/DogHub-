import { fetchDogs } from './dogs-api.js';

const homeDogList = document.getElementById('home-dog-list');

function escapeHtml(value) {
   return String(value ?? '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
   })[character]);
}

function renderHomeDogs(dogs) {
   if (!homeDogList) return;

   if (!Array.isArray(dogs) || dogs.length === 0) {
      homeDogList.innerHTML = '<p>Noch keine Hunde angelegt. Lege deinen ersten Hund an.</p>';
      return;
   }

   homeDogList.innerHTML = dogs
      .slice(0, 3)
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
            </div>
         </article>
      `
      )
      .join('');
}

async function loadHomeDogs() {
   if (!homeDogList) return;

   try {
      renderHomeDogs(await fetchDogs());
   } catch {
      homeDogList.innerHTML = '<p>Hunde konnten nicht geladen werden.</p>';
   }
}

loadHomeDogs();
