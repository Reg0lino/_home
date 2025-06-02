document.addEventListener('DOMContentLoaded', () => {
    // --- AUTHENTICATION (redundant if script at top of HTML works, but good fallback) ---
    if (sessionStorage.getItem('isAuthenticated') !== 'true' && !window.location.pathname.endsWith('index.html')) {
        // window.location.href = 'index.html'; // Already handled by inline script in HTML head
        // return; // Stop further execution if not authenticated
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
    applyTheme(); // Apply theme on initial load

    if (themeToggleBtn) { // Check if button exists (it won't on index.html if using separate script)
        themeToggleBtn.addEventListener('click', () => {
            body.classList.toggle('dark-mode');
            if (body.classList.contains('dark-mode')) {
                localStorage.setItem('theme', 'dark-mode');
            } else {
                localStorage.setItem('theme', 'light-mode');
            }
        });
    }


    // --- CHECKLIST ITEM FUNCTIONALITY (Only run if on home.html) ---
    if (document.getElementById('checklist-app')) {
        const checklistItems = document.querySelectorAll('#checklist-app li[data-item-id]');
        const allCheckboxes = document.querySelectorAll('#checklist-app input[type="checkbox"]');

        // Load saved states for all items
        function loadAllItemData() {
            checklistItems.forEach(item => {
                const itemId = item.dataset.itemId;
                const checkbox = item.querySelector('input[type="checkbox"]');
                const notesTextarea = item.querySelector('.notes-area textarea');
                const assigneeSelect = item.querySelector('.assignee-select');

                // Load checkbox state
                if (checkbox) {
                    const cbSavedState = localStorage.getItem(`cb_${itemId}`);
                    if (cbSavedState === 'true') checkbox.checked = true;
                    else if (cbSavedState === 'false') checkbox.checked = false;
                }

                // Load notes
                if (notesTextarea) {
                    const notesSaved = localStorage.getItem(`notes_${itemId}`);
                    if (notesSaved) notesTextarea.value = notesSaved;
                }

                // Load assignee
                if (assigneeSelect) {
                    const assigneeSaved = localStorage.getItem(`assignee_${itemId}`);
                    if (assigneeSaved) assigneeSelect.value = assigneeSaved;
                }
            });
            updateAllProgress(); // Initial progress update
        }

        // Add event listeners
        checklistItems.forEach(item => {
            const itemId = item.dataset.itemId;
            const checkbox = item.querySelector('input[type="checkbox"]');
            const notesBtn = item.querySelector('.notes-btn');
            const notesArea = item.querySelector('.notes-area');
            const notesTextarea = notesArea ? notesArea.querySelector('textarea') : null;
            const assigneeSelect = item.querySelector('.assignee-select');

            // Checkbox change
            if (checkbox) {
                checkbox.addEventListener('change', function() {
                    localStorage.setItem(`cb_${itemId}`, this.checked);
                    updateAllProgress();
                });
            }

            // Notes button click
            if (notesBtn && notesArea) {
                notesBtn.addEventListener('click', () => {
                    notesArea.style.display = notesArea.style.display === 'none' ? 'block' : 'none';
                    if (notesArea.style.display === 'block' && notesTextarea) {
                        notesTextarea.focus();
                    }
                });
            }

            // Notes textarea save on blur
            if (notesTextarea) {
                notesTextarea.addEventListener('blur', function() {
                    localStorage.setItem(`notes_${itemId}`, this.value);
                });
            }

            // Assignee select change
            if (assigneeSelect) {
                assigneeSelect.addEventListener('change', function() {
                    localStorage.setItem(`assignee_${itemId}`, this.value);
                });
            }
        });


        // --- PROGRESS BAR FUNCTIONALITY ---
        function updatePhaseProgress(phaseElement) {
            const phaseId = phaseElement.id;
            const checkboxesInPhase = phaseElement.querySelectorAll('input[type="checkbox"]');
            const checkedInPhase = phaseElement.querySelectorAll('input[type="checkbox"]:checked');

            const totalTasks = checkboxesInPhase.length;
            const completedTasks = checkedInPhase.length;

            const progressTextEl = document.getElementById(`${phaseId}-progress-text`);
            const progressBarFillEl = document.getElementById(`${phaseId}-progress-bar`);

            if (progressTextEl) {
                progressTextEl.textContent = `${completedTasks}/${totalTasks}`;
            }
            if (progressBarFillEl) {
                const percentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
                progressBarFillEl.style.width = `${percentage}%`;
            }
        }

        function updateOverallProgress() {
            const totalTasksOverall = allCheckboxes.length;
            const completedTasksOverall = document.querySelectorAll('#checklist-app input[type="checkbox"]:checked').length;

            const overallProgressTextEl = document.getElementById('overall-progress-text');
            const overallProgressBarFillEl = document.getElementById('overall-progress-bar');

            if (overallProgressTextEl && overallProgressBarFillEl) {
                const percentage = totalTasksOverall > 0 ? (completedTasksOverall / totalTasksOverall) * 100 : 0;
                overallProgressBarFillEl.style.width = `${percentage}%`;
                overallProgressTextEl.textContent = `${Math.round(percentage)}% Complete`;
            }
        }

        function updateAllProgress() {
            const phases = document.querySelectorAll('.checklist-phase');
            phases.forEach(phase => {
                updatePhaseProgress(phase);
            });
            updateOverallProgress();
        }

        // Initial load of all data and progress
        loadAllItemData();

    } // End of if (document.getElementById('checklist-app'))

    // --- CONTACTS PAGE EDITABLE FIELDS (Only run if on contacts.html) ---
    if (document.getElementById('contacts-content')) {
        const editableFields = document.querySelectorAll('#contacts-content .editable');
        editableFields.forEach(field => {
            // Load saved content
            const savedValue = localStorage.getItem(field.id); // Assuming IDs are unique
            if (savedValue) {
                field.textContent = savedValue;
            }

            // Save content on blur (when focus is lost)
            field.addEventListener('blur', () => {
                localStorage.setItem(field.id, field.textContent);
            });
             // Save content on pressing Enter
            field.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault(); // Prevent new line in contenteditable
                    field.blur(); // Trigger blur to save
                }
            });
        });
    } // End of if (document.getElementById('contacts-content'))

});