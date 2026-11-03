const mongoose = require('mongoose');

// Kategorien für Tricks (z. B. Grundgehorsam, Fun-Tricks)
const categorySchema = new mongoose.Schema(
   {
      name: {
         type: String,
         required: true,
         trim: true,
         maxlength: 80
      },
      slug: {
         // URL-/Systemname der Kategorie
         type: String,
         required: true,
         trim: true,
         lowercase: true,
         maxlength: 80
      },
      description: {
         type: String,
         trim: true,
         default: null,
         maxlength: 1000
      },
      sortOrder: {
         // Steuerung der Reihenfolge im UI
         type: Number,
         default: 0
      }
   },
   {
      collection: 'categories',
      versionKey: false,
      timestamps: true
   }
);

categorySchema.index({ name: 1 }, { unique: true });
categorySchema.index({ slug: 1 }, { unique: true });

const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);

module.exports = {
   Category
};
