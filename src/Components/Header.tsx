import styles from './Header.module.css'
import MenuItem from './MenuItem.tsx'
import LoginButton from './LoginButton.tsx'
import communityLogosStyles from './CommunityLogos.module.css'
import { For, Show, Suspense, createSignal } from 'solid-js';
import { createAsync } from '@solidjs/router';
import GitHubService from '../GitHubService.tsx';

export default function Header() {
	const headerTitle = 'Algorithmic.Games';
	const headerTitleHover = '@ GitHub';
	
	const [localDevelopment, setLocalDevelopment] = createSignal(false);
	const [backendDevelopment, setBackendDevelopment] = createSignal(false);
	
	requestAnimationFrame(() => {
		setLocalDevelopment(false);
		setBackendDevelopment(false);
	});

	const announcements = createAsync(() => GitHubService.fetchAnnouncements(5).then(response => response.json()));
	const arenas = createAsync(() => GitHubService.fetchArenas());

	return (<header id={styles.root}>
		<div class={styles.title}>
			<div class={styles.titleText}>{headerTitle}</div>
			<a class={styles.titleHover} href="https://github.com/AlgorithmicGames" target="_blank">{headerTitleHover}</a>
		</div>
		<MenuItem title="Announcements" href="https://github.com/orgs/AlgorithmicGames/discussions/categories/1-announcements" target="_blank">
			<Suspense>
				<For each={announcements()}>{(announcement) =>
					<a href={announcement.url} target="_blank">
						<div>{announcement.title}</div>
						<time dateTime={announcement.createdAt}>{announcement.createdAt.substring(0,10)}</time>
					</a>
				}</For>
			</Suspense>
			<MenuItem title="· · ·" href="https://github.com/orgs/AlgorithmicGames/discussions/categories/1-announcements" target="_blank"/>
		</MenuItem>
		<MenuItem title="Arena" navigate="/Arena/">
			<For each={arenas()}>{(arena) => <MenuItem title={arena.name} navigate={"/Arena/"+arena.full_name}/>}</For>
		</MenuItem>
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
			<MenuItem title="GitHub" href="https://github.com/orgs/AlgorithmicGames/discussions" svgSrc='/github.svg' target="_blank" anchorClass={communityLogosStyles.githubLogo}/>
			<MenuItem title="Discord" href="https://discord.gg/jhUJNsN" svgSrc='/discord.svg' target="_blank" anchorClass={communityLogosStyles.discordLogo}/>
		</MenuItem>
		<LoginButton />
	</header>)
}
