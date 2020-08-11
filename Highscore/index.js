'use strict'
function a(){
	let tableSummary;
	let arenaProperties;
	let arenaList = document.getElementById('arena-datalist');
	let participantList = document.getElementById('participants-selectable');
	let outputSum = document.getElementById('outputSum');
	let participantsSelected = document.getElementById('participants-selected');
	let btnStart = document.getElementById('btnStart');
	let tableContainer = document.getElementById('highscore-table-container');
	btnStart.onclick = start;
	for(const button of document.getElementsByClassName('transfer-button')){
		button.onclick = transferTo;
	}
	let contentWindows = {
		arena: [],
		iFrameLog: []
	};
	document.getElementById('arena').onchange = event => {
		let option = getOption(arenaList, event);
		if(option !== undefined){
			for(const element of document.getElementsByClassName('participant-team-container')){
				element.parentNode.removeChild(element);
			}
			document.title = event.target.value + ' Arena';
			getParticipants(option.value);
		}
	};
	fetch('https://api.github.com/orgs/AI-Tournaments/repos').then(response => response.json()).then(repos => {
		repos.forEach(repo => {
			if(repo.full_name.endsWith('-Arena')){
				fetch('https://raw.githubusercontent.com/GAME-Arena/master/properties.json'.replace('GAME-Arena', repo.full_name)).then(response => response.json()).then(_arenaProperties => {
					arenaProperties = _arenaProperties;
					if(arenaProperties.header.limits.participants.max === 1 || arenaProperties.header.limits.participantsPerTeam.max === 1){
						let option = document.createElement('option');
						option.value = repo.full_name.replace(/.*\/|-Arena/g, '');
						option.dataset.full_name = repo.full_name;
						arenaList.appendChild(option);
					}
				});
			}
		});
	});
	window.onmessage = messageEvent => {
		if(contentWindows.arena.includes(messageEvent.source)){
			getArenaLog(messageEvent);
		}else if(messageEvent.data.type === 'log'){
			document.getElementById(messageEvent.data.value.id + '_output').innerHTML = JSON.stringify(messageEvent.data.value.log,null,'\t');
			updateTable();
		}else{
			console.error('Source element not defined!');
			console.error(messageEvent.source.frameElement);
		}
	}
	function updateTable(){
		let logs = [];
		for(const arenaLog of document.getElementsByClassName('log-arena')){
			if(arenaLog.innerHTML !== ''){
				logs.push(JSON.parse(arenaLog.innerHTML));
			}
		};
		logs.forEach(log => {
			let ai_1 = log[0];
			let ai_2 = log[1];
			let cell = document.getElementById(ai_1.name + '_' + ai_2.name);
			cell.innerHTML = round(ai_1.score, 1) + ' / ' + round(ai_2.score, 1);
			if(ai_1.score < ai_2.score){
				cell.classList.add('ai-2');
			}else if(ai_2.score < ai_1.score){
				cell.classList.add('ai-1');
			}
			let array = [{'name': ai_1.name, 'score': ai_1.score}, {'name': ai_2.name, 'score': ai_2.score}];
			updateResultTable(array);
		});
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
		btnStart.disabled = participantsSelected.options.length < 2;
		sortOptions(selectElement_moveTo);
		let participants = [];
		for(const option of participantsSelected.options){
			participants.push(option.dataset.name);
		}
		buildTable(participants);
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
	function start(){
		let participants = [];
		for(const option of participantsSelected.options){
			participants.push({
				name: option.dataset.name,
				url: option.dataset.url
			});
		}
		let brackets = buildBrackets(participants, arenaProperties.header);
		brackets.forEach(bracket => {
			let div = document.createElement('div');
			document.getElementById('logContainer').appendChild(div);
			let arena = document.createElement('iframe');
			arena.src = '../Arena/index.html';
			arena.style.display = 'none';
			arena.id = 'arena_' + Date() + '_' +  Math.random();
			div.appendChild(arena);
			let output = document.createElement('pre');
			output.id = arena.id + '_output';
			output.style.display = 'none';
			output.classList.add('log');
			output.classList.add('log-arena');
			div.appendChild(output);
			contentWindows.iFrameLog.push(arena.contentWindow);
			arena.contentWindow.addEventListener('load', () => {
				arena.contentWindow.postMessage({
					type: 'auto-run',
					id: arena.id,
					bracket: bracket,
					settings: arenaProperties.settings,
					title: document.title
				}, '*');
			});
		});
	}
	function buildBrackets(participants=[], arenaHeader={}){ // TODO: Add support for dynamic team amount.
		let brackets = [];
		let _participants = participants.slice();
		_participants.forEach(a => {
			_participants.forEach(b => {
				if(a !== b){
					let dontAdd = false;
					if(arenaHeader.symmetric){
						brackets.forEach(bracket => {
							dontAdd |= bracket[0].includes(a) && bracket[0].includes(b);
						});
					}
					if(!dontAdd){
						brackets.push([[a], [b]]);
					}
				}
			});
		});
		return brackets;
	}
	function buildTable(listOfAIs){
	//	pendingGames++;
	//	let postCompare = function(){
	//		pendingGames--;
	//		if(pendingGames === 0){
	//			buttonEnableSwitch(true, true);
	//		}
	//	}
		while(tableContainer.firstChild){tableContainer.removeChild(tableContainer.firstChild);}
		if(0 < listOfAIs.length){
			let header = document.createElement('p');
			header.innerHTML = 'Average out of ' + arenaProperties.settings.general.averageOf + ' games.';
			tableContainer.appendChild(header);
			let tableWrapper = document.createElement('div');
			tableContainer.appendChild(tableWrapper);

			// Create base of new table.
			let table = document.createElement('table');
			tableSummary = document.createElement('table');

			// Add major table header.
			let tableRow = document.createElement('tr');
			let tableCell = document.createElement('td');
			tableCell.classList.add('cell-unused');
			tableCell.colSpan = 2;
			tableCell.rowSpan = 2;
			tableCell.innerHTML = 'Score';
			tableRow.appendChild(tableCell);
			let tableHeaderMajor = document.createElement('th');
			tableHeaderMajor.innerHTML = '<div>Team 1</div>';
			tableHeaderMajor.classList.add('major-header', 'ai-1');
			tableHeaderMajor.colSpan = listOfAIs.length;
			tableRow.appendChild(tableHeaderMajor);
			table.appendChild(tableRow);

			// Add base table.
			tableRow = document.createElement('tr');
			listOfAIs.forEach(function(name){
				let tableHeader = document.createElement('th');
				tableHeader.innerHTML = name;
				tableRow.appendChild(tableHeader);
			}, this);
			table.appendChild(tableRow);

			// Add base header for result.
			tableRow = document.createElement('tr');
			// Summary
			tableCell = document.createElement('td');
			tableCell.classList.add('cell-unused');
			tableCell.innerHTML = 'Summary';
			tableRow.appendChild(tableCell);
			// Team 1
			tableCell = document.createElement('th');
			tableCell.innerHTML = 'Team 1';
			tableCell.classList.add('clickable');
			tableCell.onclick = function(){sortTableSummary(1)};
			tableRow.appendChild(tableCell);
			// Team 2
			tableCell = document.createElement('th');
			tableCell.innerHTML = 'Team 2';
			tableCell.classList.add('clickable');
			tableCell.onclick = function(){sortTableSummary(2)};
			tableRow.appendChild(tableCell);
			// Average
			tableCell = document.createElement('th');
			tableCell.innerHTML = 'Average';
			tableCell.classList.add('clickable');
			tableCell.onclick = function(){sortTableSummary(0)};
			tableRow.appendChild(tableCell);
			tableSummary.appendChild(tableRow);

			// Add major table side header.
			tableRow = document.createElement('tr');
			let tableHeaderMajorSide = document.createElement('th');
			tableHeaderMajorSide.innerHTML = '<div>Team 2</div>';
			tableHeaderMajorSide.classList.add('major-header', 'rotated', 'ai-2');
			tableHeaderMajorSide.rowSpan = listOfAIs.length;
			tableRow.appendChild(tableHeaderMajorSide);

			listOfAIs.forEach(function(name){
				let tableHeader = document.createElement('th');
				tableHeader.innerHTML = name;
				tableRow.appendChild(tableHeader);

				// Add AI to result table.
				let tableRowResult = document.createElement('tr');
				tableHeader = document.createElement('th');
				tableHeader.innerHTML = name;
				tableRowResult.appendChild(tableHeader);

				let tableSummaryCell = document.createElement('td');
				tableSummaryCell.id = name + '_AI1';
				tableSummaryCell.classList.add('resultAI1');
				tableSummaryCell.innerHTML = '0.0';
				tableSummaryCell.dataset.score = 0;
				tableRowResult.appendChild(tableSummaryCell);

				tableSummaryCell = document.createElement('td');
				tableSummaryCell.id = name + '_AI2';
				tableSummaryCell.classList.add('resultAI2');
				tableSummaryCell.innerHTML = '0.0';
				tableSummaryCell.dataset.score = 0;
				tableRowResult.appendChild(tableSummaryCell);

				tableSummaryCell = document.createElement('td');
				tableSummaryCell.id = name + '_average';
				tableSummaryCell.classList.add('resultAverage');
				tableSummaryCell.innerHTML = '0.0';
				tableSummaryCell.dataset.score = 0;
				tableRowResult.appendChild(tableSummaryCell);

				tableSummary.appendChild(tableRowResult);
				listOfAIs.forEach(function(_name){
					let tableCell = document.createElement('td');
					tableCell.id = _name + '_' + name;
					tableRow.appendChild(tableCell);
				}, this);
				table.appendChild(tableRow);
				tableRow = document.createElement('tr');
			}, this);
			tableWrapper.appendChild(table);
			tableWrapper.appendChild(tableSummary);
		}
	}

	function updateResultTable(input){
		input.forEach(function(ai, index){
			let aiNumber = index + 1;
			let aiName = ai.name;
			let score = ai.score;
			let cellScore = document.getElementById(aiName + '_AI' + aiNumber);
			let oldScore = parseFloat(cellScore.dataset.score);
			let newScore = oldScore + score;
			cellScore.dataset.score = newScore;
			cellScore.innerHTML = round(newScore, 1);
			// Set average
			let scoreAI_1 = parseFloat(document.getElementById(aiName + '_AI1').dataset.score);
			let scoreAI_2 = parseFloat(document.getElementById(aiName + '_AI2').dataset.score);
			document.getElementById(aiName + '_average').innerHTML = round((scoreAI_1 + scoreAI_2)/2, 1);
		}, this);
		sortTableSummary(0);
	}

	function sortTableSummary(ai){
		let column;
		switch(ai){
			case 1:
				column = 'resultAI1';
				break;
		
			case 2:
				column = 'resultAI2';
				break;
		
			default:
				column = 'resultAverage';
		}
		let rows = tableSummary.childNodes;
		rows = [].slice.call(rows, 1);
		rows.sort(function(a, b){
			let aValue = parseFloat(a.getElementsByClassName(column)[0].childNodes[0].data);
			let bValue = parseFloat(b.getElementsByClassName(column)[0].childNodes[0].data);
			if(bValue < aValue) return -1;
			if(aValue < bValue) return 1;
			return 0;
		});
		// Remove and readd.
		let header = tableSummary.firstChild;
		while(tableSummary.firstChild){tableSummary.removeChild(tableSummary.firstChild);}
		tableSummary.appendChild(header);
		rows.forEach(function(row){
			tableSummary.appendChild(row);
		}, this);
		// Mark sorted column
		tableSummary.childNodes.forEach(function(rowNodes){
			rowNodes.childNodes.forEach(function(columnNode){
				columnNode.classList.remove('sorted');
				if(columnNode.classList.contains(column)){
					columnNode.classList.add('sorted');
				}
			}, this);
		}, this);
	}
	function round(value, decimals){
		var hadDecimal = 0 < value%1;
		var base = Math.pow(10, decimals);
		var newValue = Math.round(value*base)/base;
		return newValue + (newValue%1 == 0 && hadDecimal ? '.0' : '')
	}
}
