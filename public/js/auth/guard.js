// Einstiegspunkt für geschützte Seiten: Login prüfen + Logout-Button aktivieren
import { requireAuth } from './session.js';
import './logout-button.js';

requireAuth();
