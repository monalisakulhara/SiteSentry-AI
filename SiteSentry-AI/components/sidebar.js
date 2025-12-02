class CustomSidebar extends HTMLElement {
  constructor() {
    super();
    // Default to collapsed state, like Gemini
    this.collapsed = true;
    // Check localStorage for saved state
    const savedState = localStorage.getItem('sidebarCollapsedGeminiStyle');
    if (savedState !== null) {
      this.collapsed = savedState === 'true';
    }
  }

  connectedCallback() {
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        /* Host styles ensure the sidebar takes full height and stays fixed */
        :host {
          display: block;
          position: fixed;
          left: 0;
          top: 4rem; /* Align to top */
          bottom: 0;
          z-index: 40; /* Below a potential fixed navbar */
          background: #f0f4f9; /* Background color for the host element */
          border-right: 1px solid #dee3e9; /* Border for the host */
          transition: width 0.2s ease-out; /* Transition width on the host */
          width: ${this.collapsed ? '72px' : '250px'}; /* Initial width based on state */
          overflow: hidden; /* Hide content that overflows during transition */
          font-family: 'Inter', sans-serif;
          color: #3c4043;
        }

        /* Container for all sidebar content */
        .sidebar-container {
            height: 100%;
            display: flex;
            flex-direction: column;
            padding: 0.75rem 0.5rem; /* Padding applied here */
            box-sizing: border-box; /* Include padding in height/width */
        }

        /* Top section for toggle and new action */
        .sidebar-top {
            padding: 0 0.5rem; /* Horizontal padding for top items */
            margin-bottom: 1rem;
        }

        /* Toggle Button (Hamburger Menu) */
        .toggle-btn {
          background: none; border: none; border-radius: 50%;
          width: 40px; height: 40px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: #5f6368;
          padding: 0; margin-bottom: 1rem;
        }
        .toggle-btn:hover { background-color: #e8eaed; }
        /* --- NEW: Hamburger Icon Styles --- */
        .hamburger-icon {
          width: 20px; /* Adjust size as needed */
          height: 16px; /* Adjust height based on line thickness and spacing */
          position: relative;
          display: flex; /* Use flex to easily center lines if needed */
          flex-direction: column;
          justify-content: space-between;
        }
        .hamburger-icon span {
          display: block;
          height: 2px; /* Thickness of each line */
          width: 100%;
          background-color: currentColor; /* Inherit color from button */
          border-radius: 1px;
          transition: transform 0.2s ease-out, opacity 0.2s ease-out; /* Add transitions if you want animation later */
        }
        /* --- END Hamburger Icon Styles --- */

        /* Optional: Ensure toggle button centers the icon */
        .toggle-btn {
          /* ... keep existing styles ... */
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        /* Menu sections */
        .sidebar-menu {
          flex-grow: 1; overflow-y: auto;
          padding: 0 0.5rem; /* Side padding for links */
        }
        /* Hide scrollbar visually */
        .sidebar-menu::-webkit-scrollbar { display: none; }
        .sidebar-menu { -ms-overflow-style: none; scrollbar-width: none; }

        .menu-links { display: flex; flex-direction: column; gap: 0.25rem; }
        .menu-link {
          display: flex; align-items: center; padding: 0.65rem 0.75rem;
          border-radius: 0.375rem; color: #3c4043; text-decoration: none;
          transition: background-color 0.2s; white-space: nowrap;
          font-size: 0.875rem; overflow: hidden; /* Hide text */
        }
        .menu-link:hover { background-color: #e8eaed; }
        .menu-link.active { background-color: #e8f0fe; color: #1967d2; font-weight: 500; }
        .menu-link i {
           margin-right: 1rem; width: 20px; height: 20px;
           flex-shrink: 0; color: #5f6368;
           transition: margin 0.2s ease-out;
        }
        .menu-link.active i { color: #1967d2; }

        /* Collapsed link styles */
        :host(.collapsed) .menu-link span { display: none; }
        :host(.collapsed) .menu-link {
            justify-content: center; padding: 0.75rem 0;
        }
        :host(.collapsed) .menu-link i { margin-right: 0; }


        /* Bottom section */
        .sidebar-bottom {
          padding: 0.5rem 0.5rem 0; margin-top: auto; /* Push to bottom */
          border-top: 1px solid #dee3e9;
        }
        :host(.collapsed) .sidebar-bottom .menu-link span { display: none; }

      </style>
      <div class="sidebar-container">
       <div class="sidebar-top">
           <button class="toggle-btn" aria-label="Toggle Sidebar">
                <div class="hamburger-icon" aria-hidden="true">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
           </button>
           </div>

       <nav class="sidebar-menu">

           <div class="menu-section">
               <h4 class="menu-title">MAIN</h4>
               <div class="menu-links">
                   <a href="/dashboard.html" class="menu-link" id="nav-dashboard">
                       <i data-feather="home"></i>
                       <span>Dashboard</span>
                   </a>
                   <a href="/sites.html" class="menu-link" id="nav-sites">
                       <i data-feather="monitor"></i>
                       <span>My Websites</span>
                   </a>
                   <a href="/backups.html" class="menu-link" id="nav-backups">
                       <i data-feather="hard-drive"></i>
                       <span>Backups</span>
                   </a>
               </div>
           </div>

           <div class="menu-section">
               <h4 class="menu-title">MONITORING</h4>
               <div class="menu-links">
                   <a href="/uptime.html" class="menu-link" id="nav-uptime">
                       <i data-feather="activity"></i>
                       <span>Uptime</span>
                   </a>
                   <a href="/security.html" class="menu-link" id="nav-security">
                       <i data-feather="shield"></i>
                       <span>Security</span>
                   </a>
                   <a href="/performance.html" class="menu-link" id="nav-performance">
                       <i data-feather="zap"></i>
                       <span>Performance</span>
                   </a>
               </div>
           </div>

           <div class="menu-section">
               <h4 class="menu-title">SETTINGS</h4>
               <div class="menu-links">
                   <a href="/settings.html" class="menu-link" id="nav-settings">
                       <i data-feather="settings"></i>
                       <span>Account Settings</span>
                   </a>
                   <a href="/billing.html" class="menu-link" id="nav-billing">
                       <i data-feather="credit-card"></i>
                       <span>Billing</span>
                   </a>
                   <a href="/support.html" class="menu-link" id="nav-support">
                       <i data-feather="help-circle"></i>
                       <span>Support</span>
                   </a>
               </div>
           </div>

       </nav>

       </div>

        <nav class="sidebar-menu">
          <div class="menu-links">
            <a href="/dashboard.html" class="menu-link" id="nav-dashboard">
              <i data-feather="home"></i>
              <span>Dashboard</span>
            </a>
            <a href="/sites.html" class="menu-link" id="nav-sites">
              <i data-feather="monitor"></i>
              <span>My Websites</span>
            </a>
            <a href="/backups.html" class="menu-link" id="nav-backups">
              <i data-feather="hard-drive"></i>
              <span>Backups</span>
            </a>
            <a href="/uptime.html" class="menu-link" id="nav-uptime">
              <i data-feather="activity"></i>
              <span>Uptime</span>
            </a>
            <a href="/security.html" class="menu-link" id="nav-security">
              <i data-feather="shield"></i>
              <span>Security</span>
            </a>
            <a href="/performance.html" class="menu-link" id="nav-performance">
              <i data-feather="zap"></i>
              <span>Performance</span>
            </a>
          </div>
        </nav>

        <div class="sidebar-bottom">
          <div class="menu-links">
            <a href="/settings.html" class="menu-link" id="nav-settings">
              <i data-feather="settings"></i>
              <span>Settings</span>
            </a>
             <a href="/support.html" class="menu-link" id="nav-support">
                <i data-feather="help-circle"></i>
                <span>Help</span>
              </a>
          </div>
        </div>
      </div>
    `;

    // --- Add Toggle Button Logic ---
    const toggleBtn = this.shadowRoot.querySelector('.toggle-btn');
    const hostElement = this; // Target the custom element itself for width change

    toggleBtn.addEventListener('click', () => {
      this.collapsed = !this.collapsed;
      // Toggle class on the host element instead of aside
      hostElement.classList.toggle('collapsed', this.collapsed);
      // Update the host element's width directly
      hostElement.style.width = this.collapsed ? '72px' : '250px';
      localStorage.setItem('sidebarCollapsedGeminiStyle', this.collapsed); // Save state
      // Dispatch event for main content margin adjustment
      this.dispatchEvent(new CustomEvent('sidebarToggled', { detail: { collapsed: this.collapsed } }));
       // Re-render icons after transition might finish
       setTimeout(() => this.injectFeather(), 200);
    });

    // Apply initial state class
    hostElement.classList.toggle('collapsed', this.collapsed);

    // --- Initialize Feather Icons ---
    this.injectFeather();

    // --- Set Active Link ---
    this.setActiveLink();
  }

  // Separate function for Feather Icons
  injectFeather() {
      setTimeout(() => {
          if (window.feather) {
              window.feather.replace({
                width: 20, height: 20, 'stroke-width': 1.5
              });
          }
      }, 0);
  }

  // Separate function to set active link
  setActiveLink() {
      const currentPath = window.location.pathname;
      this.shadowRoot.querySelectorAll('.menu-link').forEach(link => {
        const linkPath = link.getAttribute('href');
         const isActive = (linkPath === currentPath) || (currentPath === '/' && linkPath === '/dashboard.html');
         link.classList.toggle('active', isActive);
      });
  }
}
customElements.define('custom-sidebar', CustomSidebar);

// --- Global Listener for Main Content Margin ---
// Make sure this code runs (e.g., in your main script.js or layout)
function adjustMainContentMarginGemini() {
    const sidebar = document.querySelector('custom-sidebar');
    // Adjust selector if needed to target the main content wrapper div
    const contentWrapper = document.querySelector('body > div > div:not(custom-sidebar)'); // Selects the div that ISN'T the sidebar
    if (sidebar && contentWrapper) {
        const isCollapsed = sidebar.classList.contains('collapsed'); // Check class on host
        contentWrapper.style.transition = 'margin-left 0.2s ease-out';
        contentWrapper.style.marginLeft = isCollapsed ? '72px' : '250px';
    } else {
        // Fallback or default margin if sidebar isn't found
        if(contentWrapper) contentWrapper.style.marginLeft = '72px';
        console.warn("Could not find sidebar or content wrapper for Gemini style margin adjustment.");
    }
}

// Listen for the custom event dispatched by the sidebar
window.addEventListener('sidebarToggled', adjustMainContentMarginGemini);

// Adjust margin on initial load
document.addEventListener('DOMContentLoaded', adjustMainContentMarginGemini);