const express = require('express');
const mongoose = require('mongoose');
const { requireAuthenticatedUser, requireAdmin } = require('../middleware/session_auth');
const { Trick } = require('../models/trick_model');
require('../models/category_model');

const router = express.Router();

router.use(requireAuthenticatedUser);

function toClientTrick(trickDoc) {
   return {
      id: String(trickDoc._id),
      name: trickDoc.name,
      description: trickDoc.description,
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
      prerequisiteAll: (trickDoc.prerequisiteAll || []).map((id) => String(id)),
      prerequisiteAny: (trickDoc.prerequisiteAny || []).map((id) => String(id)),
      isActive: trickDoc.isActive
   };
}

function normalizeRefArray(value) {
   if (!Array.isArray(value)) return [];
   return value.filter(Boolean).map((id) => String(id));
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

      if (typeof req.body.name === 'string') {
         const name = req.body.name.trim();
         if (!name) {
            return res.status(400).json({ message: 'Name darf nicht leer sein.' });
         }
         updateData.name = name;
      }

      if (typeof req.body.description === 'string') {
         const description = req.body.description.trim();
         if (!description) {
            return res.status(400).json({ message: 'Beschreibung darf nicht leer sein.' });
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

      if (req.body.categoryId !== undefined) {
         if (!mongoose.isValidObjectId(req.body.categoryId)) {
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
      return next(error);
   }
});

module.exports = router;

