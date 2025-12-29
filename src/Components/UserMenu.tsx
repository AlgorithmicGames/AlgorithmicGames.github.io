import { Show } from 'solid-js/web'
import GitHubService from '../GitHubService.tsx'
import styles from './UserMenu.module.css'
import MenuItem from './MenuItem.tsx'

export default function UserMenu() {
	if (GitHubService.isLoggedIn()) {
		GitHubService.fetch('user').then((response) => response.json()).then(async (user) => {
			const sessionStorage = GitHubService.getSessionStorage() ?? {}
			sessionStorage.username = user.login
			sessionStorage.avatar_url = user.avatar_url
			GitHubService.setSessionStorage(sessionStorage)
		})
	}

	return (
		<>
			<Show when={GitHubService.isLoggedIn()}>
				<MenuItem>
					<label class={styles.label}>
						<div class={styles.logoutButtonWrapper}>
							&nbsp;
							<div class={styles.logoutButton} onclick={() => GitHubService.logout()}>
								Logout
							</div>
						</div>
						<span>{GitHubService.getSessionStorage().username}</span>
						&nbsp;
						<img class={styles.currentProfileImage + ' ' + styles.noEffect} alt='Current user profile image' src={GitHubService.getSessionStorage().avatar_url}></img>
					</label>
					<a href='/Dev'>Arena setups</a>
				</MenuItem>
			</Show>
			<Show when={!GitHubService.isLoggedIn()}>
				<div>
					<a href={'https://algorithmic.games/login?origin=' + encodeURI(location.protocol + '//' + location.host + location.pathname)}>Login</a>
				</div>
			</Show>
		</>
	)
}
