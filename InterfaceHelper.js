'use strict'

/** Resolved while this classic script loads (opaque iframe origins cannot use ES module import). */
const interfaceColorHelperUrl = (() => {
	try {
		const src = document.currentScript?.src
		return src ? new URL('ColorHelper.js', src).href : '/ColorHelper.js'
	} catch {
		return '/ColorHelper.js'
	}
})()

class InterfaceHelper {
	static #initiated = false
	static #wired = false
	static #onInit = null
	static #onWorkerAdded = null
	static #workers = new Map()
	static #pendingPosts = new Map()
	static #colorApi = null
	static #colorApiPromise = null
	static #colorContext = null

	static #loadClassicScript(src) {
		return new Promise((resolve, reject) => {
			for (const existing of document.getElementsByTagName('script')) {
				if (existing.src === src) {
					if (globalThis.ColorHelper) {
						resolve()
						return
					}
					existing.addEventListener('load', () => resolve(), { once: true })
					existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), {
						once: true,
					})
					return
				}
			}
			const script = document.createElement('script')
			script.src = src
			script.onload = () => resolve()
			script.onerror = () => reject(new Error(`Failed to load ${src}`))
			document.head.appendChild(script)
		})
	}

	static #ensureColorApi() {
		if (InterfaceHelper.#colorApi) {
			return Promise.resolve(InterfaceHelper.#colorApi)
		}
		if (globalThis.ColorHelper) {
			InterfaceHelper.#colorApi = globalThis.ColorHelper
			return Promise.resolve(InterfaceHelper.#colorApi)
		}
		if (!InterfaceHelper.#colorApiPromise) {
			InterfaceHelper.#colorApiPromise = InterfaceHelper.#loadClassicScript(interfaceColorHelperUrl).then(() => {
				InterfaceHelper.#colorApi = globalThis.ColorHelper
				return InterfaceHelper.#colorApi
			})
		}
		return InterfaceHelper.#colorApiPromise
	}

	static #refreshColorContext(init) {
		const apply = (ColorHelper) => {
			InterfaceHelper.#colorContext = ColorHelper.buildInterfaceColorContext(init)
		}
		if (InterfaceHelper.#colorApi) {
			apply(InterfaceHelper.#colorApi)
			return Promise.resolve()
		}
		if (globalThis.ColorHelper) {
			InterfaceHelper.#colorApi = globalThis.ColorHelper
			apply(InterfaceHelper.#colorApi)
			return Promise.resolve()
		}
		return InterfaceHelper.#ensureColorApi().then(apply)
	}

	/**
	 * Arena team/member color aligned with replay colors. When opponent members are not disclosed,
	 * `memberIndex` is ignored and the team color is returned.
	 * @param {number} teamIndex
	 * @param {number} [memberIndex]
	 * @returns {{ hue: number, saturation: number, lightness: number, R: number, G: number, B: number, RGB: string }}
	 */
	static GetColor(teamIndex, memberIndex) {
		const ColorHelper = InterfaceHelper.#colorApi ?? globalThis.ColorHelper
		const context = InterfaceHelper.#colorContext ?? {
			layout: { teamCount: 1, membersPerTeam: [1], onlySingleTeams: true },
			discloseMembers: 'No',
		}
		return ColorHelper.getInterfaceColor(teamIndex, memberIndex, context)
	}

	static preInit() {
		if (InterfaceHelper.#initiated) {
			console.error('InterfaceHelper is already initiated.')
			return
		}
		InterfaceHelper.#initiated = true

		void InterfaceHelper.#ensureColorApi()

		const globalStyle = document.createElement('link')
		globalStyle.rel = 'stylesheet'
		globalStyle.href = '/global.css'
		document.head.prepend(globalStyle)

		const fallbackStyle = document.createElement('style')
		fallbackStyle.textContent = 'html { background-color: var(--main-background-color); }'
		document.head.prepend(fallbackStyle)
	}

	/** Coordinator shell: popup opener or `/join` parent. */
	static #target() {
		return globalThis.opener ?? globalThis.parent
	}

	static #ensureWired() {
		if (InterfaceHelper.#wired) {
			return
		}
		InterfaceHelper.#wired = true
		globalThis.addEventListener('message', InterfaceHelper.#onWindowMessage)
	}

	/**
	 * Called once with cloned match settings (`{ settings, opponents, … }`).
	 * Register workers with the `workerAdded` callback (slot `0` after this handler returns, then each `{ type: 'WorkerAdded', slot }`).
	 * @param {(init: unknown, workerAdded: (participant: InterfaceHelperWorker) => void) => void} handler
	 */
	static onInit(handler) {
		InterfaceHelper.#onInit = handler
		InterfaceHelper.#ensureWired()
	}

	/**
	 * @deprecated Register workers via the `workerAdded` argument to {@link InterfaceHelper.onInit} instead.
	 * @param {(worker: InterfaceHelperWorker) => void} handler
	 */
	static workerAdded(handler) {
		InterfaceHelper.#onWorkerAdded = handler
		InterfaceHelper.#ensureWired()
	}

	static #registerWorker(handler) {
		InterfaceHelper.#onWorkerAdded = handler
	}

	static #dispatchInit(init) {
		void InterfaceHelper.#refreshColorContext(init)
			.catch((error) => {
				console.error(error)
			})
			.then(() => {
				InterfaceHelper.#onInit?.(init, InterfaceHelper.#registerWorker)
				InterfaceHelper.#attachWorker(0)
			})
	}

	/** Tell the coordinator the interface applied init and is listening. */
	static signalReady() {
		const t = InterfaceHelper.#target()
		if (t) {
			t.postMessage(null, '*')
		}
	}

	/** Coordinator init: `{ settings, opponents }` (see `cloneInterfaceWorkerInit`). */
	static #isInit(data) {
		if (typeof data !== 'object' || data === null) {
			return false
		}
		const type = data.type
		if (
			type === 'Post' || type === 'Kill' || type === 'WorkerAdded' || type === 'Response' ||
			type === 'Arena-Interface-Ready' || type === 'Arena-Interface-Disconnected'
		) {
			return false
		}
		const settings = data.settings
		if (settings !== undefined && typeof settings === 'object' && settings !== null) {
			return true
		}
		return data.general !== undefined && typeof data.general === 'object' && data.general !== null
	}

	static #unwrapPostEnvelope(data) {
		if (
			typeof data === 'object' &&
			data !== null &&
			data.type !== 'Post' &&
			typeof data.message === 'object' &&
			data.message !== null &&
			data.message.type === 'Post'
		) {
			return data.message
		}
		return data
	}

	static #isPost(data) {
		return typeof data === 'object' && data !== null && data.type === 'Post'
	}

	static #isDisconnected(data) {
		return typeof data === 'object' && data !== null && data.type === 'Arena-Interface-Disconnected'
	}

	static #showDisconnectedState(label) {
		const lock = document.getElementById('lock')
		if (!lock) {
			return
		}
		lock.classList.add('engaged')
		lock.classList.remove('booting')
		const span = lock.querySelector('span')
		if (span) {
			span.textContent = label
		}
	}

	static #coerceWorkerSlot(value) {
		if (typeof value === 'number' && Number.isFinite(value)) {
			return value
		}
		if (typeof value === 'string' && value !== '') {
			const n = Number(value)
			return Number.isFinite(n) ? n : 0
		}
		return 0
	}

	static #workerSlotFromEnvelope(data) {
		if (typeof data.workerSlot === 'number') {
			return data.workerSlot
		}
		if (typeof data.workerSlot === 'string') {
			return InterfaceHelper.#coerceWorkerSlot(data.workerSlot)
		}
		if (typeof data.workerName === 'string') {
			return data.workerName === '' ? 0 : InterfaceHelper.#coerceWorkerSlot(data.workerName)
		}
		if (data.type === 'Kill' && typeof data.slot === 'number') {
			return InterfaceHelper.#coerceWorkerSlot(data.slot)
		}
		return 0
	}

	static #sendResponse(value, options, messageIndex, workerSlot) {
		const t = InterfaceHelper.#target()
		if (!t) {
			return
		}
		const executionSteps = options?.executionSteps ?? { toRespond: 0, toTerminate: 0 }
		const idx = options?.messageIndex ?? messageIndex
		const slot = typeof options?.workerSlot === 'number' ? options.workerSlot : workerSlot
		t.postMessage({
			type: 'Response',
			response: {
				value,
				executionSteps,
				...(typeof idx === 'number' ? { messageIndex: idx } : {}),
				...(typeof slot === 'number' ? { workerSlot: slot } : {}),
				...(options?.console ? { console: options.console } : {}),
			},
		}, '*')
	}

	static #createWorker(workerSlot) {
		/** @type {number | null} */
		let lastMessageIndex = null
		const worker = {
			onMessage: null,
			onKilled: null,
			respond(value, options) {
				InterfaceHelper.#sendResponse(value, options, options?.messageIndex ?? lastMessageIndex, workerSlot)
			},
		}
		Object.defineProperty(worker, '_lastMessageIndex', {
			get: () => lastMessageIndex,
			set: (v) => {
				lastMessageIndex = v
			},
		})
		return worker
	}

	static #attachWorker(workerSlot) {
		if (!InterfaceHelper.#onWorkerAdded) {
			return
		}
		let worker = InterfaceHelper.#workers.get(workerSlot)
		if (worker) {
			return worker
		}
		worker = InterfaceHelper.#createWorker(workerSlot)
		InterfaceHelper.#workers.set(workerSlot, worker)
		InterfaceHelper.#onWorkerAdded(worker)
		const pending = InterfaceHelper.#pendingPosts.get(workerSlot)
		if (pending) {
			InterfaceHelper.#pendingPosts.delete(workerSlot)
			for (const post of pending) {
				InterfaceHelper.#deliverPost(post)
			}
		}
		return worker
	}

	static #deliverPost(data) {
		const workerSlot = InterfaceHelper.#workerSlotFromEnvelope(data)
		const worker = InterfaceHelper.#workers.get(workerSlot)
		if (!worker) {
			let pending = InterfaceHelper.#pendingPosts.get(workerSlot)
			if (!pending) {
				pending = []
				InterfaceHelper.#pendingPosts.set(workerSlot, pending)
			}
			pending.push(data)
			return
		}
		worker._lastMessageIndex = typeof data.messageIndex === 'number' ? data.messageIndex : null
		const message = {
			data: data.message,
			respond(value, options) {
				InterfaceHelper.#sendResponse(value, options, data.messageIndex, workerSlot)
			},
		}
		worker.onMessage?.(message)
	}

	static #onWindowMessage(messageEvent) {
		const data = InterfaceHelper.#unwrapPostEnvelope(messageEvent.data)
		if (InterfaceHelper.#isDisconnected(data)) {
			const label = typeof data.message === 'string' && data.message.trim() ? data.message.trim() : 'Match has ended'
			InterfaceHelper.#showDisconnectedState(label)
			return
		}
		if (InterfaceHelper.#isInit(data)) {
			InterfaceHelper.#dispatchInit(data)
			return
		}
		if (data.type === 'WorkerAdded' && typeof data.slot === 'number') {
			InterfaceHelper.#attachWorker(data.slot)
			return
		}
		if (data.type === 'Kill') {
			const workerSlot = InterfaceHelper.#workerSlotFromEnvelope(data)
			const worker = InterfaceHelper.#workers.get(workerSlot)
			if (!worker) {
				InterfaceHelper.#sendResponse('Dead', {}, data.messageIndex, workerSlot)
				return
			}
			let responded = false
			const priorRespond = worker.respond
			worker.respond = function (value, options) {
				responded = true
				return priorRespond.call(
					this,
					value,
					{ ...options, messageIndex: options?.messageIndex ?? data.messageIndex },
				)
			}
			worker.onKilled?.()
			worker.respond = priorRespond
			if (!responded) {
				priorRespond.call(worker, 'Dead', { messageIndex: data.messageIndex, workerSlot })
			}
			return
		}
		if (InterfaceHelper.#isPost(data)) {
			InterfaceHelper.#deliverPost(data)
		}
	}

	static #SEEDRANDOM_URL = 'https://cdnjs.cloudflare.com/ajax/libs/seedrandom/3.0.5/seedrandom.min.js'
	static #PARTICIPANT_HELPER_URL = '/ParticipantHelper.js'

	static #escapeJsString(value) {
		return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
	}

	static #buildNativeParticipantBootstrap(seed) {
		return `
			ParticipantHelper.preInit();
			Math.seedrandom('${InterfaceHelper.#escapeJsString(seed)}');
			delete Math.seedrandom;
		`.split('\n').map((line) => line.trim()).join('')
	}

	static #parseParticipantHeader(source) {
		try {
			return JSON.parse(source.substring(source.indexOf('/**') + 3, source.indexOf('**/')))
		} catch {
			return {}
		}
	}

	/** Unwrap {@link CreateParticipantWorker} `Response` envelopes for {@link InterfaceHelperWorker.respond}. */
	static participantWorkerResponse(data) {
		if (typeof data === 'object' && data !== null && data.type === 'Response' && typeof data.response === 'object' && data.response !== null && 'value' in data.response) {
			return data.response.value
		}
		return data
	}

	/**
	 * Fetch a participant script, load {@link ParticipantHelper}, and spawn a worker.
	 * @param {string} url Participant script URL
	 * @param {{ seed?: string, system?: string[] }} [options]
	 * @returns {Promise<Worker>}
	 */
	static CreateParticipantWorker(url, options = {}) {
		const seed = options.seed ?? ''
		const systemScripts = options.system ?? [InterfaceHelper.#SEEDRANDOM_URL]
		return Promise.all([
			fetch(url).then((response) => response.text()),
			fetch(InterfaceHelper.#PARTICIPANT_HELPER_URL).then((response) => response.text()),
		]).then(async ([participantSource, participantHelperSource]) => {
			const header = InterfaceHelper.#parseParticipantHeader(participantSource)
			const scope = url.slice(0, url.lastIndexOf('/') + 1)
			const dependencyUrls = (header.dependencies ?? []).map((dependency) => scope + dependency)
			const dependencySources = await Promise.all(dependencyUrls.map((dependencyUrl) => fetch(dependencyUrl).then((response) => response.text())))
			let script = ''
			if (systemScripts.length) {
				script += `importScripts(${systemScripts.map((systemUrl) => JSON.stringify(systemUrl)).join(', ')});\n`
			}
			script += participantHelperSource + '\n'
			script += InterfaceHelper.#buildNativeParticipantBootstrap(seed) + '\n'
			for (const dependencySource of dependencySources) {
				script += dependencySource + '\n'
			}
			script += participantSource + '\n'
			script += 'ParticipantHelper.signalReady();\n'
			const blobUrl = URL.createObjectURL(new Blob([script], { type: 'application/javascript' }))
			const worker = new Worker(blobUrl)
			worker.addEventListener('message', () => URL.revokeObjectURL(blobUrl), { once: true })
			return worker
		})
	}
}

globalThis.InterfaceHelper = InterfaceHelper
InterfaceHelper.preInit()
