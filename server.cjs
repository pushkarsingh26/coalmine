require('dotenv').config(); // Load .env file

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
// allow larger payloads for base64 PDF upload (keep just in case large payloads are used elsewhere)
app.use(bodyParser.json({ limit: '25mb' }));
app.use(express.static('.'));

// Redirect root to index.html (change to login.html if you have one)
app.get('/', (req, res) => {
  res.redirect('/index.html');
});

// Simple in-memory OTP store (identifier => { otp, expiresAt })
const otps = {};

// Helper: send OTP via email using nodemailer if SMTP is configured
let mailerTransporter = null;
try {
  const nodemailer = require('nodemailer');
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    mailerTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: (process.env.SMTP_SECURE === 'true'),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    // Verify transporter early so auth errors surface on startup instead of only at send time
    mailerTransporter.verify().then(() => {
      console.log('✅ SMTP transporter verified (ready to send emails)');
    }).catch((err) => {
      console.warn('⚠️ SMTP transporter verification failed. Email send will likely fail.');
      console.warn('SMTP verify error:', err && err.message ? err.message : err);
    });
  }
} catch (e) {
  console.warn('nodemailer not available; email OTP will not work unless nodemailer is installed.');
}

// Endpoint: send OTP to email (requires SMTP env vars) — POST { method: 'email'|'phone', identifier, username }
app.post('/api/send-otp', async (req, res) => {
  try {
    const { method, identifier, username } = req.body || {};
    if (!method || !identifier) return res.status(400).json({ error: 'Missing method or identifier' });

    // create 6-digit OTP and store for 5 minutes
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const key = String(identifier).toLowerCase();
    otps[key] = { otp, expiresAt: Date.now() + 5*60*1000, username };
    console.log(`[DEBUG] OTP for ${key} is ${otp}`); // for testing without email

    if (method === 'email') {
      if (!mailerTransporter) return res.status(501).json({ error: 'Email not configured on server. Set SMTP_HOST, SMTP_USER and SMTP_PASS.' });
      // send mail with robust error handling
      try {
        await mailerTransporter.sendMail({
          from: process.env.EMAIL_FROM || process.env.SMTP_USER,
          to: identifier,
          subject: 'Your verification OTP',
          text: `Your verification code is: ${otp}. It expires in 5 minutes.`
        });
        return res.json({ ok: true });
      } catch (sendErr) {
        console.error('send-otp sendMail error:', sendErr);
        // Provide helpful guidance for common SMTP issues
        const msg = (sendErr && sendErr.message) ? sendErr.message : String(sendErr);
        // For Gmail/SMTP auth failure, return a specific hint
        if (/Auth|Invalid login|535|Authentication failed/i.test(msg)) {
          return res.status(502).json({ error: 'SMTP authentication failed. Check SMTP_USER / SMTP_PASS (use provider app password) and SMTP settings.' });
        }
        return res.status(502).json({ error: 'Failed to send email via SMTP: ' + msg });
      }
    }

    // phone (SMS) not implemented on server — return 501 with guidance
    return res.status(501).json({ error: 'SMS OTP not configured. Provide a server SMS gateway or use email verification.' });
  } catch (err) {
    console.error('send-otp error', err);
    return res.status(500).json({ error: (err && err.message) ? err.message : 'Internal error' });
  }
});

