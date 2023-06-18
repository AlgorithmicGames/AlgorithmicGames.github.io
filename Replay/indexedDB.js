'use strict'
importScripts('https://unpkg.com/dexie@3.0.3/dist/dexie.min.js', 'https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js');

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
	_port.postMessage({result: data})
}
let _port;
let _pendingQuery;
function guiQuery(type, message){
	_port.postMessage({query: {type: type, message: message}});
	return new Promise(resolve => _pendingQuery = resolve);
}
let callbacks = {
	addReplayToStorage: async(replayString)=>{
		async function store(){
			const replay = JSON.parse(replayString);
			let now = structuredClone(new Date());
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
		let cloneWithoutID;
		let cloneWithoutMeta;
		(()=>{
			cloneWithoutID = JSON.parse(replayString);
			if(cloneWithoutID.header && cloneWithoutID.header.id){
				delete cloneWithoutID.header.id;
			}
			cloneWithoutMeta = structuredClone(cloneWithoutID);
			if(cloneWithoutMeta.header && cloneWithoutMeta.header.meta){
				delete cloneWithoutMeta.header.meta;
			}
		})();
		let array = await _dexieReplays.data.toArray();
		const existingReplays = [];
		let sleep;
		const registry = new FinalizationRegistry(() => sleep = new Promise(r=>setTimeout(r, 3000)));
		let queue = Promise.resolve();
		let sleepCounter = 0;
		console.log('Loop start', array.length);
		array.forEach(d => {
			queue = queue.then(async() => {
				if(sleep){
					console.log('// Sleep');
					await sleep;
					sleep = null;
					console.log('// Sleep over');
				}
				const dataClone = structuredClone(d.data);
				if(dataClone.header && dataClone.header.meta){
					delete dataClone.header.meta;
				}
				if(dataClone.header && dataClone.header.id){
					delete dataClone.header.id;
				}
				if(_.isEqual(dataClone, cloneWithoutMeta)){ // ⚠️ Out of memory here.
					existingReplays.push(d);
				}
				// Sleep
				if(sleepCounter++%10 === 0){
					console.debug('Loop sleep. Items left:', array.length-sleepCounter);
					await new Promise(r => setTimeout(r, 500)); // 👈 TEMP: Until a slow or memory safe JSON.stringify is found.
				}
				let resolve;
				new Promise(r => resolve = r);
				registry.register(dataClone, resolve);
			});
		});
		await queue;
		console.log('Loop finished');
		let exactReplay = existingReplays.find(o => {
			let clone = structuredClone(o.data);
			if(clone.header && clone.header.id){
				delete clone.header.id;
			}
			return _.isEqual(clone, cloneWithoutID);
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
let callbackQueue = Promise.resolve();
onconnect = async messageEvent => {
	_port = messageEvent.ports[0];
	_port.onmessage = async m => {
		if(_pendingQuery){
			_pendingQuery(m.data);
			_pendingQuery = null;
		}else{
			callbackQueue = callbackQueue.then(async ()=>{
				console.log('Start', m.data.operation);
				await (callbacks[m.data.operation])(m.data.data);
				console.log('Done', m.data.operation);
			}).catch(err => answer(err)).finally(()=>{_port.postMessage(null);});
		}
	}
};
