require('dotenv').config();
const puppeteer = require('puppeteer');
const Sheet = require('./sheet');

// enter desired reddit post's OLD url ie. https://old.reddit.com/r/...
const url =
	'https://old.reddit.com/r/learnprogramming/comments/5ed4xg/ive_taught_30000_students_how_to_code_now_im/';

(async function () {
	const browser = await puppeteer.launch();
	const page = await browser.newPage();
	await page.goto(url);

	const sheet = new Sheet();
	await sheet.load();

	// create sheet with title
	const title = await page.$eval('.title a', (element) => element.textContent);
	const sheetIndex = await sheet.addSheet(title.slice(0, 98), [
		'points',
		'text',
	]);

	// expand all comment threads
	let expandButtons = await page.$$('.morecomments');
	while (expandButtons.length) {
		for (let button of expandButtons) {
			await button.click();
			await page.waitFor(500);
		}

		await page.waitFor(1000);
		expandButtons = await page.$$('.morecomments');
	}

	// select all comments, scrape text and points
	const comments = await page.$$('.entry');
	const formattedComments = [];

	for (let comment of comments) {
		//  scrape points
		const points = await comment
			.$eval('.score', (element) => element.textContent)
			.catch((err) => console.error('no score'));

		//  scrape text
		const rawText = await comment
			.$eval('.usertext-body', (element) => element.textContent)
			.catch((err) => console.error('no text'));

		if (points && rawText) {
			const text = rawText.replace(/\n/g, '');
			formattedComments.push({ points, text });
		}
	}

	// sort comments by points
	formattedComments.sort((a, b) => {
		const pointsA = Number(a.points.split(' ')[0]);
		const pointsB = Number(b.points.split(' ')[0]);

		return pointsB - pointsA;
	});

	// insert into google spreadsheet
	sheet.addRows(formattedComments, sheetIndex);

	await browser.close();
})();
