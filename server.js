const path = require('path');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
require('dotenv').config();

const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

const authLoginLimiter = rateLimit({
   windowMs: 15 * 60 * 1000,
   max: 10,
   standardHeaders: true,
   legacyHeaders: false,
   message: { message: 'Zu viele Login-Versuche. Bitte später erneut versuchen.' }
});

const authRegisterLimiter = rateLimit({
   windowMs: 60 * 60 * 1000,
   max: 5,
   standardHeaders: true,
   legacyHeaders: false,
   message: { message: 'Zu viele Registrierungen. Bitte später erneut versuchen.' }
});

const dogRoutes = require('./server/routes/dog');
const authRoutes = require('./server/routes/auth');
const tricksRoutes = require('./server/routes/tricks');
const trainingRoutes = require('./server/routes/training');
const adminRoutes = require('./server/routes/admin');
const pageRoutes = require('./server/routes/pages');
const { attachAuthUser } = require('./server/middleware/session_auth');

// EJS aktivieren
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// Auth-User früh am Request verfügbar machen
app.use(attachAuthUser);

// Brute-Force-Schutz auf Auth-Endpunkten
app.use('/api/auth/login', authLoginLimiter);
app.use('/api/auth/register', authRegisterLimiter);
app.use('/auth/login', authLoginLimiter);
app.use('/auth/register', authRegisterLimiter);

// Neue API-Pfade
app.use('/api/dogs', dogRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/tricks', tricksRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/admin', adminRoutes);

// Legacy-Pfade bleiben kompatibel
app.use('/dogs', dogRoutes);
app.use('/auth', authRoutes);

// EJS-Seitenrouten
app.use(pageRoutes);

app.get('/', (req, res) => {
   res.redirect('/app/login');
});

app.get('/ejs-test', (req, res) => {
   res.render('index', {
      title: 'DogTrainer Hub',
      currentPage: 'home'
   });
});

app.use((req, res) => {
   res.status(404).send('Seite nicht gefunden');
});

app.use((err, req, res, next) => {
   console.error(err.stack);
   res.status(500).send('Interner Serverfehler');
});

// Eine zentrale MongoDB-Verbindung
mongoose
   .connect(process.env.MONGODB_URI, {
      dbName: 'dogtrainerhub'
   })
   .then(() => {
      console.log('MongoDB verbunden');
      console.log('Verbundene Datenbank:', mongoose.connection.name);
      app.listen(port, () => {
         console.log(`Server läuft auf http://localhost:${port}`);
      });
   })
   .catch((err) => {
      console.error('MongoDB Fehler:', err.message);
      process.exit(1);
   });
