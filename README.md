<!-- Keep in sync [START] -->
<!-- https://github.com/AI-Tournaments/.github/blob/main/profile/README.md -->
<!-- https://github.com/AI-Tournaments/AI-Tournaments.github.io/blob/main/README.md -->
# AI-Tournaments
[AI-Tournaments](https://ai-tournaments.github.io/) is about match making between algorithms. Users can make their own participates to compete in any of the existing arenas, or make their own custom arena and challenge other users to join. <!-- Keep in sync with social platforms: LinkedIn -->

AI-Tournaments in an early prototype stage. See the section [Participate](#Participate) if you want to join a arena, then analyze how other have solved the arena until better documentation has been written.
## Community
Join the official [GitHub](https://github.com/orgs/AI-Tournaments/discussions/) or [Discord](https://discord.gg/jhUJNsN) community. Please read and follow the [community guide lines](https://ai-tournaments.github.io/Community/Guidelines/).
<br>[![Discord banner2](https://discord.com/api/guilds/765291928454823936/widget.png?style=banner2)](https://discord.gg/jhUJNsN)
<!-- Keep in sync [END] -->

## Participate
To participate in a Arena you need to [create a GitHub repository](https://github.com/AI-Tournaments/Participant-Template) and apply three topics: `AI-Tournaments`, `AI-Tournaments-Participant` and the full repository name of the arena (`ExampleAuthor--ExampleArena`). The repository also has to have a file in root called `participant.js`, this is the file that will be called to the arena. The repository's name will represent the participants name, except if it starts with `AI-Tournaments-Participant-` then that part is omitted.
### Develop environment
<i>For both developing arenas and participants.</i><br>
In [Local development setups](https://ai-tournaments.github.io/Dev/) you can add the URLs to arena (`arena.js` along with the arenas replay page) and participants to test with before publishing them in GitHub.

<b>Explanation</b>
| Key | Description | Example |
| --- | --- | --- |
| arena.url | URL to a arena.<br>⚠️ Do not include `arena.js`. | `"http://127.0.0.1:8080/Community-Arena/"` or `"https://raw.githubusercontent.com/AI-Tournaments/Worm-Arena/main/"` |
| arena.name<br><i>Optional</i> | Displayed name.<br>Name defaults to URL if left empty. | `"New-Community-Arena"` |
| arena.replay | URL to replay view. | `"http://127.0.0.1:8080/Community-Arena-Replay/"` |
| arena.settings<br><i>Optional</i> | Prefigured settings. | `{"general":{"seed":"example"}}` |
| participants | Adds participants.<br>Array with either a url string to script or a JSON object per participant. | `["http://127.0.0.1:8080/Community-Arena-Test-Participants/participant-1.js",{"url":"http://127.0.0.1:8080/Community-Arena-Test-Participants/participant-2.js","name":"Temp-Participant","team":1}]` |

The development environment also includes some extra dials and features to help with quality assurance.

#### Participant
Participant's URLs can be written in different forms. An _ordinary_ URL is interpreted in the default sealed sandbox, but URLs that starts with a question mark (`?`) is executed as plain javascript and can be debugged by the javascript [`debugger`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/debugger) command.
#### Interface
If you need more freedom for debugging or training a neural network you can use an Interface, which's URLs starts with a exclamation mark (`!`). The main difference between an [Interface](https://github.com/AI-Tournaments/Interface-Template) and a [Participant](https://github.com/AI-Tournaments/Participant-Template) is that interfaces opens up as a web page and sidestep all participant restrictions. The main use case for interfaces is to debug or train participants and to get a better insight during a running match. But interfaces can also be used to allow Human vs Participant and even Human vs Human matches.

## File header
The `arena.js` and `participant.js` optional file header has to be valid Json otherwise it is omitted. The header can be placed anywhere in the file, but at the top is recommended as a standardization.
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
To load libraries like jQuery and others, put the files in the repository and add them to the file header. The files had to be referenced locally. The sources are imported assigned order.
``` JavaScript
/**{
	"dependencies": [
		"exampleLib.js",
		"other/exampleLib.js"
	]
}**/
```
<!-- TODO: Rewrite/uncomment when modules are a thing.
#### Dependencies vs modules
Modules are loaded before dependencies, but other than that there is no difference for arena.js. The arena can define modules that is always loaded and available to participants. -->
## Special thanks
- engine262<br>
AI-Tournaments uses [engine262](https://github.com/engine262/engine262) spearheaded by [snek](https://github.com/devsnek) for executing participants deterministically.
- JSON Editor<br>
AI-Tournaments uses [JSON Editor](https://github.com/josdejong/jsoneditor/) by [Jos de Jong](https://github.com/josdejong), powered by [Ace (Ajax.org Cloud9 Editor)](https://github.com/ajaxorg/ace/) and [Ajv JSON schema validator](https://github.com/ajv-validator/ajv/), for editing, rendering and validating JSON.
- seedrandom<br>
AI-Tournaments uses [seedrandom](https://github.com/davidbau/seedrandom) by [David Bau](https://github.com/davidbau) for overriding `Math.random()` to generate repeatable numbers.
- Supabase<br>
AI-Tournaments uses Edge Functions by [Supabase](https://github.com/supabase/supabase) for serverless [backend](https://github.com/AI-Tournaments/Backend).

<!-- Keep in sync [START] -->
<!-- https://github.com/AI-Tournaments/.github/blob/main/profile/README.md -->
<!-- https://github.com/AI-Tournaments/AI-Tournaments.github.io/blob/main/README.md -->
## Why Source Available?
[AI-Tournaments](https://github.com/AI-Tournaments) is not Open Source by the [Open Source Initiative's definition](https://opensource.org/docs/osd) but rather [Source Available](https://en.wikipedia.org/wiki/Source-available_software), except were a license that says otherwise is in place.
### User written JavaScript
AI-Tournaments executes user written JavaScripts in the web browser, which is usually seen as a security concern ([Cross-site scripting](https://en.wikipedia.org/wiki/Cross-site_scripting)). But the scripts are loaded into a sandbox IFrame and Web Worker to prevent just that. But the concern still remain and that's a fact that should not be hidden, that is why it is instead addressed and displayed publicly here.

But if you do find a way to break out of the sandbox and access client data or other participant scripts, please do [report it](https://github.com/AI-Tournaments/AI-Tournaments.github.io/issues/new?title=%5Bsecurity-hole%5D%20_Short_description_&body=How%20to%20reproduce:%0A1.%20First...%0A2.%20Then...)! Reporters of confirmed security holes will get a [honorable mention](https://ai-tournaments.github.io/Community/HonorableMentions/) once the hole is fixed.
### Scheduled server hosted events
A server-side events with official match results is planned, but until then client-side execution is the only way to run the arenas.
Note that [interfaces](#Interfaces) will not be able or allowed to compete.
### Arenas
The source code for AI-Tournament's [arena executor](https://github.com/AI-Tournaments/Arena-Manager) and the official arenas are available in order to make it easier to examen the "rules" and come up with optimal strategies. You are basically allowed to do what ever as long as it isn't commercial matches.
### Allowed examples
Download code from AI-Tournaments to ...
- Develop, troubleshooting or train an AI.
- Writing and recording dev-diary or tutorial.
- Have your own internal uncommercial tournaments.
- Scientific research.
  - Please do tell if something is published! 😃
- Basically anything that gives something back to the community.
### Disallowed examples
- Removing all links and references to AI-Tournaments.
- Setup a commercial competitor to AI-Tournaments.

If you have any doubts, you can [request permission here](https://github.com/AI-Tournaments/AI-Tournaments.github.io/issues/new?title=%5Bpermission-request%5D%20_Short_description_&body=Am%20I%20allowed%20to...%20?).
<!-- Keep in sync [END] -->
