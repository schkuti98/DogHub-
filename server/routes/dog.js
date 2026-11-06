const express = require('express');
const multer = require('multer');
const { randomUUID } = require('crypto');
const dogModel = require('../models/dog_model');
const { requireAuthenticatedUser } = require('../middleware/session_auth');
const { getDogPhotoBucket, uploadDogPhoto, deleteDogPhoto } = require('../database/gridfs');

const router = express.Router();
const DOG_TEXT_REGEX = /^[A-Za-zÄÖÜäöüß\s-]{2,40}$/;
const MAX_DOG_PHOTO_SIZE = 5 * 1024 * 1024;
const DOG_PHOTO_TYPES = new Map([
   ['image/jpeg', 'jpg'],
   ['image/png', 'png'],
   ['image/webp', 'webp']
]);
const dogPhotoUpload = multer({
   storage: multer.memoryStorage(),
   limits: { fileSize: MAX_DOG_PHOTO_SIZE, files: 1 },
   fileFilter: (req, file, callback) => {
      if (!DOG_PHOTO_TYPES.has(file.mimetype)) {
         callback(new Error('Nur JPG-, PNG- und WebP-Bilder sind erlaubt.'));
         return;
      }
      callback(null, true);
   }
});

router.use(requireAuthenticatedUser);

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
      return { age: null };
   }

   const age = Number(value);

   if (!Number.isInteger(age) || age < 0 || age > 30) {
      return { error: 'Alter muss eine ganze Zahl zwischen 0 und 30 sein.' };
   }

   return { age };
}

function toClientDog(dog) {
   const result = { ...dog };
   delete result.photoId;
   result.photoUrl = dog.photoId ? `/dogs/${dog.id}/photo` : null;
   return result;
}

function parseDogPhoto(req, res, next) {
   dogPhotoUpload.single('photo')(req, res, (error) => {
      if (!error) return next();

      if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
         return res.status(413).json({ message: 'Das Foto darf höchstens 5 MB groß sein.' });
      }

      return res.status(400).json({ message: error.message || 'Das Foto konnte nicht gelesen werden.' });
   });
}

function getImageContentType(buffer) {
   if (
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
   ) {
      return 'image/jpeg';
   }

   if (buffer.subarray(0, 8).toString('hex') === '89504e470d0a1a0a') {
      return 'image/png';
   }

   if (
      buffer.length >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP'
   ) {
      return 'image/webp';
   }

   return null;
}

router.get('/', async (req, res, next) => {
   try {
      const dogs = await dogModel.getAllDogs(req.authUser.uid);
      return res.json(dogs.map(toClientDog));
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

      const dog = await dogModel.getDogById(dogId, req.authUser.uid);

      if (!dog) {
         return res.status(404).json({ message: 'Hund nicht gefunden' });
      }

      return res.json(toClientDog(dog));
   } catch (error) {
      return next(error);
   }
});

router.get('/:id/photo', async (req, res, next) => {
   try {
      const dogId = Number(req.params.id);
      if (!Number.isInteger(dogId) || dogId <= 0) {
         return res.status(400).json({ message: 'Ungültige Hunde-ID.' });
      }

      const dog = await dogModel.getDogById(dogId, req.authUser.uid);
      if (!dog) {
         return res.status(404).json({ message: 'Hund nicht gefunden.' });
      }
      if (!dog.photoId) {
         return res.status(404).json({ message: 'Für diesen Hund ist kein Foto gespeichert.' });
      }

      const bucket = getDogPhotoBucket();
      const [file] = await bucket.find({ _id: dog.photoId }).limit(1).toArray();
      if (!file) {
         return res.status(404).json({ message: 'Das Hundefoto wurde nicht gefunden.' });
      }

      res.set({
         'Content-Type': file.contentType || 'application/octet-stream',
         'Cache-Control': 'private, no-store',
         'X-Content-Type-Options': 'nosniff'
      });

      const downloadStream = bucket.openDownloadStream(dog.photoId);
      downloadStream.once('error', (error) => {
         if (res.headersSent) {
            res.destroy(error);
            return;
         }
         next(error);
      });
      return downloadStream.pipe(res);
   } catch (error) {
      return next(error);
   }
});

