import { children as childrenFunction, Show } from "solid-js";

type MenuItemProps = { title: string, href?: string, imgSrc?: string, target?: string, children?: any };

export default function MenuItem({ title, href, imgSrc, target, children }: MenuItemProps) {
	const classList = [];
	if(children) {
		classList.push('dropdown');
	}
	return (
		<div class={classList.join(' ')}>
			<Show when={href} fallback={<div>{title}</div>}>
				<Show when={imgSrc}>
					<img src={imgSrc}/>
				</Show>
				<a href={href} target={target}>{title}</a>
			</Show>
			<Show when={children}>
				<div class="dropdown-content">
					{ childrenFunction(() => children)() }
				</div>
			</Show>
		</div>
	)
}