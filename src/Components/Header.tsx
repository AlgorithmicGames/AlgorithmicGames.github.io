import styles from './Header.module.css'
import MenuItem from './MenuItem.tsx'
import LoginButton from './LoginButton.tsx'
import communityLogosStyles from './CommunityLogos.module.css'
import { For, Show, Suspense, createSignal } from 'solid-js';
import { createAsync } from '@solidjs/router';

export default function Header() {
	const headerTitle = 'Algorithmic Games';
	
	const [localDevelopment, setLocalDevelopment] = createSignal(false);
	const [backendDevelopment, setBackendDevelopment] = createSignal(false);
	
	requestAnimationFrame(() => {
		setLocalDevelopment(false);
		setBackendDevelopment(false);
	});
	const announcements = createAsync(() => fetch("https://github.com/orgs/AlgorithmicGames/discussions/categories/1-announcements").then(response => response.json()).catch(() => {/* TEMP: Disabled */}));
	
	return (<header id={styles.root}>
		<div class={styles.headerTitle}>{headerTitle}</div>
		<MenuItem title="Announcements" href="https://github.com/orgs/AlgorithmicGames/discussions/categories/1-announcements" target="_blank">
			<Suspense fallback={<div>Loading...</div>}>
				<For each={announcements()}>{(announcement) => <span>{announcement.title}</span>}</For>
			</Suspense>
			<MenuItem title="· · ·" href="https://github.com/orgs/AlgorithmicGames/discussions/categories/1-announcements" target="_blank"/>
		</MenuItem>
		<MenuItem title="Arena"/>
		<MenuItem title="Replays"/>
		<Show when={localDevelopment() || backendDevelopment()}>
			<MenuItem title="🚧Development🚧">
				<Show when={localDevelopment()}>
					<MenuItem title="<b>Local development</b><div>Automatic addition of local arena and participants is active.</div>" href="/Dev"/>
				</Show>
				<Show when={backendDevelopment()}>
				<MenuItem title="<b>Backend development</b>" href="/Dev"/>
					<div class="TEMP">
						Backend is redirected to <i class="clickable" style="background: var(--secondary-background-color); color: var(--secondary-background-color)" onmouseover="this.style.background=\'var(--main-color)\';this.style.color=\'var(--main-color)\'" onmouseleave="this.style.background=\'var(--secondary-background-color)\';this.style.color=\'var(--secondary-background-color)\'" onclick="this.style.background=\'\';this.style.color=\'\'; this.onmouseover=undefined; this.onmouseleave=undefined;">'+Backend.getBackend().path+'</i>.<br/><br/><button class="clickable" onclick="localStorage.removeItem(\'backend\'); location.reload();">Clear</button>
					</div>
				</Show>
			</MenuItem>
		</Show>
		<div class={styles.split}></div>
		<MenuItem title="Community" href="https://algorithmic.games/Community/" target="_blank">
			<MenuItem title="GitHub" href="https://github.com/orgs/AlgorithmicGames/discussions" svgSrc='/github.svg' hrefClass={communityLogosStyles.githubLogo}/>
			<MenuItem title="Discord" href="https://discord.gg/jhUJNsN" svgSrc='/discord.svg' target="_blank" hrefClass={communityLogosStyles.discordLogo}/>
		</MenuItem>
		<LoginButton />
	</header>)
}
