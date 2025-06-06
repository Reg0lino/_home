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
      // --- THEME SELECTOR LOGIC (Replaces old theme toggle logic) ---
      const themeSelector = document.getElementById('theme-selector');
      const body = document.body;
      const defaultTheme = "theme-default-light"; // Define a default theme
  
      function applySelectedTheme(themeClassName) {
          // Remove any existing theme classes from the body
          // This regex matches any class starting with 'theme-'
          const themeRegex = /\btheme-[a-zA-Z0-9-]+\b/g;
          body.className = body.className.replace(themeRegex, '').trim();
  
          // Add the new theme class if it's not the default placeholder or empty
          if (themeClassName && themeClassName !== "none" && themeClassName !== "") {
              body.classList.add(themeClassName);
              console.log("Applied theme:", themeClassName);
          } else {
              body.classList.add(defaultTheme); // Apply default if no valid theme
              console.log("Applied default theme as no valid theme was selected/stored.");
          }
  
          // Update the selector to show the currently applied theme
          if (themeSelector) {
              themeSelector.value = themeClassName || defaultTheme;
          }
      }
  
      // Load and apply saved theme on initial page load
      const savedTheme = localStorage.getItem('selectedTheme');
      if (savedTheme) {
          applySelectedTheme(savedTheme);
      } else {
          applySelectedTheme(defaultTheme); // Apply default if no theme is saved
      }
  
      if (themeSelector) {
          themeSelector.addEventListener('change', (event) => {
              const selectedThemeClass = event.target.value;
              applySelectedTheme(selectedThemeClass);
              localStorage.setItem('selectedTheme', selectedThemeClass);
          });
      }
      // --- END OF THEME SELECTOR LOGIC ---
  
      // --- AUTHENTICATION STATE LISTENER & LOGOUT ---
      if (auth) {
          const logoutButton = document.getElementById('logout-button');
  
          auth.onAuthStateChanged(user => {
              if (user) {
                  currentUser = user;
                  // console.log("User signed in:", currentUser.uid, "Page:", window.location.pathname);
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
                      // console.log("User not signed in, redirecting to login from:", window.location.pathname);
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
          const dailyPrioritiesDisplay = document.getElementById('daily-priorities-display');
          const dailyPrioritiesTextarea = document.getElementById('daily-priorities');
          const filterAssigneeSelect = document.getElementById('filter-assignee');
          const filterStatusSelect = document.getElementById('filter-status');
          const resetFiltersBtn = document.getElementById('reset-filters');
  
          if (sharedDataDocRef) {
              sharedDataDocRef.onSnapshot((doc) => {
                  if (doc.exists) {
                      const firestoreData = doc.data();
                      // console.log("Raw Firestore data received for checklist:", JSON.parse(JSON.stringify(firestoreData)));
  
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
                      // console.log("Reconstructed checklistItems object:", JSON.parse(JSON.stringify(reconstructedChecklistItems)));
  
                      checklistItemsFromDOM.forEach(item => {
                          const itemId = item.dataset.itemId;
                          const itemDataFromFirestore = reconstructedChecklistItems[itemId] || { checked: false, notes: '', assignee: 'none' };
                          const assigneeFromFirebase = itemDataFromFirestore.assignee || 'none'; 
                          
                          const checkbox = item.querySelector('input[type="checkbox"]');
                          const notesArea = item.querySelector('.notes-area');
                          const notesDisplay = notesArea ? notesArea.querySelector('.notes-display') : null;
                          const notesTextarea = notesArea ? notesArea.querySelector('.notes-edit') : null;
                          const assigneeSelect = item.querySelector('.assignee-select');

                          if (checkbox) checkbox.checked = itemDataFromFirestore.checked;
                          if (notesTextarea) notesTextarea.value = itemDataFromFirestore.notes;

                          // Update notes display with linkified value
                          if (notesDisplay) notesDisplay.innerHTML = linkify(itemDataFromFirestore.notes || '');

                          // Show display, hide textarea
                          if (notesDisplay) notesDisplay.style.display = '';
                          if (notesTextarea) notesTextarea.style.display = 'none';

                          if (assigneeSelect) {
                              assigneeSelect.value = assigneeFromFirebase;
                              if (assigneeSelect.value !== assigneeFromFirebase && assigneeFromFirebase !== 'none' && assigneeFromFirebase !== '') {
                                  console.warn(`Assignee for ${itemId} ('${assigneeFromFirebase}') not found in select options. Current value: '${assigneeSelect.value}'. Options:`, Array.from(assigneeSelect.options).map(opt=>opt.value));
                              }
                          }
                      });

                      // --- DAILY PRIORITIES DISPLAY LOGIC ---
                      if (dailyPrioritiesDisplay && dailyPrioritiesTextarea) {
                          const val = firestoreData.dailyPriorities || '';
                          dailyPrioritiesDisplay.innerHTML = linkify(val);
                          dailyPrioritiesTextarea.value = val;
                          dailyPrioritiesDisplay.style.display = '';
                          dailyPrioritiesTextarea.style.display = 'none';
                      }
                  } else {
                      console.log("No shared data document found! (Checklist).");
                  }
                  setTimeout(() => {
                      updateAllProgressAndDashboard();
                      applyFilters();
                  }, 0);
              }, (error) => {
                  console.error("Error listening to Firestore document (Checklist):", error);
              });
          }

          function saveChecklistItemData(itemId, property, value) {
              if (!sharedDataDocRef) return;
              const update = {};
              update[`checklistItems.${itemId}.${property}`] = value;
              sharedDataDocRef.set(update, { merge: true })
                  .then(() => { /* ... */ })
                  .catch(error => console.error("Error saving checklist item:", error));
          }

          checklistItemsFromDOM.forEach(item => {
              const itemId = item.dataset.itemId;
              const checkbox = item.querySelector('input[type="checkbox"]');
              const notesArea = item.querySelector('.notes-area');
              const notesDisplay = notesArea ? notesArea.querySelector('.notes-display') : null;
              const notesTextarea = notesArea ? notesArea.querySelector('.notes-edit') : null;
              const assigneeSelect = item.querySelector('.assignee-select');
              if (checkbox) checkbox.addEventListener('change', function() { saveChecklistItemData(itemId, 'checked', this.checked); });
              if (assigneeSelect) assigneeSelect.addEventListener('change', function() { saveChecklistItemData(itemId, 'assignee', this.value); });
              const notesBtn = item.querySelector('.notes-btn');
              if (notesBtn && notesArea) {
                  notesBtn.addEventListener('click', () => {
                      notesArea.style.display = notesArea.style.display === 'none' ? 'block' : 'none';
                      if (notesArea.style.display === 'block' && notesDisplay) notesDisplay.focus();
                  });
              }
              // --- Notes display/edit toggle logic ---
              if (notesDisplay && notesTextarea) {
                  // Show textarea on click/focus of display
                  notesDisplay.addEventListener('click', () => {
                      notesDisplay.style.display = 'none';
                      notesTextarea.style.display = '';
                      notesTextarea.focus();
                  });
                  notesDisplay.addEventListener('keydown', (e) => {
                      if (e.key === 'Enter') {
                          e.preventDefault();
                          notesDisplay.click();
                      }
                  });
                  // Save on blur of textarea
                  notesTextarea.addEventListener('blur', function() {
                      const val = notesTextarea.value;
                      saveChecklistItemData(itemId, 'notes', val);
                      notesDisplay.innerHTML = linkify(val);
                      notesDisplay.style.display = '';
                      notesTextarea.style.display = 'none';
                  });
              }
          });

          // --- Daily Priorities: Click to Edit/Blur to Save ---
          if (dailyPrioritiesDisplay && dailyPrioritiesTextarea) {
              dailyPrioritiesDisplay.addEventListener('click', () => {
                  dailyPrioritiesDisplay.style.display = 'none';
                  dailyPrioritiesTextarea.style.display = '';
                  dailyPrioritiesTextarea.focus();
              });
              dailyPrioritiesDisplay.addEventListener('keydown', (e) => {
                  if (e.key === 'Enter') {
                      e.preventDefault();
                      dailyPrioritiesDisplay.click();
                  }
              });
              dailyPrioritiesTextarea.addEventListener('blur', () => {
                  if (!sharedDataDocRef) return;
                  const val = dailyPrioritiesTextarea.value;
                  sharedDataDocRef.set({ dailyPriorities: val }, { merge: true })
                      .then(() => {
                          dailyPrioritiesDisplay.innerHTML = linkify(val);
                          dailyPrioritiesDisplay.style.display = '';
                          dailyPrioritiesTextarea.style.display = 'none';
                      })
                      .catch(error => console.error("Error saving daily priorities:", error));
              });
          }

          function updatePhaseProgress(phaseElement) { /* ... (same) ... */ 
              const allCheckboxesThisPhase = phaseElement.querySelectorAll('ul.task-list input[type="checkbox"]');
              const allCheckedThisPhase = phaseElement.querySelectorAll('ul.task-list input[type="checkbox"]:checked');
              const totalTasks = allCheckboxesThisPhase.length;
              const completedTasks = allCheckedThisPhase.length;
              const progressTextEl = document.getElementById(`${phaseElement.id}-progress-text`);
              const progressBarFillEl = document.getElementById(`${phaseElement.id}-progress-bar`);
              if (progressTextEl) progressTextEl.textContent = `${completedTasks}/${totalTasks}`;
              if (progressBarFillEl) progressBarFillEl.style.width = `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%`;
          }
          function updateOverallProgress() { /* ... (same) ... */
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
          function populateQuickViewDashboard() { /* ... (same, includes 'both' fix) ... */
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
          function applyFilters() { /* ... (same, includes 'both' fix for assignee filter) ... */
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
          if (filterAssigneeSelect && filterStatusSelect) { /* ... (same) ... */
              filterAssigneeSelect.addEventListener('change', applyFilters);
              filterStatusSelect.addEventListener('change', applyFilters);
          }
          if (resetFiltersBtn) { /* ... (same) ... */
              resetFiltersBtn.addEventListener('click', () => {
                  if (filterAssigneeSelect) filterAssigneeSelect.value = 'all';
                  if (filterStatusSelect) filterStatusSelect.value = 'all';
                  applyFilters();
              });
          }
          function updateAllProgressAndDashboard() { /* ... (same) ... */
              document.querySelectorAll('.checklist-phase').forEach(updatePhaseProgress);
              updateOverallProgress();
              populateQuickViewDashboard();
          }
      } // End of initializeChecklistApp
  
      // --- Helper for ContentEditable Placeholders ---
      function handleContentEditablePlaceholder(element, placeholderText) { /* ... (same) ... */
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
      function initializeDocumentsTracker() { /* ... (same as last working version with .exists fix) ... */ 
          const addDocBtn = document.getElementById('add-document-row');
          const docsTableBody = document.getElementById('documents-table-body');
          function renderDocsTable(docsData = []) { 
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
                              if (docSnap.exists) { 
                                  const currentDocs = (docSnap.data().documents || []).filter(d => d.id !== docIdToDelete);
                                  sharedDataDocRef.set({ documents: currentDocs }, { merge: true })
                                      .then(() => { /* console.log("Document deleted from Firestore."); */ })
                                      .catch(error => console.error("Error deleting document:", error));
                              }
                          }).catch(error => console.error("Error fetching document before delete:", error));
                      }
                  });
              });
          }
          function getCurrentDocsFromTable() { 
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
          function updateDocsInFirestore() { 
              if (!sharedDataDocRef) return;
              const currentDocs = getCurrentDocsFromTable();
              sharedDataDocRef.set({ documents: currentDocs }, { merge: true })
                  .then(() => { /* console.log("Documents updated in Firestore."); */ })
                  .catch(error => console.error("Error updating documents:", error));
          }
          if (addDocBtn) {
              addDocBtn.addEventListener('click', () => {
                  if (!sharedDataDocRef) return;
                  const newDocId = `doc_${Date.now()}`;
                  const newDoc = { id: newDocId, name: '', status: 'needed', responsible: 'none', link: '', notes: '' };
                  sharedDataDocRef.get().then(doc => { 
                      const currentDocs = doc.exists && doc.data().documents ? doc.data().documents : []; 
                      currentDocs.push(newDoc);
                      sharedDataDocRef.set({ documents: currentDocs }, { merge: true })
                          .then(() => { /* console.log("New document added to Firestore."); */ })
                          .catch(error => console.error("Error adding new document:", error));
                  }).catch(error => console.error("Error fetching doc before adding new document:", error));
              });
          }
          if (sharedDataDocRef) { 
              sharedDataDocRef.onSnapshot((doc) => {
                  if (doc.exists) renderDocsTable(doc.data().documents || []);
                  else renderDocsTable([]);
              }, (error) => console.error("Error listening to documents:", error));
          }
      }
  
      // --- FUNCTION TO INITIALIZE DEADLINES TRACKER PAGE ---
      function initializeDeadlinesTracker() { /* ... (same as last working version with .exists fix) ... */ 
          const addDeadlineBtn = document.getElementById('add-deadline-row');
          const deadlinesTableBody = document.getElementById('deadlines-table-body');
          function generateICS(deadline) { 
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
          function renderDeadlinesTable(deadlinesData = []) { 
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
                          sharedDataDocRef.get().then(docSnap => { 
                              if (docSnap.exists) { 
                                  const currentDeadlines = (docSnap.data().deadlines || []).filter(d => d.id !== deadlineIdToDelete);
                                  sharedDataDocRef.set({ deadlines: currentDeadlines }, { merge: true })
                                      .then(() => { /* console.log("Deadline deleted from Firestore."); */ })
                                      .catch(error => console.error("Error deleting deadline:", error));
                              }
                          }).catch(error => console.error("Error fetching document before deadline delete:", error));
                      }
                  });
                  row.querySelector('.add-to-calendar-btn').addEventListener('click', (e) => { 
                      const deadlineId = e.target.closest('tr').dataset.deadlineId;
                      const currentDeadlines = getCurrentDeadlinesFromTable();
                      const deadline = currentDeadlines.find(d => d.id === deadlineId);
                      if (deadline) generateICS(deadline);
                  });
              });
          }
          function getCurrentDeadlinesFromTable() { 
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
          function updateDeadlinesInFirestore() { 
              if (!sharedDataDocRef) return;
              const currentDeadlines = getCurrentDeadlinesFromTable();
              sharedDataDocRef.set({ deadlines: currentDeadlines }, { merge: true })
                  .then(() => { /* console.log("Deadlines updated in Firestore."); */ })
                  .catch(error => console.error("Error updating deadlines:", error));
          }
          if (addDeadlineBtn) {
              addDeadlineBtn.addEventListener('click', () => {
                  if (!sharedDataDocRef) return;
                  const newDeadlineId = `deadline_${Date.now()}`;
                  const newDeadline = { id: newDeadlineId, date: '', description: '', responsible: 'none', notes: '' };
                  sharedDataDocRef.get().then(doc => { 
                      const currentDeadlines = doc.exists && doc.data().deadlines ? doc.data().deadlines : []; 
                      currentDeadlines.push(newDeadline);
                      sharedDataDocRef.set({ deadlines: currentDeadlines }, { merge: true })
                          .then(() => { /* console.log("New deadline added to Firestore."); */ })
                          .catch(error => console.error("Error adding new deadline:", error));
                  }).catch(error => console.error("Error fetching doc before adding new deadline:", error));
              });
          }
          if (sharedDataDocRef) { 
              sharedDataDocRef.onSnapshot((doc) => {
                  if (doc.exists) renderDeadlinesTable(doc.data().deadlines || []); 
                  else renderDeadlinesTable([]);
              }, (error) => console.error("Error listening to deadlines:", error));
          }
      } // End of initializeDeadlinesTracker
  
      // --- FUNCTION TO INITIALIZE CONTACTS PAGE ---
      function initializeContactsPage() { /* ... (same as last working version with .exists fix) ... */ 
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
                      .then(() => { /* console.log(`Contact field ${key} saved with value: '${valueToSave}'`); */ })
                      .catch(err => console.error("Error saving contact field:", err));
              });
              field.addEventListener('keypress', (event) => {
                  if (event.key === 'Enter') { event.preventDefault(); field.blur(); }
              });
          });
          if (sharedDataDocRef) {
              sharedDataDocRef.onSnapshot(doc => { 
                  if (doc.exists) { 
                      const data = doc.data();
                      const firestoreContacts = {}; 
                      // Support both flattened and nested contacts data
                      if (data.contacts && typeof data.contacts === 'object') {
                          // Nested object style: contacts: { key: value }
                          Object.assign(firestoreContacts, data.contacts);
                      }
                      for (const rawKey in data) {
                          if (data.hasOwnProperty(rawKey) && rawKey.startsWith('contacts.')) {
                              const parts = rawKey.split('.');
                              if (parts.length === 2) firestoreContacts[parts[1]] = data[rawKey];
                          }
                      }
                      contactFields.forEach(field => {
                          const key = field.dataset.lsKey;
                          if (!field.dataset.placeholderOriginalText) field.dataset.placeholderOriginalText = field.textContent.trim();
                          const savedValue = firestoreContacts[key];
                          if (savedValue !== undefined && savedValue.trim() !== '') field.textContent = savedValue;
                          else field.textContent = field.dataset.placeholderOriginalText; 
                      });
                  } else {
                      // console.log("Contacts data section does not exist in Firestore yet.");
                       contactFields.forEach(field => {
                          if (!field.dataset.placeholderOriginalText) field.dataset.placeholderOriginalText = field.textContent.trim();
                          field.textContent = field.dataset.placeholderOriginalText;
                      });
                  }
              }, error => console.error("Error loading contacts from Firestore:", error));
          }
      } // End of initializeContactsPage
  
  }); // End of DOMContentLoaded

  // --- Helper: Linkify plain text URLs and preserve line breaks ---
  function linkify(text) {
      if (!text) return '';
      // Replace URLs with anchor tags
      const urlPattern = /(\bhttps?:\/\/[^\s]+)/gi;
      let html = text.replace(urlPattern, '<a href="$1" target="_blank" rel="noopener">$1</a>');
      // Replace line breaks with <br>
      html = html.replace(/\n/g, '<br>');
      return html;
  }
// No changes needed for emoji display in JS.