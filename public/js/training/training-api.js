const trainingStateCache = new Map();

function toDoneSet(doneTrickIds) {
   return new Set((doneTrickIds || []).map((id) => String(id)));
}

export async function loadTrainingStateForDog(dogId) {
   const normalizedDogId = String(dogId || '').trim();
   if (!normalizedDogId) {
      return { doneTrickIds: [], doneSet: new Set(), statusByTrickId: {} };
   }

   if (trainingStateCache.has(normalizedDogId)) {
      return trainingStateCache.get(normalizedDogId);
   }

   const response = await fetch(`/api/training/dog/${encodeURIComponent(normalizedDogId)}`);

   if (response.status === 401) {
      window.location.href = '/app/login';
      throw new Error('Nicht angemeldet.');
   }

   const payload = await response.json().catch(() => ({}));

   if (!response.ok) {
      throw new Error(payload.message || 'Trainingsfortschritt konnte nicht geladen werden.');
   }

   const statusByTrickId = {};
   for (const entry of payload.trainings || []) {
      statusByTrickId[String(entry.trickId)] = entry.status;
   }

   const state = {
      doneTrickIds: payload.doneTrickIds || [],
      doneSet: toDoneSet(payload.doneTrickIds),
      statusByTrickId
   };

   trainingStateCache.set(normalizedDogId, state);
   return state;
}

function clearTrainingStateCacheForDog(dogId) {
   const normalizedDogId = String(dogId || '').trim();
   if (!normalizedDogId) return;
   trainingStateCache.delete(normalizedDogId);
}

export function isTrickUnlockedByDoneSet(trick, doneSet) {
   const allReq = trick?.required?.all ?? [];
   const anyReq = trick?.required?.any ?? [];

   const allOk = allReq.every((reqId) => doneSet.has(String(reqId)));
   const anyOk = anyReq.length === 0 || anyReq.some((reqId) => doneSet.has(String(reqId)));

   return allOk && anyOk;
}

export async function markTrickDone(dogId, trickId) {
   const response = await fetch(`/api/training/dog/${encodeURIComponent(dogId)}/trick/${encodeURIComponent(trickId)}/complete`, {
      method: 'POST'
   });

   if (response.status === 401) {
      window.location.href = '/app/login';
      throw new Error('Nicht angemeldet.');
   }

   const payload = await response.json().catch(() => ({}));

   if (!response.ok) {
      throw new Error(payload.message || 'Trainingsfortschritt konnte nicht gespeichert werden.');
   }

   clearTrainingStateCacheForDog(dogId);
   return payload;
}
