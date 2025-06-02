document.addEventListener('DOMContentLoaded', () => {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');

    // Load saved checkbox states
    checkboxes.forEach(checkbox => {
        const savedState = localStorage.getItem(checkbox.id);
        if (savedState === 'true') {
            checkbox.checked = true;
        } else if (savedState === 'false') {
            checkbox.checked = false;
        }
        // Apply visual style if initially checked from localStorage
        if (checkbox.checked) {
            checkbox.parentElement.classList.add('completed');
        }
    });

    // Add event listener to save state when a checkbox is clicked
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            localStorage.setItem(this.id, this.checked);
            if (this.checked) {
                this.parentElement.classList.add('completed'); // Optional: for more advanced styling
            } else {
                this.parentElement.classList.remove('completed'); // Optional
            }
        });
    });
});

// You might need to add a CSS rule for .completed if you use the classList toggle above
// For example, in style.css:
// li.completed {
//    background-color: #e0ffe0; /* Light green background for completed items */
// }
// The current CSS already handles the line-through for the label effectively.