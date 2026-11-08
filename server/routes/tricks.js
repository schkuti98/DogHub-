const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const { randomUUID } = require('crypto');
const { requireAuthenticatedUser, requireAdmin } = require('../middleware/session_auth');
const { Trick } = require('../models/trick_model');
const { Category } = require('../models/category_model');
const { getTrickImageBucket, uploadTrickImage, deleteTrickImage } = require('../database/gridfs');

const router = express.Router();

router.use(requireAuthenticatedUser);

const MAX_TRICK_IMAGE_SIZE = 8 * 1024 * 1024;
const TRICK_IMAGE_TYPES = new Map([
   ['image/jpeg', 'jpg'],
   ['image/png', 'png'],
   ['image/webp', 'webp']
]);
const trickImageUpload = multer({
   storage: multer.memoryStorage(),
   limits: { fileSize: MAX_TRICK_IMAGE_SIZE, files: 1 },
   fileFilter: (req, file, callback) => {
      if (!TRICK_IMAGE_TYPES.has(file.mimetype)) {
         callback(new Error('Nur JPG-, PNG- und WebP-Bilder sind erlaubt.'));
         return;
      }
      callback(null, true);
   }
});

function parseTrickImage(req, res, next) {
   trickImageUpload.single('image')(req, res, (error) => {
      if (!error) return next();

      if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
         return res.status(413).json({ message: 'Das Trickbild darf höchstens 8 MB groß sein.' });
      }

      return res.status(400).json({ message: error.message || 'Das Trickbild konnte nicht gelesen werden.' });
   });
}

function getImageContentType(buffer) {
   if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
   if (buffer.subarray(0, 8).toString('hex') === '89504e470d0a1a0a') return 'image/png';
   if (
      buffer.length >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP'
   ) return 'image/webp';
   return null;
}

function normalizeVideoUrl(value) {
   if (value === undefined || value === null || value === '') return { videoUrl: null };
   if (typeof value !== 'string' || value.trim().length > 500) {
      return { error: 'Der Video-Link darf höchstens 500 Zeichen lang sein.' };
   }

   let url;
   try {
      url = new URL(value.trim());
   } catch {
      return { error: 'Bitte gib einen gültigen YouTube- oder Vimeo-Link ein.' };
   }

   if (url.protocol !== 'https:') {
      return { error: 'Der Video-Link muss mit https:// beginnen.' };
   }

   const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
   const allowed = ['youtube.com', 'youtu.be', 'youtube-nocookie.com', 'vimeo.com', 'player.vimeo.com'];
   if (!allowed.includes(hostname)) {
      return { error: 'Nur YouTube- und Vimeo-Links sind erlaubt.' };
   }

   const pathParts = url.pathname.split('/').filter(Boolean);
   const videoId = hostname === 'youtube.com' || hostname === 'youtube-nocookie.com'
      ? url.searchParams.get('v') || pathParts[pathParts.length - 1]
      : pathParts[pathParts.length - 1];

   if (!videoId || !/^[A-Za-z0-9_-]+$/.test(videoId) || (hostname.includes('vimeo') && !/^\d+$/.test(videoId))) {
      return { error: 'Der Video-Link enthält keine gültige Video-ID.' };
   }

   return { videoUrl: url.toString() };
}

function toClientTrick(trickDoc) {
   return {
      id: String(trickDoc._id),
      name: trickDoc.name,
      description: trickDoc.description,
      createdAt: trickDoc.createdAt,
      difficulty: trickDoc.difficulty,
      category: trickDoc.categoryId
         ? {
              id: String(trickDoc.categoryId._id || trickDoc.categoryId),
              name: trickDoc.categoryId.name || null
           }
         : null,
      steps: (trickDoc.steps || [])
         .slice()
         .sort((a, b) => a.order - b.order)
         .map((step) => step.text),
      imageUrl: trickDoc.imageId
         ? `/api/tricks/${String(trickDoc._id)}/image?v=${String(trickDoc.imageId)}`
         : null,
      videoUrl: trickDoc.videoUrl || null,
      prerequisiteAll: (trickDoc.prerequisiteAll || []).map((id) => String(id)),
      prerequisiteAny: (trickDoc.prerequisiteAny || []).map((id) => String(id)),
      isActive: trickDoc.isActive
   };
}

function normalizeRefArray(value) {
   if (!Array.isArray(value)) return [];
   return value.filter(Boolean).map((id) => String(id));
}

