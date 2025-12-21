/* @refresh reload */
import { render } from 'solid-js/web'
import { Route, Router, type RouteSectionProps } from '@solidjs/router'
import './defaults.css'
import Header from './Components/Header.tsx'
import Home from './Components/Home.tsx'
import Dev from './Dev.tsx'

const root = (props: RouteSectionProps<unknown>) => (
	<>
		<Header />
		{props.children}
	</>
  );

render(() => <Router root={root}>
	<Route path="" component={Home} />
	<Route path="Dev" component={Dev} />
	<Route path="*404" component={() => <div>404</div>} />
	<Route path="*" component={() => <h1>😮</h1>} />
</Router>, document.body!)
