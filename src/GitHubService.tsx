import BackendService from './BackendService.tsx'
import { ArenaInfo } from './types.tsx'

export default class GitHubService {
	static #ARENA_VERSION = 1
	static #CLIENT_ID = '19698a5006b153e8a671'
	static #STARTED = sessionStorage.getItem('PageLoaded')
	static #SESSION_KEY = 'GitHub session'
	static #waitUntil = (timestamp: number) => new Promise((resolve) => setTimeout(resolve, timestamp - Date.now()))
	static getClientId() {
		return GitHubService.#CLIENT_ID
	}
	static getSession() {
		const session = localStorage.getItem(GitHubService.#SESSION_KEY)
		if (session === null) {
			return null
		}
		try {
			return JSON.parse(session)
		} catch (error) {}
		return session
	}
	static getSessionStorage() {
		return GitHubService.getSession()?.storage ?? {}
	}
	static setSessionStorage(storage: string) {
		const session = GitHubService.getSession() ?? {}
		session.storage = storage
		localStorage.setItem(GitHubService.#SESSION_KEY, JSON.stringify(session))
	}
	static async fetch(path: string, init: any = {}): Promise<Response> {
		const accessToken = GitHubService.getSession()?.accessToken
		if (accessToken) {
			if (init.headers === undefined) {
				init.headers = {}
			}
			if (init.headers.Authorization === undefined) {
				init.headers.Authorization = 'token ' + accessToken
			}
		}
		if (typeof init.body === 'object') {
			init.body = JSON.stringify(init.body)
		}
		return await fetch(new Request('https://api.github.com/' + path, init)).then(async (response) => {
			if (localStorage.getItem('GitHub API debug') !== null) {
				let a = path.split('/')[0]
				let reset = localStorage.getItem('_GitHub ' + a + ' x-ratelimit-reset')
				if (response.headers.has('x-ratelimit-reset')) {
					if (reset !== response.headers.get('x-ratelimit-reset')) {
						reset = ''
						debugger // !== should maybe be ===
					}
					localStorage.setItem('_GitHub ' + a + ' x-ratelimit-reset', response.headers.get('x-ratelimit-reset') ?? '')
				}
				if (response.headers.has('x-ratelimit-used')) {
					let b = parseInt(response.headers.get('x-ratelimit-used') ?? '0')
					let value = reset ? b : Math.max(parseInt(localStorage.getItem('_GitHub ' + a + ' x-ratelimit-used') ?? '0'), b)
					localStorage.setItem('_GitHub ' + a + ' x-ratelimit-used', value.toString())
				}
				if (response.headers.has('x-ratelimit-remaining')) {
					let b = parseInt(response.headers.get('x-ratelimit-remaining') ?? '0')
					let value = reset ? b : Math.max(parseInt(localStorage.getItem('_GitHub ' + a + ' x-ratelimit-remaining') ?? '0'), b)
					localStorage.setItem('_GitHub ' + a + ' x-ratelimit-remaining', value.toString())
				}
				if (response.headers.has('x-ratelimit-limit')) {
					let b = parseInt(response.headers.get('x-ratelimit-limit') ?? '0')
					let value = reset ? b : Math.max(parseInt(localStorage.getItem('_GitHub ' + a + ' x-ratelimit-limit') ?? '0'), b)
					localStorage.setItem('_GitHub ' + a + ' x-ratelimit-limit', value.toString())
				}
			}
			if (response.status === 200) {
				return response
			} else if (response.status === 401) {
				if (accessToken) {
					GitHubService.logout()
					throw new Error('Unauthorized GitHub OAuth-Token. Logged out.')
				}
				console.error('API call requires authorization. Call dropped.', path)
				return await new Promise(() => {})
			} else if ([403, 429 /*Unconfirmed*/].includes(response.status)) {
				let timestamp = 1000 * (parseInt(response.headers.get('x-ratelimit-reset') ?? '0') + 1)
				if (this.isLoggedIn()) {
					localStorage.setItem('PopupMessage-' + this.#STARTED + timestamp, 'GitHub API rate limit reached\n424px\nWait until the <a href="https://docs.github.com/en/free-pro-team@latest/rest/reference/rate-limit" target="_blank">API rate limit</a> timer resets: <time class="countdown" datetime="' + new Date(timestamp) + '"></time>')
				} else {
					localStorage.setItem('PopupMessage-' + this.#STARTED + timestamp, 'GitHub API rate limit reached\n371px\nGitHub has a lower <a href="https://docs.github.com/en/free-pro-team@latest/rest/reference/rate-limit" target="_blank">API rate limit</a> for unsigned requests. <a href="https://algorithmic.games/login">Login</a> to be able to continue to create matches or wait until the timer resets: <time class="countdown" datetime="' + new Date(timestamp) + '"></time>')
				}
				return this.#waitUntil(timestamp).then(() => GitHubService.fetch(path, init))
			}
			throw new Error('Uncaught response: ' + response.status + ' ' + response.statusText)
		})
	}
	static formatMarkdown(markdown: string, options: any = {}) {
		let resolve: (value: any) => void
		let reject
		let promise = new Promise((_resolve, _reject) => {
			resolve = _resolve
			reject = _reject
		})
		let iframe = document.createElement('iframe')
		iframe.sandbox = 'allow-same-origin'
		GitHubService.fetch('markdown', {
			method: 'POST',
			body: JSON.stringify({
				text: markdown,
			}),
			headers: {
				Accept: 'application/vnd.github.v3+json',
				'Content-Type': 'application/json',
			},
		}).then((response) => response.text()).then((html) => {
			function awaitPlacement() {
				if (iframe.parentElement) {
					let iframeDocument = iframe.contentWindow?.window.document
					function awaitStylesheets() {
						if (iframeDocument && 1 < iframeDocument.styleSheets.length) {
							iframe.style.width = iframeDocument.documentElement.scrollWidth + 'px'
							iframe.style.height = iframeDocument.documentElement.scrollHeight + 'px'
						} else {
							window.requestAnimationFrame(awaitStylesheets)
						}
					}
					awaitStylesheets()
				} else {
					window.requestAnimationFrame(awaitPlacement)
				}
			}
			awaitPlacement()
			iframe.srcdoc = `<!DOCTYPE html>
<html>
	<head>
		<link rel="stylesheet" href="https://algorithmic.games/defaults.css">
		<style>
			${
				options.removeBodyMargin
					? `html, body {
				margin: 0
				padding: 0
			}
			`
					: ''
			}body>*:first-child {
				margin-top:0
			}
			p {
				white-space: initial
			}
			h3 {
				margin-bottom: 0.2em
			}
			h3, h3+p, h3+ul, p+ul {
				margin-top: 0
			}
			h3+p:has(+ ul) {
				margin-bottom: 0
			}
		</style>
	</head>
	<body>
		${html.trim().replaceAll('\n', '\n\t\t')}${options.suffix ? '\n\t\t' + options.suffix : ''}
	</body>
</html>`
			resolve(iframe)
		}).catch(reject)
		return options.async ? promise : iframe
	}
	static fetchArenas(): Promise<ArenaInfo[]> {
		return GitHubService.fetch('search/repositories?q=topic:Algorithmic-Games+topic:Algorithmic-Games-Arena-v' + GitHubService.#ARENA_VERSION).then((response) => response.json()).then((json) => {
			const arenas: ArenaInfo[] = []
			const promises: Promise<void>[] = []
			json.items.forEach((repo: any) => {
				const data = new ArenaInfo({
					name: repo.full_name.replace(/.*\/|-Arena/g, ''),
					official: repo.owner.login === 'AlgorithmicGames',
					raw_url: null,
					defaultBranchURL: 'https://raw.githubusercontent.com/' + repo.full_name + '/' + repo.default_branch + '/',
					html_url: repo.html_url,
					full_name: repo.full_name,
					stars: repo.stargazers_count,
					commit: null,
					version: null,
				})
				arenas.push(data)
				const tagPromise = GitHubService.fetch(repo.tags_url.replace('https://api.github.com/', '')).then((response) => response.json())
				promises.push(
					GitHubService.fetch(repo.releases_url.replace(/https:\/\/api.github.com\/|{\/id}/g, '')).then((response) => response.json()).then((releases) => {
						if (0 < releases.length) {
							data.version = releases.sort((a: any, b: any) => (new Date(b.published_at) as any) - (new Date(a.published_at) as any))[0].tag_name
							data.raw_url = 'https://raw.githubusercontent.com/' + repo.full_name + '/' + data.version + '/'
							promises.push(tagPromise.then((tags) => {
								let index = 0
								while (data.commit === null) {
									const tag = tags[index++]
									if (tag.name === data.version) {
										data.commit = tag.commit.sha
									}
								}
							}))
						}
					}),
				)
			})
			return Promise.allSettled(promises).then(() => arenas)
		})
	}
	static fetchAnnouncements(amount: number) {
		return GitHubService.fetch('graphql', {
			method: 'POST',
			body: {
				query: `{
			repository(name: "Community", owner: "AlgorithmicGames") {
				discussions(
					categoryId: "DIC_kwDOKCNqZ84CYRsS"
					orderBy: {field: CREATED_AT, direction: DESC}
					last: ${amount}
				){
					nodes {
						title
						url
						createdAt
					}
				}
			}
		}`,
			},
		})
	}
	static login() {
		let oAuthCode = null
		oAuthCode = location.href.substr(location.href.indexOf('=') + 1)
		if (!GitHubService.getSession()?.accessToken) {
			GitHubService.logout()
		}
		if (oAuthCode !== null) {
			localStorage.setItem(GitHubService.#SESSION_KEY, '!' + oAuthCode)
			BackendService.call('login', { oAuthCode: oAuthCode, client_id: GitHubService.#CLIENT_ID }).then((response) => response.text()).then((accessToken) => {
				localStorage.setItem(GitHubService.#SESSION_KEY, JSON.stringify({ accessToken }))
				location.replace(location.protocol + '//' + location.host + location.pathname)
			}).catch((error) => {
				console.error(error)
				GitHubService.logout()
			})
		}
	}
	static isLoggedIn() {
		return !!GitHubService.getSession()?.accessToken
	}
	static logout() {
		localStorage.removeItem(GitHubService.#SESSION_KEY)
	}
}
