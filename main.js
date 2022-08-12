import fetch from 'node-fetch';
import puppeteer from 'puppeteer';
import fs from 'fs';

const language = "uk";
var globalDocArray = [];
//let url = `https://cert.gov.ua/api/articles/all?page=${pageNumber}&lang=${language}`;

// const target = "en";
// const translate = new Translate();

// async function translation(text) {
//     let [translations] = await translate.translate(text, target);
//     translations = Array.isArray(translations) ? translations : [translations];
//     console.log("Started translating");
//     translations.forEach(translation => {
//         console.log(`${text}\n->\n${translation}`);
//     });
// }

// translation("Привіт")
// .then(() => {
//     console.log("Translation finished")
// })
// .catch(err => {
//     console.log(err)
// });

// async function otherTranslate(text) {
//     const browser = await puppeteer.launch()
//     const page = await browser.newPage()
//     //await page.goto(`https://translate.google.fr/?hl=en&sl=uk&tl=en&text=${text}&op=translate`);
//     await page.goto(`https://translate.google.fr/?hl=en&sl=uk&tl=en&op=translate`);
//     await page.setDefaultNavigationTimeout(10);
//     input.keyboard.type(text);
//     //await page.focus('.QFw9Te > .er8xn');
//     await page.type("textarea", text);
//     await page.waitForSelector("span .Q4iAWc");
//     const phrases = await page.$$eval(".Q4iAWc", els => els.map(e => e.textContent));
//     console.log(phrases.join(" "));
//     await browser.close()
// }

async function sleep() {
    return new Promise(resolve => {
        setTimeout(resolve, 1000);
    })
}

async function getDocument(pageIndex) {
    console.log(`Get request on page number ${pageIndex}`);
    const url = `https://cert.gov.ua/api/articles/all?page=${pageIndex}&lang=${language}`;
    const res = await fetch(url, {
        headers: {
            referer: "https://cert.gov.ua/articles",
            accept: "application/json",
        },
    });
    return await res.json();
}

async function findAllIds() {
    let pageNumber = 0;
    let array = [];
    // Go through all pages and find the last one
    while (true) {
        let data = await getDocument(pageNumber)
        // console.log(data);
        for (let i = 0; i < data.items.length; i++) {
            globalDocArray.push(data.items[i]);
            console.log(`Retrieving id number ${data.items[i].id}...`);
            if (!array.includes(data.items[i].id)) {
                array.push(data.items[i].id);
            }
        }
        if (data.items.length == 0) {
            break;
        }
        await sleep();
        pageNumber++;
    }
    console.log(array);
    return array;
}

async function createPdfFromPage(id, page) {
    await page.goto(`https://cert.gov.ua/article/${id}`)
    await page.pdf({
        path: `event_${id}.pdf`,
    });
    console.log('Pdf created');
}

async function parseData() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const array = await findAllIds();

    for (let i = 0; i < array.length; ++i) {
        await createPdfFromPage(array[i], page);
    }
    for (let i = 0; i < globalDocArray.length; i++) {
        let data = globalDocArray[i];
        let metadata = {
            id : data.id,
            title : data.title,
            description : data.description,
            date: data.date,
            tags : data.tags,
            url: `https://cert.gov.ua/article/${data.id}`
        };
        let str = JSON.stringify(metadata);
        fs.writeFile(`event_${data.id}.json`, str, (err, result) => {
            if (err) {console.log('error', err)}
        });
    }
    await browser.close();
}

parseData();
