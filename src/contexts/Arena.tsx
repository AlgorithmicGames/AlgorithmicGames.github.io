import { createContext, createSignal, useContext } from 'solid-js'

type ArenaContextType = {
	arena: {
		author: string | 'AlgorithmicGames'
		name: string
	}
}

const ArenaContext = createContext()
export function getContext() {
	return useContext(ArenaContext)
}

export function ArenaContextProvider(props: any) {
	const [arena, setArenaSignal] = createSignal<ArenaContextType>({
		arena: {
			author: props.params.author || 'AlgorithmicGames',
			name: props.params.arena,
		},
	})

	const setArena = (author: string, name: string) => {
		setArenaSignal({
			...arena(),
			arena: {
				author: author,
				name: name,
			},
		})
	}

	return (
		<ArenaContext.Provider value={{ arena, setArena }}>
			{props.children}
		</ArenaContext.Provider>
	)
}
