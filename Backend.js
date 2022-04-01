'use strict'
class Backend{
	static call(module='', data){
		return fetch(new Request(Backend.getBackend()+'/'+module), {method:'POST',body:JSON.stringify(data)}).then(response => response.json());
	}
	static getBackend(){
		return localStorage.getItem('backend') ?? 'https://nfegdyrzrdhwvqpujxhj.functions.supabase.co';
	}
	static isOverride(){
		return localStorage.getItem('backend') !== null;
	}
}
