import { useParams } from '@solidjs/router'
import ParticipantSelector from './components/ParticipantSelector.tsx'
import ArenaConfiguration from './components/ArenaConfiguration.tsx'
import ArenaVisualizer from './components/ArenaVisualizer.tsx'
import ArenaSelector from './components/ArenaSelector.tsx'
import { ArenaContextProvider, getContext } from './contexts/Arena.tsx'

export default function Content() {
	return (
		<ArenaContextProvider params={useParams()}>
			<div>
				<ArenaSelector />
				<fieldset id='fieldset-arena-readme'>
					<legend class='clickable'>Readme</legend>
					<iframe id='arena-readme' sandbox='allow-same-origin'>README.md</iframe>
				</fieldset>
				<ParticipantSelector />
				<ArenaConfiguration />
				<ArenaVisualizer />
			</div>
		</ArenaContextProvider>
	)
}
