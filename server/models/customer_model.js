const mongoose = require('mongoose');

// Kundenschema: Kontakt + Zuordnung zu mehreren Hunden
const customerSchema = new mongoose.Schema(
   {
      name: {
         type: String,
         required: true,
         trim: true,
         maxlength: 120
      },
      email: {
         type: String,
         trim: true,
         lowercase: true,
         default: null
      },
      phone: {
         type: String,
         trim: true,
         default: null
      },
      dogIds: [
         // Ein Kunde kann mehrere Hunde besitzen
         {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Dog'
         }
      ],
      trainerUserId: {
         // Optional: zuständiger Trainer-User
         type: mongoose.Schema.Types.ObjectId,
         ref: 'User',
         default: null,
         index: true
      }
   },
   {
      collection: 'customers',
      versionKey: false,
      timestamps: true
   }
);

customerSchema.index({ email: 1 }, { unique: true, sparse: true });
customerSchema.index({ dogIds: 1 });
customerSchema.index({ name: 1 });

const Customer = mongoose.models.Customer || mongoose.model('Customer', customerSchema);

module.exports = {
   Customer
};
