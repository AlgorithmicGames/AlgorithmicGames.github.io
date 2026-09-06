'use strict'

/** Resolved while this classic script loads (opaque iframe origins cannot use ES module import). */
const replayColorHelperUrl = (() => {
	try {
		const src = document.currentScript?.src
		return src ? new URL('ColorHelper.js', src).href : '/ColorHelper.js'
	} catch {
		return '/ColorHelper.js'
	}
})()

class ReplayHelper {
	static #initiated = false
	static #postHeight = null
	static #previousHeight = null
	static #replay = null
	static #colorApi = null
	static #colorApiPromise = null
	static init = null
	static #requestId = 0
	static #pendingRequests = new Map()
	/** @type {{ matchIndex: number; bestOf: number; matchID: number }[]} */
	static #pendingMatchStarts = []
	/** @type {WeakMap<object, (detail: object) => void>} */
	static #onAbortResolveByReplay = new WeakMap()

	static #initialMessageReceived = false
	static #callParent(parent) {
		if (ReplayHelper.#initialMessageReceived) {
			ReplayHelper.#startHeightReporting()
			return
		}
		parent.postMessage({ type: 'ReplayHelper-Initiated' }, '*')
		setTimeout(() => {
			ReplayHelper.#callParent(parent)
		}, 100)
	}

	static preInit() {
		if (ReplayHelper.#initiated) {
			console.error('ReplayHelper is already initiated.')
		}
		ReplayHelper.#initiated = true

		void ReplayHelper.#ensureColorApi()

		const globalStyle = document.createElement('link')
		globalStyle.rel = 'stylesheet'
		globalStyle.href = '/global.css'
		document.head.prepend(globalStyle)

		const fallbackStyle = document.createElement('style')
		fallbackStyle.textContent = 'html { background-color: var(--main-background-color); }'
		document.head.prepend(fallbackStyle)

		let resolve = null
		const promise = new Promise((r) => (resolve = r))
		ReplayHelper.init = (callback = () => {}) => {
			promise.then(callback)
		}
		globalThis.addEventListener('message', (messageEvent) => {
			switch (messageEvent.data?.type) {
				case 'ReplayHelper-Message-Received':
					ReplayHelper.#initialMessageReceived = true
					break
				case 'Arena-Result':
					ReplayHelper.#resolveLegacyArenaResult(messageEvent.data, resolve)
					break
				case 'Arena-Match-Complete':
					ReplayHelper.#handleMatchComplete(messageEvent.data)
					break
				case 'Arena-Match-Start':
					ReplayHelper.#handleMatchStart(messageEvent.data)
					break
				case 'ReplayHelper-Log-Response':
					ReplayHelper.#handleLogResponse(messageEvent.data)
					break
			}
		})
		const parent = globalThis.opener ?? globalThis.parent
		if (parent) {
			ReplayHelper.#callParent(parent)
		}
	}

	static #reportHeight() {
		const parent = globalThis.opener ?? globalThis.parent
		if (!parent) return
		const height = document.documentElement.scrollHeight
		if (height !== ReplayHelper.#previousHeight) {
			ReplayHelper.#previousHeight = height
			parent.postMessage({ type: 'ReplayHelper-Height', height }, '*')
		}
	}

	static #startHeightReporting() {
		const startObserving = () => {
			if (typeof ResizeObserver !== 'undefined') {
				new ResizeObserver(() => ReplayHelper.#reportHeight()).observe(document.body)
			}
			ReplayHelper.#reportHeight()
		}
		if (document.body) {
			startObserving()
		} else {
			document.addEventListener('DOMContentLoaded', startObserving)
		}
		ReplayHelper.#postHeight = setInterval(() => ReplayHelper.#reportHeight(), 200)
	}

	/**
	 * Normalizes a stored log entry to `{ type, value }` (strings JSON-parse like `Log.filter`).
	 * Plain payloads without a `value` key are wrapped as `{ type: '', value: payload }`.
	 */
	static #normalizeLogRecord(raw) {
		if (raw === undefined || raw === null) {
			return raw
		}
		let entry = raw
		if (typeof entry === 'string') {
			try {
				entry = JSON.parse(entry)
			} catch {
				return { type: '', value: entry }
			}
		}
		if (typeof entry === 'object' && entry !== null && 'value' in entry) {
			return entry
		}
		return { type: '', value: entry }
	}

	static #requestLog(method, matchID, args = [], subMatch) {
		const requestId = ++ReplayHelper.#requestId
		return new Promise((resolve) => {
			ReplayHelper.#pendingRequests.set(requestId, resolve)
			const parent = globalThis.opener ?? globalThis.parent
			const payload = { type: 'ReplayHelper-Log-Request', requestId, matchID, method, args }
			if (subMatch !== undefined && subMatch !== null) {
				payload.subMatch = subMatch
			}
			globalThis.requestAnimationFrame(() => parent.postMessage(payload, '*'))
		})
	}

	static #handleLogResponse(data) {
		const resolve = ReplayHelper.#pendingRequests.get(data.requestId)
		if (resolve) {
			ReplayHelper.#pendingRequests.delete(data.requestId)
			resolve(data.result)
		}
	}

	static #isConsoleLogEntry(entry) {
		if (!entry || typeof entry !== 'object') return false
		if (entry.type === 'participant-console' || entry.type === 'arena-console') return true
		if (entry.console === true) return true
		return false
	}

	static #consoleSortKey(entry) {
		const v = entry.value && typeof entry.value === 'object' ? entry.value : {}
		const m = v.meta && typeof v.meta === 'object' ? v.meta : {}
		if (m.id != null) return String(m.id)
		if (m.workerId != null) return String(m.workerId)
		return ''
	}

	static #getConsoleMethod(entry) {
		const v = entry.value && typeof entry.value === 'object' ? entry.value : {}
		if (entry.type === 'participant-console' || entry.type === 'arena-console') {
			return typeof v.method === 'string' && v.method ? v.method : 'log'
		}
		if (entry.console === true && typeof entry.type === 'string' && typeof console[entry.type] === 'function') {
			return entry.type
		}
		return 'log'
	}

	static #getConsoleArguments(entry) {
		const v = entry.value && typeof entry.value === 'object' ? entry.value : {}
		if (Array.isArray(v.arguments)) return v.arguments
		if (Array.isArray(v.list)) return v.list
		return []
	}

	static #getConsoleSourceKey(entry) {
		if (entry.type === 'arena-console') return 'arena-console'
		const v = entry.value && typeof entry.value === 'object' ? entry.value : {}
		const m = v.meta && typeof v.meta === 'object' ? v.meta : {}
		if (m.id != null) return 'id:' + m.id
		if (m.workerId != null) return 'w:' + m.workerId
		const n = m.participantName != null ? String(m.participantName) : ''
		const w = m.workerName != null ? String(m.workerName) : ''
		return 'p:' + n + '|' + w
	}

	static #emitConsoleReplayRow(row, previousSourceKey) {
		const v = row.value && typeof row.value === 'object' ? row.value : {}
		const meta = v.meta && typeof v.meta === 'object' ? v.meta : {}
		const method = ReplayHelper.#getConsoleMethod(row)
		const args = ReplayHelper.#getConsoleArguments(row)
		const sourceKey = ReplayHelper.#getConsoleSourceKey(row)
		if (previousSourceKey !== sourceKey) {
			let label = 'Console'
			if (row.type === 'arena-console') {
				label = 'Arena console'
			} else if (meta.participantName != null) {
				label = String(meta.participantName)
				if (meta.workerName !== undefined && String(meta.workerName).length) {
					label += ', worker "' + meta.workerName + '"'
				}
				if (meta.instanceId != null) {
					label += ', Instance: ' + meta.instanceId
				} else if (meta.workerId != null && meta.postIndex != null) {
					label += ' (message ' + meta.postIndex + ')'
				}
			}
			console.log('%c' + label, 'font-style: italic;')
		}
		const fn = typeof console[method] === 'function' ? console[method] : console.log
		try {
			fn.apply(console, args)
		} catch (_e) {
			try {
				console.log.apply(console, args)
			} catch (_e2) {
				console.log('[ReplayHelper] console replay failed', row)
			}
		}
		return sourceKey
	}

	static async #playbackConsoleForRange(logArray, matchID, index) {
		const replay = ReplayHelper.#replay
		if (!replay || replay._defaultConsolePlayback === false) return

		const len = logArray.length
		const i = index < 0 ? len + index : index
		if (!Number.isFinite(i) || i < 0) return

		if (logArray._consoleLastIdx === undefined) logArray._consoleLastIdx = -1
		const last = logArray._consoleLastIdx

		if (i < last) {
			if (logArray._consoleRewindNotify === true) {
				console.log('%cℹ️ Console is rewind.', 'font-style: italic;')
				logArray._consoleRewindNotify = false
			}
			logArray._consoleLastIdx = i
			logArray._consolePreviousSource = null
			return
		}

		if (i > last) {
			const rows = []
			for (let j = last + 1; j <= i; j++) {
				let row
				if (j >= 0 && j < logArray.length) {
					row = ReplayHelper.#normalizeLogRecord(logArray[j])
				} else {
					const subM = logArray._subMatch ?? 0
					const result = await ReplayHelper.#requestLog('get', matchID, [j], subM)
					row = ReplayHelper.#normalizeLogRecord(result)
				}
				if (row !== undefined && row !== null) rows.push(row)
			}
			const consoleRows = rows.filter((r) => ReplayHelper.#isConsoleLogEntry(r))
			consoleRows.sort((a, b) => {
				const idA = ReplayHelper.#consoleSortKey(a)
				const idB = ReplayHelper.#consoleSortKey(b)
				if (idA < idB) return -1
				if (idA > idB) return 1
				return 0
			})
			let prev = logArray._consolePreviousSource ?? null
			for (const row of consoleRows) {
				logArray._consoleRewindNotify = true
				prev = ReplayHelper.#emitConsoleReplayRow(row, prev)
			}
			logArray._consolePreviousSource = prev
			logArray._consoleLastIdx = i
		}
	}

	static #createMatchLog(matchID, subMatch = 0) {
		let completed = false
		let completionResolve = null
		const completionPromise = new Promise((resolve) => {
			completionResolve = resolve
		})
		return {
			_subMatch: subMatch,
			_markComplete: (completionData) => {
				if (!completed) {
					completed = true
					completionResolve(completionData)
				}
			},
			get: async (index) => {
				const result = await ReplayHelper.#requestLog('get', matchID, [index], subMatch)
				return ReplayHelper.#normalizeLogRecord(result)
			},
			getAll: async () => {
				const result = await ReplayHelper.#requestLog('getAll', matchID, [], subMatch)
				if (!Array.isArray(result)) return []
				return result.map((row) => ReplayHelper.#normalizeLogRecord(row))
			},
			getSince: async (afterId = 0) => {
				const result = await ReplayHelper.#requestLog('getSince', matchID, [afterId], subMatch)
				if (!Array.isArray(result)) return []
				return result.map((row) => {
					const normalized = ReplayHelper.#normalizeLogRecord(row)
					return { id: row?.id, type: normalized.type, value: normalized.value }
				})
			},
			find: async (predicate) => {
				const count = await ReplayHelper.#requestLog('count', matchID, [], subMatch)
				for (let i = 0; i < count; i++) {
					const entry = ReplayHelper.#normalizeLogRecord(
						await ReplayHelper.#requestLog('get', matchID, [i], subMatch),
					)
					if (entry !== undefined && entry !== null && predicate(entry)) {
						return entry
					}
				}
				return undefined
			},
			filter: async (predicate) => {
				const count = await ReplayHelper.#requestLog('count', matchID, [], subMatch)
				const matches = []
				for (let i = 0; i < count; i++) {
					const entry = ReplayHelper.#normalizeLogRecord(
						await ReplayHelper.#requestLog('get', matchID, [i], subMatch),
					)
					if (entry !== undefined && entry !== null && predicate(entry)) {
						matches.push(entry)
					}
				}
				return matches
			},
			last: async (predicate) => {
				const count = await ReplayHelper.#requestLog('count', matchID, [], subMatch)
				if (typeof predicate === 'function') {
					for (let i = count - 1; i >= 0; i--) {
						const entry = ReplayHelper.#normalizeLogRecord(
							await ReplayHelper.#requestLog('get', matchID, [i], subMatch),
						)
						if (entry !== undefined && entry !== null && predicate(entry)) {
							return entry
						}
					}
					return undefined
				}
				if (count < 1) {
					return undefined
				}
				const result = await ReplayHelper.#requestLog('get', matchID, [count - 1], subMatch)
				return ReplayHelper.#normalizeLogRecord(result)
			},
			count: async (predicate) => {
				if (typeof predicate !== 'function') {
					return await ReplayHelper.#requestLog('count', matchID, [], subMatch)
				}
				const total = await ReplayHelper.#requestLog('count', matchID, [], subMatch)
				let matched = 0
				for (let i = 0; i < total; i++) {
					const entry = ReplayHelper.#normalizeLogRecord(
						await ReplayHelper.#requestLog('get', matchID, [i], subMatch),
					)
					if (entry !== undefined && entry !== null && predicate(entry)) {
						matched++
					}
				}
				return matched
			},
			awaitCompletion: () => completionPromise,
		}
	}

	/** Grows `arenaResult.match` (and `matchLogs`) with placeholder entries through `upToIndex` for live best-of. */
	static #ensureMatchEntriesThroughIndex(replay, upToIndex) {
		const match = replay.arenaResult.match
		const matchID = replay.arenaResult.matchID
		if (!Array.isArray(match) || !Number.isFinite(matchID)) {
			return
		}
		while (match.length <= upToIndex) {
			const idx = match.length
			const entry = {
				scores: undefined,
				error: undefined,
				log: ReplayHelper.#createMatchLog(matchID, idx),
			}
			entry.getLogRecord = (i) => entry.log.get(i)
			match.push(entry)
		}
		if (replay.arenaResult.matchLogs) {
			replay.arenaResult.matchLogs = match
		}
	}

	/** Merges `detail` into `cache` by `matchIndex` (replace if index seen, else append), then sorts by `matchIndex`. */
	static #mergeMatchStartIntoCache(cache, detail) {
		const i = cache.findIndex((d) => d.matchIndex === detail.matchIndex)
		if (i >= 0) {
			cache[i] = detail
		} else {
			cache.push(detail)
		}
		cache.sort((a, b) => a.matchIndex - b.matchIndex)
	}

	static #handleMatchStart(data) {
		const matchIndex = Number(data?.matchIndex)
		const bestOf = Number(data?.bestOf)
		const matchID = Number(data?.matchID)
		if (!Number.isFinite(matchIndex) || !Number.isFinite(bestOf) || !Number.isFinite(matchID)) {
			return
		}
		const detail = { matchIndex, bestOf, matchID }
		const replay = ReplayHelper.#replay
		if (!replay) {
			ReplayHelper.#pendingMatchStarts.push(detail)
			return
		}
		if (detail.matchID !== replay.arenaResult.matchID) {
			return
		}
		ReplayHelper.#ensureMatchEntriesThroughIndex(replay, matchIndex)
		ReplayHelper.#mergeMatchStartIntoCache(replay._matchStartDetailCache, detail)
		const listeners = replay._onMatchStartListeners
		for (const fn of listeners) {
			try {
				fn(detail)
			} catch (e) {
				console.error('[ReplayHelper] addOnMatchStartListener callback failed', e)
			}
		}
	}

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
		if (ReplayHelper.#colorApi) {
			return Promise.resolve(ReplayHelper.#colorApi)
		}
		if (globalThis.ColorHelper) {
			ReplayHelper.#colorApi = globalThis.ColorHelper
			return Promise.resolve(ReplayHelper.#colorApi)
		}
		if (!ReplayHelper.#colorApiPromise) {
			ReplayHelper.#colorApiPromise = ReplayHelper.#loadClassicScript(replayColorHelperUrl).then(() => {
				ReplayHelper.#colorApi = globalThis.ColorHelper
				return ReplayHelper.#colorApi
			})
		}
		return ReplayHelper.#colorApiPromise
	}

	static async #resolveLegacyArenaResult(data, resolve) {
		const ColorHelper = await ReplayHelper.#ensureColorApi()
		const sessionMatchID = data.arenaResult?.matchID
		let earlySessionStarts = []
		if (Number.isFinite(sessionMatchID)) {
			earlySessionStarts = ReplayHelper.#pendingMatchStarts.filter((p) => p.matchID === sessionMatchID)
			ReplayHelper.#pendingMatchStarts = ReplayHelper.#pendingMatchStarts.filter((p) => p.matchID !== sessionMatchID)
		} else {
			ReplayHelper.#pendingMatchStarts.length = 0
		}
		class ArenaResult {
			constructor(settings = {}) {
				const matchID = settings.matchID
				for (const key in settings) {
					if (Object.hasOwn(settings, key)) {
						if (key === 'match' || key === 'matchLogs') {
							settings[key].forEach((matchLog, matchIndex) => {
								matchLog.log = ReplayHelper.#createMatchLog(matchID, matchIndex)
							})
						}
						this[key] = settings[key]
					}
				}
				const matchArr = this.match ?? this.matchLogs
				if (matchArr) {
					this.match = matchArr
					this.matchLogs = matchArr
				}
			}
		}
		class Replay {
			constructor(payload) {
				ReplayHelper.#replay = this
				/** When true, `log.get(i)` replays stored console lines between the previous index and `i`. Use `toggleDefaultConsole()` to turn off. */
				this._defaultConsolePlayback = true
				this.arenaResult = new ArenaResult(payload.arenaResult)
				this.wrapped = payload.wrapped
				let resolveOnAbort
				/** Resolves once when the parent sends `Arena-Match-Complete` for an aborted match (or with an error and no `completed` status). Payload: `{ status, error?, scores?, logTypes? }`. */
				this.onAbort = new Promise((resolve) => {
					resolveOnAbort = resolve
				})
				ReplayHelper.#onAbortResolveByReplay.set(this, resolveOnAbort)
				/** @type {{ matchIndex: number; bestOf: number; matchID: number }[]} */
				this._matchStartDetailCache = []
				/** @type {((detail: { matchIndex: number; bestOf: number; matchID: number }) => void)[]} */
				this._onMatchStartListeners = []
				/**
				 * Register a callback for match-start events (live best-of). Receives each cached index first (in order), then future events.
				 * @param {(detail: { matchIndex: number; bestOf: number; matchID: number }) => void} listener
				 */
				this.addOnMatchStartListener = (listener) => {
					if (typeof listener !== 'function') {
						return
					}
					for (const d of this._matchStartDetailCache) {
						try {
							listener(d)
						} catch (e) {
							console.error('[ReplayHelper] addOnMatchStartListener replay failed', e)
						}
					}
					this._onMatchStartListeners.push(listener)
				}
				ColorHelper.applyReplayTeamColors(this.arenaResult.teams)
			}

			/**
			 * Toggles automatic printing of stored console logs (participant-console, arena-console, legacy `console` rows).
			 * @returns {boolean} the new enabled state (`true` = playback on)
			 * @example ReplayHelper.init((replay) => { replay.toggleDefaultConsole() }) // disable
			 */
			toggleDefaultConsole() {
				this._defaultConsolePlayback = !this._defaultConsolePlayback
				const matches = this.arenaResult?.match ?? this.arenaResult?.matchLogs ?? []
				for (const m of matches) {
					if (m.log) {
						m.log._consoleLastIdx = -1
						m.log._consolePreviousSource = null
						m.log._consoleRewindNotify = false
					}
				}
				return this._defaultConsolePlayback
			}
		}
		const replay = new Replay(data)
		for (const d of earlySessionStarts) {
			ReplayHelper.#mergeMatchStartIntoCache(replay._matchStartDetailCache, d)
		}
		const cacheMax = replay._matchStartDetailCache.reduce((m, d) => Math.max(m, d.matchIndex), -1)
		if (cacheMax >= 0) {
			ReplayHelper.#ensureMatchEntriesThroughIndex(replay, cacheMax)
		}
		resolve(replay)
	}

	static async #handleMatchComplete(data) {
		if (!ReplayHelper.#replay) return
		const match = ReplayHelper.#replay.arenaResult.match
		const replay = ReplayHelper.#replay
		const matchID = replay.arenaResult.matchID
		replay.arenaResult.result.partialResult = data.status !== 'completed'
		if (Array.isArray(data.subMatchResults) && data.subMatchResults.length > 0) {
			while (match.length < data.subMatchResults.length) {
				const idx = match.length
				const entry = {
					scores: undefined,
					error: undefined,
					log: ReplayHelper.#createMatchLog(matchID, idx),
				}
				match.push(entry)
			}
			data.subMatchResults.forEach((sm, i) => {
				if (!match[i]) {
					return
				}
				if (sm.scores !== undefined) {
					match[i].scores = sm.scores
				}
				if (sm.error !== undefined) {
					match[i].error = sm.error
				}
			})
		} else if (match.length > 0) {
			if (data.scores !== undefined) {
				match[0].scores = data.scores
			}
			if (data.error !== undefined) {
				match[0].error = data.error
			}
		}
		if (Array.isArray(data.resultTeam)) {
			replay.arenaResult.result.team = data.resultTeam
		}
		const aborted = data.status === 'aborted' ||
			(data.error !== undefined && data.status !== 'completed')
		if (aborted) {
			const resolveOnAbort = ReplayHelper.#onAbortResolveByReplay.get(replay)
			if (resolveOnAbort) {
				ReplayHelper.#onAbortResolveByReplay.delete(replay)
				resolveOnAbort({
					status: data.status ?? 'aborted',
					error: data.error,
					scores: data.scores,
					logTypes: data.logTypes,
				})
			}
		}
		for (let i = 0; i < match.length; i++) {
			const subM = match[i].log._subMatch ?? i
			const logTypes = await ReplayHelper.#requestLog('countByType', matchID, [], subM)
			match[i].log._markComplete({
				scores: match[i].scores,
				logTypes,
			})
		}
	}
}
ReplayHelper.preInit()
