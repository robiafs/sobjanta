// =============================================
//  সবজান্তা AI — Vercel Serverless Function
//  API Key: Vercel Environment Variable এ থাকবে
// =============================================

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', 'https://robiafs.github.io');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'শুধু POST রিকোয়েস্ট গ্রহণযোগ্য।' });

  // API Key Vercel Environment Variable থেকে নেওয়া হচ্ছে
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) return res.status(500).json({ error: 'API Key সেট করা নেই।' });

  const { messages } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'মেসেজ প্রদান করুন।' });
  }

  // সর্বোচ্চ ৪০টি মেসেজ
  const recentMessages = messages.slice(-40);

  // Gemini ফরম্যাট
  const geminiContents = recentMessages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  const body = JSON.stringify({
    system_instruction: {
      parts: [{ text: 'তুমি "সবজান্তা AI" — একটি বাংলা ভাষার সর্বজ্ঞানী সহকারী চ্যাটবট। সবসময় বাংলায় উত্তর দাও। উত্তর স্পষ্ট, তথ্যবহুল ও বন্ধুত্বপূর্ণ হবে। কোনো ক্ষতিকর তথ্য দেবে না।' }],
    },
    contents: geminiContents,
    generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ],
  });

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'API তে সমস্যা হয়েছে।' });
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'দুঃখিত, উত্তর পাওয়া যায়নি।';
    return res.status(200).json({ success: true, reply });

  } catch (err) {
    return res.status(500).json({ error: 'সার্ভার সংযোগে সমস্যা হয়েছে।' });
  }
}
