const message = document.getElementById('admin-message');
const trickForm = document.getElementById('admin-trick-form');
let overview = null;

function escapeHtml(value) {
   return String(value ?? '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
   })[character]);
}

function setMessage(text, isError = false) {
   message.textContent = text;
   message.style.color = isError ? '#c0392b' : '';
}

async function requestJson(url, options = {}) {
   const response = await fetch(url, {
      ...options,
      headers: {
         ...(options.body ? { 'Content-Type': 'application/json' } : {}),
         ...options.headers
      }
   });

   if (response.status === 401) {
      window.location.href = '/app/login';
      throw new Error('Nicht angemeldet.');
   }
   if (response.status === 403) {
      window.location.href = '/app';
      throw new Error('Admin-Berechtigung erforderlich.');
   }

   if (response.status === 204) return null;

   const payload = await response.json().catch(() => ({}));
   if (!response.ok) {
      throw new Error(payload.message || 'Die Anfrage ist fehlgeschlagen.');
   }
   return payload;
}

function formatDate(value) {
   if (!value) return '—';
   const date = new Date(value);
   return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('de-DE');
}

function setOptions(select, options, selectedValues = []) {
   const selected = new Set(selectedValues.map(String));
   select.innerHTML = options.map((option) => `
      <option value="${escapeHtml(option.id)}" ${selected.has(String(option.id)) ? 'selected' : ''}>
         ${escapeHtml(option.name)}
      </option>
   `).join('');
}

function renderTricks() {
   const categorySelect = trickForm.elements.categoryId;
   const allSelect = trickForm.elements.prerequisiteAll;
   const anySelect = trickForm.elements.prerequisiteAny;
   setOptions(categorySelect, overview.categories);

   const prerequisiteOptions = overview.tricks.map((trick) => ({ id: trick.id, name: trick.name }));
   setOptions(allSelect, prerequisiteOptions);
   setOptions(anySelect, prerequisiteOptions);

   document.getElementById('admin-tricks').innerHTML = overview.tricks.map((trick) => `
      <tr>
         <td>${escapeHtml(trick.name)}</td>
         <td>${escapeHtml(trick.category?.name || '—')}</td>
         <td>${escapeHtml(trick.difficulty)}</td>
         <td>${trick.isActive ? 'Aktiv' : 'Deaktiviert'}</td>
         <td class="admin-actions">
            <button type="button" class="admin-secondary-button" data-action="edit-trick" data-id="${escapeHtml(trick.id)}">Bearbeiten</button>
            <button type="button" class="admin-secondary-button" data-action="toggle-trick" data-id="${escapeHtml(trick.id)}" data-active="${trick.isActive}">
               ${trick.isActive ? 'Deaktivieren' : 'Reaktivieren'}
            </button>
         </td>
      </tr>
   `).join('') || '<tr><td colspan="5">Keine Tricks vorhanden.</td></tr>';
}

function renderUsers() {
   document.getElementById('admin-users').innerHTML = overview.users.map((user) => `
      <tr>
         <td>${escapeHtml(user.email)}</td>
         <td>
            <select data-user-role="${escapeHtml(user.id)}" aria-label="Rolle für ${escapeHtml(user.email)}">
               <option value="user" ${user.role === 'user' ? 'selected' : ''}>Benutzer</option>
               <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
            </select>
         </td>
         <td>${escapeHtml(formatDate(user.createdAt))}</td>
         <td>${escapeHtml(formatDate(user.lastLoginAt))}</td>
         <td><button type="button" class="admin-secondary-button" data-action="save-role" data-id="${escapeHtml(user.id)}">Rolle speichern</button></td>
      </tr>
   `).join('') || '<tr><td colspan="5">Keine Benutzer vorhanden.</td></tr>';
}