router.post('/:id/photo', parseDogPhoto, async (req, res, next) => {
   let uploadedPhotoId;
   try {
      const dogId = Number(req.params.id);
      if (!Number.isInteger(dogId) || dogId <= 0) {
         return res.status(400).json({ message: 'Ungültige Hunde-ID.' });
      }
      if (!req.file) {
         return res.status(400).json({ message: 'Bitte wähle ein Foto aus.' });
      }

      const contentType = getImageContentType(req.file.buffer);
      if (!contentType || DOG_PHOTO_TYPES.get(contentType) === undefined || contentType !== req.file.mimetype) {
         return res.status(400).json({ message: 'Die Datei ist kein gültiges JPG-, PNG- oder WebP-Bild.' });
      }

      const dog = await dogModel.getDogById(dogId, req.authUser.uid);
      if (!dog) {
         return res.status(404).json({ message: 'Hund nicht gefunden.' });
      }

      const extension = DOG_PHOTO_TYPES.get(contentType);
      uploadedPhotoId = await uploadDogPhoto({
         buffer: req.file.buffer,
         filename: `${randomUUID()}.${extension}`,
         contentType,
         dogId: dog._id,
         ownerId: req.authUser.uid
      });

      try {
         await dogModel.updateDog(dogId, { photoId: uploadedPhotoId }, req.authUser.uid);
      } catch (error) {
         await deleteDogPhoto(uploadedPhotoId);
         uploadedPhotoId = null;
         throw error;
      }

      let warning;
      if (dog.photoId) {
         try {
            await deleteDogPhoto(dog.photoId);
         } catch (error) {
            console.error('Hundefoto wurde ersetzt, aber das vorherige GridFS-Foto konnte nicht gelöscht werden:', error);
            warning = 'Das vorherige Foto konnte nicht aus MongoDB entfernt werden.';
         }
      }

      return res.json({
         message: 'Hundefoto gespeichert.',
         warning,
         photoUrl: `/dogs/${dogId}/photo`
      });
   } catch (error) {
      if (uploadedPhotoId) {
         try {
            await deleteDogPhoto(uploadedPhotoId);
         } catch (cleanupError) {
            console.error('Das nicht zugeordnete Hundefoto konnte nicht aus GridFS gelöscht werden:', cleanupError);
         }
      }
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
         breed: String(breed).trim(),
         trainerUserId: req.authUser.uid
      });
      return res.status(201).json(toClientDog(createdDog));
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

      const updatedDog = await dogModel.updateDog(dogId, updates, req.authUser.uid);

      if (!updatedDog) {
         return res.status(404).json({ message: 'Hund nicht gefunden' });
      }

      return res.json(toClientDog(updatedDog));
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

      const dog = await dogModel.getDogById(dogId, req.authUser.uid);
      if (!dog) {
         return res.status(404).json({ message: 'Hund nicht gefunden' });
      }

      const deleted = await dogModel.deleteDog(dogId, req.authUser.uid);

      if (!deleted) {
         return res.status(404).json({ message: 'Hund nicht gefunden' });
      }

      let warning;
      if (dog.photoId) {
         try {
            await deleteDogPhoto(dog.photoId);
         } catch (error) {
            console.error('Hund wurde gelöscht, aber das Hundefoto konnte nicht aus GridFS entfernt werden:', error);
            warning = 'Das zugehörige Foto konnte nicht aus MongoDB entfernt werden.';
         }
      }

      return res.json({
         message: 'Hund gelöscht.',
         warning
      });
   } catch (error) {
      return next(error);
   }
});

module.exports = router;
