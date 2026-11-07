const express = require('express');
const { User, hashPassword, verifyPassword } = require('../models/user_model');
const { setSessionCookie, clearSessionCookie, requireAuthenticatedUser } = require('../middleware/session_auth');

const router = express.Router();

function normalizeEmail(value = '') {
   return value.trim().toLowerCase();
}

// Registrierung mit bestehendem Passwort-Hashing
router.post('/register', async (req, res, next) => {
   try {
      const email = normalizeEmail(req.body.email);
      const password = req.body.password || '';

      if (!email || !password) {
         return res.status(400).json({ message: 'E-Mail und Passwort sind erforderlich.' });
      }

      if (password.length < 6) {
         return res.status(400).json({ message: 'Passwort muss mindestens 6 Zeichen lang sein.' });
      }

      const existingUser = await User.findOne({ email }).lean();

      if (existingUser) {
         return res.status(409).json({ message: 'Für diese E-Mail existiert bereits ein Konto.' });
      }

      const createdUser = await User.create({
         email,
         passwordHash: hashPassword(password)
      });

      return res.status(201).json({
         message: 'Registrierung erfolgreich. Jetzt bitte anmelden.',
         user: {
            email: createdUser.email,
            role: createdUser.role,
            createdAt: createdUser.createdAt
         }
      });
   } catch (error) {
      return next(error);
   }
});

// Login setzt jetzt zusätzlich Session-Cookie
router.post('/login', async (req, res, next) => {
   try {
      const email = normalizeEmail(req.body.email);
      const password = req.body.password || '';

      if (!email || !password) {
         return res.status(400).json({ message: 'Bitte E-Mail und Passwort eingeben.' });
      }

      const user = await User.findOne({ email });

      if (!user) {
         return res.status(401).json({ message: 'Ungültige Anmeldedaten.' });
      }

      if (!verifyPassword(password, user.passwordHash)) {
         return res.status(401).json({ message: 'Ungültige Anmeldedaten.' });
      }

      user.lastLoginAt = new Date();
      await user.save();

      setSessionCookie(res, user);

      return res.json({
         message: 'Erfolgreich angemeldet...',
         user: {
            id: String(user._id),
            email: user.email,
            role: user.role,
            loginAt: user.lastLoginAt
         }
      });
   } catch (error) {
      return next(error);
   }
});

// Session sauber beenden
router.post('/logout', (req, res) => {
   clearSessionCookie(res);
   return res.json({ message: 'Erfolgreich abgemeldet.' });
});

// Session-Status für geschützte Frontend-Checks
router.get('/session', requireAuthenticatedUser, (req, res) => {
   return res.json({
      user: {
         id: req.authUser.uid,
         email: req.authUser.email,
         role: req.authUser.role
      }
   });
});

module.exports = router;