function normalizeSteps(value) {
   if (!Array.isArray(value)) {
      return { error: 'Die Anleitung muss als Liste von Schritten angegeben werden.' };
   }

   const steps = value.map((step, index) => {
      const text = typeof step === 'string' ? step.trim() : String(step?.text || '').trim();
      return { order: index + 1, text };
   });

   if (steps.some((step) => !step.text || step.text.length > 1000)) {
      return { error: 'Jeder Anleitungsschritt muss Text enthalten (max. 1000 Zeichen).' };
   }

   return { steps };
}

function isCycleAfterUpdate(startId, allTricks, prerequisitesById) {
   const visited = new Set();
   const stack = new Set();

   function visit(nodeId) {
      if (stack.has(nodeId)) return true;
      if (visited.has(nodeId)) return false;

      visited.add(nodeId);
      stack.add(nodeId);

      const next = prerequisitesById.get(nodeId) || [];
      for (const child of next) {
         if (visit(child)) return true;
      }

      stack.delete(nodeId);
      return false;
   }

   if (!allTricks.find((trick) => String(trick._id) === startId)) {
      return false;
   }

   return visit(startId);
}

router.get('/', async (req, res, next) => {
   try {
      const tricks = await Trick.find({ isActive: true })
         .populate({ path: 'categoryId', select: 'name' })
         .sort({ createdAt: 1 })
         .lean();

      return res.json({
         tricks: tricks.map(toClientTrick)
      });
   } catch (error) {
      return next(error);
   }
});

router.post('/', requireAdmin, async (req, res, next) => {
   try {
      const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
      const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';
      const difficulty = typeof req.body.difficulty === 'string' ? req.body.difficulty.trim().toLowerCase() : '';
      const categoryId = String(req.body.categoryId || '');
      const videoCheck = normalizeVideoUrl(req.body.videoUrl);

      if (videoCheck.error) {
         return res.status(400).json({ message: videoCheck.error });
      }

      if (!name || name.length > 100) {
         return res.status(400).json({ message: 'Name ist erforderlich (max. 100 Zeichen).' });
      }

      if (!description || description.length > 3000) {
         return res.status(400).json({ message: 'Beschreibung ist erforderlich (max. 3000 Zeichen).' });
      }

      if (!['leicht', 'mittel', 'schwer'].includes(difficulty)) {
         return res.status(400).json({ message: 'Ungültiger Schwierigkeitsgrad.' });
      }

      if (!mongoose.isValidObjectId(categoryId) || !(await Category.exists({ _id: categoryId }))) {
         return res.status(400).json({ message: 'Ungültige Kategorie-ID.' });
      }

      const stepsCheck = normalizeSteps(req.body.steps || []);
      if (stepsCheck.error) {
         return res.status(400).json({ message: stepsCheck.error });
      }

      const prerequisiteAll = normalizeRefArray(req.body.prerequisiteAll);
      const prerequisiteAny = normalizeRefArray(req.body.prerequisiteAny);
      const prerequisites = [...new Set([...prerequisiteAll, ...prerequisiteAny])];

      if (prerequisites.some((id) => !mongoose.isValidObjectId(id))) {
         return res.status(400).json({ message: 'Ungültige Voraussetzung-ID enthalten.' });
      }

      if (prerequisites.length > 0) {
         const existingCount = await Trick.countDocuments({ _id: { $in: prerequisites } });
         if (existingCount !== prerequisites.length) {
            return res.status(400).json({ message: 'Mindestens eine Voraussetzung verweist auf einen unbekannten Trick.' });
         }
      }

      const trick = await Trick.create({
         name,
         description,
         categoryId,
         difficulty,
         videoUrl: videoCheck.videoUrl,
         steps: stepsCheck.steps,
         prerequisiteAll,
         prerequisiteAny,
         isActive: true
      });

      const createdTrick = await Trick.findById(trick._id)
         .populate({ path: 'categoryId', select: 'name' })
         .lean();

      return res.status(201).json({
         message: 'Trick erfolgreich angelegt.',
         trick: toClientTrick(createdTrick)
      });
   } catch (error) {
      if (error?.code === 11000) {
         return res.status(409).json({ message: 'Ein Trick mit diesem Namen existiert bereits in der Kategorie.' });
      }
      return next(error);
   }
});

