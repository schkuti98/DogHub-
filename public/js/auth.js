function requireAuth() {
   const rawUser = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');

   if (!rawUser) {
      window.location.href = 'login.html';
      return;
   }

   try {
      const currentUser = JSON.parse(rawUser);
      if (!currentUser) window.location.href = 'login.html';
   } catch {
      window.location.href = 'login.html';
   }
}
function logout() {
   localStorage.removeItem('currentUser');
   sessionStorage.removeItem('currentUser');
   window.location.href = 'login.html';
}
document.getElementById('logout-btn')?.addEventListener('click', logout);
