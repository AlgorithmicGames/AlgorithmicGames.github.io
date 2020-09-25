'use strict'
function a(){
	let replayData;
	let control = document.getElementById('control-container');
	let viewOptions = document.getElementById('replay-viewers');
	let iframe = document.getElementById('replay-container');
	let btnLock = document.getElementById('lock');
	let dataInput = document.getElementById('data-input');
	btnLock.addEventListener('click', mouseEvent=>{
		btnLock.disabled = true;
		dataInput.disabled = true;
		for(const input of document.getElementsByClassName('select-match-button')){
			input.disabled = input.dataset.aborted === 'true';
		}
		fetch('https://api.github.com/search/repositories?q=topic:AI-Tournaments+topic:Replay+topic:'+replayData.arena).then(response => response.json()).then(response => {
			document.getElementById('default-option').value = (false?'https://ai-tournaments.github.io':'http://127.0.0.1:8887')+'/'+replayData.arena+'-Replay/';
			response.items.forEach(repo => {
				if(repo.has_pages){
					let cssStar = getComputedStyle(document.documentElement).getPropertyValue('--github-stars').trim();
					cssStar = cssStar.substring(1,cssStar.length-1);
					let option = document.createElement('option');
					option.innerHTML = repo.full_name.replace(/.*\/|-Arena/g, '') + ' ' + cssStar + repo.stargazers_count;
					option.dataset.stars = repo.stargazers_count;
					option.value = 'https://'+repo.owner.login+'.github.io/'+repo.name;
					viewOptions.appendChild(option);
				}
			});
			let options = [...viewOptions.options];
			options.sort(function(a, b){
				if(parseFloat(a.dataset.stars) < parseFloat(b.dataset.stars)){return -1;}
				if(parseFloat(b.dataset.stars) < parseFloat(a.dataset.stars)){return 1;}
				return 0;
			});
			for(let option of options){
				viewOptions.add(option);
			}
			viewOptions.classList.remove('hidden');
		});
	});
	dataInput.addEventListener('input', inputEvent=>{
		[...document.getElementsByClassName('select-match-button')].forEach(input=>{
			input.parentElement.removeChild(input);
		});
		replayData = dataInput.value;
		btnLock.disabled = true;
		try{
			replayData = JSON.parse(replayData);
			btnLock.disabled = typeof replayData !== 'object';
		}catch(error){}
		document.getElementById('invalid-input').style.display = btnLock.disabled ? '' : 'none';
		if(!btnLock.disabled){
			let selectionStart = dataInput.selectionStart;
			dataInput.value = JSON.stringify(replayData,null,'\t');
			dataInput.selectionStart = selectionStart;
			replayData.data.forEach((matchLog, index) => {
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
					for(const element of control.children){
						if(!element.classList.contains('sticky')){
							element.style.display = 'none';
						}
					}
					for(const input of document.getElementsByClassName('select-match-button')){
						input.disabled = input.dataset.aborted === 'true';
						iframe.src = viewOptions.selectedOptions[0].value + '#' + input.dataset.log;
					}
					input.disabled = true;
				});
				control.appendChild(input);
			});
		}
	});
	if(1 < location.hash.length){
		dataInput.value = decodeURI(location.hash.substring(1));
		dataInput.dispatchEvent(new Event('input', {
			bubbles: true,
			cancelable: true,
		}));
		btnLock.click();
	}
}
