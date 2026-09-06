'use strict'

/** @typedef {{ hue: number, saturation: number, lightness: number, R: number, G: number, B: number, RGB: string }} ArenaColor */

/** @typedef {{ teamCount: number, membersPerTeam: number[], onlySingleTeams: boolean }} ColorLayoutContext */

/**
 * @param {number} hue
 * @param {number} saturation
 * @param {number} lightness
 */
function hslToRgb(hue, saturation, lightness) {
	const q = lightness < 0.5 ? lightness * (1 + saturation) : lightness + saturation - lightness * saturation
	const p = 2 * lightness - q
	function hueToRGB(_p, _q, _t) {
		if (_t < 0) _t += 1
		if (_t > 1) _t -= 1
		if (_t < 1 / 6.0) return _p + (_q - _p) * 6 * _t
		if (_t < 1 / 2.0) return _q
		if (_t < 2 / 3.0) return _p + (_q - _p) * (2 / 3.0 - _t) * 6
		return _p
	}
	return {
		R: hueToRGB(p, q, hue + 1 / 3.0),
		G: hueToRGB(p, q, hue),
		B: hueToRGB(p, q, hue - 1 / 3.0),
	}
}

/**
 * @param {number} index
 * @param {number} [total]
 * @returns {ArenaColor}
 */
