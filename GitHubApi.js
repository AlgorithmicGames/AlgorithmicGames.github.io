'use strict'
class GitHubApi{
	static #CLIENT_ID = '19698a5006b153e8a671';
	static #STARTED = localStorage.getItem('PageLoaded');
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
			if(localStorage.getItem('GitHub API debug') !== null){
				let a = path.split('/')[0];
				let reset = localStorage.getItem('_GitHub '+a+' x-ratelimit-reset');
				if(response.headers.has('x-ratelimit-reset')){
					reset = reset !== response.headers.get('x-ratelimit-reset');
					localStorage.setItem('_GitHub '+a+' x-ratelimit-reset', response.headers.get('x-ratelimit-reset'));
				}
				if(response.headers.has('x-ratelimit-used')){
					let b = parseInt(response.headers.get('x-ratelimit-used'));
					let value = reset ? b : Math.max(parseInt(localStorage.getItem('_GitHub '+a+' x-ratelimit-used')), b);
					localStorage.setItem('_GitHub '+a+' x-ratelimit-used', value);
				}
				if(response.headers.has('x-ratelimit-remaining')){
					let b = parseInt(response.headers.get('x-ratelimit-remaining'));
					let value = reset ? b : Math.max(parseInt(localStorage.getItem('_GitHub '+a+' x-ratelimit-remaining')), b);
					localStorage.setItem('_GitHub '+a+' x-ratelimit-remaining', value);
				}
				if(response.headers.has('x-ratelimit-limit')){
					let b = parseInt(response.headers.get('x-ratelimit-limit'));
					let value = reset ? b : Math.max(parseInt(localStorage.getItem('_GitHub '+a+' x-ratelimit-limit')), b);
					localStorage.setItem('_GitHub '+a+' x-ratelimit-limit', value);
				}
			}
			if(response.status == 200){
				return response;
			}else if(response.status == 401){
				localStorage.removeItem('GitHub OAuth-Token');
				throw new Error('Unauthorized GitHub OAuth-Token. Logged out.');
			}else if([403, 429/*Unconfirmed*/].includes(response.status)){
				let timestamp = 1000*(parseInt(response.headers.get('x-ratelimit-reset'))+1);
				if(this.isLoggedIn()){
					localStorage.setItem('PopupMessage-'+this.#STARTED+timestamp, 'GitHub API rate limit reached\n424px\nWait until the <a href="https://docs.github.com/en/free-pro-team@latest/rest/reference/rate-limit" target="_blank">API rate limit</a> timer resets: <time class="countdown" datetime="'+new Date(timestamp)+'"></time>');
				}else{
					localStorage.setItem('PopupMessage-'+this.#STARTED+timestamp, 'GitHub API rate limit reached\n371px\nGitHub has a lower <a href="https://docs.github.com/en/free-pro-team@latest/rest/reference/rate-limit" target="_blank">API rate limit</a> for unsigned requests. <a href="https://ai-tournaments.github.io/AI-Tournaments/login">Login</a> to be able to continue to create matches or wait until the timer resets: <time class="countdown" datetime="'+new Date(timestamp)+'"></time>');
				}
				return this.#waitUntil(timestamp).then(()=>GitHubApi.fetch(path, init));
			}
			throw new Error('Uncaught response: ' + response.status + ' ' + response.statusText);
		});
	}
	static fetchArenas(){
		return GitHubApi.fetch('search/repositories?q=topic:AI-Tournaments+topic:AI-Tournaments-Arena-v1').then(response => response.json()).then(json => json.items);
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
			Backend.call('login', {oAuthCode: oAuthCode, client_id: GitHubApi.#CLIENT_ID}).then(json => {
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
