'use strict'
class Backend{
	static call(module='', data){
		return fetch(new Request(Backend.getBackend()+'/'+module), {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlhdCI6MTY0MzY2MTc3MCwiZXhwIjoxOTU5MjM3NzcwfQ.x_SvsnLkgYNEgpxa7h74Z__aBgGbGIYVmljhwYDJ1Bc'
			},
			body: JSON.stringify(data)
		}).then(response => response.json());
	}
	static getBackend(){
		return localStorage.getItem('backend') ?? 'https://nfegdyrzrdhwvqpujxhj.functions.supabase.co';
	}
	static isOverride(){
		return localStorage.getItem('backend') !== null;
	}
}
