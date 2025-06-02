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
          const checklistItems = document.querySelectorAll('#checklist-app li[data-item-id]');
          const dailyPrioritiesTextarea = document.getElementById('daily-priorities');
          const filterAssigneeSelect = document.getElementById('filter-assignee');
          const filterStatusSelect = document.getElementById('filter-status');
          const resetFiltersBtn = document.getElementById('reset-filters');
  
          if (sharedDataDocRef) {
              sharedDataDocRef.onSnapshot((doc) => {
                  if (doc.exists) {
                      const data = doc.data();
                      console.log("Firestore data received for checklist:", data); // Overall data log
  
                      const firestoreChecklistItems = data.checklistItems || {};
                      checklistItems.forEach(item => {
                          const itemId = item.dataset.itemId;
                          // --- NEW DIAGNOSTIC LOGS ---
                        console.log(`+++ Processing Item ID from DOM: ${itemId} +++`);
                        console.log(`Full firestoreChecklistItems object:`, JSON.parse(JSON.stringify(firestoreChecklistItems))); // Log a deep copy to avoid live object issues in console
                        console.log(`Accessing firestoreChecklistItems['${itemId}']:`, firestoreChecklistItems[itemId]);
                        // --- END OF NEW DIAGNOSTIC LOGS ---
                          // Provide a default for itemData.assignee if itemData itself is undefined or assignee is missing
                          const itemData = firestoreChecklistItems[itemId] || { checked: false, notes: '', assignee: 'none' };
                          // Ensure assignee has a fallback even if itemData exists but assignee doesn't
                          const assigneeFromFirebase = itemData.assignee || 'none'; 
                          
                          const checkbox = item.querySelector('input[type="checkbox"]');
                          const notesTextarea = item.querySelector('.notes-area textarea');
                          const assigneeSelect = item.querySelector('.assignee-select');
  
                          if (checkbox) checkbox.checked = itemData.checked;
                          if (notesTextarea) notesTextarea.value = itemData.notes;
                          
                          if (assigneeSelect) {
                              // --- DETAILED DIAGNOSTIC LOGS FOR ASSIGNEE ---
                              console.log(`--- DIAGNOSING Item: ${itemId} ---`);
                              console.log(`Value from Firebase (assigneeFromFirebase): '${assigneeFromFirebase}' (type: ${typeof assigneeFromFirebase})`);
                              console.log(`Current select value BEFORE setting: '${assigneeSelect.value}'`);
                              
                              // Attempt to set the value
                              assigneeSelect.value = assigneeFromFirebase;
                              
                              console.log(`Current select value AFTER attempting to set to '${assigneeFromFirebase}': '${assigneeSelect.value}'`);
                              
                              // Check if the value was actually set to what Firebase intended
                              if (assigneeSelect.value !== assigneeFromFirebase) {
                                  // Only log a strong warning if the Firebase value was something other than the default 'none'
                                  // and it still didn't set correctly.
                                  if (assigneeFromFirebase && assigneeFromFirebase !== 'none') {
                                      console.warn(`WARN: Assignee for ${itemId} DID NOT SET AS EXPECTED.`);
                                      console.warn(`   Firebase wanted: '${assigneeFromFirebase}'`);
                                      console.warn(`   Dropdown shows: '${assigneeSelect.value}'`);
                                      console.warn('   Available options in dropdown:', Array.from(assigneeSelect.options).map(opt => ({ text: opt.text, value: opt.value })));
                                  } else if (assigneeSelect.value === '' && assigneeFromFirebase === 'none') {
                                       // This can happen if "none" isn't explicitly the first selected option
                                       // and the browser defaults to an empty value for the select.
                                       // If firebase wants 'none' and select is empty, try setting to first option if its value is 'none'.
                                       if (assigneeSelect.options.length > 0 && assigneeSelect.options[0].value === 'none') {
                                           assigneeSelect.value = 'none'; // Explicitly set to 'none' if it's the first option
                                           console.log(`   Attempted to default to 'none' for ${itemId}. New value: '${assigneeSelect.value}'`);
                                       }
                                  }
                              } else {
                                  console.log(`SUCCESS: Assignee for ${itemId} correctly set to '${assigneeFromFirebase}'`);
                              }
                              console.log(`---------------------------------`);
                              // --- END OF DETAILED DIAGNOSTIC LOGS ---
                          }
                      });
  
                      if (dailyPrioritiesTextarea) {
                          dailyPrioritiesTextarea.value = data.dailyPriorities || '';
                      }
                  } else {
                      console.log("No shared data document found! (Checklist). You might need to add initial data to Firestore.");
                  }
                  // Using a slight delay to ensure DOM has potentially updated from above assignments
                  // before reading from it for dashboard/progress.
                  setTimeout(() => {
                      console.log("Updating UI (Progress/Dashboard/Filters) after onSnapshot processing.");
                      updateAllProgressAndDashboard();
                      applyFilters();
                  }, 0); // setTimeout with 0ms pushes execution to end of current event loop cycle
              }, (error) => {
                  console.error("Error listening to Firestore document (Checklist):", error);
                  alert("Error loading checklist data. Please try refreshing the page.");
              });
          }
  
          function saveChecklistItemData(itemId, property, value) {
              if (!sharedDataDocRef) return;
              const update = {};
              update[`checklistItems.${itemId}.${property}`] = value;
              sharedDataDocRef.set(update, { merge: true })
                  .then(() => console.log(`Checklist item ${itemId} property ${property} saved.`))
                  .catch(error => console.error("Error saving checklist item:", error));
          }
  
          checklistItems.forEach(item => {
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
  
          if (dailyPrioritiesTextarea) {
              dailyPrioritiesTextarea.addEventListener('blur', () => {
                  if (!sharedDataDocRef) return;
                  sharedDataDocRef.set({ dailyPriorities: dailyPrioritiesTextarea.value }, { merge: true })
                      .then(() => console.log("Daily priorities saved."))
                      .catch(error => console.error("Error saving daily priorities:", error));
              });
          }
  
          function updatePhaseProgress(phaseElement) {
              const allCheckboxesThisPhase = phaseElement.querySelectorAll('ul.task-list input[type="checkbox"]');
              const allCheckedThisPhase = phaseElement.querySelectorAll('ul.task-list input[type="checkbox"]:checked');
              const totalTasks = allCheckboxesThisPhase.length;
              const completedTasks = allCheckedThisPhase.length;
              const progressTextEl = document.getElementById(`${phaseElement.id}-progress-text`);
              const progressBarFillEl = document.getElementById(`${phaseElement.id}-progress-bar`);
              if (progressTextEl) progressTextEl.textContent = `${completedTasks}/${totalTasks}`;
              if (progressBarFillEl) progressBarFillEl.style.width = `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%`;
          }
  
          function updateOverallProgress() {
              const allCheckboxes = document.querySelectorAll('#checklist-app ul.task-list input[type="checkbox"]');
              const completedTasksOverall = document.querySelectorAll('#checklist-app ul.task-list input[type="checkbox"]:checked').length;
              const totalTasksOverall = allCheckboxes.length;
              const overallProgressTextEl = document.getElementById('overall-progress-text');
              const overallProgressBarFillEl = document.getElementById('overall-progress-bar');
              if (overallProgressTextEl && overallProgressBarFillEl) {
                  const percentage = totalTasksOverall > 0 ? (completedTasksOverall / totalTasksOverall) * 100 : 0;
                  overallProgressBarFillEl.style.width = `${percentage}%`;
                  overallProgressBarFillEl.textContent = `${Math.round(percentage)}%`; // Added text to bar
              }
          }
          
          function populateQuickViewDashboard() {
              const steveTasksList = document.getElementById('steve-next-tasks');
              const nicoleTasksList = document.getElementById('nicole-next-tasks');
              if (!steveTasksList || !nicoleTasksList) {
                  // console.warn("Dashboard task list elements not found.");
                  return;
              }
              steveTasksList.innerHTML = ''; nicoleTasksList.innerHTML = '';
              let steveTaskCount = 0; let nicoleTaskCount = 0;
              
              // Iterate over the actual `li` items in the DOM, which should have been updated by onSnapshot
              document.querySelectorAll('#checklist-app li[data-item-id]').forEach(item => {
                  const checkbox = item.querySelector('input[type="checkbox"]');
                  const assigneeSelect = item.querySelector('.assignee-select'); // Get the select element
                  const labelElement = item.querySelector('label'); // Get the label element
  
                  if(checkbox && assigneeSelect && labelElement) { // Ensure all elements exist
                      const assignee = assigneeSelect.value; // Read the CURRENT value from the DOM select
                      const label = labelElement.textContent;
  
                      if (!checkbox.checked) { // Only show incomplete tasks
                          const li = document.createElement('li');
                          li.textContent = label;
                          if (assignee === 'steve' && steveTaskCount < 3) { steveTasksList.appendChild(li); steveTaskCount++; }
                          else if (assignee === 'nicole' && nicoleTaskCount < 3) { nicoleTasksList.appendChild(li); nicoleTaskCount++; }
                      }
                  } else {
                      // console.warn("Missing elements in checklist item for dashboard:", item.dataset.itemId);
                  }
              });
              if (steveTaskCount === 0) steveTasksList.innerHTML = '<li>No pending tasks for Steve.</li>';
              if (nicoleTaskCount === 0) nicoleTasksList.innerHTML = '<li>No pending tasks for Nicole.</li>';
          }
  
          function applyFilters() {
              if (!filterAssigneeSelect || !filterStatusSelect) return;
              const selectedAssignee = filterAssigneeSelect.value;
              const selectedStatus = filterStatusSelect.value;
              document.querySelectorAll('#checklist-app li[data-item-id]').forEach(item => {
                  const assignee = item.querySelector('.assignee-select').value; // Read current value from DOM
                  const checkbox = item.querySelector('input[type="checkbox"]');
                  let showItem = true;
                  if (selectedAssignee !== 'all' && assignee !== selectedAssignee) showItem = false;
                  if (selectedStatus === 'complete' && !checkbox.checked) showItem = false;
                  else if (selectedStatus === 'incomplete' && checkbox.checked) showItem = false;
                  item.style.display = showItem ? '' : 'none';
              });
          }
  
          if (filterAssigneeSelect && filterStatusSelect) {
              filterAssigneeSelect.addEventListener('change', applyFilters);
              filterStatusSelect.addEventListener('change', applyFilters);
          }
          if (resetFiltersBtn) {
              resetFiltersBtn.addEventListener('click', () => {
                  if (filterAssigneeSelect) filterAssigneeSelect.value = 'all';
                  if (filterStatusSelect) filterStatusSelect.value = 'all';
                  applyFilters();
              });
          }
  
          function updateAllProgressAndDashboard() {
              document.querySelectorAll('.checklist-phase').forEach(updatePhaseProgress);
              updateOverallProgress();
              populateQuickViewDashboard();
          }
      } // End of initializeChecklistApp
  
      // --- Helper for ContentEditable Placeholders ---
      function handleContentEditablePlaceholder(element, placeholderText) {
          // Store original placeholder if not already stored, and set initial text
          if (!element.dataset.placeholderOriginalText) {
              element.dataset.placeholderOriginalText = placeholderText || element.textContent.trim(); // Use arg or initial
          }
          if (element.textContent.trim() === '' && element.dataset.placeholderOriginalText) {
              element.textContent = element.dataset.placeholderOriginalText;
          }
  
          element.addEventListener('focus', () => {
              if (element.textContent === element.dataset.placeholderOriginalText) {
                  element.textContent = '';
              }
          });
          element.addEventListener('blur', () => {
              if (element.textContent.trim() === '') {
                  element.textContent = element.dataset.placeholderOriginalText;
              }
              // For tables, actual save is handled by table-wide functions
              // For contacts, it's handled by the specific blur listener in initializeContactsPage
          });
      }
  
      // --- FUNCTION TO INITIALIZE DOCUMENTS TRACKER PAGE ---
      function initializeDocumentsTracker() {
          const addDocBtn = document.getElementById('add-document-row');
          const docsTableBody = document.getElementById('documents-table-body');
  
          function renderDocsTable(docsData = []) {
              docsTableBody.innerHTML = '';
              docsData.forEach((doc) => {
                  const row = docsTableBody.insertRow();
                  row.dataset.docId = doc.id;
                  row.innerHTML = `
                      <td contenteditable="true" class="doc-name editable-cell" data-placeholder="Document Name">${doc.name || ''}</td>
                      <td>
                          <select class="doc-status">
                              <option value="needed" ${doc.status === 'needed' ? 'selected' : ''}>Needed</option>
                              <option value="requested" ${doc.status === 'requested' ? 'selected' : ''}>Requested</option>
                              <option value="received" ${doc.status === 'received' ? 'selected' : ''}>Received</option>
                              <option value="submitted" ${doc.status === 'submitted' ? 'selected' : ''}>Submitted</option>
                              <option value="approved" ${doc.status === 'approved' ? 'selected' : ''}>Approved</option>
                          </select>
                      </td>
                      <td>
                          <select class="doc-responsible">
                              <option value="none" ${doc.responsible === 'none' ? 'selected' : ''}>N/A</option>
                              <option value="steve" ${doc.responsible === 'steve' ? 'selected' : ''}>Steve</option>
                              <option value="nicole" ${doc.responsible === 'nicole' ? 'selected' : ''}>Nicole</option>
                              <option value="both" ${doc.responsible === 'both' ? 'selected' : ''}>Both</option>
                              <option value="agent" ${doc.responsible === 'agent' ? 'selected' : ''}>Agent</option>
                              <option value="attorney" ${doc.responsible === 'attorney' ? 'selected' : ''}>Attorney</option>
                              <option value="lender" ${doc.responsible === 'lender' ? 'selected' : ''}>Lender</option>
                          </select>
                      </td>
                      <td contenteditable="true" class="doc-link editable-cell" data-placeholder="Cloud link...">${doc.link || ''}</td>
                      <td contenteditable="true" class="doc-notes editable-cell" data-placeholder="Details...">${doc.notes || ''}</td>
                      <td><button class="delete-row-btn">Delete</button></td>
                  `;
                  row.querySelectorAll('.editable-cell').forEach(cell => {
                      // Use data-placeholder attribute if present
                      handleContentEditablePlaceholder(cell, cell.dataset.placeholder || '');
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
                              if (docSnap.exists()) {
                                  const currentDocs = (docSnap.data().documents || []).filter(d => d.id !== docIdToDelete);
                                  sharedDataDocRef.set({ documents: currentDocs }, { merge: true })
                                      .then(() => console.log("Document deleted from Firestore."))
                                      .catch(error => console.error("Error deleting document:", error));
                              }
                          });
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
                  .then(() => console.log("Documents updated in Firestore."))
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
                          .then(() => console.log("New document added to Firestore."))
                          .catch(error => console.error("Error adding new document:", error));
                  });
              });
          }
  
          if (sharedDataDocRef) {
              sharedDataDocRef.onSnapshot((doc) => {
                  if (doc.exists) renderDocsTable(doc.data().documents || []);
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
  
          function generateICS(deadline) { /* ... (ICS function remains the same) ... */ 
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
                      <td contenteditable="true" class="deadline-description editable-cell" data-placeholder="Deadline Description">${deadline.description || ''}</td>
                      <td>
                          <select class="deadline-responsible">
                              <option value="none" ${deadline.responsible === 'none' ? 'selected' : ''}>N/A</option>
                              <option value="steve" ${deadline.responsible === 'steve' ? 'selected' : ''}>Steve</option>
                              <option value="nicole" ${deadline.responsible === 'nicole' ? 'selected' : ''}>Nicole</option>
                              <option value="both" ${deadline.responsible === 'both' ? 'selected' : ''}>Both</option>
                              <option value="agent" ${deadline.responsible === 'agent' ? 'selected' : ''}>Agent</option>
                              <option value="attorney" ${deadline.responsible === 'attorney' ? 'selected' : ''}>Attorney</option>
                          </select>
                      </td>
                      <td contenteditable="true" class="deadline-notes editable-cell" data-placeholder="Details...">${deadline.notes || ''}</td>
                      <td><button class="add-to-calendar-btn">To Calendar</button></td>
                      <td><button class="delete-row-btn">Delete</button></td>
                  `;
                  row.querySelectorAll('.editable-cell').forEach(cell => {
                      handleContentEditablePlaceholder(cell, cell.dataset.placeholder || '');
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
                              if (docSnap.exists()) {
                                  const currentDeadlines = (docSnap.data().deadlines || []).filter(d => d.id !== deadlineIdToDelete);
                                  sharedDataDocRef.set({ deadlines: currentDeadlines }, { merge: true })
                                      .then(() => console.log("Deadline deleted from Firestore."))
                                      .catch(error => console.error("Error deleting deadline:", error));
                              }
                          });
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
                  .then(() => console.log("Deadlines updated in Firestore."))
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
                          .then(() => console.log("New deadline added to Firestore."))
                          .catch(error => console.error("Error adding new deadline:", error));
                  });
              });
          }
          
          if (sharedDataDocRef) {
              sharedDataDocRef.onSnapshot((doc) => {
                  if (doc.exists) renderDeadlinesTable(doc.data().deadlines || []);
                  else renderDeadlinesTable([]);
              }, (error) => {
                  console.error("Error listening to deadlines:", error);
                  alert("Error loading deadlines data.");
              });
          }
      } // End of initializeDeadlinesTracker
  
      // --- FUNCTION TO INITIALIZE CONTACTS PAGE ---
      function initializeContactsPage() {
          const contactFields = document.querySelectorAll('#contacts-content .editable[data-ls-key]');
  
          contactFields.forEach(field => {
              const key = field.dataset.lsKey;
              // Use the field's initial textContent as the placeholder for the helper
              handleContentEditablePlaceholder(field, field.textContent.trim()); 
  
              field.addEventListener('blur', () => {
                  if (!sharedDataDocRef) return;
                  const update = {};
                  // Save empty string if content is the placeholder, otherwise save content
                  const valueToSave = field.textContent.trim() === field.dataset.placeholderOriginalText ? '' : field.textContent.trim();
                  update[`contacts.${key}`] = valueToSave;
                  sharedDataDocRef.set(update, { merge: true })
                      .then(() => console.log(`Contact field ${key} saved with value: '${valueToSave}'`))
                      .catch(err => console.error("Error saving contact field:", err));
              });
              field.addEventListener('keypress', (event) => {
                  if (event.key === 'Enter') {
                      event.preventDefault();
                      field.blur();
                  }
              });
          });
          
          if (sharedDataDocRef) {
              sharedDataDocRef.onSnapshot(doc => {
                  if (doc.exists) {
                      const data = doc.data();
                      const firestoreContacts = data.contacts || {};
                      contactFields.forEach(field => {
                          const key = field.dataset.lsKey;
                          // Ensure placeholder text is stored on the element if not already
                          if (!field.dataset.placeholderOriginalText) {
                              field.dataset.placeholderOriginalText = field.textContent.trim();
                          }
                          const savedValue = firestoreContacts[key];
                          if (savedValue !== undefined && savedValue.trim() !== '') {
                              field.textContent = savedValue;
                          } else {
                              field.textContent = field.dataset.placeholderOriginalText; 
                          }
                      });
                  } else {
                      console.log("Contacts data section does not exist in Firestore yet.");
                       contactFields.forEach(field => {
                          if (!field.dataset.placeholderOriginalText) {
                              field.dataset.placeholderOriginalText = field.textContent.trim();
                          }
                          field.textContent = field.dataset.placeholderOriginalText;
                      });
                  }
              }, error => {
                  console.error("Error loading contacts from Firestore:", error);
              });
          }
      } // End of initializeContactsPage
  
  }); // End of DOMContentLoaded