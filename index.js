'use strict'
function a(){
	let _element_loginButtonWrapper = document.getElementById('login-button-wrapper');
	let _element_logoutButtonWrapper = document.getElementById('logout-button-wrapper');
	let _GitHubProblem = false;
	let createdWindows = 0;
	let _content = document.getElementById('content');
	let _screens = document.getElementById('screens');
	let _background = document.getElementById('background');
	let _noise;
	document.getElementById('header-title-real').innerHTML = document.title;
	let fakeHeader = document.getElementById('header-title-fake');
	fakeHeader.classList.add('clickable');
	fakeHeader.addEventListener('click', ()=>{
		window.open('https://github.com/AI-Tournaments', '_blank').focus();
	});
	Array.from(document.getElementsByClassName('open-screen')).forEach(element => {
		element.addEventListener('click', ()=>{openScreen(element.dataset.url)});
	});
	window.onresize = resizeBackground;
	window.onresize();
	GitHubApi.login();
	if(GitHubApi.isLoggedIn()){
		GitHubApi.fetch('user').then(response => response.json()).then(user => {
			[...document.getElementsByClassName('local-username')].forEach(element => element.innerHTML = user.login);
			[...document.getElementsByClassName('local-profile-image')].forEach(img => img.src = user.avatar_url);
		})
	}
	checkGitHubStatus();
	frameLoop();
	loadAnnouncements();
	loadArenas();
	window.onhashchange = ()=>{
		while(1 < window.location.hash.length && window.location.hash[1] === '#'){
			window.location.hash = window.location.hash.substring(2);
		}
		if(1 < window.location.hash.length){
			openScreen(window.location.hash.substring(1));
		}
	};
	window.onhashchange();
	document.getElementById('login-button').href += '?origin='+encodeURI(location.protocol+'//'+location.host+location.pathname);
	document.getElementById('logout-button').addEventListener('click', GitHubApi.logout);
	openWindow(
		'Welcome to the tournament!','Here you can participate in different games (known as Arenas) for a fun challenge to stay atop of the leaderboards. Read the <a href="https://github.com/AI-Tournaments/AI-Tournaments.github.io#participate" target="_blank">Participate</a> section in the README to get started.\n'+
		'If you want to you can join the community discussions over at the <a href="https://discord.gg/jhUJNsN" target="_blank">Discord server</a>.\n'+
		'<span style="color:var(--secondary-background-color)">- Tournament servant</span>',
	true, '582px', true);
	try{
		if(JSON.parse(localStorage.getItem('LocalDevelopment.Setups')).find(setup => setup.active)){
			let dropdown = document.getElementById('development-dropdown');
			dropdown.parentElement.classList.remove('hidden');
			let content = document.createElement('div');
			content.classList.add('clickable');
			content.addEventListener('click', ()=>openScreen('Dev'));
			content.innerHTML = '<b>Local development</b><br>Automatic addition of local arena and participants is active.';
			dropdown.appendChild(content);
		}
	}catch(error){}
	if(Backend.isOverride()){
		let dropdown = document.getElementById('development-dropdown');
		dropdown.parentElement.classList.remove('hidden');
		let content = document.createElement('div');
		content.innerHTML = '<b>Backend development</b><br>Backend is redirected to <i class="clickable" style="background: var(--secondary-background-color); color: var(--secondary-background-color)" onmouseover="this.style.background=\'var(--main-color)\';this.style.color=\'var(--main-color)\'" onmouseleave="this.style.background=\'var(--secondary-background-color)\';this.style.color=\'var(--secondary-background-color)\'" onclick="this.style.background=\'\';this.style.color=\'\'; this.onmouseover=undefined; this.onmouseleave=undefined;">'+Backend.getBackend().path+'</i>.<br><br><button class="clickable" onclick="localStorage.removeItem(\'backend\'); location.reload();">Clear</button>';
		dropdown.appendChild(content);
	}
	let sourceAvailable = document.getElementById('source-available');
	sourceAvailable.classList.add('clickable');
	sourceAvailable.addEventListener('click', ()=>{
		fetch('https://raw.githubusercontent.com/AI-Tournaments/AI-Tournaments.github.io/master/README.md').then(response => response.text()).then(readme => {
			let why = readme.replace(/.+?(?=## Why Source Available?)/s, '').replace(/.*\n/,'');
			GitHubApi.formatMarkdown(why, {
				async: true,
				suffix: ''//<br><span style="color:var(--secondary-background-color)">- Overlord servant</span>'
			}).then(iframe => {
				openWindow('Why "Source Available"?', iframe, true, '705px');
			});
		});
	});
	window.onmessage = messageEvent => {
		switch(messageEvent.data.type){
			case 'resize':
				let iframe = [...document.getElementsByTagName('iframe')].find(iframe => iframe.contentWindow === messageEvent.source);
				if(iframe){
					iframe.style.height = messageEvent.data.value.height+'px';
				}
				break;
			case 'arena-changed':
				window.location.hash = 'Arena/#'+messageEvent.data.value;
				break;
		}
	}
	function frameLoop(){
		// Check login status.
		if(GitHubApi.isLoggedIn()){
			_element_loginButtonWrapper.classList.remove('show');
			if(_element_logoutButtonWrapper.getElementsByClassName('local-username')[0].innerHTML){
				_element_logoutButtonWrapper.classList.remove('hidden');
			}
		}else{
			_element_loginButtonWrapper.classList.add('show');
			_element_logoutButtonWrapper.classList.add('hidden');
		}
		// Update background.
		_background.innerHTML = parsToString(getNoise());
		// Display requested popup messages.
		let items = localStorage.length;
		for(let index = 0; index < items; ++index ){
			let key = localStorage.key(index);
			if(key !== null && key.startsWith('PopupMessage-')){
				let message = localStorage.getItem(key);
				localStorage.removeItem(key);
				message = message.split('\n');
				let header = message.shift();
				let maxWidth = message.shift();
				openWindow(header+'<span hidden>'+key+'</span>', message.join('\n'), false, maxWidth===''?undefined:maxWidth, true);
			}
		}
		// Update countdown timers.
		for(let element of document.getElementsByTagName('time')){
			if(element.classList.contains('countdown')){
				let timespan = (new Date(element.dateTime)-Date.now());
				let days = Math.floor(timespan/86400000);
				timespan -=  days*86400000;
				let hours = Math.floor(timespan/3600000);
				timespan -= hours*3600000;
				let minutes = Math.floor(timespan/60000);
				timespan -= minutes*60000;
				let seconds = Math.floor(timespan/1000);
				element.innerHTML = '';
				if(0<days){
					element.innerHTML += days + ' ';
				}
				if(0<hours || element.innerHTML!==''){
					if(hours<10){
						hours = '0' + hours;
					}
					element.innerHTML += hours + ':';
				}
				if(0<minutes || element.innerHTML!==''){
					if(minutes<10){
						minutes = '0' + minutes;
					}
					element.innerHTML += minutes + ':';
				}
				if(0<seconds || element.innerHTML!==''){
					if(seconds<10){
						seconds = '0' + seconds;
					}
					element.innerHTML += seconds;
				}
			}
		}
		// Schedule next update.
		window.requestAnimationFrame(frameLoop);
	}
	function loadAnnouncements(amount=5){
		let announcementsContainer = document.getElementById('announcements-dropdown');
		GitHubApi.fetch('repos/AI-Tournaments/AI-Tournaments.github.io/releases').then(response => response.json()).then(releases => {
			releases.slice(0,amount).forEach(release => {
				let item = document.createElement('a');
				item.href = release.html_url;
				item.target = '_blank';
				let name = document.createElement('div');
				name.innerHTML = release.name;
				item.appendChild(name);
				let time = document.createElement('time');
				time.datetime = release.published_at;
				time.innerHTML = release.published_at.substring(0,10);
				item.appendChild(time);
				announcementsContainer.appendChild(item);
			});
			let item = document.createElement('a');
			item.href = announcementsContainer.parentElement.getElementsByTagName('a')[0].href;
			item.target = '_blank';
			item.innerHTML = '. . .';
			announcementsContainer.appendChild(item);
		});
	}
	function loadArenas(amount=undefined){
		let arenaContainer = document.getElementById('arena-dropdown');
		GitHubApi.fetchArenas().then(arenas => {
			let officialRepos = [];
			arenas.forEach(arena => {
				if(arena.official){
					officialRepos.push(arena);
				}
			});
			officialRepos.sort(function(a,b){
				if(a.full_name < b.full_name){return -1;}
				if(a.full_name > b.full_name){return 1;}
				return 0;
			})
			officialRepos.slice(0,amount).forEach(repo => {
				let item = document.createElement('div');
				item.innerHTML = repo.name.replace('-Arena','')
				item.dataset.stars = repo.stars;
				item.dataset.full_name = repo.full_name;
				item.classList.add('clickable');
				item.addEventListener('click', ()=>{
					openScreen('Arena/#'+repo.full_name);
				});
				arenaContainer.appendChild(item);
			});
		});
	}
	function openScreen(src=''){
		window.location.hash = src;
		let origin = window.location.href.replace(/(\?.*?(?=#))|(\?.*?(?=$))/gm, '');
		let root = origin.substring(0, origin.indexOf('#'));
		if(!root){
			root = origin;
		}
		src = root+src;
		let screenFound = false;
		for(const screen of _screens.children){
			if(screen.dataset.targetSrc === src){
				screenFound = true;
				screen.style.display = '';
			}else{
				screen.style.display = 'none';
			}
		}
		if(!screenFound){
			let iframe = document.createElement('iframe');
			_screens.appendChild(iframe);
			iframe.src = src;
			iframe.dataset.targetSrc = src;
			iframe.style.height = window.getComputedStyle(_content, null).getPropertyValue('height');
			setTimeout(()=>iframe.contentWindow.postMessage({type: 'SetParent'}, '*'), 1000);
		}
	}
	function makeDraggable(trigger, draggable=trigger){
		let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
		trigger.onmousedown = dragMouseDown;
		function dragMouseDown(e) {
			e = e || window.event;
			e.preventDefault();
			pos3 = e.clientX;
			pos4 = e.clientY;
			document.onmouseup = closeDragElement;
			document.onmousemove = elementDrag;
		}
		function elementDrag(e) {
			e = e || window.event;
			e.preventDefault();
			pos1 = pos3 - e.clientX;
			pos2 = pos4 - e.clientY;
			pos3 = e.clientX;
			pos4 = e.clientY;
			draggable.style.top = (draggable.offsetTop - pos2) + 'px';
			draggable.style.left = (draggable.offsetLeft - pos1) + 'px';
		}
		function closeDragElement() {
			document.onmouseup = null;
			document.onmousemove = null;
		}
	}
	function openWindow(header='', message='', center=false, maxWidth, displayOnce=false){
		let isIframe = message.constructor.name === 'HTMLIFrameElement';
		let combinedMessage = header+'\n'+(isIframe ? isIframe.srcdoc : message);
		let sessionStorage = GitHubApi.getSessionStorage();
		if(!sessionStorage.windowMessages){
			sessionStorage.windowMessages = {};
		}
		if(!sessionStorage.windowMessages[combinedMessage]){
			let windowWrapper = document.createElement('div');
			_content.appendChild(windowWrapper);
			if(maxWidth !== undefined){
				windowWrapper.style.maxWidth = maxWidth;
			}
			windowWrapper.classList.add('window');
			let messageWrapper = document.createElement('div');
			messageWrapper.classList.add('border');
			windowWrapper.appendChild(messageWrapper);
			let cross = document.createElement('pre');
			cross.classList.add('cross-close');
			cross.onclick = ()=>{
				if(displayOnce){
					let sessionStorage = GitHubApi.getSessionStorage();
					if(!sessionStorage.windowMessages){
						sessionStorage.windowMessages = {};
					}
					sessionStorage.windowMessages[combinedMessage] = new Date().toISOString();
					GitHubApi.setSessionStorage(sessionStorage);
				}
				windowWrapper.parentNode.removeChild(windowWrapper);
			};
			windowWrapper.appendChild(cross);
			let headerDiv = document.createElement('pre');
			headerDiv.innerHTML = header;
			headerDiv.classList.add('header');
			headerDiv.classList.add('draggable');
			makeDraggable(headerDiv, windowWrapper);
			messageWrapper.appendChild(headerDiv);
			if(isIframe){
				message.style.width = maxWidth
				messageWrapper.appendChild(message);
			}else{
				let messageDiv = document.createElement('pre');
				messageDiv.classList.add('message');
				messageDiv.innerHTML = message;
				messageWrapper.appendChild(messageDiv);
			}
			if(center){
				function setCenter(){
					windowWrapper.style.top = (_content.offsetHeight - windowWrapper.offsetHeight)/2 + 'px';
					windowWrapper.style.left = (_content.offsetWidth - windowWrapper.offsetWidth)/2 + 'px';
				}
				function awaitHeight(){
					if(message.style.height){
						setCenter()
					}else{
						window.requestAnimationFrame(awaitHeight);
					}
				}
				setCenter();
				if(isIframe){
					awaitHeight();
				}
			}else{
				createdWindows++;
				windowWrapper.style.top = 10*createdWindows + 'px';
				windowWrapper.style.left = 10*createdWindows + 'px';
			}
		}
	}
	function resizeBackground(){
		_background.className = 'force-new-row';
		let charsPerRow = 0;
		_background.innerHTML = '0';
		let height = _background.offsetHeight;
		while(_background.offsetHeight === height){
			_background.innerHTML = _background.innerHTML + '0';
			charsPerRow++;
		}
		charsPerRow++;
		height = document.documentElement.clientHeight - 10/* Where does 10 come from? */;
		let rows = 2;
		let charsOnFirstRow = _background.innerHTML;
		while(_background.offsetHeight < height){
			rows++;
			_background.innerHTML = _background.innerHTML + charsOnFirstRow;
		}
		_background.className = '';
		_content.style.height = height - parseFloat(window.getComputedStyle(document.getElementsByTagName('header')[0], null).getPropertyValue('height')) + 'px';
		initNoise(rows, charsPerRow);
	}
	function initNoise(rows, charsPerRow){
		_noise = new Array(rows);
		for(let r = 0; r < rows; r++){
			let chars = '';
			for(let c = 0; c < charsPerRow; c++){
				if(Math.random() < .5){
					chars += '0';
				}else{
					chars += '1';
				}
			}
			_noise[r] = chars;
		}
	}
	function getNoise(){
		let numberOfChanges = (_noise.length*_noise[0].length)/100;
		for(let c = 0; c < numberOfChanges; c++){
			let row = Math.floor(Math.random()*_noise.length);
			let index = Math.floor(Math.random() * _noise[row].length);
			let chars = _noise[row];
			let _char;
			if(Math.random() < .5){
				_char = '0';
			}else{
				_char = '1';
			}
			_noise[row] = chars.substr(0, index) + _char + chars.substr(index + 1);
		}
		return _noise.slice();
	}
	function parsToString(noise){
		let chars = '';
		for(let n = 0; n < noise.length; n++){
			if(0 < n){
				chars += '\n';
			}
			chars += noise[n];
		}
		return chars;
	}
	function checkGitHubStatus(){
		fetch('https://ai-tournaments.github.io/').then(r=>r.text()).then().catch(error => {
			postGitHubProblem('GitHub Pages');
		});
		fetch('https://raw.githubusercontent.com/AI-Tournaments/AI-Tournaments.github.io/main/index.html').then(r=>r.text()).then().catch(error => {
			postGitHubProblem('raw.githubusercontent.com');
		});
	}
	function postGitHubProblem(source){
		if(!_GitHubProblem){
			_GitHubProblem = true;
			openWindow('GitHub not reachable!', source+' is currently not reachable, please try again later. In the meantime see if <a href="https://www.githubstatus.com" target="_blank">GitHub Status</a> can help you.', true, '397px');
		}
	}
}
