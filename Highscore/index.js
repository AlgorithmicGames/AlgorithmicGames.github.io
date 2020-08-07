'use strict'
let arenaList = undefined;
let arenaProperties = undefined;
let participantList = undefined;
let logContainer = undefined;
let outputSum = undefined;
let btnStart = undefined;
let participantsSelected = undefined;
let contentWindows = {
	arena: []
};
window.onmessage = messageEvent => {
	if(contentWindows.arena.includes(messageEvent.source)){
		getArenaLog(messageEvent);
	}else{
		console.error('Source element not defined!');
		console.error(messageEvent.source.frameElement);
	}
}
function getArenaLog(messageEvent){
	let iframe = document.getElementById(messageEvent.data.id);
	let output = iframe.parentElement.getElementsByClassName('log')[0];
	if(messageEvent.origin === 'null'){
		while(0 < output.childElementCount){
			output.removeChild(output.firstChild);
		}
		let isDone = true;
		let aborted = []; // TODO: Use.
		let log = undefined;
		messageEvent.data.value.data.forEach(posts => {
			let container = document.createElement('div');
			output.appendChild(container);
			let isDone_local = false;
			let score = undefined;
			posts.forEach(post => {
				isDone_local |= post.type === 'FinalScore' || post.type === 'Aborted';
				if(post.type === 'FinalScore'){
					score = post.value.score;
					log = post.value.history;
				}else if(post.type === 'Aborted'){
					score = null;
					aborted.push(post.value);
				}
				let label = document.createElement('label');
				label.htmlFor = iframe.src + ':' + post.id;
				label.classList.add(post.type);
				label.innerHTML = post.type;
				container.appendChild(label);
				let pre = document.createElement('pre');
				pre.id = iframe.src + ':' + post.id;
				pre.classList.add(post.type);
				pre.innerHTML = JSON.stringify(post.value,null,'\t');
				container.appendChild(pre);
			});
			isDone &= isDone_local;
			if(isDone_local){
				if(score === null){
					outputSum.dataset.aborted = JSON.stringify(aborted);
				}else{
					let array = outputSum.dataset.array === undefined ? [] : JSON.parse(outputSum.dataset.array);
					score.forEach(s => {
						let entry = array.find(entry => entry.name === s.name);
						if(entry === undefined){
							entry = {type: 'score', name: s.name, score: 0, scores: []};
							array.push(entry);
						}
						entry.scores.push(s.score);
						entry.score = entry.scores.reduce(function(a,b){return a+b;})/entry.scores.length;
					});
					outputSum.dataset.array = JSON.stringify(array);
					outputSum.innerHTML = JSON.stringify(array,null,'\t');
				}
			}
		});
		if(isDone){
			let array = outputSum.dataset.array === undefined ? [] : JSON.parse(outputSum.dataset.array);
			array.push({type: 'log', log: log})
			if(outputSum.dataset.aborted !== undefined){
				array.push({type: 'aborted', aborted: aborted})
			}
			outputSum.dataset.array = JSON.stringify(array);
			outputSum.innerHTML = JSON.stringify(array,null,'\t');
			contentWindows.iFrameLog.splice(contentWindows.iFrameLog.indexOf(messageEvent.source), 1);
		}else{
			getIFrameLog(iframe);
		}
	}
};
function getOption(element, event){
	for(const option of element.getElementsByTagName('option')){
		if(option.value === event.target.value){
			return option;
		}
	}
}
function sortOptions(selectElement){
	let options = [...selectElement.options];
	options.sort(function(a, b){
		if(a.value < b.value){return -1;}
		if(b.value < a.value){return 1;}
		return 0;
	});
	for(let option of options){
		selectElement.add(option);
	}
}
function transferTo(event){
	let selectElement_moveTo = document.getElementById(event.target.dataset.select);
	let selectElements = document.getElementsByClassName('participants');
	for(const selectElement of selectElements){
		for(let option of [...selectElement.selectedOptions]){
			selectElement_moveTo.add(option);
			option.selected = false;
		}
	}
	document.getElementById('start').disabled = participantsSelected.options.length < 2;
	sortOptions(selectElement_moveTo);
}
function onload(){
	arenaList = document.getElementById('arena-datalist');
	participantList = document.getElementById('participants-selectable');
	logContainer = document.getElementById('logContainer');
	outputSum = document.getElementById('outputSum');
	btnStart = document.getElementById('btnStart');
	participantsSelected = document.getElementById('participants-selected');
	for(const button of document.getElementsByClassName('transfer-button')){
		button.onclick = transferTo;
	}
	document.getElementById('arena').onchange = event => {
		let option = getOption(arenaList, event);
		if(option !== undefined){
			for(const element of document.getElementsByClassName('participant-team-container')){
				element.parentNode.removeChild(element);
			}
			document.title = event.target.value + ' Arena';
			getParticipants(option.value);
		}
	}
	fetch('https://api.github.com/orgs/AI-Tournaments/repos').then(response => response.json()).then(repos => {
		repos.forEach(repo => {
			if(repo.full_name.endsWith('-Arena')){
				fetch('https://raw.githubusercontent.com/GAME-Arena/master/properties.json'.replace('GAME-Arena', repo.full_name)).then(response => response.json()).then(arenaProperties => {
					if(arenaProperties.limits.participants.max === 1 || arenaProperties.limits.participantsPerTeam.max === 1){
						let option = document.createElement('option');
						option.value = repo.full_name.replace(/.*\/|-Arena/g, '');
						option.dataset.full_name = repo.full_name;
						arenaList.appendChild(option);
					}
				});
			}
		});
	});
}
function getParticipants(arena=''){
	for(const selectElement of document.getElementsByClassName('participants')){
		while(0 < selectElement.length){
			selectElement.remove(0);
		}
	}
	let promises = [];
	fetch('https://api.github.com/repos/AI-Tournaments/'+arena+'-AI-Tournament-Participant/forks').then(response => response.json()).then(forks => {
		forks.forEach(fork => {
			promises.push(fetch('https://api.github.com/repos/' + fork.full_name + '/git/trees/master')
			.then(response => response.json())
			.then(data => {
				data.tree.forEach(file =>{
					if(!file.path.startsWith('.') && file.type === 'blob' && file.path.endsWith('.js')){
						let option = document.createElement('option');
						option.dataset.name = fork.full_name + '/' + file.path;
						option.dataset.url = 'https://raw.githubusercontent.com/' + fork.full_name + '/' + fork.default_branch + '/' + file.path;
						option.innerHTML = option.dataset.name;
						participantList.appendChild(option);
					}
				});
			})
			.catch(error => {
				console.error(error);
			}));
		});
		Promise.all(promises).then(() => {
			sortOptions(participantList);
		})
	});
}
function getIFrameLog(iframe){
	contentWindows.iFrameLog.push(iframe.contentWindow);
	iframe.contentWindow.postMessage(iframe.id, '*');
}
function start(){
	console.log(participantsSelected.options);
}
