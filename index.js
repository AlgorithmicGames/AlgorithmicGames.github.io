'use strict'
function a(){
	let _GitHubProblem = false;
	let createdWindows = 0;
	let charCross = '✖';
	let _content = document.getElementById('content');
	let _screens = document.getElementById('screens');
	let _background = document.getElementById('background');
	let _noise;
	document.getElementById('header-title').innerHTML = document.title;
	for(const element of document.getElementsByClassName('open-screen')) {
		element.addEventListener('click', ()=>{openScreen(element.dataset.url)});
	}
	calcSize();
	window.onresize = calcSize;
	play();
	checkGitHubStatus();
	loadTheNews();
	openWindow('Wellcome servant!','Make your Master proud by participate in our arenas based upon different kinds of AI and algorithm driven games.\n<span style="color:var(--secondary-background-color)">- Overlord servant</span>', true, '397px');
	openWindow('Work in progress', 'Sorry, but Overlord has not publicly open the arenas yet so there is nothing to see here at the moment.\nBut dig around or get back here soon™ because awesome stuff are coming!\nRead more about aitournaments.io over at <a href="https://github.com/AI-Tournaments/AI-Tournaments" target="_blank">GitHub</a> or join the discussion <a href="https://github.com/AI-Tournaments/AI-Tournaments/issues/1" target="_blank">here</a>.\n<span style="color:var(--secondary-background-color)">- Overlord servant</span>', true, '705px');
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
	function loadTheNews(amount=5){
		let newsContainer = document.getElementById('news-dropdown');
		fetch('https://api.github.com/repos/AI-Tournaments/AI-Tournaments/releases').then(response => response.json()).then(releases => {
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
	function makeDragable(trigger, dragable=trigger){
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
			dragable.style.top = (dragable.offsetTop - pos2) + 'px';
			dragable.style.left = (dragable.offsetLeft - pos1) + 'px';
		}
		function closeDragElement() {
			document.onmouseup = null;
			document.onmousemove = null;
		}
	}
	function openWindow(header='', message='', center=false, maxWidth){
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
		cross.innerHTML = charCross;
		cross.classList.add('cross-close');
		cross.onclick = () => {
			windowWrapper.parentNode.removeChild(windowWrapper);
		};
		windowWrapper.appendChild(cross);
		let headerDiv = document.createElement('pre');
		headerDiv.innerHTML = header;
		headerDiv.classList.add('header');
		headerDiv.classList.add('dragable');
		makeDragable(headerDiv, windowWrapper);
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
	function play(){
		_background.innerHTML = parsToString(getNoise());
		window.requestAnimationFrame(play);
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
	function strip(html){
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
