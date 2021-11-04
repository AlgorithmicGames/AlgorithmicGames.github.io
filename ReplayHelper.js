'use strict'
class ReplayHelper{
	static #initiated = false;
	static #postHeight = null;
	static #previousHeight = null;
	static init = null;
	static preInit(){
		if(ReplayHelper.#initiated){
			console.error('ReplayHelper is already initiated.');
		}
		ReplayHelper.#initiated = true;
		let resolve = null;
		let promise = new Promise(r=>resolve=r);
		ReplayHelper.init = (callback=matchLog=>{})=>{
			promise.then(callback);
		}
		window.addEventListener('message', messageEvent => {
			switch(messageEvent.data.type){
				case 'Init-Fetch-Replay-Height':
					if(ReplayHelper.#postHeight === null){
						ReplayHelper.#postHeight = ()=>{
							if(ReplayHelper.#previousHeight !== document.documentElement.scrollHeight){
								ReplayHelper.#previousHeight = document.documentElement.scrollHeight;
								messageEvent.source.postMessage({type: 'Replay-Height', value: document.documentElement.scrollHeight}, messageEvent.origin);
							}
						};
					}
					window.addEventListener('resize', ReplayHelper.#postHeight);
					ReplayHelper.#postHeight();
					break;
				case 'Arena-Result':
					class ArenaResult{
						constructor(settings={}){
							for(const key in settings){
								if(Object.hasOwnProperty.call(settings, key)){
									this[key] = settings[key];
								}
							}
						}
					}
					class Replay{
						constructor(data){
							this.arenaResult = new ArenaResult(data.arenaResult);
							this.wrapped = data.wrapped;
						}
					}
					messageEvent.data.arenaResult.matchLogs.filter(matchLog => matchLog.error).forEach((matchLog, index) => console.error('Match '+index, matchLog.error));
					resolve(new Replay(messageEvent.data));
					break;
			}
		});
		window.parent.postMessage({type: 'ReplayHelper-Initiated'}, '*')
	}
}
ReplayHelper.preInit();
