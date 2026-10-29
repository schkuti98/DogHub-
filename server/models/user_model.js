const mongoose = require('mongoose');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
   {
      email: {
         type: String,
         required: true,
         unique: true,
         trim: true,
         lowercase: true
      },
      passwordHash: {
         type: String,
         required: true
      },
      createdAt: {
         type: Date,
         default: Date.now
      },
      lastLoginAt: {
         type: Date,
         default: null
      }
   },
   {
      versionKey: false
   }
);

function hashPassword(password) {
   const salt = crypto.randomBytes(16).toString('hex');
   const hash = crypto.scryptSync(password, salt, 64).toString('hex');
   return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
   if (!storedHash || !storedHash.includes(':')) {
      return false;
   }

   const [salt, key] = storedHash.split(':');
   const derivedKey = crypto.scryptSync(password, salt, 64);
   const keyBuffer = Buffer.from(key, 'hex');

   if (keyBuffer.length !== derivedKey.length) {
      return false;
   }

   return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

const User = mongoose.models.User || mongoose.model('User', userSchema);

module.exports = {
   User,
   hashPassword,
   verifyPassword
};
