'use strict'
class GitHubApi{
	static CLIENT_ID = '19698a5006b153e8a671';
	static #waitUntil = timestamp => new Promise(resolve => setTimeout(resolve, timestamp-Date.now()));
	static fetch(path='', init={}){
		let token = localStorage.getItem('GitHub OAuth-Token');
		if(token !== null && token !== undefined && token[0] !== '!'){
			if(init.headers === undefined){
				init.headers = {};
			}
			if(init.headers.Authorization === undefined){
				init.headers.Authorization = 'token '+token;
			}
		}
		return fetch(new Request('https://api.github.com/'+path, init)).then(response => {
			if(response.status == 200){
				return response;
			}else if(response.status == 401){
				localStorage.removeItem('GitHub OAuth-Token');
				throw new Error('Unauthorized GitHub OAuth-Token. Logged out.');
			}else if([403, 429/*Unconfirmed*/].includes(response.status)){
				let timestamp = 1000*(parseInt(response.headers.get('x-ratelimit-reset'))+1);
				console.log('x-ratelimit-reset: ' + new Date(timestamp));
				return this.#waitUntil(timestamp).then(()=>GitHubApi.fetch(path, init));
			}
			throw new Error('Uncaught response: ' + response.status + ' ' + response.statusText);
		});
	}
	static login(){
		let oAuthCode = null;
		if(0 < location.href.indexOf('?oAuthCode=')){
			oAuthCode = location.href.substr(location.href.indexOf('=')+1)
		}
		let token = localStorage.getItem('GitHub OAuth-Token');
		if(token !== null && token[0] === '!'){
			localStorage.removeItem('GitHub OAuth-Token')
		}
		if(oAuthCode !== null){
			localStorage.setItem('GitHub OAuth-Token', '!'+oAuthCode);
			Backend.call('login', {oAuthCode: oAuthCode, client_id: GitHubApi.CLIENT_ID}).then(json => {
				console.log(json);
				if(json.data !== undefined){
					localStorage.setItem('GitHub OAuth-Token', json.data);
				}
				location.replace(location.protocol+'//'+location.host+location.pathname);
			}).catch(error => {
				console.error(error);
				localStorage.removeItem('GitHub OAuth-Token');
			});
		}
	}
	static isLoggedIn(){
		return localStorage.getItem('GitHub OAuth-Token') !== null;
	}
}
