import program from 'commander'

const packagejson: { version: string } = require("../package.json")
program
	.version(packagejson.version)
	.description('tweets collector')

program
	.command('collect <count> <url>')
	.description('Collect at least <count> tweets from <url>')
	.action(async (count: number, url) => {
		console.log(`collect ${count} tweets from ${url}`)
		await collect(count, url)
	})

import puppeteer from 'puppeteer'

type Settings = {
	browserLaunch: puppeteer.LaunchOptions,
	pageGoto: puppeteer.DirectNavigationOptions,
	pageOn: { resourceTypes: puppeteer.ResourceType[] }
}

const settings: Settings = {
	browserLaunch: {
		args: [
			'--disable-dev-shm-usage',
			'--no-sandbox',
			'--disable-setuid-sandbox',
		]
	},
	pageGoto: { waitUntil: 'networkidle0' },
	pageOn: {
		resourceTypes: [
			'document', 'script', 'stylesheet', 'websocket', 'xhr', "other",
		]
	}
}

const newPage = async (browser: puppeteer.Browser) => {
	const page = await browser.newPage()
	await page.setViewport({
		width: 640,
		height: 1920,
		deviceScaleFactor: 1,
	})
	await page.setRequestInterception(true)
	page.on('request', (request) => {
		if (settings.pageOn.resourceTypes.includes(request.resourceType())) {
			request.continue()
		} else {
			// console.error(request.resourceType())
			request.abort()
		}
	})
	return page
}

type Tweet = {
	href: string,
	datetime: string,
	fullName: string,
	screenName: string,
	text: string,
	isRetweet: boolean,
	reply: number,
	retweet: number,
	like: number,
}

const collect = async (count: number, url: string) => {
	const browser = await puppeteer.launch(settings.browserLaunch)
	const page = await newPage(browser)

	await page.goto(url, settings.pageGoto)

	const extractTweets = (page: puppeteer.Page) => {
		return page.evaluate(() => {
			const perse = (v: string | undefined | null): number => {
				const result = Number.parseInt(v == null ? '0' : v)
				return Number.isNaN(result) ? 0 : result
			}
			return Array.from(document.querySelectorAll('article'))
				.map(a => {
					const anchors = Array.from(a.querySelectorAll('a'))
					const isRetweet = anchors.length >= 4
					const [icon, name, time] = isRetweet ? anchors.slice(1) : anchors
					const fullName = name?.childNodes[0]?.childNodes[0]?.textContent
					const screenName = name?.childNodes[0]?.childNodes[1]?.textContent
					const href = time?.getAttribute('href')
					const datetime = time?.querySelector('time')?.getAttribute('datetime')
					const reply = perse(a.querySelector('div[data-testid="reply"]')?.getAttribute('aria-label'))
					const retweet = perse(a.querySelector('div[data-testid="retweet"]')?.getAttribute('aria-label'))
					const like = perse(a.querySelector('div[data-testid="like"]')?.getAttribute('aria-label'))
					const text = a.querySelector('div[lang]')?.textContent
					return { href: href, datetime: datetime, fullName: fullName, screenName: screenName, text: text, isRetweet: isRetweet, reply: reply, retweet: retweet, like: like }
				})
				.filter(e => e.datetime !== undefined)
				.map((t): Tweet => {
					return {
						href: t.href || '',
						datetime: t.datetime || '',
						fullName: t.fullName || '',
						screenName: t.screenName || '',
						text: t.text || '',
						isRetweet: t.isRetweet,
						reply: t.reply,
						retweet: t.retweet,
						like: t.like,
					}
				})
		})
	}

	const tweets: Tweet[] = []
	const ids: { [id: string]: Tweet } = {}

	const merge = (newTweets: Tweet[]) => {
		for (const tw of newTweets) {
			if (tw.href in ids) {
			} else {
				ids[tw.href] = tw
				tweets.push(tw)
			}
		}
	}

	let outputCount = 0

	do {
		merge(await extractTweets(page))
		const height = await page.evaluate(() => {
			let scrollHeight = Math.max(
				document.body.scrollHeight, document.documentElement.scrollHeight,
				document.body.offsetHeight, document.documentElement.offsetHeight,
				document.body.clientHeight, document.documentElement.clientHeight
			)
			window.scrollTo({ behavior: 'auto', top: scrollHeight })
			return scrollHeight
		})
		await page.waitFor(3000)
		for (let i = outputCount; i < tweets.length; i++) {
			console.info(JSON.stringify(tweets[i]))
		}
		outputCount = tweets.length
	} while (tweets.length < count);
	await page.close()
	await browser.close()
}


program.parse(process.argv)