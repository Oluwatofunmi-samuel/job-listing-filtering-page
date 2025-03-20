import { reactive, html } from './lib.js'

class Filters {
    constructor() {
        this.storageKey = 'filters'
        this.defaultFilters = ['Frontend', 'CSS', 'JavaScript']

        this.data = reactive({
            filters: this.getFilters()
        })
        
        this.data.$on('filters', () => this.saveFilters())
    }

    getFilters() {
        const filters = localStorage.getItem(this.storageKey)
        return filters ? JSON.parse(filters) : this.defaultFilters
    }

    saveFilters() {
        const filters = JSON.stringify(this.data.filters)
        localStorage.setItem(this.storageKey, filters)
    }

    get() {
        return this.data.filters
    }

    toggle(filter) {
        const { filters } = this.data
        const index = filters.indexOf(filter)
        if (index < 0) filters.push(filter)
        else filters.splice(index, 1)
    }

    clear() {
        const { filters } = this.data
        filters.splice(0, filters.length)
    }

    render() {
        const isEmpty = () => this.data.filters.length == 0

        return html`
        <section class="filters" data-empty="${isEmpty}">
            <h2 class="visually-hidden">Jobs Filters</h2>

            <ul class="filters__list">${() => this.renderFilters()}</ul>

            <button class="filters__clear" aria-controls="jobs"
                @click="${() => this.clear()}">
                
                Clear
                <span class="visually-hidden">filters</span>
            </button>
        </section>
        `
    }

    renderFilters() {
        return this.data.filters.map(filter => {
            return html`
            <li class="filter">
                <span>${filter}</span>
                <button class="filter__btn" aria-controls="jobs"
                    @click="${() => this.toggle(filter)}">
                    
                    <span class="visually-hidden">Remove filter</span>
                </button>
            </li>
            `
        })
    }
}

class Jobs {
    constructor(filters) {
        this.filters = filters
        this.demoError = location.search.includes('error')
        this.url = this.demoError ? 'wrong.json' : 'data.json'

        this.data = reactive({
            jobs: [],
            loading: true
        })

        this.loadJobs()
    }

    async loadJobs() {
        const { data } = this
        data.loading = true
        data.jobs = await this.getJobs()
        data.loading = false

        if (this.demoError) this.url = 'data.json'
    }

    async getJobs() {
        try {
            const artificialLatency = 3000
            await new Promise(r => setTimeout(r, artificialLatency))

            const response = await fetch(this.url)
            if (!response.ok) throw new Error('Bad response')
            
            const jobs = await response.json()
            for (const job of jobs) {
                const keywords = [job.role, job.level, ...job.languages.concat(job.tools)]
                job.keywords = keywords.filter(Boolean)
            }

            return jobs
        } catch {
            return []
        }
    }

    getFilteredJobs() {
        const filters = this.filters.get()
        if (filters.length == 0) return [...this.data.jobs]

        return this.data.jobs.filter(job =>
            filters.every(filter => job.keywords.includes(filter))
        )
    }

    render() {
        return html`
        <section id="jobs" aria-live="polite"
            aria-busy="${() => this.data.loading}">
            
            <h2 class="visually-hidden">Jobs Listing</h2>

            <div class="jobs__loader">
                <span class="visually-hidden">Jobs are loading</span>
                <div class="loader__circle"></div>
                <div class="loader__circle"></div>
                <div class="loader__circle"></div>
            </div>

            <ul class="jobs">${() => this.renderJobs()}</ul>

            <div class="jobs__error">
                <p>There was an error loading jobs.</p>
                <button class="keyword__btn jobs__reload"
                    @click="${() => this.loadJobs()}">
                    Reload jobs
                </button>
            </div>
        </section>
        `
    }

    renderJobs() {
        return this.getFilteredJobs().map((job, i) => {
            return html`
            <li class="job" data-featured="${job.featured}" style="--rank: ${i}">
                <article class="job__wrapper">
                    <h3 class="visually-hidden">${job.position} at ${job.company}</h3>
                    ${this.renderDescription(job)}
                    ${this.renderKeywords(job)}
                </article>
            </li>
            `
        })
    }

    renderDescription(job) {
        const logo = job.logo ? html`
        <img src="${job.logo}" alt="${job.company} Logo" class="job__logo">
        ` : ''

        return html`
        <section class="job__description">
            <h4 class="visually-hidden">Job description</h4>
            ${logo}
            <div class="job__main">
                <div class="job__top">
                    ${this.renderTags(job)}
                    <p class="job__company">${job.company}</p>
                </div>
                <p class="job__position">
                    <a class="job__link" href="#">${job.position}</a>
                </p>
                <div class="job__bot">
                    <p class="job__bot__item job__posted">${job.postedAt}</p>
                    <p class="job__bot__item job__contract">${job.contract}</p>
                    <p class="job__bot__item job__location">${job.location}</p>
                </div>
            </div>
        </section>
        `
    }

    renderTags(job) {
        if (!(job.new || job.featured)) return ''

        const tagNew = job.new ? html`<span class="job__tag job__tag--new">New</span>` : ''
        const tagFeatured = job.featured ? html`<span class="job__tag job__tag--featured">Featured</span>` : ''

        return html`
        <p class="job__tags">${tagNew} ${tagFeatured}</p>
        `
    }

    renderKeywords(job) {
        const keywords = job.keywords
        if (keywords.length == 0) return ''

        return html`
        <section class="job__keywords">
            <h4 class="visually-hidden">Job keywords</h4>
            <ul class="keywords__list">${this.renderKeywordsList(keywords)}</ul>
        </section>
        `
    }

    renderKeywordsList(keywords) {
        return keywords.map(keyword => {
            const isPressed = () => (
                this.filters.get().includes(keyword) ? 'true' : 'false'
            )
            
            return html`
            <li class="job__keyword">
                <button class="keyword__btn"
                    aria-pressed="${isPressed}"
                    aria-controls="jobs"
                    @click="${() => this.filters.toggle(keyword)}">
                    ${keyword}
                </button>
            </li>
            `
        })
    }
}

// Initialize and render everything
const filters = new Filters()
const jobs = new Jobs(filters)

html`
${filters.render()}
${jobs.render()}
`(document.body)