router.get('/:id/image', async (req, res, next) => {
   try {
      if (!mongoose.isValidObjectId(req.params.id)) {
         return res.status(400).json({ message: 'Ungültige Trick-ID.' });
      }

      const trick = await Trick.findById(req.params.id).select('imageId').lean();
      if (!trick) return res.status(404).json({ message: 'Trick nicht gefunden.' });
      if (!trick.imageId) return res.status(404).json({ message: 'Für diesen Trick ist kein Bild gespeichert.' });

      const bucket = getTrickImageBucket();
      const [file] = await bucket.find({ _id: trick.imageId }).limit(1).toArray();
      if (!file) return res.status(404).json({ message: 'Das Trickbild wurde nicht gefunden.' });

      res.set({
         'Content-Type': file.contentType || 'application/octet-stream',
         'Cache-Control': 'private, max-age=86400, immutable',
         'X-Content-Type-Options': 'nosniff'
      });

      const downloadStream = bucket.openDownloadStream(trick.imageId);
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

router.post('/:id/image', requireAdmin, parseTrickImage, async (req, res, next) => {
   let uploadedImageId;
   try {
      if (!mongoose.isValidObjectId(req.params.id)) {
         return res.status(400).json({ message: 'Ungültige Trick-ID.' });
      }
      if (!req.file) {
         return res.status(400).json({ message: 'Bitte wähle ein Bild aus.' });
      }

      const contentType = getImageContentType(req.file.buffer);
      if (!contentType || contentType !== req.file.mimetype) {
         return res.status(400).json({ message: 'Die Datei ist kein gültiges JPG-, PNG- oder WebP-Bild.' });
      }

      const trick = await Trick.findById(req.params.id);
      if (!trick) return res.status(404).json({ message: 'Trick nicht gefunden.' });

      const extension = TRICK_IMAGE_TYPES.get(contentType);
      uploadedImageId = await uploadTrickImage({
         buffer: req.file.buffer,
         filename: `${randomUUID()}.${extension}`,
         contentType,
         trickId: trick._id,
         ownerId: req.authUser.uid
      });

      const previousImageId = trick.imageId;
      trick.imageId = uploadedImageId;
      trick.imageContentType = contentType;
      await trick.save();
      uploadedImageId = null;

      let warning;
      if (previousImageId) {
         try {
            await deleteTrickImage(previousImageId);
         } catch (error) {
            console.error('Das vorherige Trickbild konnte nicht aus MongoDB entfernt werden:', error);
            warning = 'Das vorherige Bild konnte nicht aus MongoDB entfernt werden.';
         }
      }

      return res.json({
         message: 'Trickbild gespeichert.',
         warning,
         imageUrl: `/api/tricks/${trick._id}/image?v=${String(trick.imageId)}`
      });
   } catch (error) {
      if (uploadedImageId) {
         try {
            await deleteTrickImage(uploadedImageId);
         } catch (cleanupError) {
            console.error('Das nicht zugeordnete Trickbild konnte nicht aus GridFS gelöscht werden:', cleanupError);
         }
      }
      return next(error);
   }
});

router.get('/:id', async (req, res, next) => {
   try {
      if (!mongoose.isValidObjectId(req.params.id)) {
         return res.status(400).json({ message: 'Ungültige Trick-ID.' });
      }

      const trick = await Trick.findById(req.params.id)
         .populate({ path: 'categoryId', select: 'name' })
         .lean();

      if (!trick) {
         return res.status(404).json({ message: 'Trick nicht gefunden.' });
      }

      return res.json({ trick: toClientTrick(trick) });
   } catch (error) {
      return next(error);
   }
});

router.put('/:id', requireAdmin, async (req, res, next) => {
   try {
      const trickId = req.params.id;

      if (!mongoose.isValidObjectId(trickId)) {
         return res.status(400).json({ message: 'Ungültige Trick-ID.' });
      }

      const trick = await Trick.findById(trickId);
      if (!trick) {
         return res.status(404).json({ message: 'Trick nicht gefunden.' });
      }

      const updateData = {};

      if (req.body.videoUrl !== undefined) {
         const videoCheck = normalizeVideoUrl(req.body.videoUrl);
         if (videoCheck.error) {
            return res.status(400).json({ message: videoCheck.error });
         }
         updateData.videoUrl = videoCheck.videoUrl;
      }

      if (typeof req.body.name === 'string') {
         const name = req.body.name.trim();
         if (!name || name.length > 100) {
            return res.status(400).json({ message: 'Name darf nicht leer sein (max. 100 Zeichen).' });
         }
         updateData.name = name;
      }

      if (typeof req.body.description === 'string') {
         const description = req.body.description.trim();
         if (!description || description.length > 3000) {
            return res.status(400).json({ message: 'Beschreibung darf nicht leer sein (max. 3000 Zeichen).' });
         }
         updateData.description = description;
      }

      if (typeof req.body.difficulty === 'string') {
         const difficulty = req.body.difficulty.trim().toLowerCase();
         if (!['leicht', 'mittel', 'schwer'].includes(difficulty)) {
            return res.status(400).json({ message: 'Ungültiger Schwierigkeitsgrad.' });
         }
         updateData.difficulty = difficulty;
      }

      if (typeof req.body.isActive === 'boolean') {
         updateData.isActive = req.body.isActive;
      }

      if (req.body.steps !== undefined) {
         const stepsCheck = normalizeSteps(req.body.steps);
         if (stepsCheck.error) {
            return res.status(400).json({ message: stepsCheck.error });
         }
         updateData.steps = stepsCheck.steps;
      }

      if (req.body.categoryId !== undefined) {
         if (
            !mongoose.isValidObjectId(req.body.categoryId) ||
            !(await Category.exists({ _id: req.body.categoryId }))
         ) {
            return res.status(400).json({ message: 'Ungültige Kategorie-ID.' });
         }
         updateData.categoryId = req.body.categoryId;
      }

      const prerequisiteAll = normalizeRefArray(req.body.prerequisiteAll);
      const prerequisiteAny = normalizeRefArray(req.body.prerequisiteAny);

      if (req.body.prerequisiteAll !== undefined) {
         if (prerequisiteAll.some((id) => !mongoose.isValidObjectId(id))) {
            return res.status(400).json({ message: 'Ungültige prerequisiteAll-ID enthalten.' });
         }
         updateData.prerequisiteAll = prerequisiteAll;
      }

      if (req.body.prerequisiteAny !== undefined) {
         if (prerequisiteAny.some((id) => !mongoose.isValidObjectId(id))) {
            return res.status(400).json({ message: 'Ungültige prerequisiteAny-ID enthalten.' });
         }
         updateData.prerequisiteAny = prerequisiteAny;
      }

      const combinedPrerequisites = [
         ...(updateData.prerequisiteAll || trick.prerequisiteAll.map((id) => String(id))),
         ...(updateData.prerequisiteAny || trick.prerequisiteAny.map((id) => String(id)))
      ];

      if (combinedPrerequisites.includes(String(trick._id))) {
         return res.status(400).json({ message: 'Ein Trick kann sich nicht selbst voraussetzen.' });
      }

      if (combinedPrerequisites.length > 0) {
         const uniquePrereqIds = [...new Set(combinedPrerequisites)];
         const existingPrereqs = await Trick.find({ _id: { $in: uniquePrereqIds } }, { _id: 1 }).lean();
         if (existingPrereqs.length !== uniquePrereqIds.length) {
            return res.status(400).json({ message: 'Mindestens eine Voraussetzung verweist auf einen unbekannten Trick.' });
         }
      }

      if (req.body.prerequisiteAll !== undefined || req.body.prerequisiteAny !== undefined) {
         const allTricks = await Trick.find({}, { _id: 1, prerequisiteAll: 1, prerequisiteAny: 1 }).lean();
         const prerequisitesById = new Map();

         for (const row of allTricks) {
            prerequisitesById.set(String(row._id), [
               ...(row.prerequisiteAll || []).map((id) => String(id)),
               ...(row.prerequisiteAny || []).map((id) => String(id))
            ]);
         }

         prerequisitesById.set(String(trick._id), combinedPrerequisites);

         if (isCycleAfterUpdate(String(trick._id), allTricks, prerequisitesById)) {
            return res.status(400).json({ message: 'Zyklische Voraussetzungen sind nicht erlaubt.' });
         }
      }

      Object.assign(trick, updateData);
      await trick.save();

      const updatedTrick = await Trick.findById(trick._id).populate({ path: 'categoryId', select: 'name' }).lean();

      return res.json({
         message: 'Trick erfolgreich aktualisiert.',
         trick: toClientTrick(updatedTrick)
      });
   } catch (error) {
      if (error?.code === 11000) {
         return res.status(409).json({ message: 'Ein Trick mit diesem Namen existiert bereits in der Kategorie.' });
      }
      return next(error);
   }
});

router.delete('/:id', requireAdmin, async (req, res, next) => {
   try {
      if (!mongoose.isValidObjectId(req.params.id)) {
         return res.status(400).json({ message: 'Ungültige Trick-ID.' });
      }

      const trick = await Trick.findByIdAndUpdate(
         req.params.id,
         { $set: { isActive: false } },
         { returnDocument: 'after' }
      );

      if (!trick) {
         return res.status(404).json({ message: 'Trick nicht gefunden.' });
      }

      return res.json({ message: 'Trick deaktiviert.' });
   } catch (error) {
      return next(error);
   }
});

module.exports = router;
