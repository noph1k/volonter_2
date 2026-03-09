const mapState = {
    direction: 'all',
    type: 'all',
    search: '',
    selectedVenueId: null,
    activeDistrict: 'all',
    scale: 1,
    modalEventId: null
};

const directionColorMap = {
    'Экология': '#17a46b',
    'Дети': '#2d7ef7',
    'Пожилые': '#ff9a1f',
    'Животные': '#e55362',
    'Городская среда': '#8d43da'
};

const venueDistrictMap = {
    1: 'Центр',
    2: 'Центр',
    3: 'Западный',
    4: 'Балка',
    5: 'Северный',
    6: 'Набережный',
    7: 'Южный',
    8: 'Балка',
    9: 'Западный'
};

const districtZoomMap = {
    all: { x: 0, y: 0, scale: 1 },
    'Западный': { x: 80, y: 120, scale: 1.28 },
    'Центр': { x: -20, y: 90, scale: 1.22 },
    'Северный': { x: -10, y: 170, scale: 1.26 },
    'Балка': { x: -160, y: 86, scale: 1.28 },
    'Южный': { x: -40, y: -10, scale: 1.26 },
    'Набережный': { x: -170, y: -26, scale: 1.24 }
};

function normalizeText(value) {
    return String(value || '').toLowerCase().trim();
}

function getVenueMapDistrict(venueId) {
    return venueDistrictMap[Number(venueId)] || 'Центр';
}

function getMapFilteredEvents() {
    return [...events]
        .filter(event => mapState.direction === 'all' || event.genre === mapState.direction)
        .filter(event => mapState.type === 'all' || event.type === mapState.type)
        .filter(event => mapState.activeDistrict === 'all' || getVenueMapDistrict(event.place.venueId) === mapState.activeDistrict)
        .filter(event => {
            if (!mapState.search) return true;
            const haystack = [
                event.title,
                event.description,
                event.genre,
                event.type,
                event.place.venueName,
                event.place.address,
                event.place.district,
                event.keywords,
                getVenueMapDistrict(event.place.venueId)
            ].join(' ').toLowerCase();
            return haystack.includes(mapState.search);
        })
        .sort((a, b) => new Date(a.dateStart) - new Date(b.dateStart));
}

function groupEventsByVenue(list) {
    const grouped = new Map();

    list.forEach(event => {
        const venueId = event.place.venueId;
        const venue = getVenueById(venueId);
        if (!venue || !venue.coordinates) return;

        if (!grouped.has(venueId)) {
            grouped.set(venueId, {
                venue,
                district: getVenueMapDistrict(venueId),
                events: []
            });
        }

        grouped.get(venueId).events.push(event);
    });

    return [...grouped.values()].sort((a, b) => new Date(a.events[0].dateStart) - new Date(b.events[0].dateStart));
}

function getSelectedVenueGroup() {
    const groups = groupEventsByVenue(getMapFilteredEvents());
    if (!groups.length) return null;
    return groups.find(group => group.venue.id === mapState.selectedVenueId) || groups[0];
}

function getNoun(count, one, few, many) {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
    return many;
}

function populateMapFilters() {
    const directionSelect = document.getElementById('mapDirectionFilter');
    const typeSelect = document.getElementById('mapTypeFilter');
    if (!directionSelect || !typeSelect) return;

    [...new Set(events.map(event => event.genre))].forEach(direction => {
        const option = document.createElement('option');
        option.value = direction;
        option.textContent = getDirectionMeta(direction).label;
        directionSelect.appendChild(option);
    });

    [...new Set(events.map(event => event.type))].forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        typeSelect.appendChild(option);
    });
}

function renderMapLegend() {
    const root = document.getElementById('mapLegend');
    if (!root) return;

    root.innerHTML = Object.entries(directionColorMap).map(([direction, color]) => `
        <span class="map-legend__item">
            <span class="map-legend__dot" style="background:${color}"></span>
            ${getDirectionMeta(direction).label}
        </span>
    `).join('');
}

function renderDistrictPills() {
    const root = document.getElementById('mapDistrictPills');
    if (!root) return;

    const districts = ['all', 'Западный', 'Центр', 'Северный', 'Балка', 'Южный', 'Набережный'];
    root.innerHTML = districts.map(district => `
        <button class="map-district-pill ${district === mapState.activeDistrict ? 'map-district-pill--active' : ''}" type="button" data-map-district-pill="${district}">
            ${district === 'all' ? 'Все районы' : district}
        </button>
    `).join('');
}

