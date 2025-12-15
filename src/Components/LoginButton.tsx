export default function LoginButton() {
	return (
		<>
			<div id="logout-button-wrapper" class="hidden dropdown">
				<label id="logout-button"><div>Logout<span>&nbsp;</span></div><span class="local-username"></span></label>
				<div class="dropdown-content">
					<img id="main-profile-image" class="local-profile-image" alt="Current user profile image"></img>
				</div>
			</div>
			<div id="login-button-wrapper">
				<a id="login-button" href="https://algorithmic.games/login">Login</a>
			</div>
		</>
	)
}