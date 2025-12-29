import { useParams } from '@solidjs/router'

function getAuthor() {
	return useParams().author || 'AlgorithmicGames'
}
function getArena() {
	return useParams().arena
}

export default function Content() {
	return (
		<div>
			<h1>Arena: {getAuthor()}/{getArena()}</h1>
		</div>
	)
}
