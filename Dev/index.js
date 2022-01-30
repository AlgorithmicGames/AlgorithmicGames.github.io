'use strict'
function a(){
	let _editor;
	if(true){
		let defaultSetup = {
			active: false,
			comment: '',
			arena: {
				url: '',
				name: '',
				replay: '',
				settings: {}
			},
			participants: []
		};
		_editor = new JSONEditor(document.getElementById('editor'), {
			'modes': ['tree', 'code'],
			'name': 'Setups',
			'onChange': ()=>{
				_editor.validate().then(errors => {
					if(!errors.length){
						localStorage.setItem('LocalDevelopment.Setups', _editor.getText())
					}
				});
			},
			'onModeChange': (newMode, oldMode)=>{
				if(oldMode){
					localStorage.setItem('LocalDevelopment.Mode', newMode);
				}
			},
			'onValidate': array => {
				function isUrl(string){
					let url;
					try{
						url = new URL(string);
					}catch(e){
						return false;
					}
					return url.protocol === 'http:' || url.protocol === 'https:';
				}
				let errors = [];
				if(Array.isArray(array)){
					let actives = array.filter(json => json.active).length;
					array.forEach((json, index_0) => {
						if(1 < actives && json.active){
							errors.push({
								path: [index_0],
								message: 'Only one object can be "active" at once.'
							});
						}
						if(json.arena){
							if(!isUrl(json.arena.url)){
								errors.push({
									path: [index_0, 'arena', 'url'],
									message: 'Property "url" is not a URL.'
								});
							}
							if(!isUrl(json.arena.replay)){
								errors.push({
									path: [index_0, 'arena', 'replay'],
									message: 'Property "replay" is not a URL.'
								});
							}
						}
						if(Array.isArray(json.participants)){
							json.participants.forEach((participant, index_1) => {
								if(typeof participant === 'object'){
									if(!isUrl(participant.url)){
										errors.push({
											path: [index_0, 'participants', index_1, 'url'],
											message: 'Property "url" is not a URL.'
										});
									}
								}else{
									if(!isUrl(participant)){
										errors.push({
											path: [index_0, 'participants', index_1],
											message: 'String is not a URL.'
										});
									}
								}
							});
						}
					});
				}
				return errors;
			},
			templates: [
				{
					text: 'Test setup',
					title: 'Insert new setup',
					field: 'TestSetupTemplate',
					value: defaultSetup
				}
			]
		}, JSON.parse(localStorage.getItem('LocalDevelopment.Setups')) ?? [defaultSetup]);
	}
	fetch('/AI-Tournaments/schemaDefs.json').then(response => response.json()).then(schemaDefs => {
		_editor.setSchema({
			type: 'array',
			items: {
				type: 'object',
				required: ['active', 'arena', 'participants'],
				properties: {
					active: {type: 'boolean'},
					arena: {
						type: ['object', 'null'],
						properties: {
							url: {type: ['string']},
							name: {type: 'string'},
							replay: {type: 'string'},
							settings: {type: 'object'},
						}
					},
					participants: {
						type: 'array',
						items: {$ref: 'participant'}
					}
				}
			}
		}, schemaDefs);
	});
	let mode = localStorage.getItem('LocalDevelopment.Mode');
	if(mode){
		_editor.setMode(mode);
	}
}
