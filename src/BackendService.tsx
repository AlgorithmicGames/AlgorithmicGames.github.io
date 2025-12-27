export default class BackendService {
	static call(module = '', data: any = {}): Promise<Response> {
		return fetch(new Request(BackendService.getBackend() + '/' + module), {
			method: 'POST',
			body: JSON.stringify(data),
		})
	}
	static getBackend() {
		return localStorage.getItem('backend') ?? 'https://backend.algorithmic.games'
	}
	static isOverride() {
		return localStorage.getItem('backend') !== null
	}
}
