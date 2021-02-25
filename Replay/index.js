'use strict'
let b = location.hash;
location.hash = '';
function a(){
	let _replayData;
	let _element_control = document.getElementById('control-container');
	let _element_viewOptions = document.getElementById('replay-viewers');
	let _element_iframe = document.getElementById('replay-container');
	let _element_iframe_failToLoad = document.getElementById('replay-container-failToLoad');
	let _element_btnLock = document.getElementById('lock');
	let _element_dataInput = document.getElementById('data-input');
	let _parent = null;
	window.onmessage = messageEvent => {
		// NOTE: messageEvent can come from off site scripts.
		switch(messageEvent.data.type){
			case 'Init-Fetch-Replay-Height':
				if(_parent === null){
					document.documentElement.style.paddingLeft = 0;
					document.documentElement.style.paddingRight = 0;
					document.documentElement.style.paddingBottom = 0;
					_parent = {
						origin: messageEvent.origin,
						source: messageEvent.source
					}
				}
			case 'Replay-Height':
				if(messageEvent.data.value !== undefined){
					_element_iframe.style.minHeight = parseFloat(messageEvent.data.value)+'px';
					_element_iframe.classList.remove('hidden');
					_element_iframe_failToLoad.classList.add('hidden');
				}
				if(_parent !== null){
					_parent.source.postMessage({type: 'Replay-Height', value: document.documentElement.scrollHeight}, _parent.origin);
				}
		}
	}
	_element_btnLock.addEventListener('click', mouseEvent=>{
		_element_btnLock.disabled = true;
		_element_dataInput.disabled = true;
		for(const input of document.getElementsByClassName('select-match-button')){
			input.disabled = input.dataset.aborted === 'true';
		}
		GitHubApi.fetch('search/repositories?q=topic:AI-Tournaments+topic:Replay+topic:'+_replayData.body.arena).then(response => response.json()).then(response => {
			document.getElementById('default-option').value = _replayData.header !== undefined && _replayData.header.defaultReplay !== undefined && _replayData.header.defaultReplay !== '' ? _replayData.header.defaultReplay : 'https://ai-tournaments.github.io/'+_replayData.body.arena.name.split('/')[1].replace('Arena','Replay')+'/';
			response.items.forEach(repo => {
				if(repo.has_pages){
					let cssStar = getComputedStyle(document.documentElement).getPropertyValue('--github-stars').trim();
					cssStar = cssStar.substring(1,cssStar.length-1);
					let option = document.createElement('option');
					option.innerHTML = repo.full_name.replace(/.*\/|-Arena/g, '') + ' ' + cssStar + repo.stars;
					option.dataset.stars = repo.stars;
					option.value = 'https://'+repo.owner.login+'.github.io/'+repo.name;
					_element_viewOptions.appendChild(option);
				}
			});
			let options = [..._element_viewOptions.options];
			options.sort(function(a, b){
				if(parseFloat(a.dataset.stars) < parseFloat(b.dataset.stars)){return -1;}
				if(parseFloat(b.dataset.stars) < parseFloat(a.dataset.stars)){return 1;}
				return 0;
			});
			for(let option of options){
				_element_viewOptions.add(option);
			}
			_element_viewOptions.classList.remove('hidden');
		});
	});
	_element_dataInput.addEventListener('input', inputEvent=>{
		[...document.getElementsByClassName('select-match-button')].forEach(input=>{
			input.parentElement.removeChild(input);
		});
		_element_btnLock.disabled = true;
		try{
			_replayData = JSON.parse(_element_dataInput.value);
			_element_btnLock.disabled = typeof _replayData !== 'object';
		}catch(error){}
		document.getElementById('invalid-input').style.display = _element_btnLock.disabled ? '' : 'none';
		if(!_element_btnLock.disabled){
			let selectionStart = _element_dataInput.selectionStart;
			_element_dataInput.value = JSON.stringify(_replayData.body,null,'\t');
			_element_dataInput.selectionStart = selectionStart;
			_replayData.body.data.forEach((matchLog, index) => {
				let input = document.createElement('input');
				input.type = 'button';
				input.value = 'Match ' + (index+1);
				let log_done = matchLog.find(d=>d.type==='Done');
				if(log_done === undefined){
					input.value += ' (aborted)';
					input.dataset.aborted = 'true';
				}else{
					input.dataset.log = JSON.stringify(log_done.value);
				}
				input.disabled = true;
				input.classList.add('select-match-button');
				input.classList.add('sticky');
				input.addEventListener('click', mouseEvent=>{
					for(const element of _element_control.children){
						if(!element.classList.contains('sticky')){
							element.style.display = 'none';
						}
					}
					for(const input of document.getElementsByClassName('select-match-button')){
						input.disabled = input.dataset.aborted === 'true';
						_element_iframe.src = _element_viewOptions.selectedOptions[0].value + '#' + input.dataset.log;
						setTimeout(()=>{
							_element_iframe.contentWindow.postMessage({type: 'Init-Fetch-Replay-Height'}, '*');setTimeout(()=>{
								if(_element_iframe.classList.contains('hidden')){
									_element_iframe_failToLoad.classList.remove('hidden');
								}
							}, 1000);
						}, 1000);
					}
					input.disabled = true;
				});
				_element_control.appendChild(input);
			});
		}
	});
	if(1 < b.length){
		_element_dataInput.value = decodeURI(b.substring(1));
		location.hash = b;
		b = undefined;
		_element_dataInput.dispatchEvent(new Event('input', {
			bubbles: true,
			cancelable: true,
		}));
		_element_btnLock.click();
	}
}
