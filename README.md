# AI-Tournaments
AI Tournaments is still in an early prototype stage. See the section on [`Participate`](#Participate) if you want to join a arena, then analyze how other have solved the arena until better documentation has been written. The name of the repository will be the name used in the arena, except if it starts with `AI-Tournaments-Participant-` then that part is removed.

Click image below to join the official Discord community.
<br>[![Discord banner2](https://discord.com/api/guilds/765291928454823936/widget.png?style=banner2)](https://discord.gg/jhUJNsN)

## Participate
To participate in a Arena you need to [create a GitHub repository](https://github.com/AI-Tournaments/Participant-Template) and add three topics: `AI-Tournaments`, `AI-Tournaments-Participant` and the full repository name of the arena (`UserAuthor--ExampleArena`). The created repository also has to have a file in root called `participant.js`, this is the file that will be called to the arena.
### Develop environment
If you want to test your participant without publicly uploading it to GitHub you can placing it on a webserver and then go to [AI-Tournaments/Arena/](https://ai-tournaments.github.io/AI-Tournaments/Arena/), select an arena and add your participant by running the following command `addParticipant('url.to/your/participant.js','Optional name')` in the browser's JavaScript console. You can use the JavaScript keyword `debugger;` to help you find your script faster, just remember to remove it once you upload the code. You can add `debugger;` to first line (or second if you use `'use strict'`) and then add your breakpoint the normal way where you need them once your script popup. You will also need to raise the Arena-setting `timelimit_ms`, otherwise your participant will probably get disqualified because it didn't answer fast enough.
#### Advanced
If you need more insight and maybe even add some debug logs to the Arena you can download the `arena.js`, add it to a webserver and then spawn a [Web Worker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers#Spawning_a_dedicated_worker) with the arena file and [post a message](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers#Sending_messages_to_and_from_a_dedicated_worker) matching [Participants.js](https://github.com/AI-Tournaments/AI-Tournaments/blob/master/Arena/Participants.js)' constructor.
## Community arena
### Testing
Configure testing environment at [AI-Tournaments/Dev/](https://ai-tournaments.github.io/AI-Tournaments/Dev/).
| Key | Description | Example |
| --- | --- | --- |
| arena.url | URL to a arena. | `"http://127.0.0.1:8080/Community-Arena/"` |
| arena.name | Replaces URL as displayed name. | `"New-Community-Arena"` |
| arena.replay | URL to replay view. | `"http://127.0.0.1:8080/Community-Arena-Replay/"` |
| arena.settings | Prefigured settings. | `{"general":{"seed":"example"}}` |
| participants | Adds extra participants. | `["http://127.0.0.1:8080/Community-Arena-Test-Participants/participant-1.js",{"url":"http://127.0.0.1:8080/Community-Arena-Test-Participants/participant-2.js","name":"Temp-Participant","team":1}]` |

Field `participants` can be either a url string to a script or a JSON object.
Alternatively it is possible to call the `addArena` function manually in the browser's JavaScript console at [AI-Tournaments/Arena/](https://ai-tournaments.github.io/AI-Tournaments/Arena/).
``` JavaScript
/* Example */
addArena({arena:"http://127.0.0.1:8080/Community-Arena/",name:"New-Community-Arena",replay:"http://127.0.0.1:8080/Community-Arena-Replay/",participants:["http://127.0.0.1:8080/Community-Arena-Test-Participants/participant-1.js",{url:"http://127.0.0.1:8080/Community-Arena-Test-Participants/participant-2.js",name:"Temp-Participant",team:1}]});
```
## File header
The file header has to be valid Json otherwise it is omitted. The file header can be placed anywhere in the file, but at the top is preferred.
``` JavaScript
/**
{}
**/
```
``` JavaScript
/**{}**/
```
``` JavaScript
/**{
	"example": true
}**/
```
### Dependencies
To load libraries like jQuery and others, put the files in the repository and add them to the file header. The files had to be referenced locally. They are loaded in assigned order.
``` JavaScript
/**
{
	"dependencies": [
		"exampleLib.js",
		"other/exampleLib.js"
	]
}
**/
```
#### Dependencies vs modules
--- TODO: Rewrite later. ---<br>
Modules are loaded before dependencies, but other than that there is no real difference for arena.js. The arena can define modules that is always loaded and available to participants.
## Special thanks
- JSON Editor<br>
AI-Tournaments uses [JSON Editor](https://github.com/josdejong/jsoneditor/) by [Jos de Jong](https://github.com/josdejong), powered by [Ace (Ajax.org Cloud9 Editor)](https://github.com/ajaxorg/ace/) and [Ajv JSON schema validator](https://github.com/ajv-validator/ajv/), for editing, rendering and validating JSON.
- JS-Interpreter<br>
AI-Tournaments uses [JS-Interpreter](https://github.com/NeilFraser/JS-Interpreter) by [Neil Fraser](https://github.com/NeilFraser) for executing participants deterministically.
- seedrandom<br>
AI-Tournaments uses [seedrandom](https://github.com/davidbau/seedrandom) by [David Bau](https://github.com/davidbau) for overriding `Math.random()` to generate repeatable numbers.
- Supabase<br>
AI-Tournaments uses Edge Functions by [Supabase](https://github.com/supabase/supabase) for serverless [backend](https://github.com/AI-Tournaments/Backend).

## Why Source Available?
[AI-Tournaments](https://github.com/AI-Tournaments) is not Open Source by the [Open Source Initiative's definition](https://opensource.org/docs/osd) but rather [Source Available](https://en.wikipedia.org/wiki/Source-available_software), except were a license that says otherwise is in place.
### User written JavaScript
AI-Tournaments executes user written JavaScripts in the web browser, which is usually seen as a security concern ([Cross-site scripting](https://en.wikipedia.org/wiki/Cross-site_scripting)). Therefor the scripts are loaded into a sandbox IFrame and Web Worker to prevent just that. But the concern still remain and that's a fact that should not be hidden, that is why it is instead addressed and displayed publicly.

If you do find a way to break out of the sandbox and access client data or other participant scripts, please [report it](https://github.com/AI-Tournaments/AI-Tournaments/issues/new?title=%5Bsecurity-hole%5D%20_Short_description_&body=How%20to%20reproduce:%0A1.%20First...%0A2.%20Then...)! Reporters of confirmed security holes will get a honorable mention here once the hole is fixed.
### Backend
A server-side version with official match results is planned, but until then client-side execution is the only way to run the arenas.
### Arenas
The source code for the arenas are available in order to make it easier to examen the "rules" and come up with optimal strategies. Basically you are allowed to do what ever as long as it isn't commercial matches. If you have any doubts, you can [request permission here](https://github.com/AI-Tournaments/AI-Tournaments/issues/new?title=%5Bpermission-request%5D%20_Short_description_&body=Am%20I%20allowed%20to...%20?).
### Allowed examples
Download code from AI-Tournaments to ...
* Develop, troubleshooting or train an AI.
* Writing or recording a dev-diary or tutorial.
* Have your own uncommercial tournaments.
* And basically anything that gives something back to the community.
### Disallowed examples
* Removing all links to AI-Tournaments.
* Setup a commercial competitor to AI-Tournaments.
