const PROJECT_REGISTRATION_FORMS_KEY = 'eventRegistrationForms';
const VOLUNTEER_APPLICATIONS_KEY = 'volunteerApplications';

let detailRegistrationCleanup = null;
let detailSuccessCleanup = null;

function getEventIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return Number(params.get('id'));
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

    const list = loadVolunteerApplications().filter(item => {
        return !(Number(item.eventId) === Number(eventId) && String(item.email || '').toLowerCase() === payload.email.toLowerCase());
    });

    list.unshift({
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
        source: 'event-detail'
    });

    saveVolunteerApplications(list);
}

function renderEventDetail() {
    const root = document.getElementById('eventDetailRoot');
    if (!root) return;
    const eventId = getEventIdFromURL();
    const event = getEventById(eventId);
    if (!event) {
        root.innerHTML = '<div class="empty-state"><strong>Проект не найден</strong><p>Вернись в каталог и выбери другой проект.</p></div>';
        return;
    }

    const direction = getDirectionMeta(event.genre);
    const state = getEventUserState(event.id);
    const gallery = event.photos.slice(1).map(photo => `<img src="${photo}" alt="${event.title}" loading="lazy">`).join('');

    root.innerHTML = `
        <article class="event-detail-card">
            <div class="event-detail-card__hero">
                <img class="event-detail-card__image" src="${event.photos[0]}" alt="${event.title}">
                <div class="event-detail-card__overlay">
                    <div class="project-card__user-statuses">${buildStatusLabels(event.id).map(label => `<span class="project-status project-status--${label.key}">${label.text}</span>`).join('')}</div>
                    <span class="record-card__pill">${direction.label}</span>
                    <h1>${event.title}</h1>
                    <p>${event.description}</p>
                </div>
            </div>
            <div class="event-detail-card__body">
                <div class="event-detail-card__grid">
                    <section class="surface-card surface-card--compact">
                        <div class="surface-card__head"><p class="surface-card__kicker">Основное</p><h2>О проекте</h2></div>
                        <div class="record-card__details">
                            <span><strong>Формат:</strong> ${event.type}</span>
                            <span><strong>Дата и время:</strong> ${event.date}</span>
                            <span><strong>Статус набора:</strong> ${event.status}</span>
                            <span><strong>Свободных мест:</strong> ${event.freeSpots}</span>
                            <span><strong>Адрес:</strong> ${event.place.venueName || event.place.address}, ${event.place.address}</span>
                            <span><strong>Координаты SVG:</strong> ${event.place.coordinates.svgX}, ${event.place.coordinates.svgY}</span>
                        </div>
                    </section>
                    <section class="surface-card surface-card--compact">
                        <div class="surface-card__head"><p class="surface-card__kicker">Контакты</p><h2>Организатор</h2></div>
                        <div class="record-card__details">
                            <span><strong>Имя:</strong> ${event.organizer.name}</span>
                            <span><strong>Телефон:</strong> ${event.organizer.phone}</span>
                            <span><strong>Email:</strong> ${event.organizer.email}</span>
                        </div>
                    </section>
                    <section class="surface-card surface-card--compact">
                        <div class="surface-card__head"><p class="surface-card__kicker">Требования</p><h2>Что важно участнику</h2></div>
                        <div class="record-card__details">
                            <span><strong>Возраст:</strong> ${event.requirements.age}</span>
                            <span><strong>Навыки:</strong> ${event.requirements.skills.join(', ')}</span>
                            <span><strong>Экипировка:</strong> ${event.requirements.equipment.join(', ')}</span>
                        </div>
                    </section>
                    <section class="surface-card surface-card--compact">
                        <div class="surface-card__head"><p class="surface-card__kicker">Действия</p><h2>Управление статусом</h2></div>
                        <div class="catalog-card__actions catalog-card__actions--stack">
                            <button class="button ${state.favorite ? 'button--ghost-dark' : 'button--primary'} record-card__button" type="button" data-detail-favorite="${event.id}">${state.favorite ? 'Убрать из избранного' : 'Добавить в избранное'}</button>
                            <button class="button button--primary record-card__button" type="button" data-detail-register-open="${event.id}">${state.registered ? 'Изменить заявку' : 'Записаться на проект'}</button>
                            ${state.registered ? `<button class="button button--ghost-dark record-card__button" type="button" data-detail-unregister="${event.id}">Отменить запись</button>` : ''}
                            <a class="button button--outline record-card__button" href="volunteering.html">Открыть кабинет</a>
                        </div>
                    </section>
                </div>
                <section class="event-gallery">${gallery}</section>
            </div>
        </article>
    `;
}