function renderDogs() {
   document.getElementById('admin-dogs').innerHTML = overview.dogs.map((dog) => `
      <tr>
         <td>${escapeHtml(dog.name)}</td>
         <td>${escapeHtml(dog.breed)}</td>
         <td>${escapeHtml(dog.age ?? 'Unbekannt')}</td>
         <td>${escapeHtml(dog.ownerEmail)}</td>
         <td><button type="button" class="admin-secondary-button" data-action="edit-dog" data-id="${escapeHtml(dog.id)}">Bearbeiten</button></td>
      </tr>
   `).join('') || '<tr><td colspan="5">Keine Hunde vorhanden.</td></tr>';
}

function renderTrainings() {
   const statuses = [
      ['locked', 'Gesperrt'],
      ['unlocked', 'Freigeschaltet'],
      ['in_progress', 'In Bearbeitung'],
      ['done', 'Geschafft']
   ];

   document.getElementById('admin-trainings').innerHTML = overview.trainings.map((training) => `
      <tr>
         <td>${escapeHtml(training.dogName)}</td>
         <td>${escapeHtml(training.trickName)}</td>
         <td>${escapeHtml(training.attemptCount)}</td>
         <td>${escapeHtml(formatDate(training.lastPracticedAt))}</td>
         <td>
            <select data-training-status="${escapeHtml(training.id)}" aria-label="Trainingsstatus für ${escapeHtml(training.dogName)} – ${escapeHtml(training.trickName)}">
               ${statuses.map(([value, label]) => `<option value="${value}" ${training.status === value ? 'selected' : ''}>${label}</option>`).join('')}
            </select>
         </td>
      </tr>
   `).join('') || '<tr><td colspan="5">Noch keine Trainingsfortschritte.</td></tr>';
}

function renderNotes() {
   document.getElementById('admin-notes').innerHTML = overview.notes.map((note) => `
      <tr>
         <td>${escapeHtml(formatDate(note.notedAt))}</td>
         <td>${escapeHtml(note.dogName)} / ${escapeHtml(note.trickName)}</td>
         <td>${escapeHtml(note.authorEmail)}</td>
         <td class="admin-note-text">${escapeHtml(note.note)}</td>
         <td><button type="button" class="admin-secondary-button" data-action="delete-note" data-id="${escapeHtml(note.id)}">Löschen</button></td>
      </tr>
   `).join('') || '<tr><td colspan="5">Keine Trainingsnotizen vorhanden.</td></tr>';
}

function renderOverview() {
   renderTricks();
   renderUsers();
   renderDogs();
   renderTrainings();
   renderNotes();
}

async function loadOverview() {
   overview = await requestJson('/api/admin/overview');
   renderOverview();
}

function selectedValues(select) {
   return Array.from(select.selectedOptions, (option) => option.value);
}

function trickPayload() {
   return {
      name: trickForm.elements.name.value.trim(),
      description: trickForm.elements.description.value.trim(),
      categoryId: trickForm.elements.categoryId.value,
      difficulty: trickForm.elements.difficulty.value,
      prerequisiteAll: selectedValues(trickForm.elements.prerequisiteAll),
      prerequisiteAny: selectedValues(trickForm.elements.prerequisiteAny),
      steps: trickForm.elements.steps.value.split(/\r?\n/).map((step) => step.trim()).filter(Boolean)
   };
}

function resetTrickForm() {
   trickForm.reset();
   trickForm.elements.trickId.value = '';
   trickForm.elements.categoryId.selectedIndex = overview.categories.length ? 0 : -1;
   document.getElementById('admin-trick-save').textContent = 'Trick anlegen';
   document.getElementById('admin-trick-cancel').hidden = true;
}

trickForm.addEventListener('submit', async (event) => {
   event.preventDefault();
   const trickId = trickForm.elements.trickId.value;

   try {
      await requestJson(trickId ? `/api/tricks/${encodeURIComponent(trickId)}` : '/api/tricks', {
         method: trickId ? 'PUT' : 'POST',
         body: JSON.stringify(trickPayload())
      });
      setMessage(trickId ? 'Trick gespeichert.' : 'Trick angelegt.');
      await loadOverview();
      resetTrickForm();
   } catch (error) {
      setMessage(error.message, true);
   }
});

