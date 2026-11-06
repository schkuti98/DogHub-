const express = require('express');
const mongoose = require('mongoose');
const { requireAdmin } = require('../middleware/session_auth');
const { User } = require('../models/user_model');
const { Dog } = require('../models/dog_model');
const { Trick } = require('../models/trick_model');
const { Category } = require('../models/category_model');
const { Training } = require('../models/training_model');
const { TrainingNote } = require('../models/training_note_model');

const router = express.Router();

router.use(requireAdmin);

router.get('/overview', async (req, res, next) => {
   try {
      const [users, dogs, tricks, categories, trainings, notes] = await Promise.all([
         User.find({}, 'email role createdAt lastLoginAt').sort({ createdAt: -1 }).lean(),
         Dog.find({})
            .populate({ path: 'trainerUserId', select: 'email' })
            .sort({ createdAt: -1 })
            .lean(),
         Trick.find({})
            .populate({ path: 'categoryId', select: 'name' })
            .sort({ createdAt: 1 })
            .lean(),
         Category.find({}).sort({ sortOrder: 1, name: 1 }).lean(),
         Training.find({})
            .populate({ path: 'dogId', select: 'id name' })
            .populate({ path: 'trickId', select: 'name' })
            .sort({ updatedAt: -1 })
            .lean(),
         TrainingNote.find({})
            .populate({ path: 'dogId', select: 'id name' })
            .populate({ path: 'trickId', select: 'name' })
            .populate({ path: 'createdByUserId', select: 'email' })
            .sort({ notedAt: -1 })
            .lean()
      ]);

      return res.json({
         users: users.map((user) => ({ ...user, id: String(user._id), _id: undefined })),
         dogs: dogs.map((dog) => ({
            ...dog,
            ownerEmail: dog.trainerUserId?.email || '—',
            id: String(dog._id),
            _id: undefined
         })),
         tricks: tricks.map((trick) => ({
            ...trick,
            id: String(trick._id),
            _id: undefined,
            category: trick.categoryId
               ? { id: String(trick.categoryId._id), name: trick.categoryId.name }
               : null,
            categoryId: trick.categoryId ? String(trick.categoryId._id) : ''
         })),
         categories: categories.map((category) => ({
            id: String(category._id),
            name: category.name
         })),
         trainings: trainings.map((training) => ({
            id: String(training._id),
            dogId: training.dogId?.id ?? null,
            dogName: training.dogId?.name || 'Gelöschter Hund',
            trickId: training.trickId ? String(training.trickId._id) : '',
            trickName: training.trickId?.name || 'Gelöschter Trick',
            status: training.status,
            attemptCount: training.attemptCount,
            lastPracticedAt: training.lastPracticedAt
         })),
         notes: notes.map((note) => ({
            id: String(note._id),
            dogName: note.dogId?.name || 'Gelöschter Hund',
            trickName: note.trickId?.name || 'Allgemein',
            authorEmail: note.createdByUserId?.email || 'Unbekannt',
            note: note.note,
            notedAt: note.notedAt
         }))
      });
   } catch (error) {
      return next(error);
   }
});

router.put('/users/:id/role', async (req, res, next) => {
   try {
      const { id } = req.params;
      const { role } = req.body;

      if (!mongoose.isValidObjectId(id)) {
         return res.status(400).json({ message: 'Ungültige Benutzer-ID.' });
      }

      if (!['user', 'admin'].includes(role)) {
         return res.status(400).json({ message: 'Ungültige Benutzerrolle.' });
      }

      if (String(req.authUser.uid) === id && role !== 'admin') {
         return res.status(409).json({ message: 'Du kannst deine eigene Admin-Rolle nicht entfernen.' });
      }

      const user = await User.findById(id);
      if (!user) {
         return res.status(404).json({ message: 'Benutzer nicht gefunden.' });
      }

      if (user.role === 'admin' && role !== 'admin') {
         const adminCount = await User.countDocuments({ role: 'admin' });
         if (adminCount <= 1) {
            return res.status(409).json({ message: 'Der letzte Admin kann nicht herabgestuft werden.' });
         }
      }

      user.role = role;
      await user.save();

      return res.json({ id: String(user._id), role: user.role });
   } catch (error) {
      return next(error);
   }
});

router.put('/dogs/:id', async (req, res, next) => {
   try {
      const { id } = req.params;
      const { name, breed, age } = req.body;

      if (!mongoose.isValidObjectId(id)) {
         return res.status(400).json({ message: 'Ungültige Hunde-ID.' });
      }

      if (typeof name !== 'string' || !name.trim() || name.trim().length > 100) {
         return res.status(400).json({ message: 'Bitte einen gültigen Hundenamen angeben (max. 100 Zeichen).' });
      }

      if (typeof breed !== 'string' || !breed.trim() || breed.trim().length > 100) {
         return res.status(400).json({ message: 'Bitte eine gültige Rasse angeben (max. 100 Zeichen).' });
      }

      const normalizedAge = age === '' || age === null ? null : Number(age);
      if (normalizedAge !== null && (!Number.isInteger(normalizedAge) || normalizedAge < 0 || normalizedAge > 30)) {
         return res.status(400).json({ message: 'Alter muss eine ganze Zahl zwischen 0 und 30 sein.' });
      }

      const dog = await Dog.findByIdAndUpdate(
         id,
         { $set: { name: name.trim(), breed: breed.trim(), age: normalizedAge } },
         { returnDocument: 'after', runValidators: true }
      ).lean();

      if (!dog) {
         return res.status(404).json({ message: 'Hund nicht gefunden.' });
      }

      return res.json({ message: 'Hund aktualisiert.' });
   } catch (error) {
      return next(error);
   }
});

router.put('/trainings/:id', async (req, res, next) => {
   try {
      const { id } = req.params;
      const { status } = req.body;

      if (!mongoose.isValidObjectId(id)) {
         return res.status(400).json({ message: 'Ungültige Fortschritts-ID.' });
      }

      if (!['locked', 'unlocked', 'in_progress', 'done'].includes(status)) {
         return res.status(400).json({ message: 'Ungültiger Trainingsstatus.' });
      }

      const training = await Training.findById(id);
      if (!training) {
         return res.status(404).json({ message: 'Trainingsfortschritt nicht gefunden.' });
      }

      training.status = status;
      training.completedAt = status === 'done' ? (training.completedAt || new Date()) : null;
      if (status === 'unlocked' && !training.unlockedAt) {
         training.unlockedAt = new Date();
      }
      await training.save();

      return res.json({ message: 'Trainingsfortschritt aktualisiert.' });
   } catch (error) {
      return next(error);
   }
});

router.delete('/notes/:id', async (req, res, next) => {
   try {
      if (!mongoose.isValidObjectId(req.params.id)) {
         return res.status(400).json({ message: 'Ungültige Notiz-ID.' });
      }

      const result = await TrainingNote.deleteOne({ _id: req.params.id });
      if (result.deletedCount !== 1) {
         return res.status(404).json({ message: 'Trainingsnotiz nicht gefunden.' });
      }

      return res.status(204).send();
   } catch (error) {
      return next(error);
   }
});

module.exports = router;
