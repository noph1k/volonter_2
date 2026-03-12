const PROJECT_REGISTRATION_FORMS_KEY = 'eventRegistrationForms';
const VOLUNTEER_APPLICATIONS_KEY = 'volunteerApplications';

const eventsState = {
    genre: 'all',
    type: 'all',
    sort: 'date',
    search: '',
    activeEventId: null,
    registrationEventId: null
};

let projectModalCleanup = null;
let registrationModalCleanup = null;

function closestTarget(target, selector) {
    if (!target || !selector) return null;
    if (target instanceof Element) return target.closest(selector);
    if (target.parentElement) return target.parentElement.closest(selector);
    return null;
}

function getFilteredEvents() {
    const filtered = [...events]
        .filter(event => eventsState.genre === 'all' || event.genre === eventsState.genre)
        .filter(event => eventsState.type === 'all' || event.type === eventsState.type)
        .filter(event => {
            if (!eventsState.search) return true;
            const haystack = [event.title, event.description, event.keywords, event.place.venueName, event.place.address].join(' ').toLowerCase();
            return haystack.includes(eventsState.search);
        });

    if (eventsState.sort === 'popularity') {
        return filtered.sort((a, b) => b.popularity - a.popularity);
    }
    if (eventsState.sort === 'spots') {
        return filtered.sort((a, b) => b.freeSpots - a.freeSpots);
    }
    return filtered.sort((a, b) => new Date(a.dateStart) - new Date(b.dateStart));
}

function getStoredRegistrationForms() {
    return parseStoredJSON(PROJECT_REGISTRATION_FORMS_KEY, {});
}

function saveStoredRegistrationForms(value) {
    localStorage.setItem(PROJECT_REGISTRATION_FORMS_KEY, JSON.stringify(value));
}

function saveProjectRegistrationForm(eventId, payload) {
    const store = getStoredRegistrationForms();
    store[String(eventId)] = {
        ...payload,
        eventId: Number(eventId),
        createdAt: new Date().toISOString()
    };
    saveStoredRegistrationForms(store);
}


function loadVolunteerApplications() {
    return parseStoredJSON(VOLUNTEER_APPLICATIONS_KEY, []);
}

function saveVolunteerApplications(list) {
    localStorage.setItem(VOLUNTEER_APPLICATIONS_KEY, JSON.stringify(list));
}

function upsertVolunteerApplication(eventId, payload) {
    const eventItem = getEventById(eventId);
    if (!eventItem) return;

    const next = loadVolunteerApplications().filter(item => {
        return !(Number(item.eventId) === Number(eventId) && String(item.email || '').toLowerCase() === payload.email.toLowerCase());
    });

    next.unshift({
        id: Date.now(),
        createdAt: new Date().toISOString(),
        firstName: payload.firstName,
        lastName: payload.lastName,
        phone: payload.phone,
        email: payload.email,
        preferredDirection: payload.preferredDirection || eventItem.genre,
        availabilityDay: ['По согласованию'],
        availabilitySlot: ['По согласованию'],
        skills: ['Уточняются'],
        eventId: Number(eventId),
        source: 'events-catalog'
    });

    saveVolunteerApplications(next);
}
function populateProjectFilters() {
    const genreSelect = document.getElementById('eventsGenreFilter');
    const typeSelect = document.getElementById('eventsTypeFilter');

    if (!genreSelect || !typeSelect) return;

    [...new Set(events.map(event => event.genre))].forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = getDirectionMeta(value).label;
        genreSelect.appendChild(option);
    });

    [...new Set(events.map(event => event.type))].forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        typeSelect.appendChild(option);
    });
}

function renderProjectGrid() {
    const root = document.getElementById('eventsGrid');
    const badge = document.getElementById('eventsCountBadge');
    const list = getFilteredEvents();

    if (!root || !badge) return;

    badge.textContent = `${list.length} ${list.length === 1 ? 'проект' : list.length < 5 ? 'проекта' : 'проектов'}`;

    if (!list.length) {
        root.innerHTML = '<div class="empty-state"><strong>Проекты не найдены</strong><p>Попробуй изменить фильтры или сбросить поисковый запрос.</p></div>';
        return;
    }

    root.innerHTML = list.map(item => {
        const state = getEventUserState(item.id);
        const direction = getDirectionMeta(item.genre);
        const isPast = new Date(item.dateStart) < new Date();
        const status = isPast ? '\u0417\u0430\u0432\u0435\u0440\u0448\u0451\u043d' : item.status;
        return `
            <article class="catalog-card catalog-card_interactive" data-project-card="${item.id}" tabindex="0" aria-label="Открыть проект ${item.title}">
                <img class="catalog-card__image" src="${item.photos[0]}" alt="${item.title}" loading="lazy">
                <div class="catalog-card__body">
                    <div class="catalog-card__status-row">
                        <span class="record-card__pill">${direction.label}</span>
                        <span class="record-card__pill record-card__pill_soft">${status}</span>
                    </div>
                    <div class="project-card__user-statuses">${buildStatusLabels(item.id).map(label => `<span class="project-status project-status_${label.key}">${label.text}</span>`).join('')}</div>
                    <h3>${item.title}</h3>
                    <p>${item.description.slice(0, 220)}...</p>
                    <div class="record-card__details">
                        <span><strong>Формат:</strong> ${item.type}</span>
                        <span><strong>Дата:</strong> ${item.date}</span>
                        <span><strong>Организатор:</strong> ${item.organizer.name}</span>
                        <span><strong>Место:</strong> ${item.place.venueName || item.place.address}</span>
                        <span><strong>Свободно:</strong> ${item.freeSpots} мест</span>
                    </div>
                    <div class="catalog-card__actions">
                        <button class="button button_outline record-card__button" type="button" data-project-open="${item.id}">Подробнее</button>
                        <button class="button ${state.favorite ? 'button_ghost-dark' : 'button_primary'} record-card__button" type="button" data-project-favorite="${item.id}">${state.favorite ? 'Убрать из избранного' : 'В избранное'}</button>
                    </div>
                </div>
            </article>
        `;
    }).join('');
}

