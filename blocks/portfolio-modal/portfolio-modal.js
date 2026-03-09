// Блок portfolio-modal - функции для работы с модальным окном портфолио

function initPortfolioModal() {
    const modal = document.getElementById('portfolioModal');
    const overlay = document.querySelector('.portfolio-modal__overlay');
    const closeBtn = document.querySelector('.portfolio-modal__close');
    
    if (!modal) return;
    
    // Закрытие модального окна
    function closeModal() {
        modal.classList.remove('portfolio-modal--active');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }
    
    // Открытие модального окна
    function openModal(work) {
        if (!work) return;
        
        const titleEl = document.getElementById('portfolioModalTitle');
        const imageEl = document.querySelector('.portfolio-modal-work__image');
        const yearEl = document.querySelector('.portfolio-modal-work__meta-value--year');
        const techniqueEl = document.querySelector('.portfolio-modal-work__meta-value--technique');
        const descriptionEl = document.querySelector('.portfolio-modal-work__description');
        
        if (titleEl) titleEl.textContent = work.title || '';
        if (imageEl) {
            imageEl.src = work.image || '';
            imageEl.alt = work.title || '';
        }
        if (yearEl) yearEl.textContent = work.year || '';
        if (techniqueEl) techniqueEl.textContent = work.technique || 'Не указана';
        if (descriptionEl) descriptionEl.textContent = work.description || 'Описание отсутствует.';
        
        // Обновляем aria-hidden
        modal.setAttribute('aria-hidden', 'false');
        modal.classList.add('portfolio-modal--active');
        document.body.style.overflow = 'hidden';
        
        // Фокус на кнопке закрытия для доступности
        if (closeBtn) {
            setTimeout(() => closeBtn.focus(), 100);
        }
    }
    
    // Обработчики закрытия
    if (overlay) {
        overlay.addEventListener('click', closeModal);
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
    
    // Закрытие по Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('portfolio-modal--active')) {
            closeModal();
        }
    });
    
    // Экспорт функции для открытия модального окна
    window.openPortfolioModal = openModal;
}

// Инициализация при загрузке DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPortfolioModal);
} else {
    initPortfolioModal();
}
