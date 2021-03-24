'use strict'
class ReplayHelper{
	static #initiated = false;
	static #data;
	static init(){
		if(ReplayHelper.#initiated){
			fatal('ReplayHelper is already initiated.');
		}
		ReplayHelper.#initiated = true;
		window.addEventListener('message', messageEvent => {
			switch(messageEvent.data.type){
				case 'Init-Fetch-Replay-Height':
					function postHeight(){
						messageEvent.source.postMessage({type: 'Replay-Height', value: document.documentElement.scrollHeight}, messageEvent.origin);
					}
					window.addEventListener('resize', postHeight);
					postHeight();
					break;
				case 'Match-Log':
					ReplayHelper.#data = JSON.parse(messageEvent.data.matchLog);
					break;
			}
		});
	}
	static getData(){
		return JSON.parse(JSON.stringify(ReplayHelper.#data));
	}
}
ReplayHelper.init();
