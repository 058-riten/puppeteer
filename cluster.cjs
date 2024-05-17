const { Cluster } = require('puppeteer-cluster');
const fs = require('fs');

const urls = [
  'https://www.daraz.com.np/laptop-backpacks-2/poso/?from=sideFilters',
  'https://www.daraz.com.np/laptops/asus/?from=sideFilters'
];

(async () => {
  const cluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_PAGE,
    maxConcurrency: 3,
    monitor: true,
    puppeteerOptions: {
      headless: false,
      defaultViewport: false,
      userDataDir: './tmp'
    }
  });

  cluster.on("taskerror", (err, data) => {
    console.log(`Error crawling ${data}: ${err.message}`);
  });

  await cluster.task(async ({ page, data: url }) => {
    await page.goto(url);

    const items = [];
    let isBtnDisabled = false
    while (!isBtnDisabled) {
      await page.waitForSelector('[data-qa-locator="general-products"]')
      const producthandles = await page.$$('[data-tracking="product-card"]')

      for (const producthandle of producthandles) {
        let title = 'Null'
        let price = 'Null'
        let discount = 'Null'
        let img = 'Null'

        try {
          title = await page.evaluate(
            (el) => el.querySelector("#id-title").textContent,
            producthandle
          );
        } catch (error) { }

        try {
          price = await page.evaluate(
            (el) => el.querySelector(".current-price--Jklkc").textContent,
            producthandle
          );
        } catch (error) { }

        try {
          discount = await page.evaluate(
            (el) => el.querySelector('.class="item-voucher--isucX').textContent,
            producthandle
          )
        } catch (error) { }

        try {
          img = await page.evaluate(
            (el) => el.querySelector(".image--Smuib").getAttribute("src"),
            producthandle
          );
        } catch (error) { }

        if (title !== "Null") {
          items.push({ title, price, discount, img })
        }
      }

      await page.waitForSelector("li.ant-pagination-next", { visible: true });
      const is_disabled = (await page.$("li.ant-pagination-disabled.ant-pagination-next")) !== null;

      isBtnDisabled = is_disabled;
      if (!is_disabled) {
        await Promise.all([
          page.click("li.ant-pagination-next"),
          page.waitForNavigation({ waitUntil: "networkidle2" }),
        ]);
      }
    }

    const csvData = items.map(item => `${item.title.replace(/,/g, '/')}, ${item.price.replace(/,/g, "")}, ${item.discount}, ${item.img}`).join('\n')
    fs.writeFile('clusters.csv', csvData, function (err) {
      if (err) throw err;
      console.log('Saved!');
    });
  });

  for (const url of urls) {
    await cluster.queue(url);
  }

  await cluster.idle();
  await cluster.close();
})();