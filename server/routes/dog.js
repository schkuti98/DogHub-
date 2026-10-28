const express = require('express');
const dogModel = require('../models/dog_model');

const router = express.Router();

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

      if (!name || !breed) {
         return res.status(400).json({ message: 'name und rasse sind erforderlich' });
      }

      const createdDog = await dogModel.createDog({ name, age, breed });
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
      const updatedDog = await dogModel.updateDog(dogId, { name, age, breed });

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
