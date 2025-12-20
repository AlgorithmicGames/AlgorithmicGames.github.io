/* @refresh reload */
import { render } from 'solid-js/web'
import { HashRouter, Route, type RouteSectionProps } from '@solidjs/router'
import './defaults.css'
import Header from './Components/Header.tsx'
import Arena from './Components/Arena.tsx'
import Dev from './Dev.tsx'

const root = (props: RouteSectionProps<unknown>) => (
	<>
		<Header />
		{props.children}
	</>
  );

render(() => <HashRouter root={root}>
	<Route path=""/>
	<Route path="Arena/" component={Arena} />
	<Route path="Arena/:author/:arena" component={Arena} />
	<Route path="Dev" component={Dev} />
	<Route path="*404" component={() => <div>404</div>} />
	<Route path="*" component={() => <h1>😮</h1>} />
</HashRouter>, document.body!)
