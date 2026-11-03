const SELECTED_DOG_KEY = 'selectedDogId';

// Gespeicherten Hund verwenden, sonst den ersten der Liste
export function getSelectedDogId(dogs) {
   const fallback = dogs[0] ? String(dogs[0].id) : '';
   const stored = localStorage.getItem(SELECTED_DOG_KEY);
   const isStoredValid = stored ? dogs.some((dog) => String(dog.id) === String(stored)) : false;
   const selected = isStoredValid ? String(stored) : fallback;

   if (selected) {
      localStorage.setItem(SELECTED_DOG_KEY, selected);
   }

   return selected;
}

export function setSelectedDogId(dogId) {
   localStorage.setItem(SELECTED_DOG_KEY, dogId);
}
