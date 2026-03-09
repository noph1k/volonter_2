const storiesState = {
    direction: 'all'
};

function getFilteredStories() {
    return storiesState.direction === 'all'
        ? stories
        : stories.filter(story => story.direction === storiesState.direction);
}

function getStoriesCountLabel(count) {
    if (count % 10 === 1 && count % 100 !== 11) return `${count} история`;
    if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14)) return `${count} истории`;
    return `${count} историй`;
}

function renderStoryFilters() {
    const filtersRoot = document.getElementById('storiesFilters');
    if (!filtersRoot) return;

    const buttons = [{ value: 'all', label: 'Все направления' }].concat(
        directions.map(direction => ({ value: direction, label: direction }))
    );

    filtersRoot.innerHTML = buttons.map(button => `
        <button
            class="stories-filter ${button.value === storiesState.direction ? 'stories-filter--active' : ''}"
            type="button"
            data-direction="${button.value}"
        >${button.label}</button>
    `).join('');
}

function renderStories() {
    const root = document.getElementById('storiesGrid');
    const count = document.getElementById('storiesCount');
    if (!root) return;

    const filtered = getFilteredStories();
    if (count) count.textContent = getStoriesCountLabel(filtered.length);

    if (!filtered.length) {
        root.innerHTML = '<div class="empty-state"><strong>Истории не найдены</strong><p>Попробуй выбрать другое направление волонтёрства.</p></div>';
        return;
    }

    root.innerHTML = filtered.map(story => `
        <article class="story-card--rich">
            <img src="${story.photo}" alt="${story.author}" loading="lazy" class="story-card__image">
            <div class="story-card__body">
                <div class="story-card__meta">
                    <span>${story.direction}</span>
                    <span>${story.age}+</span>
                </div>
                <h3>${story.title}</h3>
                <blockquote>«${story.quote}»</blockquote>
                <p>${story.story}</p>
                <div class="story-card__author-row">
                    <span>${story.author}</span>
                    <span>${story.role}</span>
                </div>
                <div class="story-card__rating" aria-label="Оценка ${story.rating} из 5">${'★'.repeat(story.rating)}${'☆'.repeat(5 - story.rating)}</div>
            </div>
        </article>
    `).join('');
}

function renderGallery() {
    const gallery = document.getElementById('storiesGalleryGrid');
    if (!gallery) return;

    gallery.innerHTML = storyGallery.map(item => `
        <article class="stories-gallery-card">
            <img src="${item.image}" loading="lazy" alt="${item.title}">
            <div class="stories-gallery-card__body">
                <strong>${item.title}</strong>
                <p>${item.eventLabel}</p>
                <p>${item.direction}</p>
            </div>
        </article>
    `).join('');
}

function initFilters() {
    document.addEventListener('click', event => {
        const button = event.target.closest('[data-direction]');
        if (!button || !button.closest('#storiesFilters')) return;
        storiesState.direction = button.dataset.direction;
        renderStoryFilters();
        renderStories();
    });
}

function initForm() {
    const form = document.getElementById('storiesForm');
    const result = document.getElementById('storiesFormResult');
    if (!form || !result) return;

    form.addEventListener('submit', event => {
        event.preventDefault();
        const data = new FormData(form);
        const name = String(data.get('name') || '').trim();
        const text = String(data.get('text') || '').trim();
        const rating = String(data.get('rating') || '').trim();

        if (!name || !text || !rating) {
            result.textContent = 'Заполни имя, текст отзыва и оценку.';
            result.className = 'stories-form-result is-error';
            return;
        }

        result.textContent = `Спасибо, ${name}. Отзыв отправлен и появится после модерации.`;
        result.className = 'stories-form-result';
        form.reset();
    });
}

document.addEventListener('DOMContentLoaded', () => {
    renderStoryFilters();
    renderStories();
    renderGallery();
    initFilters();
    initForm();
});
