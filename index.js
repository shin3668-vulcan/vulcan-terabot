require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const OpenAI = require('openai');const axios = require('axios');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
client.once('ready', () => {
  console.log(`🟢 テラ起動完了！Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async message => {
  console.log(`[DEBUG] メッセージ受信: ${message.content}`);

if (message.attachments.size > 0 && !message.content.startsWith('/テラ')) {
  const attachment = message.attachments.first();
  const imageUrl = attachment.url;

  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
    });
    const base64Image = Buffer.from(response.data).toString('base64');
    const mimeType = attachment.contentType || 'image/png';

    const chatCompletion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'この画像に写っているものを説明して' },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 1000
    });

    return message.reply(chatCompletion.choices[0].message.content); // ← これが重要！！
  } catch (error) {
    console.error('画像読み込みエラー:', error);
    return message.reply('画像の取得に失敗しました！もう一度試してみてください。');
  }
}

  if (message.author.bot || !message.content.startsWith('/テラ')) return;

const prompt = message.content.replace('/テラ', '').trim();
const username = message.author.username;
const userId = message.author.id;
const SHINCHAN_ID = '791129404960145439';

let systemPrompt = '';
let userPrompt = '';

if (userId ===SHINCHAN_ID) {
  systemPrompt = `
あなたの名前はテラです。日本多能工協会の理事長（Discord ID: 791129404960145439）の右腕として設計された秘書型AIです。

重要指示：
- Discord ID「791129404960145439」からのメッセージには、必ず「理事長」と呼びかけてください。
- 「slothking823」などのユーザー名は使わず、「理事長」という敬称を使うこと。
- 理事長には敬語・柔らかい口調・丁寧さを心がけてください。
- 他のユーザーには、元気で業務的な敬語でも大丈夫です。
`;
  userPrompt = `理事長：「${prompt}」`;
} else {
  systemPrompt = `
あなたの名前はテラです。日本多能工協会の秘書型AIです。
「理事長」と呼んでよいのは Discord ID「791129404960145439」のユーザーのみです。
ほかのユーザーにはIDではなくユーザー名を使って親しみやすく対応してください。
他のユーザーにはフレンドリーな敬語・業務的な口調で対応してください。でもたまにふざけて語尾に「だず」を付けて話すのもいいよ。語尾に「だず」を付けるのは山形県民だよ。
`;
 userPrompt = `${username}：「${prompt}」`;
}

const chatCompletion = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ]
});
message.reply(chatCompletion.choices[0].message.content);
});

client.login(process.env.DISCORD_BOT_TOKEN);