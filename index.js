const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const Botly = require("botly");
const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");

// إعداد Supabase
const supabase = createClient(process.env.SB_URL, process.env.SB_KEY, { auth: { persistSession: false } });

// إعداد Botly
const botly = new Botly({
  accessToken: process.env.PAGE_ACCESS_TOKEN,
  notificationType: Botly.CONST.REGULAR,
  FB_URL: "https://graph.facebook.com/v2.6/",
});

// إعداد الخادم
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.get("/", (_req, res) => {
  res.sendStatus(200);
});

// دالة الاتصال بـ GPT من خلال RapidAPI
async function chat(messages) {
  const apikey = require("./apikey.json");
  const token = apikey[Math.floor(Math.random() * apikey.length)];
  const key = token.token[Math.floor(Math.random() * token.token.length)];

  const options = {
    method: "POST",
    url: "https://chatgpt-vision1.p.rapidapi.com/",
    headers: {
      "content-type": "application/json",
      "X-RapidAPI-Key": key,
      "X-RapidAPI-Host": "chatgpt-vision1.p.rapidapi.com",
    },
    data: { messages },
  };

  try {
    const response = await axios.request(options);
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("Error fetching GPT response:", error.message);
    throw new Error("GPT API request failed");
  }
}

// دوال قاعدة البيانات
async function createUser(user) {
  const { data, error } = await supabase.from("users").insert([user]);

  if (error) {
    throw new Error("Error creating user:", error);
  }
  return data;
}

async function updateUser(id, update) {
  const { data, error } = await supabase.from("users").update(update).eq("uid", id);

  if (error) {
    throw new Error("Error updating user:", error);
  }
  return data;
}

async function userDb(userId) {
  const { data, error } = await supabase.from("users").select("*").eq("uid", userId);

  if (error) {
    console.error("Error checking user:", error);
  }
  return data;
}

// دالة تقسيم النصوص إلى أجزاء صغيرة
function splitTextIntoChunks(text, chunkSize) {
  const words = text.split(" ");
  const chunks = [];
  let currentChunk = "";

  for (const word of words) {
    if (currentChunk.length + word.length + 1 <= chunkSize) {
      if (currentChunk) currentChunk += " ";
      currentChunk += word;
    } else {
      chunks.push(currentChunk);
      currentChunk = word;
    }
  }
  if (currentChunk) chunks.push(currentChunk);
  return chunks;
}

// معالجة الرسائل
const onMessage = async (senderId, message) => {
  if (message.message.text) {
    const userMessage = message.message.text;
    botly.sendAction({ id: senderId, action: Botly.CONST.ACTION_TYPES.TYPING_ON });

    try {
      const userHistory = await userDb(senderId);
      let messages = [
        { role: "system", content: "مرحبًا! أنا هنا للمساعدة. كيف يمكنني مساعدتك؟" },
        { role: "user", content: userMessage },
      ];

      if (userHistory[0]) {
        messages = [...userHistory[0].data, { role: "user", content: userMessage }];
      }

      const gptResponse = await chat(messages);

      const updatedHistory = [...messages, { role: "assistant", content: gptResponse }];
      await updateUser(senderId, { time: Date.now() + 3600000, data: updatedHistory });

      if (gptResponse.length > 2000) {
        const textChunks = splitTextIntoChunks(gptResponse, 1600);
        for (const chunk of textChunks) {
          botly.sendText({
            id: senderId,
            text: chunk,
            quick_replies: [botly.createQuickReply("👍", "up"), botly.createQuickReply("👎", "down")],
          });
        }
      } else {
        botly.sendText({
          id: senderId,
          text: gptResponse,
          quick_replies: [botly.createQuickReply("👍", "up"), botly.createQuickReply("👎", "down")],
        });
      }
    } catch (error) {
      botly.sendText({ id: senderId, text: "حدث خطأ أثناء معالجة طلبك. حاول مرة أخرى لاحقًا." });
      console.error(error);
    } finally {
      botly.sendAction({ id: senderId, action: Botly.CONST.ACTION_TYPES.TYPING_OFF });
    }
  }
};

// معالجة الردود السريعة أو الأحداث الأخرى
const onPostBack = async (senderId, message, postback) => {
  if (postback === "up" || postback === "down") {
    botly.sendText({ id: senderId, text: "شكرا لترك التقييم ♥" });
  }
};

// نقطة نهاية الـ Webhook
app.post("/webhook", (req, res) => {
  if (req.body.message) {
    onMessage(req.body.message.sender.id, req.body.message);
  } else if (req.body.postback) {
    onPostBack(req.body.postback.message.sender.id, req.body.postback.message, req.body.postback.postback);
  }
  res.sendStatus(200);
});

// تشغيل الخادم
app.listen(3000, () => console.log("App is running on port 3000"));
