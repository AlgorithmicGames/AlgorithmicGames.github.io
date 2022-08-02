'use strict'
class ReplayHelper{
	static #initiated = false;
	static #postHeight = null;
	static #previousHeight = null;
	static #replay = null;
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
							ReplayHelper.#replay = this;
							this.arenaResult = new ArenaResult(data.arenaResult);
							this.wrapped = data.wrapped;
							this.arenaResult.teams.forEach(team => {
								team.color = ReplayHelper.#getTeamColor(team);
								team.members.forEach(member => member.color = ReplayHelper.#getMemberColor(member));
							});
						}
					}
					resolve(new Replay(messageEvent.data));
					break;
			}
		});
		let parent = window.opener ?? window.parent;
		if(parent){
			parent.postMessage({type: 'ReplayHelper-Initiated'}, '*');
		}
	}
	static #getColor(index, total){
		let hue = ((total ? index/total : index)+.5)%1;
		let saturation = 0.5;
		let lightness = 0.5;
		let _q = lightness < 0.5 ? lightness * (1 + saturation) : lightness + saturation - lightness * saturation;
		let _p = 2 * lightness - _q;
		function hue2rgb(_p, _q, _t){
			if(_t < 0){_t += 1;}
			if(_t > 1){_t -= 1;}
			if(_t < 1/6.0){return _p + (_q - _p) * 6 * _t;}
			if(_t < 1/2.0){return _q;}
			if(_t < 2/3.0){return _p + (_q - _p) * (2/3.0 - _t) * 6;}
			return _p;
		}
		let returnObject = {
			hue, saturation, lightness,
			R: hue2rgb(_p, _q, hue + 1/3.0),
			G: hue2rgb(_p, _q, hue),
			B: hue2rgb(_p, _q, hue - 1/3.0)
		}
		let red = Math.round(256*returnObject.R).toString(16);
		if(red.length === 1){
			red = '0'+red;
		}
		let green = Math.round(256*returnObject.G).toString(16);
		if(green.length === 1){
			green = '0'+green;
		}
		let blue = Math.round(256*returnObject.B).toString(16);
		if(blue.length === 1){
			blue = '0'+blue;
		}
		returnObject.RGB = '#'+red+green+blue
		return returnObject;
	}
	static #getTeamColor(team){
		let teamIndex = ReplayHelper.#replay.arenaResult.teams.findIndex(t=>t===team);
		return ReplayHelper.#getColor(teamIndex, ReplayHelper.#replay.arenaResult.teams.length);
	}
	static #getMemberColor(member){
		let teamIndex = ReplayHelper.#replay.arenaResult.teams.findIndex(t => t.members.includes(member));
		let team = ReplayHelper.#replay.arenaResult.teams[teamIndex].members.sort((a,b)=>a.name.localeCompare(b.name));
		let teamColorWidth = 1/ReplayHelper.#replay.arenaResult.teams.length;
		let teamColorSpace = teamColorWidth * teamIndex;
		let memberColorWidth;
		let memberColor;
		let offset = 0;
		if(teamColorWidth === 1){
			memberColorWidth = teamColorWidth/(team.length);
			memberColor = team.findIndex(m => m === member);
		}else{
			memberColorWidth = teamColorWidth/(team.length + 1);
			memberColor = team.findIndex(m => m === member) + 1;
			offset = -teamColorWidth/2;
		}
		return ReplayHelper.#getColor(teamColorSpace + memberColorWidth*memberColor + offset);
	}
}
ReplayHelper.preInit();
