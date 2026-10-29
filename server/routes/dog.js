const express = require('express');
const dogModel = require('../models/dog_model');

const router = express.Router();
const DOG_TEXT_REGEX = /^[A-Za-zÄÖÜäöüß\s-]{2,40}$/;

function validateDogText(value, fieldName) {
   const text = String(value || '').trim();

   if (!text) {
      return `${fieldName} ist erforderlich.`;
   }

   if (!DOG_TEXT_REGEX.test(text)) {
      return `${fieldName} darf nur Buchstaben, Leerzeichen und Bindestriche enthalten (2-40 Zeichen).`;
   }

   return null;
}

function normalizeAge(value) {
   if (value === undefined || value === null || value === '') {
      return null;
   }

   const age = Number(value);

   if (!Number.isInteger(age) || age < 0 || age > 30) {
      return { error: 'Alter muss eine ganze Zahl zwischen 0 und 30 sein.' };
   }

   return { age };
}

router.get('/', async (req, res, next) => {
   try {
      const dogs = await dogModel.getAllDogs();
      return res.json(dogs);
   } catch (error) {
      return next(error);
   }
});

router.get('/:id', async (req, res, next) => {
   try {
      const dogId = Number(req.params.id);

      if (!Number.isInteger(dogId) || dogId <= 0) {
         return res.status(400).json({ message: 'Ungültige ID' });
      }

      const dog = await dogModel.getDogById(dogId);

      if (!dog) {
         return res.status(404).json({ message: 'Hund nicht gefunden' });
      }

      return res.json(dog);
   } catch (error) {
      return next(error);
   }
});

router.post('/', async (req, res, next) => {
   try {
      const { name, age, breed } = req.body;

      const nameError = validateDogText(name, 'Name');
      if (nameError) {
         return res.status(400).json({ message: nameError });
      }

      const breedError = validateDogText(breed, 'Rasse');
      if (breedError) {
         return res.status(400).json({ message: breedError });
      }

      const ageCheck = normalizeAge(age);
      if (ageCheck.error) {
         return res.status(400).json({ message: ageCheck.error });
      }

      const createdDog = await dogModel.createDog({
         name: String(name).trim(),
         age: ageCheck.age,
         breed: String(breed).trim()
      });
      return res.status(201).json(createdDog);
   } catch (error) {
      return next(error);
   }
});

router.put('/:id', async (req, res, next) => {
   try {
      const dogId = Number(req.params.id);

      if (!Number.isInteger(dogId) || dogId <= 0) {
         return res.status(400).json({ message: 'Ungültige ID' });
      }

      const { name, age, breed } = req.body;

      if (name !== undefined) {
         const nameError = validateDogText(name, 'Name');
         if (nameError) {
            return res.status(400).json({ message: nameError });
         }
      }

      if (breed !== undefined) {
         const breedError = validateDogText(breed, 'Rasse');
         if (breedError) {
            return res.status(400).json({ message: breedError });
         }
      }

      const ageCheck = normalizeAge(age);
      if (ageCheck.error) {
         return res.status(400).json({ message: ageCheck.error });
      }

      const updates = {
         ...(name !== undefined ? { name: String(name).trim() } : {}),
         ...(breed !== undefined ? { breed: String(breed).trim() } : {}),
         ...(age !== undefined ? { age: ageCheck.age } : {})
      };

      const updatedDog = await dogModel.updateDog(dogId, updates);

      if (!updatedDog) {
         return res.status(404).json({ message: 'Hund nicht gefunden' });
      }

      return res.json(updatedDog);
   } catch (error) {
      return next(error);
   }
});

router.delete('/:id', async (req, res, next) => {
   try {
      const dogId = Number(req.params.id);

      if (!Number.isInteger(dogId) || dogId <= 0) {
         return res.status(400).json({ message: 'Ungültige ID' });
      }

      const deleted = await dogModel.deleteDog(dogId);

      if (!deleted) {
         return res.status(404).json({ message: 'Hund nicht gefunden' });
      }

      return res.status(204).send();
   } catch (error) {
      return next(error);
   }
});

module.exports = router;
