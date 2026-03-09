const FAVORITES_KEY = 'favorites';
const REGISTERED_EVENTS_KEY = 'registeredEvents';
const MOLDOVA_PHONE_PREFIX = '+373';

function parseStoredJSON(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
}

function getFavorites() {
    return parseStoredJSON(FAVORITES_KEY, []).filter(value => Number.isFinite(Number(value))).map(Number);
}

function saveFavorites(list) {
    const unique = [...new Set(list.map(Number).filter(Number.isFinite))];
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(unique));
}

function toggleFavorite(eventId) {
    const id = Number(eventId);
    const favorites = getFavorites();
    if (favorites.includes(id)) {
        saveFavorites(favorites.filter(item => item !== id));
        return false;
    }
    saveFavorites([...favorites, id]);
    return true;
}

function isFavorite(eventId) {
    return getFavorites().includes(Number(eventId));
}

function getRegisteredEvents() {
    return parseStoredJSON(REGISTERED_EVENTS_KEY, []).filter(item => Number.isFinite(Number(item.eventId)));
}

function saveRegisteredEvents(list) {
    localStorage.setItem(REGISTERED_EVENTS_KEY, JSON.stringify(list));
}

function registerForEvent(eventId) {
    const id = Number(eventId);
    const list = getRegisteredEvents();
    if (list.some(item => item.eventId === id)) return false;
    list.push({ eventId: id, createdAt: new Date().toISOString() });
    saveRegisteredEvents(list);
    return true;
}

function unregisterFromEvent(eventId) {
    const id = Number(eventId);
    const list = getRegisteredEvents();
    const next = list.filter(item => item.eventId !== id);
    saveRegisteredEvents(next);
}

function toggleEventRegistration(eventId) {
    const id = Number(eventId);
    if (isRegisteredEvent(id)) {
        unregisterFromEvent(id);
        return false;
    }
    registerForEvent(id);
    return true;
}

function isRegisteredEvent(eventId) {
    return getRegisteredEvents().some(item => item.eventId === Number(eventId));
}

function getRegistrationMeta(eventId) {
    return getRegisteredEvents().find(item => item.eventId === Number(eventId)) || null;
}

function getEventUserState(eventId) {
    return {
        favorite: isFavorite(eventId),
        registered: isRegisteredEvent(eventId),
        registration: getRegistrationMeta(eventId)
    };
}

function formatShortDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Дата уточняется';
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
}

function getEventById(id) {
    return events.find(event => event.id === Number(id)) || null;
}

function getVenueById(id) {
    return venues.find(venue => venue.id === Number(id)) || null;
}

function getDirectionMeta(direction) {
    const map = {
        'Экология': { tone: 'eco', label: 'Экология' },
        'Дети': { tone: 'kids', label: 'Дети и подростки' },
        'Пожилые': { tone: 'elderly', label: 'Пожилые люди' },
        'Животные': { tone: 'animals', label: 'Животные' },
        'Городская среда': { tone: 'urban', label: 'Городская среда' }
    };
    return map[direction] || { tone: 'default', label: direction };
}

function isMoldovaPhone(value) {
    const digits = String(value || '').replace(/\D/g, '');
    return digits.length === 11 && digits.startsWith('373');
}

function prepareMoldovaPhoneInputs(root = document) {
    const phoneInputs = root.querySelectorAll('input[type="tel"]');
    phoneInputs.forEach(input => {
        input.placeholder = '+373 69 123 456';
        input.setAttribute('inputmode', 'tel');
        input.setAttribute('pattern', '^\\+373[0-9\\s\\-()]{8,}$');
        input.setAttribute('title', 'Номер должен начинаться с +373');

        input.addEventListener('focus', () => {
            if (!String(input.value || '').trim()) {
                input.value = `${MOLDOVA_PHONE_PREFIX} `;
            }
        });
    });
}

function buildStatusLabels(eventId) {
    const state = getEventUserState(eventId);
    const labels = [];
    if (state.favorite) labels.push({ key: 'favorite', text: 'В избранном' });
    if (state.registered) labels.push({ key: 'registered', text: 'Вы записаны' });
    if (!labels.length) labels.push({ key: 'available', text: 'Доступно' });
    return labels;
}

function getFocusableElements(container) {
    if (!container) return [];
    const selectors = [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled]):not([type="hidden"])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
    ];
    return [...container.querySelectorAll(selectors.join(','))]
        .filter(node => !node.hasAttribute('hidden') && node.offsetParent !== null);
}

function trapFocusInModal(modal, options = {}) {
    if (!modal) return () => {};

    const previouslyFocused = document.activeElement;
    const focusables = getFocusableElements(modal);
    const first = focusables[0] || modal;
    const last = focusables[focusables.length - 1] || modal;

    const onKeydown = event => {
        if (event.key === 'Escape' && typeof options.onEscape === 'function') {
            event.preventDefault();
            options.onEscape();
            return;
        }

        if (event.key !== 'Tab') return;
        if (!focusables.length) {
            event.preventDefault();
            return;
        }

        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
            return;
        }

        if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    };

    modal.addEventListener('keydown', onKeydown);
    const target = options.initialFocusSelector
        ? modal.querySelector(options.initialFocusSelector) || first
        : first;
    if (target && typeof target.focus === 'function') target.focus();

    return () => {
        modal.removeEventListener('keydown', onKeydown);
        if (options.restoreFocus !== false && previouslyFocused && typeof previouslyFocused.focus === 'function') {
            previouslyFocused.focus();
        }
    };
}

function getFallbackImageDataUri() {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f6f7fb"/><stop offset="100%" stop-color="#e8edf8"/></linearGradient></defs><rect width="1200" height="800" fill="url(#g)"/><g fill="#7a8398" font-family="Arial, sans-serif" text-anchor="middle"><text x="600" y="380" font-size="38">Image unavailable</text><text x="600" y="430" font-size="24">VolonterGorod</text></g></svg>';
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function attachImageFallback() {
    document.addEventListener('error', event => {
        const target = event.target;
        if (!(target instanceof HTMLImageElement)) return;
        if (target.dataset.fallbackApplied === '1') return;
        target.dataset.fallbackApplied = '1';
        target.src = getFallbackImageDataUri();
    }, true);
}

document.addEventListener('DOMContentLoaded', () => {
    prepareMoldovaPhoneInputs();
    attachImageFallback();
});

