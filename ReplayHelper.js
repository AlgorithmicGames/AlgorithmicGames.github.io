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
					class Log{
						#log;
						constructor(log){
							this.#log = log;
						}
						get(index){
							if(index < 0){
								return this.#log[this.#log.length - index];
							}else{
								return this.#log[index];
							}
						}
						filter(condition=log=>true){
							return this.#log.map(l => {
								const log = typeof l == 'string' ? JSON.parse(l) : l;
								if(condition(log)){
									return log;
								}
							}).filter(log => log !== undefined);
						}
					}
					class ArenaResult{
						constructor(settings={}){
							for(const key in settings){
								if(Object.hasOwnProperty.call(settings, key)){
									if(key === 'matchLogs'){
										settings[key].forEach(matchLog => matchLog.log = new Log(matchLog.log));
									}
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
	static #hslToRgb(hue, saturation, lightness){
		let _q = lightness < 0.5 ? lightness * (1 + saturation) : lightness + saturation - lightness * saturation;
		let _p = 2 * lightness - _q;
		function hueToRGB(_p, _q, _t){
			if(_t < 0){_t += 1;}
			if(_t > 1){_t -= 1;}
			if(_t < 1/6.0){return _p + (_q - _p) * 6 * _t;}
			if(_t < 1/2.0){return _q;}
			if(_t < 2/3.0){return _p + (_q - _p) * (2/3.0 - _t) * 6;}
			return _p;
		}
		return {
			R: hueToRGB(_p, _q, hue + 1/3.0),
			G: hueToRGB(_p, _q, hue),
			B: hueToRGB(_p, _q, hue - 1/3.0)
		};
	}
	static #getColor(index, total){
		let offset = total%1 ? 0.5 : 2/3;
		let hue = ((total ? index/total : index)+offset)%1;
		let saturation = 1;
		let lightness = 0.5;
		let returnObject = {
			hue,
			saturation,
			lightness,
			...ReplayHelper.#hslToRgb(hue, saturation, lightness)
		}
		let red = Math.round(255*returnObject.R).toString(16);
		if(red.length === 1){
			red = '0'+red;
		}
		let green = Math.round(255*returnObject.G).toString(16);
		if(green.length === 1){
			green = '0'+green;
		}
		let blue = Math.round(255*returnObject.B).toString(16);
		if(blue.length === 1){
			blue = '0'+blue;
		}
		returnObject.RGB = '#'+red+green+blue
		return returnObject;
	}
	static #getTeamColor(team){
		let teamIndex = ReplayHelper.#replay.arenaResult.teams.findIndex(t=>t===team);
		let teams = ReplayHelper.#replay.arenaResult.teams.length;
		let onlySingleTeams = ReplayHelper.#replay.arenaResult.teams.filter(t => t.members.length === 1).length === teams;
		if(teamIndex === 1 && teams === 2 && onlySingleTeams){ // Red vs Blue
			teamIndex = 1;
			teams = 3;
		}
		return ReplayHelper.#getColor(teamIndex, teams);
	}
	static #getMemberColor(member){
		let teamIndex = ReplayHelper.#replay.arenaResult.teams.findIndex(t => t.members.includes(member));
		let team = ReplayHelper.#replay.arenaResult.teams[teamIndex].members;
		let teams = ReplayHelper.#replay.arenaResult.teams.length;
		let onlySingleTeams = ReplayHelper.#replay.arenaResult.teams.filter(t => t.members.length === 1).length === teams;
		let teamColorWidth = 1/teams;
		let teamColorSpace = teamColorWidth * teamIndex;
		let memberColorWidth;
		let memberIndex;
		let offset = 0;
		if(teamColorWidth === 1){
			memberColorWidth = teamColorWidth/(team.length);
			memberIndex = team.findIndex(m => m === member);
		}else{
			memberColorWidth = teamColorWidth/(team.length + 1);
			memberIndex = team.findIndex(m => m === member) + 1;
			offset = -teamColorWidth/2;
		}
		let isSecondOfTwoTeamsWithOneMemberEach = teamIndex === 1 && ReplayHelper.#replay.arenaResult.teams.length === 2 && onlySingleTeams;
		let isSecondMemberOfTeamWithTwoMembers = memberIndex === 1 && ReplayHelper.#replay.arenaResult.teams.length === 1 && ReplayHelper.#replay.arenaResult.teams[0].members.length === 2;
		if(isSecondOfTwoTeamsWithOneMemberEach || isSecondMemberOfTeamWithTwoMembers){ // Red vs Blue
			offset = isSecondOfTwoTeamsWithOneMemberEach ? 3.5/6 : 5/6;
		}
		return ReplayHelper.#getColor(teamColorSpace + memberColorWidth*memberIndex + offset);
	}
}
ReplayHelper.preInit();
