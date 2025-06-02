document.addEventListener('DOMContentLoaded', () => {
    // --- AUTHENTICATION (Fallback - primary check is inline HTML script) ---
    if (sessionStorage.getItem('isAuthenticated') !== 'true' &&
        !window.location.pathname.endsWith('index.html') &&
        window.location.pathname !== '/' && // Handles root path that might serve index.html
        !window.location.pathname.endsWith('/_home/') && // Handles if serving from subfolder
        !window.location.pathname.endsWith('/_home/index.html')
    ) {
        // console.log("Not authenticated, redirecting from script.js. Current path:", window.location.pathname);
        // window.location.href = 'index.html'; // Let inline script handle redirect
        // return;
    }

    // --- THEME TOGGLE ---
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

    // --- COMMON FUNCTIONALITY ACROSS PAGES (like editable fields for contacts) ---
    const editableFields = document.querySelectorAll('.editable[data-ls-key]');
    editableFields.forEach(field => {
        const lsKey = field.dataset.lsKey;
        if (lsKey) {
            const savedValue = localStorage.getItem(lsKey);
            if (savedValue) field.textContent = savedValue;

            field.addEventListener('blur', () => localStorage.setItem(lsKey, field.textContent));
            field.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    field.blur();
                }
            });
        }
    });


    // --- HOME PAGE SPECIFIC FUNCTIONALITY ---
    if (document.getElementById('checklist-app')) {
        const checklistItems = document.querySelectorAll('#checklist-app li[data-item-id]');
        const allCheckboxes = document.querySelectorAll('#checklist-app input[type="checkbox"]');
        const dailyPrioritiesTextarea = document.getElementById('daily-priorities');

        // Filter elements
        const filterAssigneeSelect = document.getElementById('filter-assignee');
        const filterStatusSelect = document.getElementById('filter-status');
        const resetFiltersBtn = document.getElementById('reset-filters');

        function loadChecklistData() {
            checklistItems.forEach(item => {
                const itemId = item.dataset.itemId;
                const checkbox = item.querySelector('input[type="checkbox"]');
                const notesTextarea = item.querySelector('.notes-area textarea');
                const assigneeSelect = item.querySelector('.assignee-select');

                if (checkbox) checkbox.checked = localStorage.getItem(`cb_${itemId}`) === 'true';
                if (notesTextarea) notesTextarea.value = localStorage.getItem(`notes_${itemId}`) || '';
                if (assigneeSelect) assigneeSelect.value = localStorage.getItem(`assignee_${itemId}`) || 'none';
            });
        }

        function saveChecklistData(element) {
            const item = element.closest('li[data-item-id]');
            if (!item) return;
            const itemId = item.dataset.itemId;

            if (element.type === 'checkbox') {
                localStorage.setItem(`cb_${itemId}`, element.checked);
            } else if (element.tagName === 'TEXTAREA') {
                localStorage.setItem(`notes_${itemId}`, element.value);
            } else if (element.classList.contains('assignee-select')) {
                localStorage.setItem(`assignee_${itemId}`, element.value);
            }
            updateAllProgressAndDashboard();
            applyFilters(); // Re-apply filters if an item's property changes
        }

        checklistItems.forEach(item => {
            item.querySelectorAll('input[type="checkbox"], .assignee-select').forEach(el => {
                el.addEventListener('change', () => saveChecklistData(el));
            });
            item.querySelectorAll('.notes-area textarea').forEach(el => {
                el.addEventListener('blur', () => saveChecklistData(el));
            });
            const notesBtn = item.querySelector('.notes-btn');
            const notesArea = item.querySelector('.notes-area');
            if (notesBtn && notesArea) {
                notesBtn.addEventListener('click', () => {
                    notesArea.style.display = notesArea.style.display === 'none' ? 'block' : 'none';
                    if (notesArea.style.display === 'block') notesArea.querySelector('textarea').focus();
                });
            }
        });

        // Daily/Weekly Priorities
        if (dailyPrioritiesTextarea) {
            dailyPrioritiesTextarea.value = localStorage.getItem('dailyPriorities') || '';
            dailyPrioritiesTextarea.addEventListener('blur', () => {
                localStorage.setItem('dailyPriorities', dailyPrioritiesTextarea.value);
            });
        }

        function updatePhaseProgress(phaseElement) {
            const phaseId = phaseElement.id;
            const checkboxesInPhase = phaseElement.querySelectorAll('ul.task-list li:not(.filtered-out) input[type="checkbox"]');
            const checkedInPhase = phaseElement.querySelectorAll('ul.task-list li:not(.filtered-out) input[type="checkbox"]:checked');
            
            // For display purposes, we might want to show progress based on *all* items in the phase,
            // not just visible ones, or make this distinction clear.
            // For now, let's base it on ALL items in the phase for the progress bar.
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
            // Overall progress should also consider ALL items, not just filtered ones.
            const totalTasksOverall = allCheckboxes.length;
            const completedTasksOverall = document.querySelectorAll('#checklist-app ul.task-list input[type="checkbox"]:checked').length;

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
            steveTasksList.innerHTML = ''; // Clear previous
            nicoleTasksList.innerHTML = ''; // Clear previous

            let steveTaskCount = 0;
            let nicoleTaskCount = 0;

            checklistItems.forEach(item => {
                const checkbox = item.querySelector('input[type="checkbox"]');
                const assignee = item.querySelector('.assignee-select').value;
                const label = item.querySelector('label').textContent;

                if (checkbox && !checkbox.checked) {
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
            const selectedAssignee = filterAssigneeSelect.value;
            const selectedStatus = filterStatusSelect.value;

            checklistItems.forEach(item => {
                const assignee = item.querySelector('.assignee-select').value;
                const checkbox = item.querySelector('input[type="checkbox"]');
                let showItem = true;

                // Assignee filter
                if (selectedAssignee !== 'all' && assignee !== selectedAssignee) {
                    showItem = false;
                }

                // Status filter
                if (selectedStatus === 'complete' && !checkbox.checked) {
                    showItem = false;
                } else if (selectedStatus === 'incomplete' && checkbox.checked) {
                    showItem = false;
                }

                item.style.display = showItem ? '' : 'none'; // More direct than class for simple hide/show
                // item.classList.toggle('filtered-out', !showItem); // Alternative using a class
            });
            // Note: Phase progress bars will reflect visible items if logic is changed,
            // or all items if logic remains as is. Current logic bases on ALL items in phase.
        }

        if (filterAssigneeSelect && filterStatusSelect) {
            filterAssigneeSelect.addEventListener('change', applyFilters);
            filterStatusSelect.addEventListener('change', applyFilters);
        }
        if (resetFiltersBtn) {
            resetFiltersBtn.addEventListener('click', () => {
                filterAssigneeSelect.value = 'all';
                filterStatusSelect.value = 'all';
                applyFilters();
            });
        }


        function updateAllProgressAndDashboard() {
            document.querySelectorAll('.checklist-phase').forEach(updatePhaseProgress);
            updateOverallProgress();
            populateQuickViewDashboard();
        }

        loadChecklistData();
        updateAllProgressAndDashboard(); // Initial population
        applyFilters(); // Apply any saved/default filters on load
    }


    // --- DOCUMENTS TRACKER PAGE SPECIFIC FUNCTIONALITY ---
    if (document.getElementById('documents-tracker')) {
        const addDocBtn = document.getElementById('add-document-row');
        const docsTableBody = document.getElementById('documents-table-body');
        const DOCS_LS_KEY = 'homeDocsTracker';

        function getDocsFromStorage() {
            return JSON.parse(localStorage.getItem(DOCS_LS_KEY)) || [];
        }

        function saveDocsToStorage(docs) {
            localStorage.setItem(DOCS_LS_KEY, JSON.stringify(docs));
        }

        function renderDocsTable() {
            docsTableBody.innerHTML = '';
            const docs = getDocsFromStorage();
            docs.forEach((doc, index) => {
                const row = docsTableBody.insertRow();
                row.dataset.docId = doc.id || `doc_${Date.now()}_${index}`; // Ensure ID

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
                    cell.addEventListener('input', updateDocStorage); // 'input' for contenteditable and select
                    cell.addEventListener('change', updateDocStorage); // Redundant for select but harmless
                    cell.addEventListener('blur', updateDocStorage); // For contenteditable
                });
                row.querySelector('.delete-row-btn').addEventListener('click', (e) => {
                    const docId = e.target.closest('tr').dataset.docId;
                    let docs = getDocsFromStorage();
                    docs = docs.filter(d => d.id !== docId);
                    saveDocsToStorage(docs);
                    renderDocsTable();
                });
            });
        }

        function updateDocStorage(event) {
            const docs = [];
            docsTableBody.querySelectorAll('tr').forEach(row => {
                const docId = row.dataset.docId;
                docs.push({
                    id: docId,
                    name: row.querySelector('.doc-name').textContent,
                    status: row.querySelector('.doc-status').value,
                    responsible: row.querySelector('.doc-responsible').value,
                    link: row.querySelector('.doc-link').textContent,
                    notes: row.querySelector('.doc-notes').textContent,
                });
            });
            saveDocsToStorage(docs);
        }

        if (addDocBtn) {
            addDocBtn.addEventListener('click', () => {
                let docs = getDocsFromStorage();
                docs.push({ id: `doc_${Date.now()}`, name: 'New Document', status: 'needed', responsible: 'none', link: '', notes: '' });
                saveDocsToStorage(docs);
                renderDocsTable();
            });
        }
        renderDocsTable();
    }

    // --- CRITICAL DEADLINES PAGE SPECIFIC FUNCTIONALITY ---
    if (document.getElementById('deadlines-tracker')) {
        const addDeadlineBtn = document.getElementById('add-deadline-row');
        const deadlinesTableBody = document.getElementById('deadlines-table-body');
        const DEADLINES_LS_KEY = 'homeDeadlinesTracker';

        function getDeadlinesFromStorage() {
            return JSON.parse(localStorage.getItem(DEADLINES_LS_KEY)) || [];
        }

        function saveDeadlinesToStorage(deadlines) {
            localStorage.setItem(DEADLINES_LS_KEY, JSON.stringify(deadlines));
        }

        function generateICS(deadline) {
            const startDate = deadline.date ? new Date(deadline.date + 'T09:00:00') : new Date(); // Default to 9 AM on the day
            if (isNaN(startDate)) {
                alert("Invalid date for calendar event.");
                return;
            }
            const endDate = new Date(startDate);
            endDate.setHours(startDate.getHours() + 1); // 1-hour duration

            const pad = (num) => (num < 10 ? '0' : '') + num;
            const formatDateICS = (date) => {
                return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
            };

            const icsContent = [
                'BEGIN:VCALENDAR',
                'VERSION:2.0',
                'PRODID:-//HomeBuyingChecklist//EN',
                'BEGIN:VEVENT',
                `UID:${deadline.id}@homebuyingchecklist.com`,
                `DTSTAMP:${formatDateICS(new Date())}`,
                `DTSTART:${formatDateICS(startDate)}`,
                `DTEND:${formatDateICS(endDate)}`,
                `SUMMARY:${deadline.description || 'Home Buying Deadline'}`,
                `DESCRIPTION:${deadline.notes || ''}`,
                'END:VEVENT',
                'END:VCALENDAR'
            ].join('\r\n');

            const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${(deadline.description || 'Deadline').replace(/[^a-z0-9]/gi, '_')}.ics`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }


        function renderDeadlinesTable() {
            deadlinesTableBody.innerHTML = '';
            const deadlines = getDeadlinesFromStorage().sort((a, b) => new Date(a.date) - new Date(b.date)); // Sort by date
            deadlines.forEach((deadline, index) => {
                const row = deadlinesTableBody.insertRow();
                row.dataset.deadlineId = deadline.id || `deadline_${Date.now()}_${index}`;

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
                    cell.addEventListener('input', updateDeadlineStorage);
                    cell.addEventListener('change', updateDeadlineStorage);
                    cell.addEventListener('blur', updateDeadlineStorage);
                });
                row.querySelector('.delete-row-btn').addEventListener('click', (e) => {
                    const deadlineId = e.target.closest('tr').dataset.deadlineId;
                    let deadlines = getDeadlinesFromStorage();
                    deadlines = deadlines.filter(d => d.id !== deadlineId);
                    saveDeadlinesToStorage(deadlines);
                    renderDeadlinesTable();
                });
                row.querySelector('.add-to-calendar-btn').addEventListener('click', (e) => {
                    const deadlineId = e.target.closest('tr').dataset.deadlineId;
                    const deadlines = getDeadlinesFromStorage();
                    const deadline = deadlines.find(d => d.id === deadlineId);
                    if (deadline) generateICS(deadline);
                });
            });
        }

        function updateDeadlineStorage() {
            const deadlines = [];
            deadlinesTableBody.querySelectorAll('tr').forEach(row => {
                const deadlineId = row.dataset.deadlineId;
                deadlines.push({
                    id: deadlineId,
                    date: row.querySelector('.deadline-date').value,
                    description: row.querySelector('.deadline-description').textContent,
                    responsible: row.querySelector('.deadline-responsible').value,
                    notes: row.querySelector('.deadline-notes').textContent,
                });
            });
            saveDeadlinesToStorage(deadlines);
            // No need to re-render on every input, but maybe on blur from editable or change of select/date
            // For simplicity, let's keep it this way. Could optimize later if performance is an issue.
        }

        if (addDeadlineBtn) {
            addDeadlineBtn.addEventListener('click', () => {
                let deadlines = getDeadlinesFromStorage();
                deadlines.push({ id: `deadline_${Date.now()}`, date: '', description: 'New Deadline', responsible: 'none', notes: '' });
                saveDeadlinesToStorage(deadlines);
                renderDeadlinesTable();
            });
        }
        renderDeadlinesTable();
    }
});