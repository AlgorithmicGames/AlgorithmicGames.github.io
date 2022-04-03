'use strict'
class Backend{
	static call(module='', data){
		let backend = Backend.getBackend();
		return fetch(new Request(backend.path+'/'+module), {
			method: 'POST',
			headers: new Headers(backend.headers),
			body: JSON.stringify(data)
		}).then(response => response.json());
	}
	static getBackend(){
		return localStorage.getItem('backend') ?? {
			path: 'https://nfegdyrzrdhwvqpujxhj.functions.supabase.co',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlhdCI6MTY0MzY2MTc3MCwiZXhwIjoxOTU5MjM3NzcwfQ.x_SvsnLkgYNEgpxa7h74Z__aBgGbGIYVmljhwYDJ1Bc'
			}
		};
	}
	static isOverride(){
		return localStorage.getItem('backend') !== null;
	}
}
