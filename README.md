# AI-Tournaments
AI Tournaments is still in an early prototype stage. See the section on [`Participate`](#Participate) if you want to join a arena, then analyze how other have solved the arena until better documentation has been written. The name of the repository will be the name used in the arena, except if it starts with `AI-Tournaments-Participant-` then that part is removed.

Click image below to join the Discord community.
<br>[![Discord banner2](https://discord.com/api/guilds/765291928454823936/widget.png?style=banner2)](https://discord.gg/jhUJNsN)

## Participate
To participate in a Arena you need to [create a GitHub repository](https://github.com/AI-Tournaments/Participant-Template) and add three topics: `AI-Tournaments`, `AI-Tournaments-Participant` and the full repository name of the arena (`UserAuthor--ExampleArena`). The created repository also has to have a file in root called `participant.js`, this is the file that will be called to the arena.
### Develop environment
If you want to test your participant without publicly uploading it to GitHub you can placing it on a webserver and then go to [AI-Tournaments/Arena/](https://ai-tournaments.github.io/AI-Tournaments/Arena/), select an arena and add your participant by running the following command `addParticipant('url.to/your/participant.js','Optional name')` in the browser's JavaScript console. You can use the JavaScript keyword `debugger;` to help you find your script faster, just remember to remove it once you upload the code. You can add `debugger;` to first line (or second if you use `'use strict'`) and then add your breakpoint the normal way where you need them once your script popup. You will also need to raise the Arena-setting `timelimit_ms`, otherwise your participant will probably get disqualified because it didn't answer fast enough. It is possible to append [?debug](https://ai-tournaments.github.io/AI-Tournaments/Arena/?debug) to the Arena URL to activate a breakpoint just before the `arena.js` is called.
#### Advanced
If you need more insight and maybe even add some debug logs to the Arena you can download the `arena.js`, add it to a webserver and then spawn a [Web Worker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers#Spawning_a_dedicated_worker) with the arena file and [post a message](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers#Sending_messages_to_and_from_a_dedicated_worker) matching [Participants.js](https://github.com/AI-Tournaments/AI-Tournaments/blob/master/Arena/Participants.js)' constructor.
## Community arena
### Testing
``` JavaScript
addArena('http://127.0.0.1:8080/Community-Arena/','New-Community-Arena','http://127.0.0.1:8080/Community-Arena-Replay/'/*, 'http://127.0.0.1:8080/Community-Arena-Test-Participants/participant.js', ['http://127.0.0.1:8080/Community-Arena-Test-Participants/participant-2.js', 'Temp-Participant'], ...*/);
```
## Special thanks
AI-Tournaments uses [seedrandom](https://github.com/davidbau/seedrandom) by [David Bau](https://github.com/davidbau) for overriding `Math.random()` to generate repeatable numbers.

## Why Source Available?
First of, [AI-Tournaments](https://github.com/AI-Tournaments) is _not_ Open Source by the [Open Source Initiative's definition](https://opensource.org/docs/osd) but rather [Source Available](https://en.wikipedia.org/wiki/Source-available_software), except were a MIT license is in place.
### User written JavaScript
AI-Tournaments executes user written JavaScripts in the web browser, which is usually seen as a security concern ([Cross-site scripting](https://en.wikipedia.org/wiki/Cross-site_scripting)). Therefor the scripts are loaded into a sandbox IFrame and Web Worker to prevent just that. But the concern still remain and that's a fact that should not be hidden, that is why it is instead addressed and displayed publicly.

If you do find a way to break out of the sandbox and access client data or other participant scripts, please [report it](https://github.com/AI-Tournaments/AI-Tournaments/issues/new?title=%5Bsecurity-hole%5D%20_Short_description_&body=How%20to%20reproduce:%0A1.%20First...%0A2.%20Then...)! Reporters of confirmed security holes will get a honorable mention here once the hole is fixed.
### Backend
A server-side version with official match results is planned, but until then client-side execution is the only way to run the arenas.
### Arenas
The source code for the arenas are available in order to make it easier to examen the "rules" and come up with optimal strategies. Basically you are allowed to do what ever as long as it isn't commercial matches. If you have any doubs, you can [request permission here](https://github.com/AI-Tournaments/AI-Tournaments/issues/new?title=%5Bpermission-request%5D%20_Short_description_&body=Am%20I%20allowed%20to...%20?).
### Allowed examples
Download code from AI-Tournaments to ...
* Develop, troubleshooting or train an AI.
* Writing or recording a dev-diary or tutorial.
* Have your own uncommercial tournaments.
* And basically anything that gives something back to the community.
### Disallowed examples
* Removing the links to AI-Tournaments.
* Setup a commercial competitor to AI-Tournaments.
