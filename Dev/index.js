'use strict'
function a(){
	let _editor;
	(()=>{
		let defaultSetup = {
			active: false,
			comment: '',
			autoStart: false,
			rerunUntilError: false,
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
					let activeSetups = array.filter(setup => setup.active).length;
					array.forEach((setup, index_0) => {
						if(1 < activeSetups && setup.active){
							errors.push({
								path: [index_0],
								message: 'Only one setup can be active at once.'
							});
						}
						if(setup.arena){
							if(!isUrl(setup.arena.url)){
								errors.push({
									path: [index_0, 'arena', 'url'],
									message: 'Property "url" is not a URL.'
								});
							}
							if(!isUrl(setup.arena.replay)){
								errors.push({
									path: [index_0, 'arena', 'replay'],
									message: 'Property "replay" is not a URL.'
								});
							}
						}else if(setup.settings){
							errors.push({
								path: [index_0, 'settings'],
								message: 'Property "settings" requires "arena".'
							});
						}
						if(Array.isArray(setup.participants)){
							setup.participants.forEach((participant, index_1) => {
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
	})();
	fetch('/schemaDefs.json').then(response => response.json()).then(schemaDefs => {
		_editor.setSchema({
			type: 'array',
			items: {
				type: 'object',
				required: ['active', 'arena', 'participants', 'autoStart'],
				properties: {
					active: {type: 'boolean'},
					autoStart: {type: 'boolean'},
					rerunUntilError: {type: 'boolean'},
					arena: {
						type: ['object', 'null'],
						required: ["url", "replay"],
						properties: {
							url: {type: 'string'},
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
