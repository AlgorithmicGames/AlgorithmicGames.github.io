'use strict'
class ReplayHelper{
	static #initiated = false;
	static #data;
	static init(){
		if(ReplayHelper.#initiated){
			fatal('ReplayHelper is already initiated.');
		}
		ReplayHelper.#initiated = true;
		let hash = location.hash;
		ReplayHelper.#data = JSON.parse(decodeURI(hash.substring(1)));
		location.hash = '';
		window.addEventListener('load', ()=>{location.hash = hash;});
		window.addEventListener('message', messageEvent => {
			if(messageEvent.data.type === 'Init-Fetch-Replay-Height'){
				function postHeight(){
					messageEvent.source.postMessage({type: 'Replay-Height', value: document.documentElement.scrollHeight}, messageEvent.origin);
				}
				window.addEventListener('resize', postHeight);
				postHeight();
			}
		});
	}
	static getData(){
		return JSON.parse(JSON.stringify(ReplayHelper.#data));
	}
}
ReplayHelper.init();
