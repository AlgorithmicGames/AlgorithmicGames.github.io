import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import customPlugin from './customPlugin.tsx'

export default defineConfig({
	plugins: [
		solid(),
		customPlugin(),
	],
})
