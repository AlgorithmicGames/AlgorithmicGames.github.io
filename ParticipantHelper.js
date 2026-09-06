'use strict'
class ParticipantHelper {
	static #initHandler = null
	static #messageHandler = null
	static #postMessageNative = null
	static #sandbox = false

	static onInit(fun) {
		ParticipantHelper.#initHandler = fun
	}

	static onMessage(fun) {
		ParticipantHelper.#messageHandler = fun
	}

	static respond(value, toRespond = 1, toTerminate = 2) {
		if (ParticipantHelper.#sandbox) {
			ParticipantHelper.#postMessageNative(value)
			return
		}
		ParticipantHelper.#postMessageNative({
			type: 'Response',
			response: {
				value,
				executionSteps: { toRespond, toTerminate },
			},
		})
	}

	static preInit(options) {
		ParticipantHelper.#sandbox = options?.sandbox === true
		ParticipantHelper.#postMessageNative = globalThis.postMessage.bind(globalThis)
		globalThis.postMessage = function lockedPostMessage() {
			throw new Error('postMessage() is locked by ParticipantHelper; use ParticipantHelper.respond() instead.')
		}
		globalThis.onmessage = function participantHelperOnMessage(messageEvent) {
			const data = messageEvent?.data !== undefined ? messageEvent.data : messageEvent
			ParticipantHelper.#dispatch(data)
		}
	}

	static signalReady() {
		ParticipantHelper.#postMessageNative(null)
	}

	static dispatch(data) {
		ParticipantHelper.#dispatch(data)
	}

	static #dispatch(data) {
		if (typeof data !== 'object' || data === null) {
			return
		}
		if (data.workerData) {
			ParticipantHelper.#dispatchInit(data.workerData)
			return
		}
		if (data.settings !== undefined && data.opponents !== undefined) {
			ParticipantHelper.#dispatchInit(data)
			return
		}
		ParticipantHelper.#dispatchMessage(data)
	}

	static #dispatchInit(data) {
		const handler = ParticipantHelper.#initHandler
		if (handler) {
			handler(data)
		}
	}

	static #dispatchMessage(data) {
		let message = data
		if (data.type === 'Post') {
			const payload = data.message !== undefined ? data.message : data.data
			message = { type: 'Post', message: payload }
		} else if (data.type !== undefined) {
			message = { type: data.type, data: data.message ?? data.data }
		}
		const handler = ParticipantHelper.#messageHandler
		if (handler) {
			handler(message)
		}
	}
}

globalThis.ParticipantHelper = ParticipantHelper
