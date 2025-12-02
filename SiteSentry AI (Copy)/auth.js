// This file connects to your Node.js (server.js) backend

// --- Get elements from the HTML ---
const signupForm = document.getElementById('signup-form');
const loginForm = document.getElementById('login-form');
const messageArea = document.getElementById('message-area');

// --- 1. SIGNUP FORM ---
if (signupForm) {
    signupForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Stop the form from refreshing the page
        
        // Get data from the form
        // Note: Your signup.html has first-name and last-name,
        // but your auth.js was only using email/password.
        // We'll stick to email/password to match your new Node.js backend logic.
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        // Simple frontend check
        if (password !== confirmPassword) {
            showMessage('Passwords do not match!', 'error');
            return;
        }

        // We send the form data to the Node.js backend
        try {
            // Updated route to point to your Node.js auth route
            const response = await fetch(`/api/auth/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });

            const data = await response.json();

            if (response.ok) { // Status code 200-299
                // *** NEW LOGIC: Save the token from the signup response ***
                if (data.token) {
                    localStorage.setItem('siteSentryToken', data.token);

                    showMessage('Success! Account created. Now choose your plan...', 'success');
                    // Redirect to plans page
                    setTimeout(() => {
                        window.location.href = 'plans.html'; // Redirect to plans page
                    }, 1500);
                } else {
                    // Fail safe: If token is missing, redirect to login
                    showMessage('Signup successful, but login failed. Please log in.', 'error');
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 2000);
                }
            } else {
                // Show an error from the server (e.g., "Email already in use")
                showMessage(`Error: ${data.error}`, 'error');
            }
        } catch (error) {
            // This catches network errors
            console.error('Network error:', error);
            showMessage('Error: Could not connect to the server.', 'error');
        }
    });
}

// --- 2. LOGIN FORM ---
if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            // Updated route to point to your Node.js auth route
            const response = await fetch(`/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });

            const data = await response.json();

            if (response.ok) {
                // *** NEW - TOKEN HANDLING ***
                // The Node.js server sends back a 'token'. We must save it.
                if (data.token) {
                    localStorage.setItem('siteSentryToken', data.token);
                    
                    showMessage('Login successful! Redirecting to dashboard...', 'success');
                    // We are logged in! Redirect to the dashboard.
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 1500);
                } else {
                    showMessage('Error: Login successful but no token received.', 'error');
                }
            } else {
                showMessage(`Error: ${data.error}`, 'error');
            }
        } catch (error) {
            console.error('Network error:', error);
            showMessage('Error: Could not connect to the server.', 'error');
        }
    });
}

// --- Helper function to show success/error messages ---
function showMessage(message, type = 'info') {
    if (messageArea) {
        messageArea.textContent = message;
        if (type === 'success') {
            messageArea.style.color = '#10B981'; // Green
        } else if (type === 'error') {
            messageArea.style.color = '#EF4444'; // Red
        } else {
            messageArea.style.color = '#6B7280'; // Gray
        }
    }
}