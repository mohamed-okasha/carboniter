
'use strict'

const config = require('./config')
const { WebClient } = require('@slack/web-api');
const { createEventAdapter } = require('@slack/events-api');

var fs = require('fs');
var request = require('request');
const puppeteer = require('puppeteer');
// Initialize using signing secret from environment variables


console.log(`ACCESS_TOKEN ${process.env.SLACK_SIGNING_SECRET}`);


const web = new WebClient(process.env.SLACK_TOKEN);

// Verify Url - https://api.slack.com/events/url_verification
function verify(data, callback) {
        if (data.token === process.env.APP_VERIFICATION_TOKEN) callback(null, data.challenge);
        else callback("verification failed");   
}


exports.handler = (data, context, callback) => {
        switch (data.type) {
                case "url_verification": verify(data, callback); break;
                //     case "event_callback": process(data.event, callback); break;
                default: callback(null);
        }
 };



const slackEvents = createEventAdapter(process.env.SLACK_SIGNING_SECRET);
const port = process.env.PORT || 3000;

// Attach listeners to events by Slack Event "type". See: https://api.slack.com/events/message.im
slackEvents.on('message', (event) => {
        if (!event.bot_id){
                if (event.blocks) {
                        let code = ''
                        for (const block of event.blocks) {
                                for (const element of block.elements) {
                                        if (element.type == 'rich_text' || element.type == 'rich_text_preformatted') {
                                                for (const inner_element of element.elements) {
                                                        code = code + inner_element.text;
                                                }
                                                get_image_box(event.channel, code.replace('#', '%23'));
                                        }   
                                }   
                        }          
                }
                
        }
                
});

// Handle errors (see `errorCodes` export)
slackEvents.on('error', console.error);

// Start a basic HTTP server
slackEvents.start(port).then(() => {
  // Listening on path '/slack/events' by default
        console.log(`server listening on port ${port}`);
});


async function get_image_box(channel_id, code) {

        const browser = await puppeteer.launch({
                args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                ],
        });

        const page = await browser.newPage();
        // Adjustments particular to this page to ensure we hit desktop breakpoint.
        page.setViewport({width: 800, height: 800, deviceScaleFactor: 5});
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

        request.post({
                url: 'https://slack.com/api/files.upload',
                headers: {
                        "Content-Type": "multipart/form-data"
                },
                formData: {
                token: process.env.SLACK_TOKEN,
                title: "Image",
                filename: 'image.png',
                filetype: "auto",
                channels: channel_id,
                file: fs.createReadStream('image.png'),
                },
        }, function (err, response) {
                console.log(JSON.parse(response.body));
        });

}