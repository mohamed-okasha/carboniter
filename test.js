'use strict'

const puppeteer = require('puppeteer');
const { createReadStream } = require('fs');
var fs = require('fs');

( async function () 
    { 
       let code = `hobbies = ["basketball", "football", "swimming"]

       print("My hobbies are:") %23 My hobbies are:
       print(", ".join(hobbies)) %23 basketball, football, swimming`;


        const browser = await puppeteer.launch({
            args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            ],
    });

    const page = await browser.newPage();
    // Adjustments particular to this page to ensure we hit desktop breakpoint.
    page.setViewport({width: 800, height: 1000, deviceScaleFactor: 16});
    var uri = "https://carbon.now.sh?code="+  code + "&l=python&pv=10px&ph=10px&fm=Monoid&fs=16.5px"
    var encoded_url = encodeURI(uri);
    await page.goto(encoded_url, {waitUntil: 'networkidle2'});
    /**
     * Takes a screenshot of a DOM element on the page, with optional padding.
     *
     * @param {!{path:string, selector:string, padding:(number|undefined)}=} opts
     * @return {!Promise<!Buffer>}
     */
    async function screenshotDOMElement(opts = {}) {
    const padding = 'padding' in opts ? opts.padding : 0;
    const path = 'path' in opts ? opts.path : null;
    const selector = opts.selector;

    if (!selector)
            throw Error('Please provide a selector.');

    const rect = await page.evaluate(selector => {
            const element = document.querySelector(selector);
            if (!element)
            return null;
            const {x, y, width, height} = element.getBoundingClientRect();
            return {left: x, top: y, width, height, id: element.id};
    }, selector);

    if (!rect)
            throw Error(`Could not find element that matches selector: ${selector}.`);

    return await page.screenshot({
                    path,
                    clip: {
                    x: rect.left - padding,
                    y: rect.top - padding,
                    width: rect.width + padding * 2,
                    height: rect.height + padding * 2
                    }
            });
    }

    await screenshotDOMElement({
            path: 'image.png',
            selector: "#export-container",
            padding: 0
    });

    browser.close();

    }
)();


