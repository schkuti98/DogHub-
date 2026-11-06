const mongoose = require('mongoose');

// Hundeschema: Basisdaten + Verknüpfungen zu Kunde/Trainer
const dogSchema = new mongoose.Schema(
   {
      id: {
         // Bestehende numerische Hund-ID aus dem Frontend/API
         type: Number,
         required: true,
         unique: true,
         index: true
      },
      name: {
         type: String,
         required: true,
         trim: true
      },
      age: {
         type: Number,
         min: 0,
         max: 30,
         default: null
      },
      breed: {
         type: String,
         required: true,
         trim: true
      },
      photoId: {
         type: mongoose.Schema.Types.ObjectId,
         default: null
      },
      customerId: {
         // Optionaler Besitzer/Kunde des Hundes
         type: mongoose.Schema.Types.ObjectId,
         ref: 'Customer',
         default: null,
         index: true
      },
      trainerUserId: {
         // Optionaler Trainer-User (eingeloggter Benutzer)
         type: mongoose.Schema.Types.ObjectId,
         ref: 'User',
         default: null,
         index: true
      }
   },
   {
      collection: 'dogs',
      versionKey: false,
      timestamps: true
   }
);

dogSchema.index({ customerId: 1, name: 1 });
dogSchema.index({ trainerUserId: 1, createdAt: -1 });

const Dog = mongoose.models.Dog || mongoose.model('Dog', dogSchema);

// Alter vereinheitlichen (leer -> null)
function normalizeAge(age) {
   if (age === undefined || age === null || age === '') {
      return null;
   }

   const parsed = Number(age);
   return Number.isFinite(parsed) ? parsed : null;
}

// Nächste freie numerische ID ermitteln (für bestehende API-Kompatibilität)
async function getNextId() {
   const latestDog = await Dog.findOne({}, { id: 1 }).sort({ id: -1 }).lean();

   if (!latestDog) {
      return 1;
   }

   return latestDog.id + 1;
}

async function getAllDogs(trainerUserId) {
   // Für Listenansicht im Frontend nach ID sortiert
   return Dog.find({ trainerUserId }).sort({ id: 1 }).lean();
}

async function getDogById(id, trainerUserId) {
   return Dog.findOne({ id, trainerUserId }).lean();
}

async function createDog({ name, age, breed, trainerUserId }) {
   // Legt neuen Hund mit fortlaufender ID an
   const nextId = await getNextId();

   const createdDog = await Dog.create({
      id: nextId,
      name,
      age: normalizeAge(age),
      breed,
      trainerUserId
   });

   return createdDog.toObject();
}

async function updateDog(id, updates, trainerUserId) {
   // Nur übergebene Felder werden aktualisiert
   const updateData = {
      ...(updates.name !== undefined ? { name: updates.name } : {}),
      ...(updates.breed !== undefined ? { breed: updates.breed } : {}),
      ...(updates.age !== undefined ? { age: normalizeAge(updates.age) } : {}),
      ...(updates.photoId !== undefined ? { photoId: updates.photoId } : {})
   };

   return Dog.findOneAndUpdate(
      { id, trainerUserId },
      { $set: updateData },
      { returnDocument: 'after', runValidators: true }
   ).lean();
}

async function deleteDog(id, trainerUserId) {
   // Löscht Hund anhand der numerischen ID
   const result = await Dog.deleteOne({ id, trainerUserId });
   return result.deletedCount === 1;
}

module.exports = {
   Dog,
   getAllDogs,
   getDogById,
   createDog,
   updateDog,
   deleteDog
};