function updateMapCounters(groups, visibleEvents) {
    const venuesCount = document.getElementById('mapVisibleVenuesCount');
    const projectsCount = document.getElementById('mapVisibleProjectsCount');
    const selectionBadge = document.getElementById('mapSelectionBadge');
    const projectsBadge = document.getElementById('mapProjectsBadge');

    if (venuesCount) venuesCount.textContent = String(groups.length);
    if (projectsCount) projectsCount.textContent = String(visibleEvents.length);
    if (selectionBadge) selectionBadge.textContent = `${groups.length} ${getNoun(groups.length, 'точка', 'точки', 'точек')}`;
    if (projectsBadge) projectsBadge.textContent = `${visibleEvents.length} ${getNoun(visibleEvents.length, 'мероприятие', 'мероприятия', 'мероприятий')}`;
}

function getMarkerColor(group) {
    return directionColorMap[group.events[0]?.genre] || '#94a3b8';
}

function renderMarkers(groups) {
    const layer = document.getElementById('mapMarkersLayer');
    if (!layer) return;

    layer.innerHTML = groups.map(group => {
        const color = getMarkerColor(group);
        const { svgX, svgY } = group.venue.coordinates;
        const active = group.venue.id === mapState.selectedVenueId;
        return `
            <g class="map-marker ${active ? 'map-marker--active' : ''}" data-map-venue="${group.venue.id}" transform="translate(${svgX * 2.2} ${svgY * 1.72})" tabindex="0" role="button" aria-label="${group.venue.name}">
                <circle class="map-marker__pulse" r="34" fill="url(#markerPulse)"></circle>
                <circle class="map-marker__ring" r="24" fill="#ffffff" stroke="${color}" stroke-width="3"></circle>
                <circle class="map-marker__core" r="14" fill="${color}"></circle>
                <text class="map-marker__count" text-anchor="middle" dy="5">${group.events.length}</text>
            </g>
        `;
    }).join('');
}

function renderVenueList(groups) {
    const root = document.getElementById('mapVenueList');
    if (!root) return;

    if (!groups.length) {
        root.innerHTML = '<div class="empty-state"><strong>Точки не найдены</strong><p>Попробуй сбросить район или изменить фильтры.</p></div>';
        return;
    }

    root.innerHTML = groups.map(group => {
        const nearest = group.events[0];
        const active = group.venue.id === mapState.selectedVenueId;
        return `
            <article class="record-card map-venue-card ${active ? 'map-venue-card--active' : ''}" data-map-select="${group.venue.id}">
                <div>
                    <div class="record-card__line">
                        <span class="record-card__pill">${group.district}</span>
                        <span class="record-card__pill record-card__pill--soft">${group.events.length} ${getNoun(group.events.length, 'событие', 'события', 'событий')}</span>
                    </div>
                    <h3>${group.venue.name}</h3>
                    <p>${group.venue.address}</p>
                    <div class="record-card__details">
                        <span><strong>Ближайшая дата:</strong> ${nearest.date}</span>
                        <span><strong>Направление:</strong> ${getDirectionMeta(nearest.genre).label}</span>
                    </div>
                </div>
                <div class="record-card__actions">
                    <button class="button button--outline record-card__button" type="button" data-map-select="${group.venue.id}">Показать</button>
                </div>
            </article>
        `;
    }).join('');
}

function renderSelectedVenue(group) {
    const title = document.getElementById('mapVenueTitle');
    const subtitle = document.getElementById('mapVenueSubtitle');
    const meta = document.getElementById('mapVenueMeta');
    const projectsRoot = document.getElementById('mapVenueProjects');
    if (!title || !subtitle || !meta || !projectsRoot) return;

    if (!group) {
        title.textContent = 'Выбери точку на карте';
        subtitle.textContent = 'Кликни по маркеру или карточке площадки, чтобы увидеть связанные события.';
        meta.innerHTML = '';
        projectsRoot.innerHTML = '<div class="empty-state"><strong>Нет доступных точек</strong><p>По текущему фильтру ничего не найдено.</p></div>';
        return;
    }

    title.textContent = group.venue.name;
    subtitle.textContent = `${group.venue.address}. ${group.events.length} ${getNoun(group.events.length, 'событие', 'события', 'событий')} в этом районе.`;
    meta.innerHTML = `
        <span><strong>Район:</strong> ${group.district}</span>
        <span><strong>Координаты SVG:</strong> ${group.venue.coordinates.svgX}, ${group.venue.coordinates.svgY}</span>
    `;

    projectsRoot.innerHTML = group.events.map(event => {
        const state = getEventUserState(event.id);
        return `
            <article class="mini-project map-project-card">
                <div class="mini-project__top">
                    <span class="mini-project__tag">${getDirectionMeta(event.genre).label}</span>
                    <span class="record-card__pill record-card__pill--soft">${event.status}</span>
                </div>
                <div class="project-card__user-statuses">${buildStatusLabels(event.id).map(label => `<span class="project-status project-status--${label.key}">${label.text}</span>`).join('')}</div>
                <h3>${event.title}</h3>
                <p>${event.description.slice(0, 150)}...</p>
                <div class="record-card__details">
                    <span><strong>Дата:</strong> ${event.date}</span>
                    <span><strong>Формат:</strong> ${event.type}</span>
                    <span><strong>Свободно:</strong> ${event.freeSpots} мест</span>
                </div>
                <div class="catalog-card__actions catalog-card__actions--stack">
                    <button class="button button--outline record-card__button" type="button" data-map-open-event="${event.id}">Подробнее</button>
                    <button class="button ${state.favorite ? 'button--ghost-dark' : 'button--primary'} record-card__button" type="button" data-map-favorite="${event.id}">${state.favorite ? 'Убрать из избранного' : 'В избранное'}</button>
                    <button class="button ${state.registered ? 'button--ghost-dark' : 'button--primary'} record-card__button" type="button" data-map-register="${event.id}">${state.registered ? 'Отменить запись' : 'Записаться'}</button>
                </div>
            </article>
        `;
    }).join('');
}

