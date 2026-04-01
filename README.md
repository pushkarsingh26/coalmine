# Coal Mine Carbon Neutrality Dashboard  🏭 ➔ 🌱 ➔ 🌍

![License](https://img.shields.io/badge/license-ISC-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-green.svg)

> **A comprehensive sustainability platform designed to help coal mining operations transition towards carbon neutrality by tracking emissions, simulating mitigation pathways, trading carbon credits, and insuring assets.**

---

## 🌟 Key Features

### 📊 Real-Time Dashboard
- Monitor **Total Emissions**, **Carbon Sinks**, and **Net Emissions** in one centralized place.
- Visualize historical and present emissions via interactive charts built with **Chart.js**.

### 📉 Emission Input & Prediction
- **Activity Data Calculator**: Estimate baseline CO₂e emissions based on diesel usage, electricity consumption, and methane leakage.
- **Machine Learning Predictor**: Utilize an integrated linear regression model to predict next year's emissions based on production data, mine size, and estimated fuel usage.

### 🌳 Carbon Sinks & Sequestration
- Calculate total carbon captured through various methods including **Afforestation**, **Soil Carbon Enhancement**, **Wetland Restoration**, **Biochar Production**, and **Direct Air Capture (DAC)**.

### 🗺️ Interactive Map & Registry
- Integrated **Leaflet.js map** mapping major and minor coal mines across India.
- **Register New Mines**: Users can pin the precise location and upload data for emerging mining sites or local clusters.

### 💰 Carbon Credits & Auction House
- **Generate Credits**: Convert methane capture, EV transitions, and renewable energy generation into verifiable Carbon Credits.
- **Certificate Generation**: Instantly generate and download PDF certificates.
- **Auction House**: Live dynamic marketplace where mines can sell unutilized carbon credits to the highest bidders in real-time, instantly adding funds to their Wallet.

### 🏆 Achievement Badges (Gamified CSR)
- Contribute direct funds to global **Tree Plantation Efforts**.
- Unlock sustainability badges (**🥉 Bronze, 🥈 Silver, 🥇 Gold, 💎 Platinum**) as you hit new donation milestones.

### 🛡️ Insurance Center
- Ensure mining site resilience by purchasing policies covering:
  - **Operations Failure**
  - **Vehicle & Transport Insurance**
  - **Solar & Fire Protection**
- Easily track active policies, remaining validity days, and total premium spend.

### 🤖 Smart Help Assistant
- An integrated AI Chatbot (powered by **OpenAI / HuggingFace API**) capable of answering advanced questions about neutralization pathways, credit trading mechanics, and mine information. Includes Voice-to-Text and TTS capabilities!

---

## 🛠️ Tech Stack

**Frontend:**
- HTML5, CSS3, Vanilla JavaScript
- **Chart.js** for interactive data representation
- **Leaflet.js** for mapping and geolocation
- **jsPDF** & **html2canvas** for generating PDF Reports

**Backend:**
- **Node.js** & **Express.js** for RESTful API routing
- **Nodemailer** for SMTP-based OTP generation & email verification
- **cors** & **body-parser** for middleware integration
- **dotenv** for environment variable management

---

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) installed on your machine.

### 2. Installation
Clone this repository and install the required dependencies:

```bash
git clone https://github.com/pushkarsingh26/coalmined.git
cd coalmined
npm install
```

### 3. Environment Setup
Create a `.env` file in the root directory and configure the following optional keys based on what features you plan to use:

```env
# Server Port (Default is 3000)
PORT=3000

# Nodemailer setup (For OTP System)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com

# AI Chatbot setup (Choose one)
OPENAI_API_KEY=your-openai-api-key
# OR
HF_API_URL=https://api-inference.huggingface.co/models/...
HF_API_KEY=your-huggingface-api-key
```

### 4. Running the Application
Start the Node.js server:

```bash
npm start
```

The server will safely run on `http://localhost:3000`. Open this address in your browser to interact with the Dashboard.

---

## 👨‍💻 Author
**Pushkar Chhokar** *(Maintainer & Developer)*
