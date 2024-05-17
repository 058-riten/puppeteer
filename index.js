import puppeteer from 'puppeteer';
import fs from 'fs'

(async () => {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: false,
        userDataDir: './tmp'
    });
    const page = await browser.newPage();

    await page.goto('https://www.amazon.com/s/?k=4396841+water+filter&ref=sugsr_1&pd_rd_w=FO6Jt&content-id=amzn1.sym.3e23f907-b859-4094-8b45-cf96f8c9286b:amzn1.sym.3e23f907-b859-4094-8b45-cf96f8c9286b&pf_rd_p=3e23f907-b859-4094-8b45-cf96f8c9286b&pf_rd_r=668FXBXY2CWH3ZJFXA0S&pd_rd_wg=l9v1Y&pd_rd_r=41eb2935-2c47-454b-b3b6-dcad834cbaa8&qid=1715871217');

    const items = []
    let isBtnDisabled = false

    while (!isBtnDisabled) {
        await page.waitForSelector('[cel_widget_id="MAIN-SEARCH_RESULTS-2"]')
        const productsHandle = await page.$$('div.s-main-slot.s-result-list.s-search-results.sg-row > .s-result-item')

        for (const producthandle of productsHandle) {
            let title = "Null";
            let price = "Null";
            let img = "Null";

            try {
                title = await page.evaluate(
                    (el) => el.querySelector("h2 > a > span").textContent,
                    producthandle
                );
            } catch (error) {

            }

            try {
                price = await page.evaluate(
                    (el) => el.querySelector(".a-price > .a-offscreen").textContent,
                    producthandle
                );
            } catch (error) {

            }

            try {
                img = await page.evaluate(
                    (el) => el.querySelector(".s-image").getAttribute("src"),
                    producthandle
                );
            } catch (error) {

            }

            if (title !== "Null") {
                items.push({ title, price, img })
            }
        }

        try {
            await Promise.race([
                page.waitForSelector('a.s-pagination-item.s-pagination-next.s-pagination-button.s-pagination-separator', { timeout: 4000 }),
                page.waitForSelector('span.s-pagination-item.s-pagination-next.s-pagination-disabled', { timeout: 4000 })
            ]);
        } catch (error) {
            console.log(error)
        }

        try {
            isBtnDisabled = await page.$('span.s-pagination-item.s-pagination-next.s-pagination-disabled') !== null
            if (!isBtnDisabled) {
                await Promise.all([
                    page.click("a.s-pagination-item.s-pagination-next.s-pagination-button.s-pagination-separator"),
                    page.waitForNavigation({ waitUntil: "networkidle2" })
                ]);
            }
        } catch (error) {
            console.log(error)
        }
    }

    const csvData = items.map(item => `${item.title.replace(/,/g,'/')}, ${item.price}, ${item.img}`).join('\n')
    fs.writeFile('results.csv', csvData, function (err) {
        if (err) throw err;
        console.log('Saved!');
    });
    
    console.log(items.length)
    await browser.close()
})();