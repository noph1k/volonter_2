// Цветовое кодирование по типам мест
const venueColors = {
    museum: '#E63946',      // Красный для музеев
    gallery: '#457B9D',      // Синий для галерей
    'art-center': '#2A9D8F', // Зеленый для арт-центров
    cluster: '#F77F00'       // Желтый/оранжевый для кластеров
};

// Текущий активный фильтр
let activeTypeFilter = 'all';

// Переменная для хранения карты Leaflet
let map = null;
let markers = [];

// Функция для получения событий места
function getVenueEvents(venueId) {
    return events.filter(event => event.venueId === venueId);
}

// Функция для создания кастомной иконки маркера
function createCustomIcon(venue, eventsCount) {
    const color = venueColors[venue.typeCategory] || '#666';
    
    // Создаем SVG иконку
    const svgIcon = `
        <svg width="30" height="30" xmlns="http://www.w3.org/2000/svg">
            <circle cx="15" cy="15" r="12" fill="${color}" stroke="#fff" stroke-width="2"/>
            <text x="15" y="15" text-anchor="middle" dominant-baseline="central" fill="#fff" font-size="10" font-weight="bold">${venue.type.charAt(0)}</text>
            ${eventsCount > 0 ? `<circle cx="22" cy="8" r="6" fill="#fff" stroke="${color}" stroke-width="1.5"/>
            <text x="22" y="8" text-anchor="middle" dominant-baseline="central" fill="${color}" font-size="8" font-weight="bold">${eventsCount}</text>` : ''}
        </svg>
    `;
    
    return L.divIcon({
        html: svgIcon,
        className: 'custom-venue-marker',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -15]
    });
}

// Функция для создания маркера на карте
function createVenueMarker(venue) {
    const venueEvents = getVenueEvents(venue.id);
    const eventsCount = venueEvents.length;
    
    // Используем координаты из venue, если они есть, иначе используем примерные координаты Тирасполя
    const lat = venue.lat || (46.8403 + (Math.random() - 0.5) * 0.05);
    const lng = venue.lng || (29.6433 + (Math.random() - 0.5) * 0.05);
    
    const icon = createCustomIcon(venue, eventsCount);
    
    // Формируем краткую информацию для tooltip
    const tooltipContent = `
        <div class="venue-tooltip">
            <strong class="venue-tooltip__name">${venue.name}</strong>
            <div class="venue-tooltip__type" style="color: ${venueColors[venue.typeCategory]}">${venue.type}</div>
            ${venue.address ? `<div class="venue-tooltip__address">${venue.address}</div>` : ''}
            ${eventsCount > 0 ? `<div class="venue-tooltip__events">${eventsCount} ${eventsCount === 1 ? 'событие' : eventsCount < 5 ? 'события' : 'событий'}</div>` : ''}
        </div>
    `;
    
    const marker = L.marker([lat, lng], { icon: icon })
        .addTo(map)
        .bindTooltip(tooltipContent, {
            permanent: false,
            direction: 'top',
            offset: [0, -10],
            className: 'venue-tooltip-container',
            opacity: 1
        })
        .bindPopup(`
            <div style="text-align: center;">
                <strong>${venue.name}</strong><br>
                <small style="color: ${venueColors[venue.typeCategory]}">${venue.type}</small><br>
                ${eventsCount > 0 ? `<span>${eventsCount} событий</span>` : ''}
            </div>
        `);
    
    marker.venue = venue;
    marker.addEventListener('click', () => {
        openVenueModal(venue);
    });
    
    return marker;
}

// Функция для отображения всех маркеров
function renderMarkers(filterType = 'all') {
    // Удаляем все существующие маркеры
    markers.forEach(marker => {
        map.removeLayer(marker);
    });
    markers = [];
    
    // Фильтруем места
    const filteredVenues = filterType === 'all' 
        ? venues 
        : venues.filter(v => v.typeCategory === filterType);
    
    // Создаем маркеры
    filteredVenues.forEach(venue => {
        const marker = createVenueMarker(venue);
        markers.push(marker);
    });
    
    // Если есть маркеры, подгоняем карту под них
    if (markers.length > 0) {
        const group = new L.featureGroup(markers);
        map.fitBounds(group.getBounds().pad(0.1));
    }
}

