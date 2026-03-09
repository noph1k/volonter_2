const homeQuoteState = {
    index: 0,
    timer: null,
    promoIndex: 0,
    promoTimer: null,
    statsAnimated: false,
    chart: null
};

function formatCount(value) {
    return value.toLocaleString('ru-RU');
}

function pluralize(value, one, few, many) {
    const mod10 = value % 10;
    const mod100 = value % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
    return many;
}

function getFeaturedStories() {
    return stories.filter(story => story.featured);
}

function getUpcomingEvents(limit = 4) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return [...events]
        .filter(item => new Date(item.dateStart) >= today)
        .sort((a, b) => new Date(a.dateStart) - new Date(b.dateStart))
        .slice(0, limit);
}

function getPromoItems() {
    const upcoming = getUpcomingEvents(5);
    if (!upcoming.length) {
        return [{
            title: 'Открыт новый набор волонтёров',
            description: 'Подключайся к инициативам города: доступны разовые и регулярные форматы участия.',
            badge: 'Анонс',
            meta: 'Обновления каждую неделю',
            link: 'pages/events.html',
            action: 'Смотреть проекты',
            image: 'https://images.unsplash.com/photo-1469571486292-b53601020f77?auto=format&fit=crop&w=1200&q=80'
        }];
    }

    return upcoming.map((event, index) => {
        const direction = getDirectionMeta(event.genre);
        return {
            id: event.id,
            title: event.title,
            description: `${event.description.slice(0, 140)}...`,
            badge: index === 0 ? 'Ближайшая акция' : 'Анонс',
            meta: `${event.date} • ${direction.label}`,
            link: `pages/event.html?id=${event.id}`,
            action: 'Подробнее',
            image: event.photos[0]
        };
    });
}

function animateCounter(element, target) {
    const duration = 1200;
    const start = performance.now();

    function frame(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        element.textContent = formatCount(Math.round(target * eased));
        if (progress < 1) {
            requestAnimationFrame(frame);
        }
    }

    requestAnimationFrame(frame);
}

function initStatsAnimation() {
    const stats = document.querySelector('.stats');
    if (!stats) return;

    const start = () => {
        if (homeQuoteState.statsAnimated) return;
        homeQuoteState.statsAnimated = true;
        document.querySelectorAll('[data-counter-target]').forEach(counter => {
            animateCounter(counter, Number(counter.dataset.counterTarget));
        });
    };

    if (!('IntersectionObserver' in window)) {
        start();
        return;
    }

    const observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) {
            start();
            observer.disconnect();
        }
    }, { threshold: 0.35 });

    observer.observe(stats);
}

function renderHomeStats() {
    const root = document.querySelector('.stats__grid');
    if (!root) return;

    const totalVolunteers = 1240;
    const totalProjects = events.length;
    const totalHours = 12400;

    root.innerHTML = `
        <article class="stats__item"><span class="stats__icon stats__icon--orange">O</span><strong data-counter-target="${totalVolunteers}">0</strong><span>Волонтёров</span></article>
        <article class="stats__item"><span class="stats__icon stats__icon--teal">*</span><strong data-counter-target="${totalProjects}">0</strong><span>Проведённых мероприятий</span></article>
        <article class="stats__item"><span class="stats__icon stats__icon--violet">+</span><strong data-counter-target="${totalHours}">0</strong><span>Часов помощи</span></article>
    `;

    initStatsAnimation();
}

function renderHomeDirectionsChart() {
    const canvas = document.getElementById('homeDirectionsChart');
    if (!canvas || typeof Chart === 'undefined') return;

    const grouped = directions.map(direction => events.filter(event => event.genre === direction).length);
    const colors = ['#00897B', '#2d7ef7', '#E65100', '#d64550', '#7B1FA2'];

    if (homeQuoteState.chart) homeQuoteState.chart.destroy();
    homeQuoteState.chart = new Chart(canvas.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: directions,
            datasets: [{ data: grouped, backgroundColor: colors, borderWidth: 0 }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } },
            cutout: '58%'
        }
    });
}

function renderNearestEvents() {
    const root = document.getElementById('homeNearestEvents');
    if (!root) return;

    const nearest = getUpcomingEvents(4);
    root.innerHTML = nearest.map(event => {
        const direction = getDirectionMeta(event.genre);
        return `
            <article class="home-nearest-card">
                <span class="record-card__pill">${direction.label}</span>
                <h4>${event.title}</h4>
                <p>${event.date}</p>
                <a class="button button--outline record-card__button" href="pages/event.html?id=${event.id}">Открыть</a>
            </article>
        `;
    }).join('');
}

