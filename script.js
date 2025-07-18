// ===== EDUFÉRIAS - MAIN JAVASCRIPT =====

// Global state management
class EduFeriasApp {
    constructor() {
        this.state = {
            currentTheme: localStorage.getItem('theme') || 'light',
            activities: [],
            children: JSON.parse(localStorage.getItem('children')) || [],
            achievements: JSON.parse(localStorage.getItem('achievements')) || [],
            plannedActivities: JSON.parse(localStorage.getItem('plannedActivities')) || {},
            stats: JSON.parse(localStorage.getItem('stats')) || {
                totalActivities: 0,
                totalTime: 0,
                streakDays: 0,
                lastActivityDate: null
            },
            weather: null,
            currentWeek: new Date()
        };
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadTheme();
        this.loadWeather();
        this.loadActivities();
        this.loadAchievements();
        this.loadCalendar();
        this.loadStats();
        this.loadChildren();
        this.setupServiceWorker();
    }

    // ===== EVENT LISTENERS =====
    setupEventListeners() {
        // Navigation
        this.setupNavigation();
        
        // Theme toggle
        document.getElementById('theme-toggle')?.addEventListener('click', () => this.toggleTheme());
        
        // Activity generator form
        document.getElementById('generate-btn')?.addEventListener('click', (e) => this.handleActivityGeneration(e));
        
        // Calendar navigation
        document.getElementById('prev-week')?.addEventListener('click', () => this.navigateWeek(-1));
        document.getElementById('next-week')?.addEventListener('click', () => this.navigateWeek(1));
        
        // Add child button
        document.getElementById('add-child-btn')?.addEventListener('click', () => this.showAddChildModal());
        
        // Modal close handlers
        document.querySelectorAll('.modal__close, .modal__backdrop').forEach(el => {
            el.addEventListener('click', (e) => this.closeModal(e));
        });
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => this.handleKeyboardNavigation(e));
        
        // Form validation
        this.setupFormValidation();
        
