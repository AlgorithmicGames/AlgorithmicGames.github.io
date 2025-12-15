import styles from './Header.module.css'
import githubLogo from '../assets/github.svg'
import discordLogo from '../assets/discord.svg'
import MenuItem from './MenuItem.tsx'
import LoginButton from './LoginButton.tsx'

export default function Header() {
	const headerTitle = 'Algorithmic Games';
	return (<>
		<header class={styles.root}>
			<div class={styles.headerTitle}>{headerTitle}</div>
			<MenuItem title="Announcements" href="https://github.com/orgs/AlgorithmicGames/discussions/categories/1-announcements" target="_blank"/>
			<MenuItem title="Arena"/>
			<MenuItem title="Replays"/>
			<MenuItem title="🚧Development🚧">
				<div>
					<b>Local development</b><br/>
					Automatic addition of local arena and participants is active.
				</div>
				<div>
					<b>Backend development</b><br/>
					Backend is redirected to <i class="clickable" style="background: var(--secondary-background-color); color: var(--secondary-background-color)" onmouseover="this.style.background=\'var(--main-color)\';this.style.color=\'var(--main-color)\'" onmouseleave="this.style.background=\'var(--secondary-background-color)\';this.style.color=\'var(--secondary-background-color)\'" onclick="this.style.background=\'\';this.style.color=\'\'; this.onmouseover=undefined; this.onmouseleave=undefined;">'+Backend.getBackend().path+'</i>.<br/><br/><button class="clickable" onclick="localStorage.removeItem(\'backend\'); location.reload();">Clear</button>
				</div>
			</MenuItem>
			<div class={styles.split}></div>
			<MenuItem title="Community" href="https://algorithmic.games/Community/" target="_blank">
				<MenuItem title="GitHub" href="https://github.com/orgs/AlgorithmicGames/discussions" imgSrc={githubLogo}/>
				<MenuItem title="Discord" href="https://discord.gg/jhUJNsN" imgSrc={discordLogo} target="_blank"/>
			</MenuItem>
			<MenuItem title="Source"/>
			<LoginButton />
		</header>
	</>)
}