function renderMapTooltip(group, clientX, clientY) {
    const tooltip = document.getElementById('mapTooltip');
    if (!tooltip || !group) return;

    const first = group.events[0];
    tooltip.innerHTML = `
        <strong>${first.title}</strong>
        <span>${first.date}</span>
        <span>${group.venue.address}</span>
    `;
    tooltip.hidden = false;
    tooltip.style.left = `${clientX + 16}px`;
    tooltip.style.top = `${clientY - 18}px`;
}

function hideMapTooltip() {
    const tooltip = document.getElementById('mapTooltip');
    if (tooltip) tooltip.hidden = true;
}

function syncSelectedVenue(groups) {
    if (!groups.length) {
        mapState.selectedVenueId = null;
        return;
    }
    if (!groups.some(group => group.venue.id === mapState.selectedVenueId)) {
        mapState.selectedVenueId = groups[0].venue.id;
    }
}

function renderDistrictState(groups) {
    document.querySelectorAll('[data-district]').forEach(node => {
        const name = node.dataset.district;
        const hasEvents = groups.some(group => group.district === name);
        node.classList.toggle('city-map__district--active', mapState.activeDistrict === name);
        node.classList.toggle('city-map__district--muted', mapState.activeDistrict !== 'all' && mapState.activeDistrict !== name);
        node.classList.toggle('city-map__district--empty', !hasEvents);
    });
    renderDistrictPills();
}

function applyMapZoom() {
    const scene = document.getElementById('mapScene');
    if (!scene) return;
    const preset = districtZoomMap[mapState.activeDistrict] || districtZoomMap.all;
    const scale = Number((preset.scale * mapState.scale).toFixed(2));
    scene.style.transform = `translate(${preset.x}px, ${preset.y}px) scale(${scale})`;
}

function openMapModal(eventId) {
    const event = getEventById(eventId);
    const modal = document.getElementById('mapEventModal');
    if (!event || !modal) return;

    mapState.modalEventId = Number(eventId);
    const media = document.getElementById('mapModalMedia');
    const meta = document.getElementById('mapModalMeta');
    const title = document.getElementById('mapModalTitle');
    const description = document.getElementById('mapModalDescription');
    const details = document.getElementById('mapModalDetails');
    const actions = document.getElementById('mapModalActions');
    const userState = getEventUserState(event.id);

    if (media) media.innerHTML = `<img src="${event.photos[0]}" alt="${event.title}" loading="lazy">`;
    if (meta) meta.innerHTML = `<span>${getDirectionMeta(event.genre).label}</span><span>${event.type}</span><span>${event.status}</span>`;
    if (title) title.textContent = event.title;
    if (description) description.textContent = event.description;
    if (details) {
        details.innerHTML = `
            <span><strong>Дата:</strong> ${event.date}</span>
            <span><strong>Адрес:</strong> ${event.place.address}</span>
            <span><strong>Организатор:</strong> ${event.organizer.name}</span>
            <span><strong>Контакт:</strong> ${event.organizer.phone}</span>
            <span><strong>Свободно:</strong> ${event.freeSpots} мест</span>
        `;
    }
    if (actions) {
        actions.innerHTML = `
            <a class="button button--outline" href="event.html?id=${event.id}">Страница проекта</a>
            <button class="button ${userState.favorite ? 'button--ghost-dark' : 'button--primary'}" type="button" data-map-favorite="${event.id}">${userState.favorite ? 'Убрать из избранного' : 'В избранное'}</button>
            <button class="button ${userState.registered ? 'button--ghost-dark' : 'button--primary'}" type="button" data-map-register="${event.id}">${userState.registered ? 'Отменить запись' : 'Записаться'}</button>
        `;
    }

    modal.hidden = false;
    document.body.classList.add('page-modal-open');
}

function closeMapModal() {
    const modal = document.getElementById('mapEventModal');
    if (!modal) return;
    modal.hidden = true;
    mapState.modalEventId = null;
    document.body.classList.remove('page-modal-open');
}

