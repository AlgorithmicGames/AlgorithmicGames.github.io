import styles from './Content.module.css'
import { createSignal } from 'solid-js'
import solidLogo from '../assets/solid.svg'
import viteLogo from '../assets/vite.svg'

export default function Content() {
	const [count, setCount] = createSignal(0)

	return (<div id={styles.root}>
		<div>
			<a href="https://vite.dev" target="_blank">
				<img src={viteLogo} class={styles.logo} alt="Vite logo" />
			</a>
			<a href="https://solidjs.com" target="_blank">
				<img src={solidLogo} class={`${styles.logo} ${styles.solid}`} alt="Solid logo" />
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
	</div>)
}
