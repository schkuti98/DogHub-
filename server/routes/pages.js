const express = require('express');
const { requireAdmin } = require('../middleware/session_auth');

const router = express.Router();

function requireAppSession(req, res, next) {
   if (!req.authUser) {
      return res.redirect('/app/login');
   }

   return next();
}

router.get('/app/login', (req, res) => {
   if (req.authUser) {
      return res.redirect('/app');
   }

   return res.render('login', {
      title: 'Anmeldung | DogTrainer Hub',
      bodyClass: 'login-page'
   });
});

router.get('/app', requireAppSession, (req, res) => {
   return res.render('index', {
      title: 'Dog Hub',
      currentPage: 'home',
      authUser: req.authUser
   });
});

router.get('/app/dogs', requireAppSession, (req, res) => {
   return res.render('dogs', {
      title: 'Meine Hunde | DogTrainer Hub',
      currentPage: 'dogs',
      authUser: req.authUser
   });
});

router.get('/app/tricks', requireAppSession, (req, res) => {
   return res.render('tricks', {
      title: 'Tricks | DogTrainer Hub',
      currentPage: 'tricks',
      authUser: req.authUser
   });
});

router.get('/app/trick', requireAppSession, (req, res) => {
   return res.render('trick', {
      title: 'Übung | DogTrainer Hub',
      currentPage: 'tricks',
      authUser: req.authUser
   });
});

router.get('/admin', requireAdmin, (req, res) => {
   return res.render('admin/dashboard', {
      title: 'Admin | DogTrainer Hub',
      currentPage: 'admin',
      authUser: req.authUser
   });
});

module.exports = router;
