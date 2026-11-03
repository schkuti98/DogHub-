const mongoose = require('mongoose');

// Trainingsfortschritt pro Hund und pro Trick
const trainingSchema = new mongoose.Schema(
   {
      dogId: {
         // Zugehöriger Hund
         type: mongoose.Schema.Types.ObjectId,
         ref: 'Dog',
         required: true,
         index: true
      },
      trickId: {
         // Zugehöriger Trick
         type: mongoose.Schema.Types.ObjectId,
         ref: 'Trick',
         required: true,
         index: true
      },
      status: {
         // Fortschrittsstatus im Lernpfad
         type: String,
         enum: ['locked', 'unlocked', 'in_progress', 'done'],
         default: 'locked',
         index: true
      },
      attemptCount: {
         type: Number,
         default: 0,
         min: 0
      },
      unlockedAt: {
         type: Date,
         default: null
      },
      completedAt: {
         type: Date,
         default: null
      },
      lastPracticedAt: {
         type: Date,
         default: null
      }
   },
   {
      collection: 'trainings',
      versionKey: false,
      timestamps: true
   }
);

trainingSchema.index({ dogId: 1, trickId: 1 }, { unique: true });
// Typische Filter für Übersichten
trainingSchema.index({ dogId: 1, status: 1 });
trainingSchema.index({ trickId: 1, status: 1 });

const Training = mongoose.models.Training || mongoose.model('Training', trainingSchema);

module.exports = {
   Training
};
