class CustomNavbar extends HTMLElement {
    constructor() {
        super();
        this.shadowRootAttached = false;
    }

    connectedCallback() {
        if (this.shadowRootAttached) return;
        this.attachShadow({ mode: 'open' });
        this.shadowRootAttached = true;
        this.render();
        this.checkLoginStatus();
    }

    // The base HTML structure is static, but buttons/user info are dynamic placeholders
    getTemplate(userEmail = null) {
        const buttonsHtml = userEmail
            ? `
              <div class="nav-buttons logged-in">
                <span class="text-gray-700 font-medium mr-3">${userEmail}</span>
                <a href="#" id="logout-btn" class="bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-lg transition duration-300">Log Out</a>
              </div>
            `
            : `
              <div class="nav-buttons">
                <a href="/login.html" class="login">Log In</a>
                <a href="/signup.html" class="signup">Sign Up</a>
              </div>
            `;

        return `
            <style>
              /* Keep all your existing CSS styles here */
              nav {
                  background: rgba(255, 255, 255, 0.95);
                  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                  padding: 1rem 2rem;
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  position: fixed;
                  top: 0;
                  left: 0;
                  right: 0;
                  z-index: 50;
                  backdrop-filter: blur(10px);
              }
              .container {
                  width: 100%; max-width: 1200px; margin: 0 auto;
                  display: flex; 
                  /* justify-content: space-between; */ /* <-- REMOVED */
                  align-items: center;
              }
              .logo {
                  color: #000000ff; font-weight: bold; font-size: 1.5rem;
                  display: flex; align-items: center; text-decoration: none;
              }
              /* This style is important for the SVG to align correctly */
              .logo svg { 
                margin-right: 0.5rem; 
                color: #3B82F6; 
                width: 24px; /* Explicitly set size */
                height: 24px; /* Explicitly set size */
              }
              .nav-links {
                  display: flex; gap: 2rem; list-style: none; margin: 0; padding: 0;
                  flex-grow: 1; /* <-- ADDED: Takes up all available space */
                  justify-content: center; /* <-- ADDED: Centers the links inside */
              }
              .nav-links a {
                  color: #4b5563; text-decoration: none; font-weight: 500; transition: color 0.2s; position: relative;
              }
              .nav-links a:hover { color: #3B82F6; }
              /* ... (keep line hover animation CSS) ... */
              .nav-links a:after {
                content: ''; position: absolute; bottom: -4px; left: 0; width: 0; height: 2px;
                background: #3B82F6; transition: width 0.3s;
              }
              .nav-links a:hover:after { width: 100%; }

              .nav-buttons { display: flex; gap: 1rem; align-items: center; }
              .nav-buttons a {
                  padding: 0.5rem 1rem; border-radius: 0.375rem;
                  font-weight: 500; transition: all 0.2s;
              }
              .nav-buttons .login {
                  color: #3B82F6; border: 1px solid #3B82F6;
              }
              .nav-buttons .login:hover {
                  background: rgba(59, 130, 246, 0.1);
              }
              .nav-buttons .signup {
                  background: #3B82F6; color: white;
              }
              .nav-buttons .signup:hover {
                  background: #2563EB;
              }
              .logged-in a { /* Style the logout button */
                   background: #f3f4f6;
                   border: 1px solid #d1d5db;
              }
              .logged-in a:hover {
                   background: #e5e7eb;
              }
              .mobile-menu-btn { display: none; background: none; border: none; color: #4b5563; cursor: pointer; }
              /* Ensure mobile menu icon is styled too */
              .mobile-menu-btn svg {
                width: 24px;
                height: 24px;
              }
              @media (max-width: 768px) {
                  .nav-links, .nav-buttons { display: none; }
                  .mobile-menu-btn { 
                    display: block; 
                    margin-left: auto; /* <-- ADDED: Pushes mobile button to the right */
                  }
              }
            </style>
            <nav>
              <div class="container">
                <a href="/" class="logo">
                  <!-- This <i> tag will be replaced by the script -->
                  <i data-feather="shield"></i>
                  SiteSentry AI
                </a>
                <ul class="nav-links">
                  <li><a href="/#features">Features</a></li>
                  <li><a href="/#pricing">Pricing</a></li>
                  <li><a href="/about.html">About</a></li>
                  <li><a href="/contact.html">Contact</a></li>
                  <li><a href="/dashboard.html">Dashboard</a></li>
                </ul>
                ${buttonsHtml}
                <button class="mobile-menu-btn">
                  <!-- This <i> tag will also be replaced -->
                  <i data-feather="menu"></i>
                </button>
              </div>
            </nav>
          `;
    }

