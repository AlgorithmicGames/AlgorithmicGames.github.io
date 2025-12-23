'use strict'
class Backend {
	static call(module='', data) {
		return fetch(new Request(BackendService.getBackend()+'/'+module), {
			method: 'POST',
			body: JSON.stringify(data)
		});
	}
	static getBackend(){
		return localStorage.getItem('backend') ?? 'https://backend.algorithmic.games';
	}
	static isOverride(){
		return localStorage.getItem('backend') !== null;
	}
}
