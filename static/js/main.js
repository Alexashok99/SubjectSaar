/**
 * @fileoverview Main JavaScript file for the index.html (Homepage).
 * Handles all navigation and dynamic linking to test pages.
 */

document.addEventListener('DOMContentLoaded', () => {

    // --- HERO CAROUSEL init (inside DOMContentLoaded) ---
    (function initHeroCarousel() {
    const track = document.querySelector('.hero-track');
    if (!track) return; // safety

    const slides = Array.from(track.querySelectorAll('.hero-slide'));
    const prev = document.querySelector('.hero-prev');
    const next = document.querySelector('.hero-next');
    const dots = Array.from(document.querySelectorAll('.hero-dot'));

    let current = 0;
    const total = slides.length;
    const AUTO_MS = 4200;
    let timer = null;

    function update() {
        const offset = -current * 100;
        track.style.transform = `translateX(${offset}%)`;
        dots.forEach((d, i) => d.classList.toggle('active', i === current));
    }

    function goTo(n) {
        current = ((n % total) + total) % total;
        update();
    }
    function nextSlide() { goTo(current + 1); }
    function prevSlide() { goTo(current - 1); }

    // dots events
    dots.forEach(d => {
        d.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.index, 10);
        stopAuto(); goTo(idx); startAuto();
        });
    });

    // arrows
    if (next) next.addEventListener('click', () => { stopAuto(); nextSlide(); startAuto(); });
    if (prev) prev.addEventListener('click', () => { stopAuto(); prevSlide(); startAuto(); });

    // auto
    function startAuto() { stopAuto(); timer = setInterval(nextSlide, AUTO_MS); }
    function stopAuto() { if (timer) { clearInterval(timer); timer = null; } }

    // pause on hover (better UX)
    const wrap = document.querySelector('.hero-track-wrap');
    wrap.addEventListener('mouseenter', stopAuto);
    wrap.addEventListener('mouseleave', startAuto);

    // init
    goTo(0);
    startAuto();
    })();

    
    // --- 1. Top CTA Button Event (Explore Summaries) ---
    const startButton = document.getElementById('startTestButton');
    if (startButton) {
        startButton.addEventListener('click', () => {
            // Scrolls down to the Popular Subject Saars section
            document.getElementById('tests').scrollIntoView({ behavior: 'smooth' });
        });
    }

    // --- 2. Test Grid Button Event (Mock Tests) ---
    // (बदलाव: इसे DOMContentLoaded के अंदर ले जाया गया है)
    const gridButtons = document.querySelectorAll('.grid-button');
    gridButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            const gridCard = event.target.closest('.grid-card');
            const subject = gridCard.getAttribute('data-subject');
            
            if (subject === 'mathematics') {
                // (बदलाव) अब हम सीधे मैथ हब पेज पर भेजेंगे
                window.location.href = '/mathematics/'; // Flask route
                
            } else {
                alert(`Starting the Mock Tests for: ${subject.toUpperCase()}!`);
            }
        });
    });

});