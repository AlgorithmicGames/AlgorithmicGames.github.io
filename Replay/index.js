'use strict'
function a(){
	let _replayData;
	let _autoStart = false;
	let _element_control = document.getElementById('control-container');
	let _element_viewOptions = document.getElementById('replay-viewers');
	let _element_previousReplayOptions = document.getElementById('previous-replays');
	let _element_iframe = document.getElementById('replay-container');
	let _element_previousReplayContainer = document.getElementById('previous-replay-container');
	let _element_iframe_failToLoad = document.getElementById('replay-container-failToLoad');
	let _element_btnLock = document.getElementById('lock');
	let _element_editor = document.getElementById('editor');
	let _element_btnClearStoredReplays = document.getElementById('load-previous-replay-clear');
	let _element_previousReplayRenameInput = document.getElementById('previous-replay-rename-input');
	let _element_loadPreviousReplayRename = document.getElementById('load-previous-replay-rename');
	let _element_previousReplayRename = document.getElementById('previous-replay-rename');
	let _element_previousReplayRenameCancel = document.getElementById('previous-replay-rename-cancel');
	let _element_previousReplayRenameSave = document.getElementById('previous-replay-rename-save');
	let _element_previousReplaysController = document.getElementById('previous-replays-controller');
	let _parent = null;
	let _replayOptionsPromise_resolve;
	let _replayOptionsPromise = new Promise(resolve=>_replayOptionsPromise_resolve=resolve);
	let _editor = new JSONEditor(_element_editor, {'modes': ['code', 'view'], 'name': 'Replay', 'onChange': onChange, 'onValidate': onValidate});
	setTimeout(()=>{
		if(_editor.getText() === '{}'){
			_element_editor.classList.remove('hidden');
		}
	}, 1000);
	_element_previousReplayOptions.addEventListener('focus', ()=>{
		_element_previousReplayOptions.style.height = 0;
		[..._element_previousReplayOptions.getElementsByTagName('option')].forEach(option => option.innerHTML = option.dataset.name);
	});
	_element_previousReplayOptions.addEventListener('blur', ()=>{
		_element_previousReplayOptions.style.height = '';
		[..._element_previousReplayOptions.getElementsByTagName('option')].forEach(option => option.innerHTML = option.dataset.arena+' '+option.dataset.name);
	});
	_element_previousReplayOptions.addEventListener('click', ()=>document.activeElement.blur());
	_element_loadPreviousReplayRename.addEventListener('click', ()=>{
		let option = _element_previousReplayOptions.selectedOptions[0];
		_element_previousReplayRenameInput.value = option.dataset.name === option.dataset.nameDefault ? '' : option.dataset.name;
		_element_previousReplayRenameInput.placeholder = option.dataset.nameDefault;
		_element_previousReplaysController.classList.add('hidden');
		_element_previousReplayRename.classList.remove('hidden');
	});
	_element_previousReplayRenameCancel.addEventListener('click', ()=>{
		_element_previousReplayRename.classList.add('hidden');
		_element_previousReplaysController.classList.remove('hidden');
	});
	function onValidate(json){
		function isUrl(string){
			let url;
			try{
				url = new URL(string);
			}catch(e){
				return false;
			}
			return url.protocol === 'http:' || url.protocol === 'https:';
		}
		let errors = [];
		if(json.header !== undefined && json.header.defaultReplay !== undefined && !isUrl(json.header.defaultReplay)){
			errors.push({
				path: ['header'],
				message: 'Property "defaultReplay" is not a URL.'
			});
		}
		if(json.body === undefined || typeof json.body.data !== 'object'){
			errors.push({
				path: ['body'],
				message: 'Property "data" is missing or not a array.'
			});
		}
		return errors;
	}
	function onChange(){
		_editor.validate().then(errors => {
			let containsError = 0 < errors.length;
			[...document.getElementsByClassName('select-match-button')].forEach(input=>{
				input.parentElement.removeChild(input);
			});
			_element_btnLock.disabled = containsError;
			document.getElementById('invalid-input').classList[containsError ? 'remove' : 'add']('hidden');
			if(containsError){
				_element_editor.classList.remove('hidden');
			}else{
				_replayData = _editor.get();
				_replayData.body.data.forEach((matchLog, index) => {
					let input = document.createElement('input');
					input.type = 'button';
					input.value = 'Match ' + (index+1);
					let aborted = matchLog === null;
					if(aborted){
						input.value += ' (aborted)';
					}
					input.dataset.aborted = aborted;
					input.disabled = true;
					input.classList.add('select-match-button');
					input.classList.add('sticky');
					function onClick(mouseEvent){
						for(const matchButton of document.getElementsByClassName('select-match-button')){
							if(matchButton !== input && matchButton.dataset.aborted !== 'true'){
								matchButton.disabled = false;
							}
						}
						for(const element of _element_control.children){
							if(!element.classList.contains('sticky')){
								element.classList.add('hidden');
							}
						}
						_element_iframe.src = _element_viewOptions.selectedOptions[0].value;
						setTimeout(()=>{
							_element_iframe.contentWindow.postMessage({type: 'Init-Fetch-Replay-Height'}, '*');
							_element_iframe.contentWindow.postMessage({type: 'Match-Log', matchLog: matchLog}, '*');
							setTimeout(()=>{
								if(_element_iframe.classList.contains('hidden')){
									_element_iframe_failToLoad.classList.remove('hidden');
								}
							}, 1000);
						}, 1000);
						document.getElementById('open-replay-in-new-tab').addEventListener('click', ()=>{
							let win = window.open(_element_viewOptions.selectedOptions[0].value);
							setTimeout(()=>{
								win.postMessage({type: 'Match-Log', matchLog: matchLog}, '*');
							}, 1000);
						});
						input.disabled = true;
					}
					input.addEventListener('click', onClick);
					_element_control.appendChild(input);
					if(_replayData.body.data.length === 1){
						input.classList.add('hidden');
						_replayOptionsPromise.then(onClick);
					}
				});
			}
			if(_autoStart){
				_autoStart = false;
				if(!containsError){
					_element_btnLock.onclick();
				}
			}
		});
	}
	(()=>{
		let idbOpenDBRequest = indexedDB.open('replays', 1);
		idbOpenDBRequest.onerror = event=>console.error('openDb:', event.target.errorCode);
		idbOpenDBRequest.onupgradeneeded = idbVersionChangeEvent=>{
			let idbObjectStore = idbVersionChangeEvent.currentTarget.result.createObjectStore('records', {keyPath: 'id', autoIncrement: true});
			idbObjectStore.createIndex('stored', 'stored', {unique: false});
			idbObjectStore.createIndex('name', 'name', {unique: false});
		}
		idbOpenDBRequest.onsuccess = event=>{
			let _idbDatabase = idbOpenDBRequest.result;
			function refreshStoredReplays(){
				let oldOption = _element_previousReplayOptions.selectedOptions[0];
				while(0 < _element_previousReplayOptions.childElementCount){
					_element_previousReplayOptions.removeChild(_element_previousReplayOptions.firstChild);
				}
				getStoredReplays().then(storedReplays => {
					let groupedReplays = [];
					storedReplays.forEach(storedReplay => {
						let name = storedReplay.data.body.arena.full_name;
						if(groupedReplays.find(groupedReplay => groupedReplay.name === name) === undefined){
							groupedReplays.push({name: name, list: []});
						}
						groupedReplays.filter(r => r.name === name)[0].list.push(storedReplay);
					});
					groupedReplays.forEach(groupedReplay => {
						let optgroup = document.createElement('optgroup');
						optgroup.label = groupedReplay.name;
						groupedReplay.list.forEach(storedReplay => {
							let participants = storedReplay.data.body.data[0].score.slice();
							let scores = [];
							storedReplay.data.body.data.forEach(match=>{
								scores.push(storedReplay.data.body.data[0].score.map(item => item.score).join('-'));
							})
							participants.forEach((item, index) => participants[index] = item.members.map(member => member.name).join(', '));
							let option = document.createElement('option');
							option.dataset.header = JSON.stringify(storedReplay.data.header);
							option.dataset.databaseId = storedReplay.id;
							option.dataset.nameDefault = new Date(storedReplay.stored).toLocaleString()+' '+participants.join(' vs. ')+' ('+scores.join(', ')+')';
							option.dataset.name = [undefined, ''].includes(storedReplay.name) ? option.dataset.nameDefault : storedReplay.name;
							option.dataset.arena = groupedReplay.name;
							option.innerHTML = option.dataset.arena+' '+option.dataset.name;
							option.value = JSON.stringify(storedReplay.data);
							if(oldOption){
								option.selected = oldOption.dataset.databaseId === option.dataset.databaseId;
							}
							optgroup.appendChild(option);
						});
						_element_previousReplayOptions.appendChild(optgroup);
					});
					_element_control.classList.add('hidden');
					_element_previousReplayContainer.classList.remove('hidden');
					_element_btnClearStoredReplays.disabled = storedReplays.length === 0;
				});
			}
			document.getElementById('load-previous-replay').addEventListener('click', refreshStoredReplays);
			document.getElementById('load-previous-replay-confirm').addEventListener('click', () => {
				_element_previousReplayContainer.classList.add('hidden');
				_element_control.classList.remove('hidden');
				let option = _element_previousReplayOptions.selectedOptions[0];
				_editor.setMode('view');
				_editor.setText(option.value);
				onChange();
			});
			document.getElementById('load-previous-replay-delete').addEventListener('click', () => {
				for(let option of [..._element_previousReplayOptions.selectedOptions]){
					if(confirm('Are you sure want to remove replay "'+option.innerHTML+'"?')){
						_element_previousReplayContainer.classList.add('hidden');
						getIdbObjectStore().delete(parseInt(option.dataset.databaseId));
						refreshStoredReplays();
					}
				}
			});
			document.getElementById('load-previous-replay-cancel').addEventListener('click', () => {
				_element_previousReplayContainer.classList.add('hidden');
				_element_control.classList.remove('hidden');
			});
			_element_btnClearStoredReplays.addEventListener('click', () => {
				if(confirm('Are you sure want to remove ALL replays?')){
					getIdbObjectStore().clear();
					refreshStoredReplays();
				}
			});
			_element_previousReplayRenameSave.addEventListener('click', ()=>{
				let option = _element_previousReplayOptions.selectedOptions[0];
				getIdbObjectStore().openCursor().onsuccess = event=>{
					const cursor = event.target.result;
					if(cursor){
						if(cursor.value.id === parseInt(option.dataset.databaseId)){
							cursor.value.name = _element_previousReplayRenameInput.value;
							cursor.update(cursor.value);
							refreshStoredReplays();
							_element_previousReplayRenameCancel.click();
						}else{
							cursor.continue();
						}
					}
				};
			});
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
							_element_iframe.style.minHeight = (parseFloat(localStorage.getItem('content height')))+'px';
							_element_iframe.style.height = messageEvent.data.value+'px';
							_element_iframe.classList.remove('hidden');
							_element_iframe_failToLoad.classList.add('hidden');
							if(_parent !== null){
								let height = _element_control.offsetHeight;
								height += parseFloat(window.getComputedStyle(document.documentElement, null).getPropertyValue('padding-top'));
								height += messageEvent.data.value;
								_parent.source.postMessage({type: 'Replay-Height', value: height}, _parent.origin);
							}
						}
						break;
					case 'Replay-Data':
						_editor.setText(messageEvent.data.replayData);
						_autoStart = true;
						onChange();
						break;
				}
			}
			function getIdbObjectStore(){
				return _idbDatabase.transaction(['records'], 'readwrite').objectStore('records');
			}
			function getStoredReplays(){
				let idbRequest = getIdbObjectStore().getAll();
				let callbackResolve;
				let callbackReject;
				idbRequest.onsuccess = event=>callbackResolve(idbRequest.result);
				idbRequest.onerror = event=>callbackReject(idbRequest.error);
				return new Promise((resolve, reject) => {callbackResolve = resolve; callbackReject = reject;});
			}
			function addReplayToStorage(replay={}){
				let replayString = JSON.stringify(replay);
				getStoredReplays().then(storedReplays => {
					let idbObjectStore = getIdbObjectStore();
					for(let index = 0; index < storedReplays.length; index++){
						if(replayString === JSON.stringify(storedReplays[index].data)){
							return; // Don't add if replay already exist in list.
						}
					}
					idbObjectStore.put({data: replay, stored: Date.now()});
				});
			}
			_element_btnLock.onclick = mouseEvent=>{
				_element_btnLock.disabled = true;
				_editor.setMode('view');
				addReplayToStorage(_editor.get());
				for(const input of document.getElementsByClassName('select-match-button')){
					input.disabled = input.dataset.aborted === 'true';
				}
				_replayOptionsPromise_resolve(GitHubApi.fetch('search/repositories?q=topic:AI-Tournaments+topic:AI-Tournaments-Replay+topic:'+_replayData.body.arena.full_name.replace('/','--')).then(response => response.json()).then(response => {
					document.getElementById('default-option').value = _replayData.header !== undefined && _replayData.header.defaultReplay !== undefined && _replayData.header.defaultReplay !== '' ? _replayData.header.defaultReplay : 'https://ai-tournaments.github.io/'+_replayData.body.arena.full_name.split('/')[1].replace('Arena','Replay')+'/';
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
					_element_viewOptions.classList.remove('hidden');
				}));
			};
		};
	})();
}
