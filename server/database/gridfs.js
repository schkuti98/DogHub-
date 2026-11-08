const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');

function getDogPhotoBucket() {
   if (!mongoose.connection.db) {
      throw new Error('MongoDB muss verbunden sein, bevor Fotos verarbeitet werden.');
   }

   return new GridFSBucket(mongoose.connection.db, { bucketName: 'dog_photos' });
}

function getTrickImageBucket() {
   if (!mongoose.connection.db) {
      throw new Error('MongoDB muss verbunden sein, bevor Trickbilder verarbeitet werden.');
   }

   return new GridFSBucket(mongoose.connection.db, { bucketName: 'trick_images' });
}

function uploadDogPhoto({ buffer, filename, contentType, dogId, ownerId }) {
   const bucket = getDogPhotoBucket();

   return new Promise((resolve, reject) => {
      const uploadStream = bucket.openUploadStream(filename, {
         contentType,
         metadata: {
            dogId: String(dogId),
            ownerId: String(ownerId)
         }
      });

      uploadStream.once('error', reject);
      uploadStream.once('finish', () => resolve(uploadStream.id));
      uploadStream.end(buffer);
   });
}

async function deleteDogPhoto(fileId) {
   if (!fileId) return;
   await getDogPhotoBucket().delete(fileId);
}

function uploadTrickImage({ buffer, filename, contentType, trickId, ownerId }) {
   const bucket = getTrickImageBucket();

   return new Promise((resolve, reject) => {
      const uploadStream = bucket.openUploadStream(filename, {
         contentType,
         metadata: {
            trickId: String(trickId),
            ownerId: String(ownerId)
         }
      });

      uploadStream.once('error', reject);
      uploadStream.once('finish', () => resolve(uploadStream.id));
      uploadStream.end(buffer);
   });
}

async function deleteTrickImage(fileId) {
   if (!fileId) return;
   await getTrickImageBucket().delete(fileId);
}

module.exports = {
   getDogPhotoBucket,
   uploadDogPhoto,
   deleteDogPhoto,
   getTrickImageBucket,
   uploadTrickImage,
   deleteTrickImage
};
