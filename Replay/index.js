'use strict'
function a(){
	let replayData;
	let control = document.getElementById('control-container');
	let iframe = document.getElementById('replay-container');
	let btnLock = document.getElementById('lock');
	let dataInput = document.getElementById('data-input');
	btnLock.addEventListener('click', mouseEvent=>{
		btnLock.disabled = true;
		dataInput.disabled = true;
		for(const input of document.getElementsByClassName('select-match-button')){
			input.disabled = false;
		}
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
				input.dataset.log = JSON.stringify(matchLog.find(d=>d.type==='Done').value);
				input.disabled = true;
				input.classList.add('select-match-button');
				input.addEventListener('click', mouseEvent=>{
					for(const element of control.children){
						if(!element.classList.contains('select-match-button')){
							element.style.display = 'none';
						}
					}
					for(const input of document.getElementsByClassName('select-match-button')){
						input.disabled = false;
						iframe.src = (false?'https://ai-tournaments.github.io':'http://127.0.0.1:8887')+'/'+replayData.arena+'-Replay/#' + input.dataset.log;
					}
					input.disabled = true;
				});
				control.appendChild(input);
			});
		}
	});
}
