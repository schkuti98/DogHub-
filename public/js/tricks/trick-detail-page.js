import { fetchDogsOrRedirect } from '../dogs/dogs-api.js';
import { getSelectedDogId, setSelectedDogId } from '../dogs/selected-dog.js';
import { loadTrainingStateForDog, isTrickUnlockedByDoneSet, markTrickDone } from '../training/training-api.js';
import { loadTrickMap } from './tricks-api.js';
import { formatRequiredTricks } from './trick-utils.js';

const trickDetailContainer = document.getElementById('trick-detail');

function escapeHtml(value) {
   return String(value ?? '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
   })[character]);
}

function getVideoEmbedUrl(value) {
   if (!value) return null;

   try {
      const url = new URL(value);
      const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
      let videoId = '';

      if (hostname === 'youtube.com' || hostname === 'youtube-nocookie.com') {
         videoId = url.searchParams.get('v') || url.pathname.split('/').filter(Boolean).pop() || '';
      } else if (hostname === 'youtu.be' || hostname === 'vimeo.com' || hostname === 'player.vimeo.com') {
         videoId = url.pathname.split('/').filter(Boolean).pop() || '';
      }

      if (!videoId || !/^[A-Za-z0-9_-]+$/.test(videoId)) return null;
      if (hostname.includes('youtube') || hostname === 'youtu.be') {
         return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`;
      }
      return `https://player.vimeo.com/video/${encodeURIComponent(videoId)}`;
   } catch {
      return null;
   }
}

function renderTrickMedia(trick) {
   const image = trick.imageUrl
      ? `<img class="trick-media-image" src="${escapeHtml(trick.imageUrl)}" alt="Beispielbild für ${escapeHtml(trick.name)}">`
      : '';
   const embedUrl = getVideoEmbedUrl(trick.videoUrl);
   const video = embedUrl
      ? `<div class="trick-media-video"><iframe src="${escapeHtml(embedUrl)}" title="Video zu ${escapeHtml(trick.name)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`
      : '';

   if (!image && !video) return '';
   return `<div class="trick-media">${image}${video}</div>`;
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
      <h2>${escapeHtml(trick.name)}</h2>
      <p>${escapeHtml(trick.description)}</p>
      ${renderTrickMedia(trick)}
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
