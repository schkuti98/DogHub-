const homeDogList = document.getElementById('home-dog-list');

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
            <div class="dog-picture" aria-hidden="true">🐕</div>
            <div>
               <h3>${dog.name}</h3>
               <p>${dog.breed}</p>
               <p>Alter: ${dog.age ?? 'unbekannt'}</p>
            </div>
         </article>
      `
      )
      .join('');
}

async function loadHomeDogs() {
   if (!homeDogList) return;

   try {
      const response = await fetch('/dogs');
      const dogs = await response.json();

      if (!response.ok) {
         throw new Error('Hunde konnten nicht geladen werden.');
      }

      renderHomeDogs(dogs);
   } catch {
      homeDogList.innerHTML = '<p>Hunde konnten nicht geladen werden.</p>';
   }
}

loadHomeDogs();
