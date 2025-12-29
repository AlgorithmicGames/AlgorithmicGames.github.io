import styles from './Header.module.css'
import MenuItem from './MenuItem.tsx'
import UserMenu from './UserMenu.tsx'
import communityLogosStyles from './CommunityLogos.module.css'
import { createSignal, For, Show, Suspense } from 'solid-js'
import { createAsync } from '@solidjs/router'
import GitHubService from '../GitHubService.tsx'

export default function Header() {
	const headerTitle = 'Algorithmic Games'
	const headerTitleHover = '@ GitHub'

	const [localDevelopment, setLocalDevelopment] = createSignal(false)
	const [backendDevelopment, setBackendDevelopment] = createSignal(false)

	requestAnimationFrame(() => {
		setLocalDevelopment(false)
		setBackendDevelopment(false)
	})

	const announcements = createAsync(() => GitHubService.fetchAnnouncements(5).then((response) => response.json()))
	const arenas = createAsync(() => GitHubService.fetchArenas())

	return (
		<header id={styles.root}>
			<div class={styles.title}>
				<div class={styles.titleText}>{headerTitle}</div>
				<a class={styles.titleHover} href='https://github.com/AlgorithmicGames' target='_blank'>{headerTitleHover}</a>
			</div>
			<MenuItem href='https://github.com/orgs/AlgorithmicGames/discussions/categories/1-announcements' target='_blank'>
				Announcements
				<Suspense>
					<For each={announcements()}>
						{(announcement) => (
							<a href={announcement.url} target='_blank'>
								<div>{announcement.title}</div>
								<time dateTime={announcement.createdAt}>{announcement.createdAt.substring(0, 10)}</time>
							</a>
						)}
					</For>
				</Suspense>
				<MenuItem href='https://github.com/orgs/AlgorithmicGames/discussions/categories/1-announcements' target='_blank'>· · ·</MenuItem>
			</MenuItem>
			<MenuItem navigate='/Arena/'>
				Arena
				<For each={arenas()}>{(arena) => <MenuItem navigate={'/Arena/' + arena.full_name}>{arena.name}</MenuItem>}</For>
			</MenuItem>
			<Show when={false /* True when has replays */}>
				<MenuItem>
					Replays
					<For each={[{ uuid: '1', name: 'Replay1' }]}>{(replay) => <MenuItem navigate={'/Replay/' + replay.uuid}>{replay.name}</MenuItem>}</For>
				</MenuItem>
			</Show>
			<Show when={localDevelopment() || backendDevelopment()}>
				<MenuItem>
					🚧Development🚧
					<Show when={localDevelopment()}>
						<MenuItem href='/Dev'>
							<b>Local development</b>
							<div>Automatic addition of local arena and participants is active.</div>
						</MenuItem>
					</Show>
					<Show when={backendDevelopment()}>
						<MenuItem href='/Dev'>
							<b>Backend development</b>
							<div class='TEMP'>
								Backend is redirected to <i class='clickable' style='background: var(--secondary-background-color); color: var(--secondary-background-color)' onmouseover="this.style.background='var(--main-color)';this.style.color='var(--main-color)'" onmouseleave="this.style.background='var(--secondary-background-color)';this.style.color='var(--secondary-background-color)'" onclick="this.style.background='';this.style.color=''; this.onmouseover=undefined; this.onmouseleave=undefined;">'+Backend.getBackend().path+'</i>.<br />
								<br />
								<button class='clickable' onclick="localStorage.removeItem('backend'); location.reload();">Clear</button>
							</div>
						</MenuItem>
					</Show>
				</MenuItem>
			</Show>
			<div class={styles.split}></div>
			<MenuItem href='https://algorithmic.games/Community/' target='_blank'>
				Community
				<MenuItem href='https://github.com/orgs/AlgorithmicGames/discussions' svgSrc='/github.svg' target='_blank' anchorClass={communityLogosStyles.githubLogo}>GitHub</MenuItem>
				<MenuItem href='https://discord.gg/jhUJNsN' svgSrc='/discord.svg' target='_blank' anchorClass={communityLogosStyles.discordLogo}>Discord</MenuItem>
			</MenuItem>
			<UserMenu />
		</header>
	)
}
