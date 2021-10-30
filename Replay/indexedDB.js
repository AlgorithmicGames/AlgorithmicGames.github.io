'use strict'
importScripts('https://unpkg.com/dexie@3.0.3/dist/dexie.min.js');

let _dexieReplays = new Dexie('replays');
_dexieReplays.version(1).stores({
	records: '++id,name,defaultName,arena,stored',
	data: '++id,&record_id,data'
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
let callbacks = {
	addReplayToStorage: async(replay)=>{
		let replayString = JSON.stringify(replay);
		let array = await _dexieReplays.data.toArray();
		if(!array.find(o => JSON.stringify(o.data) === replayString)){
			let now = Date.now();
			await _dexieReplays.transaction('rw', _dexieReplays.records, _dexieReplays.data, async()=>{
				_dexieReplays.records.put({
					stored: now,
					defaultName: calculateDefaultName(replay, now),
					arena: replay.body.arena.full_name
				}).then(id => _dexieReplays.data.put({
					record_id: id,
					data: replay
				}));
			});
		}
	},
	getStoredReplays: async()=>{
		postMessage(await _dexieReplays.records.toArray());
	},
	getStoredReplayData: async(id)=>{
		await _dexieReplays.transaction('rw', _dexieReplays.records, _dexieReplays.data, async()=>{
			let replayData = await _dexieReplays.data.get({record_id: id});
			_dexieReplays.records.get({id: id}).then(record => _dexieReplays.records.update(id, {defaultName: calculateDefaultName(replayData.data, record.stored)}));
			postMessage(replayData.data);
		});
	},
	renameStoredReplay: async(data)=>{
		await _dexieReplays.records.update(data.id, {name: data.name});
	},
	deleteStoredReplay: async(id)=>{
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
onmessage = m => callbacks[m.data.operation](m.data.data).catch(err => console.error(err)).finally(()=>{postMessage(null);close();});
