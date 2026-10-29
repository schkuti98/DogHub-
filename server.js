// TODO: Server starten und die Routen einbinden.
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

// Routen einbinden
const dogRoutes = require('./server/routes/dog');
const authRoutes = require('./server/routes/auth');
app.use('/dogs', dogRoutes);
app.use('/auth', authRoutes);

app.get('/', (req, res) => {
   res.redirect('/login.html');
});

app.use((req, res, next) => {
   res.status(404).send('Seite nicht gefunden');
});

app.use((err, req, res, next) => {
   console.error(err.stack);
   res.status(500).send('Interner Serverfehler');
});

mongoose
   .connect(process.env.MONGODB_URI)
   .then(() => {
      console.log('MongoDB verbunden');
      app.listen(port, () => {
         console.log(`Server läuft auf http://localhost:${port}`);
      });
   })
   .catch((err) => {
      console.error('MongoDB Fehler:', err.message);
      process.exit(1);
   });
