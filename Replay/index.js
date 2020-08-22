'use strict'
function a(){
	let replayData;
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

			let log = replayData.find(d=>d.type==='log').data;
			log.forEach((match, index) => {
				let input = document.createElement('input');
				input.type = 'button';
				input.value = 'Match ' + (index+1);
				input.disabled = true;
				input.classList.add('select-match-button');
				input.addEventListener('click', mouseEvent=>{
					for(const input of document.getElementsByClassName('select-match-button')){
						input.disabled = false;
						console.log(event);
					}
					input.disabled = true;
				});
				document.body.appendChild(input);
			});
		}
	});
}
