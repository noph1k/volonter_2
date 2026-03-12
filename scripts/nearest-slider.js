function parseDateSafe(value) {
    if (!value) return Number.POSITIVE_INFINITY;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? Number.POSITIVE_INFINITY : d.getTime();
}

function getNearestEventsSource() {
    if (Array.isArray(window.events)) return window.events;
    return [];
}

function buildNearestEvents(limit) {
    const source = getNearestEventsSource();
    if (!source.length) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return [...source]
        .filter(event => {
            const date = new Date(event.dateStart);
            return !Number.isNaN(date.getTime()) && date >= today;
        })
        .sort((a, b) => parseDateSafe(a.dateStart) - parseDateSafe(b.dateStart))
        .slice(0, limit);
}

function createNearestSlide(item) {
    const href = `pages/event.html?id=${item.id}`;
    return `
        <article class="nearest-slide">
            <a class="nearest-slide__link" href="${href}">
                <img class="nearest-slide__image" src="${item.photos?.[0] || 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=600&q=80'}" alt="${item.title}" loading="lazy" decoding="async">
                <div class="nearest-slide__content">
                    <span class="nearest-slide__genre">${item.genre}</span>
                    <h3 class="nearest-slide__title">${item.title}</h3>
                    <p class="nearest-slide__meta">${item.date}</p>
                </div>
            </a>
        </article>`;
}

function initNearestSliderById(rootId, limit = 4) {
    const root = document.getElementById(rootId);
    if (!root) return;
    const track = root.querySelector('[data-nearest-track]');
    const prevBtn = root.querySelector('[data-nearest-nav="prev"]');
    const nextBtn = root.querySelector('[data-nearest-nav="next"]');
    const dotsRoot = root.querySelector('[data-nearest-dots]');
    if (!track || !prevBtn || !nextBtn || !dotsRoot) return;
    const slidesData = buildNearestEvents(limit);
    if (!slidesData.length) {
        track.innerHTML = '<p class="nearest-slider__empty">Пока нет ближайших мероприятий.</p>';
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
        dotsRoot.style.display = 'none';
        return;
    }
    track.innerHTML = slidesData.map(createNearestSlide).join('');
    const slides = Array.from(track.querySelectorAll('.nearest-slide'));
    let index = 0;
    const dots = slides.map((_, i) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'nearest-slider__dot';
        dot.setAttribute('aria-label', `Слайд ${i + 1}`);
        dot.addEventListener('click', () => {
            index = i;
            render();
        });
        dotsRoot.appendChild(dot);
        return dot;
    });

    function render() {
        track.style.transform = `translateX(${index * -100}%)`;
        dots.forEach((dot, i) => dot.classList.toggle('nearest-slider__dot_active', i === index));
    }

    prevBtn.addEventListener('click', () => {
        index = (index - 1 + slides.length) % slides.length;
        render();
    });
    nextBtn.addEventListener('click', () => {
        index = (index + 1) % slides.length;
        render();
    });

    render();
}

function initNearestSliders() {
    initNearestSliderById('eventsNearestSlider', 6);
    initNearestSliderById('volunteeringNearestSlider', 6);
}

document.addEventListener('DOMContentLoaded', initNearestSliders);
