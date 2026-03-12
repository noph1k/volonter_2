// Инициализация бургер-меню
function initBurgerMenu() {
    const burgerBtn = document.getElementById('burgerBtn');
    const nav = document.getElementById('mainNav');
    
    if (!burgerBtn || !nav) return;
    
    burgerBtn.addEventListener('click', function() {
        const isActive = burgerBtn.classList.contains('header__burger_active');
        
        if (isActive) {
            burgerBtn.classList.remove('header__burger_active');
            nav.classList.remove('nav_active');
            burgerBtn.setAttribute('aria-expanded', 'false');
        } else {
            burgerBtn.classList.add('header__burger_active');
            nav.classList.add('nav_active');
            burgerBtn.setAttribute('aria-expanded', 'true');
        }
    });
    
    // Закрытие меню при клике на ссылку
    const navLinks = nav.querySelectorAll('.nav__link');
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            burgerBtn.classList.remove('header__burger_active');
            nav.classList.remove('nav_active');
            burgerBtn.setAttribute('aria-expanded', 'false');
        });
    });
    
    // Закрытие меню при клике вне его
    document.addEventListener('click', function(e) {
        if (!nav.contains(e.target) && !burgerBtn.contains(e.target)) {
            burgerBtn.classList.remove('header__burger_active');
            nav.classList.remove('nav_active');
            burgerBtn.setAttribute('aria-expanded', 'false');
        }
    });
}

// Инициализация при загрузке DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBurgerMenu);
} else {
    initBurgerMenu();
}

