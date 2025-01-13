const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const Botly = require("botly");
const { gpt } = require("gpti"); // استيراد مكتبة gpti

const botly = new Botly({
    accessToken: process.env.PAGE_ACCESS_TOKEN,
    notificationType: Botly.CONST.REGULAR,
    FB_URL: "https://graph.facebook.com/v2.6/",
});

app.get("/", function (_req, res) {
    res.sendStatus(200);
});

/* ----- ESSENTIALS ----- */
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

/* ----- WEBHOOK HANDLER ----- */
app.post('/webhook', async (req, res) => {
    const event = req.body;

    // التعامل مع نوع الحدث
    if (event.type === "message") {
        let prompt = event.message.text;

        // استخدام مكتبة gpti
        let data = await gpt.v1({
            messages: [], // يمكن تعديل المحادثات السابقة هنا إذا لزم الأمر
            prompt: prompt,
            model: "GPT-4",
            markdown: false
        });

        botly.sendText({ id: event.sender.id, text: data.gpt }).catch(err => {
            console.error("Error sending message:", err);
        });

    } else if (event.type === "message_reply") {
        let prompt = `Message: "${event.message.text}"\n\nReplying to: ${event.message.reply_to.text}`;

        let data = await gpt.v1({
            messages: [], // يمكن تعديل المحادثات السابقة هنا أيضًا
            prompt: prompt,
            model: "GPT-4",
            markdown: false
        });

        botly.sendText({ id: event.sender.id, text: data.gpt }).catch(err => {
            console.error("Error sending reply:", err);
        });
    }

    res.sendStatus(200);
});

/* ----- START SERVER ----- */
app.listen(3000, () => console.log(`App is running on port 3000`));
