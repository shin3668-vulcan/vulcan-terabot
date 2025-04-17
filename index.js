require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const OpenAI = require('openai');
const axios = require('axios');

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

const chatHistories = {}; // 🔁 ユーザーごとの会話履歴
const MAX_HISTORY = 20;

client.once('ready', () => {
  console.log(`🟢 テラ起動完了！Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async message => {
  console.log(`[DEBUG] メッセージ受信: ${message.content}`);

  if (message.author.bot) return;

  // ✅ 画像認識処理（テキストなしで画像のみアップ）
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
        model: 'gpt-4-vision-preview', // ←画像認識にはこのモデルが必須！
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

      return message.reply(chatCompletion.choices[0].message.content);
    } catch (error) {
      console.error('画像読み込みエラー:', error);
      return message.reply('画像の取得に失敗しました！もう一度試してみてください。');
    }
  }

  // ✅ テキストコマンド処理
  if (!message.content.startsWith('/テラ')) return;

  const prompt = message.content.replace('/テラ', '').trim();
  const username = message.author.username;
  const userId = message.author.id;
  const SHINCHAN_ID = '791129404960145439';

  let systemPrompt = '';
  let userPrompt = '';

  if (userId === SHINCHAN_ID) {
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
他のユーザーにはIDではなくユーザー名で親しみやすく対応してください。
他のユーザーにはフレンドリーな敬語・業務的な口調で対応してください。
たまにふざけて語尾に「〜だず」を付けてもOKです。
`;
    userPrompt = `${username}：「${prompt}」`;
  }

  // ✅ ユーザーごとの履歴初期化
  if (!chatHistories[userId]) {
    chatHistories[userId] = [];
  }
  const userHistory = chatHistories[userId];

  const messages = [
    { role: 'system', content: systemPrompt },
    ...userHistory,
    { role: 'user', content: userPrompt }
  ];

  try {
    const chatCompletion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: messages
    });

    const assistantReply = chatCompletion.choices[0].message.content;
    await message.reply(assistantReply);

    // 履歴保存
    userHistory.push({ role: 'user', content: userPrompt });
    userHistory.push({ role: 'assistant', content: assistantReply });

    // 履歴が長すぎたら切り詰め
    if (userHistory.length > MAX_HISTORY * 2) {
      userHistory.splice(0, userHistory.length - MAX_HISTORY * 2);
    }

  } catch (error) {
    console.error('ChatGPT応答エラー:', error);
    return message.reply('応答に失敗しました。もう一度試してみてください。');
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
