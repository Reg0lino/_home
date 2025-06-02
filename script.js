// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA5CXcX7hM6QH13Q-EXN8mCg8Kyc7H-fQc",
  authDomain: "home-881fe.firebaseapp.com",
  projectId: "home-881fe",
  storageBucket: "home-881fe.firebasestorage.app",
  messagingSenderId: "420018374054",
  appId: "1:420018374054:web:b90c0376a0c301ef787b67",
  measurementId: "G-KEGM94MV70"
};


// Declare these variables ONCE using let
let app;
let auth;
let db;
let currentUser = null;
let sharedDataDocRef;
const SHARED_DATA_COLLECTION = 'checklistsSharedData';
const SHARED_DATA_DOC_ID = 'steveNicoleHomeQuest';

try {
    app = firebase.initializeApp(firebaseConfig); // Use compat global
    auth = firebase.auth();
    db = firebase.firestore();
    // If you want analytics with compat: firebase.analytics();
    console.log("Firebase initialized successfully!");
} catch (error) {
    console.error("Error initializing Firebase:", error);
    alert("Critical error: Application cannot connect to backend services. Please try again later or contact support.");
}

  // --- DOMContentLoaded ---
  document.addEventListener('DOMContentLoaded', () => {
      // --- THEME TOGGLE (Remains localStorage as it's browser-specific) ---
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
                  currentUser = user; // Store the user object
                  console.log("User signed in:", currentUser.uid, "Page:", window.location.pathname);
                  sharedDataDocRef = db.collection(SHARED_DATA_COLLECTION).doc(SHARED_DATA_DOC_ID);
                  
                  // Initialize data loading based on the current page
                  if (document.getElementById('checklist-app')) {
                      initializeChecklistApp();
                  } else if (document.getElementById('documents-tracker')) {
                      initializeDocumentsTracker();
                  } else if (document.getElementById('deadlines-tracker')) {
                      initializeDeadlinesTracker();
                  } else if (document.getElementById('contacts-content')) {
                      initializeContactsPage();
                  }
                  // Guide page doesn't need dynamic data loading other than theme
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
                      // onAuthStateChanged will handle redirect
                  } catch (error) {
                      console.error("Logout Error:", error);
                      alert("Error signing out: " + error.message);
                  }
              });
          }
      } else {
          console.error("Firebase auth is not initialized. App will not function correctly.");
          if (!window.location.pathname.endsWith('index.html')) {
              // Force redirect if auth isn't even available on protected pages
              // window.location.href = 'index.html';
          }
      }
  
      // --- FUNCTION TO INITIALIZE CHECKLIST APP (HOME PAGE) ---
      function initializeChecklistApp() {
          const checklistItems = document.querySelectorAll('#checklist-app li[data-item-id]');
          const dailyPrioritiesTextarea = document.getElementById('daily-priorities');
          const filterAssigneeSelect = document.getElementById('filter-assignee');
          const filterStatusSelect = document.getElementById('filter-status');
          const resetFiltersBtn = document.getElementById('reset-filters');
  
          // Listen for real-time updates from Firestore for checklist data
          if (sharedDataDocRef) {
              sharedDataDocRef.onSnapshot((doc) => {
                  if (doc.exists) {
                      const data = doc.data();
                      console.log("Firestore data received:", data);
  
                      // Load checklist items
                      const firestoreChecklistItems = data.checklistItems || {};
                      checklistItems.forEach(item => {
                          const itemId = item.dataset.itemId;
                          const itemData = firestoreChecklistItems[itemId] || { checked: false, notes: '', assignee: 'none' };
                          
                          const checkbox = item.querySelector('input[type="checkbox"]');
                          const notesTextarea = item.querySelector('.notes-area textarea');
                          const assigneeSelect = item.querySelector('.assignee-select');
  
                          if (checkbox) checkbox.checked = itemData.checked;
                          if (notesTextarea) notesTextarea.value = itemData.notes;
                          if (assigneeSelect) assigneeSelect.value = itemData.assignee;
                      });
  
                      // Load daily priorities
                      if (dailyPrioritiesTextarea) {
                          dailyPrioritiesTextarea.value = data.dailyPriorities || '';
                      }
                  } else {
                      console.log("No shared data document found! Initializing with empty structure.");
                      // Optionally initialize the document if it doesn't exist
                      // sharedDataDocRef.set({ checklistItems: {}, dailyPriorities: "", documents: [], deadlines: [], contacts: {} });
                  }
                  updateAllProgressAndDashboard(); // Update UI after loading data
                  applyFilters();
              }, (error) => {
                  console.error("Error listening to Firestore document:", error);
                  alert("Error loading checklist data. Please try refreshing the page.");
              });
          }
  
  
          function saveChecklistItemData(itemId, property, value) {
              if (!sharedDataDocRef) return;
              const update = {};
              update[`checklistItems.${itemId}.${property}`] = value; // Using dot notation for nested fields
              sharedDataDocRef.set(update, { merge: true })
                  .then(() => console.log(`Checklist item ${itemId} property ${property} saved.`))
                  .catch(error => console.error("Error saving checklist item:", error));
              // Real-time listener will update UI, but we can also call progress/dashboard updates immediately
              // updateAllProgressAndDashboard(); // This will be handled by onSnapshot
          }
  
          checklistItems.forEach(item => {
              const itemId = item.dataset.itemId;
              const checkbox = item.querySelector('input[type="checkbox"]');
              const notesTextarea = item.querySelector('.notes-area textarea');
              const assigneeSelect = item.querySelector('.assignee-select');
  
              if (checkbox) {
                  checkbox.addEventListener('change', function() {
                      saveChecklistItemData(itemId, 'checked', this.checked);
                  });
              }
              if (notesTextarea) {
                  notesTextarea.addEventListener('blur', function() { // Save on blur
                      saveChecklistItemData(itemId, 'notes', this.value);
                  });
              }
              if (assigneeSelect) {
                  assigneeSelect.addEventListener('change', function() {
                      saveChecklistItemData(itemId, 'assignee', this.value);
                  });
              }
  
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
  
          // --- Progress Bar, Dashboard, and Filter Functions (mostly same logic, ensure they use current DOM state) ---
          function updatePhaseProgress(phaseElement) {
              const phaseId = phaseElement.id;
              // Filtered items are display:none, so querySelectorAll will not pick them up if not careful.
              // We need to iterate through all LIs and check their display style if filters are active.
              // Or, simpler: calculate progress based on ALL items and filters only affect visibility.
              const allCheckboxesThisPhase = phaseElement.querySelectorAll('ul.task-list input[type="checkbox"]');
              const allCheckedThisPhase = phaseElement.querySelectorAll('ul.task-list input[type="checkbox"]:checked');
  
              const totalTasks = allCheckboxesThisPhase.length;
              const completedTasks = allCheckedThisPhase.length;
  
              const progressTextEl = document.getElementById(`${phaseId}-progress-text`);
              const progressBarFillEl = document.getElementById(`${phaseId}-progress-bar`);
  
              if (progressTextEl) progressTextEl.textContent = `${completedTasks}/${totalTasks}`;
              if (progressBarFillEl) {
                  const percentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
                  progressBarFillEl.style.width = `${percentage}%`;
              }
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
                  overallProgressTextEl.textContent = `${Math.round(percentage)}%`;
              }
          }
          
          function populateQuickViewDashboard() {
              const steveTasksList = document.getElementById('steve-next-tasks');
              const nicoleTasksList = document.getElementById('nicole-next-tasks');
              if (!steveTasksList || !nicoleTasksList) return;
  
              steveTasksList.innerHTML = '';
              nicoleTasksList.innerHTML = '';
              let steveTaskCount = 0;
              let nicoleTaskCount = 0;
  
              checklistItems.forEach(item => { // Iterate over all items from DOM
                  const checkbox = item.querySelector('input[type="checkbox"]');
                  const assignee = item.querySelector('.assignee-select').value;
                  const label = item.querySelector('label').textContent;
  
                  if (checkbox && !checkbox.checked) { // Only show incomplete tasks
                      if (assignee === 'steve' && steveTaskCount < 3) {
                          const li = document.createElement('li');
                          li.textContent = label;
                          steveTasksList.appendChild(li);
                          steveTaskCount++;
                      } else if (assignee === 'nicole' && nicoleTaskCount < 3) {
                          const li = document.createElement('li');
                          li.textContent = label;
                          nicoleTasksList.appendChild(li);
                          nicoleTaskCount++;
                      }
                  }
              });
  
              if (steveTaskCount === 0) steveTasksList.innerHTML = '<li>No pending tasks for Steve.</li>';
              if (nicoleTaskCount === 0) nicoleTasksList.innerHTML = '<li>No pending tasks for Nicole.</li>';
          }
  
          function applyFilters() {
              if (!filterAssigneeSelect || !filterStatusSelect) return;
              const selectedAssignee = filterAssigneeSelect.value;
              const selectedStatus = filterStatusSelect.value;
  
              checklistItems.forEach(item => {
                  const assignee = item.querySelector('.assignee-select').value;
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
          // Initial call to applyFilters is done within the onSnapshot after data is loaded
      } // End of initializeChecklistApp
  
      // --- FUNCTION TO INITIALIZE DOCUMENTS TRACKER PAGE ---
      function initializeDocumentsTracker() {
          const addDocBtn = document.getElementById('add-document-row');
          const docsTableBody = document.getElementById('documents-table-body');
  
          function renderDocsTable(docsData = []) {
              docsTableBody.innerHTML = '';
              docsData.forEach((doc) => { // No need to sort here unless desired
                  const row = docsTableBody.insertRow();
                  row.dataset.docId = doc.id; // Use Firestore ID
  
                  row.innerHTML = `
                      <td contenteditable="true" class="doc-name">${doc.name || ''}</td>
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
                      <td contenteditable="true" class="doc-link" placeholder="Cloud link...">${doc.link || ''}</td>
                      <td contenteditable="true" class="doc-notes" placeholder="Details...">${doc.notes || ''}</td>
                      <td><button class="delete-row-btn">Delete</button></td>
                  `;
              });
              addDocEventListeners();
          }
  
          function addDocEventListeners() {
              docsTableBody.querySelectorAll('tr').forEach(row => {
                  row.querySelectorAll('td[contenteditable="true"], select').forEach(cell => {
                      cell.addEventListener('change', () => updateDocsInFirestore()); // Prefer change for selects, blur for contenteditable
                      cell.addEventListener('blur', () => updateDocsInFirestore());
                  });
                  row.querySelector('.delete-row-btn').addEventListener('click', (e) => {
                      const docIdToDelete = e.target.closest('tr').dataset.docId;
                      const currentDocs = getCurrentDocsFromTable().filter(d => d.id !== docIdToDelete);
                      if (sharedDataDocRef) {
                          sharedDataDocRef.set({ documents: currentDocs }, { merge: true })
                              .then(() => console.log("Document deleted from Firestore."))
                              .catch(error => console.error("Error deleting document:", error));
                          // onSnapshot will re-render
                      }
                  });
              });
          }
          
          function getCurrentDocsFromTable() {
              const docs = [];
              docsTableBody.querySelectorAll('tr').forEach(row => {
                  docs.push({
                      id: row.dataset.docId,
                      name: row.querySelector('.doc-name').textContent,
                      status: row.querySelector('.doc-status').value,
                      responsible: row.querySelector('.doc-responsible').value,
                      link: row.querySelector('.doc-link').textContent,
                      notes: row.querySelector('.doc-notes').textContent,
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
                  const newDocId = `doc_${Date.now()}`; // Simple unique ID
                  const newDoc = { id: newDocId, name: 'New Document', status: 'needed', responsible: 'none', link: '', notes: '' };
                  
                  // Get current docs, add new, then save all
                  sharedDataDocRef.get().then(doc => {
                      const currentDocs = doc.exists && doc.data().documents ? doc.data().documents : [];
                      currentDocs.push(newDoc);
                      sharedDataDocRef.set({ documents: currentDocs }, { merge: true })
                          .then(() => console.log("New document added to Firestore."))
                          .catch(error => console.error("Error adding new document:", error));
                      // onSnapshot will re-render
                  });
              });
          }
  
          // Initial load and listen for real-time updates for documents
          if (sharedDataDocRef) {
              sharedDataDocRef.onSnapshot((doc) => {
                  if (doc.exists) {
                      const data = doc.data();
                      renderDocsTable(data.documents || []);
                  } else {
                      renderDocsTable([]); // Render empty if no doc
                  }
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
  
          function generateICS(deadline) { // Same ICS generation function as before
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
              const sortedDeadlines = deadlinesData.sort((a,b) => new Date(a.date) - new Date(b.date));
  
              sortedDeadlines.forEach((deadline) => {
                  const row = deadlinesTableBody.insertRow();
                  row.dataset.deadlineId = deadline.id;
                  row.innerHTML = `
                      <td><input type="date" class="deadline-date" value="${deadline.date || ''}"></td>
                      <td contenteditable="true" class="deadline-description">${deadline.description || ''}</td>
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
                      <td contenteditable="true" class="deadline-notes" placeholder="Details...">${deadline.notes || ''}</td>
                      <td><button class="add-to-calendar-btn">To Calendar</button></td>
                      <td><button class="delete-row-btn">Delete</button></td>
                  `;
              });
              addDeadlineEventListeners();
          }
  
          function addDeadlineEventListeners() {
              deadlinesTableBody.querySelectorAll('tr').forEach(row => {
                  row.querySelectorAll('td[contenteditable="true"], input[type="date"], select').forEach(cell => {
                      cell.addEventListener('change', () => updateDeadlinesInFirestore());
                      cell.addEventListener('blur', () => updateDeadlinesInFirestore());
                  });
                  row.querySelector('.delete-row-btn').addEventListener('click', (e) => {
                      const deadlineIdToDelete = e.target.closest('tr').dataset.deadlineId;
                      const currentDeadlines = getCurrentDeadlinesFromTable().filter(d => d.id !== deadlineIdToDelete);
                       if (sharedDataDocRef) {
                          sharedDataDocRef.set({ deadlines: currentDeadlines }, { merge: true })
                              .then(() => console.log("Deadline deleted from Firestore."))
                              .catch(error => console.error("Error deleting deadline:", error));
                      }
                  });
                  row.querySelector('.add-to-calendar-btn').addEventListener('click', (e) => {
                      const deadlineId = e.target.closest('tr').dataset.deadlineId;
                      const currentDeadlines = getCurrentDeadlinesFromTable(); // Get current state from table
                      const deadline = currentDeadlines.find(d => d.id === deadlineId);
                      if (deadline) generateICS(deadline);
                  });
              });
          }
          
          function getCurrentDeadlinesFromTable() {
              const deadlines = [];
              deadlinesTableBody.querySelectorAll('tr').forEach(row => {
                  deadlines.push({
                      id: row.dataset.deadlineId,
                      date: row.querySelector('.deadline-date').value,
                      description: row.querySelector('.deadline-description').textContent,
                      responsible: row.querySelector('.deadline-responsible').value,
                      notes: row.querySelector('.deadline-notes').textContent,
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
                  const newDeadline = { id: newDeadlineId, date: '', description: 'New Deadline', responsible: 'none', notes: '' };
                  
                  sharedDataDocRef.get().then(doc => {
                      const currentDeadlines = doc.exists && doc.data().deadlines ? doc.data().deadlines : [];
                      currentDeadlines.push(newDeadline);
                      sharedDataDocRef.set({ deadlines: currentDeadlines }, { merge: true })
                          .then(() => console.log("New deadline added to Firestore."))
                          .catch(error => console.error("Error adding new deadline:", error));
                  });
              });
          }
          
          // Initial load and listen for real-time updates for deadlines
          if (sharedDataDocRef) {
              sharedDataDocRef.onSnapshot((doc) => {
                  if (doc.exists) {
                      const data = doc.data();
                      renderDeadlinesTable(data.deadlines || []);
                  } else {
                      renderDeadlinesTable([]);
                  }
              }, (error) => {
                  console.error("Error listening to deadlines:", error);
                  alert("Error loading deadlines data.");
              });
          }
      } // End of initializeDeadlinesTracker
  
      // --- FUNCTION TO INITIALIZE CONTACTS PAGE ---
      function initializeContactsPage() {
          const contactFields = document.querySelectorAll('#contacts-content .editable[data-ls-key]'); // Using data-ls-key to identify them
  
          // Load contacts from Firestore
          if (sharedDataDocRef) {
              sharedDataDocRef.onSnapshot(doc => {
                  if (doc.exists) {
                      const data = doc.data();
                      const firestoreContacts = data.contacts || {};
                      contactFields.forEach(field => {
                          const key = field.dataset.lsKey; // This was the old localStorage key, now use it as field name
                          if (firestoreContacts[key] !== undefined) {
                              field.textContent = firestoreContacts[key];
                          } else {
                              // field.textContent = field.getAttribute('placeholder') || "Enter Details"; // Or keep existing placeholder
                          }
                      });
                  } else {
                      console.log("Contacts document section does not exist yet.");
                  }
              }, error => {
                  console.error("Error loading contacts:", error);
              });
          }
  
          // Save contacts to Firestore
          contactFields.forEach(field => {
              const key = field.dataset.lsKey;
              field.addEventListener('blur', () => {
                  if (!sharedDataDocRef) return;
                  const update = {};
                  update[`contacts.${key}`] = field.textContent;
                  sharedDataDocRef.set(update, { merge: true })
                      .then(() => console.log(`Contact field ${key} saved.`))
                      .catch(err => console.error("Error saving contact field:", err));
              });
               field.addEventListener('keypress', (event) => { // Also save on Enter
                  if (event.key === 'Enter') {
                      event.preventDefault();
                      field.blur();
                  }
              });
          });
      } // End of initializeContactsPage
  
  }); // End of DOMContentLoaded