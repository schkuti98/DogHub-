const DOG_TEXT_REGEX = /^[A-Za-zÄÖÜäöüß\s-]{2,40}$/;

export function validateDogText(value, fieldName) {
   const text = String(value || '').trim();

   if (!text) {
      return `${fieldName} ist erforderlich.`;
   }

   if (!DOG_TEXT_REGEX.test(text)) {
      return `${fieldName} darf nur Buchstaben, Leerzeichen und Bindestriche enthalten (2-40 Zeichen).`;
   }

   return null;
}

export function validateDogAge(ageInput) {
   if (ageInput === '') {
      return { age: null };
   }

   const age = Number(ageInput);
   if (!Number.isInteger(age) || age < 0 || age > 30) {
      return { error: 'Alter muss eine ganze Zahl zwischen 0 und 30 sein.' };
   }

   return { age };
}
