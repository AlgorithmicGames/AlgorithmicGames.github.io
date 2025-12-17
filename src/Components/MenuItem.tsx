import { children as childrenFunction, Show, createSignal } from "solid-js";
import styles from './MenuItem.module.css';

type MenuItemProps = {
	title: string,
	href?: string,
	svgSrc?: string,
	hrefClass?: string,
	target?: string,
	children?: any
};

export default function MenuItem({ title, href, svgSrc, hrefClass, target, children }: MenuItemProps) {
	const classList = [styles.menuItem];
	if(children) {
		classList.push(styles.dropdown);
	}
	const [svg, setSvg] = createSignal('');
	if(svgSrc) {
		fetch(svgSrc).then(response => response.text()).then(text => setSvg(text.replace(/<style>.*<\/style>/, '')))
	}
	return (
		<div class={classList.join(' ')}>
			<Show when={href} fallback={<div>{title}</div>}>
				<a href={href} target={target} class={hrefClass} innerHTML={svg()+"<span>"+title+"</span>"}/>
			</Show>
			<Show when={children}>
				<div class={styles.dropdownContent}>
					{ childrenFunction(() => children)() }
				</div>
			</Show>
		</div>
	)
}