        // Smooth scrolling for navigation links
        document.querySelectorAll('a[href^="#"]').forEach(link => {
            link.addEventListener('click', (e) => this.handleSmoothScroll(e));
        });
    }

    setupNavigation() {
        const navToggle = document.querySelector('.nav__toggle');
        const navMenu = document.querySelector('.nav__menu');
        
        if (navToggle && navMenu) {
            navToggle.addEventListener('click', () => {
                const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
                navToggle.setAttribute('aria-expanded', !isExpanded);
            });
            
            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
                    navToggle.setAttribute('aria-expanded', 'false');
                }
            });
        }
    }

    setupFormValidation() {
        const form = document.querySelector('.activity-generator');
        if (!form) return;

        const inputs = form.querySelectorAll('select, input');
        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearFieldError(input));
        });
    }

    // ===== THEME MANAGEMENT =====
    loadTheme() {
        document.documentElement.setAttribute('data-theme', this.state.currentTheme);
        this.updateThemeIcon();
    }

    toggleTheme() {
        this.state.currentTheme = this.state.currentTheme === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', this.state.currentTheme);
        this.loadTheme();
        this.showToast('Tema alterado com sucesso!', 'success');
    }

    updateThemeIcon() {
        const lightIcon = document.querySelector('.theme-icon--light');
        const darkIcon = document.querySelector('.theme-icon--dark');
        
        if (this.state.currentTheme === 'dark') {
            lightIcon?.style.setProperty('opacity', '0');
            darkIcon?.style.setProperty('opacity', '1');
        } else {
            lightIcon?.style.setProperty('opacity', '1');
            darkIcon?.style.setProperty('opacity', '0');
        }
    }

    // ===== WEATHER INTEGRATION =====
    async loadWeather() {
        // IMPORTANTE: Substitua 'SUA_CHAVE_API' pela sua chave da API do OpenWeatherMap.
        // Você pode obter uma gratuitamente em https://openweathermap.org/appid
        const apiKey = 'SUA_CHAVE_API';

        // Função para buscar o clima por coordenadas
        const fetchWeatherByCoords = async (lat, lon) => {
            try {
                // Se a chave da API não for fornecida, usa dados de demonstração
                if (apiKey === 'SUA_CHAVE_API') {
                    console.warn("Usando dados de clima de demonstração. Por favor, adicione sua chave da API do OpenWeatherMap.");
                    this.state.weather = { name: 'Goiânia', main: { temp: 28 }, weather: [{ main: 'Clear', description: 'céu limpo' }] };
                    this.updateWeatherDisplay();
                    return;
                }
                const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=pt_br`);
                if (!response.ok) throw new Error('Dados do clima não disponíveis para as coordenadas.');
                this.state.weather = await response.json();
                this.updateWeatherDisplay();
            } catch (error) {
                console.error('Erro ao buscar clima por coordenadas:', error);
                await fetchWeatherByCity('Goiânia'); // Tenta com a cidade do usuário como fallback
            }
        };

        // Função para buscar o clima por nome da cidade
        const fetchWeatherByCity = async (city = 'Goiânia') => {
            try {
                 // Se a chave da API não for fornecida, usa dados de demonstração
                if (apiKey === 'SUA_CHAVE_API') {
                    this.state.weather = { name: 'Goiânia', main: { temp: 28 }, weather: [{ main: 'Clear', description: 'céu limpo' }] };
                    this.updateWeatherDisplay();
                    return;
                }
                const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric&lang=pt_br`);
                if (!response.ok) throw new Error('Dados do clima não disponíveis para a cidade.');
                this.state.weather = await response.json();
                this.updateWeatherDisplay();
            } catch (error) {
                console.error(`Erro ao buscar clima por cidade (${city}):`, error);
                this.updateWeatherDisplay(true); // Mostra estado de erro
            }
        };

        // Tenta obter a geolocalização do usuário
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    fetchWeatherByCoords(latitude, longitude);
                },
                (error) => {
                    console.warn(`Erro de geolocalização (${error.code}): ${error.message}`);
                    // Como sei que você mora em Goiânia, usei como fallback principal.
                    fetchWeatherByCity('Goiânia');
                }
            );
        } else {
            console.warn('Geolocalização não é suportada por este navegador.');
            // Fallback para navegadores sem geolocalização
            fetchWeatherByCity('Goiânia');
        }
    }

    updateWeatherDisplay(error = false) {
        const weatherIndicator = document.querySelector('.weather-indicator');
        if (!weatherIndicator) return;

        if (error || !this.state.weather) {
            weatherIndicator.innerHTML = `
                <span class="weather-icon" aria-hidden="true">🌦️</span>
                <span class="weather-temp">Clima indisponível</span>
            `;
            weatherIndicator.title = "Não foi possível obter os dados do clima.";
            return;
        }

        const iconMap = {
            'Clear': '☀️',
            'Clouds': '☁️',
            'Rain': '🌧️',
            'Snow': '❄️',
            'Thunderstorm': '⛈️',
            'Drizzle': '🌦️',
            'Mist': '🌫️',
            'Haze': '🌫️',
            'Fog': '🌫️'
        };

        const weatherMain = this.state.weather.weather[0].main;
        const temp = Math.round(this.state.weather.main.temp);
        const cityName = this.state.weather.name;

        weatherIndicator.innerHTML = `
            <span class="weather-icon" id="weather-icon" aria-hidden="true">${iconMap[weatherMain] || '🌤️'}</span>
            <span class="weather-temp" id="weather-temp">${temp}°C em ${cityName}</span>
        `;
        weatherIndicator.title = `Clima atual em ${cityName}: ${this.state.weather.weather[0].description}`;
    }

    // ===== ACTIVITY MANAGEMENT =====
    async handleActivityGeneration(e) {
        e.preventDefault();
        
        const form = e.target.closest('form');
        const formData = new FormData(form);
        
        // Validate form
        if (!this.validateForm(form)) {
            this.showToast('Por favor, preencha todos os campos obrigatórios', 'error');
            return;
        }

        // Show loading state
        this.setButtonLoading(e.target, true);
        
        try {
            const filters = {
                age: formData.get('child-age'),
                duration: parseInt(formData.get('activity-duration')),
                categories: formData.getAll('categories'),
                weather: this.state.weather?.weather[0].main.toLowerCase()
            };

            const activities = await this.generateActivities(filters);
            this.state.activities = activities;
            this.renderActivities(activities);
            this.showToast('Atividades geradas com sucesso!', 'success');
            
            // Scroll to activities section
            document.getElementById('activities')?.scrollIntoView({ behavior: 'smooth' });
            
        } catch (error) {
            console.error('Error generating activities:', error);
            this.showToast('Erro ao gerar atividades. Tente novamente.', 'error');
        } finally {
            this.setButtonLoading(e.target, false);
        }
    }

    async generateActivities(filters) {
        // Simulate API call with realistic delay
        await this.delay(1500);
        
        const activityDatabase = this.getActivityDatabase();
        
        // Filter activities based on criteria
        let filteredActivities = activityDatabase.filter(activity => {
            const ageMatch = this.checkAgeMatch(activity.ageRange, filters.age);
            const durationMatch = activity.duration <= filters.duration;
            const categoryMatch = filters.categories.length === 0 || 
                                filters.categories.some(cat => activity.categories.includes(cat));
            const weatherMatch = !activity.weatherDependent || 
                               activity.suitableWeather.includes(filters.weather);
            
            return ageMatch && durationMatch && categoryMatch && weatherMatch;
        });

        // Apply AI-like personalization based on history
        filteredActivities = this.personalizeActivities(filteredActivities);
        
        // Return top 6 activities
        return this.shuffleArray(filteredActivities).slice(0, 6);
    }

    getActivityDatabase() {
        return [
            {
                id: 1,
                title: "Pintura com Aquarela",
                description: "Crie obras de arte coloridas usando tintas aquarela e deixe a criatividade fluir!",
                ageRange: "4-12",
                duration: 45,
                categories: ["arte"],
                materials: ["papel", "tintas aquarela", "pincéis", "água"],
                difficulty: "fácil",
                weatherDependent: false,
                suitableWeather: ["clear", "clouds", "rain"],
                instructions: [
                    "Prepare o espaço com jornal para proteger a mesa",
                    "Molhe o papel levemente com água limpa",
                    "Deixe a criança experimentar misturar cores",
                    "Incentive a criação livre sem pressão por resultados"
                ],
                benefits: ["criatividade", "coordenação motora", "expressão artística"],
                image: "🎨"
            },
            {
                id: 2,
                title: "Experiência Vulcão de Bicarbonato",
                description: "Crie um vulcão que 'explode' usando ingredientes seguros da cozinha!",
                ageRange: "6-12",
                duration: 30,
                categories: ["ciencia"],
                materials: ["bicarbonato", "vinagre", "corante alimentar", "detergente", "garrafa"],
                difficulty: "médio",
                weatherDependent: false,
                suitableWeather: ["clear", "clouds", "rain"],
                instructions: [
                    "Coloque 2 colheres de bicarbonato na garrafa",
                    "Adicione algumas gotas de corante e detergente",
                    "Despeje vinagre rapidamente e observe a reação",
                    "Explique a reação química de forma simples"
                ],
                benefits: ["curiosidade científica", "observação", "aprendizado"],
                image: "🌋"
            },
            {
                id: 3,
                title: "Caça ao Tesouro no Quintal",
                description: "Uma aventura emocionante procurando pistas e tesouros escondidos!",
                ageRange: "4-10",
                duration: 60,
                categories: ["movimento"],
                materials: ["papel", "caneta", "pequenos prêmios", "envelope"],
                difficulty: "fácil",
                weatherDependent: true,
                suitableWeather: ["clear", "clouds"],
                instructions: [
                    "Crie pistas adequadas para a idade da criança",
                    "Esconda as pistas em locais seguros",
                    "Prepare um 'tesouro' especial no final",
                    "Acompanhe a criança durante a busca"
                ],
                benefits: ["atividade física", "resolução de problemas", "diversão"],
                image: "🗺️"
            },
            {
                id: 4,
                title: "Teatro de Fantoches",
                description: "Crie personagens e conte histórias incríveis com fantoches caseiros!",
                ageRange: "4-12",
                duration: 90,
                categories: ["arte", "leitura"],
                materials: ["meias", "botões", "cola", "tecidos", "caixa de papelão"],
                difficulty: "médio",
                weatherDependent: false,
                suitableWeather: ["clear", "clouds", "rain"],
                instructions: [
                    "Ajude a criar fantoches com meias e materiais",
                    "Monte um teatrinho com caixa de papelão",
                    "Inventem uma história juntos",
                    "Apresentem para a família"
                ],
                benefits: ["criatividade", "comunicação", "autoconfiança"],
                image: "🎭"
            },
            {
                id: 5,
                title: "Cookies Decorados",
                description: "Asse e decore cookies deliciosos em formato de animais e formas divertidas!",
                ageRange: "6-12",
                duration: 120,
                categories: ["culinaria"],
                materials: ["farinha", "açúcar", "manteiga", "ovos", "confeitos", "glacê"],
                difficulty: "médio",
                weatherDependent: false,
                suitableWeather: ["clear", "clouds", "rain"],
                instructions: [
                    "Prepare a massa seguindo receita simples",
                    "Use cortadores de formas divertidas",
                    "Asse com supervisão de adulto",
                    "Decore com glacê e confeitos coloridos"
                ],
                benefits: ["habilidades culinárias", "paciência", "seguir instruções"],
                image: "🍪"
            },
            {
                id: 6,
                title: "Jardim de Ervas Aromáticas",
                description: "Plante e cuide de um pequeno jardim com ervas que podem ser usadas na cozinha!",
                ageRange: "5-12",
                duration: 45,
                categories: ["ciencia"],
                materials: ["sementes de ervas", "vasos", "terra", "água", "etiquetas"],
                difficulty: "fácil",
                weatherDependent: true,
                suitableWeather: ["clear", "clouds"],
                instructions: [
                    "Escolha ervas fáceis como manjericão e salsa",
                    "Plante as sementes em vasos pequenos",
                    "Crie etiquetas para identificar cada planta",
                    "Estabeleça rotina de cuidados diários"
                ],
                benefits: ["responsabilidade", "conexão com natureza", "paciência"],
                image: "🌱"
            },
            {
                id: 7,
                title: "Contação de Histórias Interativa",
                description: "Crie e conte histórias onde a criança participa ativamente da narrativa!",
                ageRange: "4-10",
                duration: 30,
                categories: ["leitura"],
                materials: ["livros", "fantasia", "objetos de cena"],
                difficulty: "fácil",
                weatherDependent: false,
                suitableWeather: ["clear", "clouds", "rain"],
                instructions: [
                    "Escolha uma história conhecida pela criança",
                    "Permita que ela escolha rumos da narrativa",
                    "Use vozes diferentes para personagens",
                    "Incentive a criança a recontar a história"
                ],
                benefits: ["linguagem", "imaginação", "memória"],
                image: "📚"
            },
            {
                id: 8,
                title: "Dança das Estátuas Musical",
                description: "Um jogo divertido que combina música, movimento e autocontrole!",
                ageRange: "4-12",
                duration: 20,
                categories: ["movimento"],
                materials: ["música", "espaço livre"],
                difficulty: "fácil",
                weatherDependent: false,
                suitableWeather: ["clear", "clouds", "rain"],
                instructions: [
                    "Toque músicas animadas que a criança goste",
                    "Quando parar a música, todos viram estátuas",
                    "Quem se mexer sai da brincadeira",
                    "Varie com temas: animais, profissões, emoções"
                ],
                benefits: ["coordenação", "autocontrole", "diversão"],
                image: "💃"
            }
        ];
    }

    checkAgeMatch(activityAgeRange, selectedAge) {
        // Validate inputs
        if (!activityAgeRange || !selectedAge) {
            return false;
        }
        
        try {
            const [activityMin, activityMax] = activityAgeRange.split('-').map(Number);
            const [selectedMin, selectedMax] = selectedAge.split('-').map(Number);
            
            return activityMax >= selectedMin && activityMin <= selectedMax;
        } catch (error) {
            console.error('Error in checkAgeMatch:', error);
            return false;
        }
    }

    personalizeActivities(activities) {
        // Simple personalization based on completed activities
        const completedCategories = this.state.stats.completedActivities?.map(a => a.categories).flat() || [];
        const categoryPreference = this.getMostFrequentCategories(completedCategories);
        
        return activities.sort((a, b) => {
            const aScore = a.categories.some(cat => categoryPreference.includes(cat)) ? 1 : 0;
            const bScore = b.categories.some(cat => categoryPreference.includes(cat)) ? 1 : 0;
            return bScore - aScore;
        });
    }

    getMostFrequentCategories(categories) {
        const frequency = {};
        categories.forEach(cat => frequency[cat] = (frequency[cat] || 0) + 1);
        return Object.keys(frequency).sort((a, b) => frequency[b] - frequency[a]).slice(0, 3);
    }

    renderActivities(activities) {
        const grid = document.getElementById('activities-grid');
        const empty = document.getElementById('activities-empty');
        
        if (!grid) return;

        if (activities.length === 0) {
            grid.style.display = 'none';
            empty.style.display = 'block';
            return;
        }

        grid.style.display = 'grid';
        empty.style.display = 'none';
        
        grid.innerHTML = activities.map(activity => this.createActivityCard(activity)).join('');
        
        // Add event listeners to activity cards
        grid.querySelectorAll('.activity-card').forEach((card, index) => {
            card.addEventListener('click', () => this.showActivityModal(activities[index]));
        });
    }

    createActivityCard(activity) {
        const difficultyColors = {
            'fácil': 'var(--success-500)',
            'médio': 'var(--warning-500)',
            'difícil': 'var(--error-500)'
        };

        return `
            <article class="activity-card" role="button" tabindex="0" aria-label="Atividade: ${activity.title}">
                <div class="activity-card__image">
                    <span class="activity-emoji" aria-hidden="true">${activity.image}</span>
                </div>
                <div class="activity-card__content">
                    <h3 class="activity-card__title">${activity.title}</h3>
                    <p class="activity-card__description">${activity.description}</p>
                    <div class="activity-card__meta">
                        <span class="activity-tag activity-tag--age">
                            👶 ${activity.ageRange} anos
                        </span>
                        <span class="activity-tag activity-tag--duration">
                            ⏱️ ${activity.duration}min
                        </span>
                        <span class="activity-tag activity-tag--difficulty" style="color: ${difficultyColors[activity.difficulty]}">
                            📊 ${activity.difficulty}
                        </span>
                    </div>
                    <div class="activity-card__categories">
                        ${activity.categories.map(cat => `
                            <span class="category-badge category-badge--${cat}">${this.getCategoryIcon(cat)} ${this.getCategoryName(cat)}</span>
                        `).join('')}
                    </div>
                </div>
                <button class="activity-card__action btn btn--primary btn--small">
                    Ver Detalhes
                </button>
            </article>
        `;
    }

    getCategoryIcon(category) {
        const icons = {
            'arte': '🎨',
            'ciencia': '🔬',
            'movimento': '🏃',
            'leitura': '📚',
            'culinaria': '👨‍🍳'
        };
        return icons[category] || '⭐';
    }

    getCategoryName(category) {
        const names = {
            'arte': 'Arte',
            'ciencia': 'Ciência',
            'movimento': 'Movimento',
            'leitura': 'Leitura',
            'culinaria': 'Culinária'
        };
        return names[category] || category;
    }

    // ===== MODAL MANAGEMENT =====
    showActivityModal(activity) {
        const modal = document.getElementById('activity-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');
        
        if (!modal || !modalTitle || !modalBody) return;

        modalTitle.textContent = activity.title;
        modalBody.innerHTML = this.createActivityModalContent(activity);
        
        modal.setAttribute('aria-hidden', 'false');
        modal.focus();
        
        // Add complete activity button listener
        const completeBtn = modalBody.querySelector('.complete-activity-btn');
        completeBtn?.addEventListener('click', () => this.completeActivity(activity));
        
        // Add schedule activity button listener
        const scheduleBtn = modalBody.querySelector('.schedule-activity-btn');
        scheduleBtn?.addEventListener('click', () => this.scheduleActivity(activity));
    }

    createActivityModalContent(activity) {
        return `
            <div class="activity-modal__content">
                <div class="activity-modal__header">
                    <div class="activity-emoji-large" aria-hidden="true">${activity.image}</div>
                    <div class="activity-modal__meta">
                        <div class="activity-tags">
                            <span class="activity-tag">👶 ${activity.ageRange} anos</span>
                            <span class="activity-tag">⏱️ ${activity.duration} minutos</span>
                            <span class="activity-tag">📊 ${activity.difficulty}</span>
                        </div>
                        <div class="activity-categories">
                            ${activity.categories.map(cat => `
                                <span class="category-badge category-badge--${cat}">
                                    ${this.getCategoryIcon(cat)} ${this.getCategoryName(cat)}
                                </span>
                            `).join('')}
                        </div>
                    </div>
                </div>
                
                <div class="activity-modal__description">
                    <p>${activity.description}</p>
                </div>
                
                <div class="activity-modal__section">
                    <h4>📦 Materiais Necessários</h4>
                    <ul class="materials-list">
                        ${activity.materials.map(material => `<li>${material}</li>`).join('')}
                    </ul>
                </div>
                
                <div class="activity-modal__section">
                    <h4>📋 Instruções Passo a Passo</h4>
                    <ol class="instructions-list">
                        ${activity.instructions.map(instruction => `<li>${instruction}</li>`).join('')}
                    </ol>
                </div>
                
                <div class="activity-modal__section">
                    <h4>🌟 Benefícios</h4>
                    <div class="benefits-list">
                        ${activity.benefits.map(benefit => `
                            <span class="benefit-tag">${benefit}</span>
                        `).join('')}
                    </div>
                </div>
                
                <div class="activity-modal__actions">
                    <button class="btn btn--primary complete-activity-btn">
                        ✅ Marcar como Concluída
                    </button>
                    <button class="btn btn--secondary schedule-activity-btn">
                        📅 Agendar para Depois
                    </button>
                </div>
            </div>
        `;
    }

    closeModal(e) {
        if (e.target.classList.contains('modal__close') || e.target.classList.contains('modal__backdrop')) {
            const modal = e.target.closest('.modal');
            modal?.setAttribute('aria-hidden', 'true');
        }
    }

    // ===== ACTIVITY COMPLETION =====
    completeActivity(activity) {
        // Update stats
        this.state.stats.totalActivities++;
        this.state.stats.totalTime += activity.duration;
        this.state.stats.lastActivityDate = new Date().toISOString();
        
        // Update streak
        this.updateStreak();
        
        // Add to completed activities
        if (!this.state.stats.completedActivities) {
            this.state.stats.completedActivities = [];
        }
        this.state.stats.completedActivities.push({
            ...activity,
            completedAt: new Date().toISOString()
        });
        
        // Check for new achievements
        this.checkAchievements();
        
        // Save to localStorage
        localStorage.setItem('stats', JSON.stringify(this.state.stats));
        
        // Update UI
        this.loadStats();
        this.showToast('🎉 Atividade concluída! Parabéns!', 'success');
        
        // Close modal
        document.getElementById('activity-modal')?.setAttribute('aria-hidden', 'true');
    }

    updateStreak() {
        const today = new Date();
        const lastActivity = this.state.stats.lastActivityDate ? new Date(this.state.stats.lastActivityDate) : null;
        
        if (!lastActivity) {
            this.state.stats.streakDays = 1;
        } else {
            const daysDiff = Math.floor((today - lastActivity) / (1000 * 60 * 60 * 24));
            if (daysDiff === 1) {
                this.state.stats.streakDays++;
            } else if (daysDiff > 1) {
                this.state.stats.streakDays = 1;
            }
        }
    }

    // ===== CALENDAR MANAGEMENT =====
    loadCalendar() {
        this.renderCalendar();
    }

    navigateWeek(direction) {
        const currentWeek = new Date(this.state.currentWeek);
        currentWeek.setDate(currentWeek.getDate() + (direction * 7));
        this.state.currentWeek = currentWeek;
        this.renderCalendar();
    }

    renderCalendar() {
        const calendarTitle = document.getElementById('calendar-title');
        const calendarGrid = document.getElementById('calendar-grid');
        
        if (!calendarTitle || !calendarGrid) return;

        const startOfWeek = this.getStartOfWeek(this.state.currentWeek);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        
        calendarTitle.textContent = `${this.formatDate(startOfWeek)} - ${this.formatDate(endOfWeek)}`;
        
        calendarGrid.innerHTML = this.generateCalendarDays(startOfWeek);
        
        // Add drag and drop functionality
        this.setupCalendarDragDrop();
    }

    getStartOfWeek(date) {
        const start = new Date(date);
        const day = start.getDay();
        const diff = start.getDate() - day;
        return new Date(start.setDate(diff));
    }

    formatDate(date) {
        return date.toLocaleDateString('pt-BR', { 
            day: '2-digit', 
            month: 'long' 
        });
    }

    generateCalendarDays(startDate) {
        const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        let html = '';
        
        // Header
        days.forEach(day => {
            html += `<div class="calendar-day-header">${day}</div>`;
        });
        
        // Days
        for (let i = 0; i < 7; i++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + i);
            const dateKey = currentDate.toISOString().split('T')[0];
            const plannedActivities = this.state.plannedActivities[dateKey] || [];
            
            html += `
                <div class="calendar-day" data-date="${dateKey}">
                    <div class="calendar-day-number">${currentDate.getDate()}</div>
                    <div class="calendar-activities">
                        ${plannedActivities.map(activity => `
                            <div class="calendar-activity" title="${activity.title}">
                                ${activity.image} ${activity.title.substring(0, 15)}...
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        return html;
    }

    setupCalendarDragDrop() {
        // This would implement drag and drop functionality
        // For now, we'll use click to schedule
        document.querySelectorAll('.calendar-day').forEach(day => {
            day.addEventListener('click', (e) => {
                const date = e.currentTarget.dataset.date;
                this.showScheduleModal(date);
            });
        });
    }

    scheduleActivity(activity) {
        this.showScheduleModal(null, activity);
    }

    showScheduleModal(date, activity) {
        // This would show a modal to schedule activities
        // For simplicity, we'll just add to today
        const today = new Date().toISOString().split('T')[0];
        const targetDate = date || today;
        
        if (!this.state.plannedActivities[targetDate]) {
            this.state.plannedActivities[targetDate] = [];
        }
        
        if (activity) {
            this.state.plannedActivities[targetDate].push(activity);
            localStorage.setItem('plannedActivities', JSON.stringify(this.state.plannedActivities));
            this.renderCalendar();
            this.showToast('Atividade agendada com sucesso!', 'success');
            document.getElementById('activity-modal')?.setAttribute('aria-hidden', 'true');
        }
    }

    // ===== ACHIEVEMENTS SYSTEM =====
    loadAchievements() {
        this.renderAchievements();
    }

    checkAchievements() {
        const newAchievements = [];
        
        // First activity achievement
        if (this.state.stats.totalActivities === 1 && !this.hasAchievement('first-activity')) {
            newAchievements.push({
                id: 'first-activity',
                title: 'Primeira Aventura',
                description: 'Completou sua primeira atividade!',
                icon: '🌟',
                unlockedAt: new Date().toISOString()
            });
        }
        
        // Activity streak achievements
        if (this.state.stats.streakDays === 7 && !this.hasAchievement('week-streak')) {
            newAchievements.push({
                id: 'week-streak',
                title: 'Semana Completa',
                description: '7 dias consecutivos de atividades!',
                icon: '🔥',
                unlockedAt: new Date().toISOString()
            });
        }
        
        // Category-specific achievements
        const completedCategories = this.getCompletedCategories();
        Object.keys(completedCategories).forEach(category => {
            const count = completedCategories[category];
            const achievementId = `${category}-master`;
            
            if (count >= 5 && !this.hasAchievement(achievementId)) {
                newAchievements.push({
                    id: achievementId,
                    title: `Mestre em ${this.getCategoryName(category)}`,
                    description: `Completou 5 atividades de ${this.getCategoryName(category)}!`,
                    icon: this.getCategoryIcon(category),
                    unlockedAt: new Date().toISOString()
                });
            }
        });
        
        // Add new achievements
        if (newAchievements.length > 0) {
            this.state.achievements.push(...newAchievements);
            localStorage.setItem('achievements', JSON.stringify(this.state.achievements));
            
            // Show achievement notifications
            newAchievements.forEach(achievement => {
                this.showAchievementNotification(achievement);
            });
            
            this.renderAchievements();
        }
    }

    hasAchievement(achievementId) {
        return this.state.achievements.some(a => a.id === achievementId);
    }

    getCompletedCategories() {
        const categories = {};
        (this.state.stats.completedActivities || []).forEach(activity => {
            activity.categories.forEach(category => {
                categories[category] = (categories[category] || 0) + 1;
            });
        });
        return categories;
    }

    showAchievementNotification(achievement) {
        // Create a special achievement toast
        const toast = document.createElement('div');
        toast.className = 'toast toast--achievement toast--show';
        toast.innerHTML = `
            <div class="achievement-notification">
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-content">
                    <div class="achievement-title">🏆 Nova Conquista!</div>
                    <div class="achievement-name">${achievement.title}</div>
                    <div class="achievement-description">${achievement.description}</div>
                </div>
            </div>
        `;
        
        document.getElementById('toast-container')?.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }

    renderAchievements() {
        const badgesGrid = document.getElementById('badges-grid');
        if (!badgesGrid) return;

        const allAchievements = this.getAllPossibleAchievements();
        
        badgesGrid.innerHTML = allAchievements.map(achievement => {
            const isUnlocked = this.hasAchievement(achievement.id);
            return `
                <div class="badge-card ${isUnlocked ? 'badge-card--unlocked' : 'badge-card--locked'}">
                    <div class="badge-icon">${isUnlocked ? achievement.icon : '🔒'}</div>
                    <div class="badge-title">${achievement.title}</div>
                    <div class="badge-description">${achievement.description}</div>
                    ${isUnlocked ? `<div class="badge-date">Conquistado em ${new Date(this.state.achievements.find(a => a.id === achievement.id)?.unlockedAt).toLocaleDateString('pt-BR')}</div>` : ''}
                </div>
            `;
        }).join('');
    }

    getAllPossibleAchievements() {
        return [
            { id: 'first-activity', title: 'Primeira Aventura', description: 'Complete sua primeira atividade', icon: '🌟' },
            { id: 'week-streak', title: 'Semana Completa', description: '7 dias consecutivos de atividades', icon: '🔥' },
            { id: 'arte-master', title: 'Mestre em Arte', description: 'Complete 5 atividades de arte', icon: '🎨' },
            { id: 'ciencia-master', title: 'Mestre em Ciência', description: 'Complete 5 atividades de ciência', icon: '🔬' },
            { id: 'movimento-master', title: 'Mestre em Movimento', description: 'Complete 5 atividades de movimento', icon: '🏃' },
            { id: 'leitura-master', title: 'Mestre em Leitura', description: 'Complete 5 atividades de leitura', icon: '📚' },
            { id: 'culinaria-master', title: 'Mestre em Culinária', description: 'Complete 5 atividades de culinária', icon: '👨‍🍳' }
        ];
    }

    // ===== STATS MANAGEMENT =====
    loadStats() {
        document.getElementById('total-activities').textContent = this.state.stats.totalActivities;
        document.getElementById('total-time').textContent = `${Math.floor(this.state.stats.totalTime / 60)}h ${this.state.stats.totalTime % 60}m`;
        document.getElementById('streak-days').textContent = this.state.stats.streakDays;
    }

    // ===== CHILDREN MANAGEMENT =====
    loadChildren() {
        this.renderChildren();
    }

    renderChildren() {
        const childrenList = document.getElementById('children-list');
        if (!childrenList) return;

        if (this.state.children.length === 0) {
            childrenList.innerHTML = `
                <div class="empty-state">
                    <p>Nenhuma criança cadastrada ainda. Adicione uma criança para personalizar as atividades!</p>
                </div>
            `;
            return;
        }

        childrenList.innerHTML = this.state.children.map(child => `
            <div class="child-card">
                <div class="child-avatar">${child.avatar || '👶'}</div>
                <div class="child-info">
                    <h3 class="child-name">${child.name}</h3>
                    <p class="child-age">${child.age} anos</p>
                    <div class="child-interests">
                        ${child.interests.map(interest => `
                            <span class="interest-tag">${this.getCategoryIcon(interest)} ${this.getCategoryName(interest)}</span>
                        `).join('')}
                    </div>
                </div>
                <button class="btn btn--secondary btn--small" onclick="app.editChild('${child.id}')">
                    Editar
                </button>
            </div>
        `).join('');
    }

    showAddChildModal() {
        // For simplicity, we'll use prompt for now
        const name = prompt('Nome da criança:');
        if (!name) return;
        
        const age = parseInt(prompt('Idade da criança:'));
        if (!age || age < 1 || age > 18) {
            this.showToast('Idade inválida', 'error');
            return;
        }
        
        const child = {
            id: Date.now().toString(),
            name,
            age,
            interests: [],
            avatar: '👶'
        };
        
        this.state.children.push(child);
        localStorage.setItem('children', JSON.stringify(this.state.children));
        this.renderChildren();
        this.showToast('Criança adicionada com sucesso!', 'success');
    }

    editChild(childId) {
        // For simplicity, we'll just show an alert
        this.showToast('Funcionalidade de edição em desenvolvimento', 'info');
    }

    // ===== UTILITY FUNCTIONS =====
    validateForm(form) {
        const requiredFields = form.querySelectorAll('[required]');
        let isValid = true;
        
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                this.showFieldError(field, 'Este campo é obrigatório');
                isValid = false;
            }
        });
        
        return isValid;
    }

    validateField(field) {
        this.clearFieldError(field);
        
        if (field.hasAttribute('required') && !field.value.trim()) {
            this.showFieldError(field, 'Este campo é obrigatório');
            return false;
        }
        
        return true;
    }

    showFieldError(field, message) {
        this.clearFieldError(field);
        
        const errorElement = document.createElement('div');
        errorElement.className = 'field-error';
        errorElement.textContent = message;
        errorElement.setAttribute('role', 'alert');
        
        field.parentNode.appendChild(errorElement);
        field.classList.add('field--error');
        field.setAttribute('aria-invalid', 'true');
    }

    clearFieldError(field) {
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
        
        field.classList.remove('field--error');
        field.removeAttribute('aria-invalid');
    }

    setButtonLoading(button, isLoading) {
        if (isLoading) {
            button.classList.add('btn--loading');
            button.disabled = true;
        } else {
            button.classList.remove('btn--loading');
            button.disabled = false;
        }
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast--${type} toast--show`;
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-message">${message}</span>
                <button class="toast-close" aria-label="Fechar notificação">×</button>
            </div>
        `;
        
        const container = document.getElementById('toast-container');
        if (container) {
            container.appendChild(toast);
            
            // Auto remove after 5 seconds
            setTimeout(() => {
                toast.classList.remove('toast--show');
                setTimeout(() => toast.remove(), 300);
            }, 5000);
            
            // Manual close
            toast.querySelector('.toast-close')?.addEventListener('click', () => {
                toast.classList.remove('toast--show');
                setTimeout(() => toast.remove(), 300);
            });
        }
    }

    handleSmoothScroll(e) {
        e.preventDefault();
        const targetId = e.currentTarget.getAttribute('href');
        const targetElement = document.querySelector(targetId);
        
        if (targetElement) {
            targetElement.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    }

    handleKeyboardNavigation(e) {
        // ESC to close modals
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal[aria-hidden="false"]');
            if (openModal) {
                openModal.setAttribute('aria-hidden', 'true');
            }
        }
        
        // Enter to activate buttons and links
        if (e.key === 'Enter' && e.target.matches('[role="button"]')) {
            e.target.click();
        }
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ===== SERVICE WORKER SETUP =====
    async setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                console.log('Registering service worker...');
                const registration = await navigator.serviceWorker.register('/sw.js');
                
                console.log('Service Worker registered successfully:', registration);
                
                // Handle service worker updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            this.showToast('Nova versão disponível! Recarregue a página.', 'info');
                        }
                    });
                });
                
                // Listen for messages from service worker
                navigator.serviceWorker.addEventListener('message', (event) => {
                    if (event.data.type === 'SYNC_COMPLETE') {
                        const { type, count } = event.data.data;
                        this.showToast(`${count} ${type === 'activity-completion' ? 'atividades sincronizadas' : 'agendamentos sincronizados'}!`, 'success');
                    }
                });
                
                // Request notification permission
                if ('Notification' in window && Notification.permission === 'default') {
                    const permission = await Notification.requestPermission();
                    if (permission === 'granted') {
                        console.log('Notification permission granted');
                    }
                }
                
                // Register for background sync
                if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
                    console.log('Background sync supported');
                }
                
            } catch (error) {
                console.log('Service Worker registration failed:', error);
            }
        }
    }
}