function renderProjectModal(eventId) {
    const item = getEventById(eventId);
    const body = document.getElementById('projectModalBody');
    if (!item || !body) return;

    const state = getEventUserState(item.id);
    body.innerHTML = `
        <p class="portal-modal__eyebrow">${getDirectionMeta(item.genre).label}</p>
        <h3 id="projectModalTitle" class="portal-modal__title">${item.title}</h3>
        <p class="portal-modal__description">${item.description}</p>
        <div class="modal-meta-grid">
            <span><strong>Дата:</strong> ${item.date}</span>
            <span><strong>Формат:</strong> ${item.type}</span>
            <span><strong>Место:</strong> ${item.place.venueName || item.place.address}</span>
            <span><strong>Организатор:</strong> ${item.organizer.name}</span>
            <span><strong>Контакт:</strong> ${item.organizer.phone}</span>
            <span><strong>Свободно:</strong> ${item.freeSpots} мест</span>
        </div>
        <div class="modal-meta-grid modal-meta-grid_requirements">
            <span><strong>Возраст:</strong> ${item.requirements.age}</span>
            <span><strong>Навыки:</strong> ${item.requirements.skills.join(', ')}</span>
            <span><strong>Что взять:</strong> ${item.requirements.equipment.join(', ')}</span>
        </div>
        <div class="catalog-card__actions catalog-card__actions_stack">
            <button class="button ${state.registered ? 'button_ghost-dark' : 'button_primary'}" type="button" data-project-register-open="${item.id}">${state.registered ? 'Изменить регистрацию' : 'Записаться'}</button>
            <button class="button ${state.favorite ? 'button_ghost-dark' : 'button_primary'}" type="button" data-project-favorite="${item.id}">${state.favorite ? 'Убрать из избранного' : 'В избранное'}</button>
            <a class="button button_outline" href="event.html?id=${item.id}">Открыть страницу проекта</a>
        </div>
    `;
}

function openProjectModal(eventId) {
    const modal = document.getElementById('projectModal');
    if (!modal) return;
    eventsState.activeEventId = Number(eventId);
    renderProjectModal(eventsState.activeEventId);
    modal.classList.add('portal-modal_open');
    modal.setAttribute('aria-hidden', 'false');
    modal.style.display = 'block';
    document.body.classList.add('page-modal-open');

    if (projectModalCleanup) projectModalCleanup();
    projectModalCleanup = trapFocusInModal(modal, {
        onEscape: closeProjectModal,
        initialFocusSelector: '[data-project-modal-close]'
    });
}

function closeProjectModal() {
    const modal = document.getElementById('projectModal');
    if (!modal) return;
    modal.classList.remove('portal-modal_open');
    modal.setAttribute('aria-hidden', 'true');
    modal.style.display = '';
    eventsState.activeEventId = null;
    if (!eventsState.registrationEventId) document.body.classList.remove('page-modal-open');

    if (projectModalCleanup) {
        const cleanup = projectModalCleanup;
        projectModalCleanup = null;
        cleanup();
    }
}

function openRegistrationModal(eventId) {
    const item = getEventById(eventId);
    const modal = document.getElementById('projectRegistrationModal');
    const title = document.getElementById('projectRegistrationTitle');
    const subtitle = document.getElementById('projectRegistrationEvent');
    const form = document.getElementById('projectRegistrationForm');
    const eventInput = document.getElementById('projectRegistrationEventId');
    const message = document.getElementById('projectRegistrationMessage');
    if (!item || !modal || !title || !subtitle || !form || !eventInput || !message) return;

    eventsState.registrationEventId = Number(eventId);
    title.textContent = 'Регистрация на проект';
    subtitle.textContent = item.title;
    eventInput.value = String(item.id);
    message.textContent = '';
    message.className = 'form-message';

    const saved = getStoredRegistrationForms()[String(item.id)];
    form.reset();
    if (saved) {
        form.elements.firstName.value = saved.firstName || '';
        form.elements.lastName.value = saved.lastName || '';
        form.elements.phone.value = saved.phone || '';
        form.elements.email.value = saved.email || '';
        form.elements.comment.value = saved.comment || '';
    }

    modal.classList.add('portal-modal_open');
    modal.setAttribute('aria-hidden', 'false');
    modal.style.display = 'block';
    document.body.classList.add('page-modal-open');

    if (registrationModalCleanup) registrationModalCleanup();
    registrationModalCleanup = trapFocusInModal(modal, {
        onEscape: closeRegistrationModal,
        initialFocusSelector: '[data-project-registration-close]'
    });
}