    /**
     * Replaces the old render method.
     * This now calls our new helper function to manually render icons.
     */
    render(userEmail = null) {
        this.shadowRoot.innerHTML = this.getTemplate(userEmail);

        // Manually replace feather icons within the Shadow DOM
        this.replaceFeatherIcons();

        // Add listener to the dynamically created logout button
        if (userEmail) {
            this.shadowRoot.querySelector('#logout-btn').addEventListener('click', this.handleLogout.bind(this));
        }
    }

    /**
     * NEW HELPER METHOD
     * Finds all [data-feather] elements inside the shadow DOM and replaces
     * them with the corresponding SVG string from window.feather.icons.
     */
    replaceFeatherIcons() {
        // Use setTimeout to wait for feather.js to potentially load
        // feather.replace() does not scan shadow DOM, so we must do it manually.
        setTimeout(() => {
            if (window.feather) {
                this.shadowRoot.querySelectorAll('[data-feather]').forEach(iconEl => {
                    const iconName = iconEl.getAttribute('data-feather');
                    if (!feather.icons[iconName]) {
                        console.warn(`Feather icon not found: ${iconName}`);
                        return;
                    }

                    // Get attributes from the placeholder <i> tag
                    const attrs = {
                        class: iconEl.getAttribute('class') || '',
                        width: iconEl.getAttribute('width') || 24, // Default size
                        height: iconEl.getAttribute('height') || 24, // Default size
                    };
                    
                    // Use the specific size for the logo from your original code
                    if (iconEl.parentElement.classList.contains('logo')) {
                         attrs.width = 24;
                         attrs.height = 24;
                    }

                    const svgString = feather.icons[iconName].toSvg(attrs);
                    
                    // Create a document fragment to parse the SVG string
                    const template = document.createElement('template');
                    template.innerHTML = svgString.trim(); // .trim() is important
                    const svgElement = template.content.firstChild;

                    if (svgElement) {
                        // Copy over any other data-* attributes
                        for (const { name, value } of iconEl.attributes) {
                            if (name.startsWith('data-') && name !== 'data-feather') {
                                svgElement.setAttribute(name, value);
                            }
                        }
                        // Replace the <i> tag with the new <svg> element
                        iconEl.replaceWith(svgElement);
                    }
                });
            } else {
                console.warn('Feather icons script not loaded yet.');
            }
        }, 0); // Deferring execution slightly helps ensure feather.js is loaded
    }

    // Check if user is logged in using the token
    async checkLoginStatus() {
        // We need 'axios' to be available globally to make this request
        if (typeof axios === 'undefined') {
            console.warn('Axios not loaded, cannot check login status.');
            return;
        } 
        
        const token = localStorage.getItem('siteSentryToken');
        if (!token) {
            this.render(null); // Render default Log In/Sign Up buttons
            return;
        }

        try {
            // *** KEY FIX: Use relative path for API call ***
            const response = await axios.get(`/api/users/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.status === 200) {
                const data = response.data;
                // Use the part before @ as a simple name
                const displayName = data.email.split('@')[0]; 
                this.render(displayName); // Render logged-in state with name
            } else {
                // Token expired or invalid (should result in 401/403, but handled by response status)
                localStorage.removeItem('siteSentryToken');
                this.render(null); // Render logged-out state
            }
        } catch (error) {
            // Handle network errors, 401/403 from server
            if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                 localStorage.removeItem('siteSentryToken');
            }
            this.render(null); // Assume logged out on error
        }
    }

    // Handle the logout process
    async handleLogout(event) {
        event.preventDefault();
        localStorage.removeItem('siteSentryToken');
        
        // Redirect to home page or login page
        window.location.href = '/login.html'; 
        
        this.render(null); // Re-render navbar immediately
    }
}

customElements.define('custom-navbar', CustomNavbar);

