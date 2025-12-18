/* @refresh reload */
import { render } from 'solid-js/web'
import { Router, Route } from '@solidjs/router'
import './defaults.css'
import App from './App.tsx'
import Dev from './Dev.tsx'

render(() => <Router>
	<Route path="/" component={App} />
	<Route path="/Dev" component={Dev} />
</Router>, document.body!)
