// --- FIREBASE INITIALIZATION (should be at the very top) ---
const firebaseConfig = {
    apiKey: "AIzaSyA5CXcX7hM6QH13Q-EXN8mCg8Kyc7H-fQc", // YOUR ACTUAL CONFIG
    authDomain: "home-881fe.firebaseapp.com",
    projectId: "home-881fe",
    storageBucket: "home-881fe.appspot.com",
    messagingSenderId: "420018374054",
    appId: "1:420018374054:web:b90c0376a0c301ef787b67",
    measurementId: "G-KEGM94MV70"
  };
  
  let app;
  let auth;
  let db;
  let currentUser = null;
  let sharedDataDocRef;
  const SHARED_DATA_COLLECTION = 'checklistsSharedData';
  const SHARED_DATA_DOC_ID = 'steveNicoleHomeQuest';
  
  try {
      app = firebase.initializeApp(firebaseConfig);
      auth = firebase.auth();
      db = firebase.firestore();
      console.log("Firebase initialized successfully!");
  } catch (error) {
      console.error("Error initializing Firebase:", error);
      alert("Critical error: Application cannot connect to backend services. Please try again later or contact support.");
  }
  
  // --- DOMContentLoaded ---
  document.addEventListener('DOMContentLoaded', () => {
      // --- THEME TOGGLE (Runs on all pages) ---
      const themeToggleBtn = document.getElementById('theme-toggle');
      const body = document.body;
  
      function applyTheme() {
          if (localStorage.getItem('theme') === 'dark-mode') {
              body.classList.add('dark-mode');
          } else {
              body.classList.remove('dark-mode');
          }
      }
      applyTheme();
  
      if (themeToggleBtn) {
          themeToggleBtn.addEventListener('click', () => {
              body.classList.toggle('dark-mode');
              localStorage.setItem('theme', body.classList.contains('dark-mode') ? 'dark-mode' : 'light-mode');
          });
      }
  
      // --- AUTHENTICATION STATE LISTENER & LOGOUT ---
      if (auth) {
          const logoutButton = document.getElementById('logout-button');
  
          auth.onAuthStateChanged(user => {
              if (user) {
                  currentUser = user;
                  console.log("User signed in:", currentUser.uid, "Page:", window.location.pathname);
                  sharedDataDocRef = db.collection(SHARED_DATA_COLLECTION).doc(SHARED_DATA_DOC_ID);
                  
                  if (document.getElementById('checklist-app')) {
                      initializeChecklistApp();
                  } else if (document.getElementById('documents-tracker')) {
                      initializeDocumentsTracker();
                  } else if (document.getElementById('deadlines-tracker')) {
                      initializeDeadlinesTracker();
                  } else if (document.getElementById('contacts-content')) {
                      initializeContactsPage();
                  }
              } else {
                  currentUser = null;
                  sharedDataDocRef = null;
                  if (!window.location.pathname.endsWith('index.html') &&
                      window.location.pathname !== '/' &&
                      !window.location.pathname.endsWith('/_home/') &&
                      !window.location.pathname.endsWith('/_home/index.html')) {
                      console.log("User not signed in, redirecting to login from:", window.location.pathname);
                      window.location.href = 'index.html';
                  }
              }
          });
  
          if (logoutButton) {
              logoutButton.addEventListener('click', async () => {
                  try {
                      await auth.signOut();
                      console.log("User signed out successfully.");
                  } catch (error) {
                      console.error("Logout Error:", error);
                      alert("Error signing out: " + error.message);
                  }
              });
          }
      } else {
          console.error("Firebase auth is not initialized. App will not function correctly.");
      }
  
      // --- FUNCTION TO INITIALIZE CHECKLIST APP (HOME PAGE) ---
      function initializeChecklistApp() {
          const checklistItemsFromDOM = document.querySelectorAll('#checklist-app li[data-item-id]');
          const dailyPrioritiesTextarea = document.getElementById('daily-priorities');
          const filterAssigneeSelect = document.getElementById('filter-assignee');
          const filterStatusSelect = document.getElementById('filter-status');
          const resetFiltersBtn = document.getElementById('reset-filters');
  
          if (sharedDataDocRef) {
              sharedDataDocRef.onSnapshot((doc) => {
                  if (doc.exists) { // Corrected: .exists is a property for compat SDK
                      const firestoreData = doc.data();
                      console.log("Raw Firestore data received for checklist:", JSON.parse(JSON.stringify(firestoreData)));
  
                      const reconstructedChecklistItems = {};
                      for (const key in firestoreData) {
                          if (firestoreData.hasOwnProperty(key) && key.startsWith('checklistItems.')) {
                              const parts = key.split('.');
                              if (parts.length === 3) {
                                  const itemId = parts[1];
                                  const property = parts[2];
                                  const value = firestoreData[key];
                                  if (!reconstructedChecklistItems[itemId]) {
                                      reconstructedChecklistItems[itemId] = { checked: false, notes: '', assignee: 'none' };
                                  }
                                  reconstructedChecklistItems[itemId][property] = value;
                              }
                          }
                      }
                      console.log("Reconstructed checklistItems object:", JSON.parse(JSON.stringify(reconstructedChecklistItems)));
  
                      checklistItemsFromDOM.forEach(item => {
                          const itemId = item.dataset.itemId;
                          const itemDataFromFirestore = reconstructedChecklistItems[itemId] || { checked: false, notes: '', assignee: 'none' };
                          const assigneeFromFirebase = itemDataFromFirestore.assignee || 'none'; 
                          
                          const checkbox = item.querySelector('input[type="checkbox"]');
                          const notesTextarea = item.querySelector('.notes-area textarea');
                          const assigneeSelect = item.querySelector('.assignee-select');
  
                          if (checkbox) checkbox.checked = itemDataFromFirestore.checked;
                          if (notesTextarea) notesTextarea.value = itemDataFromFirestore.notes;
                          
                          if (assigneeSelect) {
                              // console.log(`--- Processing Item from DOM: ${itemId} ---`);
                              // console.log(`Value from RECONSTRUCTED data (assigneeFromFirebase): '${assigneeFromFirebase}'`);
                              // console.log(`Current select value BEFORE setting: '${assigneeSelect.value}'`);
                              assigneeSelect.value = assigneeFromFirebase;
                              // console.log(`Current select value AFTER attempting to set to '${assigneeFromFirebase}': '${assigneeSelect.value}'`);
                              if (assigneeSelect.value !== assigneeFromFirebase && assigneeFromFirebase !== 'none') {
                                  // console.warn(`WARN: Assignee for ${itemId} DID NOT SET AS EXPECTED.`);
                              } else {
                                  // console.log(`Assignee for ${itemId} set to '${assigneeFromFirebase}' (or successfully defaulted).`);
                              }
                              // console.log(`---------------------------------`);
                          }
                      });
  
                      if (dailyPrioritiesTextarea) {
                          dailyPrioritiesTextarea.value = firestoreData.dailyPriorities || '';
                      }
                  } else {
                      console.log("No shared data document found! (Checklist). You might need to add initial data to Firestore.");
                  }
                  setTimeout(() => {
                      // console.log("Updating UI (Progress/Dashboard/Filters) after onSnapshot processing.");
                      updateAllProgressAndDashboard();
                      applyFilters();
                  }, 0);
              }, (error) => {
                  console.error("Error listening to Firestore document (Checklist):", error);
                  alert("Error loading checklist data. Please try refreshing the page.");
              });
          }
  
          function saveChecklistItemData(itemId, property, value) { /* ... (same as before) ... */
              if (!sharedDataDocRef) return;
              const update = {};
              update[`checklistItems.${itemId}.${property}`] = value;
              sharedDataDocRef.set(update, { merge: true })
                  .then(() => console.log(`Checklist item ${itemId} property ${property} saved.`))
                  .catch(error => console.error("Error saving checklist item:", error));
          }
  
          checklistItemsFromDOM.forEach(item => { /* ... (same as before) ... */
              const itemId = item.dataset.itemId;
              const checkbox = item.querySelector('input[type="checkbox"]');
              const notesTextarea = item.querySelector('.notes-area textarea');
              const assigneeSelect = item.querySelector('.assignee-select');
              if (checkbox) checkbox.addEventListener('change', function() { saveChecklistItemData(itemId, 'checked', this.checked); });
              if (notesTextarea) notesTextarea.addEventListener('blur', function() { saveChecklistItemData(itemId, 'notes', this.value); });
              if (assigneeSelect) assigneeSelect.addEventListener('change', function() { saveChecklistItemData(itemId, 'assignee', this.value); });
              const notesBtn = item.querySelector('.notes-btn');
              const notesArea = item.querySelector('.notes-area');
              if (notesBtn && notesArea) {
                  notesBtn.addEventListener('click', () => {
                      notesArea.style.display = notesArea.style.display === 'none' ? 'block' : 'none';
                      if (notesArea.style.display === 'block' && notesTextarea) notesTextarea.focus();
                  });
              }
          });
  
          if (dailyPrioritiesTextarea) { /* ... (same as before) ... */
              dailyPrioritiesTextarea.addEventListener('blur', () => {
                  if (!sharedDataDocRef) return;
                  sharedDataDocRef.set({ dailyPriorities: dailyPrioritiesTextarea.value }, { merge: true })
                      .then(() => console.log("Daily priorities saved."))
                      .catch(error => console.error("Error saving daily priorities:", error));
              });
          }
          function updatePhaseProgress(phaseElement) { /* ... (same as before) ... */
              const allCheckboxesThisPhase = phaseElement.querySelectorAll('ul.task-list input[type="checkbox"]');
              const allCheckedThisPhase = phaseElement.querySelectorAll('ul.task-list input[type="checkbox"]:checked');
              const totalTasks = allCheckboxesThisPhase.length;
              const completedTasks = allCheckedThisPhase.length;
              const progressTextEl = document.getElementById(`${phaseElement.id}-progress-text`);
              const progressBarFillEl = document.getElementById(`${phaseElement.id}-progress-bar`);
              if (progressTextEl) progressTextEl.textContent = `${completedTasks}/${totalTasks}`;
              if (progressBarFillEl) progressBarFillEl.style.width = `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%`;
          }
          function updateOverallProgress() { /* ... (same as before) ... */
              const allCheckboxes = document.querySelectorAll('#checklist-app ul.task-list input[type="checkbox"]');
              const completedTasksOverall = document.querySelectorAll('#checklist-app ul.task-list input[type="checkbox"]:checked').length;
              const totalTasksOverall = allCheckboxes.length;
              const overallProgressTextEl = document.getElementById('overall-progress-text');
              const overallProgressBarFillEl = document.getElementById('overall-progress-bar');
              if (overallProgressTextEl && overallProgressBarFillEl) {
                  const percentage = totalTasksOverall > 0 ? (completedTasksOverall / totalTasksOverall) * 100 : 0;
                  overallProgressBarFillEl.style.width = `${percentage}%`;
                  overallProgressBarFillEl.textContent = `${Math.round(percentage)}%`;
              }
          }
          function populateQuickViewDashboard() { /* ... (same as before, including the 'both' fix) ... */
              const steveTasksList = document.getElementById('steve-next-tasks');
              const nicoleTasksList = document.getElementById('nicole-next-tasks');
              if (!steveTasksList || !nicoleTasksList) return;
              steveTasksList.innerHTML = ''; nicoleTasksList.innerHTML = '';
              let steveTaskCount = 0; let nicoleTaskCount = 0;
              document.querySelectorAll('#checklist-app li[data-item-id]').forEach(item => {
                  const checkbox = item.querySelector('input[type="checkbox"]');
                  const assigneeSelect = item.querySelector('.assignee-select');
                  const labelElement = item.querySelector('label');
                  if(checkbox && assigneeSelect && labelElement) {
                      const assignee = assigneeSelect.value;
                      const label = labelElement.textContent;
                      if (!checkbox.checked) {
                          if (assignee === 'steve' || assignee === 'both') {
                              if (steveTaskCount < 3) {
                                  const liSteve = document.createElement('li');
                                  liSteve.textContent = label;
                                  steveTasksList.appendChild(liSteve);
                                  steveTaskCount++;
                              }
                          }
                          if (assignee === 'nicole' || assignee === 'both') {
                              if (nicoleTaskCount < 3) {
                                  const liNicole = document.createElement('li');
                                  liNicole.textContent = label;
                                  nicoleTasksList.appendChild(liNicole);
                                  nicoleTaskCount++;
                              }
                          }
                      }
                  }
              });
              if (steveTaskCount === 0) steveTasksList.innerHTML = '<li>No pending tasks for Steve.</li>';
              if (nicoleTaskCount === 0) nicoleTasksList.innerHTML = '<li>No pending tasks for Nicole.</li>';
          }
          function applyFilters() { /* ... (same as before, needs update for 'both') ... */
              if (!filterAssigneeSelect || !filterStatusSelect) return;
              const selectedAssignee = filterAssigneeSelect.value;
              const selectedStatus = filterStatusSelect.value;
              document.querySelectorAll('#checklist-app li[data-item-id]').forEach(item => {
                  const assignee = item.querySelector('.assignee-select').value;
                  const checkbox = item.querySelector('input[type="checkbox"]');
                  let showItem = true;
                  if (selectedAssignee !== 'all') { 
                      if (selectedAssignee === 'steve') {
                          if (assignee !== 'steve' && assignee !== 'both') showItem = false;
                      } else if (selectedAssignee === 'nicole') {
                          if (assignee !== 'nicole' && assignee !== 'both') showItem = false;
                      } else { 
                          if (assignee !== selectedAssignee) showItem = false;
                      }
                  }
                  if (selectedStatus === 'complete' && !checkbox.checked) showItem = false;
                  else if (selectedStatus === 'incomplete' && checkbox.checked) showItem = false;
                  item.style.display = showItem ? '' : 'none';
              });
          }
          if (filterAssigneeSelect && filterStatusSelect) { /* ... (same as before) ... */
              filterAssigneeSelect.addEventListener('change', applyFilters);
              filterStatusSelect.addEventListener('change', applyFilters);
          }
          if (resetFiltersBtn) { /* ... (same as before) ... */
              resetFiltersBtn.addEventListener('click', () => {
                  if (filterAssigneeSelect) filterAssigneeSelect.value = 'all';
                  if (filterStatusSelect) filterStatusSelect.value = 'all';
                  applyFilters();
              });
          }
          function updateAllProgressAndDashboard() { /* ... (same as before) ... */
              document.querySelectorAll('.checklist-phase').forEach(updatePhaseProgress);
              updateOverallProgress();
              populateQuickViewDashboard();
          }
      } // End of initializeChecklistApp
  
      // --- Helper for ContentEditable Placeholders ---
      function handleContentEditablePlaceholder(element, placeholderText) { /* ... (same as before) ... */
          if (!element.dataset.placeholderOriginalText) {
              element.dataset.placeholderOriginalText = placeholderText || element.textContent.trim();
          }
          if (element.textContent.trim() === '' && element.dataset.placeholderOriginalText) {
              element.textContent = element.dataset.placeholderOriginalText;
          }
          element.addEventListener('focus', () => {
              if (element.textContent === element.dataset.placeholderOriginalText) element.textContent = '';
          });
          element.addEventListener('blur', () => {
              if (element.textContent.trim() === '') element.textContent = element.dataset.placeholderOriginalText;
          });
      }
  
      // --- FUNCTION TO INITIALIZE DOCUMENTS TRACKER PAGE ---
      function initializeDocumentsTracker() {
          const addDocBtn = document.getElementById('add-document-row');
          const docsTableBody = document.getElementById('documents-table-body');
  
          function renderDocsTable(docsData = []) { /* ... (same as before) ... */ 
              docsTableBody.innerHTML = '';
              (docsData || []).forEach((doc) => {
                  const row = docsTableBody.insertRow();
                  row.dataset.docId = doc.id;
                  row.innerHTML = `
                      <td contenteditable="true" class="doc-name editable-cell">${doc.name || ''}</td>
                      <td> <select class="doc-status"> <option value="needed" ${doc.status === 'needed' ? 'selected' : ''}>Needed</option> <option value="requested" ${doc.status === 'requested' ? 'selected' : ''}>Requested</option> <option value="received" ${doc.status === 'received' ? 'selected' : ''}>Received</option> <option value="submitted" ${doc.status === 'submitted' ? 'selected' : ''}>Submitted</option> <option value="approved" ${doc.status === 'approved' ? 'selected' : ''}>Approved</option> </select> </td>
                      <td> <select class="doc-responsible"> <option value="none" ${doc.responsible === 'none' ? 'selected' : ''}>N/A</option> <option value="steve" ${doc.responsible === 'steve' ? 'selected' : ''}>Steve</option> <option value="nicole" ${doc.responsible === 'nicole' ? 'selected' : ''}>Nicole</option> <option value="both" ${doc.responsible === 'both' ? 'selected' : ''}>Both</option> <option value="agent" ${doc.responsible === 'agent' ? 'selected' : ''}>Agent</option> <option value="attorney" ${doc.responsible === 'attorney' ? 'selected' : ''}>Attorney</option> <option value="lender" ${doc.responsible === 'lender' ? 'selected' : ''}>Lender</option> </select> </td>
                      <td contenteditable="true" class="doc-link editable-cell">${doc.link || ''}</td>
                      <td contenteditable="true" class="doc-notes editable-cell">${doc.notes || ''}</td>
                      <td><button class="delete-row-btn">Delete</button></td> `;
                  row.querySelectorAll('.editable-cell').forEach(cell => {
                      const placeholder = cell.classList.contains('doc-name') ? 'Document Name' : 
                                        cell.classList.contains('doc-link') ? 'Cloud link...' : 
                                        cell.classList.contains('doc-notes') ? 'Details...' : '';
                      handleContentEditablePlaceholder(cell, placeholder);
                  });
              });
              addDocEventListeners();
          }
          function addDocEventListeners() {
              docsTableBody.querySelectorAll('tr').forEach(row => {
                  row.querySelectorAll('td[contenteditable="true"].editable-cell, select').forEach(cell => {
                      cell.addEventListener('change', updateDocsInFirestore);
                      cell.addEventListener('blur', updateDocsInFirestore);
                  });
                  row.querySelector('.delete-row-btn').addEventListener('click', (e) => {
                      const docIdToDelete = e.target.closest('tr').dataset.docId;
                      if (sharedDataDocRef) {
                          sharedDataDocRef.get().then(docSnap => {
                              if (docSnap.exists) { // CORRECTED HERE
                                  const currentDocs = (docSnap.data().documents || []).filter(d => d.id !== docIdToDelete);
                                  sharedDataDocRef.set({ documents: currentDocs }, { merge: true })
                                      .then(() => console.log("Document deleted from Firestore."))
                                      .catch(error => console.error("Error deleting document:", error));
                              } else {
                                  console.warn("Attempted to delete document row, but main shared document doesn't exist.");
                              }
                          }).catch(error => console.error("Error fetching document before delete:", error));
                      }
                  });
              });
          }
          function getCurrentDocsFromTable() { /* ... (same as before) ... */
              const docs = [];
              docsTableBody.querySelectorAll('tr').forEach(row => {
                  const nameCell = row.querySelector('.doc-name');
                  const linkCell = row.querySelector('.doc-link');
                  const notesCell = row.querySelector('.doc-notes');
                  docs.push({
                      id: row.dataset.docId,
                      name: nameCell.textContent.trim() === (nameCell.dataset.placeholderOriginalText || 'Document Name') ? '' : nameCell.textContent.trim(),
                      status: row.querySelector('.doc-status').value,
                      responsible: row.querySelector('.doc-responsible').value,
                      link: linkCell.textContent.trim() === (linkCell.dataset.placeholderOriginalText || 'Cloud link...') ? '' : linkCell.textContent.trim(),
                      notes: notesCell.textContent.trim() === (notesCell.dataset.placeholderOriginalText || 'Details...') ? '' : notesCell.textContent.trim(),
                  });
              });
              return docs;
          }
          function updateDocsInFirestore() { /* ... (same as before) ... */
              if (!sharedDataDocRef) return;
              const currentDocs = getCurrentDocsFromTable();
              sharedDataDocRef.set({ documents: currentDocs }, { merge: true })
                  .then(() => console.log("Documents updated in Firestore."))
                  .catch(error => console.error("Error updating documents:", error));
          }
          if (addDocBtn) {
              addDocBtn.addEventListener('click', () => {
                  if (!sharedDataDocRef) return;
                  const newDocId = `doc_${Date.now()}`;
                  const newDoc = { id: newDocId, name: '', status: 'needed', responsible: 'none', link: '', notes: '' };
                  sharedDataDocRef.get().then(doc => { // doc here is the DocumentSnapshot
                      const currentDocs = doc.exists && doc.data().documents ? doc.data().documents : []; // CORRECTED HERE
                      currentDocs.push(newDoc);
                      sharedDataDocRef.set({ documents: currentDocs }, { merge: true })
                          .then(() => console.log("New document added to Firestore."))
                          .catch(error => console.error("Error adding new document:", error));
                  }).catch(error => console.error("Error fetching doc before adding new document:", error));
              });
          }
          if (sharedDataDocRef) { /* ... (same as before) ... */
              sharedDataDocRef.onSnapshot((doc) => {
                  if (doc.exists) renderDocsTable(doc.data().documents || []); // CORRECTED HERE
                  else renderDocsTable([]);
              }, (error) => {
                  console.error("Error listening to documents:", error);
                  alert("Error loading documents data.");
              });
          }
      } // End of initializeDocumentsTracker
  
      // --- FUNCTION TO INITIALIZE DEADLINES TRACKER PAGE ---
      function initializeDeadlinesTracker() {
          const addDeadlineBtn = document.getElementById('add-deadline-row');
          const deadlinesTableBody = document.getElementById('deadlines-table-body');
          function generateICS(deadline) { /* ... (same as before) ... */ 
               const startDate = deadline.date ? new Date(deadline.date + 'T09:00:00') : new Date();
              if (isNaN(startDate)) { alert("Invalid date for calendar event."); return; }
              const endDate = new Date(startDate);
              endDate.setHours(startDate.getHours() + 1);
              const pad = (num) => (num < 10 ? '0' : '') + num;
              const formatDateICS = (date) => `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
              const icsContent = [
                  'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//HomeBuyingChecklist//EN', 'BEGIN:VEVENT',
                  `UID:${deadline.id}@homebuyingchecklist.com`, `DTSTAMP:${formatDateICS(new Date())}`,
                  `DTSTART:${formatDateICS(startDate)}`, `DTEND:${formatDateICS(endDate)}`,
                  `SUMMARY:${deadline.description || 'Home Buying Deadline'}`, `DESCRIPTION:${deadline.notes || ''}`,
                  'END:VEVENT', 'END:VCALENDAR'
              ].join('\r\n');
              const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
              const link = document.createElement('a');
              link.href = URL.createObjectURL(blob);
              link.download = `${(deadline.description || 'Deadline').replace(/[^a-z0-9]/gi, '_')}.ics`;
              document.body.appendChild(link); link.click(); document.body.removeChild(link);
          }
          function renderDeadlinesTable(deadlinesData = []) { /* ... (same as before) ... */
              deadlinesTableBody.innerHTML = '';
              const sortedDeadlines = (deadlinesData || []).sort((a,b) => new Date(a.date) - new Date(b.date));
              sortedDeadlines.forEach((deadline) => {
                  const row = deadlinesTableBody.insertRow();
                  row.dataset.deadlineId = deadline.id;
                  row.innerHTML = `
                      <td><input type="date" class="deadline-date" value="${deadline.date || ''}"></td>
                      <td contenteditable="true" class="deadline-description editable-cell">${deadline.description || ''}</td>
                      <td> <select class="deadline-responsible"> <option value="none" ${deadline.responsible === 'none' ? 'selected' : ''}>N/A</option> <option value="steve" ${deadline.responsible === 'steve' ? 'selected' : ''}>Steve</option> <option value="nicole" ${deadline.responsible === 'nicole' ? 'selected' : ''}>Nicole</option> <option value="both" ${deadline.responsible === 'both' ? 'selected' : ''}>Both</option> <option value="agent" ${deadline.responsible === 'agent' ? 'selected' : ''}>Agent</option> <option value="attorney" ${deadline.responsible === 'attorney' ? 'selected' : ''}>Attorney</option> </select> </td>
                      <td contenteditable="true" class="deadline-notes editable-cell">${deadline.notes || ''}</td>
                      <td><button class="add-to-calendar-btn">To Calendar</button></td>
                      <td><button class="delete-row-btn">Delete</button></td> `;
                  row.querySelectorAll('.editable-cell').forEach(cell => {
                      const placeholder = cell.classList.contains('deadline-description') ? 'Deadline Description' : 
                                        cell.classList.contains('deadline-notes') ? 'Details...' : '';
                      handleContentEditablePlaceholder(cell, placeholder);
                  });
              });
              addDeadlineEventListeners();
          }
          function addDeadlineEventListeners() {
              deadlinesTableBody.querySelectorAll('tr').forEach(row => {
                  row.querySelectorAll('td[contenteditable="true"].editable-cell, input[type="date"], select').forEach(cell => {
                      cell.addEventListener('change', updateDeadlinesInFirestore);
                      cell.addEventListener('blur', updateDeadlinesInFirestore);
                  });
                  row.querySelector('.delete-row-btn').addEventListener('click', (e) => {
                      const deadlineIdToDelete = e.target.closest('tr').dataset.deadlineId;
                       if (sharedDataDocRef) {
                          sharedDataDocRef.get().then(docSnap => { // docSnap is DocumentSnapshot
                              if (docSnap.exists) { // CORRECTED HERE
                                  const currentDeadlines = (docSnap.data().deadlines || []).filter(d => d.id !== deadlineIdToDelete);
                                  sharedDataDocRef.set({ deadlines: currentDeadlines }, { merge: true })
                                      .then(() => console.log("Deadline deleted from Firestore."))
                                      .catch(error => console.error("Error deleting deadline:", error));
                              } else {
                                  console.warn("Attempted to delete deadline row, but main shared document doesn't exist.");
                              }
                          }).catch(error => console.error("Error fetching document before deadline delete:", error));
                      }
                  });
                  row.querySelector('.add-to-calendar-btn').addEventListener('click', (e) => { /* ... (same as before) ... */
                      const deadlineId = e.target.closest('tr').dataset.deadlineId;
                      const currentDeadlines = getCurrentDeadlinesFromTable();
                      const deadline = currentDeadlines.find(d => d.id === deadlineId);
                      if (deadline) generateICS(deadline);
                  });
              });
          }
          function getCurrentDeadlinesFromTable() { /* ... (same as before) ... */
               const deadlines = [];
              deadlinesTableBody.querySelectorAll('tr').forEach(row => {
                  const descriptionCell = row.querySelector('.deadline-description');
                  const notesCell = row.querySelector('.deadline-notes');
                  deadlines.push({
                      id: row.dataset.deadlineId,
                      date: row.querySelector('.deadline-date').value,
                      description: descriptionCell.textContent.trim() === (descriptionCell.dataset.placeholderOriginalText || 'Deadline Description') ? '' : descriptionCell.textContent.trim(),
                      responsible: row.querySelector('.deadline-responsible').value,
                      notes: notesCell.textContent.trim() === (notesCell.dataset.placeholderOriginalText || 'Details...') ? '' : notesCell.textContent.trim(),
                  });
              });
              return deadlines;
          }
          function updateDeadlinesInFirestore() { /* ... (same as before) ... */
              if (!sharedDataDocRef) return;
              const currentDeadlines = getCurrentDeadlinesFromTable();
              sharedDataDocRef.set({ deadlines: currentDeadlines }, { merge: true })
                  .then(() => console.log("Deadlines updated in Firestore."))
                  .catch(error => console.error("Error updating deadlines:", error));
          }
          if (addDeadlineBtn) {
              addDeadlineBtn.addEventListener('click', () => {
                  if (!sharedDataDocRef) return;
                  const newDeadlineId = `deadline_${Date.now()}`;
                  const newDeadline = { id: newDeadlineId, date: '', description: '', responsible: 'none', notes: '' };
                  sharedDataDocRef.get().then(doc => { // doc is DocumentSnapshot
                      const currentDeadlines = doc.exists && doc.data().deadlines ? doc.data().deadlines : []; // CORRECTED HERE
                      currentDeadlines.push(newDeadline);
                      sharedDataDocRef.set({ deadlines: currentDeadlines }, { merge: true })
                          .then(() => console.log("New deadline added to Firestore."))
                          .catch(error => console.error("Error adding new deadline:", error));
                  }).catch(error => console.error("Error fetching doc before adding new deadline:", error));
              });
          }
          if (sharedDataDocRef) { /* ... (same as before) ... */
              sharedDataDocRef.onSnapshot((doc) => {
                  if (doc.exists) renderDeadlinesTable(doc.data().deadlines || []); // CORRECTED HERE
                  else renderDeadlinesTable([]);
              }, (error) => {
                  console.error("Error listening to deadlines:", error);
                  alert("Error loading deadlines data.");
              });
          }
      } // End of initializeDeadlinesTracker
  
      // --- FUNCTION TO INITIALIZE CONTACTS PAGE ---
      function initializeContactsPage() { /* ... (same as before) ... */
          const contactFields = document.querySelectorAll('#contacts-content .editable[data-ls-key]');
          contactFields.forEach(field => {
              const key = field.dataset.lsKey;
              handleContentEditablePlaceholder(field, field.textContent.trim()); 
              field.addEventListener('blur', () => {
                  if (!sharedDataDocRef) return;
                  const update = {};
                  const valueToSave = field.textContent.trim() === field.dataset.placeholderOriginalText ? '' : field.textContent.trim();
                  update[`contacts.${key}`] = valueToSave;
                  sharedDataDocRef.set(update, { merge: true })
                      .then(() => console.log(`Contact field ${key} saved with value: '${valueToSave}'`))
                      .catch(err => console.error("Error saving contact field:", err));
              });
              field.addEventListener('keypress', (event) => {
                  if (event.key === 'Enter') { event.preventDefault(); field.blur(); }
              });
          });
          if (sharedDataDocRef) {
              sharedDataDocRef.onSnapshot(doc => { // doc is DocumentSnapshot
                  if (doc.exists) { // CORRECTED HERE
                      const data = doc.data();
                      const firestoreContacts = {}; // Reconstruct from flat fields
                      for (const rawKey in data) {
                          if (data.hasOwnProperty(rawKey) && rawKey.startsWith('contacts.')) {
                              const parts = rawKey.split('.');
                              if (parts.length === 2) firestoreContacts[parts[1]] = data[rawKey];
                          }
                      }
                      // console.log("Reconstructed contacts for display:", firestoreContacts);
                      contactFields.forEach(field => {
                          const key = field.dataset.lsKey;
                          if (!field.dataset.placeholderOriginalText) field.dataset.placeholderOriginalText = field.textContent.trim();
                          const savedValue = firestoreContacts[key];
                          if (savedValue !== undefined && savedValue.trim() !== '') field.textContent = savedValue;
                          else field.textContent = field.dataset.placeholderOriginalText; 
                      });
                  } else {
                      console.log("Contacts data section does not exist in Firestore yet.");
                       contactFields.forEach(field => {
                          if (!field.dataset.placeholderOriginalText) field.dataset.placeholderOriginalText = field.textContent.trim();
                          field.textContent = field.dataset.placeholderOriginalText;
                      });
                  }
              }, error => console.error("Error loading contacts from Firestore:", error));
          }
      } // End of initializeContactsPage
  
  }); // End of DOMContentLoaded