function getColor(index, total = 0) {
	const offset = total % 1 ? 0.5 : 2 / 3
	const hue = ((total ? index / total : index) + offset) % 1
	const saturation = 1
	const lightness = 0.5
	/** @type {ArenaColor} */
	const returnObject = {
		hue,
		saturation,
		lightness,
		...hslToRgb(hue, saturation, lightness),
		RGB: '',
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

/** Same shape as {@link getColor}; `RGB` is what replay scripts use. Mirrors `Joinable` color normalization in `types.tsx`. */
function joinableColorStringToColor(str) {
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

/**
 * @param {Array<{ members?: unknown[] }>} teams
 * @returns {ColorLayoutContext}
 */
function buildTeamsLayoutContext(teams) {
	const teamCount = teams.length
	const membersPerTeam = teams.map((team) => team.members?.length ?? 0)
	const onlySingleTeams = teams.filter((team) => team.members?.length === 1).length === teamCount
	return { teamCount, membersPerTeam, onlySingleTeams }
}

/**
 * @param {number} teamIndex
 * @param {ColorLayoutContext} layout
 * @returns {ArenaColor}
 */
function getTeamColorFromLayout(teamIndex, layout) {
	let teams = layout.teamCount
	let index = teamIndex
	if (teamIndex === 1 && teams === 2 && layout.onlySingleTeams) {
		// Red vs Blue
		index = 1
		teams = 3
	}
	return getColor(index, teams)
}

/**
 * @param {number} teamIndex
 * @param {number} memberIndex
 * @param {ColorLayoutContext} layout
 * @returns {ArenaColor}
 */
function getMemberColorFromLayout(teamIndex, memberIndex, layout) {
	const teamMemberCount = layout.membersPerTeam[teamIndex] ?? 0
	const teams = layout.teamCount
	const teamColorWidth = 1 / teams
	const teamColorSpace = teamColorWidth * teamIndex
	let memberColorWidth
	let resolvedMemberIndex = memberIndex
	let offset = 0
	if (teamColorWidth === 1) {
		memberColorWidth = teamColorWidth / Math.max(1, teamMemberCount)
	} else {
		memberColorWidth = teamColorWidth / (Math.max(1, teamMemberCount) + 1)
		resolvedMemberIndex = memberIndex + 1
		offset = -teamColorWidth / 2
	}
	const isSecondOfTwoTeamsWithOneMemberEach = teamIndex === 1 && teams === 2 && layout.onlySingleTeams
	const isSecondMemberOfTeamWithTwoMembers = memberIndex === 1 && teams === 1 && teamMemberCount === 2
	if (isSecondOfTwoTeamsWithOneMemberEach || isSecondMemberOfTeamWithTwoMembers) {
		// Red vs Blue
		offset = isSecondOfTwoTeamsWithOneMemberEach ? 3.5 / 6 : 5 / 6
	}
	return getColor(teamColorSpace + memberColorWidth * resolvedMemberIndex + offset)
}

/**
 * @param {unknown} init
 * @returns {{ layout: ColorLayoutContext, discloseMembers: string }}
 */
function buildInterfaceColorContext(init) {
	const opponents = Array.isArray(init?.opponents) ? init.opponents : [null]
	const settings = init?.settings ?? init ?? {}
	const general = settings.general ?? {}
	const discloseMembers = typeof general.discloseOpponents === 'string' ? general.discloseOpponents : 'No'
	const membersPerTeam = opponents.map((entry) => {
		if (entry === null) return 1
		if (Array.isArray(entry)) return Math.max(1, entry.length)
		return 1
	})
	const teamCount = Math.max(1, opponents.length)
	const onlySingleTeams = membersPerTeam.every((count) => count <= 1)
	return {
		layout: { teamCount, membersPerTeam, onlySingleTeams },
		discloseMembers,
	}
}

/**
 * @param {number} teamIndex
 * @param {number | undefined | null} memberIndex
 * @param {{ layout: ColorLayoutContext, discloseMembers: string }} context
 * @returns {ArenaColor}
 */
function getInterfaceColor(teamIndex, memberIndex, context) {
	const layout = context?.layout ?? { teamCount: 1, membersPerTeam: [1], onlySingleTeams: true }
	const safeTeamIndex = Number.isFinite(teamIndex) ? Math.trunc(teamIndex) : 0
	if (context?.discloseMembers !== 'Yes' || memberIndex == null || !Number.isFinite(memberIndex)) {
		return getTeamColorFromLayout(safeTeamIndex, layout)
	}
	return getMemberColorFromLayout(safeTeamIndex, Math.trunc(memberIndex), layout)
}

/**
 * @param {{ color?: unknown }} member
 * @param {number} teamIndex
 * @param {number} memberIndex
 * @param {ColorLayoutContext} layout
 * @returns {ArenaColor}
 */
function resolveMemberColor(member, teamIndex, memberIndex, layout) {
	const raw = member.color
	if (typeof raw === 'string') {
		const fromJoinable = joinableColorStringToColor(raw)
		if (fromJoinable) {
			return fromJoinable
		}
	}
	return getMemberColorFromLayout(teamIndex, memberIndex, layout)
}

/**
 * @param {{ members?: Array<{ color?: { RGB?: string } }> }} team
 * @param {number} teamIndex
 * @param {ColorLayoutContext} layout
 * @returns {ArenaColor}
 */
function resolveTeamColor(team, teamIndex, layout) {
	if (!team.members?.length) {
		return getTeamColorFromLayout(teamIndex, layout)
	}
	const firstRgb = team.members[0].color?.RGB
	if (firstRgb && team.members.every((member) => member.color?.RGB === firstRgb)) {
		return team.members[0].color
	}
	return getTeamColorFromLayout(teamIndex, layout)
}

/**
 * @param {Array<{ members?: Array<{ color?: unknown }> }>} teams
 */
function applyReplayTeamColors(teams) {
	const layout = buildTeamsLayoutContext(teams)
	teams.forEach((team, teamIndex) => {
		team.members?.forEach((member, memberIndex) => {
			member.color = resolveMemberColor(member, teamIndex, memberIndex, layout)
		})
		team.color = resolveTeamColor(team, teamIndex, layout)
	})
}

const ColorHelper = {
	hslToRgb,
	getColor,
	joinableColorStringToColor,
	buildTeamsLayoutContext,
	getTeamColorFromLayout,
	getMemberColorFromLayout,
	buildInterfaceColorContext,
	getInterfaceColor,
	resolveMemberColor,
	resolveTeamColor,
	applyReplayTeamColors,
}

globalThis.ColorHelper = ColorHelper
