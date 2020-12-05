'use strict'
class Backend{
	static call(method='', module='', data){
		let url = Backend.getBackend()+'?'+module;
		let headers = {
			method: method.toLocaleUpperCase()
		}
		if(method==='GET'){
			url += '&'+JSON.stringify(data);
		}else{
			headers.body = JSON.stringify(data);
		}
		return fetch(new Request(url), headers).then(response => response.json());
	}
	static getBackend(){
		let backend = localStorage.getItem('backend');
		return backend === null ? 'http://78.69.133.195'/*'https://backend.aitournaments.io'*/ : backend;
	}
	static isOverride(){
		return localStorage.getItem('backend') !== null;
	}
}
