// TODO: Speichern und Laden des Trainingsfortschritts ergänzen
function loadProgress() {
   const raw = localStorage.getItem('trainingProgress');
   if (!raw) return {};
   try {
      return JSON.parse(raw);
   } catch {
      return {};
   }
}

function saveProgress(progress) {
   if (typeof progress !== 'object' || progress === null) return;
   const json = JSON.stringify(progress);
   localStorage.setItem('trainingProgress', json);
}
function markTrickDone(dogId, trickId) {
   const progress = loadProgress();

   if (!progress[dogId]) progress[dogId] = {};
   progress[dogId][trickId] = true;

   saveProgress(progress);
   return progress;
}
function isTrickUnlocked(dogId, trickId, tricks) {
   const trick = tricks[trickId];
   if (!trick) return false;

   const progress = loadProgress();
   const done = progress[dogId] ?? {};

   const allReq = trick.required?.all ?? [];
   const anyReq = trick.required?.any ?? [];

   const allOk = allReq.every((req) => done[req] === true);
   const anyOk = anyReq.length === 0 || anyReq.some((req) => done[req] === true);

   return allOk && anyOk;
}