function renderPromoSlide() {
    const root = document.getElementById('promoSlider');
    const dots = document.getElementById('promoDots');
    const items = getPromoItems();
    if (!root || !dots || !items.length) return;

    const slide = items[homeQuoteState.promoIndex];
    root.innerHTML = `
        <article class="promo-card">
            <div class="promo-card__content">
                <span class="promo-card__badge">${slide.badge}</span>
                <h3>${slide.title}</h3>
                <p>${slide.description}</p>
                <div class="promo-card__meta">${slide.meta}</div>
                <a class="button button--primary promo-card__action" href="${slide.link}">${slide.action}</a>
            </div>
            <div class="promo-card__media">
                <img src="${slide.image}" alt="${slide.title}" loading="lazy">
            </div>
        </article>
    `;

    dots.innerHTML = items.map((_, index) => `
        <button class="voice-dot ${index === homeQuoteState.promoIndex ? 'voice-dot--active' : ''}" type="button" data-promo-dot="${index}" aria-label="Слайд ${index + 1}"></button>
    `).join('');
}

function startPromoSlider() {
    const items = getPromoItems();
    if (items.length < 2) return;
    stopPromoSlider();
    homeQuoteState.promoTimer = window.setInterval(() => {
        homeQuoteState.promoIndex = (homeQuoteState.promoIndex + 1) % items.length;
        renderPromoSlide();
    }, 4800);
}

function stopPromoSlider() {
    if (homeQuoteState.promoTimer) {
        window.clearInterval(homeQuoteState.promoTimer);
        homeQuoteState.promoTimer = null;
    }
}

function renderHomeDirections() {
    const root = document.querySelector('.directions__grid');
    if (!root) return;
    root.innerHTML = directions.map(direction => {
        const count = events.filter(event => event.genre === direction).length;
        const meta = getDirectionMeta(direction);
        return `<a class="direction-card direction-card--${meta.tone}" href="pages/events.html?direction=${encodeURIComponent(direction)}">
                <span class="direction-card__content"><strong>${meta.label}</strong><small>${count} ${pluralize(count, 'проект', 'проекта', 'проектов')}</small></span>
                <span class="direction-card__arrow">&rsaquo;</span>
            </a>`;
    }).join('');
}

function renderFeaturedProjects() {
    const root = document.querySelector('.projects__grid');
    if (!root) return;
    const featured = [...events].sort((a, b) => b.popularity - a.popularity).slice(0, 3);
    root.innerHTML = featured.map(event => {
        const meta = getDirectionMeta(event.genre);
        const labels = buildStatusLabels(event.id);
        return `
            <article class="project-card">
                <div class="project-card__image-wrap">
                    <img class="project-card__image" src="${event.photos[0]}" alt="${event.title}" loading="lazy">
                    <span class="project-card__status ${event.status === 'Мест мало' ? 'project-card__status--green' : ''}">• ${event.status}</span>
                </div>
                <div class="project-card__body">
                    <div class="project-card__user-statuses">${labels.map(label => `<span class="project-status project-status--${label.key}">${label.text}</span>`).join('')}</div>
                    <span class="project-card__tag project-card__tag--${meta.tone === 'elderly' ? 'violet' : meta.tone === 'eco' ? 'teal' : 'orange'}">${meta.label}</span>
                    <h3>${event.title}</h3>
                    <p>${event.description.slice(0, 170)}...</p>
                    <div class="project-card__meta"><span>${event.type}</span><span>${event.freeSpots} мест</span></div>
                    <div class="project-card__meta project-card__meta--bottom"><span>${event.place.venueName || event.place.address}</span></div>
                    <div class="project-card__actions-row">
                        <a class="button button--card" href="pages/event.html?id=${event.id}">Подробнее <span>></span></a>
                        <button class="button button--ghost-dark project-card__quick" type="button" data-home-favorite="${event.id}">${isFavorite(event.id) ? 'Убрать' : 'В избранное'}</button>
                    </div>
                </div>
            </article>
        `;
    }).join('');
}

function renderProjectOfMonth() {
    const root = document.getElementById('projectMonthRoot');
    if (!root || !projectOfMonth) return;
    const event = getEventById(projectOfMonth.eventId);
    const story = stories.find(item => item.id === projectOfMonth.storyId);
    if (!event || !story) return;

    root.innerHTML = `
        <article class="month-project-card">
            <div class="month-project-card__media">
                <img src="${event.photos[0]}" alt="${event.title}" loading="lazy">
                <span class="month-project-card__badge">${projectOfMonth.badge}</span>
            </div>
            <div class="month-project-card__body">
                <p class="surface-card__kicker">${projectOfMonth.monthLabel}</p>
                <h2>${event.title}</h2>
                <p class="month-project-card__lead">${projectOfMonth.summary}</p>
                <div class="month-project-card__stats">${projectOfMonth.metrics.map(metric => `<span>${metric}</span>`).join('')}</div>
                <div class="month-project-story">
                    <img class="month-project-story__avatar" src="${story.photo}" alt="${story.author}" loading="lazy">
                    <div>
                        <strong>${story.author}, ${story.role}</strong>
                        <p>«${story.quote}»</p>
                    </div>
                </div>
                <div class="project-card__actions-row">
                    <a class="button button--card" href="pages/event.html?id=${event.id}">Открыть проект <span>></span></a>
                    <a class="button button--outline project-card__quick" href="pages/stories.html">Читать историю</a>
                </div>
            </div>
        </article>
    `;
}

