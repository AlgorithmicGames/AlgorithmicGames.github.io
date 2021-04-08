'use strict'
function a(){
	let _GitHubProblem = false;
	let createdWindows = 0;
	let _content = document.getElementById('content');
	let _screens = document.getElementById('screens');
	let _background = document.getElementById('background');
	let _noise;
	document.getElementById('header-title-real').innerHTML = document.title;
	document.getElementById('header-title-fake').addEventListener('click', ()=>{
		window.open('https://github.com/AI-Tournaments', '_blank').focus();
	});
	Array.from(document.getElementsByClassName('open-screen')).forEach(element => {
		element.addEventListener('click', ()=>{openScreen(element.dataset.url)});
	});
	window.onresize = calcSize;
	window.onresize();
	GitHubApi.login();
	frameLoop();
	loadTheNews();
	loadArenas();
	document.getElementById('login-button').href += '?origin='+encodeURI(location.protocol+'//'+location.host+location.pathname);
	// Hidden until a fun "lore" has been established. openWindow('Welcome to the tournament, servant!','You have been sent here by your proud Master to showcasing what you have learned in our arenas. [TODO: How to?]\n<span style="color:var(--secondary-background-color)">- Overlord servant</span>', true, '397px', true);
	openWindow(
		'Welcome to the tournament!','Here you can participate in different games (known as Arenas) for a fun challenge to stay atop of the leaderboards. Read the <a href="https://github.com/AI-Tournaments/AI-Tournaments#participate" target="_blank">Participate</a> section in the README to get started.\n'+
		'If you want to you can join the community discussions over at the <a href="https://discord.gg/jhUJNsN" target="_blank">Discord server</a>.\n'+
		'<span style="color:var(--secondary-background-color)">- Tournament servant</span>',
	true, '582px', true);
	if(Backend.isOverride()){
		openWindow('⚠️Attention: Backend override⚠️','Backend is currently set to: '+Backend.getBackend()+'<br><button onclick="localStorage.removeItem(\'backend\'); location.reload();">Reset</button>',false);
	}
	if(navigator.userAgent.indexOf("Firefox") === -1){
		openWindow('Known problem: browser crash','AI-Tournaments can crash in some browsers when running matches in the client, Chrome is for example calling it "Oh, snap! STATUS_ACCESS_VIOLATION". If you are facing this problem, try using Firefox until it is sorted. Read more <a href="https://github.com/AI-Tournaments/AI-Tournaments/issues/2" target="_blank">here</a>.',false,'424px');
	}
	openWindow('Renovation in progress','AI-Tournaments is going through a redesign, so expect problems until next release. Jump into the <a href="https://discord.gg/jhUJNsN" target="_blank">Discord</a> server if you want more information.',false,'424px');
	fetch('https://raw.githubusercontent.com/AI-Tournaments/AI-Tournaments/master/README.md').then(response => response.text()).then(readme => {
		let why = readme.replace(/.+?(?=## Why Source Available?)/s, '').replace(/.*\n/,'');
		fetch('https://gitlab.com/api/v4/markdown',{method: 'POST', body: JSON.stringify({text: why}),
			headers: {Accept: 'application/vnd.github.v3+json', 'Content-Type':'application/json'}
		}).then(response => response.json()).then(response => {
			document.getElementById('source-available').addEventListener('click', ()=>{
				openWindow('Why "Source Available"?', '<span class="source-available">'+response.html+'</span>\n<span style="color:var(--secondary-background-color)">- Overlord servant</span>', true, '705px');
			});
		});
	});
	window.onmessage = messageEvent => {
		if(messageEvent.data.type === 'resize'){
			let iframe = document.getElementById(messageEvent.data.value.id);
			iframe.style.height = messageEvent.data.value.height+'px';
			iframe.style.width = messageEvent.data.value.width+'px';
		}else{
			console.error('Source element not defined!');
			console.error(messageEvent.source.frameElement);
		}
	}
	function frameLoop(){
		// Check login status.
		if(GitHubApi.isLoggedIn()){
			document.getElementById('login-button-wrapper').classList.remove('show');
		}else{
			document.getElementById('login-button-wrapper').classList.add('show');
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
	function loadTheNews(amount=5){
		let newsContainer = document.getElementById('news-dropdown');
		GitHubApi.fetch('repos/AI-Tournaments/AI-Tournaments/releases').then(response => response.json()).then(releases => {
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
				newsContainer.appendChild(item);
			});
			let item = document.createElement('a');
			item.href = newsContainer.parentElement.getElementsByTagName('a')[0].href;
			item.target = '_blank';
			item.innerHTML = '. . .';
			newsContainer.appendChild(item);
		});
	}
	function loadArenas(amount=undefined){
		let arenaContainer = document.getElementById('arena-dropdown');
		GitHubApi.fetchArenas().then(repos => {
			let officialRepos = [];
			repos.forEach(repo => {
				if(repo.owner.login === 'AI-Tournaments'){
					officialRepos.push(repo);
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
				item.dataset.stars = repo.stargazers_count;
				item.dataset.full_name = repo.full_name;
				item.addEventListener('click', ()=>{
					openScreen('Arena/#'+repo.full_name)
				});
				arenaContainer.appendChild(item);
			});
		});
	}
	function openScreen(src=''){
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
		let combinedMessage = 'Window message - '+header+'\n'+message;
		let display = localStorage.getItem(combinedMessage) === null;
		if(display){
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
			cross.onclick = () => {
				if(displayOnce){
					localStorage.setItem(combinedMessage, new Date().toISOString());
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
			let messageDiv = document.createElement('pre');
			messageDiv.classList.add('message');
			messageDiv.innerHTML = message;
			messageWrapper.appendChild(messageDiv);
			if(center){
				windowWrapper.style.top = (document.body.offsetHeight - windowWrapper.offsetHeight)/2 + 'px';
				windowWrapper.style.left = (document.body.offsetWidth - windowWrapper.offsetWidth)/2 + 'px';
			}else{
				createdWindows++;
				windowWrapper.style.top = 10*createdWindows + 'px';
				windowWrapper.style.left = 10*createdWindows + 'px';
			}
		}
	}
	function calcSize(){
		_background.className = 'force-new-row';
		let charsPerRow = 0;
		_background.innerHTML = '0';
		let height = _background.offsetHeight;
		while(_background.offsetHeight === height){
			_background.innerHTML = _background.innerHTML + '0';
			charsPerRow++;
		}
		charsPerRow++;
		height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
		let rows = 2;
		let charsOnFirstRow = _background.innerHTML;
		while(_background.offsetHeight < height){
			rows++;
			_background.innerHTML = _background.innerHTML + charsOnFirstRow;
		}
		_background.className = '';
		initNoise(rows, charsPerRow);
		_content.style.height = window.innerHeight - document.getElementsByTagName('header')[0].offsetHeight + 'px';
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
	function strip(html=''){
		let output;
		let tempString;
		do{
			tempString = output;
			let element = document.createElement('div');
			element.innerHTML = html;
			output = element.textContent || element.innerText || '';
		}
		while(tempString !== output && output !== '');
		return output;
	}
	function checkGitHubStatus(){
		fetch('https://ai-tournaments.github.io/AI-Tournaments/').then(r=>r.text()).then().catch(error => {
			postGitHubProblem('GitHub Pages');
		});
		fetch('https://raw.githubusercontent.com/AI-Tournaments/AI-Tournaments/master/index.html').then(r=>r.text()).then().catch(error => {
			postGitHubProblem('raw.githubusercontent.com');
		});
	}
	function postGitHubProblem(source){
		if(!_GitHubProblem){
			_GitHubProblem = true;
			openWindow('Problem at GitHub!','There is currently a problem with '+source+', so please come back later and try again. In the meantime see if <a href="https://www.githubstatus.com" target="_blank">GitHub Status</a> can help you.\n<span style="color:var(--secondary-background-color)">- Overlord servant</span>', true, '397px');
		}
	}
}
