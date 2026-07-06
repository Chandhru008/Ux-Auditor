import { useState, useEffect } from 'react';
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from '@clerk/clerk-react';

const Navbar = ({ onStartAudit, onLoginClick, onSignupClick }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <nav className={`nav ${scrolled ? 'nav--scrolled' : ''}`} id="nav">
        <div className="nav__inner">
          <a href="#" className="nav__logo">
            <div className="nav__logo-icon">
              <svg viewBox="0 0 32 32" fill="none">
                <rect x="2" y="2" width="28" height="28" rx="8" stroke="url(#logoGrad)" strokeWidth="2.5"/>
                <path d="M10 16.5L14 20.5L22 12.5" stroke="url(#logoGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="24" cy="8" r="3" fill="#a78bfa"/>
                <defs>
                  <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32">
                    <stop stopColor="#818cf8"/>
                    <stop offset="1" stopColor="#c084fc"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <span className="nav__logo-text">UX Auditor</span>
          </a>
          <div className="nav__links">
            <a href="#features" className="nav__link">Features</a>
            <a href="#engines" className="nav__link">Engines</a>
            <a href="#workflow" className="nav__link">Workflow</a>
            <a href="#journeys" className="nav__link">Journeys</a>
            <a href="#dashboard" className="nav__link">Dashboard</a>
          </div>
          <div className="nav__actions" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button 
              className="btn btn--ghost" 
              style={{ padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={() => setIsDarkMode(!isDarkMode)}
              title="Toggle Dark Mode"
            >
              {isDarkMode ? (
                <svg style={{width: '20px', height: '20px'}} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              ) : (
                <svg style={{width: '20px', height: '20px'}} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              )}
            </button>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="btn btn--ghost" id="btnLogin">Sign In</button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="btn btn--primary" id="btnStart">Start Audit</button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <a href="/dashboard" className="btn btn--ghost" style={{textDecoration: 'none'}}>Dashboard</a>
              <UserButton />
            </SignedIn>
          </div>
          <button 
            className={`nav__hamburger ${mobileMenuOpen ? 'active' : ''}`} 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span></span><span></span><span></span>
          </button>
        </div>
      </nav>

      <div className={`mobile-nav ${mobileMenuOpen ? 'open' : ''}`} id="mobileNav">
        <a href="#features" className="mobile-nav__link" onClick={() => setMobileMenuOpen(false)}>Features</a>
        <a href="#engines" className="mobile-nav__link" onClick={() => setMobileMenuOpen(false)}>Engines</a>
        <a href="#workflow" className="mobile-nav__link" onClick={() => setMobileMenuOpen(false)}>Workflow</a>
        <a href="#journeys" className="mobile-nav__link" onClick={() => setMobileMenuOpen(false)}>Journeys</a>
        <a href="#dashboard" className="mobile-nav__link" onClick={() => setMobileMenuOpen(false)}>Dashboard</a>
        <div className="mobile-nav__actions">
          <button className="btn btn--ghost">Sign In</button>
          <button className="btn btn--primary" onClick={() => { setMobileMenuOpen(false); onStartAudit(); }}>Start Audit</button>
        </div>
      </div>
    </>
  );
};

export default Navbar;
