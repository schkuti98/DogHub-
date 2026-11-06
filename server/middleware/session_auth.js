const crypto = require('crypto');
const { User } = require('../models/user_model');

const SESSION_COOKIE_NAME = 'dth_session';
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 12;
const runtimeFallbackSecret = crypto.randomBytes(32).toString('hex');
const SESSION_SECRET = process.env.SESSION_SECRET || runtimeFallbackSecret;

function base64UrlEncode(value) {
   return Buffer.from(value, 'utf8').toString('base64url');
}

function base64UrlDecode(value) {
   return Buffer.from(value, 'base64url').toString('utf8');
}

function signPayload(payload) {
   return crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
}

// Eigenes Session-Token (ohne extra Framework)
function createSessionToken(user) {
   const payload = {
      uid: String(user._id),
      email: user.email,
      role: user.role || 'user',
      iat: Date.now()
   };

   const encodedPayload = base64UrlEncode(JSON.stringify(payload));
   const signature = signPayload(encodedPayload);
   return `${encodedPayload}.${signature}`;
}

function verifySessionToken(token) {
   if (!token || typeof token !== 'string' || !token.includes('.')) {
      return null;
   }

   const [encodedPayload, signature] = token.split('.');
   if (!encodedPayload || !signature) {
      return null;
   }

   const expectedSignature = signPayload(encodedPayload);
   const expectedBuffer = Buffer.from(expectedSignature);
   const signatureBuffer = Buffer.from(signature);

   if (expectedBuffer.length !== signatureBuffer.length) {
      return null;
   }

   if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
      return null;
   }

   try {
      const payload = JSON.parse(base64UrlDecode(encodedPayload));

      if (!payload?.uid || !payload?.email) {
         return null;
      }

      // Token-Lebensdauer prüfen
      if (Date.now() - Number(payload.iat || 0) > SESSION_MAX_AGE_MS) {
         return null;
      }

      return payload;
   } catch {
      return null;
   }
}

function parseCookies(cookieHeader = '') {
   const cookies = {};

   if (!cookieHeader) {
      return cookies;
   }

   cookieHeader.split(';').forEach((pair) => {
      const separatorIndex = pair.indexOf('=');
      if (separatorIndex === -1) return;

      const key = pair.slice(0, separatorIndex).trim();
      const value = pair.slice(separatorIndex + 1).trim();
      if (!key) return;

      cookies[key] = decodeURIComponent(value);
   });

   return cookies;
}

function setSessionCookie(res, user) {
   const token = createSessionToken(user);
   const maxAge = Math.floor(SESSION_MAX_AGE_MS / 1000);
   res.setHeader('Set-Cookie', `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`);
}

function clearSessionCookie(res) {
   res.setHeader('Set-Cookie', `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

// User aus Cookie ins Request-Objekt hängen
function attachAuthUser(req, res, next) {
   const cookies = parseCookies(req.headers.cookie);
   const token = cookies[SESSION_COOKIE_NAME];
   const sessionUser = verifySessionToken(token);

   req.authUser = sessionUser;
   next();
}

function requireAuthenticatedUser(req, res, next) {
   if (!req.authUser) {
      return res.status(401).json({ message: 'Nicht angemeldet.' });
   }

   return next();
}

// Harte Admin-Sperre für geschützte Routen
async function requireAdmin(req, res, next) {
   if (!req.authUser) {
      return res.status(401).json({ message: 'Nicht angemeldet.' });
   }

   try {
      const user = await User.findById(req.authUser.uid).select('role').lean();
      if (!user) {
         return res.status(401).json({ message: 'Nicht angemeldet.' });
      }

      if (user.role !== 'admin') {
         return res.status(403).json({ message: 'Admin-Berechtigung erforderlich.' });
      }

      req.authUser.role = user.role;
      return next();
   } catch (error) {
      return next(error);
   }
}

module.exports = {
   attachAuthUser,
   requireAuthenticatedUser,
   requireAdmin,
   setSessionCookie,
   clearSessionCookie
};
