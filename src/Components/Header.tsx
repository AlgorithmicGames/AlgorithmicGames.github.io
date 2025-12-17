import styles from './Header.module.css'
import MenuItem from './MenuItem.tsx'
import LoginButton from './LoginButton.tsx'
import communityLogosStyles from './CommunityLogos.module.css'

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
				<MenuItem title="GitHub" href="https://github.com/orgs/AlgorithmicGames/discussions" svgSrc='/github.svg' hrefClass={communityLogosStyles.githubLogo}/>
				<MenuItem title="Discord" href="https://discord.gg/jhUJNsN" svgSrc='/discord.svg' target="_blank" hrefClass={communityLogosStyles.discordLogo}/>
			</MenuItem>
			<LoginButton />
		</header>
	</>)
}
