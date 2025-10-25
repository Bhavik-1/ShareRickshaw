/**
 * Mumbai Share Auto Finder - Main JavaScript
 * Handles mobile menu interactions and navigation
 */

// Wait for DOM to fully load
document.addEventListener('DOMContentLoaded', function() {

    // ========================================
    // Mobile Menu Functionality
    // ========================================

    const hamburger = document.querySelector('.hamburger');
    const mobileMenu = document.querySelector('.mobile-menu');
    const backdrop = document.querySelector('.mobile-menu-backdrop');
    const closeBtn = document.querySelector('.mobile-menu-close');
    const mobileNavLinks = document.querySelectorAll('.mobile-menu a');
    const body = document.body;

    /**
     * Opens the mobile menu
     */
    function openMobileMenu() {
        mobileMenu.classList.add('active');
        backdrop.classList.add('active');
        body.classList.add('mobile-menu-open');
        mobileMenu.setAttribute('aria-hidden', 'false');
    }

    /**
     * Closes the mobile menu
     */
    function closeMobileMenu() {
        mobileMenu.classList.remove('active');
        backdrop.classList.remove('active');
        body.classList.remove('mobile-menu-open');
        mobileMenu.setAttribute('aria-hidden', 'true');
    }

    // Toggle menu when hamburger is clicked
    if (hamburger) {
        hamburger.addEventListener('click', function() {
            if (mobileMenu.classList.contains('active')) {
                closeMobileMenu();
            } else {
                openMobileMenu();
            }
        });
    }

    // Close menu when backdrop is clicked
    if (backdrop) {
        backdrop.addEventListener('click', function() {
            closeMobileMenu();
        });
    }

    // Close menu when close button is clicked
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            closeMobileMenu();
        });
    }

    // Close menu when any mobile nav link is clicked
    mobileNavLinks.forEach(function(link) {
        link.addEventListener('click', function() {
            closeMobileMenu();
        });
    });

    // Close menu when Escape key is pressed
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && mobileMenu.classList.contains('active')) {
            closeMobileMenu();
        }
    });

    // ========================================
    // Active Page Indicator
    // ========================================

    // Get current page filename
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    // Select all navigation links (both desktop and mobile)
    const allNavLinks = document.querySelectorAll('.nav-links a, .mobile-nav-links a');

    // Add 'active' class to current page link
    allNavLinks.forEach(function(link) {
        const linkHref = link.getAttribute('href');

        // Match the current page with the link
        if (linkHref === currentPage ||
            (currentPage === '' && linkHref === 'index.html')) {
            link.classList.add('active');
        }
    });

    // ========================================
    // Smooth Scroll Enhancement (Optional)
    // ========================================

    // Currently not needed since all links navigate to different pages
    // Can be added later if anchor links within the same page are needed

});
