import { Show } from 'solid-js/web'
import GitHubService from '../GitHubService.tsx'
import styles from './UserMenu.module.css'
import MenuItem from './MenuItem.tsx'

export default function UserMenu() {
	const isLoggedIn = GitHubService.isLoggedIn()
	if (isLoggedIn) {
		GitHubService.fetch('user').then((response) => response.json()).then(async (user) => {
			const sessionStorage = GitHubService.getSessionStorage() ?? {}
			sessionStorage.username = user.login
			sessionStorage.avatar_url = user.avatar_url
			GitHubService.setSessionStorage(sessionStorage)
		})
	}

	return (
		<>
			<Show when={isLoggedIn}>
				<MenuItem>
					<label class={styles.label}>
						<div class={styles.logoutButton} onclick={() => GitHubService.logout()}>
							Logout
						</div>
						&nbsp;
						<span>{GitHubService.getSessionStorage().username}</span>
					</label>
					<img class={styles.currentProfileImage} alt='Current user profile image' src={GitHubService.getSessionStorage().avatar_url}></img>
					<a href='/Dev'>Arena setups</a>
				</MenuItem>
			</Show>
			<Show when={!isLoggedIn}>
				<div>
					<a href={'https://algorithmic.games/login?origin=' + encodeURI(location.protocol + '//' + location.host + location.pathname)}>Login</a>
				</div>
			</Show>
		</>
	)
}
