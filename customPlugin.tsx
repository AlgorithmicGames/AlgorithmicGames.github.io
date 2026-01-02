import fs from 'node:fs'
import path from 'node:path'

function findFiles(dir: string, extension: string) {
	const files: string[] = []
	for (const file of fs.readdirSync(dir)) {
		if (fs.statSync(path.join(dir, file)).isDirectory()) {
			files.push(...findFiles(path.join(dir, file), extension))
		} else if (file.endsWith(extension)) {
			files.push(path.join(dir, file).replace(/\\/g, '/').replace(/^public/g, ''))
		}
	}
	return files
}

const svgMarkerStart = `\\/\\*SVG_URL_PLACEHOLDER_START\\*\\/`
const svgMarkerEnd = `\\/\\*SVG_URL_PLACEHOLDER_END\\*\\/`

export default function customPlugin() {
	return {
		name: 'build-script',
		buildStart() {
			const svgService = fs.readFileSync('src/components/SVG.tsx', 'utf8')
			const svgFiles = '\n\t\t' + findFiles('public/svg', '.svg').map((file) => `'${file}'`).join(',\n\t\t') + ',\n\t\t'
			const regex = new RegExp(String.raw`${svgMarkerStart}.*${svgMarkerEnd}`, 'g')
			fs.writeFileSync('src/components/SVG.tsx', svgService.replace(regex, svgMarkerStart.replaceAll('\\', '') + svgFiles + svgMarkerEnd.replaceAll('\\', '')))
		},
	}
}
