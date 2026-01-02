import type { Accessor } from 'solid-js'
import { createSignal } from 'solid-js'

type SVGProps = {
	key: string
}

const assets: Record<string, Accessor<string>> = {}
for (const url of ['/svg/algorithmic-games.svg', '/svg/discord.svg', '/svg/github.svg']) {
	const key = url.replace(/\/svg\/|\.svg/g, '')
	const [svg, setSvg] = createSignal('')
	assets[key] = svg
	fetch(url).then((response) => response.text()).then((text) => {
		setSvg(text.replace(/<style>.*<\/style>/, ''))
	})
}

export default function SVG({ key }: SVGProps) {
	return <span innerHTML={assets[key]()} />
}
