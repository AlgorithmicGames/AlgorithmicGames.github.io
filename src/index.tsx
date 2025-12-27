/* @refresh reload */
import { render } from 'solid-js/web'
import { Route, Router, type RouteSectionProps } from '@solidjs/router'
import './defaults.css'
import Header from './Components/Header.tsx'
import Home from './Components/Home.tsx'
import Arena from './Components/Arena.tsx'
import Dev from './Dev.tsx'
import GitHubService from './GitHubService.tsx'

if (0 < location.href.indexOf('?oAuthCode=')) {
	GitHubService.login()
}

const root = (props: RouteSectionProps<unknown>) => (
	<>
		<Header />
		{props.children}
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
