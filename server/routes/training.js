const express = require('express');
const mongoose = require('mongoose');
const { requireAuthenticatedUser } = require('../middleware/session_auth');
const { Dog } = require('../models/dog_model');
const { Trick } = require('../models/trick_model');
const { Training } = require('../models/training_model');

const router = express.Router();

router.use(requireAuthenticatedUser);

function isTrickUnlockedByDoneSet(trick, doneSet) {
   const allRequired = (trick.prerequisiteAll || []).map((id) => String(id));
   const anyRequired = (trick.prerequisiteAny || []).map((id) => String(id));

   const hasAll = allRequired.every((id) => doneSet.has(id));
   const hasAny = anyRequired.length === 0 || anyRequired.some((id) => doneSet.has(id));

   return hasAll && hasAny;
}

async function getOwnedDogByNumericId(numericDogId, userId) {
   return Dog.findOne({ id: numericDogId, trainerUserId: userId }).lean();
}

router.get('/dog/:dogId', async (req, res, next) => {
   try {
      const numericDogId = Number(req.params.dogId);

      if (!Number.isInteger(numericDogId) || numericDogId <= 0) {
         return res.status(400).json({ message: 'Ungültige Hund-ID.' });
      }

      const dog = await getOwnedDogByNumericId(numericDogId, req.authUser.uid);
      if (!dog) {
         return res.status(404).json({ message: 'Hund nicht gefunden.' });
      }

      const trainings = await Training.find({ dogId: dog._id }).lean();
      const doneTrickIds = trainings.filter((entry) => entry.status === 'done').map((entry) => String(entry.trickId));

      return res.json({
         dogId: dog.id,
         trainings: trainings.map((entry) => ({
            trickId: String(entry.trickId),
            status: entry.status,
            attemptCount: entry.attemptCount,
            completedAt: entry.completedAt,
            unlockedAt: entry.unlockedAt,
            lastPracticedAt: entry.lastPracticedAt
         })),
         doneTrickIds
      });
   } catch (error) {
      return next(error);
   }
});

router.post('/dog/:dogId/trick/:trickId/complete', async (req, res, next) => {
   try {
      const numericDogId = Number(req.params.dogId);
      const trickId = req.params.trickId;

      if (!Number.isInteger(numericDogId) || numericDogId <= 0) {
         return res.status(400).json({ message: 'Ungültige Hund-ID.' });
      }

      if (!mongoose.isValidObjectId(trickId)) {
         return res.status(400).json({ message: 'Ungültige Trick-ID.' });
      }

      const dog = await getOwnedDogByNumericId(numericDogId, req.authUser.uid);
      if (!dog) {
         return res.status(404).json({ message: 'Hund nicht gefunden.' });
      }

      const trick = await Trick.findOne({ _id: trickId, isActive: true }).lean();
      if (!trick) {
         return res.status(404).json({ message: 'Trick nicht gefunden.' });
      }

      const existingTrainings = await Training.find({ dogId: dog._id, status: 'done' }, { trickId: 1 }).lean();
      const doneSet = new Set(existingTrainings.map((entry) => String(entry.trickId)));

      const alreadyDone = doneSet.has(String(trick._id));
      const unlocked = isTrickUnlockedByDoneSet(trick, doneSet);

      if (!alreadyDone && !unlocked) {
         return res.status(409).json({ message: 'Trick ist für diesen Hund noch gesperrt.' });
      }

      const now = new Date();
      const update = {
         $set: {
            status: 'done',
            completedAt: now,
            lastPracticedAt: now
         },
         $inc: {
            attemptCount: 1
         },
         $setOnInsert: {
            unlockedAt: now
         }
      };

      const training = await Training.findOneAndUpdate(
         {
            dogId: dog._id,
            trickId: trick._id
         },
         update,
         {
            upsert: true,
            returnDocument: 'after',
            runValidators: true
         }
      ).lean();

      return res.json({
         message: 'Trainingsfortschritt gespeichert.',
         training: {
            trickId: String(training.trickId),
            status: training.status,
            attemptCount: training.attemptCount,
            completedAt: training.completedAt,
            unlockedAt: training.unlockedAt,
            lastPracticedAt: training.lastPracticedAt
         }
      });
   } catch (error) {
      if (error?.code === 11000) {
         return res.status(409).json({ message: 'Fortschritt existiert bereits für diesen Hund und Trick.' });
      }

      return next(error);
   }
});

module.exports = router;

