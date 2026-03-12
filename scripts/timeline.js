const timelineState = { genre: 'all', type: 'all', mode: 'nearest' };
let timelineChart = null;
let timelineModalCleanup = null;

function parseEventDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function getUpcomingEvents() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return [...events].filter(item => parseEventDate(item.dateStart) && parseEventDate(item.dateStart) >= today).sort((a, b) => parseEventDate(a.dateStart) - parseEventDate(b.dateStart));
}

function getTimelineItems() {
    return getUpcomingEvents().filter(item => (timelineState.genre === 'all' || item.genre === timelineState.genre) && (timelineState.type === 'all' || item.type === timelineState.type));
}

function populateFilter(selectId, property) {
    const select = document.getElementById(selectId);
    [...new Set(events.map(item => item[property]).filter(Boolean))].forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = property === 'genre' ? getDirectionMeta(value).label : value;
        select.appendChild(option);
    });
}

function renderTimelineList(list) {
    const root = document.getElementById('timelineList');
    if (!list.length) {
        root.innerHTML = '<div class="empty-state"><strong>Ничего не найдено</strong><p>Смени фильтры или вернись к полному списку направлений.</p></div>';
        return;
    }
    root.innerHTML = list.map(item => {
        const tone = getDirectionMeta(item.genre).tone;
        return `
            <article class="timeline-entry timeline-entry_${tone}" data-event-id="${item.id}" tabindex="0" role="button">
                <div class="timeline-entry__marker"></div>
                <div class="timeline-entry__body">
                    <div class="timeline-entry__topline"><span class="timeline-entry__date">${item.date}</span><span class="timeline-entry__format">${item.type}</span></div>
                    <div class="project-card__user-statuses">${buildStatusLabels(item.id).map(label => `<span class="project-status project-status_${label.key}">${label.text}</span>`).join('')}</div>
                    <h3>${item.title}</h3>
                    <p>${item.description.slice(0, 180)}...</p>
                    <div class="timeline-entry__meta"><span>${getDirectionMeta(item.genre).label}</span><span>${item.place.venueName || item.place.address}</span><span>${item.freeSpots} мест</span></div>
                </div>
                <span class="timeline-entry__arrow">→</span>
            </article>
        `;
    }).join('');
}

function renderTimelineChart(list) {
    const canvas = document.getElementById('timelineMonthsChart');
    if (!canvas || typeof Chart === 'undefined') return;
    const grouped = list.reduce((acc, item) => {
        const date = parseEventDate(item.dateStart);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});
    const labels = Object.keys(grouped).sort();
    if (timelineChart) timelineChart.destroy();
    timelineChart = new Chart(canvas.getContext('2d'), { type: 'bar', data: { labels: labels.map(label => new Date(label + '-01').toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })), datasets: [{ data: labels.map(label => grouped[label]), borderRadius: 12, backgroundColor: ['#ff7a00', '#00a39a', '#8e36d8', '#1d7ff2', '#ffb341', '#ff7a00'] }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { stepSize: 1 } } } } });
}

function renderModal(item) {
    const state = getEventUserState(item.id);
    document.getElementById('timelineModalBody').innerHTML = `
        <p class="portal-modal__eyebrow">${getDirectionMeta(item.genre).label}</p>
        <h3 id="timelineModalTitle" class="portal-modal__title">${item.title}</h3>
        <div class="modal-meta-grid"><span><strong>Дата:</strong> ${item.date}</span><span><strong>Формат:</strong> ${item.type}</span><span><strong>Место:</strong> ${item.place.venueName || item.place.address}</span><span><strong>Организатор:</strong> ${item.organizer.name}</span></div>
        <p class="portal-modal__description">${item.description}</p>
        <div class="catalog-card__actions catalog-card__actions_stack"><button class="button ${state.favorite ? 'button_ghost-dark' : 'button_primary'}" type="button" data-modal-favorite="${item.id}">${state.favorite ? 'Убрать из избранного' : 'В избранное'}</button><button class="button ${state.registered ? 'button_ghost-dark' : 'button_primary'}" type="button" data-modal-register="${item.id}">${state.registered ? 'Отменить запись' : 'Записаться'}</button><a class="button button_outline" href="event.html?id=${item.id}">Открыть проект</a></div>
    `;
}

function syncMode() {
    document.querySelectorAll('[data-timeline-mode]').forEach(button => button.classList.toggle('timeline-switch__btn_active', button.dataset.timelineMode === timelineState.mode));
    document.getElementById('timelineNearestPanel').classList.toggle('timeline-panel_active', timelineState.mode === 'nearest');
    document.getElementById('timelineMonthsPanel').classList.toggle('timeline-panel_active', timelineState.mode === 'months');
}

function updateTimeline() {
    const list = getTimelineItems();
    document.getElementById('timelineCount').textContent = `Найдено мероприятий: ${list.length}`;
    document.getElementById('timelineHint').textContent = list.length ? `Показано ${list.length} мероприятий. Нажми на карточку для подробностей.` : 'Нет мероприятий по этим параметрам.';
    renderTimelineList(list);
    renderTimelineChart(list);
    syncMode();
}

function openModal() {
    const modal = document.getElementById('timelineModal');
    if (!modal) return;
    modal.classList.add('portal-modal_open');
    modal.setAttribute('aria-hidden', 'false');

    if (timelineModalCleanup) timelineModalCleanup();
    timelineModalCleanup = trapFocusInModal(modal, {
        onEscape: closeModal,
        initialFocusSelector: '[data-timeline-modal-close]'
    });
}
function closeModal() {
    const modal = document.getElementById('timelineModal');
    if (!modal) return;
    modal.classList.remove('portal-modal_open');
    modal.setAttribute('aria-hidden', 'true');

    if (timelineModalCleanup) {
        const cleanup = timelineModalCleanup;
        timelineModalCleanup = null;
        cleanup();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    populateFilter('timelineGenreFilter', 'genre');
    populateFilter('timelineTypeFilter', 'type');
    document.getElementById('timelineGenreFilter').addEventListener('change', event => { timelineState.genre = event.target.value; updateTimeline(); });
    document.getElementById('timelineTypeFilter').addEventListener('change', event => { timelineState.type = event.target.value; updateTimeline(); });
    document.querySelectorAll('[data-timeline-mode]').forEach(button => button.addEventListener('click', () => { timelineState.mode = button.dataset.timelineMode; syncMode(); }));
    updateTimeline();
});

document.addEventListener('click', event => {
    const entry = getClosestTarget(event.target, '[data-event-id]');
    if (entry) {
        const item = getEventById(Number(entry.dataset.eventId));
        if (item) { renderModal(item); openModal(); }
    }
    const fav = getClosestTarget(event.target, '[data-modal-favorite]');
    if (fav) {
        const id = Number(fav.dataset.modalFavorite); toggleFavorite(id); renderModal(getEventById(id)); updateTimeline();
    }
    const reg = getClosestTarget(event.target, '[data-modal-register]');
    if (reg) {
        const id = Number(reg.dataset.modalRegister); toggleEventRegistration(id); renderModal(getEventById(id)); updateTimeline();
    }
    if (getClosestTarget(event.target, '[data-timeline-modal-close]')) closeModal();
});

document.addEventListener('keydown', event => { if (event.key === 'Escape') closeModal(); });