document.getElementById('admin-trick-cancel').addEventListener('click', resetTrickForm);

document.addEventListener('click', async (event) => {
   const button = event.target.closest('button[data-action]');
   if (!button) return;

   const { action, id } = button.dataset;
   try {
      if (action === 'edit-trick') {
         const trick = overview.tricks.find((item) => item.id === id);
         if (!trick) return;
         trickForm.elements.trickId.value = trick.id;
         trickForm.elements.name.value = trick.name;
         trickForm.elements.description.value = trick.description;
         trickForm.elements.categoryId.value = trick.categoryId;
         trickForm.elements.difficulty.value = trick.difficulty;
         setOptions(trickForm.elements.prerequisiteAll,
            overview.tricks.filter((item) => item.id !== trick.id).map((item) => ({ id: item.id, name: item.name })),
            trick.prerequisiteAll || []);
         setOptions(trickForm.elements.prerequisiteAny,
            overview.tricks.filter((item) => item.id !== trick.id).map((item) => ({ id: item.id, name: item.name })),
            trick.prerequisiteAny || []);
         trickForm.elements.steps.value = (trick.steps || []).slice().sort((a, b) => a.order - b.order).map((step) => step.text).join('\n');
         document.getElementById('admin-trick-save').textContent = 'Änderungen speichern';
         document.getElementById('admin-trick-cancel').hidden = false;
         trickForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
         return;
      }

      if (action === 'toggle-trick') {
         const nextActive = button.dataset.active !== 'true';
         const verb = nextActive ? 'reaktivieren' : 'deaktivieren';
         if (!window.confirm(`Möchtest du diesen Trick wirklich ${verb}?`)) return;
         await requestJson(`/api/tricks/${encodeURIComponent(id)}`, {
            method: 'PUT',
            body: JSON.stringify({ isActive: nextActive })
         });
         setMessage(`Trick ${nextActive ? 'reaktiviert' : 'deaktiviert'}.`);
         await loadOverview();
         return;
      }

      if (action === 'save-role') {
         const role = document.querySelector(`[data-user-role="${CSS.escape(id)}"]`).value;
         await requestJson(`/api/admin/users/${encodeURIComponent(id)}/role`, {
            method: 'PUT',
            body: JSON.stringify({ role })
         });
         setMessage('Benutzerrolle gespeichert.');
         await loadOverview();
         return;
      }

      if (action === 'edit-dog') {
         const dog = overview.dogs.find((item) => item.id === id);
         if (!dog) return;
         const name = window.prompt('Name des Hundes:', dog.name);
         if (name === null) return;
         const breed = window.prompt('Rasse:', dog.breed);
         if (breed === null) return;
         const age = window.prompt('Alter (leer lassen = unbekannt):', dog.age ?? '');
         if (age === null) return;
         await requestJson(`/api/admin/dogs/${encodeURIComponent(id)}`, {
            method: 'PUT',
            body: JSON.stringify({ name, breed, age })
         });
         setMessage('Hundedaten gespeichert.');
         await loadOverview();
         return;
      }

      if (action === 'delete-note') {
         if (!window.confirm('Diese Trainingsnotiz endgültig löschen?')) return;
         await requestJson(`/api/admin/notes/${encodeURIComponent(id)}`, { method: 'DELETE' });
         setMessage('Trainingsnotiz gelöscht.');
         await loadOverview();
      }
   } catch (error) {
      setMessage(error.message, true);
   }
});

document.getElementById('admin-trainings').addEventListener('change', async (event) => {
   const select = event.target.closest('[data-training-status]');
   if (!select) return;

   try {
      await requestJson(`/api/admin/trainings/${encodeURIComponent(select.dataset.trainingStatus)}`, {
         method: 'PUT',
         body: JSON.stringify({ status: select.value })
      });
      setMessage('Trainingsstatus gespeichert.');
      await loadOverview();
   } catch (error) {
      setMessage(error.message, true);
   }
});

loadOverview().catch((error) => setMessage(error.message, true));
