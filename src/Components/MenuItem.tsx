import { children as childrenFunction, createSignal, Show } from 'solid-js'
import styles from './MenuItem.module.css'
import { useNavigate } from '@solidjs/router'

type MenuItemProps = {
	href?: string
	svgSrc?: string
	anchorClass?: string
	target?: string
	navigate?: string
	children?: any
}

export default function MenuItem({ href, svgSrc, anchorClass, target, navigate = '', children }: MenuItemProps) {
	if (href && navigate) {
		throw new Error('Either href or navigate must be provided, not both')
	}

	const navigateTo = useNavigate()

	const title = children.shift ? children.shift() : children
	if (title === children) {
		children = null
	}

	const classList = [styles.menuItem]
	if (children) {
		classList.push(styles.dropdown)
	}
	const [svg, setSvg] = createSignal('')
	if (svgSrc) {
		fetch(svgSrc).then((response) => response.text()).then((text) => setSvg(text.replace(/<style>.*<\/style>/, '')))
	}
	return (
		<div class={classList.join(' ')}>
			<Show when={href || navigate} fallback={title}>
				<a href={href || 'javascript:void(0)'} target={target} class={anchorClass} onclick={() => navigate && navigateTo(navigate)}>
					<span innerHTML={svg()} />
					{title}
				</a>
			</Show>
			<Show when={children}>
				<div class={styles.dropdownContent}>
					{childrenFunction(() => children)()}
				</div>
			</Show>
		</div>
	)
}
