// ====================================================================
// HALALTRADE PRO - LANDING PAGE SCRIPTS
// ====================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Mobile menu toggle
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            mobileMenuBtn.classList.toggle('active');
        });
    }

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                // Close mobile menu if open
                navLinks?.classList.remove('active');
                mobileMenuBtn?.classList.remove('active');
            }
        });
    });

    // Navbar background on scroll
    const nav = document.querySelector('.nav');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            nav.style.background = 'rgba(15, 23, 42, 0.95)';
        } else {
            nav.style.background = 'rgba(15, 23, 42, 0.8)';
        }
    });

    // Animate elements on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe feature cards and steps
    document.querySelectorAll('.feature-card, .step, .pricing-card').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });

    // Add animate-in class styles
    const style = document.createElement('style');
    style.textContent = `
    .animate-in {
      opacity: 1 !important;
      transform: translateY(0) !important;
    }
  `;
    document.head.appendChild(style);

    // Add staggered animation delay
    document.querySelectorAll('.features-grid .feature-card').forEach((card, i) => {
        card.style.transitionDelay = `${i * 0.1}s`;
    });

    console.log('🌙 HalalTrade Pro Landing Page loaded');
});

// ====================================================================
// AUTHENTICATION FUNCTIONS
// ====================================================================

const APP_URL = 'https://trading-bot-002.vercel.app/';

// Open auth modal
function openAuthModal() {
    document.getElementById('authModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Close auth modal
function closeAuthModal() {
    document.getElementById('authModal').classList.remove('active');
    document.body.style.overflow = '';
}

// Close modal on backdrop click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('auth-modal-backdrop')) {
        closeAuthModal();
    }
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeAuthModal();
    }
});

// Switch between login and signup tabs
function switchTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const tabs = document.querySelectorAll('.auth-tab');

    tabs.forEach(t => t.classList.remove('active'));

    if (tab === 'login') {
        loginForm.style.display = 'flex';
        signupForm.style.display = 'none';
        tabs[0].classList.add('active');
    } else {
        loginForm.style.display = 'none';
        signupForm.style.display = 'flex';
        tabs[1].classList.add('active');
    }
}

// Handle login form submission
function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    // For now, store in localStorage and redirect
    // Later you can integrate with Supabase
    localStorage.setItem('halaltrade_user', JSON.stringify({
        email: email,
        loggedIn: true,
        timestamp: Date.now()
    }));

    // Show success and redirect
    alert('✅ Login successful! Redirecting to app...');
    window.location.href = APP_URL;
}

// Handle signup form submission
function handleSignup(e) {
    e.preventDefault();
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;

    // Store user and redirect
    localStorage.setItem('halaltrade_user', JSON.stringify({
        name: name,
        email: email,
        loggedIn: true,
        timestamp: Date.now()
    }));

    alert('✅ Account created! Redirecting to app...');
    window.location.href = APP_URL;
}

// Handle Google login
function handleGoogleLogin() {
    // For now, simulate Google login
    // Later integrate with Supabase OAuth
    const mockEmail = 'user@gmail.com';

    localStorage.setItem('halaltrade_user', JSON.stringify({
        email: mockEmail,
        provider: 'google',
        loggedIn: true,
        timestamp: Date.now()
    }));

    alert('✅ Google sign-in successful! Redirecting to app...');
    window.location.href = APP_URL;
}

// Update all "Try Demo" and "Launch App" buttons to open auth modal
document.addEventListener('DOMContentLoaded', () => {
    // Find all buttons that should trigger auth
    const authTriggers = document.querySelectorAll('a[href="#demo"], a[href*="vercel.app"]');

    authTriggers.forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            // Check if user is already logged in
            const user = localStorage.getItem('halaltrade_user');
            if (user) {
                const userData = JSON.parse(user);
                // Check if login is less than 24 hours old
                if (Date.now() - userData.timestamp < 24 * 60 * 60 * 1000) {
                    // User is logged in, allow redirect
                    return;
                }
            }
            // User not logged in, show auth modal
            e.preventDefault();
            openAuthModal();
        });
    });
});
