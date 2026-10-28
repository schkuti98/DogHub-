const fs = require('fs/promises');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const dataFile = path.join(dataDir, 'dogs.json');

async function ensureStorage() {
   await fs.mkdir(dataDir, { recursive: true });

   try {
      await fs.access(dataFile);
   } catch {
      await fs.writeFile(dataFile, JSON.stringify([], null, 2), 'utf8');
   }
}

async function readDogs() {
   await ensureStorage();
   const fileContent = await fs.readFile(dataFile, 'utf8');
   return JSON.parse(fileContent);
}

async function writeDogs(dogs) {
   await fs.writeFile(dataFile, JSON.stringify(dogs, null, 2), 'utf8');
}

function getNextId(dogs) {
   if (dogs.length === 0) {
      return 1;
   }

   const highestId = Math.max(...dogs.map((dog) => dog.id));
   return highestId + 1;
}

function normalizeAge(age) {
   if (age === undefined || age === null || age === '') {
      return null;
   }

   const parsed = Number(age);
   return Number.isFinite(parsed) ? parsed : null;
}

async function getAllDogs() {
   return readDogs();
}

async function getDogById(id) {
   const dogs = await readDogs();
   return dogs.find((dog) => dog.id === id) || null;
}

async function createDog({ name, age, breed }) {
   const dogs = await readDogs();

   const newDog = {
      id: getNextId(dogs),
      name,
      age: normalizeAge(age),
      breed,
      createdAt: new Date().toISOString()
   };

   dogs.push(newDog);
   await writeDogs(dogs);

   return newDog;
}

async function updateDog(id, updates) {
   const dogs = await readDogs();
   const index = dogs.findIndex((dog) => dog.id === id);

   if (index === -1) {
      return null;
   }

   const currentDog = dogs[index];
   const updatedDog = {
      ...currentDog,
      ...(updates.name !== undefined ? { name: updates.name } : {}),
      ...(updates.breed !== undefined ? { breed: updates.breed } : {}),
      ...(updates.age !== undefined ? { age: normalizeAge(updates.age) } : {}),
      updatedAt: new Date().toISOString()
   };

   dogs[index] = updatedDog;
   await writeDogs(dogs);

   return updatedDog;
}

async function deleteDog(id) {
   const dogs = await readDogs();
   const index = dogs.findIndex((dog) => dog.id === id);

   if (index === -1) {
      return false;
   }

   dogs.splice(index, 1);
   await writeDogs(dogs);

   return true;
}

module.exports = {
   getAllDogs,
   getDogById,
   createDog,
   updateDog,
   deleteDog
};
