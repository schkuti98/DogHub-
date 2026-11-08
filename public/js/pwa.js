if ('serviceWorker' in navigator) {
   window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
         .then(() => console.log('PWA Service Worker aktiv'))
         .catch((error) => console.error('PWA Service Worker Fehler:', error));
   });
}