function closeRegistrationModal() {
    const modal = document.getElementById('projectRegistrationModal');
    if (!modal) return;
    modal.classList.remove('portal-modal_open');
    modal.setAttribute('aria-hidden', 'true');
    modal.style.display = '';
    eventsState.registrationEventId = null;
    if (!eventsState.activeEventId) document.body.classList.remove('page-modal-open');

    if (registrationModalCleanup) {
        const cleanup = registrationModalCleanup;
        registrationModalCleanup = null;
        cleanup();
    }
}

function submitProjectRegistration(form) {
    const message = document.getElementById('projectRegistrationMessage');
    const eventId = Number(form.elements.eventId.value);
    const payload = {
        firstName: String(form.elements.firstName.value || '').trim(),
        lastName: String(form.elements.lastName.value || '').trim(),
        phone: String(form.elements.phone.value || '').trim(),
        email: String(form.elements.email.value || '').trim(),
        preferredDirection: getEventById(eventId)?.genre || '',
        comment: String(form.elements.comment.value || '').trim()
    };

    if (!payload.firstName || !payload.lastName || !payload.phone || !payload.email) {
        message.textContent = 'Заполни имя, фамилию, телефон и email.';
        message.className = 'form-message form-message_error';
        return;
    }

    if (!isMoldovaPhone(payload.phone)) {
        message.textContent = 'Телефон должен начинаться с +373.';
        message.className = 'form-message form-message_error';
        return;
    }

    saveProjectRegistrationForm(eventId, payload);
    registerForEvent(eventId);
    upsertVolunteerApplication(eventId, payload);

    message.textContent = 'Заявка сохранена. Регистрация на проект оформлена.';
    message.className = 'form-message form-message_success';

    renderProjectGrid();
    if (eventsState.activeEventId === eventId) renderProjectModal(eventId);

    window.setTimeout(() => {
        closeRegistrationModal();
        if (eventsState.activeEventId === eventId) closeProjectModal();
    }, 900);
}

function initProjectModals() {
    const form = document.getElementById('projectRegistrationForm');
    if (form) {
        form.addEventListener('submit', event => {
            event.preventDefault();
            submitProjectRegistration(form);
        });
    }

    document.addEventListener('click', event => {
        const card = closestTarget(event.target, '[data-project-card]');
        if (card && !closestTarget(event.target, 'button, a, input, select, textarea, label')) {
            openProjectModal(Number(card.dataset.projectCard));
            return;
        }

        const open = closestTarget(event.target, '[data-project-open]');
        if (open) {
            openProjectModal(Number(open.dataset.projectOpen));
            return;
        }

        const favorite = closestTarget(event.target, '[data-project-favorite]');
        if (favorite) {
            const id = Number(favorite.dataset.projectFavorite);
            toggleFavorite(id);
            renderProjectGrid();
            if (eventsState.activeEventId === id) renderProjectModal(id);
            return;
        }

        const registerOpen = closestTarget(event.target, '[data-project-register-open]');
        if (registerOpen) {
            openRegistrationModal(Number(registerOpen.dataset.projectRegisterOpen));
            return;
        }

        if (closestTarget(event.target, '[data-project-modal-close]')) {
            closeProjectModal();
            return;
        }

        if (closestTarget(event.target, '[data-project-registration-close]')) {
            closeRegistrationModal();
        }
    }, true);

    document.addEventListener('keydown', event => {
        const card = closestTarget(event.target, '[data-project-card]');
        if (card && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            openProjectModal(Number(card.dataset.projectCard));
            return;
        }

        if (event.key === 'Escape') {
            closeRegistrationModal();
            closeProjectModal();
        }
    });
}

function initEventsPage() {
    populateProjectFilters();
    initProjectModals();

    const params = new URLSearchParams(window.location.search);
    const direction = params.get('direction');
    if (direction) eventsState.genre = direction;

    document.getElementById('eventsGenreFilter').value = eventsState.genre;
    document.getElementById('eventsGenreFilter').addEventListener('change', event => {
        eventsState.genre = event.target.value;
        renderProjectGrid();
    });
    document.getElementById('eventsTypeFilter').addEventListener('change', event => {
        eventsState.type = event.target.value;
        renderProjectGrid();
    });
    document.getElementById('eventsSortFilter').addEventListener('change', event => {
        eventsState.sort = event.target.value;
        renderProjectGrid();
    });
    document.getElementById('eventsSearch').addEventListener('input', event => {
        eventsState.search = event.target.value.trim().toLowerCase();
        renderProjectGrid();
    });

    renderProjectGrid();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEventsPage);
} else {
    initEventsPage();
}












