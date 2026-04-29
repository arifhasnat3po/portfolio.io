document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Theme
    const themeToggle = document.getElementById('theme-toggle');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const storedTheme = localStorage.getItem('theme');
    
    // Default to dark theme for the premium look, unless strictly light
    if (storedTheme === 'dark' || (!storedTheme && prefersDark) || !storedTheme) {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
    }

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    });

    function updateThemeIcon(theme) {
        themeToggle.innerHTML = theme === 'dark' 
            ? '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>'
            : '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
    }
    updateThemeIcon(document.documentElement.getAttribute('data-theme'));

    // 2. Mobile Menu
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const navLinksContainer = document.querySelector('.nav-links');
    const navLinks = document.querySelectorAll('.nav-links a');

    mobileMenuBtn.addEventListener('click', () => {
        navLinksContainer.classList.toggle('active');
        const isActive = navLinksContainer.classList.contains('active');
        mobileMenuBtn.innerHTML = isActive
            ? '<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'
            : '<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>';
    });

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navLinksContainer.classList.remove('active');
            mobileMenuBtn.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>';
        });
    });

    // 3. Populate Data from data.js
    if (typeof portfolioData !== 'undefined') {
        populatePortfolio(portfolioData);
    } else {
        console.error("portfolioData not found. Make sure data.js is loaded correctly.");
    }

    // 4. Scroll Animations & Progress Bar
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target); // Trigger once
            }
        });
    }, observerOptions);

    // Give DOM time to populate before observing
    setTimeout(() => {
        document.querySelectorAll('.reveal').forEach(section => {
            observer.observe(section);
        });
    }, 100);

    const progressBar = document.getElementById('scroll-progress');
    const backToTopBtn = document.getElementById('back-to-top');

    window.addEventListener('scroll', () => {
        const scrollTop = document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrollPercentage = (scrollTop / scrollHeight) * 100;
        
        if(progressBar) progressBar.style.width = scrollPercentage + '%';

        if (scrollTop > 500) {
            backToTopBtn.classList.add('visible');
        } else {
            backToTopBtn.classList.remove('visible');
        }
    });

    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // 5. Search Filtering
    const searchInput = document.getElementById('project-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const projectCards = document.querySelectorAll('.project-item');
            projectCards.forEach(card => {
                const text = card.textContent.toLowerCase();
                if (text.includes(query)) {
                    card.style.display = 'block';
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    }
});

function populatePortfolio(data) {
    // Inject Personal Info
    document.getElementById('hero-name').textContent = data.personalInfo.name;
    document.getElementById('hero-headline').textContent = data.personalInfo.heroHeadline;
    document.getElementById('hero-subheading').textContent = data.personalInfo.heroSubheading;
    document.getElementById('hero-cv-btn').href = data.personalInfo.cvFile;
    
    // Socials
    document.getElementById('github-link').href = data.personalInfo.socials.github;
    document.getElementById('linkedin-link').href = data.personalInfo.socials.linkedin;
    document.getElementById('contact-email').href = `mailto:${data.personalInfo.email}`;
    document.getElementById('contact-email-text').textContent = data.personalInfo.email;
    document.getElementById('contact-phone').href = `tel:${data.personalInfo.phone}`;
    document.getElementById('contact-phone-text').textContent = data.personalInfo.phone;
    document.getElementById('contact-location').textContent = data.personalInfo.location;
    document.getElementById('footer-year').textContent = new Date().getFullYear();
    document.getElementById('footer-name').textContent = data.personalInfo.name;

    // About Section
    document.getElementById('about-text').textContent = data.personalInfo.about;
    const metricsHtml = data.metrics.map(m => `
        <div class="metric-card">
            <h3 class="gradient-text">${m.value}</h3>
            <p>${m.label}</p>
        </div>
    `).join('');
    document.getElementById('metrics-grid').innerHTML = metricsHtml;

    // Education
    const eduHtml = data.education.map(edu => `
        <div class="timeline-item reveal">
            <div class="timeline-dot"></div>
            <div class="timeline-content glass">
                <h3>${edu.degree}</h3>
                <div class="timeline-meta">${edu.institution} • ${edu.period}</div>
                <p style="margin-top: 0.5rem;">${edu.description}</p>
            </div>
        </div>
    `).join('');
    document.getElementById('education-timeline').innerHTML = eduHtml;

    // Experience
    const expHtml = data.experiences.map(exp => `
        <div class="timeline-item reveal">
            <div class="timeline-dot"></div>
            <div class="timeline-content glass">
                <h3>${exp.role}</h3>
                <div class="timeline-meta">${exp.company} • ${exp.period} • ${exp.location}</div>
                <ul>
                    ${exp.responsibilities.map(r => `<li>${r}</li>`).join('')}
                </ul>
            </div>
        </div>
    `).join('');
    document.getElementById('experience-timeline').innerHTML = expHtml;

    // Extracurricular
    if (data.extracurricular) {
        const extraHtml = data.extracurricular.map(exp => `
            <div class="timeline-item reveal">
                <div class="timeline-dot"></div>
                <div class="timeline-content glass">
                    <h3>${exp.role}</h3>
                    <div class="timeline-meta">${exp.company} • ${exp.period} • ${exp.location}</div>
                    <ul>
                        ${exp.responsibilities.map(r => `<li>${r}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `).join('');
        const extraEl = document.getElementById('extracurricular-timeline');
        if (extraEl) extraEl.innerHTML = extraHtml;
    }

    // Skills
    const skillsHtml = data.skills.map(skillSet => `
        <div class="skill-card glass reveal" style="display: flex; flex-direction: column;">
            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(0, 240, 255, 0.08); border: 1px solid rgba(0, 240, 255, 0.2); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    ${skillSet.icon}
                </div>
                <h3>${skillSet.category}</h3>
            </div>
            <p style="font-size: 0.95rem; color: var(--text-muted); margin-bottom: 1.5rem; flex-grow: 1;">${skillSet.description}</p>
            <div class="skill-tags">
                ${skillSet.items.map(item => `<span class="skill-tag">${item}</span>`).join('')}
            </div>
        </div>
    `).join('');
    document.getElementById('skills-grid').innerHTML = skillsHtml;

    // Projects
    const projectsHtml = data.projects.map(proj => `
        <div class="project-item reveal">
            <div class="project-card glass">
                <h3 class="gradient-text">${proj.title}</h3>
                <p>${proj.description}</p>
                <div class="tags">
                    ${proj.tags.map(t => `<span class="tag">${t}</span>`).join('')}
                </div>
                <div class="card-links">
                    ${proj.github ? `<a href="${proj.github}" target="_blank"><svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 15.13V19"></path></svg> Source</a>` : ''}
                    ${proj.live ? `<a href="${proj.live}" target="_blank"><svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg> Demo</a>` : ''}
                </div>
            </div>
        </div>
    `).join('');
    document.getElementById('projects-grid').innerHTML = projectsHtml;

    // Publications
    const pubsHtml = data.publications.map(pub => `
        <div class="reveal">
            <div class="project-card glass">
                <h3 class="gradient-text" style="font-size: 1.25rem;">${pub.title}</h3>
                <div class="timeline-meta" style="margin-bottom: 0.5rem; font-size: 0.9rem;">${pub.publisher} (${pub.year})</div>
                <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">Authors: ${pub.authors}</div>
                <p style="font-size: 0.95rem; flex-grow: 1;">${pub.summary}</p>
                <div class="card-links mt-auto">
                    ${pub.doi ? `<a href="${pub.doi}" target="_blank">View DOI</a>` : ''}
                </div>
            </div>
        </div>
    `).join('');
    document.getElementById('publications-grid').innerHTML = pubsHtml;

    // Certificates
    const certsHtml = data.certificates.map(cert => `
        <div class="project-item reveal">
            <div class="project-card glass">
                <h3 style="font-size: 1.25rem;">${cert.title}</h3>
                <div style="color: var(--primary); font-weight: 600; font-size: 0.9rem; margin-bottom: 1rem;">${cert.provider}</div>
                <div class="tags">
                    <span class="tag">${cert.tag}</span>
                </div>
                <div class="card-links mt-auto">
                    ${cert.verifyLink ? `<a href="${cert.verifyLink}" target="_blank">Verify</a>` : ''}
                    ${cert.pdfFile ? `<a href="${cert.pdfFile}" target="_blank">View PDF</a>` : ''}
                </div>
            </div>
        </div>
    `).join('');
    document.getElementById('certificates-grid').innerHTML = certsHtml;
}