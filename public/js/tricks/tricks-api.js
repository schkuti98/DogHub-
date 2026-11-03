import { toDisplayDifficulty } from './trick-utils.js';

let trickMapPromise = null;

function mapTrickFromApi(apiTrick) {
   const categoryName = apiTrick?.category?.name || 'Allgemein';
   const difficultyText = toDisplayDifficulty(apiTrick?.difficulty);

   return {
      id: String(apiTrick.id),
      name: apiTrick.name,
      description: apiTrick.description,
      levelLabel: `${categoryName} · ${difficultyText}`,
      required: {
         all: (apiTrick.prerequisiteAll || []).map((id) => String(id)),
         any: (apiTrick.prerequisiteAny || []).map((id) => String(id))
      },
      steps: apiTrick.steps || [],
      categoryName,
      difficulty: apiTrick.difficulty
   };
}

// Lädt alle Tricks einmalig und liefert eine Map { trickId: trick }
export async function loadTrickMap() {
   if (!trickMapPromise) {
      trickMapPromise = (async () => {
         const response = await fetch('/api/tricks');

         if (response.status === 401) {
            window.location.href = '/app/login';
            throw new Error('Nicht angemeldet.');
         }

         const payload = await response.json().catch(() => ({}));

         if (!response.ok) {
            throw new Error(payload.message || 'Tricks konnten nicht geladen werden.');
         }

         const trickMap = {};
         for (const trick of payload.tricks || []) {
            const mapped = mapTrickFromApi(trick);
            trickMap[mapped.id] = mapped;
         }

         return trickMap;
      })();
   }

   return trickMapPromise;
}
