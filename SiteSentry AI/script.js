// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            window.scrollTo({
                top: targetElement.offsetTop - 100,
                behavior: 'smooth'
            });
        }
    });
});
// Track button clicks for analytics
document.querySelectorAll('a.btn, button').forEach(button => {
    button.addEventListener('click', function() {
        // In a real implementation, this would send data to your analytics platform
        console.log('Button clicked:', this.textContent.trim());
    });
});
// Dashboard API functions
async function getSiteHealth(siteId) {
    try {
        const response = await axios.get(`/api/sites/${siteId}/health`);
        return response.data;
    } catch (error) {
        console.error('Error fetching site health:', error);
        return null;
    }
}

async function getUptimeHistory(siteId) {
    try {
        const response = await axios.get(`/api/sites/${siteId}/uptime`);
        return response.data;
    } catch (error) {
        console.error('Error fetching uptime history:', error);
        return null;
    }
}

async function getRecentActivity(siteId) {
    try {
        const response = await axios.get(`/api/sites/${siteId}/activity`);
        return response.data;
    } catch (error) {
        console.error('Error fetching recent activity:', error);
        return null;
    }
}

// Initialize Google Sign-In
function initGoogleSignIn() {
    if (typeof google === 'undefined') return;
    
    google.accounts.id.initialize({
        client_id: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com', // Replace with your actual client ID
        callback: handleCredentialResponse,
        ux_mode: 'popup'
    });
    
    const googleButtons = document.querySelectorAll('.google-signin-btn');
    googleButtons.forEach(btn => {
        google.accounts.id.renderButton(
            btn,
            { 
                theme: 'outline', 
                size: 'large',
                width: btn.offsetWidth,
                text: 'continue_with'
            }
        );
    });
}

function handleCredentialResponse(response) {
    // Send the credential to your backend for verification
    console.log('Google Sign-In response:', response);
    // In a real implementation, you would send this to your backend
    // fetch('/api/auth/google', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ credential: response.credential })
    // }).then(/* handle response */);
    
    // For demo purposes, we'll just redirect to dashboard
    window.location.href = '/dashboard.html';
}

// Load Google API script
if (!document.getElementById('google-signin-script')) {
    const script = document.createElement('script');
    script.id = 'google-signin-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initGoogleSignIn;
    document.body.appendChild(script);
} else {
    initGoogleSignIn();
}

