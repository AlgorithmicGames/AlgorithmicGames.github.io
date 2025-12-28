/* @refresh reload */
import { render } from 'solid-js/web'
import { Route, Router, type RouteSectionProps } from '@solidjs/router'
import './global.css'
import Header from './Components/Header.tsx'
import Home from './Home.tsx'
import Arena from './Arena.tsx'
import Dev from './Dev.tsx'
import GitHubService from './GitHubService.tsx'
import Background from './Background.tsx'

if (0 < location.href.indexOf('?oAuthCode=')) {
	GitHubService.login()
}

const root = (props: RouteSectionProps<unknown>) => (
	<>
		<Header />
		<div>
			<Background />
			<div id='content'>
				{props.children}
			</div>
		</div>
	</>
)

render(() => (
	<Router root={root}>
		<Route path='' component={Home} />
		<Route path='Arena/:author?/:arena?' component={Arena} />
		<Route path='Dev' component={Dev} />
		<Route path='*pageNotfound' component={Home} />
	</Router>
), document.body!)