function renderQuoteSlide() {
    const root = document.getElementById('voicesSlider');
    const dots = document.getElementById('voicesDots');
    const list = getFeaturedStories();
    if (!root || !dots || !list.length) return;
    const story = list[homeQuoteState.index];
    const palette = ['orange', 'teal', 'violet'];
    const tone = palette[homeQuoteState.index % palette.length];

    root.innerHTML = `
        <article class="voice-spotlight">
            <div class="voice-spotlight__media">
                <img src="${story.photo}" alt="${story.author}" loading="lazy">
            </div>
            <div class="voice-spotlight__body">
                <span class="voice-card__quote voice-card__quote--${tone}">"</span>
                <p>${story.quote}</p>
                <strong>${story.author}</strong>
                <span>${story.role}</span>
                <small>${story.direction}</small>
                <div class="voice-spotlight__actions">
                    <button class="button button--ghost-light" type="button" data-voices-prev><</button>
                    <a class="button button--light" href="pages/stories.html">Все истории</a>
                    <button class="button button--ghost-light" type="button" data-voices-next>></button>
                </div>
            </div>
        </article>
    `;

    dots.innerHTML = list.map((_, index) => `
        <button class="voice-dot ${index === homeQuoteState.index ? 'voice-dot--active' : ''}" type="button" data-voice-dot="${index}" aria-label="Цитата ${index + 1}"></button>
    `).join('');
}

function startQuoteSlider() {
    const list = getFeaturedStories();
    if (list.length < 2) return;
    stopQuoteSlider();
    homeQuoteState.timer = window.setInterval(() => {
        homeQuoteState.index = (homeQuoteState.index + 1) % list.length;
        renderQuoteSlide();
    }, 5000);
}

function stopQuoteSlider() {
    if (homeQuoteState.timer) {
        window.clearInterval(homeQuoteState.timer);
        homeQuoteState.timer = null;
    }
}

document.addEventListener('click', event => {
    const favoriteButton = event.target.closest('[data-home-favorite]');
    if (favoriteButton) {
        toggleFavorite(Number(favoriteButton.dataset.homeFavorite));
        renderFeaturedProjects();
        return;
    }

    if (event.target.closest('[data-promo-prev]')) {
        const items = getPromoItems();
        homeQuoteState.promoIndex = (homeQuoteState.promoIndex - 1 + items.length) % items.length;
        renderPromoSlide();
        startPromoSlider();
        return;
    }

    if (event.target.closest('[data-promo-next]')) {
        const items = getPromoItems();
        homeQuoteState.promoIndex = (homeQuoteState.promoIndex + 1) % items.length;
        renderPromoSlide();
        startPromoSlider();
        return;
    }

    const promoDot = event.target.closest('[data-promo-dot]');
    if (promoDot) {
        homeQuoteState.promoIndex = Number(promoDot.dataset.promoDot);
        renderPromoSlide();
        startPromoSlider();
        return;
    }

    if (event.target.closest('[data-voices-prev]')) {
        const list = getFeaturedStories();
        homeQuoteState.index = (homeQuoteState.index - 1 + list.length) % list.length;
        renderQuoteSlide();
        startQuoteSlider();
        return;
    }

    if (event.target.closest('[data-voices-next]')) {
        const list = getFeaturedStories();
        homeQuoteState.index = (homeQuoteState.index + 1) % list.length;
        renderQuoteSlide();
        startQuoteSlider();
        return;
    }

    const dot = event.target.closest('[data-voice-dot]');
    if (dot) {
        homeQuoteState.index = Number(dot.dataset.voiceDot);
        renderQuoteSlide();
        startQuoteSlider();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    renderHomeStats();
    renderPromoSlide();
    startPromoSlider();
    renderHomeDirections();
    renderHomeDirectionsChart();
    renderNearestEvents();
    renderFeaturedProjects();
    renderProjectOfMonth();
    renderQuoteSlide();
    startQuoteSlider();

    const promoSlider = document.getElementById('promoSlider');
    if (promoSlider) {
        promoSlider.addEventListener('mouseenter', stopPromoSlider);
        promoSlider.addEventListener('mouseleave', startPromoSlider);
    }

    const slider = document.getElementById('voicesSlider');
    if (slider) {
        slider.addEventListener('mouseenter', stopQuoteSlider);
        slider.addEventListener('mouseleave', startQuoteSlider);
    }
});

