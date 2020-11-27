'use strict'
class Backend{
	static call(module='', data){
		let backend = localStorage.getItem('backend');
		if(backend === null){
			backend = 'https://backend.aitournaments.io';
			localStorage.setItem('backend', backend);
		}
		return fetch(new Request(backend+'?'+module), {method:'POST',body:JSON.stringify(data)}).then(response => response.json());
	}
}