function renderMapScene() {
    const visibleEvents = getMapFilteredEvents();
    const groups = groupEventsByVenue(visibleEvents);
    syncSelectedVenue(groups);
    updateMapCounters(groups, visibleEvents);
    renderDistrictState(groups);
    renderMarkers(groups);
    renderVenueList(groups);
    renderSelectedVenue(getSelectedVenueGroup());
    applyMapZoom();
}

function bindMapFilters() {
    document.getElementById('mapDirectionFilter')?.addEventListener('change', event => {
        mapState.direction = event.target.value;
        renderMapScene();
    });

    document.getElementById('mapTypeFilter')?.addEventListener('change', event => {
        mapState.type = event.target.value;
        renderMapScene();
    });

    document.getElementById('mapSearchInput')?.addEventListener('input', event => {
        mapState.search = normalizeText(event.target.value);
        renderMapScene();
    });
}

function initMapEvents() {
    document.addEventListener('click', event => {
        const districtButton = event.target.closest('[data-map-district-pill]');
        if (districtButton) {
            mapState.activeDistrict = districtButton.dataset.mapDistrictPill;
            renderMapScene();
            return;
        }

        const district = event.target.closest('[data-district]');
        if (district) {
            const next = district.dataset.district;
            mapState.activeDistrict = mapState.activeDistrict === next ? 'all' : next;
            renderMapScene();
            return;
        }

        const marker = event.target.closest('[data-map-venue]');
        if (marker) {
            mapState.selectedVenueId = Number(marker.dataset.mapVenue);
            const group = getSelectedVenueGroup();
            if (group?.events?.[0]) openMapModal(group.events[0].id);
            renderMapScene();
            return;
        }

        const selectTrigger = event.target.closest('[data-map-select]');
        if (selectTrigger) {
            mapState.selectedVenueId = Number(selectTrigger.dataset.mapSelect);
            renderMapScene();
            return;
        }

        const openEvent = event.target.closest('[data-map-open-event]');
        if (openEvent) {
            openMapModal(Number(openEvent.dataset.mapOpenEvent));
            return;
        }

        const favorite = event.target.closest('[data-map-favorite]');
        if (favorite) {
            toggleFavorite(Number(favorite.dataset.mapFavorite));
            renderMapScene();
            if (mapState.modalEventId) openMapModal(mapState.modalEventId);
            return;
        }

        const register = event.target.closest('[data-map-register]');
        if (register) {
            toggleEventRegistration(Number(register.dataset.mapRegister));
            renderMapScene();
            if (mapState.modalEventId) openMapModal(mapState.modalEventId);
            return;
        }

        if (event.target.closest('[data-map-modal-close]')) {
            closeMapModal();
        }
    });

    document.addEventListener('mouseover', event => {
        const marker = event.target.closest('[data-map-venue]');
        if (!marker) return;
        const groups = groupEventsByVenue(getMapFilteredEvents());
        const group = groups.find(item => item.venue.id === Number(marker.dataset.mapVenue));
        if (group) renderMapTooltip(group, event.clientX, event.clientY);
    });

    document.addEventListener('mousemove', event => {
        const marker = event.target.closest('[data-map-venue]');
        const tooltip = document.getElementById('mapTooltip');
        if (!marker || !tooltip || tooltip.hidden) return;
        tooltip.style.left = `${event.clientX + 16}px`;
        tooltip.style.top = `${event.clientY - 18}px`;
    });

    document.addEventListener('mouseout', event => {
        if (event.target.closest('[data-map-venue]')) hideMapTooltip();
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') closeMapModal();

        const marker = event.target.closest('[data-map-venue]');
        if (!marker) return;
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        mapState.selectedVenueId = Number(marker.dataset.mapVenue);
        const group = getSelectedVenueGroup();
        if (group?.events?.[0]) openMapModal(group.events[0].id);
        renderMapScene();
    });
}

function initMapZoom() {
    document.getElementById('mapZoomIn')?.addEventListener('click', () => {
        mapState.scale = Math.min(1.7, Number((mapState.scale + 0.12).toFixed(2)));
        applyMapZoom();
    });

    document.getElementById('mapZoomOut')?.addEventListener('click', () => {
        mapState.scale = Math.max(0.88, Number((mapState.scale - 0.12).toFixed(2)));
        applyMapZoom();
    });

    document.getElementById('mapZoomReset')?.addEventListener('click', () => {
        mapState.scale = 1;
        mapState.activeDistrict = 'all';
        renderMapScene();
    });
}

document.addEventListener('DOMContentLoaded', () => {
    populateMapFilters();
    renderMapLegend();
    renderDistrictPills();
    bindMapFilters();
    initMapEvents();
    initMapZoom();
    renderMapScene();
});
