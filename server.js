require('dotenv').config(); // Load .env file
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');


const app = express();
app.use(cors());
// allow larger payloads for base64 PDF upload (keep just in case large payloads are used elsewhere)
app.use(bodyParser.json({ limit: '25mb' }));
app.use(express.static('.'));

// Redirect root to index.html (change to login.html if you have one)
app.get("/", (req, res) => {
  res.redirect("/index.html");
});

// --- OTP and Password Reset ---

// Simple in-memory OTP store (identifier => { otp, expiresAt })
const otpStore = {};

// Helper: send OTP via email using nodemailer if SMTP is configured
let mailerTransporter = null;
try {
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
  }
} catch (e) {
  console.warn('Nodemailer not available; email OTP will not work unless nodemailer is installed.');
}

// Endpoint: send OTP to email (requires SMTP env vars) — POST { identifier, username }
app.post('/api/send-otp', async (req, res) => {
  try {
    const { identifier, username } = req.body || {};
    const method = 'email'; // Always use email
    if (!method || !identifier) return res.status(400).json({ error: 'Missing method or identifier' });

    // create 6-digit OTP and store for 5 minutes
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const key = String(identifier).toLowerCase();
    otpStore[key] = { otp, expiresAt: Date.now() + 5 * 60 * 1000, username };

    if (!mailerTransporter) return res.status(501).json({ error: 'Email not configured on server. Set SMTP_HOST, SMTP_USER and SMTP_PASS.' });
    // send mail
    await mailerTransporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to: identifier,
      subject: 'Your verification OTP',
      text: `Your verification code is: ${otp}. It expires in 5 minutes.`
    });
    return res.json({ ok: true });

  } catch (err) {
    console.error('send-otp error', err);
    return res.status(500).json({ error: (err && err.message) ? err.message : 'Internal error' });
  }
});

// Endpoint: verify OTP — POST { identifier, otp }
app.post('/api/verify-otp', (req, res) => {
  const { identifier, otp } = req.body || {};
  if (!identifier || !otp) return res.status(400).json({ error: 'Missing identifier or otp' });
  const key = String(identifier).toLowerCase();
  const rec = otpStore[key];
  if (!rec) return res.status(400).json({ error: 'No OTP requested for this identifier' });
  if (Date.now() > rec.expiresAt) { delete otpStore[key]; return res.status(400).json({ error: 'OTP expired' }); }
  if (rec.otp !== String(otp).trim()) return res.status(400).json({ error: 'Incorrect OTP' });
  // success — consume
  delete otpStore[key];
  return res.json({ ok: true });
});

// --- Password Reset Routes ---

// Send Reset OTP
app.post('/api/send-reset-otp', async (req, res) => {
  const { identifier } = req.body || {};
  // The frontend was simplified to only use email, so we can check for it.
  if (!identifier) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  // Use the same otpStore as registration
  otpStore[identifier.toLowerCase()] = { otp, expiresAt: Date.now() + 10 * 60 * 1000 };

  if (!mailerTransporter) {
    return res.status(501).json({ error: 'Email not configured on server.' });
  }

  try {
    await mailerTransporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to: identifier,
      subject: 'Your Password Reset OTP',
      text: `Your OTP for password reset is ${otp}. It expires in 10 minutes.`,
    });
    res.json({ message: 'OTP sent successfully to your email.' });
  } catch (err) {
    console.error('Error sending reset OTP:', err);
    res.status(500).json({ error: 'Failed to send reset OTP.' });
  }
});

// Reset Password
app.post('/api/reset-password', async (req, res) => {
  const { identifier, otp, newPassword } = req.body || {};
  if (!identifier || !otp || !newPassword) {
    return res.status(400).json({ error: 'Missing fields.' });
  }

  const record = otpStore[identifier.toLowerCase()];
  if (!record) return res.status(400).json({ error: 'No OTP requested or it has expired.' });
  if (Date.now() > record.expiresAt) {
    delete otpStore[identifier.toLowerCase()];
    return res.status(400).json({ error: 'OTP expired.' });
  }
  if (record.otp !== otp) return res.status(400).json({ error: 'Invalid OTP.' });

  delete otpStore[identifier.toLowerCase()];

  // IMPORTANT: The actual password update happens on the client-side in localStorage.
  // This endpoint just confirms the OTP is valid and sends a success response.
  res.json({ message: 'Password reset successful! Please log in again.' });
});

