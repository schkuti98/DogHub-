const mongoose = require('mongoose');

// Trainingsnotizen: immer für einen Hund, optional für Trick/Trainingseinheit
const trainingNoteSchema = new mongoose.Schema(
   {
      dogId: {
         // Pflicht: Notiz gehört immer zu einem Hund
         type: mongoose.Schema.Types.ObjectId,
         ref: 'Dog',
         required: true,
         index: true
      },
      trickId: {
         // Optional: Notiz zu einem konkreten Trick
         type: mongoose.Schema.Types.ObjectId,
         ref: 'Trick',
         default: null,
         index: true
      },
      trainingId: {
         // Optional: Notiz zu einem konkreten Trainingsdatensatz
         type: mongoose.Schema.Types.ObjectId,
         ref: 'Training',
         default: null,
         index: true
      },
      note: {
         // Freitext der Notiz
         type: String,
         required: true,
         trim: true,
         maxlength: 4000
      },
      createdByUserId: {
         type: mongoose.Schema.Types.ObjectId,
         ref: 'User',
         default: null,
         index: true
      },
      notedAt: {
         type: Date,
         default: Date.now
      }
   },
   {
      collection: 'training_notes',
      versionKey: false,
      timestamps: true
   }
);

trainingNoteSchema.index({ dogId: 1, notedAt: -1 });
trainingNoteSchema.index({ trickId: 1, notedAt: -1 });
trainingNoteSchema.index({ trainingId: 1, notedAt: -1 });

const TrainingNote = mongoose.models.TrainingNote || mongoose.model('TrainingNote', trainingNoteSchema);

module.exports = {
   TrainingNote
};
