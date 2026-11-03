const mongoose = require('mongoose');

// Trickschema: Übung inkl. Kategorie, Schwierigkeit und Voraussetzungen
const trickSchema = new mongoose.Schema(
   {
      name: {
         type: String,
         required: true,
         trim: true,
         maxlength: 100
      },
      description: {
         type: String,
         required: true,
         trim: true,
         maxlength: 3000
      },
      categoryId: {
         // Referenz auf Tricks-Kategorie
         type: mongoose.Schema.Types.ObjectId,
         ref: 'Category',
         required: true,
         index: true
      },
      difficulty: {
         // Einheitlicher Schwierigkeitsgrad für Filter/Anzeige
         type: String,
         required: true,
         enum: ['leicht', 'mittel', 'schwer'],
         lowercase: true,
         trim: true,
         index: true
      },
      steps: [
         // Schritt-für-Schritt-Anleitung
         {
            _id: false,
            order: { type: Number, required: true },
            text: { type: String, required: true, trim: true, maxlength: 1000 }
         }
      ],
      prerequisiteAll: [
         // Diese Tricks müssen alle geschafft sein
         {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Trick'
         }
      ],
      prerequisiteAny: [
         // Von diesen Tricks reicht mindestens einer
         {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Trick'
         }
      ],
      isActive: {
         type: Boolean,
         default: true,
         index: true
      }
   },
   {
      collection: 'tricks',
      versionKey: false,
      timestamps: true
   }
);

trickSchema.index({ categoryId: 1, name: 1 }, { unique: true });
trickSchema.index({ prerequisiteAll: 1 });
trickSchema.index({ prerequisiteAny: 1 });

// Prüft, ob ein Trick anhand abgeschlossener Tricks freigeschaltet ist
trickSchema.methods.isUnlockedBy = function isUnlockedBy(completedTrickIds = []) {
   const completedSet = new Set(completedTrickIds.map((id) => String(id)));

   const allRequired = (this.prerequisiteAll || []).map((id) => String(id));
   const anyRequired = (this.prerequisiteAny || []).map((id) => String(id));

   const hasAll = allRequired.every((id) => completedSet.has(id));
   const hasAny = anyRequired.length === 0 || anyRequired.some((id) => completedSet.has(id));

   return hasAll && hasAny;
};

const Trick = mongoose.models.Trick || mongoose.model('Trick', trickSchema);

module.exports = {
   Trick
};