// ===== INITIALIZE APP =====
let app;

document.addEventListener('DOMContentLoaded', () => {
    app = new EduFeriasApp();
});

// ===== ADDITIONAL CSS FOR DYNAMIC ELEMENTS =====
const additionalStyles = `
    .activity-card__image {
        text-align: center;
        margin-bottom: var(--space-4);
    }
    
    .activity-emoji {
        font-size: var(--text-4xl);
        display: block;
    }
    
    .activity-card__title {
        font-size: var(--text-lg);
        font-weight: var(--font-semibold);
        margin-bottom: var(--space-2);
        color: var(--neutral-900);
    }
    
    .activity-card__description {
        font-size: var(--text-sm);
        color: var(--neutral-600);
        margin-bottom: var(--space-4);
        line-height: var(--leading-relaxed);
    }
    
    .activity-card__meta {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2);
        margin-bottom: var(--space-4);
    }
    
    .activity-tag {
        font-size: var(--text-xs);
        padding: var(--space-1) var(--space-2);
        background: var(--neutral-100);
        border-radius: var(--radius-full);
        color: var(--neutral-700);
        font-weight: var(--font-medium);
    }
    
    .activity-card__categories {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2);
        margin-bottom: var(--space-4);
    }
    
    .category-badge {
        font-size: var(--text-xs);
        padding: var(--space-1) var(--space-2);
        border-radius: var(--radius-full);
        font-weight: var(--font-medium);
    }
    
    .category-badge--arte { background: rgba(255, 107, 107, 0.1); color: var(--primary-600); }
    .category-badge--ciencia { background: rgba(78, 205, 196, 0.1); color: var(--secondary-600); }
    .category-badge--movimento { background: rgba(69, 183, 209, 0.1); color: var(--tertiary-600); }
    .category-badge--leitura { background: rgba(39, 174, 96, 0.1); color: var(--success-500); }
    .category-badge--culinaria { background: rgba(243, 156, 18, 0.1); color: var(--warning-500); }
    
    .activity-card__action {
        width: 100%;
        margin-top: auto;
    }
    
    .btn--small {
        padding: var(--space-2) var(--space-4);
        font-size: var(--text-sm);
    }
    
    .activity-modal__content {
        max-width: 600px;
    }
    
    .activity-modal__header {
        display: flex;
        gap: var(--space-4);
        margin-bottom: var(--space-6);
    }
    
    .activity-emoji-large {
        font-size: var(--text-6xl);
        flex-shrink: 0;
    }
    
    .activity-modal__meta {
        flex: 1;
    }
    
    .activity-tags {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2);
        margin-bottom: var(--space-3);
    }
    
    .activity-modal__section {
        margin-bottom: var(--space-6);
    }
    
    .activity-modal__section h4 {
        font-size: var(--text-lg);
        font-weight: var(--font-semibold);
        margin-bottom: var(--space-3);
        color: var(--neutral-900);
    }
    
    .materials-list,
    .instructions-list {
        padding-left: var(--space-5);
        margin-bottom: 0;
    }
    
    .materials-list li,
    .instructions-list li {
        margin-bottom: var(--space-2);
        line-height: var(--leading-relaxed);
    }
    
    .benefits-list {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2);
    }
    
    .benefit-tag {
        background: var(--success-100);
        color: var(--success-500);
        padding: var(--space-1) var(--space-3);
        border-radius: var(--radius-full);
        font-size: var(--text-sm);
        font-weight: var(--font-medium);
    }
    
    .activity-modal__actions {
        display: flex;
        gap: var(--space-3);
        margin-top: var(--space-6);
        padding-top: var(--space-6);
        border-top: 1px solid var(--neutral-200);
    }
    
    .calendar-day-header {
        background: var(--neutral-200);
        padding: var(--space-2);
        text-align: center;
        font-weight: var(--font-semibold);
        font-size: var(--text-sm);
        color: var(--neutral-700);
    }
    
    .calendar-day {
        background: white;
        border: 1px solid var(--neutral-200);
        padding: var(--space-2);
        min-height: 80px;
        cursor: pointer;
        transition: background-color var(--duration-normal) var(--ease-out);
    }
    
    .calendar-day:hover {
        background: var(--neutral-50);
    }
    
    .calendar-day-number {
        font-weight: var(--font-semibold);
        margin-bottom: var(--space-1);
    }
    
    .calendar-activity {
        background: var(--primary-100);
        color: var(--primary-600);
        padding: var(--space-1);
        border-radius: var(--radius-sm);
        font-size: var(--text-xs);
        margin-bottom: var(--space-1);
        cursor: pointer;
    }
    
    .badge-card {
        background: white;
        border: 1px solid var(--neutral-200);
        border-radius: var(--radius-lg);
        padding: var(--space-4);
        text-align: center;
        transition: all var(--duration-normal) var(--ease-out);
    }
    
    .badge-card--unlocked {
        border-color: var(--success-300);
        background: var(--success-50);
    }
    
    .badge-card--locked {
        opacity: 0.6;
    }
    
    .badge-card:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
    }
    
    .badge-icon {
        font-size: var(--text-3xl);
        margin-bottom: var(--space-2);
    }
    
    .badge-title {
        font-weight: var(--font-semibold);
        margin-bottom: var(--space-1);
        color: var(--neutral-900);
    }
    
    .badge-description {
        font-size: var(--text-sm);
        color: var(--neutral-600);
        margin-bottom: var(--space-2);
    }
    
    .badge-date {
        font-size: var(--text-xs);
        color: var(--success-600);
        font-weight: var(--font-medium);
    }
    
    .child-card {
        display: flex;
        align-items: center;
        gap: var(--space-4);
        background: white;
        border: 1px solid var(--neutral-200);
        border-radius: var(--radius-lg);
        padding: var(--space-4);
        margin-bottom: var(--space-4);
    }
    
    .child-avatar {
        font-size: var(--text-3xl);
        width: 60px;
        height: 60px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--primary-100);
        border-radius: var(--radius-full);
    }
    
    .child-info {
        flex: 1;
    }
    
    .child-name {
        font-size: var(--text-lg);
        font-weight: var(--font-semibold);
        margin-bottom: var(--space-1);
        color: var(--neutral-900);
    }
    
    .child-age {
        color: var(--neutral-600);
        margin-bottom: var(--space-2);
    }
    
    .child-interests {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-1);
    }
    
    .interest-tag {
        font-size: var(--text-xs);
        padding: var(--space-1) var(--space-2);
        background: var(--neutral-100);
        border-radius: var(--radius-full);
        color: var(--neutral-700);
    }
    
    .field-error {
        color: var(--error-500);
        font-size: var(--text-xs);
        margin-top: var(--space-1);
    }
    
    .field--error {
        border-color: var(--error-500) !important;
    }
    
    .toast--achievement {
        background: linear-gradient(135deg, var(--primary-500), var(--secondary-500));
        color: white;
        border: none;
        min-width: 350px;
    }
    
    .achievement-notification {
        display: flex;
        align-items: center;
        gap: var(--space-3);
    }
    
    .achievement-icon {
        font-size: var(--text-3xl);
        animation: bounce 0.6s ease-in-out;
    }
    
    .achievement-title {
        font-weight: var(--font-bold);
        margin-bottom: var(--space-1);
    }
    
    .achievement-name {
        font-weight: var(--font-semibold);
        margin-bottom: var(--space-1);
    }
    
    .achievement-description {
        font-size: var(--text-sm);
        opacity: 0.9;
    }
    
    @keyframes bounce {
        0%, 20%, 53%, 80%, 100% {
            transform: translate3d(0,0,0);
        }
        40%, 43% {
            transform: translate3d(0, -30px, 0);
        }
        70% {
            transform: translate3d(0, -15px, 0);
        }
        90% {
            transform: translate3d(0, -4px, 0);
        }
    }
    
    .toast-content {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-3);
    }
    
    .toast-close {
        background: none;
        border: none;
        color: inherit;
        cursor: pointer;
        font-size: var(--text-lg);
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--radius-sm);
        transition: background-color var(--duration-normal) var(--ease-out);
    }
    
    .toast-close:hover {
        background: rgba(0, 0, 0, 0.1);
    }
`;

// Add the additional styles to the page
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);
