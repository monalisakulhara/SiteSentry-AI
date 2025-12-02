class CustomFooter extends HTMLElement {
  connectedCallback() {
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        footer {
          background: #111827;
          color: white;
          padding: 4rem 2rem 2rem;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
        }
        .footer-content {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 2rem;
          margin-bottom: 3rem;
        }
        .footer-logo {
          font-size: 1.5rem;
          font-weight: bold;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
        }
        .footer-logo i {
          margin-right: 0.5rem;
          color: #3B82F6;
        }
        .footer-description {
          color: #9CA3AF;
          line-height: 1.6;
          margin-bottom: 1.5rem;
        }
        .footer-heading {
          font-size: 1.125rem;
          font-weight: 600;
          margin-bottom: 1.25rem;
          color: white;
        }
        .footer-links {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .footer-links li {
          margin-bottom: 0.75rem;
        }
        .footer-links a {
          color: #9CA3AF;
          text-decoration: none;
          transition: color 0.2s;
        }
        .footer-links a:hover {
          color: #3B82F6;
        }
        .social-links {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
        }
        .social-links a {
          color: #9CA3AF;
          transition: color 0.2s;
        }
        .social-links a:hover {
          color: #3B82F6;
        }
        .copyright {
          border-top: 1px solid #374151;
          padding-top: 2rem;
          text-align: center;
          color: #9CA3AF;
          font-size: 0.875rem;
        }
        @media (max-width: 768px) {
          .footer-content {
            grid-template-columns: 1fr;
          }
        }
      </style>
      <footer>
        <div class="container">
          <div class="footer-content">
            <div class="footer-about">
              <div class="footer-logo">
                <i data-feather="shield"></i>
                SiteSentry AI
              </div>
              <p class="footer-description">
                Your 24/7 website mechanic. Automated updates, security, backups, 
                and uptime monitoring for small business owners.
              </p>
              <div class="social-links">
                <a href="#" aria-label="Twitter"><i data-feather="twitter"></i></a>
                <a href="#" aria-label="Facebook"><i data-feather="facebook"></i></a>
                <a href="#" aria-label="LinkedIn"><i data-feather="linkedin"></i></a>
                <a href="#" aria-label="GitHub"><i data-feather="github"></i></a>
              </div>
            </div>
            <div>
              <h3 class="footer-heading">Product</h3>
              <ul class="footer-links">
                <li><a href="#features">Features</a></li>
                <li><a href="#pricing">Pricing</a></li>
                <li><a href="/about.html">About</a></li>
                <li><a href="/blog.html">Blog</a></li>
              </ul>
            </div>
            <div>
              <h3 class="footer-heading">Support</h3>
              <ul class="footer-links">
                <li><a href="/help.html">Help Center</a></li>
                <li><a href="/contact.html">Contact Us</a></li>
                <li><a href="/privacy.html">Privacy Policy</a></li>
                <li><a href="/terms.html">Terms of Service</a></li>
</ul>
            </div>
            <div>
              <h3 class="footer-heading">Company</h3>
              <ul class="footer-links">
                <li><a href="/about.html">About Us</a></li>
                <li><a href="/careers.html">Careers</a></li>
                <li><a href="/press.html">Press</a></li>
                <li><a href="/partners.html">Partners</a></li>
              </ul>
            </div>
          </div>
          <div class="copyright">
            &copy; ${new Date().getFullYear()} SiteSentry AI. All rights reserved.
          </div>
        </div>
      </footer>
    `;
    
    // Initialize Feather icons in shadow DOM
    const featherScript = document.createElement('script');
    featherScript.src = 'https://cdn.jsdelivr.net/npm/feather-icons/dist/feather.min.js';
    this.shadowRoot.appendChild(featherScript);
    featherScript.onload = () => {
      if (window.feather) {
        window.feather.replace();
      }
    };
  }
}

customElements.define('custom-footer', CustomFooter);