'use strict'
function a(){
	const _element_paddingWrapper = document.getElementById('padding-wrapper');
	const _element_control = document.getElementById('control-container');
	const _element_viewOptions = document.getElementById('replay-viewers');
	const _element_previousReplayOptions = document.getElementById('previous-replays');
	const _element_iframe = document.getElementById('replay-container');
	const _element_previousReplayContainer = document.getElementById('previous-replay-container');
	const _element_iframe_failToLoad = document.getElementById('replay-container-failToLoad');
	const _element_btnLock = document.getElementById('lock');
	const _element_editor = document.getElementById('editor');
	const _element_btnClearStoredReplays = document.getElementById('load-previous-replay-clear');
	const _element_previousReplayRenameInput = document.getElementById('previous-replay-rename-input');
	const _element_loadPreviousReplayRename = document.getElementById('load-previous-replay-rename');
	const _element_previousReplayRename = document.getElementById('previous-replay-rename');
	const _element_previousReplayRenameClose = document.getElementById('previous-replay-rename-cancel');
	const _element_previousReplayRenameSave = document.getElementById('previous-replay-rename-save');
	const _element_previousReplaysController = document.getElementById('previous-replays-controller');
	const _editor = new JSONEditor(_element_editor, {'modes': ['code', 'view'], 'name': 'Replay', 'onChange': onChange, 'onValidate': onValidate});
	let _replayData;
	let _previousOption;
	let _autoStart = false;
	fetch('/schemaDefs.json').then(response => response.json()).then(schemaDefs => {
		_editor.setSchema({
			type: 'object',
			required: ['header', 'body'],
			properties: {
				header: {
					type: 'object',
					required: ['defaultReplay'],
					properties: {defaultReplay: {type: 'string'}}
				},
				body: {
					type: 'object',
					required: ['arena', 'settings', 'matchLogs', 'result', 'teams'],
					properties: {
						arena: {type: 'object'},
						settings: {
							type: 'object',
							required: ['general'],
							properties: {general: {type: 'object'}}
						},
						matchLogs: {
							type: 'array',
							items: {
								type: 'object',
								required: ['log', 'scores', 'status', 'seed'],
								properties: {
									log: {
										type: 'array',
										items: {
											type: 'object',
											required: ['type', 'value'],
											properties: {
												type: {type: 'string'}
											}
										}
									},
									scores: {
										type: 'array',
										items: {
											type: 'object',
											required: ['score', 'members', 'team'],
											properties: {
												score: {type: 'number'},
												members: {
													type: 'array',
													items: {
														type: 'object',
														required: ['name', 'bonus'],
														properties: {
															name: {type: 'string'},
															bonus: {type: 'number'}
														}
													}
												},
												team: {type: 'number'}
											}
										}
									},
									status: {type: 'string'},
									seed: {type: 'string'}
								}
							}
						},
						result: {
							type: 'object',
							required: ['team', 'partialResult'],
							properties: {
								team: {
									type: 'array',
									items: {
										type: 'object',
										required: ['average', 'total'],
										properties: {
											average: {$ref: 'resultScore'},
											total: {$ref: 'resultScore'}
										}
									}
								},
								partialResult: {type: 'boolean'}
							}
						},
						teams: {
							type: 'array',
							items: {
								type: 'object',
								required: ['members'],
								properties: {
									members: {
										type: 'array',
										items: {
											type: 'object',
											required: ['name'],
											properties: {
												name: {type: 'string'}
											}
										}
									}
								}
							}
						}
					}
				}
			}
		}, schemaDefs);
	});
	class IndexedDBOperation {
		static #sharedWorker = new SharedWorker('indexedDB.js');
		static do = async call => {
			let resolve;
			let reject;
			const promise = new Promise((_resolve, _reject) => {resolve = _resolve; reject = _reject;});
			let awaitingResponse = true;
			this.#sharedWorker.port.onmessage = m => {
				if(awaitingResponse){
					awaitingResponse = false;
					if(!m.data){return}
					if(m.data.result instanceof Error){
						reject(m.data.result);
					}else{
						if(m.data.result){
							resolve(m.data.result);
						}else if(m.data.query){
							this.#sharedWorker.port.postMessage(window[m.data.query.type](m.data.query.message));
						}
					}
				}
			}
			this.#sharedWorker.port.postMessage(call);
			return promise;
		}
	}
	let replayID = parseInt(window.location.hash.substring(1));
	if(!isNaN(replayID)){
		IndexedDBOperation.do({operation: 'getStoredReplayData', data: replayID}).then(replayData => {
			_editor.setMode('view');
			_editor.set(replayData);
			_autoStart = true;
			onChange();
		});
	}
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
		if(option){
			_element_previousReplayRenameInput.value = option.dataset.name === option.dataset.defaultName ? '' : option.dataset.name;
			_element_previousReplayRenameInput.placeholder = option.dataset.defaultName;
			_element_previousReplaysController.classList.add('hidden');
			_element_previousReplayRename.classList.remove('hidden');
		}
	});
	_element_previousReplayRenameClose.addEventListener('click', ()=>{
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
		if(json.body !== undefined && typeof json.body.matchLogs !== 'object'){
			errors.push({
				path: ['body'],
				message: 'Property "matchLogs" is missing or not a array.'
			});
		}
		return errors;
	}
	function onChange(){
		_editor.validate().then(errors => {
			let containsError = 0 < errors.length;
			_element_btnLock.disabled = containsError;
			document.getElementById('invalid-input').classList[containsError ? 'remove' : 'add']('hidden');
			if(containsError){
				_element_editor.classList.remove('hidden');
			}else{
				_replayData = _editor.get();
			}
			if(_autoStart){
				_autoStart = false;
				if(!containsError){
					_element_btnLock.onclick();
				}
			}
		});
	}
	function refreshStoredReplays(){
		while(0 < _element_previousReplayOptions.childElementCount){
			_element_previousReplayOptions.removeChild(_element_previousReplayOptions.firstChild);
		}
		IndexedDBOperation.do({operation: 'getStoredReplays'}).then(storedReplays => {
			let groupedReplays = [];
			storedReplays.forEach(storedReplay => {
				if(groupedReplays.find(groupedReplay => groupedReplay.name === storedReplay.arena) === undefined){
					groupedReplays.push({name: storedReplay.arena, list: []});
				}
				groupedReplays.filter(r => r.name === storedReplay.arena)[0].list.push(storedReplay);
			});
			groupedReplays.forEach(groupedReplay => {
				let optgroup = document.createElement('optgroup');
				optgroup.label = groupedReplay.name;
				groupedReplay.list.forEach(storedReplay => {
					let option = document.createElement('option');
					option.dataset.databaseId = storedReplay.id;
					option.dataset.defaultName = storedReplay.defaultName;
					option.dataset.name = [undefined, ''].includes(storedReplay.name) ? option.dataset.defaultName : storedReplay.name;
					option.dataset.arena = groupedReplay.name;
					option.innerHTML = option.dataset.arena+' '+option.dataset.name;
					if(_previousOption){
						option.selected = _previousOption.dataset.databaseId === option.dataset.databaseId;
					}
					optgroup.appendChild(option);
				});
				_element_previousReplayOptions.appendChild(optgroup);
			});
			_element_btnClearStoredReplays.disabled = storedReplays.length === 0;
		});
	}
	function closeReplayController(){
		_element_previousReplayContainer.classList.add('hidden');
		_element_control.classList.remove('hidden');
	}
	function exportReplay(option){
		if(!option){
			return;
		}
		let html;
		let replayData;
		let promiseData = IndexedDBOperation.do({operation: 'getStoredReplayData', data: option.dataset.databaseId}).then(data => {
			replayData = structuredClone(data);
			if(!replayData.header.meta.exported){
				replayData.header.meta.exported = [];
			}
			replayData.header.meta.exported.push(structuredClone(new Date()));
		});
		let promiseExportTemplate = fetch('/Replay/ReplayExportTemplate.html').then(response => response.text()).then(text => html = text);
		Promise.allSettled([promiseData, promiseExportTemplate]).then(()=>{
			html = html.replace(/\/\*DATA\/\*\/.*\/\*\/DATA\*\//, JSON.stringify({name: option.dataset.name, value: replayData}));
			let element = document.createElement('a');
			element.setAttribute('href', 'data:text/plain;charset=utf-8,'+encodeURIComponent(html));
			element.setAttribute('download', option.dataset.name+'.AI-Tournaments-Replay.html');
			element.style.display = 'none';
			document.body.appendChild(element);
			element.click();
			document.body.removeChild(element);
		});
	}
	document.getElementById('load-previous-replay').addEventListener('click', ()=>{
		refreshStoredReplays();
		_element_control.classList.add('hidden');
		_element_previousReplayContainer.classList.remove('hidden');
	});
	document.getElementById('load-previous-replay-confirm').addEventListener('click', () => {
		let option = _element_previousReplayOptions.selectedOptions[0];
		if(option){
			closeReplayController();
			_previousOption = option;
			IndexedDBOperation.do({operation: 'getStoredReplayData', data: option.dataset.databaseId}).then(replayData => {
				_editor.setMode('view');
				_editor.set(replayData);
				while(0 < _element_previousReplayOptions.childElementCount){
					_element_previousReplayOptions.removeChild(_element_previousReplayOptions.firstChild);
				}
				onChange();
			});
		}
	});
	document.getElementById('load-previous-replay-delete').addEventListener('click', ()=>{
		let count = [..._element_previousReplayOptions.selectedOptions].length;
		if(0 < count){
			let question = count === 1 ? 'replay "'+_element_previousReplayOptions.selectedOptions[0].innerHTML+'"?' : ''+count+' replays?\n'+[..._element_previousReplayOptions.selectedOptions].map(o=>o.innerHTML).join('\n');
			if(confirm('Are you sure want to remove '+question)){
				let promises = [];
				for(let option of [..._element_previousReplayOptions.selectedOptions]){
					promises.push(IndexedDBOperation.do({operation: 'deleteStoredReplay', data: option.dataset.databaseId}));
				}
			}
			Promise.allSettled(promises).then(refreshStoredReplays);
		}
	});
	document.getElementById('load-previous-replay-export').addEventListener('click', ()=>{
		exportReplay(_element_previousReplayOptions.selectedOptions[0]);
	});
	document.getElementById('load-previous-replay-cancel').addEventListener('click', closeReplayController);
	_element_btnClearStoredReplays.addEventListener('click', () => {
		if(confirm('Are you sure want to remove ALL '+[..._element_previousReplayOptions.children].map(o => o.childElementCount).reduce((a,b)=>a+b)+' replays?')){
			IndexedDBOperation.do({operation: 'removeAllStoredReplays'}).then(()=>{
				refreshStoredReplays();
				_element_previousReplayRenameClose.click();
			});
		}
	});
	_element_previousReplayRenameSave.addEventListener('click', ()=>{
		let option = _element_previousReplayOptions.selectedOptions[0];
		if(option){
			IndexedDBOperation.do({operation: 'renameStoredReplay', data: {id: option.dataset.databaseId, name: _element_previousReplayRenameInput.value}}).then(()=>{
				refreshStoredReplays();
				_element_previousReplayRenameClose.click();
			});
		}
	});
	window.onmessage = messageEvent => {
		// NOTE: messageEvent can come from off site scripts.
		switch(messageEvent.data.type){
			case 'Replay-Height':
				let scrollToBottom = !document.documentElement.style.paddingLeft;
				if(scrollToBottom){
					document.documentElement.style.paddingLeft = 0;
					document.documentElement.style.paddingRight = 0;
					document.documentElement.style.paddingBottom = 0;
				}
				if(messageEvent.data.value !== undefined){
					_element_iframe.style.minHeight = window.parent.window.innerHeight +'px';
					_element_iframe.style.height = messageEvent.data.value+'px';
					_element_iframe.classList.remove('hidden');
					_element_iframe_failToLoad.classList.add('hidden');
					let height = _element_control.offsetHeight;
					height += parseFloat(window.getComputedStyle(_element_paddingWrapper, null).getPropertyValue('padding-top'));
					height += parseFloat(window.getComputedStyle(_element_paddingWrapper, null).getPropertyValue('padding-bottom'));
					height += messageEvent.data.value;
					let parent = window.opener ?? window.parent.window;
					if(parent){
						parent.postMessage({type: 'Replay-Height', value: height}, '*');
						if(scrollToBottom){
							document.documentElement.scrollTop = document.documentElement.scrollHeight;
						}
					}
				}
				break;
			case 'Replay-Data':
				_editor.setText(messageEvent.data.replayData);
				_autoStart = true;
				onChange();
				break;
			case 'Add-External-Replay-Data':
				IndexedDBOperation.do({operation: 'addReplayToStorage', data: messageEvent.data.value}).then(id => {
					IndexedDBOperation.do({operation: 'renameStoredReplay', data: {id: id, name: messageEvent.data.name}}).then(()=>{
						messageEvent.source.postMessage({type: 'Replay-Store-ID', value: id}, '*');
					});
				});
				break;
			case 'ReplayHelper-Initiated':
				messageEvent.source.postMessage({type: 'Init-Fetch-Replay-Height'}, '*');
				messageEvent.source.postMessage({type: 'Arena-Result', arenaResult: JSON.parse(_element_iframe.dataset.arenaResult), wrapped: !_element_iframe.dataset.wrapped}, '*');
				setTimeout(()=>{
					if(_element_iframe.classList.contains('hidden')){
						_element_iframe_failToLoad.classList.remove('hidden');
					}
				}, 1000);
				break;
		}
	}
	let previousTicket = {done: true};
	_element_btnLock.onclick = async mouseEvent=>{
		const ticket = previousTicket;
		previousTicket = {};
		await queue(()=>ticket.done);
		_editor.validate().then(errors => {
			if(errors.length)return;
			_element_btnLock.disabled = true;
			_editor.setMode('view');
			IndexedDBOperation.do({operation: 'addReplayToStorage', data: _editor.getText()});
			GitHubApi.fetch('search/repositories?q=topic:AI-Tournaments+topic:AI-Tournaments-Replay+topic:'+_replayData.body.arena.full_name.replace('/','--')).then(response => response.json()).then(response => {
				document.getElementById('default-option').value = _replayData.header.defaultReplay;
				response.items.forEach(repo => {
					if(repo.has_pages){
						let cssStar = getComputedStyle(document.documentElement).getPropertyValue('--github-stars').trim();
						cssStar = cssStar.substring(1,cssStar.length-1);
						let option = document.createElement('option');
						option.innerHTML = repo.full_name.replace(/.*\/|-Arena/g, '') + ' ' + cssStar + repo.stars;
						option.dataset.stars = repo.stars;
						option.value = 'https://'+repo.owner.login+'.github.io/'+repo.name;
						if(option.value !== _replayData.header.defaultReplay){
							_element_viewOptions.appendChild(option);
						}
					}
				});

				let options = [..._element_viewOptions.options];
				options.sort(function(a, b){
					if(b.id === 'default-option'){return 1;}

					let aOfficial = a.value.startsWith('https://ai-tournaments.github.io/');
					let bOfficial = a.value.startsWith('https://ai-tournaments.github.io/');
					if(aOfficial ? !bOfficial : bOfficial){return 1;}

					if(parseFloat(a.dataset.stars) < parseFloat(b.dataset.stars)){return -1;}
					if(parseFloat(b.dataset.stars) < parseFloat(a.dataset.stars)){return 1;}

					return a.innerHTML.toLowerCase().localeCompare(b.innerHTML.toLowerCase());
				});
				for(let option of options){
					_element_viewOptions.add(option);
				}
				_element_viewOptions.onchange = event => {
					let option = event.target;
					if(option){
						// Load replay.
						for(const element of _element_control.children){
							if(!element.classList.contains('sticky')){
								element.classList.add('hidden');
							}
						}
						let url = option.value;
						let session = GitHubApi.getSessionStorage();
						if(!url.startsWith('https://ai-tournaments.github.io/') && !session.externalReplaysAccepted){
							session.externalReplaysAccepted = 'i accept external replay viewers' === (prompt('External replays are by default blocked for security reasons. do so at your own risk. Only do this to URLs for code that you trust.\n\nWrite "I accept external replays" to allow external replay viewers.')??'').toLowerCase();
							GitHubApi.setSessionStorage(session);
						}
						if(url.startsWith('https://ai-tournaments.github.io/') || session.externalReplaysAccepted){
							_element_iframe.dataset.arenaResult = JSON.stringify(_replayData.body);
							_element_iframe.src = url;
							document.getElementById('open-replay-in-new-tab').addEventListener('click', ()=>{
								_element_iframe.dataset.wrapped = 'false';
								window.open(url);
							});
						}
					}
				}
				if(1 < options.length){
					_element_viewOptions.classList.remove('hidden');
				}
				_element_viewOptions.onchange({target: options[0]});
				ticket.done = true;
			});
		});
	};
	let parent = window.opener ?? window.parent;
	if(parent){
		parent.postMessage({type: 'Replay-Initiated'}, '*');
	}
}
