const VOLUNTEER_APPLICATIONS_KEY = 'volunteerApplications';
let applicationModalCleanup = null;

function loadApplications() {
    try {
        const raw = localStorage.getItem(VOLUNTEER_APPLICATIONS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveApplications(list) {
    localStorage.setItem(VOLUNTEER_APPLICATIONS_KEY, JSON.stringify(list));
}

function formatCreatedAt(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatEventDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Дата уточняется';
    return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
}

function updateSummary() {
    const favoritesCount = getFavorites().length;
    const applicationsCount = loadApplications().length;
    document.getElementById('favCount').textContent = String(favoritesCount);
    document.getElementById('appsCount').textContent = String(applicationsCount);
    document.getElementById('favoritesBadge').textContent = `${favoritesCount} ${pluralize(favoritesCount, ['проект', 'проекта', 'проектов'])}`;
    document.getElementById('applicationsBadge').textContent = `${applicationsCount} ${pluralize(applicationsCount, ['заявка', 'заявки', 'заявок'])}`;
}

function pluralize(value, forms) {
    const mod10 = value % 10;
    const mod100 = value % 100;
    if (mod10 === 1 && mod100 !== 11) return forms[0];
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
    return forms[2];
}

function getSuggestedProjects() {
    return [...events]
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, 4);
}

function renderSuggestedProjects() {
    const root = document.getElementById('suggestedProjects');
    if (!root) return;
    root.innerHTML = getSuggestedProjects().map(item => {
        const favorite = isFavorite(item.id);
        return `
            <article class="mini-project mini-project_interactive" data-mini-project-open="${item.id}" tabindex="0" role="link" aria-label="Открыть проект ${item.title}">
                <div class="mini-project__top">
                    <span class="mini-project__tag">${item.genre}</span>
                    <button class="mini-project__favorite ${favorite ? 'mini-project__favorite_active' : ''}" type="button" data-toggle-favorite="${item.id}">
                        ${favorite ? 'В избранном' : 'В избранное'}
                    </button>
                </div>
                <h3>${item.title}</h3>
                <p>${item.description}</p>
                <div class="mini-project__meta">
                    <span>${item.type}</span>
                    <span>${item.place.venueName || item.place.address}</span>
                </div>
            </article>
        `;
    }).join('');
}

function renderFavorites() {
    const root = document.getElementById('favoritesList');
    if (!root) return;

    const favoriteEvents = getFavorites()
        .map(id => getEventById(id))
        .filter(Boolean)
        .sort((a, b) => new Date(a.dateStart) - new Date(b.dateStart));

    if (!favoriteEvents.length) {
        root.innerHTML = '<div class="empty-state"><strong>Пока пусто</strong><p>Добавь интересные проекты из блока быстрого подбора или со страницы проектов.</p></div>';
        return;
    }

    root.innerHTML = favoriteEvents.map(item => `
        <article class="record-card record-card_favorite">
            <div class="record-card__content">
                <div class="record-card__line">
                    <span class="record-card__pill">${item.genre}</span>
                    <span class="record-card__muted">${item.type}</span>
                </div>
                <h3>${item.title}</h3>
                <p>${item.description}</p>
                <div class="record-card__meta">
                    <span>${item.date}</span>
                    <span>${item.place.venueName || item.place.address}</span>
                </div>
            </div>
            <div class="record-card__actions">
                <a class="button button_outline record-card__button" href="event.html?id=${item.id}">Открыть проект</a>
                <button class="button button_ghost-dark record-card__button" type="button" data-remove-favorite="${item.id}">Убрать</button>
            </div>
        </article>
    `).join('');
}

function renderApplications() {
    const root = document.getElementById('applicationsList');
    if (!root) return;

    const list = loadApplications().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (!list.length) {
        root.innerHTML = '<div class="empty-state"><strong>Заявок ещё нет</strong><p>Заполни форму выше, и первое обращение появится здесь автоматически.</p></div>';
        return;
    }

    root.innerHTML = list.map(app => `
        <article class="record-card">
            <div class="record-card__content">
                <div class="record-card__line">
                    <span class="record-card__pill record-card__pill_soft">Подано ${formatCreatedAt(app.createdAt)}</span>
                    <span class="record-card__muted">${app.preferredDirection}</span>
                </div>
                <h3>${app.firstName} ${app.lastName}</h3>
                <div class="record-card__details">
                    <span><strong>Телефон:</strong> ${app.phone}</span>
                    <span><strong>Email:</strong> ${app.email}</span>
                    <span><strong>Дни:</strong> ${app.availabilityDay.join(', ')}</span>
                    <span><strong>Время:</strong> ${app.availabilitySlot.join(', ')}</span>
                    <span><strong>Навыки:</strong> ${app.skills.join(', ')}</span>
                </div>
            </div>
            <div class="record-card__actions">
                <button class="button button_ghost-dark record-card__button" type="button" data-remove-application="${app.id}">Удалить заявку</button>
            </div>
        </article>
    `).join('');
}

function setFieldError(name, message) {
    const errorNode = document.querySelector(`[data-error-for="${name}"]`);
    if (errorNode) errorNode.textContent = message || '';

    const field = document.getElementById(name);
    if (field) {
        const group = field.closest('.field-group');
        if (group) group.classList.toggle('field-group_invalid', Boolean(message));
    }

    if (!field) {
        const group = document.querySelector(`[data-group="${name}"]`);
        if (group) group.classList.toggle('choice-card_invalid', Boolean(message));
    }
}
function clearErrors() {
    document.querySelectorAll('[data-error-for]').forEach(node => {
        node.textContent = '';
    });
    document.querySelectorAll('.field-group_invalid, .choice-card_invalid').forEach(node => {
        node.classList.remove('field-group_invalid');
        node.classList.remove('choice-card_invalid');
    });
}
function showFormMessage(text, type) {
    const node = document.getElementById('volunteerFormMessage');
    if (!node) return;
    node.textContent = text;
    node.className = 'form-message';
    if (type) node.classList.add(`form-message_${type}`);
}

function validateForm(form) {
    const formData = new FormData(form);
    const payload = {
        firstName: String(formData.get('firstName') || '').trim(),
        lastName: String(formData.get('lastName') || '').trim(),
        phone: String(formData.get('phone') || '').trim(),
        email: String(formData.get('email') || '').trim(),
        preferredDirection: String(formData.get('preferredDirection') || '').trim(),
        availabilityDay: formData.getAll('availabilityDay'),
        availabilitySlot: formData.getAll('availabilitySlot'),
        skills: formData.getAll('skills')
    };

    let valid = true;
    clearErrors();
    showFormMessage('', '');

    if (!payload.firstName) {
        setFieldError('firstName', 'Укажи имя.');
        valid = false;
    }
    if (!payload.lastName) {
        setFieldError('lastName', 'Укажи фамилию.');
        valid = false;
    }
    if (!payload.phone) {
        setFieldError('phone', 'Укажи телефон.');
        valid = false;
    } else if (!isMoldovaPhone(payload.phone)) {
        setFieldError('phone', 'Телефон должен начинаться с +373.');
        valid = false;
    }
    if (!payload.email) {
        setFieldError('email', 'Укажи email.');
        valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
        setFieldError('email', 'Проверь email.');
        valid = false;
    }
    if (!payload.preferredDirection) {
        setFieldError('preferredDirection', 'Выбери направление помощи.');
        valid = false;
    }
    if (!payload.availabilityDay.length) {
        setFieldError('availabilityDay', 'Отметь хотя бы один вариант.');
        valid = false;
    }
    if (!payload.availabilitySlot.length) {
        setFieldError('availabilitySlot', 'Выбери удобное время.');
        valid = false;
    }
    if (!payload.skills.length) {
        setFieldError('skills', 'Выбери хотя бы один навык.');
        valid = false;
    }

    return { valid, payload };
}

function openModal() {
    const modal = document.getElementById('applicationModal');
    if (!modal) return;
    modal.classList.add('portal-modal_open');
    modal.setAttribute('aria-hidden', 'false');

    if (applicationModalCleanup) applicationModalCleanup();
    applicationModalCleanup = trapFocusInModal(modal, {
        onEscape: closeModal,
        initialFocusSelector: '[data-app-modal-close]'
    });
}

function closeModal() {
    const modal = document.getElementById('applicationModal');
    if (!modal) return;
    modal.classList.remove('portal-modal_open');
    modal.setAttribute('aria-hidden', 'true');

    if (applicationModalCleanup) {
        const cleanup = applicationModalCleanup;
        applicationModalCleanup = null;
        cleanup();
    }
}

function initVolunteerForm() {
    const form = document.getElementById('volunteerForm');
    if (!form) return;

    form.addEventListener('submit', event => {
        event.preventDefault();
        const { valid, payload } = validateForm(form);
        if (!valid) {
            showFormMessage('Исправь ошибки в форме и попробуй снова.', 'error');
            return;
        }

        showFormMessage('Отправляем анкету...', 'pending');
        const applications = loadApplications();
        const nextRecord = {
            id: Date.now(),
            createdAt: new Date().toISOString(),
            ...payload
        };

        window.setTimeout(() => {
            applications.unshift(nextRecord);
            saveApplications(applications);
            form.reset();
            renderApplications();
            updateSummary();
            showFormMessage('Заявка успешно сохранена.', 'success');
            openModal();
        }, 500);
    });

    form.querySelectorAll('input, select').forEach(field => {
        field.addEventListener('input', () => {
            const fieldName = field.name || field.id;
            if (fieldName) setFieldError(fieldName, '');
        });
        field.addEventListener('change', () => {
            const fieldName = field.name || field.id;
            if (fieldName) setFieldError(fieldName, '');
        });
    });
}

document.addEventListener('click', event => {
    const miniProject = getClosestTarget(event.target, '[data-mini-project-open]');
    if (miniProject && !getClosestTarget(event.target, 'button, a, input, select, textarea, label')) {
        const id = Number(miniProject.dataset.miniProjectOpen);
        if (!Number.isFinite(id)) return;
        window.location.href = 'event.html?id=' + id;
        return;
    }


    const favoriteToggle = getClosestTarget(event.target, '[data-toggle-favorite]');
    if (favoriteToggle) {
        const id = Number(favoriteToggle.dataset.toggleFavorite);
        toggleFavorite(id);
        renderSuggestedProjects();
        renderFavorites();
        updateSummary();
    }

    const removeFav = getClosestTarget(event.target, '[data-remove-favorite]');
    if (removeFav) {
        const id = Number(removeFav.dataset.removeFavorite);
        toggleFavorite(id);
        renderSuggestedProjects();
        renderFavorites();
        updateSummary();
    }

    const removeApp = getClosestTarget(event.target, '[data-remove-application]');
    if (removeApp) {
        const id = Number(removeApp.dataset.removeApplication);
        saveApplications(loadApplications().filter(item => item.id !== id));
        renderApplications();
        updateSummary();
    }

    if (getClosestTarget(event.target, '[data-app-modal-close]')) {
        closeModal();
    }
});

document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeModal();

    const miniProject = getClosestTarget(event.target, '[data-mini-project-open]');
    if (!miniProject) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();

    const id = Number(miniProject.dataset.miniProjectOpen);
    if (!Number.isFinite(id)) return;
    window.location.href = 'event.html?id=' + id;
});

document.addEventListener('DOMContentLoaded', () => {
    renderSuggestedProjects();
    renderFavorites();
    renderApplications();
    updateSummary();
    initVolunteerForm();
});



