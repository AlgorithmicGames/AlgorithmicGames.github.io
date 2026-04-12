'use strict'
class ReplayHelper {
	static #initiated = false
	static #postHeight = null
	static #previousHeight = null
	static #replay = null
	static init = null
	static #requestId = 0
	static #pendingRequests = new Map()
	/** @type {{ matchIndex: number; bestOf: number; matchID: number }[]} */
	static #pendingMatchStarts = []
	/** @type {WeakMap<object, (detail: object) => void>} */
	static #onAbortResolveByReplay = new WeakMap()

	static preInit() {
		if (ReplayHelper.#initiated) {
			console.error('ReplayHelper is already initiated.')
		}
		ReplayHelper.#initiated = true
		let resolve = null
		const promise = new Promise((r) => (resolve = r))
		ReplayHelper.init = (callback = () => {}) => {
			promise.then(callback)
		}
		globalThis.addEventListener('message', (messageEvent) => {
			switch (messageEvent.data?.type) {
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
			parent.postMessage({ type: 'ReplayHelper-Initiated' }, '*')
		}
		ReplayHelper.#startHeightReporting()
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
			parent.postMessage(payload, '*')
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

	static #createMatchLogArray(matchID, subMatch = 0) {
		const logArray = []
		logArray._subMatch = subMatch
		let completed = false
		let completionResolve = null
		const completionPromise = new Promise((resolve) => {
			completionResolve = resolve
		})
		logArray.get = async (index) => {
			await ReplayHelper.#playbackConsoleForRange(logArray, matchID, index)
			const i = index < 0 ? logArray.length + index : index
			if (i >= 0 && i < logArray.length) return logArray[i]
			const result = await ReplayHelper.#requestLog('get', matchID, [index], subMatch)
			return ReplayHelper.#normalizeLogRecord(result)
		}
		logArray.last = (condition) => { // async?
			if (!condition) return logArray[logArray.length - 1]
			for (let i = logArray.length - 1; i >= 0; i--) {
				if (condition(logArray[i])) return logArray[i]
			}
			return undefined
		}
		logArray.count = (condition) => { // async?
			if (!condition) return ReplayHelper.#requestLog('count', matchID, [], subMatch)
			return logArray.filter(condition).length
		}
		logArray.awaitCompletion = () => completionPromise
		logArray._markComplete = (completionData) => {
			if (!completed) {
				completed = true
				completionResolve(completionData)
			}
		}
		logArray._refreshAll = async () => {
			const all = await ReplayHelper.#requestLog('getAll', matchID, [], subMatch)
			logArray.length = 0
			logArray.push(...all.map((r) => ReplayHelper.#normalizeLogRecord(r)))
		}
		return logArray
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
				log: ReplayHelper.#createMatchLogArray(matchID, idx),
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

	static async #resolveLegacyArenaResult(data, resolve) {
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
								matchLog.log = ReplayHelper.#createMatchLogArray(matchID, matchIndex)
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
				this.arenaResult.teams.forEach((team) => {
					team.members.forEach((member) => {
						member.color = ReplayHelper.#resolveMemberReplayColor(member)
					})
					team.color = ReplayHelper.#resolveTeamReplayColor(team)
				})
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
		const matchArr = replay.arenaResult.match ?? []
		const matchID = replay.arenaResult.matchID
		for (let mi = 0; mi < matchArr.length; mi++) {
			const matchLogEntry = matchArr[mi]
			const allLogs = await ReplayHelper.#requestLog('getAll', matchID, [], mi)
			const normalizedLogs = allLogs.map((r) => ReplayHelper.#normalizeLogRecord(r))
			matchLogEntry.log.push(...normalizedLogs)
		}
		if (!replay.arenaResult.result?.partialResult) {
			for (let mi = 0; mi < matchArr.length; mi++) {
				const matchLogEntry = matchArr[mi]
				const logTypes = await ReplayHelper.#requestLog('countByType', matchID, [], mi)
				matchLogEntry.log._markComplete({
					scores: matchLogEntry.scores,
					logTypes,
				})
			}
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
					log: ReplayHelper.#createMatchLogArray(matchID, idx),
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
			await match[i].log._refreshAll()
			const logTypes = await ReplayHelper.#requestLog('countByType', matchID, [], subM)
			match[i].log._markComplete({
				scores: match[i].scores,
				logTypes,
			})
		}
	}

	static #hslToRgb(hue, saturation, lightness) {
		const _q = lightness < 0.5 ? lightness * (1 + saturation) : lightness + saturation - lightness * saturation
		const _p = 2 * lightness - _q
		function hueToRGB(_p, _q, _t) {
			if (_t < 0) _t += 1
			if (_t > 1) _t -= 1
			if (_t < 1 / 6.0) return _p + (_q - _p) * 6 * _t
			if (_t < 1 / 2.0) return _q
			if (_t < 2 / 3.0) return _p + (_q - _p) * (2 / 3.0 - _t) * 6
			return _p
		}
		return {
			R: hueToRGB(_p, _q, hue + 1 / 3.0),
			G: hueToRGB(_p, _q, hue),
			B: hueToRGB(_p, _q, hue - 1 / 3.0),
		}
	}
	static #getColor(index, total) {
		const offset = total % 1 ? 0.5 : 2 / 3
		const hue = ((total ? index / total : index) + offset) % 1
		const saturation = 1
		const lightness = 0.5
		const returnObject = {
			hue,
			saturation,
			lightness,
			...ReplayHelper.#hslToRgb(hue, saturation, lightness),
		}
		let red = Math.round(255 * returnObject.R).toString(16)
		if (red.length === 1) {
			red = '0' + red
		}
		let green = Math.round(255 * returnObject.G).toString(16)
		if (green.length === 1) {
			green = '0' + green
		}
		let blue = Math.round(255 * returnObject.B).toString(16)
		if (blue.length === 1) {
			blue = '0' + blue
		}
		returnObject.RGB = '#' + red + green + blue
		return returnObject
	}
	/** Same shape as {@link #getColor}; `RGB` is what replay scripts use. Mirrors `Joinable` color normalization in `types.tsx`. */
	static #joinableColorStringToReplayColor(str) {
		if (str == null) return null
		let color = String(str).trim().toLowerCase()
		if (!color) return null
		if (!color.startsWith('#')) {
			color = '#' + color
		}
		if (color.length === 4) {
			color = '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3]
		}
		if (color.length !== 7) {
			return null
		}
		for (let i = 1; i < 7; i++) {
			if (!/[0-9a-f]/.test(color[i])) {
				return null
			}
		}
		const R = parseInt(color.slice(1, 3), 16) / 255
		const G = parseInt(color.slice(3, 5), 16) / 255
		const B = parseInt(color.slice(5, 7), 16) / 255
		const max = Math.max(R, G, B)
		const min = Math.min(R, G, B)
		const L = (max + min) / 2
		let hue = 0
		let saturation = 0
		if (max !== min) {
			const d = max - min
			saturation = L > 0.5 ? d / (2 - max - min) : d / (max + min)
			if (max === R) {
				hue = ((G - B) / d + (G < B ? 6 : 0)) / 6
			} else if (max === G) {
				hue = ((B - R) / d + 2) / 6
			} else {
				hue = ((R - G) / d + 4) / 6
			}
		}
		return { hue, saturation, lightness: L, R, G, B, RGB: color }
	}
	static #resolveMemberReplayColor(member) {
		const raw = member.color
		if (typeof raw === 'string') {
			const fromJoinable = ReplayHelper.#joinableColorStringToReplayColor(raw)
			if (fromJoinable) {
				return fromJoinable
			}
		}
		return ReplayHelper.#getMemberColor(member)
	}
	static #resolveTeamReplayColor(team) {
		if (!team.members?.length) {
			return ReplayHelper.#getTeamColor(team)
		}
		const firstRgb = team.members[0].color?.RGB
		if (firstRgb && team.members.every((m) => m.color?.RGB === firstRgb)) {
			return team.members[0].color
		}
		return ReplayHelper.#getTeamColor(team)
	}
	static #getTeamColor(team) {
		let teamIndex = ReplayHelper.#replay.arenaResult.teams.findIndex((t) => t === team)
		let teams = ReplayHelper.#replay.arenaResult.teams.length
		const onlySingleTeams = ReplayHelper.#replay.arenaResult.teams.filter((t) => t.members.length === 1).length === teams
		if (teamIndex === 1 && teams === 2 && onlySingleTeams) {
			// Red vs Blue
			teamIndex = 1
			teams = 3
		}
		return ReplayHelper.#getColor(teamIndex, teams)
	}
	static #getMemberColor(member) {
		const teamIndex = ReplayHelper.#replay.arenaResult.teams.findIndex((t) => t.members.includes(member))
		const team = ReplayHelper.#replay.arenaResult.teams[teamIndex].members
		const teams = ReplayHelper.#replay.arenaResult.teams.length
		const onlySingleTeams = ReplayHelper.#replay.arenaResult.teams.filter((t) => t.members.length === 1).length === teams
		const teamColorWidth = 1 / teams
		const teamColorSpace = teamColorWidth * teamIndex
		let memberColorWidth
		let memberIndex
		let offset = 0
		if (teamColorWidth === 1) {
			memberColorWidth = teamColorWidth / team.length
			memberIndex = team.findIndex((m) => m === member)
		} else {
			memberColorWidth = teamColorWidth / (team.length + 1)
			memberIndex = team.findIndex((m) => m === member) + 1
			offset = -teamColorWidth / 2
		}
		const isSecondOfTwoTeamsWithOneMemberEach = teamIndex === 1 && ReplayHelper.#replay.arenaResult.teams.length === 2 && onlySingleTeams
		const isSecondMemberOfTeamWithTwoMembers = memberIndex === 1 &&
			ReplayHelper.#replay.arenaResult.teams.length === 1 &&
			ReplayHelper.#replay.arenaResult.teams[0].members.length === 2
		if (isSecondOfTwoTeamsWithOneMemberEach || isSecondMemberOfTeamWithTwoMembers) {
			// Red vs Blue
			offset = isSecondOfTwoTeamsWithOneMemberEach ? 3.5 / 6 : 5 / 6
		}
		return ReplayHelper.#getColor(teamColorSpace + memberColorWidth * memberIndex + offset)
	}
}
ReplayHelper.preInit()
