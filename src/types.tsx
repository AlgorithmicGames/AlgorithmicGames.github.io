export class ArenaInfo {
	public name: string
	public official: boolean
	public raw_url: string | null
	public defaultBranchURL: string
	public html_url: string
	public full_name: string
	public stars: number
	public commit: string | null
	public version: string | null

	constructor(data: {
		name: string
		official: boolean
		raw_url: string | null
		defaultBranchURL: string
		html_url: string
		full_name: string
		stars: number
		commit: string | null
		version: string | null
	}) {
		this.name = data.name
		this.official = data.official
		this.raw_url = data.raw_url
		this.defaultBranchURL = data.defaultBranchURL
		this.html_url = data.html_url
		this.full_name = data.full_name
		this.stars = data.stars
		this.commit = data.commit
		this.version = data.version
	}
}
