'use strict'
importScripts('https://unpkg.com/dexie@3.0.3/dist/dexie.min.js');

let _dexieReplays = new Dexie('Replays');
_dexieReplays.version(2).stores({
	records: '++id,name,defaultName,arena,stored',
	data: '++id,&record_id,data',
	settings: '++id,&name,value'
});
_dexieReplays.open();
function calculateDefaultName(replayData, stored){
	let scores = [];
	let hasScore = replayData.body.matchLogs.filter(d => d.scores);
	if(hasScore.length){
		replayData.body.matchLogs.forEach(match=>{
			scores.push(match.scores.map(s => s.score).join('-'));
		})
	}
	let defaultName = new Date(stored).toLocaleString()+' '+replayData.body.teams.map(t => t.members.join(', ')).join(' vs. ');
	if(scores.length){
		defaultName += ' ('+scores.join(', ')+')';
	}
	return defaultName;
}
function getSetting(name){
	return _dexieReplays.settings.get({name: name}).then(s => s ? s.value : null);
}
function setSetting(name, value){
	return _dexieReplays.settings.get({name: name}).then(s => s ? _dexieReplays.settings.update(s.id, value) : _dexieReplays.settings.put({name: name, value: value}));
}
function answer(data){
	postMessage({result: data})
}
let _pendingQuery;
function guiQuery(type, message){
	postMessage({query: {type: type, message: message}});
	return new Promise(resolve => _pendingQuery = resolve);
}
let callbacks = {
	addReplayToStorage: async(replay)=>{
		async function store(){
			let now = JSON.parse(JSON.stringify(new Date()));
			await _dexieReplays.transaction('rw', _dexieReplays.records, _dexieReplays.data, async()=>{
				_dexieReplays.records.put({
					stored: now,
					defaultName: calculateDefaultName(replay, now),
					arena: replay.body.arena.full_name
				}).then(id => {
					_dexieReplays.data.put({record_id: id, data: replay});
					answer(id);
				});
			});
		}
		let replayString = JSON.stringify(replay);
		let compareStringWithoutID;
		let compareStringWithoutMeta;
		(()=>{
			let clone = JSON.parse(replayString);
			if(clone.header && clone.header.id){
				delete clone.header.id;
			}
			compareStringWithoutID = JSON.stringify(clone);
			if(clone.header && clone.header.meta){
				delete clone.header.meta;
			}
			compareStringWithoutMeta = JSON.stringify(clone);
		})();
		let array = await _dexieReplays.data.toArray();
		const existingReplays = [];
		const registry = new FinalizationRegistry(resolve => {resolve()});
		for(let i = 0; i < array.length; i++){
			const d = array[i];
			const dataClone = JSON.parse(JSON.stringify(d.data));
			if(dataClone.header && dataClone.header.meta){
				delete dataClone.header.meta;
			}
			if(dataClone.header && dataClone.header.id){
				delete dataClone.header.id;
			}
			if(JSON.stringify(dataClone) === compareStringWithoutMeta){
				existingReplays.push(d);
			}
			// Sleep
			let resolve;
			new Promise(r => resolve = r).then(()=>new Promise(r => setTimeout(r, 1000)));
			registry.register(dataClone, resolve);
		}
		let exactReplay = existingReplays.find(o => {
			let clone = JSON.parse(JSON.stringify(o.data));
			if(clone.header && clone.header.id){
				delete clone.header.id;
			}
			return JSON.stringify(clone) === compareStringWithoutID;
		});
		if(exactReplay){
			answer(exactReplay.id);
		}else{
			if(existingReplays.length){
				let settingKey = 'addReplayToStorage() add replay with new meta';
				let otherMeta = existingReplays.filter(o => JSON.stringify(o.data) !== replayString);
				let doStore = !otherMeta.length;
				let newMeta = !doStore;
				let choice = await getSetting(settingKey);
				if(newMeta){
					if(choice !== null){
						doStore = choice;
					}else{
						let promises = [];
						otherMeta.forEach(d => promises.push(_dexieReplays.records.get({id: d.id}).then(r => r.name ?? r.defaultName)));
						let names = (await Promise.allSettled(promises)).map(r => r.value);
						doStore = await guiQuery('confirm', 'Another replay(s) with the same outcome but with different metadata is already stored (see below). Do you want to store this replay as well?\n'+names.sort().join('\n'));
						if(await guiQuery('confirm', 'Remember choice? '+(doStore ? '(Do store)' : '(Do not store)'))){
							await setSetting(settingKey, doStore);
						}
					}
				}
				if(doStore){
					await store();
				}
			}else{
				await store();
			}
		}
	},
	getStoredReplays: async()=>{
		answer(await _dexieReplays.records.toArray());
	},
	getStoredReplayData: async(id)=>{
		id = parseInt(id);
		if(isNaN(id)){
			throw new Error('Parameter `id` is not a number');
		}
		await _dexieReplays.transaction('rw', _dexieReplays.records, _dexieReplays.data, async()=>{
			let replayData = await _dexieReplays.data.get({record_id: id});
			_dexieReplays.records.get({id: id}).then(record => _dexieReplays.records.update(id, {defaultName: calculateDefaultName(replayData.data, record.stored)}));
			answer(replayData.data);
		});
	},
	renameStoredReplay: async(data)=>{
		if(isNaN(data.id)){
			throw new Error('Parameter `id` is not a number');
		}
		await _dexieReplays.records.update(data.id, {name: data.name});
	},
	deleteStoredReplay: async(id)=>{
		id = parseInt(id);
		if(isNaN(id)){
			throw new Error('Parameter `id` is not a number');
		}
		await _dexieReplays.transaction('rw', _dexieReplays.records, _dexieReplays.data, async()=>{
			await _dexieReplays.data.get({record_id: id}).then(data => {
				_dexieReplays.records.delete(id);
				_dexieReplays.data.delete(data.id);
			});
		});
	},
	removeAllStoredReplays: async()=>{
		await _dexieReplays.transaction('rw', _dexieReplays.records, _dexieReplays.data, async()=>{
			await _dexieReplays.delete();
		});
	}
}
for(const key in callbacks){
	if(Object.hasOwnProperty.call(callbacks, key)){
		if(callbacks[key].constructor.name !== 'AsyncFunction'){
			throw new Error('Callback "'+key+'" is not a `async`.');
		}
	}
}
onmessage = m => {
	if(_pendingQuery){
		_pendingQuery(m.data);
		_pendingQuery = null;
	}else{
		callbacks[m.data.operation](m.data.data).catch(err => console.error(err)).finally(()=>{postMessage(null);close();})
	}
};
