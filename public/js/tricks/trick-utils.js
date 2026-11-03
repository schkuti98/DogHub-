export function toDisplayDifficulty(value) {
   if (!value) return 'Unbekannt';
   const lower = String(value).toLowerCase();
   if (lower === 'leicht') return 'Leicht';
   if (lower === 'mittel') return 'Mittel';
   if (lower === 'schwer') return 'Schwer';
   return value;
}

export function formatRequiredTricks(trick, trickMap) {
   const allReq = trick?.required?.all ?? [];
   const anyReq = trick?.required?.any ?? [];

   if (allReq.length === 0 && anyReq.length === 0) {
      return 'Keine';
   }

   const allNames = allReq.map((id) => trickMap[id]?.name || id);
   const anyNames = anyReq.map((id) => trickMap[id]?.name || id);
   const parts = [];

   if (allNames.length > 0) {
      parts.push(allNames.join(' und '));
   }

   if (anyNames.length > 0) {
      parts.push(anyNames.join(' oder '));
   }

   return parts.join(' + ');
}