// Функция для открытия модального окна с информацией о месте
function openVenueModal(venue) {
    const modal = document.getElementById('venueModal');
    const modalBody = document.getElementById('venueModalBody');
    
    if (!modal || !modalBody) return;
    
    const venueEvents = getVenueEvents(venue.id);
    const color = venueColors[venue.typeCategory] || '#666';
    
    // Формируем список событий
    const eventsHTML = venueEvents.length > 0
        ? venueEvents.map(event => `
            <li class="venue-events__item">
                <a href="${getPagePath('event.html')}?id=${event.id}" class="venue-events__link">
                    <span class="venue-events__title">${event.title}</span>
                    <span class="venue-events__date">${event.date}</span>
                </a>
            </li>
        `).join('')
        : '<li class="venue-events__item venue-events__item--empty">На этой площадке пока нет запланированных мероприятий</li>';
    
    modalBody.innerHTML = `
        <div class="venue-modal__header" style="border-left: 4px solid ${color};">
            <h2 id="venueModalTitle" class="venue-modal__title">${venue.name}</h2>
            <span class="venue-modal__type" style="color: ${color};">${venue.type}</span>
        </div>
        
        ${venue.image ? `
            <div class="venue-modal__image">
                <picture>
                    <source srcset="${venue.image.replace(/\.(jpg|jpeg|png)$/i, '.webp')}" type="image/webp">
                    <img src="${venue.image}" 
                         alt="${venue.name}" 
                         class="venue-modal__img"
                         loading="lazy"
                         decoding="async"
                         width="600"
                         height="300">
                </picture>
            </div>
        ` : ''}
        
        <div class="venue-modal__info">
            <div class="venue-info__section">
                <h3 class="venue-info__heading">Адрес</h3>
                <p class="venue-info__text">${venue.address}</p>
                ${venue.howToGet ? `<p class="venue-info__text venue-info__text--how-to-get">
                    <strong>Как добраться:</strong> ${venue.howToGet}
                </p>` : ''}
            </div>
            
            <div class="venue-info__section">
                <h3 class="venue-info__heading">Режим работы</h3>
                <pre class="venue-info__schedule">${venue.workingHours}</pre>
            </div>
            
            <div class="venue-info__section">
                <h3 class="venue-info__heading">Контакты</h3>
                ${venue.phone ? `<p class="venue-info__text">
                    <strong>Телефон:</strong> 
                    <a href="tel:${venue.phone.replace(/\s/g, '')}" class="venue-info__link">${venue.phone}</a>
                </p>` : ''}
                ${venue.website ? `<p class="venue-info__text">
                    <strong>Сайт:</strong> 
                    <a href="${venue.website}" target="_blank" rel="noopener noreferrer" class="venue-info__link">${venue.website}</a>
                </p>` : ''}
            </div>
            
            <div class="venue-info__section">
                <h3 class="venue-info__heading">Средняя стоимость входа</h3>
                <p class="venue-info__price">${venue.averagePrice}</p>
            </div>
            
            <div class="venue-info__section">
                <h3 class="venue-info__heading">О пространстве</h3>
                <p class="venue-info__description">${venue.description}</p>
            </div>
            
            <div class="venue-info__section">
                <h3 class="venue-info__heading">Текущие и предстоящие мероприятия (${venueEvents.length})</h3>
                <ul class="venue-events__list">
                    ${eventsHTML}
                </ul>
            </div>
        </div>
    `;
    
    // Показываем модальное окно
    modal.classList.add('venue-modal--active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    
    // Фокус на модальном окне для доступности
    const closeBtn = modal.querySelector('.venue-modal__close');
    if (closeBtn) {
        closeBtn.focus();
    }
}

// Функция для закрытия модального окна
function closeVenueModal() {
    const modal = document.getElementById('venueModal');
    if (!modal) return;
    
    modal.classList.remove('venue-modal--active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}

// Инициализация карты
function initMap() {
    // Создаем карту Leaflet (центр Тирасполя)
    map = L.map('map-container', {
        zoomControl: true,
        scrollWheelZoom: true
    }).setView([46.8403, 29.6433], 13);
    
    // Добавляем тайлы OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);
    
    // Рендерим все маркеры
    renderMarkers(activeTypeFilter);
    
    // Обработчики фильтров
    const filterButtons = document.querySelectorAll('.map-filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const filterType = btn.dataset.filter;
            activeTypeFilter = filterType;
            
            // Обновляем активные кнопки
            filterButtons.forEach(b => {
                const isActive = b.dataset.filter === filterType;
                b.classList.toggle('active', isActive);
                b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            });
            
            // Обновляем маркеры
            renderMarkers(filterType);
        });
    });
    
    // Обработчик закрытия модального окна
    const modal = document.getElementById('venueModal');
    const closeBtn = modal?.querySelector('.venue-modal__close');
    const overlay = modal?.querySelector('.venue-modal__overlay');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeVenueModal);
    }
    
    if (overlay) {
        overlay.addEventListener('click', closeVenueModal);
    }
    
    // Закрытие по Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeVenueModal();
        }
    });
}

// Запускаем инициализацию при загрузке DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMap);
} else {
    initMap();
}
