import { useParams } from '@solidjs/router'

export default function Content() {
	const params = useParams()
	const author = params.author || 'AlgorithmicGames'
	const arena = params.arena

	return (<div>
		<h1>Arena: {author}/{arena}</h1>
	</div>)
}
