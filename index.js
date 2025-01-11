const express = require("express");
const app = express();
const Botly = require("botly");
const https = require("https");
const botly = new Botly({
    accessToken: process.env.PAGE_ACCESS_TOKEN,
    verifyToken: process.env.VERIFY_TOKEN,
    webHookPath: process.env.WB_PATH,
    notificationType: Botly.CONST.REGULAR,
    FB_URL: "https://graph.facebook.com/v13.0/"
});

function keepAppRunning() {
    setInterval(() => {
      https.get(`${process.env.RENDER_EXTERNAL_URL}/ping`, (resp) => {
        if (resp.statusCode === 200) {
          console.log('Ping successful');
        } else {
          console.error('Ping failed');
        }
      });
    }, 5 * 60 * 1000);
};

app.get("/", function (_req, res) { res.sendStatus(200); });

app.get('/ping', (req, res) => { res.status(200).json({ message: 'Ping successful' }); });

app.use(express.json({ verify: botly.getVerifySignature(process.env.APP_SECRET)}));
app.use(express.urlencoded({ extended: false }));

app.use("/webhook", botly.router());

botly.on("message", async (senderId, message, data) => {
    if (message.message.text) {
        
        botly.sendText({ id: senderId, text: "نص" });

    } else if (message.message.attachments[0].payload.sticker_id) {
        
       botly.sendText({ id: senderId, text: "ستيكر/ زر الاعجاب" });

    } else if (message.message.attachments[0].type == "image") {

        botly.sendText({ id: senderId, text: "صورة" });

    } else if (message.message.attachments[0].type == "audio") {

        botly.sendText({ id: senderId, text: "فوكال" });

    } else if (message.message.attachments[0].type == "video") {

        botly.sendText({ id: senderId, text: "فيديو" });

    }
});

botly.on("postback", async (senderId, message, postback, data, ref) => { /* Postback Payloads */});

app.listen(process.env.PORT, () => {
    console.log(`App is on port : ${process.env.PORT}`);
    keepAppRunning();
  });
