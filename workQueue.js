'use strict'
if(typeof window !== 'undefined'){
	window.queue = async function(callback=()=>{}){
		let resolveQueue;
		const awaitQueue = new Promise(r => resolveQueue = r);
		const workQueue = new SharedWorker('/workQueue.js');
		function queueHeartbeat(){
			if(callback()){
				workQueue.port.postMessage(true);
				setTimeout(queueHeartbeat, 1000);
			}else{
				workQueue.port.postMessage(null);
			}
		}
		workQueue.port.onmessage = ()=>resolveQueue();
		setTimeout(queueHeartbeat, 1000);
		await awaitQueue;
	}
}else{
	let _callbackQueue = Promise.resolve();
	let queueSize = 0;
	let counter = 0;
	onconnect = messageEvent => {
		const ID = counter++;
		const threshold = 60000;
		console.log('Queue+ ('+ID+')', ++queueSize);
		let beat = 0;
		async function checkAlive(callback){
			const heartbeat = callback.alive + threshold - Date.now();
			if(0 < heartbeat){
				console.debug('Heartbeat ('+ID+', '+(++beat)+')', heartbeat/1000);
				setTimeout(checkAlive, 1000, callback);
			}else{
				await new Promise(r => setTimeout(r, 1000));
				callback.resolve();
			}
		}
		let resolve;
		const life = new Promise(r => resolve = r);
		const queue = _callbackQueue;
		_callbackQueue = _callbackQueue.then(async ()=>{
			await queue;
			port.postMessage(null);
			await life;
			console.log('Queue- ('+ID+')', --queueSize);
		});
		const port = messageEvent.ports[0];
		const callback = {
			ID,
			resolve,
			alive: Date.now()
		}
		port.onmessage = m=>{
			callback.alive = m.data ? Date.now() : 0;
		}
		setTimeout(checkAlive, 1000, callback);
	};
}
