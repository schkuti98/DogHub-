const express = require('express');
const { User, hashPassword, verifyPassword } = require('../models/user_model');

const router = express.Router();

function normalizeEmail(value = '') {
   return value.trim().toLowerCase();
}

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
            createdAt: createdUser.createdAt
         }
      });
   } catch (error) {
      return next(error);
   }
});

router.post('/login', async (req, res, next) => {
   try {
      const email = normalizeEmail(req.body.email);
      const password = req.body.password || '';

      if (!email || !password) {
         return res.status(400).json({ message: 'Bitte E-Mail und Passwort eingeben.' });
      }

      const user = await User.findOne({ email });

      if (!user) {
         return res.status(404).json({ message: 'Kein Konto gefunden. Bitte zuerst registrieren.' });
      }

      if (!verifyPassword(password, user.passwordHash)) {
         return res.status(401).json({ message: 'Passwort ist falsch.' });
      }

      user.lastLoginAt = new Date();
      await user.save();

      return res.json({
         message: 'Erfolgreich angemeldet...',
         user: {
            email: user.email,
            loginAt: user.lastLoginAt
         }
      });
   } catch (error) {
      return next(error);
   }
});

module.exports = router;
