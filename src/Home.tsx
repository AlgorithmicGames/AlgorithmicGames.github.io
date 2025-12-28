import styles from './Home.module.css'
import { createSignal, Show } from 'solid-js'
import solidLogo from './assets/solid.svg'
import viteLogo from './assets/vite.svg'
import { useParams } from '@solidjs/router'
export default function Home() {
	const [count, setCount] = createSignal(0)
	const params = useParams()

	return (
		<div id={styles.root}>
			<Show when={params.pageNotfound}>
				<h1>PageNotFound: {params.pageNotfound}</h1>
			</Show>
			<div>
				<a href='https://vite.dev' target='_blank'>
					<img src={viteLogo} class={styles.logo} alt='Vite logo' />
				</a>
				<a href='https://solidjs.com' target='_blank'>
					<img src={solidLogo} class={`${styles.logo} ${styles.solid}`} alt='Solid logo' />
				</a>
			</div>
			<h1>Vite + Solid</h1>
			<div class={styles.card}>
				<button type='button' onClick={() => setCount((count) => count + 1)}>
					count is {count()}
				</button>
				<p>
					Edit <code>src/App.tsx</code> and save to test HMR
				</p>
			</div>
			<p class={styles.readTheDocs}>
				Click on the Vite and Solid logos to learn more
			</p>
		</div>
	)
}
