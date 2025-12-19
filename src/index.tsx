/* @refresh reload */
import { render } from 'solid-js/web'
import { HashRouter, Route } from '@solidjs/router'
import './defaults.css'
import App from './App.tsx'
import Dev from './Dev.tsx'

render(() => <HashRouter>
	<Route path="" component={App} />
	<Route path="Dev" component={Dev} />
	<Route path="*404" component={() => <div>404</div>} />
</HashRouter>, document.body!)
