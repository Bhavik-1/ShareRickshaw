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
    // Fare Calculator (only runs on fare-calculator.html)
    // ========================================

    const calculatorForm = document.getElementById('fareCalculatorForm');

    if (calculatorForm) {
        // Check if user is logged in (fare calculator requires authentication)
        if (!requireAuth()) {
            return;
        }

        // Fare rate constants (Mumbai government-approved rates)
        const FARE_RATES = {
            baseFare: 26,           // ₹26 for first 1.5 km
            baseDistance: 1.5,      // First 1.5 km included in base
            perKmRate: 17.14,       // ₹17.14 per additional km
            waitingRate: 3,         // ₹3 per minute
            nightSurcharge: 0.25    // 25% surcharge
        };

        // Get form elements
        const distanceInput = document.getElementById('distance');
        const waitingTimeInput = document.getElementById('waitingTime');
        const timeOfDaySelect = document.getElementById('timeOfDay');
        const calculateBtn = document.getElementById('calculateBtn');
        const errorMessage = document.getElementById('errorMessage');
        const resultsContainer = document.getElementById('resultsContainer');

        // Get result card elements
        const distanceCard = document.getElementById('distanceCard');
        const distanceLabel = document.getElementById('distanceLabel');
        const distanceValue = document.getElementById('distanceValue');
        const waitingCard = document.getElementById('waitingCard');
        const waitingLabel = document.getElementById('waitingLabel');
        const waitingValue = document.getElementById('waitingValue');
        const nightCard = document.getElementById('nightCard');
        const nightValue = document.getElementById('nightValue');
        const totalAmount = document.getElementById('totalAmount');

        /**
         * Show error message
         */
        function showError(message) {
            errorMessage.textContent = message;
            errorMessage.classList.add('show');
            resultsContainer.classList.remove('show');
        }

        /**
         * Hide error message
         */
        function hideError() {
            errorMessage.textContent = '';
            errorMessage.classList.remove('show');
        }

        /**
         * Calculate fare based on inputs
         */
        function calculateFare(distance, waitingTime, timeOfDay) {
            // Step 1: Base fare (always ₹26)
            const baseFare = FARE_RATES.baseFare;

            // Step 2: Calculate distance charge
            let distanceCharge = 0;
            let extraDistance = 0;
            if (distance > FARE_RATES.baseDistance) {
                extraDistance = distance - FARE_RATES.baseDistance;
                distanceCharge = extraDistance * FARE_RATES.perKmRate;
            }

            // Step 3: Calculate waiting charge
            const waitingCharge = waitingTime * FARE_RATES.waitingRate;

            // Step 4: Calculate subtotal
            const subtotal = baseFare + distanceCharge + waitingCharge;

            // Step 5: Calculate night surcharge (if applicable)
            let nightSurcharge = 0;
            if (timeOfDay === 'night') {
                nightSurcharge = subtotal * FARE_RATES.nightSurcharge;
            }

            // Step 6: Calculate total
            const totalFare = subtotal + nightSurcharge;

            return {
                baseFare: baseFare,
                distanceCharge: distanceCharge,
                extraDistance: extraDistance,
                waitingCharge: waitingCharge,
                nightSurcharge: nightSurcharge,
                totalFare: totalFare
            };
        }

        /**
         * Update UI with calculation results
         */
        function updateResultsUI(fareBreakdown, distance, waitingTime, timeOfDay) {
            // Hide error message
            hideError();

            // Show results container
            resultsContainer.classList.add('show');

            // Update distance charge card (conditional)
            if (distance > FARE_RATES.baseDistance) {
                distanceCard.style.display = 'flex';
                distanceLabel.textContent = 'Distance Charge (' + fareBreakdown.extraDistance.toFixed(1) + ' km)';
                distanceValue.textContent = '₹' + fareBreakdown.distanceCharge.toFixed(2);
            } else {
                distanceCard.style.display = 'none';
            }

            // Update waiting charge card (conditional)
            if (waitingTime > 0) {
                waitingCard.style.display = 'flex';
                waitingLabel.textContent = 'Waiting Charge (' + waitingTime + ' mins)';
                waitingValue.textContent = '₹' + fareBreakdown.waitingCharge.toFixed(2);
            } else {
                waitingCard.style.display = 'none';
            }

            // Update night surcharge card (conditional)
            if (timeOfDay === 'night') {
                nightCard.style.display = 'flex';
                nightValue.textContent = '₹' + fareBreakdown.nightSurcharge.toFixed(2);
            } else {
                nightCard.style.display = 'none';
            }

            // Update total amount (always visible)
            totalAmount.textContent = '₹' + fareBreakdown.totalFare.toFixed(2);
        }

        /**
         * Handle form submission
         */
        calculatorForm.addEventListener('submit', function(event) {
            event.preventDefault();

            // Get button element
            const button = calculateBtn;

            // Show loading state
            button.textContent = 'Calculating...';
            button.disabled = true;

            // Use setTimeout to show loading state for minimum 300ms
            setTimeout(function() {
                // Get input values
                const distance = parseFloat(distanceInput.value);
                let waitingTime = parseFloat(waitingTimeInput.value);
                const timeOfDay = timeOfDaySelect.value;

                // Validation: Distance
                if (!distance || distance <= 0) {
                    showError('Please enter a valid distance greater than 0');
                    button.textContent = 'Calculate Fare';
                    button.disabled = false;
                    return;
                }

                // Validation: Waiting time (default to 0 if empty)
                if (!waitingTime || isNaN(waitingTime)) {
                    waitingTime = 0;
                }

                // Validation: Negative waiting time
                if (waitingTime < 0) {
                    showError('Waiting time cannot be negative');
                    button.textContent = 'Calculate Fare';
                    button.disabled = false;
                    return;
                }

                // Round waiting time to nearest integer
                waitingTime = Math.floor(waitingTime);

                try {
                    // Calculate fare
                    const fareBreakdown = calculateFare(distance, waitingTime, timeOfDay);

                    // Update UI with results
                    updateResultsUI(fareBreakdown, distance, waitingTime, timeOfDay);
                } catch (error) {
                    showError('Invalid input values');
                }

                // Reset button state
                button.textContent = 'Calculate Fare';
                button.disabled = false;
            }, 300);
        });
    }

});