// Endpoint: verify OTP — POST { identifier, otp }
app.post('/api/verify-otp', (req, res) => {
  try {
    const { identifier, otp } = req.body || {};
    if (!identifier || !otp) return res.status(400).json({ error: 'Missing identifier or otp' });
    const key = String(identifier).toLowerCase();
    const rec = otps[key];
    if (!rec) return res.status(400).json({ error: 'No OTP requested for this identifier' });
    if (Date.now() > rec.expiresAt) { delete otps[key]; return res.status(400).json({ error: 'OTP expired' }); }
    if (rec.otp !== String(otp).trim()) return res.status(400).json({ error: 'Incorrect OTP' });
    // success — consume
    delete otps[key];
    return res.json({ ok: true });
  } catch (err) {
    console.error('verify-otp error', err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// --- SEND RESET OTP ---
// POST { identifier }
app.post('/api/send-reset-otp', async (req, res) => {
  try {
    const { identifier } = req.body || {};
    if (!identifier) return res.status(400).json({ error: 'Missing email' });

    const email = String(identifier).toLowerCase();
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // store OTP for 5 minutes
    otps[email] = { otp, expiresAt: Date.now() + 5 * 60 * 1000 };

    if (!mailerTransporter) return res.status(501).json({ error: 'Email not configured' });

    await mailerTransporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to: email,
      subject: 'Your Password Reset OTP',
      text: `Your reset password OTP is: ${otp}. It expires in 5 minutes.`
    });

    return res.json({ message: 'OTP sent successfully!' });
  } catch (error) {
    console.error('reset-otp error', error);
    return res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// --- RESET PASSWORD ---
// POST { identifier, otp, newPassword }
app.post('/api/reset-password', (req, res) => {
  try {
    const { identifier, otp, newPassword } = req.body || {};
    if (!identifier || !otp || !newPassword) return res.status(400).json({ error: 'Missing fields' });

    const email = String(identifier).toLowerCase();
    const record = otps[email];

    if (!record) return res.status(400).json({ error: 'OTP not found' });
    if (Date.now() > record.expiresAt) return res.status(400).json({ error: 'OTP expired' });
    if (record.otp !== String(otp).trim()) return res.status(400).json({ error: 'Invalid OTP' });

    // OTP correct → consume and allow client to update password
    delete otps[email];
    return res.json({ message: 'Password reset successful!' });
  } catch (err) {
    console.error('reset-password error', err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// Help Response Function for Dashboard Sections
function getHelpResponse(message) {
  const msg = message.toLowerCase();

  // Auction House
  if (msg.includes("auction") || msg.includes("sell") || msg.includes("market price")) {
    return `
📦 Auction House Help
• Sell your carbon credits at the latest market price.
• Money from sales goes directly into your Wallet.
• Auction history shows previous sales.
• Prices auto-update every few seconds.
    `;
  }

  // Carbon Credits
  if (msg.includes("carbon") || msg.includes("credits")) {
    return `
🌱 Carbon Credits Help
Carbon credits are awarded for:
• Renewable energy use
• Methane capture
• EV adoption
• Tree plantation
• Reduced emissions
You can sell these credits in the Auction House or use them for achievements.
    `;
  }

  // Achievements / Badges
  if (msg.includes("achievement") || msg.includes("badge") || msg.includes("level")) {
    return `
🏅 Achievements Help
You unlock badges based on your donation total:
🥉 Bronze — ₹1,00,000+
🥈 Silver — ₹5,00,000+
🥇 Gold — ₹10,00,000+
💎 Platinum — ₹25,00,000+
Badges reflect your sustainability contribution.
    `;
  }

  // Insurance Center
  if (msg.includes("insurance") || msg.includes("policy") || msg.includes("premium")) {
    return `
🛡 Insurance Center Help
Available mine insurance types:
1️⃣ Operational Failure Insurance  
2️⃣ Vehicle & Transport Insurance  
3️⃣ Solar & Fire Protection Insurance  
• Validity: 1 year from purchase
• Premium deducted from Wallet
• Each mine buys its own policies
    `;
  }

  // Wallet
  if (msg.includes("wallet") || msg.includes("money") || msg.includes("balance")) {
    return `
💰 Wallet Help
Your wallet is used for:
• Buying insurance
• Donating for tree plantation
• Receiving money from carbon credit sales
The wallet updates automatically after each transaction.
    `;
  }

  // Neutrality Pathway
  if (msg.includes("neutral") || msg.includes("pathway") || msg.includes("climate")) {
    return `
🌍 Carbon Neutrality Pathway Help
Shows how your mine can become carbon-neutral:
• Renewable energy impact
• Methane reduction
• EV contribution
• Tree plantation carbon absorption
Use the sliders and timeline to explore improvements.
    `;
  }

  // Mine Information
  if (msg.includes("mine info") || msg.includes("major") || msg.includes("minor") || msg.includes("overview")) {
    return `
⛏ Mine Information Help
Includes details about:
• Major coal mines in India
• Minor/Emerging coal mines
• National coal sector overview
• Carbon neutrality insights
Tap on each heading to expand more details.
    `;
  }

  // Default fallback
  return `
🤖 I am your Help Assistant!
Ask me about:
• Auction House
• Carbon Credits
• Achievements & Badges
• Insurance
• Wallet
• Neutrality Pathway
• Mine Information
    `;
}

// Chatbot API — richer responses for afforestation, major/minor mines, etc.
app.post('/api/chat', async (req, res) => {
  const raw = (req.body.message || '').toString();
  const msg = raw.trim();

  if (!msg) return res.status(400).json({ reply: 'Please provide a message.' });

  // Try OpenAI first (if OPENAI_API_KEY is set), otherwise try Hugging Face inference (if HF_API_URL+HF_API_KEY set), otherwise fallback to static replies
  try {
    if (process.env.OPENAI_API_KEY) {
      // call OpenAI Chat Completions directly (no external deps)
      const payload = {
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful assistant that answers questions about coal mines, emissions, and carbon neutrality in a concise, actionable style.' },
          { role: 'user', content: msg }
        ],
        temperature: 0.2,
        max_tokens: 400
      };

      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify(payload)
      });

      const data = await resp.json();
      const reply = data?.choices?.[0]?.message?.content?.trim() || 'Sorry, I could not generate a reply.';
      return res.json({ reply });
    }

    if (process.env.HF_API_URL && process.env.HF_API_KEY) {
      // Hugging Face Inference API
      const hfResp = await fetch(process.env.HF_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.HF_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ inputs: msg })
      });
      const hfData = await hfResp.json();
      let reply = '';
      if (typeof hfData === 'string') reply = hfData;
      else if (Array.isArray(hfData) && hfData[0] && hfData[0].generated_text) reply = hfData[0].generated_text;
      else if (hfData.error) reply = 'Model error: ' + hfData.error;
      else reply = JSON.stringify(hfData).slice(0, 800);
      return res.json({ reply });
    }

    // Fallback deterministic responses (previous behavior)
    const lower = msg.toLowerCase();
    const majorMines = [
      'Jharia Coalfield (Jharkhand) — one of India\'s oldest and largest; known for underground fires and land subsidence; active reclamation & methane mitigation projects.',
      'Korba Coalfield (Chhattisgarh) — large thermal coal producer; ongoing renewable integration and air-quality mitigation programs.',
      'Raniganj Coalfield (West Bengal) — significant production with reclamation and afforestation pilots.',
      'Singareni Collieries (Telangana) — state-owned operations with progressive renewable and electrification adoption.',
      'Talcher Coalfield (Odisha) — high-output basin with pilots for methane capture and large-scale restoration.',
      'Dhanbad Region (Jharkhand) — multiple collieries with focus on mine-closure planning and methane management.'
    ];

    const minorMines = [
      'Umaria Mines (Madhya Pradesh) — smaller operations, high potential for pilot projects (biochar, soil carbon).',
      'Amgaon (Chhattisgarh) — localized mining with community afforestation opportunities.',
      'Amera (Chhattisgarh) — smaller leaseholds suitable for soil carbon enhancement and native-species planting.',
      'Local private/quasi-small collieries — often ideal for community-led restoration and MRV pilots.'
    ];

    const auction = [
      '**Auction House Help**',
      'Here you can **sell your carbon credits** at the current market price.',
      '✔ Prices update every few seconds',
      '✔ You can sell any amount of credits you currently own',  
      '✔ Sale value is added directly to your **Wallet**',
      '✔ You can see your past sales in “Auction History”',
      'If you need help deciding when to sell, I can guide you!' 
    ].join(' ');

    const afforestationInfo = [
      'Afforestation / Reforestation — Typical sequestration: ~6–8 tCO₂e per hectare per year (varies by species, soil and climate).',
      'Benefits: carbon removal, biodiversity recovery, erosion control, local livelihoods, and improved watershed health.',
      'Implementation steps: site assessment → native species selection → planting & maintenance → monitoring & MRV for credits.',
      'Relevant programs in India: CAMPA (Compensatory Afforestation), Green India Mission, state afforestation schemes and mine-closure guidelines that require reclamation.'
    ].join(' ');

    if (lower.includes('list major') || (lower.includes('major') && lower.includes('mine'))) {
      return res.json({ reply: 'Major mines in India: ' + majorMines.join(' | ') });
    } else if (lower.includes('list minor') || (lower.includes('minor') && lower.includes('mine'))) {
      return res.json({ reply: 'Minor / smaller mines: ' + minorMines.join(' | ') });
    } else if (lower.includes('afforestation') || lower.includes('reforest') || lower.includes('reforestation')) {
      return res.json({ reply: afforestationInfo });
    } else if (lower.includes('emission')) {
      return res.json({ reply: 'Emissions are calculated based on diesel, electricity, and methane inputs. Use the Emission Input section to estimate total CO₂e.' });
    } else if (lower.includes('sink')) {
      return res.json({ reply: 'Carbon sinks store CO₂ through afforestation, soil enhancement, wetlands restoration, biochar and DAC. Use Carbon Sinks to estimate sequestration.' });
    } else if (lower.includes('neutral')) {
      return res.json({ reply: 'Carbon neutrality means balancing emissions and removals. Pathways combine energy transition, efficiency, methane control, and sinks to reach net-zero.' });
    } else if (lower.includes('credit')) {
      return res.json({ reply: 'Carbon credits represent verifiable emission reductions or removals; mines can generate credits from reclamation, afforestation and methane capture when properly monitored and verified.' });
    } else if (lower.includes('about mines')) {
      return res.json({ reply: 'A coal mine is a site where coal is extracted from the earth, either from deep underground tunnels or from surface-level pits. These operations are used to get coal for energy generation and industrial processes like steel and cement production.  ' });
    } else if (lower.includes('hello') || lower.includes('hi') || lower.includes('namaste')) {
      return res.json({ reply: 'Namaste! , How can I help you with carbon data, afforestation, or mine information?' });
    } else if (lower.includes('auction') || lower.includes('sell credits') || lower.includes('selling')) {
      return res.json({ reply: auction });
    }

    // Check help system responses before falling back
    const helpReply = getHelpResponse(msg);
    if (!helpReply.includes('I am your Help Assistant!')) {
      return res.json({ reply: helpReply });
    }

    return res.json({ reply: "I didn't fully understand. Try: 'afforestation details', 'list major mines', 'list minor mines', or ask about emissions/sinks." });
  } catch (err) {
    console.error('Chat handler error', err);
    return res.status(500).json({ reply: 'Server error: ' + (err.message || String(err)) });
  }
});

// Chatbox API with Help System
app.post('/api/chatbox', (req, res) => {
  const userMessage = req.body.message || "";
  const reply = getHelpResponse(userMessage);
  res.json({ reply });
});

// Start server with a small port-fallback in case the default port is already in use.
const DEFAULT_PORT = Number(process.env.PORT) || 3000;
function startServer(port, attemptsLeft = 5) {
  const server = app.listen(port, () => console.log(`✅ Server running at http://localhost:${port}`));
  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE' && attemptsLeft > 0) {
      console.warn(`Port ${port} in use — trying ${port + 1} (${attemptsLeft - 1} attempts left)`);
      setTimeout(() => startServer(port + 1, attemptsLeft - 1), 300);
    } else {
      console.error('Server failed to start:', err);
      process.exit(1);
    }
  });
}

startServer(DEFAULT_PORT, 8);

// NOTE: Email/report endpoint (Nodemailer) intentionally removed to avoid runtime 'module not found' errors.