function openDetailRegistrationModal(eventId) {
    const modal = document.getElementById('detailRegistrationModal');
    const form = document.getElementById('detailRegistrationForm');
    const title = document.getElementById('detailRegistrationEvent');
    const eventInput = document.getElementById('detailRegistrationEventId');
    const message = document.getElementById('detailRegistrationMessage');
    const eventItem = getEventById(eventId);

    if (!modal || !form || !title || !eventInput || !message || !eventItem) return;

    const saved = getStoredRegistrationForms()[String(eventId)] || {};

    form.reset();
    form.elements.firstName.value = saved.firstName || '';
    form.elements.lastName.value = saved.lastName || '';
    form.elements.phone.value = saved.phone || '';
    form.elements.email.value = saved.email || '';
    form.elements.comment.value = saved.comment || '';
    title.textContent = eventItem.title;
    eventInput.value = String(eventId);
    message.textContent = '';
    message.className = 'form-message';

    modal.classList.add('portal-modal--open');
    modal.setAttribute('aria-hidden', 'false');

    if (detailRegistrationCleanup) detailRegistrationCleanup();
    detailRegistrationCleanup = trapFocusInModal(modal, {
        onEscape: closeDetailRegistrationModal,
        initialFocusSelector: '[data-detail-registration-close]'
    });
}

function closeDetailRegistrationModal() {
    const modal = document.getElementById('detailRegistrationModal');
    if (!modal) return;
    modal.classList.remove('portal-modal--open');
    modal.setAttribute('aria-hidden', 'true');

    if (detailRegistrationCleanup) {
        const cleanup = detailRegistrationCleanup;
        detailRegistrationCleanup = null;
        cleanup();
    }
}

function openDetailSuccessModal() {
    const modal = document.getElementById('detailRegistrationSuccessModal');
    if (!modal) return;

    modal.classList.add('portal-modal--open');
    modal.setAttribute('aria-hidden', 'false');

    if (detailSuccessCleanup) detailSuccessCleanup();
    detailSuccessCleanup = trapFocusInModal(modal, {
        onEscape: closeDetailSuccessModal,
        initialFocusSelector: '[data-detail-success-close]'
    });
}

function closeDetailSuccessModal() {
    const modal = document.getElementById('detailRegistrationSuccessModal');
    if (!modal) return;

    modal.classList.remove('portal-modal--open');
    modal.setAttribute('aria-hidden', 'true');

    if (detailSuccessCleanup) {
        const cleanup = detailSuccessCleanup;
        detailSuccessCleanup = null;
        cleanup();
    }
}

function submitDetailRegistration(form) {
    const message = document.getElementById('detailRegistrationMessage');
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
        message.className = 'form-message form-message--error';
        return;
    }

    if (!isMoldovaPhone(payload.phone)) {
        message.textContent = 'Телефон должен начинаться с +373.';
        message.className = 'form-message form-message--error';
        return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
        message.textContent = 'Проверь email.';
        message.className = 'form-message form-message--error';
        return;
    }

    saveProjectRegistrationForm(eventId, payload);
    registerForEvent(eventId);
    upsertVolunteerApplication(eventId, payload);

    message.textContent = 'Заявка сохранена.';
    message.className = 'form-message form-message--success';

    renderEventDetail();

    window.setTimeout(() => {
        closeDetailRegistrationModal();
        openDetailSuccessModal();
    }, 450);
}

function initDetailRegistrationForm() {
    const form = document.getElementById('detailRegistrationForm');
    if (!form) return;

    form.addEventListener('submit', event => {
        event.preventDefault();
        submitDetailRegistration(form);
    });
}

document.addEventListener('click', event => {
    const fav = event.target.closest('[data-detail-favorite]');
    if (fav) {
        toggleFavorite(Number(fav.dataset.detailFavorite));
        renderEventDetail();
        return;
    }

    const registerOpen = event.target.closest('[data-detail-register-open]');
    if (registerOpen) {
        openDetailRegistrationModal(Number(registerOpen.dataset.detailRegisterOpen));
        return;
    }

    const unregisterButton = event.target.closest('[data-detail-unregister]');
    if (unregisterButton) {
        unregisterFromEvent(Number(unregisterButton.dataset.detailUnregister));
        renderEventDetail();
        return;
    }

    if (event.target.closest('[data-detail-registration-close]')) {
        closeDetailRegistrationModal();
        return;
    }

    if (event.target.closest('[data-detail-success-close]')) {
        closeDetailSuccessModal();
    }
});

document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
        closeDetailSuccessModal();
        closeDetailRegistrationModal();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    renderEventDetail();
    initDetailRegistrationForm();
});





