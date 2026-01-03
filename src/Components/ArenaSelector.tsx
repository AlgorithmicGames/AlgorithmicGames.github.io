import { useNavigate, useParams } from '@solidjs/router'
import GitHubService from '../GitHubService.tsx'
import { createAsyncOptions, Select } from '@thisbeyond/solid-select'
import styles from './ArenaSelector.module.css'
import SVG from '../components/SVG.tsx'
import { ArenaInfo } from '../types.tsx'
import { createSignal, Show } from 'solid-js'

export default function ArenaSelector() {
	const navigate = useNavigate()
	const params = useParams()
	const [initialValue, setInitialValue] = createSignal(params.author + '/' + params.arena)
	const arenaPromise = GitHubService.fetchArenas()
	const searchArenas = (inputValue: string): Promise<ArenaInfo[]> => {
		return arenaPromise.then((arenas) =>
			arenas.sort((a, b) => {
				if (a.official && !b.official) {
					return -1
				} else if (!a.official && b.official) {
					return 1
				} else {
					return b.stars - a.stars
				}
			}).filter((arena) => {
				return arena.name.toLowerCase().includes(inputValue.toLowerCase())
			})
		)
	}
	const props = createAsyncOptions(searchArenas, 0)

	function format(arena: ArenaInfo) {
		if (!(arena instanceof ArenaInfo)) {
			return arena
		}
		return (
			<div class={styles.arenaItem}>
				<span>{arena.full_name}</span>
				<Show when={arena.official}>
					<span class={styles.official}>(Official)</span>
				</Show>
				<span class={styles.stars}>{arena.stars}⭐</span>
			</div>
		)
	}

	function onChange(value: ArenaInfo) {
		if (value instanceof ArenaInfo) {
			navigate(`/Arena/${value.full_name}`)
		} else {
			setInitialValue(initialValue())
		}
	}

	return (
		<div>
			Arena:&nbsp;
			<Select class={styles.arenaSelector} name={styles.arenaSelector} {...props} format={format} initialValue={initialValue()} onChange={onChange} />
			&nbsp;<a class={styles.readmeLink} target='_blank'>
				<SVG key='github' />
			</a>&nbsp;
			<input type='checkbox' id='sort-by-stars' />&nbsp;
			<label for='sort-by-stars'>Sort by stars</label>
		</div>
	)
}
