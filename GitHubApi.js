class GitHubApi{
	static fetch(path='', init={}){
		let token = localStorage.getItem('GitHub OAuth-Token');
		if(token !== null){
			if(init.headers === undefined){
				init.headers = {};
			}
			if(init.headers.Authorization === undefined){
				init.headers.Authorization = 'token '+token;
			}
		}
		return fetch(new Request('https://api.github.com/'+path, init)).then(response => {
			if(response.status == 401){
				localStorage.removeItem('GitHub OAuth-Token');
				throw new Error('Unauthorized GitHub OAuth-Token. Logged out.');
			}else{
				return response;
			}
		});
	}
}