// Chatbot API — richer responses for afforestation, major/minor mines, etc.
app.post("/api/chat", (req, res) => {
  const msg = (req.body.message || "").toLowerCase().trim();
  let reply = "I'm here to assist with carbon neutrality data.";

  const majorMines = [
    "Jharia Coalfield (Jharkhand) — one of India's oldest and largest; known for underground fires and land subsidence; active reclamation & methane mitigation projects.",
    "Korba Coalfield (Chhattisgarh) — large thermal coal producer; ongoing renewable integration and air-quality mitigation programs.",
    "Raniganj Coalfield (West Bengal) — significant production with reclamation and afforestation pilots.",
    "Singareni Collieries (Telangana) — state-owned operations with progressive renewable and electrification adoption.",
    "Talcher Coalfield (Odisha) — high-output basin with pilots for methane capture and large-scale restoration.",
    "Dhanbad Region (Jharkhand) — multiple collieries with focus on mine-closure planning and methane management."
  ];

  const auction = [
    '**Auction House Help**',
    "Here you can **sell your carbon credits** at the current market price.",
    "✔ Prices update every few seconds",
    "✔ You can sell any amount of credits you currently own",  
    "✔ Sale value is added directly to your **Wallet**",
    "✔ You can see your past sales in “Auction History”",
    "If you need help deciding when to sell, I can guide you!" 
  ].join(" ");

  const minorMines = [
    "Umaria Mines (Madhya Pradesh) — smaller operations, high potential for pilot projects (biochar, soil carbon).",
    "Amgaon (Chhattisgarh) — localized mining with community afforestation opportunities.",
    "Amera (Chhattisgarh) — smaller leaseholds suitable for soil carbon enhancement and native-species planting.",
    "Local private/quasi-small collieries — often ideal for community-led restoration and MRV pilots."
  ];

  const afforestationInfo = [
    "Afforestation / Reforestation — Typical sequestration: ~6–8 tCO₂e per hectare per year (varies by species, soil and climate).",
    "Benefits: carbon removal, biodiversity recovery, erosion control, local livelihoods, and improved watershed health.",
    "Implementation steps: site assessment → native species selection → planting & maintenance → monitoring & MRV for credits.",
    "Relevant programs in India: CAMPA (Compensatory Afforestation), Green India Mission, state afforestation schemes and mine-closure guidelines that require reclamation."
  ].join(" ");

  // helper to check multiple keywords
  const includesAny = (s, arr) => arr.some(k => s.includes(k));

  // Specific mine queries and afforestation queries
  if (msg.includes("list major") || (msg.includes("major") && msg.includes("mine"))) {
    reply = "Major mines in India: " + majorMines.join(" | ");
  } else if (msg.includes("list minor") || (msg.includes("minor") && msg.includes("mine"))) {
    reply = "Minor / smaller mines: " + minorMines.join(" | ");
  } else if (msg.includes("major mines") || (msg.includes("major") && msg.includes("mines"))) {
    reply = "Major mines: " + majorMines.join(" | ");
  } else if (msg.includes("minor mines") || (msg.includes("minor") && msg.includes("mines"))) {
    reply = "Minor mines: " + minorMines.join(" | ");
  } else if (msg.includes("jharia") || msg.includes("jharia coalfield")) {
    reply = "Jharia Coalfield: long history of underground fires, land subsidence; reclamation focuses on fire control, methane capture and community resettlement.";
  } else if (msg.includes("korba")) {
    reply = "Korba: major thermal coal basin in Chhattisgarh; large employers, now integrating renewables and air-quality measures.";
  } else if (msg.includes("raniganj")) {
    reply = "Raniganj: historic coalfield with ongoing efforts for land restoration and renewable integration.";
  } else if (includesAny(msg, ["afforestation", "reforest", "reforestation"])) {
    reply = afforestationInfo;
  } else if (includesAny(msg, ["afforestation details", "afforestation info", "afforestation programmes", "afforestation programs"])) {
    reply = afforestationInfo;
  } else if (msg.includes("emission")) {
    reply = "Emissions are calculated based on diesel, electricity, and methane inputs. Use the Emission Input section to estimate total CO₂e.";
  } else if (msg.includes("sink")) {
    reply = "Carbon sinks store CO₂ through afforestation, soil enhancement, wetlands restoration, biochar and DAC. Use Carbon Sinks to estimate sequestration.";
  } else if (msg.includes("neutral")) {
    reply = "Carbon neutrality means balancing emissions and removals. Pathways combine energy transition, efficiency, methane control, and sinks to reach net-zero.";
  } else if (msg.includes("credit")) {
    reply = "Carbon credits represent verifiable emission reductions or removals; mines can generate credits from reclamation, afforestation and methane capture when properly monitored and verified.";
  } else if (msg.includes("hello") || msg.includes("hi") || msg.includes("namaste")) {
    reply = "Namaste! How can I help you with carbon data, afforestation, or mine information?";
  }else if (lower.includes('auction') || lower.includes('sell credits') || lower.includes('selling')) {
    return res.json({ reply: auction });
  } else if (msg.length > 0) {
    // fallback with helpful prompt
    reply = "I didn't fully understand. Try: 'afforestation details', 'list major mines', 'list minor mines', or ask about emissions/sinks.";
  }

  res.json({ reply });
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

// Chatbox API with Help System
app.post('/api/chatbox', (req, res) => {
  const userMessage = req.body.message || "";
  const reply = getHelpResponse(userMessage);
  res.json({ reply });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));