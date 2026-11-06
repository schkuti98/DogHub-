const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');

function getDogPhotoBucket() {
   if (!mongoose.connection.db) {
      throw new Error('MongoDB muss verbunden sein, bevor Fotos verarbeitet werden.');
   }

   return new GridFSBucket(mongoose.connection.db, { bucketName: 'dog_photos' });
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

module.exports = {
   getDogPhotoBucket,
   uploadDogPhoto,
   deleteDogPhoto
};
