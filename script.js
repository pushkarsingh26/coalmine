document.addEventListener("DOMContentLoaded", () => {


  // Ensure `links` and `sections` are defined so early navigation wiring doesn't throw
  const links = Array.from(document.querySelectorAll('.sidebar a, nav a, .nav-link')) || [];
  const sections = Array.from(document.querySelectorAll('main > .container, section, .container')) || [];

  // 1️⃣ LOGIN CHECK
  if (localStorage.getItem("isLoggedIn") !== "true") {
    window.location.href = "login.html";
    return;
  }

  // ✅ LOGOUT BUTTON FUNCTIONALITY
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("isLoggedIn");
      window.location.href = "login.html";
    });
  }

  // One-time wallet reset: set to 0 only if not already reset once
  try {
    if (!localStorage.getItem('wallet_reset_done')) {
      setWallet(0);
      localStorage.setItem('wallet_reset_done', 'true');
    }
    // Attempt to migrate global wallet to per-mine on startup
    setTimeout(() => {
      migrateGlobalWalletIfNeeded();
      updateWalletDisplay();
      renderMineWalletTable(); // Render mine wallet table on load
    }, 500);
  } catch (e) { /* ignore wallet reset errors */ }

  links.forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      links.forEach(l => l.classList.remove("active"));
      link.classList.add("active");

      sections.forEach(s => s.classList.remove("active-section"));
      document.querySelector(link.getAttribute("href")).classList.add("active-section");

      // If the mine-map section was opened, schedule Leaflet to recalc the map size
      try {
        if (link.getAttribute("href") === '#mine-map') {
          try { scheduleInvalidateIndiaMap(); } catch(e){ /* ignore */ }
        }
      } catch (err) { /* ignore */ }
    });
  });

  // ---------------- Advanced Features Integration ----------------
  // Hamburger submenu toggle
  try {
    const hamburgerIcon = document.querySelector('.hamburger-icon');
    const hamburgerMenu = document.querySelector('.hamburger-menu');
    // timers for staggered reveal
    let _advTimers = [];
    function clearAdvTimers(){ _advTimers.forEach(t=>clearTimeout(t)); _advTimers = []; }
    function revealAdvancedOptions(open){
      const items = Array.from(hamburgerMenu.querySelectorAll('.submenu li'));
      if (!open) {
        // closing: remove show immediately and clear timers
        clearAdvTimers();
        items.forEach(li => li.classList.remove('show'));
        hamburgerMenu.classList.remove('open');
        return;
      }
      // opening: set open class then stagger adding 'show'
      hamburgerMenu.classList.add('open');
      items.forEach((li, i) => {
        // ensure hidden initially
        li.classList.remove('show');
        const t = setTimeout(() => li.classList.add('show'), i * 90 + 60);
        _advTimers.push(t);
      });
    }
    if (hamburgerIcon && hamburgerMenu) {
      hamburgerIcon.addEventListener('click', () => {
        const isOpen = hamburgerMenu.classList.contains('open');
        revealAdvancedOptions(!isOpen);
      });
    }

    // Submenu navigation: switch sections but KEEP Advanced Features menu visible
    document.querySelectorAll('.submenu li[data-target]').forEach(li => {
      li.addEventListener('click', () => {
        const target = li.dataset.target;
        if (!target) return;

        // deactivate all sidebar links
        links.forEach(l => l.classList.remove('active'));

        // hide ALL main sections (dashboard, mines, auction, insurance, etc.)
        sections.forEach(s => s.classList.remove('active-section'));

        // show the selected target section
        const el = document.querySelector(target);
        if (el) {
          el.classList.add('active-section');

          // if this is the map, ensure invalidateSize runs
          try {
            if (target === '#mine-map' && typeof scheduleInvalidateIndiaMap === 'function') {
              scheduleInvalidateIndiaMap();
            }
          } catch (e) {}
        }

        // IMPORTANT: do NOT close the Advanced Features menu here.
        // So do NOT remove .open class or .show classes from .hamburger-menu.
      });
    });
  } catch(e) { /* ignore */ }


  // Climate Impact visualizer removed per request
  // Auction House — price ticker, AI bidders, sell at market price
  try {
    let auctionPriceInterval = null;
    function generateAuctionPrice() {
      const p = 150 + Math.round(Math.random() * 200);
      const el = document.getElementById('auctionPrice'); if (el) el.textContent = p;
      return p;
    }
    function generateBids(price) {
      const bidders = ['Tata','JSW','Reliance','Adani','Bharat'];
      const arr = bidders.map(name => {
        const variance = Math.round((Math.random() - 0.45) * 60);
        return { name, bid: Math.max(10, price + variance) };
      }).sort((a,b) => b.bid - a.bid);
      return arr;
    }
    function renderBids(bids) {
      const tbody = document.querySelector('#auctionBidders tbody'); if (!tbody) return; tbody.innerHTML = '';
      bids.forEach(b => { const tr = document.createElement('tr'); tr.innerHTML = `<td>${b.name}</td><td>₹${b.bid}</td>`; tbody.appendChild(tr); });
    }
    function startAuctionTicker() {
      if (auctionPriceInterval) clearInterval(auctionPriceInterval);
      // initial generate
      const p = generateAuctionPrice(); renderBids(generateBidsWrapper(p));
      auctionPriceInterval = setInterval(() => { const p = generateAuctionPrice(); renderBids(generateBidsWrapper(p)); }, 3500);
    }
    function generateBidsWrapper(p) { try { return generateBids(p); } catch(e) { return []; } }

    const auctionRefresh = document.getElementById('auctionRefresh'); if (auctionRefresh) auctionRefresh.addEventListener('click', () => { const p = generateAuctionPrice(); renderBids(generateBids(p)); showToast('Bids refreshed', 'info'); });

    const auctionSellBtn = document.getElementById('auctionSellBtn');
    if (auctionSellBtn) {
      auctionSellBtn.addEventListener('click', () => {
        const sel = document.querySelector('input[name="selectedCredit"]:checked');
        if (!sel) { showToast('Select a credit to sell first.', 'info'); return; }
        const id = sel.value;
        const price = Number(document.getElementById('auctionPrice').textContent || 0);
        if (!price || price <= 0) { showToast('Invalid market price.', 'error'); return; }
        // sellCredit will handle partial/full amount prompt, wallet and history updates
        const ok = sellCredit(id, price);
        if (!ok) showToast('Sell failed.', 'error');
      });
    }

    // start ticker if auction section exists
    if (document.getElementById('auction-house')) startAuctionTicker();
  } catch(e) { console.warn('Auction init failed', e); }

  // Revenue Analyzer (donut + monthly bar) using Chart.js
  try {
    // Revenue Analyzer removed per user request.
  } catch(e) { console.warn('Revenue analyzer init failed', e); }

  // Achievement Badges
  try {
    const badgeDefs = [
      { id: 'credit_100', title: '100 tCO₂e Credits', threshold: 100, desc: 'Earn 100 tCO₂e credits' },
      { id: 'credit_500', title: '500 tCO₂e Credits', threshold: 500, desc: 'Earn 500 tCO₂e credits' },
      { id: 'auction_1', title: 'First Auction', threshold: 1, desc: 'Complete one auction' },
      { id: 'seller_10', title: '10 Sales', threshold: 10, desc: 'Sell 10 credits' }
    ];

    function getUnlockedBadges() { try { return JSON.parse(localStorage.getItem('badges_unlocked') || '[]'); } catch(e){ return []; } }
    function setUnlockedBadges(arr) { localStorage.setItem('badges_unlocked', JSON.stringify(arr || [])); }
    function unlockBadge(id) { const cur = getUnlockedBadges(); if (!cur.includes(id)) { cur.push(id); setUnlockedBadges(cur); showToast('Badge unlocked: ' + id, 'success'); renderBadges(); } }
    // --- New multi-table achievements renderer and per-mine badge awarding ---
    function getMineBadgesStore() {
      try { return JSON.parse(localStorage.getItem('mine_badges') || '{}'); } catch(e){ return {}; }
    }
    function setMineBadgesStore(obj) { try { localStorage.setItem('mine_badges', JSON.stringify(obj || {})); } catch(e){} }

    function awardBadgeToMine(mine, badgeId, badgeTitle) {
      if (!mine) return;
      const store = getMineBadgesStore();
      store[mine] = store[mine] || [];
      const exists = store[mine].some(b => b.id === badgeId);
      if (!exists) {
        const entry = { id: badgeId, title: badgeTitle, date: new Date().toISOString() };
        store[mine].push(entry);
        setMineBadgesStore(store);
        showToast(`Badge awarded to ${mine}: ${badgeTitle}`, 'success');
      }
    }

    function getBadgesForMine(mine) {
      const store = getMineBadgesStore(); return (store[mine] || []).slice();
    }

    function badgeChip(badge) {
      if (!badge || !badge.id) return '';
      const id = String(badge.id || '');
      let cls = 'badge-type--credits';
      if (id.indexOf('sink') >= 0) cls = 'badge-type--sink';
      else if (id.indexOf('auction') >= 0) cls = 'badge-type--auction';
      return `<span class="badge-type ${cls}" title="${escapeHtml(badge.title||badge.id)}">${escapeHtml(badge.title||badge.id)}</span>`;
    }

    // Return badges for a mine filtered by logical type: 'credits'|'sinks'|'auctions'
    function getBadgesForMineByType(mine, type) {
      const all = getBadgesForMine(mine) || [];
      if (!type) return all;
      const lower = String(type).toLowerCase();
      return all.filter(b => {
        const id = String(b.id || '').toLowerCase();
        if (lower === 'credits') return id.includes('credit') || id.includes('credits');
        if (lower === 'sinks' || lower === 'sink') return id.includes('sink') || id.includes('biochar');
        if (lower === 'auctions' || lower === 'auction') return id.includes('auction');
        return false;
      });
    }

    function renderBadges() {
      const creditsTbody = document.getElementById('achCreditsTbody');
      const auctionsTbody = document.getElementById('achAuctionsTbody');
      const sinksTbody = document.getElementById('achSinksTbody');
      if (creditsTbody) creditsTbody.innerHTML = '';
      if (auctionsTbody) auctionsTbody.innerHTML = '';
      if (sinksTbody) sinksTbody.innerHTML = '';

      try {
        // load data and remove any known-bad entries supplied by user
        let credits = loadCredits();
        let auctionHist = JSON.parse(localStorage.getItem('auction_history') || '[]') || [];
        const bannedIds = ['1763142359938','1763143104856'];

        // Filter auctions
        const filteredAuction = auctionHist.filter(h => !bannedIds.includes(String(h.id)));
        if (filteredAuction.length !== auctionHist.length) {
          try { localStorage.setItem('auction_history', JSON.stringify(filteredAuction)); } catch(e){}
          auctionHist = filteredAuction;
        }

        // Filter credits (only remove if id matches banned list)
        const filteredCredits = credits.filter(c => !bannedIds.includes(String(c.id)));
        if (filteredCredits.length !== credits.length) {
          try { saveCredits(filteredCredits); } catch(e){}
          credits = filteredCredits;
        }

        // Group credits by mine/project to compute per-mine totals
        const perMine = {};
        credits.forEach(c => {
          const mine = (c.project || 'Unnamed Project');
          perMine[mine] = perMine[mine] || { credits: [], total: 0 };
          perMine[mine].credits.push(c);
          perMine[mine].total += Number(c.amount || 0);
        });

        // Credits table rows - one row per credit entry (showing mine badges in column)
        credits.forEach(c => {
          const mine = c.project || 'Unnamed Project';
          const tr = document.createElement('tr');
          const badges = getBadgesForMineByType(mine, 'credits').map(badgeChip).join(' ');
          const amt = Number(c.amount || 0).toFixed(2);
          const details = c.status || '';
          const date = formatDateISO(c.date || new Date().toISOString());
          tr.innerHTML = `
            <td>${escapeHtml(mine)}</td>
            <td>${badges || ''}</td>
            <td>${escapeHtml(amt + ' tCO₂e')}</td>
            <td class="muted">${escapeHtml(details)}</td>
            <td>${escapeHtml(date)}</td>
          `;
          if (creditsTbody) creditsTbody.appendChild(tr);
        });

        // Award credit-based badges per mine
        Object.keys(perMine).forEach(mine => {
          const total = perMine[mine].total || 0;
          if (total >= 100) awardBadgeToMine(mine, 'credit_100', '100 tCO₂e Credits');
          if (total >= 500) awardBadgeToMine(mine, 'credit_500', '500 tCO₂e Credits');
        });

        // Sinks: check each credit's details for sink contributions and render sink rows
        credits.forEach(c => {
          if (!c.details) return;
          const d = c.details;
          const mine = c.project || 'Unnamed Project';
          const sinkAmount = Number(d.afforestation_co2e || 0) + Number(d.soil_co2e || 0) + Number(d.wetland_co2e || 0) + Number(d.biochar_co2e || 0);
          if (sinkAmount <= 0) return;
          // award sink badge if above threshold
          if (sinkAmount >= 50) awardBadgeToMine(mine, 'sink_champion', 'Carbon Sink Champion');

          const tr = document.createElement('tr');
          const badges = getBadgesForMineByType(mine, 'sinks').map(badgeChip).join(' ');
          const date = formatDateISO(c.date || new Date().toISOString());
          tr.innerHTML = `
            <td>${escapeHtml(mine)}</td>
            <td>${badges || ''}</td>
            <td>${escapeHtml(sinkAmount.toFixed(2) + ' tCO₂e')}</td>
            <td class="muted">Derived from saved calculation</td>
            <td>${escapeHtml(date)}</td>
          `;
          if (sinksTbody) sinksTbody.appendChild(tr);
        });

        // Auctions: one row per auction event, and award per-mine auction badges based on counts
        const auctionsByMine = {};
        auctionHist.forEach(h => {
          const creditsArr = loadCredits();
          const credit = creditsArr.find(x => String(x.id) === String(h.id));
          const mine = (credit && credit.project) ? credit.project : ('Credit ' + String(h.id));
          auctionsByMine[mine] = (auctionsByMine[mine] || 0) + 1;

          const tr = document.createElement('tr');
          const badges = getBadgesForMineByType(mine, 'auctions').map(badgeChip).join(' ');
          const eventText = `Sold ${Number(h.amountSold||0).toFixed(2)} t`;
          const details = `Price ₹${Number(h.pricePerUnit||0).toLocaleString()} — Revenue ₹${Number(h.revenue||0).toLocaleString()}`;
          const date = formatDateISO(h.date || new Date().toISOString());
          tr.innerHTML = `
            <td>${escapeHtml(mine)}</td>
            <td>${badges || ''}</td>
            <td>${escapeHtml(eventText)}</td>
            <td class="muted">${escapeHtml(details)}</td>
            <td>${escapeHtml(date)}</td>
          `;
          if (auctionsTbody) auctionsTbody.appendChild(tr);
        });

        // Award auction badges
        Object.keys(auctionsByMine).forEach(mine => {
          const count = auctionsByMine[mine] || 0;
          if (count >= 1) awardBadgeToMine(mine, 'auction_1', 'First Auction');
          if (count >= 2) awardBadgeToMine(mine, 'auction_2', 'Second Auction');
          if (count >= 5) awardBadgeToMine(mine, 'auction_veteran', 'Auction Veteran');
        });

      } catch (e) { console.warn('Failed to render achievements tables', e); }
    }

    // Run initial render
    try { renderBadges(); } catch(e) { console.warn('Initial renderBadges failed', e); }
    // wire collapsible headings in Achievements section (click or keyboard)
    try {
      const wraps = document.querySelectorAll('.badges-table-wrap');
      wraps.forEach(wrap => {
        const h = wrap.querySelector('h3.collapsible');
        if (!h) return;
        function toggle() {
          const isCollapsed = wrap.classList.toggle('collapsed');
          h.setAttribute('aria-expanded', String(!isCollapsed));
        }
        h.addEventListener('click', toggle);
        h.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'Spacebar') { ev.preventDefault(); toggle(); }
        });
      });
    } catch(e) { console.warn('Could not wire collapsible headings', e); }
  } catch(e) { console.warn('Badges init failed', e); }

  // 3️⃣ CHATBOT SYSTEM (with voice-to-text and text-to-speech)
  const chatToggle = document.getElementById('chat-toggle');
  const chatWindow = document.getElementById('chat-window');
  const chatClose = document.getElementById('chat-close');
  const sendBtn = document.getElementById('send-btn');
  const chatInput = document.getElementById('chat-input');
  const chatMessages = document.getElementById('chat-messages');
  const voiceBtn = document.getElementById('chat-voice-btn');
  const ttsToggle = document.getElementById('chat-tts-toggle');

  chatToggle.addEventListener('click', () => chatWindow.classList.toggle('hidden'));
  chatClose.addEventListener('click', () => chatWindow.classList.add('hidden'));

  // TTS enabled state (persisted)
  let ttsEnabled = (localStorage.getItem('chat_tts_enabled') !== 'false');
  if (ttsToggle) {
    ttsToggle.textContent = ttsEnabled ? '🔊' : '🔈';
    ttsToggle.addEventListener('click', () => {
      ttsEnabled = !ttsEnabled;
      localStorage.setItem('chat_tts_enabled', ttsEnabled);
      ttsToggle.textContent = ttsEnabled ? '🔊' : '🔈';
    });
  }

  // Wire send + enter
  if (sendBtn) sendBtn.addEventListener('click', () => sendMessage());
  if (chatInput) chatInput.addEventListener('keypress', e => { if (e.key === 'Enter') sendMessage(); });

  // Speech recognition setup (browser)
  let recognition = null;
  if (voiceBtn && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (ev) => {
      const txt = (ev.results && ev.results[0] && ev.results[0][0] && ev.results[0][0].transcript) ? ev.results[0][0].transcript : '';
      if (txt) {
        chatInput.value = txt;
        sendMessage();
      }
    };
    recognition.onend = () => { voiceBtn.classList.remove('listening'); };
    recognition.onerror = (e) => { console.warn('SpeechRecognition error', e); voiceBtn.classList.remove('listening'); };
    voiceBtn.addEventListener('click', () => {
      try {
        if (voiceBtn.classList.contains('listening')) { recognition.stop(); }
        else { recognition.start(); voiceBtn.classList.add('listening'); }
      } catch (e) { console.warn('Voice start error', e); }
    });
  } else if (voiceBtn) {
    voiceBtn.disabled = true; voiceBtn.title = 'Speech recognition not supported in this browser';
  }

  // append messages helper
  function appendMessage(kind, text) {
    if (!chatMessages) return;
    const safe = String(text);
    // create message container instead of using innerHTML (safer for handlers)
    const wrapper = document.createElement('div');
    wrapper.className = kind;

    if (kind === 'bot-message') {
      const msgSpan = document.createElement('span');
      msgSpan.className = 'bot-text';
      msgSpan.textContent = safe;

      // play button per reply (always available regardless of global TTS)
      const playBtn = document.createElement('button');
      playBtn.className = 'bot-play-btn';
      playBtn.title = 'Play reply audio';
      playBtn.textContent = '🔊';
        playBtn.addEventListener('click', () => {
        if (!('speechSynthesis' in window)) { showToast('Text-to-speech not supported in this browser.', 'info'); return; }
        try {
          const u = new SpeechSynthesisUtterance(safe);
          u.lang = 'en-IN';
          const voices = window.speechSynthesis.getVoices();
          if (voices && voices.length) {
            const v = voices.find(v => /en-?in/i.test(v.lang)) || voices.find(v => /en-?gb|en-?us/i.test(v.lang));
            if (v) u.voice = v;
          }
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(u);
        } catch (e) { console.warn('TTS play error', e); showToast('Could not play audio. See console.', 'error'); }
      });

      wrapper.appendChild(playBtn);
      wrapper.appendChild(msgSpan);
    } else {
      wrapper.textContent = safe;
    }

    chatMessages.appendChild(wrapper);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // send message to server and optionally speak reply
  async function sendMessage(overrideText) {
    const msg = (overrideText !== undefined) ? String(overrideText).trim() : (chatInput ? chatInput.value.trim() : '');
    if (!msg) return;
    appendMessage('user-message', msg);
    if (chatInput) chatInput.value = '';

    try {
      if (sendBtn) sendBtn.disabled = true;
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: msg })
      });
      const data = await res.json();
      const reply = (data && data.reply) ? data.reply : 'No reply from server.';
      appendMessage('bot-message', reply);

      // speak reply if allowed
      if (ttsEnabled && 'speechSynthesis' in window) {
        try {
          const u = new SpeechSynthesisUtterance(reply);
          // prefer Indian English voice if available
          u.lang = 'en-IN';
          const voices = window.speechSynthesis.getVoices();
          if (voices && voices.length) {
            // try find a suitable locale voice
            const v = voices.find(v => /en-?in/i.test(v.lang)) || voices.find(v => /en-?gb|en-?us/i.test(v.lang));
            if (v) u.voice = v;
          }
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(u);
        } catch (e) { console.warn('TTS failed', e); }
      }
    } catch (err) {
      console.error('Chat send error', err);
      appendMessage('bot-message', 'Chat error. See console.');
    } finally {
      if (sendBtn) sendBtn.disabled = false;
    }
  }

  // 4️⃣ EMISSION INPUT & CARBON SINK CALCULATIONS
  let totalEmission = 0;
  let totalSink = 0;

  const emissionResult = document.getElementById("emissionResult");
  const sinkResult = document.getElementById("sinkResult");
  const totalEmissionDisplay = document.getElementById("totalEmission");
  const sinkDisplay = document.getElementById("sinkValue");
  const netEmissionDisplay = document.getElementById("netEmission");

  document.getElementById("calcEmission").addEventListener("click", () => {
    const diesel = parseFloat(document.getElementById("diesel").value) || 0;
    const electricity = parseFloat(document.getElementById("electricity").value) || 0;
    const methane = parseFloat(document.getElementById("methane").value) || 0;

    // Emission Factors (kg CO₂ per unit → convert to tonnes)
    const dieselEF = 2.68 / 1000; 
    const electricityEF = 0.82 / 1000;
    const methaneEF = 25 / 1000;

    totalEmission = (diesel * dieselEF) + (electricity * electricityEF) + (methane * methaneEF);

    emissionResult.innerHTML = `
      🔥 <b>Total CO₂ Emission:</b> ${totalEmission.toFixed(2)} tCO₂e/year<br>
      🛢️ Diesel: ${(diesel * dieselEF).toFixed(2)} tCO₂e<br>
      ⚡ Electricity: ${(electricity * electricityEF).toFixed(2)} tCO₂e<br>
      💨 Methane: ${(methane * methaneEF).toFixed(2)} tCO₂e
    `;
    updateDashboard();
    updateCharts();
  });

  document.getElementById("calcSink").addEventListener("click", () => {
    const forest = parseFloat(document.getElementById("forest").value) || 0;
    const soil = parseFloat(document.getElementById("soil").value) || 0;

    // Sequestration factors
    const forestRate = 6; // tCO₂e/ha/year
    const soilRate = 3; // tCO₂e/ha/year

    totalSink = (forest * forestRate) + (soil * soilRate);

    sinkResult.innerHTML = `
      🌳 <b>Total Carbon Sequestration:</b> ${totalSink.toFixed(2)} tCO₂e/year<br>
      🌲 Forest Absorption: ${(forest * forestRate).toFixed(2)} tCO₂e<br>
      🌾 Soil Carbon Absorption: ${(soil * soilRate).toFixed(2)} tCO₂e
    `;
    updateDashboard();
    updateCharts();
  });

  function updateDashboard() {
    const net = totalEmission - totalSink;
    totalEmissionDisplay.textContent = totalEmission.toFixed(2) + " tCO₂e";
    sinkDisplay.textContent = totalSink.toFixed(2) + " tCO₂e";
    netEmissionDisplay.textContent = net.toFixed(2) + " tCO₂e";
  }

  // 5️⃣ DYNAMIC REPORTS (Chart.js)
  const ctx = document.getElementById("emissionChart").getContext("2d");
  const trendCtx = document.getElementById("trendChart").getContext("2d");

  let chart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Emissions", "Carbon Sinks"],
      datasets: [{
        data: [0, 0],
        backgroundColor: ["#e74c3c", "#27ae60"]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '50%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { font: { size: 16 }, color: '#111' }
        },
        tooltip: {
          titleFont: { size: 14 },
          bodyFont: { size: 14 }
        }
      }
    }
  });

  let trendChart = new Chart(trendCtx, {
    type: "bar",
    data: {
      labels: ["Emissions", "Sinks", "Net Emission"],
      datasets: [{
        label: "tCO₂e/year",
        data: [0, 0, 0],
        backgroundColor: ["#e74c3c", "#27ae60", "#f1c40f"]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { font: { size: 14 }, color: '#111' } },
        tooltip: { titleFont: { size: 14 }, bodyFont: { size: 14 } }
      },
      scales: {
        x: { ticks: { font: { size: 14 }, color: '#111' } },
        y: { ticks: { font: { size: 14 }, color: '#111' } }
      }
    }
  });

  function updateCharts() {
    const net = totalEmission - totalSink;
    chart.data.datasets[0].data = [totalEmission, totalSink];
    chart.update();

    trendChart.data.datasets[0].data = [totalEmission, totalSink, net];
    trendChart.update();
  }

  // (emissionTrendChart and loader removed)

  // ---------------- Simple Linear Regression Model (Gradient Descent) ----------------
  // Features: diesel (L), electricity (kWh), methane (kg), mineSize (0 minor,1 major), production (tonnes)
  // Target: annual emissions (tCO2e)

  // model parameters (weights) will be a Float64Array length 6 (bias + 5 features)
  let modelWeights = null;

  // normalize features using mean/std
  function computeStats(X) {
    const n = X.length; const d = X[0].length;
    const mean = new Array(d).fill(0);
    const std = new Array(d).fill(0);
    for (let j=0;j<d;j++){
      for (let i=0;i<n;i++) mean[j] += X[i][j];
      mean[j] /= n;
      for (let i=0;i<n;i++) std[j] += Math.pow(X[i][j]-mean[j],2);
      std[j] = Math.sqrt(std[j]/n) || 1;
    }
    return { mean, std };
  }

  function normalizeX(X, stats){
    const n = X.length, d = X[0].length; const out = new Array(n);
    for (let i=0;i<n;i++){ out[i] = new Array(d); for (let j=0;j<d;j++){ out[i][j] = (X[i][j]-stats.mean[j]) / stats.std[j]; }}
    return out;
  }

  function trainLinearModel(options={epochs:3000,lr:0.01,samples:800}){
    // generate synthetic training data using known emission factors + size/production effect + noise
    const samples = options.samples || 800;
    const X = []; const y = [];
    const dieselEF = 2.68/1000; const electricityEF = 0.82/1000; const methaneEF = 25/1000;
    for (let i=0;i<samples;i++){
      const diesel = Math.round(Math.random()*150000); // litres
      const electricity = Math.round(Math.random()*800000); // kWh
      const methane = Math.round(Math.random()*5000); // kg
      const mineSize = (Math.random() < 0.25) ? 1 : 0; // 25% major
      const production = Math.round(1e5 + Math.random()*9.9e7); // tonnes
      // emission base from activity
      let emission = diesel*dieselEF + electricity*electricityEF + methane*methaneEF;
      // add production-related and size-related contributions
      emission += production * 0.00000012; // production coefficient
      emission += mineSize * 0.8; // major mines ~ +0.8 tCO2e baseline
      // add noise
      emission *= (0.9 + Math.random()*0.2);
      X.push([diesel, electricity, methane, mineSize, production]);
      y.push(emission);
    }

    // stats and normalize
    const stats = computeStats(X);
    const Xn = normalizeX(X, stats);

    // initialize weights (bias + d)
    const d = Xn[0].length; const W = new Array(d+1).fill(0);
    // small random init
    for (let j=0;j<=d;j++) W[j] = (Math.random()-0.5)*0.1;

    const lr = options.lr || 0.01; const epochs = options.epochs || 2000;
    let lastLoss = 0;
    for (let ep=0; ep<epochs; ep++){
      // compute predictions & gradients
      const grads = new Array(d+1).fill(0);
      let loss = 0;
      for (let i=0;i<Xn.length;i++){
        let pred = W[0];
        for (let j=0;j<d;j++) pred += W[j+1]*Xn[i][j];
        const err = pred - y[i];
        loss += err*err;
        grads[0] += err;
        for (let j=0;j<d;j++) grads[j+1] += err * Xn[i][j];
      }
      loss /= Xn.length;
      // gradient descent update
      for (let j=0;j<=d;j++) W[j] -= lr * (grads[j] * 2 / Xn.length);
      lastLoss = loss;
      if (ep % 500 === 0) {
        //console.log('epoch',ep,'loss',loss.toFixed(4));
      }
    }

    // store model with stats, weights and feature count
    modelWeights = { W, stats };
    // create human-readable coefficients in original scale
    // convert normalized weights to original feature scale: w_orig_j = W[j+1] / std[j]
    const coeffs = { intercept: W[0] - W.slice(1).reduce((s,w,j)=> s + w * (stats.mean[j]/stats.std[j]), 0) };
    coeffs.features = [];
    for (let j=0;j<stats.mean.length;j++) coeffs.features.push({ featureIdx: j, weight: W[j+1] / stats.std[j], mean: stats.mean[j], std: stats.std[j] });
    return { modelWeights, coeffs, loss: lastLoss };
  }

  function predictEmission(input){
    if (!modelWeights) return null;
    const W = modelWeights.W; const stats = modelWeights.stats;
    const x = input.slice(); // [diesel,electricity,methane,mineSize,production]
    // normalize
    const xn = x.map((v,i)=> (v - stats.mean[i]) / stats.std[i]);
    let pred = W[0]; for (let j=0;j<xn.length;j++) pred += W[j+1]*xn[j];
    return pred; // tCO2e
  }

  // auto-train on load with default options
  let lastModelSummary = null;
  try {
    const trainRes = trainLinearModel({epochs:2500, lr:0.005, samples:1000});
    lastModelSummary = trainRes;
    const infoEl = document.getElementById('modelInfo');
    if (infoEl) infoEl.textContent = `Model trained (samples=1000, epochs=2500). Loss: ${trainRes.loss.toFixed(4)}.`;
  } catch(e) { console.warn('Model training failed', e); }

  // wire predict & retrain buttons
  const predictBtn = document.getElementById('predictBtn');
  const retrainBtn = document.getElementById('retrainBtn');
  const predictResult = document.getElementById('predictResult');
  if (predictBtn) predictBtn.addEventListener('click', ()=>{
    const d = Number(document.getElementById('predDiesel').value) || 0;
    const e = Number(document.getElementById('predElectricity').value) || 0;
    const m = Number(document.getElementById('predMethane').value) || 0;
    const s = Number(document.getElementById('predMineSize').value) || 0;
    const p = Number(document.getElementById('predProduction').value) || 0;
    const pred = predictEmission([d,e,m,s,p]);
    if (pred === null) {
      predictResult.textContent = 'Model not trained.'; return;
    }
    predictResult.textContent = `Predicted annual emissions (next year): ${pred.toFixed(2)} tCO₂e`;
  });

  if (retrainBtn) retrainBtn.addEventListener('click', ()=>{
    predictResult.textContent = 'Retraining model...';
    setTimeout(()=>{
      const res = trainLinearModel({epochs:3000, lr:0.006, samples:1200});
      lastModelSummary = res;
      const infoEl = document.getElementById('modelInfo');
      if (infoEl) infoEl.textContent = `Model retrained (samples=1200, epochs=3000). Loss: ${res.loss.toFixed(4)}.`;
      predictResult.textContent = 'Model retrained. Use Predict to estimate emissions.';
    }, 50);
  });


  // 6️⃣ NEUTRALITY PATHWAYS (Data-Rich Simulation)
  const pathwayButtons = document.querySelectorAll(".simulate-btn");
  const pathwayResult = document.getElementById("pathway-result");

  pathwayButtons.forEach(button => {
    button.addEventListener("click", () => {
      const type = button.dataset.type;
      let reduction = 0;
      let message = "";

      if (type === "afforestation") {
        const hectares = 100;
        reduction = hectares * 7;
        message = `
          🌳 <b>Afforestation Impact:</b><br>
          Planting ${hectares} ha of trees can absorb roughly ${reduction} tCO₂e/year.<br>
          Scaling to 1000 ha captures ${reduction * 10} tCO₂e/year.<br>
          Native species ensure soil stability and biodiversity.`;
        totalSink += reduction;
      } 
      else if (type === "ev") {
        const trucks = 50;
        const evSaving = 3.8;
        reduction = trucks * evSaving;
        message = `
          ⚡ <b>EV Technology Impact:</b><br>
          Replacing ${trucks} diesel trucks saves ${reduction.toFixed(1)} tCO₂e/year.<br>
          Over 10 years: ${ (reduction * 10).toFixed(1) } tCO₂e avoided.`;
        totalEmission -= reduction;
      } 
      else if (type === "renewable") {
        const capacity = 2;
        reduction = capacity * 1300;
        message = `
          🌞 <b>Renewable Energy Impact:</b><br>
          Installing ${capacity} MW solar/wind offsets ${reduction} tCO₂e/year.<br>
          10 MW hybrid = ${(reduction * 5)} tCO₂e/year savings.`;
        totalEmission -= reduction;
      } 
      else if (type === "absorption") {
        const soilArea = 200;
        const rate = 3.2;
        reduction = soilArea * rate + 1000;
        message = `
          💨 <b>Carbon Absorption Impact:</b><br>
          Managing ${soilArea} ha of soil + biochar = ${reduction.toFixed(1)} tCO₂e/year capture.`;
        totalSink += reduction;
      }

      updateDashboard();
      updateCharts();

      pathwayResult.style.display = "block";
      pathwayResult.innerHTML = `<h3>Simulation Result</h3><p>${message}</p>`;
});

  // Input values
  const forest = parseFloat(document.getElementById("forest").value) || 0;
  const soil = parseFloat(document.getElementById("soil").value) || 0;
  const wetland = parseFloat(document.getElementById("wetland").value) || 0;
  const biochar = parseFloat(document.getElementById("biochar").value) || 0;
  const dac = parseFloat(document.getElementById("dac").value) || 0;

  // 🌳 Scientific Absorption Rates (average tCO₂e/year)
  const forestRate = 6.5;   // per hectare
  const soilRate = 3.2;     // per hectare
  const wetlandRate = 10.5; // per hectare (blue carbon)
  const biocharRate = 2.7;  // per tonne biochar
  const dacRate = 1.0;      // per tonne captured

  // Calculate total sequestration
  const forestCO2 = forest * forestRate;
  const soilCO2 = soil * soilRate;
  const wetlandCO2 = wetland * wetlandRate;
  const biocharCO2 = biochar * biocharRate;
  const dacCO2 = dac * dacRate;

  totalSink = forestCO2 + soilCO2 + wetlandCO2 + biocharCO2 + dacCO2;

  // 🧾 Result display
  const total = totalSink.toFixed(2);
  const forestPct = ((forestCO2 / totalSink) * 100 || 0).toFixed(1);
  const soilPct = ((soilCO2 / totalSink) * 100 || 0).toFixed(1);
  const wetlandPct = ((wetlandCO2 / totalSink) * 100 || 0).toFixed(1);
  const biocharPct = ((biocharCO2 / totalSink) * 100 || 0).toFixed(1);
  const dacPct = ((dacCO2 / totalSink) * 100 || 0).toFixed(1);

  sinkResult.innerHTML = `
    <b>🌿 Carbon Sink Summary:</b><br><br>
    🌳 Afforestation: ${forestCO2.toFixed(2)} tCO₂e (${forestPct}%)<br>
    🌾 Soil Carbon: ${soilCO2.toFixed(2)} tCO₂e (${soilPct}%)<br>
    🌊 Wetlands: ${wetlandCO2.toFixed(2)} tCO₂e (${wetlandPct}%)<br>
    ♻️ Biochar: ${biocharCO2.toFixed(2)} tCO₂e (${biocharPct}%)<br>
    💨 Direct Air Capture: ${dacCO2.toFixed(2)} tCO₂e (${dacPct}%)<br><br>
    🧮 <b>Total Carbon Sequestration:</b> ${total} tCO₂e/year
  `;

  updateDashboard();
  updateCharts();
});
});

// 🌿 Advanced Carbon Sink Calculation
document.getElementById("calcSink").addEventListener("click", () => {
  const forest = parseFloat(document.getElementById("forest").value) || 0;
  const soil = parseFloat(document.getElementById("soil").value) || 0;
  const wetland = parseFloat(document.getElementById("wetland").value) || 0;
  const biochar = parseFloat(document.getElementById("biochar").value) || 0;
  const dac = parseFloat(document.getElementById("dac").value) || 0;

  // Absorption rates (tCO₂e/year)
  const forestRate = 6.5, soilRate = 3.2, wetlandRate = 10.5, biocharRate = 2.7, dacRate = 1.0;

  const forestCO2 = forest * forestRate;
  const soilCO2 = soil * soilRate;
  const wetlandCO2 = wetland * wetlandRate;
  const biocharCO2 = biochar * biocharRate;
  const dacCO2 = dac * dacRate;

  totalSink = forestCO2 + soilCO2 + wetlandCO2 + biocharCO2 + dacCO2;

  const total = totalSink.toFixed(2);
  const forestPct = ((forestCO2 / totalSink) * 100 || 0).toFixed(1);
  const soilPct = ((soilCO2 / totalSink) * 100 || 0).toFixed(1);
  const wetlandPct = ((wetlandCO2 / totalSink) * 100 || 0).toFixed(1);
  const biocharPct = ((biocharCO2 / totalSink) * 100 || 0).toFixed(1);
  const dacPct = ((dacCO2 / totalSink) * 100 || 0).toFixed(1);

  sinkResult.innerHTML = `
    <b>🌿 Carbon Sink Summary:</b><br><br>
    🌳 Afforestation: ${forestCO2.toFixed(2)} tCO₂e (${forestPct}%)<br>
    🌾 Soil Carbon: ${soilCO2.toFixed(2)} tCO₂e (${soilPct}%)<br>
    🌊 Wetlands: ${wetlandCO2.toFixed(2)} tCO₂e (${wetlandPct}%)<br>
    ♻️ Biochar: ${biocharCO2.toFixed(2)} tCO₂e (${biocharPct}%)<br>
    💨 Direct Air Capture: ${dacCO2.toFixed(2)} tCO₂e (${dacPct}%)<br><br>
    🧮 <b>Total Carbon Sequestration:</b> ${total} tCO₂e/year
  `;

  updateDashboard();
  updateCharts();
});

// ...existing code...
// ✅ PDF REPORT GENERATOR — fixed and robust version
document.getElementById("downloadReport").addEventListener("click", async () => {
  const btn = document.getElementById("downloadReport");
  btn.disabled = true;
  btn.textContent = "Generating PDF…";

  try {
    // choose the report area to capture (use the reports section for a focused PDF)
    const reportEl = document.getElementById("reports") || document.querySelector(".main-content");

    // ensure element has an explicit background so html2canvas paints correctly
    reportEl.style.background = window.getComputedStyle(reportEl).backgroundColor || "#ffffff";

    // allow browser to paint before capture
    await new Promise(r => setTimeout(r, 250));

    // create high-resolution canvas
    const canvas = await html2canvas(reportEl, {
      scale: 2,            // higher scale for better quality
      useCORS: true,
      backgroundColor: "#ffffff"
    });

    // get image data from canvas
    const imgData = canvas.toDataURL("image/png");

    // create PDF using jsPDF
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // image props and calculated height to maintain aspect ratio
    const imgProps = pdf.getImageProperties(imgData);
    const imgWidth = pdfWidth;
    const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

    // add first page
    let position = 0;
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);

    // add additional pages if necessary
    let heightLeft = imgHeight - pdfHeight;
    while (heightLeft > 0) {
      position = -heightLeft;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
    }

    // download
    pdf.save("Carbon_Report.pdf");

  } catch (err) {
    console.error("PDF generation failed:", err);
    showToast("Failed to generate PDF. Check console for details.", 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = "📄 Download Carbon Report (PDF)";
  }
});
// ...existing code...

// Email report: generate same PDF and send to server
const emailReportBtn = document.getElementById('emailReportBtn');
if (emailReportBtn) {
  emailReportBtn.addEventListener('click', async () => {
    const emailInput = document.getElementById('reportEmail');
    const email = emailInput ? emailInput.value.trim() : '';
    if (!email) { showToast('Please enter a recipient email address.', 'info'); return; }

    const btn = emailReportBtn;
    btn.disabled = true; btn.textContent = 'Sending…';

    try {
      // build the same report element used by downloadReport
      const reportEl = document.getElementById('reports') || document.querySelector('.main-content');
      reportEl.style.background = window.getComputedStyle(reportEl).backgroundColor || '#ffffff';
      await new Promise(r => setTimeout(r, 250));

      const canvas = await html2canvas(reportEl, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgProps = pdf.getImageProperties(imgData);
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
      // get base64
      const pdfBase64 = pdf.output('datauristring');

      // POST to server
      const res = await fetch('/api/email-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, filename: 'Carbon_Report.pdf', pdfBase64 })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Email sent successfully.', 'success');
      } else {
        showToast('Failed to send email: ' + (data.error || JSON.stringify(data)), 'error');
      }
    } catch (err) {
      console.error('Email send failed', err);
      showToast('Failed to send email. Check console.', 'error');
    } finally {
      btn.disabled = false; btn.textContent = '✉️ Email Report';
    }
  });
}

// 7️⃣ INTERACTIVE INDIA MAP (Leaflet) — guarded initialization
if (typeof L !== 'undefined' && document.getElementById('indiaMap')) {
  // Define India bounding box (approx): southWest, northEast
  const indiaBounds = [[6.5, 68.1], [35.7, 97.4]];

  // Create map focused on India and restrict panning to India's bounds
  const map = L.map('indiaMap', {
    center: [22.97, 78.65],
    zoom: 5,
    minZoom: 4,
    maxZoom: 12,
    maxBounds: indiaBounds,
    maxBoundsViscosity: 0.8
  });

  // expose reference so other UI code can call invalidateSize()
  indiaMapInstance = map;
  // also expose to window for quick debugging in DevTools
  try { window.indiaMapInstance = indiaMapInstance; } catch (e) { /* ignore */ }

  // Add base map tiles (OpenStreetMap)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // Add a simplified India polygon to visually mark India and focus the map there
  // India outline/highlight removed for a cleaner map look.
  // Previously we loaded data/india.geojson and rendered a highlighted polygon.
  // That behavior is intentionally disabled so the map shows only base tiles and markers.
  // If you want to re-enable an outline later, restore the loadIndiaOutline IIFE.

  // 🏭 Major & Minor Coal Mines Data
  const predefinedMines = [
    {
      id: 'pre-jharia',
      name: "Jharia Coalfield (Jharkhand)",
      type: "Major Mine (BCCL)",
      location: [23.75, 86.42],
      image: 'https://yale-threesixty.transforms.svdcdn.com/production/1280px-Coal_Mine.jpg?w=1280&h=848&auto=compress%2Cformat&fit=crop&dm=1740245701&s=4e6e9cf98e41b80899d1b52c169d8b63',
      emission: "4.6 MtCO₂e/year",
      credits: "0.8 MtCO₂e",
      production: "~35 million tonnes/year",
      status: "Transitioning to carbon-neutral by 2045"
    },
    {
      id: 'pre-korba',
      name: "Korba Coalfield (Chhattisgarh)",
      type: "Major Mine (SECL)",
      location: [22.35, 82.68],
      image: 'https://img.naidunia.com/naidunia/coal_mine_05_10_2019.jpg',
      emission: "7.2 MtCO₂e/year",
      credits: "1.3 MtCO₂e",
      production: "~80 million tonnes/year",
      status: "Moderate progress, target 2047"
    },
    {
      id: 'pre-raniganj',
      name: "Raniganj Coalfield (West Bengal)",
      type: "Major Mine (ECL)",
      location: [23.62, 87.13],
      image: 'https://media.newindianexpress.com/TNIE%2Fimport%2F2023%2F10%2F13%2Foriginal%2FCoalField_Reuters.JPG?w=1024&auto=format%2Ccompress&fit=max',
      emission: "3.1 MtCO₂e/year",
      credits: "0.9 MtCO₂e",
      production: "~28 million tonnes/year",
      status: "High afforestation and EV readiness"
    },
    {
      id: 'pre-singareni',
      name: "Singareni Collieries (Telangana)",
      type: "Major Mine (SCCL)",
      location: [17.50, 79.45],
      image: 'https://www.constructionworld.in/assets/uploads/8aaa8de1fe7edda28c66a3873bb24db9.jpg',
      emission: "5.4 MtCO₂e/year",
      credits: "2.2 MtCO₂e",
      production: "~65 million tonnes/year",
      status: "Leader in renewable transition"
    },
    {
      id: 'pre-talcher',
      name: "Talcher Coalfield (Odisha)",
      type: "Major Mine (MCL)",
      location: [20.94, 85.11],
      image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSlhnvvDucGAxSZuoXj84JSACcq9LWNQfYpRw&s',
      emission: "6.8 MtCO₂e/year",
      credits: "1.1 MtCO₂e",
      production: "~70 million tonnes/year",
      status: "Improving with renewable integration"
    },
    {
      id: 'pre-umaria',
      name: "Umaria Mines (Madhya Pradesh)",
      type: "Minor Mine (WCL)",
      location: [23.52, 80.83],
      image: 'https://learning.coalshastra.com/wp-content/uploads/2021/12/Coal-Dealers-in-chandrapur-CoalShastra-1.png',
      emission: "0.8 MtCO₂e/year",
      credits: "0.2 MtCO₂e",
      production: "~4 million tonnes/year",
      status: "Early adoption phase"
    }
  ];

  // load user-registered mines from localStorage and mark them as user entries
  const userMines = (JSON.parse(localStorage.getItem('userMines') || '[]') || []).map(m => {
    // ensure each user mine has an id
    if (!m.id) m.id = 'user-' + Date.now() + '-' + Math.floor(Math.random()*1000);
    return ({...m, _user: true});
  });

  // combined mines array (predefined + user-registered)
  let mines = predefinedMines.concat(userMines);

  // marker group & tracking
  const markerGroup = L.layerGroup().addTo(map);
  const markers = [];

  // expose markers and mines to window so other modules (directory) can reference them
  try {
    window._markerGroup = markerGroup;
    window._mapMarkers = markers;
    window._mapMines = mines;
  } catch (e) { /* ignore on restricted environments */ }

  // helper to add a mine to the map and markers array
  function addMineToMap(mine) {
    const marker = L.marker(mine.location);
    // build popup content with optional image
  const safeImg = mine.image ? mine.image : '';
  const imgHtml = (safeImg) ? `<div><img src="${safeImg}" onerror="this.onerror=null;this.src='https://via.placeholder.com/320x160?text=No+Image'" class="popup-image" alt="${mine.name}"></div><br>` : '';
    const typeHtml = mine.type ? `<i>${mine.type}</i><br><br>` : '';
    const creditsHtml = mine.credits ? `🌿 Carbon Credits: ${mine.credits}<br>` : '';
    const productionHtml = mine.production ? `📦 Production: ${mine.production}<br>` : '';
    const statusHtml = mine.status ? `🏁 Status: ${mine.status}` : '';

    const popupContent = `
      <div class="popup-content" data-mine-id="${mine.id}">
        ${imgHtml}
        <b>${mine.name}</b><br>
        ${typeHtml}
        🔥 Emission: ${mine.emission || 'N/A'}<br>
        ${creditsHtml}
        ${productionHtml}
        ${statusHtml}
        <div style="margin-top:8px">
          <button class="edit-image-btn" data-mine-id="${mine.id}">Edit Image</button>
        </div>
      </div>
    `;

    marker.bindPopup(popupContent, { maxWidth: 360 });

    // when popup opens, wire up the Edit Image button to allow setting an image URL
    marker.on('popupopen', function(e){
      try {
        const popupEl = marker.getPopup().getElement();
        if (!popupEl) return;
        const editBtn = popupEl.querySelector('.edit-image-btn');
        if (!editBtn) return;
        // avoid attaching multiple handlers
        if (editBtn._bound) return; editBtn._bound = true;
        editBtn.addEventListener('click', () => {
          // create editor form inside popup
          const editor = document.createElement('div');
          editor.className = 'popup-image-editor';
          editor.innerHTML = `
            <div style="margin-top:8px">
              <input type="text" class="popup-image-url" placeholder="Image URL (https://...)" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:4px;" />
              <div style="margin-top:6px;text-align:right;">
                <button class="popup-image-save">Save</button>
                <button class="popup-image-cancel" style="margin-left:6px">Cancel</button>
              </div>
            </div>
          `;
          editBtn.style.display = 'none';
          popupEl.querySelector('.popup-content').appendChild(editor);
          const input = editor.querySelector('.popup-image-url');
          // prefill with existing image if any
          if (mine.image) input.value = mine.image;

          const saveBtn = editor.querySelector('.popup-image-save');
          const cancelBtn = editor.querySelector('.popup-image-cancel');

          cancelBtn.addEventListener('click', () => {
            editor.remove();
            editBtn.style.display = '';
          });

          saveBtn.addEventListener('click', () => {
            const url = input.value.trim();
            if (!url) { showToast('Please enter an image URL or Cancel.', 'info'); return; }
            // update mine object in memory
            mine.image = url;
            // if user-owned, persist to localStorage
            if (mine._user) {
              try {
                const stored = JSON.parse(localStorage.getItem('userMines') || '[]');
                const idx = stored.findIndex(sm => sm.id && sm.id === mine.id);
                if (idx !== -1) { stored[idx].image = url; localStorage.setItem('userMines', JSON.stringify(stored)); }
              } catch(e){ console.warn('Could not persist image to localStorage', e); }
            }
            // update popup content to show new image
            const newImgHtml = url ? `<div><img src="${url}" onerror="this.onerror=null;this.src='https://via.placeholder.com/320x160?text=No+Image'" class="popup-image" alt="${mine.name}"></div><br>` : '';
            const newContent = `
              <div class="popup-content" data-mine-id="${mine.id}">
                ${newImgHtml}
                <b>${mine.name}</b><br>
                ${typeHtml}
                🔥 Emission: ${mine.emission || 'N/A'}<br>
                ${creditsHtml}
                ${productionHtml}
                ${statusHtml}
                <div style="margin-top:8px"><button class="edit-image-btn" data-mine-id="${mine.id}">Edit Image</button></div>
              </div>
            `;
            marker.setPopupContent(newContent);
            // update global arrays if present
            try { if (window._mapMines) {
              const gm = window._mapMines.find(x => x.id === mine.id);
              if (gm) gm.image = url;
            }} catch(e){}
            // reopen popup to reflect changes
            marker.openPopup();
          });
        });
      } catch (err) { console.error('popupopen handler error', err); }
    });
    marker.addTo(markerGroup);
    markers.push(marker);
  }

  // render all markers (useful after add/delete)
  function renderMarkers() {
    markerGroup.clearLayers();
    markers.length = 0;
    mines.forEach(m => addMineToMap(m));
    // keep exposed reference in sync
    try { window._mapMarkers = markers; window._mapMines = mines; } catch(e){}
  }

  renderMarkers();

  // fit map to show all mines
  const allLatLngs = mines.map(m => m.location);
  try { map.fitBounds(allLatLngs); } catch (e) { /* ignore if single point */ }

  // If the mine-map section is active at load, invalidate size after render
  // Robust invalidate helper: calls invalidateSize several times with delays
  function scheduleInvalidateIndiaMap() {
    if (!indiaMapInstance) return;
    const el = document.getElementById('mine-map');
    if (!el) return;
    const doInvalidate = () => {
      try { indiaMapInstance.invalidateSize(); } catch (e) { /* ignore */ }
    };

    // If container is currently visible, run a few retries to be safe
    const isVisibleNow = (el.offsetWidth > 0 && el.offsetHeight > 0 && window.getComputedStyle(el).display !== 'none');
    if (isVisibleNow) {
      setTimeout(doInvalidate, 50);
      setTimeout(doInvalidate, 240);
      setTimeout(doInvalidate, 600);
      return;
    }

    // Otherwise, schedule a delayed check in case visibility changes shortly
    setTimeout(() => {
      const nowVis = (el.offsetWidth > 0 && el.offsetHeight > 0 && window.getComputedStyle(el).display !== 'none');
      if (nowVis) { doInvalidate(); setTimeout(doInvalidate, 250); }
    }, 220);
  }

  // If the mine-map section is active at load, try invalidate
  try { scheduleInvalidateIndiaMap(); } catch(e) {}

  // Observe attribute changes (class/style) on the container so we can invalidate when it becomes visible
  try {
    const mmEl = document.getElementById('mine-map');
    if (mmEl && window.MutationObserver) {
      const obs = new MutationObserver((mutations) => {
        for (const m of mutations) {
          if (m.type === 'attributes' && (m.attributeName === 'style' || m.attributeName === 'class')) {
            const vis = (mmEl.offsetWidth > 0 && mmEl.offsetHeight > 0 && window.getComputedStyle(mmEl).display !== 'none');
            if (vis) { scheduleInvalidateIndiaMap(); break; }
          }
        }
      });
      obs.observe(mmEl, { attributes: true, attributeFilter: ['style','class'] });
      // also attempt when window orientation/resize occurs
      window.addEventListener('orientationchange', scheduleInvalidateIndiaMap);
    }
  } catch (e) { /* ignore */ }

  // Build mine list (click to focus)
  const mineSelectEl = document.getElementById('mineSelect');
  function buildList(indices) {
    if (!mineSelectEl) return;
    mineSelectEl.innerHTML = '<option value="-1">-- Select a Mine --</option>';
    const idxs = indices || mines.map((_,i)=>i);
    idxs.forEach(i => {
      const m = mines[i];
      const option = document.createElement('option');
      option.value = i;
      option.textContent = m.name;
      mineSelectEl.appendChild(option);
    });
  }
  buildList();

  // Handle select change to focus map
  if (mineSelectEl) {
    mineSelectEl.addEventListener('change', (e) => {
      // Update wallet display when mine selection changes
      updateWalletDisplay();
      migrateGlobalWalletIfNeeded();
      const selectedIndex = parseInt(e.target.value, 10);
      if (selectedIndex < 0 || !markers[selectedIndex]) return;
      const mine = mines[selectedIndex];
      map.setView(mine.location, 8);
      markers[selectedIndex].openPopup();
    });
  }

  // Logic for deleting a mine (needs to be adapted if you keep a delete feature)
  // This part is more complex with a select list, so for now we focus on the layout.
  /*
      // If this is a user-registered mine, add a small delete button
      if (m._user) {
        const del = document.createElement('button');
        del.className = 'mine-delete';
        del.title = 'Delete registered mine';
        del.textContent = 'Delete';
        del.addEventListener('click', (ev) => {
          ev.stopPropagation();
          // confirm
          if (!confirm(`Delete registered mine "${m.name}"?`)) return;
          // find index in master mines array
          const idxInMines = mines.findIndex(x => x.name === m.name && x.location[0] === m.location[0] && x.location[1] === m.location[1]);
          if (idxInMines === -1) return;
          // remove from mines
          mines.splice(idxInMines, 1);
          // remove from localStorage stored userMines
          const stored = JSON.parse(localStorage.getItem('userMines') || '[]');
          const filtered = stored.filter(um => !(um.name === m.name && um.location[0] === m.location[0] && um.location[1] === m.location[1]));
          localStorage.setItem('userMines', JSON.stringify(filtered));
          // re-render markers and list
          renderMarkers();
          buildList();
          if (registerMsg) { registerMsg.textContent = 'Mine deleted.'; setTimeout(()=> registerMsg.textContent = '', 3000); }
        });
        // attach delete button to item (right side)
        const btnWrap = document.createElement('div');
        btnWrap.style.float = 'right';
        btnWrap.appendChild(del);
        div.appendChild(btnWrap);
      }
      mineListEl.appendChild(div);
  */

  // ---------- Register Mine Handler ----------
  const registerBtn = document.getElementById('registerMineBtn');
  const registerMsg = document.getElementById('registerMsg');
  if (registerBtn) {
    registerBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const name = document.getElementById('mineName').value.trim();
      const type = document.getElementById('mineType').value;
      const lat = parseFloat(document.getElementById('mineLat').value);
      const lng = parseFloat(document.getElementById('mineLng').value);
      const image = (document.getElementById('mineImage') && document.getElementById('mineImage').value.trim()) ? document.getElementById('mineImage').value.trim() : '';
      const emission = document.getElementById('mineEmission').value.trim();
      const credits = document.getElementById('mineCredits').value.trim();
      const production = document.getElementById('mineProduction').value.trim();
      const status = document.getElementById('mineStatus').value.trim();

      if (!name || Number.isNaN(lat) || Number.isNaN(lng)) {
        if (registerMsg) registerMsg.textContent = 'Please provide a name and valid latitude/longitude.';
        return;
      }

      const newMine = { name, type, location: [lat, lng], emission, credits, production, status };

      // persist in localStorage
      const stored = JSON.parse(localStorage.getItem('userMines') || '[]');
  // include image when storing user mines
  stored.push(Object.assign({}, newMine, { image }));
      localStorage.setItem('userMines', JSON.stringify(stored));

      // update in-memory list and map
  const withImg = Object.assign({}, newMine, { image });
  mines.push(withImg);
  addMineToMap(withImg);
      buildList();
      try { map.setView(newMine.location, 8); markers[markers.length-1].openPopup(); } catch(e){}

      // feedback
      if (registerMsg) { registerMsg.textContent = 'Mine registered and added to map.'; setTimeout(()=>{ registerMsg.textContent=''; }, 4000); }

      // clear form
      document.getElementById('mineName').value = '';
      document.getElementById('mineLat').value = '';
      document.getElementById('mineLng').value = '';
      document.getElementById('mineEmission').value = '';
      document.getElementById('mineCredits').value = '';
      document.getElementById('mineProduction').value = '';
      document.getElementById('mineStatus').value = '';
    });
  }

  // Search box filter
  const mapSearch = document.getElementById('mapSearch');
  if (mapSearch) {
    mapSearch.addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      if (!q) {
        // show all
        markerGroup.clearLayers();
        mines.forEach((m, i) => markers[i].addTo(markerGroup));
        buildList();
        try { const currentAll = mines.map(m=>m.location); map.fitBounds(currentAll); } catch(e){}
        return;
      }

      // filter mines by name/type/status
      const matched = mines
        .map((m,i) => ({m,i}))
        .filter(x => x.m.name.toLowerCase().includes(q) || x.m.type.toLowerCase().includes(q) || x.m.status.toLowerCase().includes(q));

      const matchedIdxs = matched.map(x => x.i);

      // update list
      buildList(matchedIdxs);

      // update markers
      markerGroup.clearLayers();
      matchedIdxs.forEach(i => markers[i].addTo(markerGroup));

      if (matched.length === 1) {
        const m = matched[0].m;
        map.setView(m.location, 8);
        markers[matched[0].i].openPopup();
      }
    });
  }

}

// ---------------- Mines Directory (generated dataset + UI) ----------------
(function initMinesDirectory(){
  const table = document.getElementById('dirTable');
  if (!table) return; // no directory on page

  // basic Indian states list (shortened)
  const states = ["Jharkhand","Chhattisgarh","West Bengal","Telangana","Odisha","Madhya Pradesh","Maharashtra","Bihar","Assam","Rajasthan","Karnataka","Kerala","Tamil Nadu","Uttar Pradesh","Haryana","Punjab","Gujarat","Andhra Pradesh","Arunachal Pradesh","Goa","Jammu & Kashmir","Uttarakhand","Himachal Pradesh","Manipur","Meghalaya","Mizoram","Nagaland","Sikkim","Tripura"];

  // generate synthetic dataset of 250 mines (deterministic seed via index)
  function generateMines(n){
    const arr = [];
    const bases = [
      'Shankar Colliery','Kamal Coalfield','Rohini Pit','Sundar Colliery','Ganga Coalfield','Brahma Pit','Triveni Colliery','Vindhya Coalfield','Aranya Pit','Narmada Colliery',
      'Dakshin Colliery','Uttara Coalfield','Kaveri Pit','Sita Colliery','Aravali Coalfield','Mahi Pit','Soma Colliery','Tunga Coalfield','Indus Pit','Varuna Colliery',
      'Bhagirathi Mine','Pushkar Colliery','Lakshmi Pit','Chandra Coalfield','Asha Mine','Vikram Colliery','Megha Pit','Neelam Coalfield','Ravi Mine','Surya Colliery'
    ];
    // approximate bounding boxes for Indian states (latMin, latMax, lngMin, lngMax)
    const stateBounds = {
      'Jharkhand': [22.0, 25.5, 83.0, 87.0],
      'Chhattisgarh': [17.5, 24.2, 80.0, 84.5],
      'West Bengal': [21.5, 27.0, 85.0, 89.0],
      'Telangana': [15.6, 19.5, 77.0, 81.5],
      'Odisha': [17.5, 22.5, 81.0, 87.5],
      'Madhya Pradesh': [21.0, 26.9, 74.0, 82.0],
      'Maharashtra': [15.6, 22.1, 72.6, 80.9],
      'Bihar': [24.0, 27.5, 83.0, 88.5],
      'Assam': [24.0, 28.2, 89.5, 96.0],
      'Rajasthan': [23.3, 30.1, 69.0, 78.0],
      'Karnataka': [11.5, 18.5, 74.0, 78.5],
      'Kerala': [8.0, 12.8, 74.0, 77.5],
      'Tamil Nadu': [8.0, 13.5, 76.0, 80.3],
      'Uttar Pradesh': [24.0, 31.0, 77.0, 84.5],
      'Haryana': [27.5, 30.9, 74.5, 77.5],
      'Punjab': [29.9, 32.5, 73.5, 76.9],
      'Gujarat': [20.0, 24.7, 68.0, 74.5],
      'Andhra Pradesh': [13.5, 19.1, 77.0, 84.9],
      'Arunachal Pradesh': [26.9, 29.8, 91.2, 97.5],
      'Goa': [14.0, 15.8, 73.6, 75.9],
      'Jammu & Kashmir': [32.0, 37.1, 72.0, 80.0],
      'Uttarakhand': [28.8, 31.3, 77.5, 81.0],
      'Himachal Pradesh': [30.3, 33.4, 75.2, 79.8],
      'Manipur': [23.8, 25.9, 93.0, 94.8],
      'Meghalaya': [25.0, 26.5, 89.8, 92.0],
      'Mizoram': [21.5, 23.4, 92.5, 93.5],
      'Nagaland': [25.6, 27.4, 93.4, 95.2],
      'Sikkim': [27.0, 28.0, 88.0, 88.9],
      'Tripura': [22.5, 24.0, 91.0, 92.7]
    };

    for (let i=1;i<=n;i++){
      const state = states[i % states.length];
      const type = (i % 3 === 0) ? 'Underground' : 'Opencast';
      const size = (i % 7 === 0) ? 'Major' : 'Minor';
      const renewable = (i % 5 === 0) ? 'yes' : 'no';
      const compliant = (i % 11 === 0) ? 'noncompliant' : 'compliant';

      // choose bounding box for the state, default to central India box if unknown
      const bb = stateBounds[state] || [16.0, 26.0, 73.0, 86.0];
      const latMin = bb[0], latMax = bb[1], lngMin = bb[2], lngMax = bb[3];

      // generate a coordinate within the state's bbox with slight jitter
      const lat = latMin + Math.random() * (latMax - latMin);
      const lng = lngMin + Math.random() * (lngMax - lngMin);

      const emission = +(0.05 + (i%100)/10 + Math.random()*1.2).toFixed(2); // MtCO2e/year approx
      const production = Math.round((0.5 + (i%200)/10 + Math.random()*4.0)*1000000); // tonnes/year
      const base = bases[i % bases.length];
      const name = `${base} — ${state}`;
  // assign a seeded picsum.photos image per mine (uses base+state to vary images)
  const seedStr = encodeURIComponent(base + '-' + state + '-' + i);
  const imgUrl = `https://minearc.com/wp-content/uploads/2020/11/Opinion-Piece-Coal-Mine-Refuge-Chamber-Debate.jpg`;
      arr.push({ id: 'gen-'+i, name, state, type, size, renewable, compliance: compliant, emission, production, image: imgUrl, location: [parseFloat(lat.toFixed(4)), parseFloat(lng.toFixed(4))] });
    }
    return arr;
  }

  let directoryMines = generateMines(250);

  // populate state select
  const stateSelect = document.getElementById('dirState');
  states.forEach(s => { const o = document.createElement('option'); o.value = s; o.textContent = s; stateSelect.appendChild(o); });

  const controls = {
    search: document.getElementById('dirSearch'),
    state: document.getElementById('dirState'),
    type: document.getElementById('dirType'),
    size: document.getElementById('dirSize'),
    renewable: document.getElementById('dirRenewable'),
    compliance: document.getElementById('dirCompliance'),
    sort: document.getElementById('dirSort')
  };

  const tbody = table.querySelector('tbody');
  const pager = document.getElementById('dirPager');
  let pageSize = 20, currentPage = 1;

  function applyFiltersAndSort(){
    const q = (controls.search.value||'').trim().toLowerCase();
    const st = controls.state.value;
    const tp = controls.type.value;
    const sz = controls.size.value;
    const ren = controls.renewable.value;
    const comp = controls.compliance.value;
    const sort = controls.sort.value;

    let list = directoryMines.filter(m => {
      if (q){ if (!(m.name.toLowerCase().includes(q) || m.state.toLowerCase().includes(q))) return false; }
      if (st && m.state !== st) return false;
      if (tp && m.type !== tp) return false;
      if (sz && m.size !== sz) return false;
      if (ren && m.renewable !== ren) return false;
      if (comp && m.compliance !== comp) return false;
      return true;
    });

    // sort
    if (sort === 'name_asc') list.sort((a,b)=> a.name.localeCompare(b.name));
    else if (sort === 'name_desc') list.sort((a,b)=> b.name.localeCompare(a.name));
    else if (sort === 'emission_asc') list.sort((a,b)=> a.emission - b.emission);
    else if (sort === 'emission_desc') list.sort((a,b)=> b.emission - a.emission);
    else if (sort === 'production_asc') list.sort((a,b)=> a.production - b.production);
    else if (sort === 'production_desc') list.sort((a,b)=> b.production - a.production);

    return list;
  }

  function renderPage(page=1){
    currentPage = page;
    const list = applyFiltersAndSort();
    const total = list.length;
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const start = (page-1)*pageSize;
    const slice = list.slice(start, start+pageSize);
    tbody.innerHTML = '';
    slice.forEach(m => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${m.name}</td><td>${m.state}</td><td>${m.type}</td><td>${m.size}</td><td>${m.emission}</td><td>${m.production.toLocaleString()}</td><td>${m.renewable}</td><td>${m.compliance}</td><td></td>`;
      const actionTd = tr.querySelector('td:last-child');
      const btn = document.createElement('button'); btn.className = 'dir-action-btn'; btn.textContent = 'Show on Map';
      btn.addEventListener('click', () => {
        const mapRef = (typeof window !== 'undefined') ? window.indiaMapInstance : null;
        if (typeof L === 'undefined' || !mapRef) {
          showToast('Map not available on this page.', 'info');
          return;
        }

        // try to find an existing marker for this location in the map's mines list
        const mapMines = (window._mapMines && Array.isArray(window._mapMines)) ? window._mapMines : [];
        const mapMarkers = (window._mapMarkers && Array.isArray(window._mapMarkers)) ? window._mapMarkers : [];

        function coordsEqual(a,b){
          if (!a || !b) return false;
          const latEq = Math.abs(a[0] - b[0]) < 0.0006;
          const lngEq = Math.abs(a[1] - b[1]) < 0.0006;
          return latEq && lngEq;
        }

        let foundIdx = -1;
        for (let i=0;i<mapMines.length;i++){
          const mm = mapMines[i];
          if (coordsEqual(mm.location, m.location) || (mm.name && mm.name === m.name)) { foundIdx = i; break; }
        }

        if (foundIdx >= 0 && mapMarkers[foundIdx]) {
          try {
            mapRef.setView(m.location, 8);
            mapMarkers[foundIdx].openPopup();
            return;
          } catch (e) { /* fallback to creating a popup below */ }
        }

        // No existing marker found — create a temporary marker (and add to markerGroup)
        try {
          const tmpMarker = L.marker(m.location).addTo(window._markerGroup || mapRef);
          // build popup content including image if present
          const safeImg2 = m.image ? m.image : '';
          const imgHtml = (safeImg2) ? `<div><img src="${safeImg2}" onerror="this.onerror=null;this.src='https://via.placeholder.com/320x160?text=No+Image'" class="popup-image" alt="${m.name}"></div><br>` : '';
          const typeHtml = m.type ? `<i>${m.type}</i><br><br>` : '';
          const creditsHtml = m.credits ? `🌿 Carbon Credits: ${m.credits}<br>` : '';
          const productionHtml = m.production ? `📦 Production: ${m.production}<br>` : '';
          const statusHtml = m.status ? `🏁 Status: ${m.status}` : '';
          const popupContent = `
            <div class="popup-content">
              ${imgHtml}
              <b>${m.name}</b><br>
              ${typeHtml}
              🔥 Emission: ${m.emission || 'N/A'}<br>
              ${creditsHtml}
              ${productionHtml}
              ${statusHtml}
            </div>
          `;
          tmpMarker.bindPopup(popupContent, { maxWidth: 360 });
          tmpMarker.openPopup();
          mapRef.setView(m.location, 8);

          // persist this marker in the global arrays so subsequent clicks reuse it
          try {
            if (window._mapMines) window._mapMines.push(m);
            if (window._mapMarkers) window._mapMarkers.push(tmpMarker);
          } catch(e){}
        } catch (err) {
          console.error('Failed to add temporary marker:', err);
          showToast('Could not show location on map. Check console for details.', 'error');
        }
      });
      actionTd.appendChild(btn);
      tbody.appendChild(tr);
    });

    // pager
    pager.innerHTML = '';
    for (let p=1;p<=pages;p++){
      const b = document.createElement('button'); b.className = 'dir-page-btn'; b.textContent = p; if (p===page) b.classList.add('active');
      b.addEventListener('click', ()=> renderPage(p));
      pager.appendChild(b);
    }
  }

  // wire controls
  ['search','state','type','size','renewable','compliance','sort'].forEach(id => {
    const el = controls[id];
    if (!el) return;
    el.addEventListener('input', ()=> renderPage(1));
    el.addEventListener('change', ()=> renderPage(1));
  });

  // initial render
  renderPage(1);

  // expose for debugging
  window.directoryMines = directoryMines;
})();

// ---------------- Carbon Credits Calculator ----------------
function initCarbonCreditsCalculator(){
  const select = document.getElementById('ccMineSelect');
  const nameInput = document.getElementById('ccMineName');
  const btn = document.getElementById('estimateCreditsBtn');
  const resultEl = document.getElementById('creditsResult');

  // Try to populate select from available global mines arrays (poll until available)
  function populateMines(attemptsLeft){
    try {
      const candidates = window._mapMines || window.directoryMines || null;
      if (candidates && select) {
        // clear except default
        select.innerHTML = '<option value="">-- select a mine --</option>';
        candidates.forEach((m, idx) => {
          const o = document.createElement('option');
          o.value = (m && m.id) ? m.id : ('mine-'+idx);
          o.textContent = m && m.name ? m.name : (`Mine ${idx+1}`);
          select.appendChild(o);
        });
        return;
      }
    } catch(e){ /* ignore */ }
    if (attemptsLeft > 0) setTimeout(()=> populateMines(attemptsLeft-1), 250);
  }
  populateMines(12);

  function parseNumber(id){
    const el = document.getElementById(id);
    if (!el) return 0;
    const v = parseFloat(el.value);
    return Number.isFinite(v) ? v : 0;
  }

  // Build a structured estimate details object from current input values (safe to call when saving)
  function buildEstimateDetails() {
    const GWP_CH4 = 28;
    const ELECTRICITY_EF_T_PER_MWH = 0.82;
    const DIESEL_EF_T_PER_L = 2.68/1000;
    const AFFORESTATION_RATE_T_PER_HA = 6;

    const methane_t = parseNumber('ccMethane');
    const vam_t = parseNumber('ccVAM');
    const renewable_mwh = parseNumber('ccRenewable');
    const diesel_l = parseNumber('ccDiesel');
    const efficiency_t = parseNumber('ccEfficiency');
    const aff_ha = parseNumber('ccAfforestation');

    const methane_co2e = methane_t * GWP_CH4;
    const vam_co2e = vam_t * GWP_CH4;
    const renewable_co2e = renewable_mwh * ELECTRICITY_EF_T_PER_MWH;
    const diesel_co2e = diesel_l * DIESEL_EF_T_PER_L;
    const afforestation_co2e = aff_ha * AFFORESTATION_RATE_T_PER_HA;

    const total_annual_co2e = methane_co2e + vam_co2e + renewable_co2e + diesel_co2e + efficiency_t + afforestation_co2e;

    // derive mine/project name if present
    const select = document.getElementById('ccMineSelect');
    const nameInput = document.getElementById('ccMineName');
    let mineName = null;
    try { if (select && select.value) mineName = select.selectedOptions[0].textContent; } catch(e){}
    if (!mineName && nameInput && nameInput.value.trim()) mineName = nameInput.value.trim();

    // attempt to infer production from selected mine metadata (same logic as estimate)
    let productionTonnes = null;
    try {
      const mineId = select ? select.value : '';
      if (mineId && window._mapMines) {
        const m = window._mapMines.find(x => x.id === mineId);
        if (m && m.production) {
          const p = String(m.production).replace(/[,\s]/g,'');
          const mm = p.match(/([0-9\.]+)M|([0-9\.]+)million|([0-9\.]+)e6/i);
          if (mm) {
            const num = parseFloat(mm[1]||mm[2]||mm[3]); if (!Number.isNaN(num)) productionTonnes = num * 1e6;
          } else {
            const dig = p.match(/([0-9\.]+)/);
            if (dig) productionTonnes = parseFloat(dig[1]);
          }
        }
      }
    } catch(e){}

    return {
      methane_co2e, vam_co2e, renewable_co2e, diesel_co2e, efficiency_t, afforestation_co2e,
      credits: total_annual_co2e,
      productionTonnes: productionTonnes || null,
      mineName: mineName || null,
      timestamp: new Date().toISOString()
    };
  }

  function estimateCredits(){
    // Assumptions/constants
    const GWP_CH4 = 28; // CO2e per tonne CH4 (GWP100)
    const ELECTRICITY_EF_T_PER_MWH = 0.82; // tCO2 per MWh (0.82 kg/kWh -> 0.82 t/MWh)
    const DIESEL_EF_T_PER_L = 2.68/1000; // tCO2 per litre
    const AFFORESTATION_RATE_T_PER_HA = 6; // tCO2 per hectare per year (conservative)

    const methane_t = parseNumber('ccMethane');
    const vam_t = parseNumber('ccVAM');
    const renewable_mwh = parseNumber('ccRenewable');
    const diesel_l = parseNumber('ccDiesel');
    const efficiency_t = parseNumber('ccEfficiency');
    const aff_ha = parseNumber('ccAfforestation');

    const methane_co2e = methane_t * GWP_CH4;
    const vam_co2e = vam_t * GWP_CH4;
    const renewable_co2e = renewable_mwh * ELECTRICITY_EF_T_PER_MWH;
    const diesel_co2e = diesel_l * DIESEL_EF_T_PER_L;
    const afforestation_co2e = aff_ha * AFFORESTATION_RATE_T_PER_HA;

    const total_annual_co2e = methane_co2e + vam_co2e + renewable_co2e + diesel_co2e + efficiency_t + afforestation_co2e;

    // Find selected mine info if available
    const mineId = select ? select.value : '';
    let mineInfo = null;
    try { if (mineId && window._mapMines) mineInfo = window._mapMines.find(m => (m.id === mineId)); } catch(e){}
    if (!mineInfo && nameInput && nameInput.value.trim()) {
      mineInfo = { name: nameInput.value.trim() };
    }

    // Attempt to parse production (tonnes/year) from mineInfo.production if possible
    let productionTonnes = null;
    if (mineInfo && mineInfo.production) {
      // extract digits and million/tonnes markers
      const p = String(mineInfo.production).replace(/[,\s]/g,'');
      const m = p.match(/([0-9\.]+)M|([0-9\.]+)million|([0-9\.]+)e6/i);
      if (m) {
        const num = parseFloat(m[1]||m[2]||m[3]);
        if (!Number.isNaN(num)) productionTonnes = num * 1e6;
      } else {
        const digits = p.match(/([0-9\.]+)/);
        if (digits) productionTonnes = parseFloat(digits[1]);
      }
    }

    // credits are 1:1 with tCO2e avoided/removed (simple estimate)
    const credits = total_annual_co2e;

    // Build output
    let out = `<b>Estimated Annual Carbon Credits:</b> <span style="font-size:1.15em">${credits.toFixed(2)} tCO₂e</span><br><br>`;
    out += `<b>Breakdown:</b><br>`;
    out += `• Methane capture: ${methane_co2e.toFixed(2)} tCO₂e<br>`;
    out += `• VAM destruction: ${vam_co2e.toFixed(2)} tCO₂e<br>`;
    out += `• Renewable generation (avoided): ${renewable_co2e.toFixed(2)} tCO₂e<br>`;
    out += `• Diesel replaced (avoided): ${diesel_co2e.toFixed(2)} tCO₂e<br>`;
    out += `• Energy efficiency: ${efficiency_t.toFixed(2)} tCO₂e<br>`;
    out += `• Afforestation/reclamation: ${afforestation_co2e.toFixed(2)} tCO₂e<br>`;

    if (mineInfo && mineInfo.name) out = `<b>Mine:</b> ${mineInfo.name}<br>` + out;

    if (productionTonnes && productionTonnes > 0) {
      const creditsPerTonne = credits / productionTonnes;
      out += `<br><b>Credits per production:</b> ${creditsPerTonne.toExponential(3)} tCO₂e per tonne produced`; 
    }

    if (resultEl) {
      resultEl.style.display = 'block'; // show estimation box when estimating
    }
    resultEl.innerHTML = out;
    // save structured breakdown for later use when saving the credit
    lastEstimateDetails = buildEstimateDetails();
  }

  if (btn) btn.addEventListener('click', (e) => { e.preventDefault(); estimateCredits(); });
}

// --- Carbon Credits: Ledger, Wallet, Sell, Verify, Analytics, Certificate ---

// ledger helpers (localStorage-backed)
function loadCredits() {
  try { return JSON.parse(localStorage.getItem('credits') || '[]'); } catch (e) { return []; }
}

function saveCredits(arr) {
  localStorage.setItem('credits', JSON.stringify(arr || []));
}

// === BACKWARD COMPATIBILITY: Migrate global wallet to selected mine (one-time) ===
function migrateGlobalWalletIfNeeded() {
  try {
    const globalWallet = Number(localStorage.getItem('wallet') || 0);
    const migrated = localStorage.getItem('wallet_migrated_to_mine');
    if (globalWallet > 0 && !migrated && typeof document !== 'undefined') {
      const mineSelect = document.getElementById('mineSelect');
      if (mineSelect && mineSelect.value && mineSelect.value !== '-1') {
        const selectedMine = mineSelect.value;
        const mineWallets = getMineWallets();
        if (!mineWallets[selectedMine]) {
          mineWallets[selectedMine] = globalWallet;
          saveMineWallets(mineWallets);
          localStorage.setItem('wallet_migrated_to_mine', 'true');
          console.log(`✅ Migrated ₹${globalWallet} from global wallet to ${selectedMine}`);
        }
      }
    }
  } catch(e) { console.warn('Migration check failed', e); }
}

// Get the currently selected mine from the dashboard
function getSelectedMine() {
  try {
    const mineSelect = document.getElementById('mineSelect');
    return (mineSelect && mineSelect.value && mineSelect.value !== '-1') ? mineSelect.value : null;
  } catch(e) { return null; }
}

// === NEW PER-MINE WALLET SYSTEM ===
function getWallet() {
  // Returns wallet balance for SELECTED mine only
  const selectedMine = getSelectedMine();
  if (!selectedMine) return 0;
  return getMineWallet(selectedMine);
}

function setWallet(v, mineName = null) {
  // Sets wallet for specified mine OR selected mine
  const targetMine = mineName || getSelectedMine();
  if (!targetMine) return;
  setMineWallet(targetMine, v);
  updateWalletDisplay();
}

function addToWallet(amount, mineName = null) {
  // Adds to specified mine OR selected mine's wallet
  const targetMine = mineName || getSelectedMine();
  if (!targetMine) return;
  addToMineWallet(targetMine, amount);
  updateWalletDisplay();
}

function updateWalletDisplay() {
  // Updates all wallet display elements for the selected mine
  const wallet = getWallet();
  const el = document.getElementById('ccWallet');
  if (el) el.textContent = '₹' + Number(wallet).toLocaleString();
}

// Per-mine wallet functions
function getMineWallets() {
  try {
    const wallets = JSON.parse(localStorage.getItem('mine_wallets') || '{}');
    // SAFETY CHECK: Remove any numeric keys (invalid mine names)
    Object.keys(wallets).forEach(key => {
      if (!isNaN(key) || key === '' || key === null) {
        delete wallets[key];
      }
    });
    return wallets;
  } catch(e) { return {}; }
}

function saveMineWallets(wallets) {
  // SAFETY CHECK: Clean numeric keys before saving
  if (wallets) {
    Object.keys(wallets).forEach(key => {
      if (!isNaN(key) || key === '' || key === null) {
        delete wallets[key];
      }
    });
  }
  localStorage.setItem('mine_wallets', JSON.stringify(wallets || {}));
}

function getMineWallet(mineName) {
  // SAFETY CHECK: Validate mineName is a string and not numeric
  if (!mineName || typeof mineName !== 'string' || !isNaN(mineName)) {
    console.warn('Invalid mine name:', mineName);
    return 0;
  }
  const wallets = getMineWallets();
  return Number(wallets[mineName] || 0);
}

function setMineWallet(mineName, amount) {
  // SAFETY CHECK: Validate mineName is a string and not numeric
  if (!mineName || typeof mineName !== 'string' || !isNaN(mineName)) {
    console.warn('Invalid mine name:', mineName);
    return;
  }
  const wallets = getMineWallets();
  wallets[mineName] = Number(amount) || 0;
  saveMineWallets(wallets);
}

function addToMineWallet(mineName, amount) {
  if (!mineName) return;
  const current = getMineWallet(mineName);
  setMineWallet(mineName, current + Number(amount || 0));
}

// Render Mine Wallet Table from LocalStorage
function renderMineWalletTable() {
  const wallets = getMineWallets();
  const tbody = document.getElementById('mineWalletTableBody');
  if (!tbody) return;

  tbody.innerHTML = '';

  // If no mines have wallets, show empty message
  if (Object.keys(wallets).length === 0) {
    tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;color:#999;">No wallet data yet. Select a mine and perform a transaction.</td></tr>';
    return;
  }

  // Populate each mine's wallet balance
  Object.entries(wallets)
    .sort((a, b) => a[0].localeCompare(b[0])) // Sort alphabetically by mine name
    .forEach(([mineName, balance]) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${mineName}</strong></td>
        <td>₹${Number(balance).toLocaleString('en-IN')}</td>
      `;
      tbody.appendChild(tr);
    });
}

function saveGeneratedCredit(amount, project, details) {
  const credits = loadCredits();
  credits.push({ id: Date.now(), amount: Number(amount) || 0, project: project || 'Unnamed', date: new Date().toISOString(), status: 'Generated', details: details || null });
  saveCredits(credits);
  renderCreditsTable();
  updateCreditsSummary();
}

function sellCredit(id, price, amountToSell) {
  const credits = loadCredits();
  const idx = credits.findIndex(c => String(c.id) === String(id));
  if (idx === -1) return false;
  const credit = credits[idx];
  const available = Number(credit.amount || 0);

  // determine amount to sell (in tCO2e)
  let sellAmount = (typeof amountToSell === 'number' && !Number.isNaN(amountToSell)) ? Number(amountToSell) : null;
  if (sellAmount === null) {
    // prompt user for amount to sell; allow full sale by default
    const resp = prompt(`Enter amount (tCO₂e) to sell (max ${available}). Leave empty to sell full amount:`);
    if (resp === null) return false; // user cancelled
    const parsed = parseFloat(resp);
    if (Number.isFinite(parsed)) sellAmount = parsed; else sellAmount = available;
  }

  if (sellAmount <= 0) { showToast('Enter a positive amount to sell.', 'info'); return false; }
  if (sellAmount > available) { showToast('Requested sell amount exceeds available credit.', 'error'); return false; }

  // compute revenue: price is treated as price per unit (per tCO2e)
  // Apply platform scaling so wallet increment is 10% of raw price*amount (90% reduction)
  const PLATFORM_PAYOUT_RATIO = 0.10; // seller receives 10% of gross (adjustable)
  const revenue = Number(price || 0) * Number(sellAmount) * PLATFORM_PAYOUT_RATIO;

  // record transaction on the credit
  credit.transactions = credit.transactions || [];
  credit.transactions.push({ type: 'auction', amountSold: sellAmount, pricePerUnit: Number(price || 0), revenue, date: new Date().toISOString() });

  // deduct amount and update status
  const remaining = +(available - sellAmount).toFixed(6);
  credit.amount = remaining;
  if (remaining <= 0) {
    credit.status = 'Sold';
  } else {
    credit.status = 'Partially Sold';
  }

  // persist and update wallet/reports/history
  saveCredits(credits);
  // Credit ONLY the specific mine's wallet (per-mine isolation)
  const mineName = credit.project || 'Unnamed Project';
  addToMineWallet(mineName, revenue);
  
  // Update wallet display if this credit belongs to the selected mine
  if (getSelectedMine() === mineName) {
    updateWalletDisplay();
  }

  // auction history (store per-sale record)
  try {
    const hist = JSON.parse(localStorage.getItem('auction_history') || '[]');
    hist.push({ id, project: mineName, amountSold: sellAmount, pricePerUnit: Number(price || 0), revenue, remainingAfter: remaining, date: new Date().toISOString() });
    localStorage.setItem('auction_history', JSON.stringify(hist));
  } catch (e) { console.warn('Could not persist auction history', e); }

  // update UI
  renderCreditsTable();
  updateCreditsSummary();
  renderMineWalletTable(); // Update mine wallet table after sale
  try { checkBadgeUnlockConditions(); } catch(e){}

  showToast(`Sold ${sellAmount} tCO₂e for ₹${revenue.toLocaleString()}`, 'success');
  return true;
}

function verifyCredit(id) {
  const credits = loadCredits();
  const idx = credits.findIndex(c => String(c.id) === String(id));
  if (idx === -1) return false;
  credits[idx].status = 'Verified';
  saveCredits(credits);
  renderCreditsTable();
  updateCreditsSummary();
  return true;
}

function calculateOffsetPercent() {
  const credits = loadCredits().filter(c => c.status !== 'Sold').reduce((s,c)=> s + Number(c.amount||0), 0);
  const emissions = Number(totalEmission || 0);
  if (!emissions || emissions === 0) return '0.00';
  return ((credits / emissions) * 100).toFixed(2);
}

function formatDateISO(iso) { try { return new Date(iso).toLocaleString(); } catch(e){ return iso; } }

function renderCreditsTable() {
  const tbody = document.getElementById('creditsTbody'); if (!tbody) return;
  const credits = loadCredits();
  tbody.innerHTML = '';
  credits.forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="radio" name="selectedCredit" value="${c.id}"></td>
      <td>${formatDateISO(c.date)}</td>
      <td>${(c.project||'')}</td>
      <td>${Number(c.amount||0)}</td>
      <td>${c.status || ''}</td>
      <td>
        <button class="cc-verify" data-id="${c.id}">Verify</button>
        <button class="cc-cert" data-id="${c.id}">Certificate</button>
        <button class="cc-delete" data-id="${c.id}">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  // wire per-row buttons
  Array.from(document.querySelectorAll('.cc-verify')).forEach(b => { b.addEventListener('click', (e)=>{ const id = e.target.dataset.id; const role = document.getElementById('userRoleSelect') ? document.getElementById('userRoleSelect').value : 'manager'; if (role==='auditor' || role==='admin') { verifyCredit(id); showToast('Credit verified.', 'success'); } else { showToast('Only auditors/admins can verify credits. Change role to Auditor.', 'info'); } }); });
  Array.from(document.querySelectorAll('.cc-cert')).forEach(b => { b.addEventListener('click', (e)=>{ const id = e.target.dataset.id; generateCertificateById(id); }); });
  Array.from(document.querySelectorAll('.cc-delete')).forEach(b => { b.addEventListener('click', (e)=>{ const id = e.target.dataset.id; // perform delete directly (no blocking confirm)
    deleteCredit(id); }); });

  // render auction-specific credits table (compact view)
  const auctionTbody = document.getElementById('auctionCreditsTbody');
  const auctionRemainingTotalEl = document.getElementById('auctionRemainingTotal');
  const auctionSoldTotalEl = document.getElementById('auctionSoldTotal');
  const auctionHistoryTbody = document.getElementById('auctionHistoryTbody');
  if (auctionTbody) {
    auctionTbody.innerHTML = '';
    // Only show credits with remaining amount > 0
    const auctionCredits = credits.filter(c => Number(c.amount || 0) > 0);
    const remainingTotal = auctionCredits.reduce((s,c)=> s + Number(c.amount||0), 0);
    const soldTotal = (()=> {
      try {
        const hist = JSON.parse(localStorage.getItem('auction_history') || '[]');
        return hist.reduce((s,h)=> s + Number(h.amountSold||0), 0);
      } catch(e){ return 0; }
    })();
    if (auctionRemainingTotalEl) auctionRemainingTotalEl.textContent = remainingTotal.toFixed(2) + ' tCO₂e';
    if (auctionSoldTotalEl) auctionSoldTotalEl.textContent = soldTotal.toFixed(2) + ' tCO₂e';
    if (!auctionCredits.length) {
      auctionTbody.innerHTML = '<tr><td colspan="6">No carbon credits available for auction.</td></tr>';
    } else {
      auctionCredits.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><input type="radio" name="selectedCredit" value="${c.id}"></td>
          <td>${formatDateISO(c.date)}</td>
          <td>${(c.project||'')}</td>
          <td>${Number(c.amount||0)}</td>
          <td>${c.status || ''}</td>
          <td><button class="auction-quick-sell" data-id="${c.id}">Sell @ Market</button></td>
        `;
        auctionTbody.appendChild(tr);
      });
    }

    Array.from(auctionTbody.querySelectorAll('.auction-quick-sell')).forEach(b => {
      b.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        const price = Number(document.getElementById('auctionPrice').textContent || 0);
        if (!price || price <= 0) { showToast('Invalid market price.', 'error'); return; }
        sellCredit(id, price);
      });
    });
  }

  // render auction history table
  if (auctionHistoryTbody) {
    auctionHistoryTbody.innerHTML = '';
    const hist = (()=> { try { return JSON.parse(localStorage.getItem('auction_history') || '[]'); } catch(e){ return []; } })();
    if (!hist.length) {
      auctionHistoryTbody.innerHTML = '<tr><td colspan="5">No auction sales yet.</td></tr>';
    } else {
      hist.slice().reverse().forEach(entry => {
        const credit = credits.find(c => String(c.id) === String(entry.id));
        const name = entry.project || (credit ? (credit.project||'Unnamed Project') : 'Unknown');
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${formatDateISO(entry.date)}</td>
          <td>${name}</td>
          <td>${Number(entry.amountSold||0)}</td>
          <td>₹${Number(entry.pricePerUnit||0)}</td>
          <td>₹${Number(entry.revenue||0).toLocaleString()}</td>
        `;
        auctionHistoryTbody.appendChild(tr);
      });
    }
  }
}

function updateCreditsSummary(){
  const credits = loadCredits();
  const available = credits.filter(c=> c.status !== 'Sold').reduce((s,c)=> s + Number(c.amount||0), 0);
  const badge = document.getElementById('ccTotalBadge'); if (badge) badge.textContent = available.toFixed(2) + ' tCO₂e';
  const offsetEl = document.getElementById('creditsResult'); if (offsetEl) {
    // Offset display removed to reduce vertical space and avoid page scrolling
    // If you want the offset shown elsewhere, we can add a compact badge next to the totals.
  }
  // update wallet display
  updateWalletDisplay();
}

function getMarketPrice() { return 200 + Math.floor(Math.random() * 50); }

async function generateCertificateById(id) {
  const credits = loadCredits(); const c = credits.find(x=> String(x.id)===String(id)); if (!c) { alert('Credit not found'); return; }
  const mine = c.project || 'Unnamed Project';
  // Populate certificate fields
  document.getElementById('certMineName').textContent = mine;
  document.getElementById('certDate').textContent = formatDateISO(c.date);
  const certDiv = document.getElementById('certificate-div'); if (certDiv) certDiv.style.display = 'block';

  const issueDateEl = document.getElementById('certIssueDate'); if (issueDateEl) issueDateEl.textContent = `Issued: ${new Date().toLocaleDateString()}`;

  // Main certification statement
  const stmtEl = document.getElementById('certStatement');
  const amountStr = Number(c.amount||0).toFixed(2);
  const year = new Date(c.date || new Date()).getFullYear();
  if (stmtEl) stmtEl.textContent = `This is to certify that ${mine} has generated ${amountStr} tCO₂e of carbon credits in the year ${year}. The calculations report and breakdown are provided below.`;

  // Populate breakdown from stored calculation details if present
  const breakdownEl = document.getElementById('certBreakdown');
  const prodInfoEl = document.getElementById('certProductionInfo');
  if (breakdownEl) breakdownEl.innerHTML = '';
  if (c.details) {
    const d = c.details;
    const items = [
      {k: 'Methane capture (tCO₂e)', v: (d.methane_co2e||0).toFixed(2)},
      {k: 'VAM destruction (tCO₂e)', v: (d.vam_co2e||0).toFixed(2)},
      {k: 'Renewable generation avoided (tCO₂e)', v: (d.renewable_co2e||0).toFixed(2)},
      {k: 'Diesel replaced (tCO₂e)', v: (d.diesel_co2e||0).toFixed(2)},
      {k: 'Energy efficiency savings (tCO₂e)', v: (d.efficiency_t||0).toFixed(2)},
      {k: 'Afforestation / Reclamation (tCO₂e)', v: (d.afforestation_co2e||0).toFixed(2)}
    ];
    items.forEach(it => {
      const li = document.createElement('li'); li.textContent = `${it.k}: ${it.v}`; breakdownEl.appendChild(li);
    });
    if (prodInfoEl) {
      if (d.productionTonnes && Number(d.productionTonnes) > 0) {
        prodInfoEl.textContent = `Production (tonnes/year): ${Number(d.productionTonnes).toLocaleString()} — Credits per tonne: ${(Number(d.credits||0) / Number(d.productionTonnes)).toExponential(3)}`;
      } else {
        prodInfoEl.textContent = '';
      }
    }
  } else {
    if (breakdownEl) breakdownEl.innerHTML = '<li>Detailed calculation not available. Please save from the Estimate step to include calculations in the certificate.</li>';
    if (prodInfoEl) prodInfoEl.textContent = '';
  }

  // Appreciation/acknowledgement text
  const appr = document.getElementById('certAppreciation');
  if (appr) appr.textContent = `We recognize and appreciate the efforts of ${mine} in implementing projects that reduce greenhouse gas emissions and contribute to climate action. This certificate acknowledges the verified generation of carbon credits as stated above.`;
  // generate PDF via html2canvas + jsPDF
  try {
    await new Promise(r=>setTimeout(r,150));
    // ensure printable background for html2canvas
    const prevBg = certDiv.style.backgroundColor;
    certDiv.style.backgroundColor = '#ffffff';
    const canvas = await html2canvas(certDiv, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    const img = canvas.toDataURL('image/png');
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    const pdfW = pdf.internal.pageSize.getWidth();
    const imgProps = pdf.getImageProperties(img);
    const h = (imgProps.height * pdfW) / imgProps.width;
    pdf.addImage(img, 'PNG', 0, 10, pdfW, h);
    pdf.save(`Credit_${c.id}.pdf`);
    // restore background
    certDiv.style.backgroundColor = prevBg || '';
  } catch (err) { console.error('Cert generation failed', err); alert('Certificate generation failed.'); }
}

// analytics removed (pie chart removed per UI revamp)

// wire simple UI actions (save, sell, market price, filters)
document.addEventListener('click', (e) => {
  if (!e.target) return;
  if (e.target.id === 'saveCreditBtn') {
    // attempt to parse last estimate from creditsResult; fallback to recompute
    const resEl = document.getElementById('creditsResult');
    // try to extract last computed value from result text (assumes Estimate ran)
    const txt = resEl ? resEl.textContent || '' : '';
    const m = txt.match(/Estimated Annual Carbon Credits[:\s\S]*?(\d+\.?\d*)\s*tCO/);
    let val = null; if (m) val = Number(m[1]);
    if (!val) {
      // fallback prompt user to estimate first
      alert('Please click Estimate first to compute credits, then Save.'); return;
    }
    const mineName = (document.getElementById('ccMineSelect') && document.getElementById('ccMineSelect').value) ? document.getElementById('ccMineSelect').selectedOptions[0].textContent : (document.getElementById('ccMineName') ? document.getElementById('ccMineName').value : 'Unnamed');
    // use last estimate details if available
    if (lastEstimateDetails && Number(lastEstimateDetails.credits || 0) === Number(val)) {
      // attach mine/project name to details if missing
      if (!lastEstimateDetails.mineName) lastEstimateDetails.mineName = mineName;
      saveGeneratedCredit(val, mineName, lastEstimateDetails);
    } else {
      saveGeneratedCredit(val, mineName, null);
    }

    // Hide estimation result box after saving
    const estimateBox = document.getElementById('creditsResult');
    if (estimateBox) {
      estimateBox.style.display = 'none';
    }

    // Clear input fields after saving for a fresh entry
    ['ccMineName','ccMethane','ccVAM','ccRenewable','ccDiesel','ccEfficiency','ccAfforestation'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    alert('Credit saved to ledger.');
  }
  if (e.target.id === 'ccMarketPriceBtn') {
    const p = getMarketPrice(); const ip = document.getElementById('ccSellPrice'); if (ip) ip.value = p; alert('Market price set: ₹' + p);
  }
  if (e.target.id === 'ccSellBtn') {
    const sel = document.querySelector('input[name="selectedCredit"]:checked'); if (!sel) { alert('Select a credit to sell.'); return; }
    const id = sel.value; const price = Number(document.getElementById('ccSellPrice').value || 0);
    if (!price || price <= 0) { alert('Enter a valid sell price.'); return; }
    if (sellCredit(id, price)) alert('Credit sold. Wallet updated.'); else alert('Sell failed.');
  }
  if (e.target && e.target.matches && e.target.matches('.cc-cert')) {
    // handled above in render, leave here for safety
  }
});

// filter apply/clear
const ccFilterApplyBtn = document.getElementById('ccFilterApply'); if (ccFilterApplyBtn) ccFilterApplyBtn.addEventListener('click', ()=>{ applyCreditFilters(); });
const ccFilterClearBtn = document.getElementById('ccFilterClear'); if (ccFilterClearBtn) ccFilterClearBtn.addEventListener('click', ()=>{ document.getElementById('ccFilterStatus').value=''; document.getElementById('ccFilterProject').value=''; renderCreditsTable(); });

function applyCreditFilters(){
  const from = null;
  const to = null;
  const status = document.getElementById('ccFilterStatus').value;
  const project = document.getElementById('ccFilterProject').value.trim().toLowerCase();
  const all = loadCredits();
  const filtered = all.filter(c => {
    if (status && c.status !== status) return false;
    if (project && !(c.project || '').toLowerCase().includes(project)) return false;
    // date filtering removed intentionally
    return true;
  });
  // render filtered list
  const tbody = document.getElementById('creditsTbody'); if (!tbody) return; tbody.innerHTML='';
  filtered.forEach(c => {
    const tr = document.createElement('tr'); tr.innerHTML = `<td><input type="radio" name="selectedCredit" value="${c.id}"></td><td>${formatDateISO(c.date)}</td><td>${c.project||''}</td><td>${Number(c.amount||0)}</td><td>${c.status||''}</td><td><button class="cc-verify" data-id="${c.id}">Verify</button> <button class="cc-cert" data-id="${c.id}">Certificate</button> <button class="cc-delete" data-id="${c.id}">Delete</button></td>`; tbody.appendChild(tr);
  });
}

// delete credit by id and update UI/storage
function deleteCredit(id) {
  const credits = loadCredits();
  const idx = credits.findIndex(c => String(c.id) === String(id));
  if (idx === -1) { alert('Credit not found.'); return false; }
  const project = credits[idx].project || 'Unnamed';
  credits.splice(idx, 1);
  saveCredits(credits);
  renderCreditsTable();
  updateCreditsSummary();
  alert(`Deleted credit for ${project}.`);
  return true;
}

// initialize credit UI state
renderCreditsTable(); updateCreditsSummary();

// initialize the carbon credits UI after DOM ready
try { initCarbonCreditsCalculator(); } catch (e) { console.warn('Carbon credits init failed', e); }

// ============ TREE PLANTATION DONATION SYSTEM ============
(function initTreeDonationSystem() {
  // LocalStorage keys
  const TREE_DONATIONS_KEY = 'treeDonations';
  const TREE_DONATION_HISTORY_KEY = 'treeDonationHistory';

  // Get all available mines (predefined + user-registered)
  function getAllMines() {
    const predefinedMines = [
      "Jharia Coalfield (Jharkhand)",
      "Korba Coalfield (Chhattisgarh)",
      "Raniganj Coalfield (West Bengal)",
      "Singareni Collieries (Telangana)",
      "Talcher Coalfield (Odisha)",
      "Umaria Mines (Madhya Pradesh)"
    ];
    
    const userMines = JSON.parse(localStorage.getItem('userMines') || '[]');
    const userMineNames = userMines.map(m => m.name).filter(name => name && name.trim());
    
    return predefinedMines.concat(userMineNames);
  }

  // Achievement thresholds (in ₹)
  const ACHIEVEMENT_LEVELS = [
    { level: 'Bronze Tree Donor', threshold: 100000, badge: '🥉' },
    { level: 'Silver Tree Donor', threshold: 500000, badge: '🥈' },
    { level: 'Gold Tree Donor', threshold: 1000000, badge: '🥇' },
    { level: 'Platinum Forest Hero', threshold: 2500000, badge: '💎' }
  ];

  // Helper functions
  function getTreeDonations() {
    try { return JSON.parse(localStorage.getItem(TREE_DONATIONS_KEY) || '{}'); } catch(e) { return {}; }
  }

  function saveTreeDonations(obj) {
    localStorage.setItem(TREE_DONATIONS_KEY, JSON.stringify(obj || {}));
  }

  function getDonationHistory() {
    try { return JSON.parse(localStorage.getItem(TREE_DONATION_HISTORY_KEY) || '[]'); } catch(e) { return []; }
  }

  function saveDonationHistory(arr) {
    localStorage.setItem(TREE_DONATION_HISTORY_KEY, JSON.stringify(arr || []));
  }

  function getMineTotalDonation(mine) {
    const donations = getTreeDonations();
    return Number(donations[mine] || 0);
  }

  function getCurrentAchievementLevel(totalDonated) {
    let currentLevel = null;
    for (const ach of ACHIEVEMENT_LEVELS) {
      if (totalDonated >= ach.threshold) {
        currentLevel = ach;
      } else {
        break;
      }
    }
    return currentLevel;
  }

  function getNextAchievementLevel(totalDonated) {
    for (const ach of ACHIEVEMENT_LEVELS) {
      if (totalDonated < ach.threshold) {
        return ach;
      }
    }
    return null; // all achievements unlocked
  }

  // Reset all mine wallets and achievements
  function resetAllMineProgress() {
    const resetMsg = document.getElementById('treeResetMsg');
    if (resetMsg) { resetMsg.className = 'donation-message'; resetMsg.textContent = ''; }

    try {
      // Clear per-mine wallets and achievements
      saveMineWallets({});
      saveTreeDonations({});
      saveDonationHistory([]);
      localStorage.setItem('mine_badges', '{}');

      // Clear insurance data
      localStorage.removeItem('mine_insurance');

      // Clear carbon credits
      localStorage.removeItem('credits');

      // Reset global wallet too for a full fresh start
      setWallet(0);

      // Clear donation message area
      const donateMsg = document.getElementById('treeDonationMsg');
      if (donateMsg) { donateMsg.className = 'donation-message'; donateMsg.textContent = ''; }

      // Reset selection and UI
      const select = document.getElementById('treeDonationMineSelect');
      if (select) select.value = '';
      updateMineStats(null);
      updateRecentDonations();

      // Reset insurance UI if on that page
      const insuranceSelect = document.getElementById('insuranceMineSelect');
      if (insuranceSelect) {
        insuranceSelect.value = '';
        try {
          if (typeof updateInsuranceUI === 'function') updateInsuranceUI('');
        } catch(e) {}
      }

      // Clear insurance plans
      localStorage.removeItem('mine_insurance_plans');

      // Clear auction table
      try {
        const auctionTableBody = document.querySelector('#auctionCreditsTable tbody');
        if (auctionTableBody) auctionTableBody.innerHTML = '<tr><td colspan="5">No carbon credits available for auction.</td></tr>';
      } catch(e) {}

      // Clear insurance plans table
      try {
        if (typeof renderInsurancePlansTable === 'function') renderInsurancePlansTable();
      } catch(e) {}

      if (resetMsg) {
        resetMsg.className = 'donation-message info';
        resetMsg.textContent = 'All mine wallets, achievements, insurance, and carbon credits have been reset to zero.';
      }
    } catch (e) {
      console.error('Reset error:', e);
      if (resetMsg) {
        resetMsg.className = 'donation-message error';
        resetMsg.textContent = 'Reset failed. Please try again.';
      }
    }
  }

  // Update UI for selected mine
  function updateMineStats(mine) {
    if (!mine) {
      document.getElementById('treeDonationWalletDisplay').textContent = '₹0';
      document.getElementById('treeTotalDonated').textContent = '₹0';
      document.getElementById('treeCurrentBadge').textContent = 'None';
      document.getElementById('treeNextMilestone').textContent = '₹100,000 → Bronze';
      document.getElementById('treeProgressBarFill').style.width = '0%';
      document.getElementById('treeProgressText').textContent = '₹0 / ₹100,000';
      updateBadgeDisplay(null);
      return;
    }

    // Get wallet balance for this specific mine
    const wallet = getMineWallet(mine);
    document.getElementById('treeDonationWalletDisplay').textContent = '₹' + wallet.toLocaleString();

    // Get total donated for this mine
    const totalDonated = getMineTotalDonation(mine);
    document.getElementById('treeTotalDonated').textContent = '₹' + totalDonated.toLocaleString();

    // Get current and next achievement
    const current = getCurrentAchievementLevel(totalDonated);
    const next = getNextAchievementLevel(totalDonated);

    document.getElementById('treeCurrentBadge').textContent = current ? current.level : 'None';

    if (next) {
      document.getElementById('treeNextMilestone').textContent = '₹' + next.threshold.toLocaleString() + ' → ' + next.level;
      // Calculate progress
      const prevThreshold = current ? current.threshold : 0;
      const nextThreshold = next.threshold;
      const currentProgress = totalDonated - prevThreshold;
      const rangeWidth = nextThreshold - prevThreshold;
      const percentage = Math.min(100, (currentProgress / rangeWidth) * 100);
      document.getElementById('treeProgressBarFill').style.width = percentage + '%';
      document.getElementById('treeProgressText').textContent = '₹' + totalDonated.toLocaleString() + ' / ₹' + nextThreshold.toLocaleString();
    } else {
      document.getElementById('treeNextMilestone').textContent = '🎉 All Achievements Unlocked!';
      document.getElementById('treeProgressBarFill').style.width = '100%';
      document.getElementById('treeProgressText').textContent = '₹' + totalDonated.toLocaleString() + ' (Maximum)';
    }

    updateBadgeDisplay(totalDonated);
  }

  // Update badge display (show unlocked badges in color, locked ones gray)
  function updateBadgeDisplay(totalDonated) {
    if (totalDonated === null) totalDonated = 0;

    ACHIEVEMENT_LEVELS.forEach((ach, idx) => {
      const badgeId = ['Bronze', 'Silver', 'Gold', 'Platinum'][idx];
      const badgeEl = document.getElementById('treeBadge' + badgeId);
      if (!badgeEl) return;

      if (totalDonated >= ach.threshold) {
        badgeEl.classList.add('unlocked');
        badgeEl.classList.remove('locked');
      } else {
        badgeEl.classList.remove('unlocked');
        badgeEl.classList.add('locked');
      }
    });
  }

  // Render recent donations list
  function updateRecentDonations() {
    const history = getDonationHistory();
    const container = document.getElementById('treeRecentDonations');
    if (!container) return;

    if (history.length === 0) {
      container.innerHTML = '<p class="empty-state">No donations yet. Start contributing to help the environment!</p>';
      return;
    }

    // Show last 10 donations
    const recent = history.slice(-10).reverse();
    container.innerHTML = '';
    recent.forEach(donation => {
      const item = document.createElement('div');
      item.className = 'recent-item';
      const date = new Date(donation.date).toLocaleDateString();
      item.innerHTML = `
        <div class="recent-item-mine">${donation.mine}</div>
        <div class="recent-item-amount">₹${Number(donation.amount).toLocaleString()}</div>
        <div class="recent-item-date">${date}</div>
      `;
      container.appendChild(item);
    });
  }

  // Handle donation button click
  document.getElementById('treeDonateBtn').addEventListener('click', () => {
    const mineSelect = document.getElementById('treeDonationMineSelect');
    const amountInput = document.getElementById('treeDonationAmount');
    const msgEl = document.getElementById('treeDonationMsg');

    const selectedMine = mineSelect.value.trim();
    const donationAmount = Number(amountInput.value || 0);

    msgEl.className = 'donation-message';
    msgEl.textContent = '';

    // Validations
    if (!selectedMine) {
      msgEl.className = 'donation-message error';
      msgEl.textContent = '❌ Please select a mine.';
      return;
    }

    if (donationAmount <= 0) {
      msgEl.className = 'donation-message error';
      msgEl.textContent = '❌ Donation amount must be greater than 0.';
      return;
    }

    // Check wallet balance for selected mine
    const wallet = getMineWallet(selectedMine);
    if (donationAmount > wallet) {
      msgEl.className = 'donation-message error';
      msgEl.textContent = `❌ Insufficient wallet balance for ${selectedMine}. Available: ₹${wallet.toLocaleString()}.`;
      return;
    }

    // Process donation
    try {
      // Deduct from mine-specific wallet
      const newWallet = wallet - donationAmount;
      setMineWallet(selectedMine, newWallet);

      // Add to tree donations
      const donations = getTreeDonations();
      donations[selectedMine] = (donations[selectedMine] || 0) + donationAmount;
      saveTreeDonations(donations);

      // Add to history
      const history = getDonationHistory();
      history.push({ mine: selectedMine, amount: donationAmount, date: new Date().toISOString() });
      saveDonationHistory(history);

      // Success message
      msgEl.className = 'donation-message success';
      msgEl.textContent = `✅ Donation successful! ₹${donationAmount.toLocaleString()} donated by ${selectedMine}.`;

      // Reset form
      amountInput.value = '';

      // Update stats
      updateMineStats(selectedMine);
      updateRecentDonations();
      renderMineWalletTable(); // Update mine wallet table after donation

      // Keep the selection so user can donate again if desired
      mineSelect.value = selectedMine;
    } catch (e) {
      console.error('Donation error:', e);
      msgEl.className = 'donation-message error';
      msgEl.textContent = '❌ An error occurred. Please try again.';
    }
  });

  // Handle reset all mines progress
  const resetBtn = document.getElementById('treeResetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      resetAllMineProgress();
    });
  }

  // Handle mine selection change
  document.getElementById('treeDonationMineSelect').addEventListener('change', (e) => {
    const selectedMine = e.target.value;
    updateMineStats(selectedMine);
  });

  // Populate mine dropdown
  function populateMineDropdown() {
    const select = document.getElementById('treeDonationMineSelect');
    if (!select) return;
    
    // Clear existing options except the first (placeholder)
    while (select.options.length > 1) {
      select.remove(1);
    }
    
    // Add all available mines
    const mines = getAllMines();
    mines.forEach(mineName => {
      const option = document.createElement('option');
      option.value = mineName;
      option.textContent = mineName;
      select.appendChild(option);
    });
  }

  // Enable accordion sections in achievement area
  function initAchievementAccordions() {
    document.querySelectorAll('#achievement-badges .ach-header').forEach(header => {
      const accordion = header.parentElement;
      const content = accordion ? accordion.querySelector('.ach-content') : null;
      const arrow = header.querySelector('.ach-arrow');
      if (!accordion || !content || !arrow) return;

      // start closed
      accordion.classList.remove('open');
      content.style.maxHeight = '0';
      arrow.textContent = '▼';

      header.addEventListener('click', () => {
        accordion.classList.toggle('open');
        if (accordion.classList.contains('open')) {
          content.style.maxHeight = content.scrollHeight + 'px';
          arrow.textContent = '▲';
        } else {
          content.style.maxHeight = '0';
          arrow.textContent = '▼';
        }
      });
    });
  }

  // Initialize on load
  populateMineDropdown();
  initAchievementAccordions();
  updateRecentDonations();
  document.getElementById('treeDonationMineSelect').value = '';
  updateMineStats(null);
})();

// ============ MINES INFORMATION ACCORDION ============
(function initMinesInfoAccordion() {
  document.querySelectorAll('#mines-info .mine-header').forEach(header => {
    header.addEventListener('click', () => {
      const card = header.parentElement;
      const content = card.querySelector('.mine-content');
      card.classList.toggle('open');

      if (card.classList.contains('open')) {
        content.style.maxHeight = content.scrollHeight + "px";
      } else {
        content.style.maxHeight = "0px";
      }
    });
  });
})();

// ============ INSURANCE CENTER SYSTEM ============
(function initInsuranceCenter() {
  const INSURANCE_KEY = 'mine_insurance';
  // local caches to avoid repeated JSON.parse hits on localStorage (keeps UI snappy)
  let insuranceCache = null;
  
  // Insurance types with their details
  const INSURANCE_TYPES = {
    failure: { name: 'Operations Failure Insurance', price: 200000 },
    vehicle: { name: 'Vehicle & Transport Insurance', price: 150000 },
    solarFire: { name: 'Solar & Fire Protection', price: 250000 }
  };

  // Get the mine select element at the top level so it's accessible throughout
  const mineSelect = document.getElementById('insuranceMineSelect');

  // Get all available mines (reuse from tree donation)
  function getAllMines() {
    const predefinedMines = [
      "Jharia Coalfield (Jharkhand)",
      "Korba Coalfield (Chhattisgarh)",
      "Raniganj Coalfield (West Bengal)",
      "Singareni Collieries (Telangana)",
      "Talcher Coalfield (Odisha)",
      "Umaria Mines (Madhya Pradesh)"
    ];
    
    const userMines = JSON.parse(localStorage.getItem('userMines') || '[]');
    const userMineNames = userMines.map(m => m.name).filter(name => name && name.trim());
    
    return predefinedMines.concat(userMineNames);
  }

  // Load insurance data from localStorage
  function getInsuranceData() {
    if (insuranceCache) return insuranceCache;
    try { insuranceCache = JSON.parse(localStorage.getItem(INSURANCE_KEY) || '{}'); }
    catch(e) { insuranceCache = {}; }
    return insuranceCache;
  }

  // Save insurance data to localStorage
  function saveInsuranceData(data) {
    insuranceCache = data || {};
    localStorage.setItem(INSURANCE_KEY, JSON.stringify(insuranceCache));
  }

  // Insurance Plans Tracking (with expiration dates)
  const PLANS_KEY = 'mine_insurance_plans';
  let plansCache = null;
  
  function getInsurancePlans() {
    if (plansCache) return plansCache;
    try { plansCache = JSON.parse(localStorage.getItem(PLANS_KEY) || '{}'); }
    catch(e) { plansCache = {}; }
    return plansCache;
  }

  function saveInsurancePlans(data) {
    plansCache = data || {};
    localStorage.setItem(PLANS_KEY, JSON.stringify(plansCache));
  }

  // Backfill plans from existing insurance data (for purchases before plans table existed)
  function ensurePlansFromInsurance() {
    const plans = getInsurancePlans();
    const insurance = getInsuranceData();
    let changed = false;

    Object.keys(insurance).forEach(mineName => {
      const ins = insurance[mineName] || {};
      Object.keys(INSURANCE_TYPES).forEach(type => {
        if (ins[type]) {
          if (!plans[mineName]) plans[mineName] = [];
          const exists = plans[mineName].some(p => p.type === type);
          if (!exists) {
            const purchaseDate = new Date();
            const expiryDate = new Date(purchaseDate.getTime() + (365 * 24 * 60 * 60 * 1000));
            plans[mineName].push({
              type,
              purchaseDate: purchaseDate.toISOString(),
              expiryDate: expiryDate.toISOString()
            });
            changed = true;
          }
        }
      });

      if (plans[mineName] && plans[mineName].length === 0) {
        delete plans[mineName];
        changed = true;
      }
    });

    if (changed) {
      saveInsurancePlans(plans);
    }
    return plans;
  }

  // Add a new insurance plan (1-year validity)
  function addInsurancePlan(mineName, type) {
    const plans = getInsurancePlans();
    if (!plans[mineName]) {
      plans[mineName] = [];
    }
    
    const purchaseDate = new Date();
    const expiryDate = new Date(purchaseDate.getTime() + (365 * 24 * 60 * 60 * 1000)); // 1 year
    
    plans[mineName].push({
      type: type,
      purchaseDate: purchaseDate.toISOString(),
      expiryDate: expiryDate.toISOString()
    });
    
    saveInsurancePlans(plans);
  }

  // Check and remove expired plans
  function checkExpiredPlans() {
    const plans = getInsurancePlans();
    const now = new Date();
    let hasExpired = false;

    Object.keys(plans).forEach(mineName => {
      plans[mineName] = plans[mineName].filter(plan => {
        const expiry = new Date(plan.expiryDate);
        if (now > expiry) {
          hasExpired = true;
          return false; // Remove expired
        }
        return true;
      });

      if (plans[mineName].length === 0) {
        delete plans[mineName];
      }
    });

    if (hasExpired) {
      saveInsurancePlans(plans);
    }

    return plans;
  }

  // Get insurance status for a specific mine
  function getMineInsurance(mineName) {
    const data = getInsuranceData();
    return data[mineName] || { failure: false, vehicle: false, solarFire: false };
  }

  // Calculate total premium spent for a mine
  function calculateTotalSpent(mineName) {
    const insurance = getMineInsurance(mineName);
    let total = 0;
    Object.keys(insurance).forEach(type => {
      if (insurance[type] && INSURANCE_TYPES[type]) {
        total += INSURANCE_TYPES[type].price;
      }
    });
    return total;
  }

  // Populate mine dropdown
  function populateInsuranceMineDropdown() {
    const select = document.getElementById('insuranceMineSelect');
    if (!select) return;
    
    // Clear existing options except placeholder
    while (select.options.length > 1) {
      select.remove(1);
    }
    
    // Add all available mines
    const mines = getAllMines();
    mines.forEach(mineName => {
      const option = document.createElement('option');
      option.value = mineName;
      option.textContent = mineName;
      select.appendChild(option);
    });
  }

  // Update UI for selected mine
  function updateInsuranceUI(mineName) {
    if (!mineName) {
      // No mine selected - reset UI
      document.getElementById('insuranceActiveMines').textContent = 'Select a mine to view status';
      document.getElementById('insuranceTotalSpent').innerHTML = '<strong>Total Premium Spent:</strong> ₹0';
      
      // Reset all cards to default state
      ['failure', 'vehicle', 'solarFire'].forEach(type => {
        const statusEl = document.getElementById(`insuranceStatus${type.charAt(0).toUpperCase() + type.slice(1)}`);
        const btnEl = document.getElementById(`buy${type.charAt(0).toUpperCase() + type.slice(1)}`);
        
        if (statusEl) {
          statusEl.textContent = 'Not Purchased';
          statusEl.className = 'insurance-status not-purchased';
        }
        
        if (btnEl) {
          btnEl.textContent = 'Buy Insurance';
          btnEl.disabled = false;
        }
      });
      return;
    }

    // Get insurance data for selected mine
    const insurance = getMineInsurance(mineName);
    const totalSpent = calculateTotalSpent(mineName);
    
    // Update summary
    const activeInsurances = [];
    Object.keys(insurance).forEach(type => {
      if (insurance[type] && INSURANCE_TYPES[type]) {
        activeInsurances.push(INSURANCE_TYPES[type].name);
      }
    });
    
    if (activeInsurances.length > 0) {
      document.getElementById('insuranceActiveMines').innerHTML = 
        `<strong>Active Insurances for ${mineName}:</strong><br>${activeInsurances.join(', ')}`;
    } else {
      document.getElementById('insuranceActiveMines').innerHTML = 
        `<strong>${mineName}</strong> has no active insurances`;
    }
    
    document.getElementById('insuranceTotalSpent').innerHTML = 
      `<strong>Total Premium Spent:</strong> ₹${totalSpent.toLocaleString()}`;
    
    // Update each insurance card
    Object.keys(INSURANCE_TYPES).forEach(type => {
      const isActive = insurance[type];
      const statusEl = document.getElementById(`insuranceStatus${type.charAt(0).toUpperCase() + type.slice(1)}`);
      const btnEl = document.getElementById(`buy${type.charAt(0).toUpperCase() + type.slice(1)}`);
      
      if (statusEl) {
        if (isActive) {
          statusEl.textContent = '✓ Active';
          statusEl.className = 'insurance-status active';
        } else {
          statusEl.textContent = 'Not Purchased';
          statusEl.className = 'insurance-status not-purchased';
        }
      }
      
      if (btnEl) {
        if (isActive) {
          btnEl.textContent = 'Already Active';
          btnEl.disabled = true;
        } else {
          btnEl.textContent = 'Buy Insurance';
          btnEl.disabled = false;
        }
      }
    });
  }

  // Handle mine selection change
  if (mineSelect) {
    mineSelect.addEventListener('change', (e) => {
      updateInsuranceUI(e.target.value);
    });
  }

  // Handle insurance purchase
  function buyInsurance(mineName, type, price) {
    if (!mineName) {
      showToast('Please select a mine first.', 'error');
      return;
    }

    // Check wallet balance
    const wallet = getMineWallet(mineName);
    if (wallet < price) {
      showToast(`Not enough wallet balance. You have ₹${wallet.toLocaleString()} but need ₹${price.toLocaleString()}.`, 'error');
      return;
    }

    // Check if already purchased
    const insurance = getMineInsurance(mineName);
    if (insurance[type]) {
      showToast('This insurance is already active for this mine.', 'info');
      return;
    }

    // Deduct from wallet
    setMineWallet(mineName, wallet - price);

    // Mark insurance as purchased
    const allInsurance = getInsuranceData();
    if (!allInsurance[mineName]) {
      allInsurance[mineName] = { failure: false, vehicle: false, solarFire: false };
    }
    allInsurance[mineName][type] = true;
    saveInsuranceData(allInsurance);

    // Add to insurance plans tracking
    addInsurancePlan(mineName, type);

    // Show success message
    const insuranceName = INSURANCE_TYPES[type].name;
    showToast(`${mineName} purchased ${insuranceName} for ₹${price.toLocaleString()}.`, 'success');

    // Update UI
    updateInsuranceUI(mineName);
    renderInsurancePlansTable();
    renderMineWalletTable(); // Update mine wallet table after insurance purchase
  }

  // Wire up buy buttons
  document.querySelectorAll('.insurance-buy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mineName = mineSelect ? mineSelect.value : '';
      const type = btn.dataset.type;
      const price = Number(btn.dataset.price);
      
      buyInsurance(mineName, type, price);
    });
  });

  // Render Insurance Plans Table
  function renderInsurancePlansTable() {
    const plans = getInsurancePlans();
    const tbody = document.getElementById('insurancePlansTableBody');
    
    if (!tbody) return;

    // If no plans, show empty message
    if (Object.keys(plans).length === 0) {
      tbody.innerHTML = '<tr class="insurance-plans-empty"><td colspan="7">No active insurance plans yet</td></tr>';
      return;
    }

    let rows = '';
    const now = new Date();

    Object.keys(plans).forEach(mineName => {
      plans[mineName].forEach((plan, index) => {
        const purchaseDate = new Date(plan.purchaseDate);
        const expiryDate = new Date(plan.expiryDate);
        const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
        
        let statusBadge = '';
        if (daysLeft < 0) {
          statusBadge = '<span class="plan-status-badge plan-status-expired">Expired</span>';
        } else if (daysLeft <= 7) {
          statusBadge = '<span class="plan-status-badge plan-status-expiring">Expiring Soon</span>';
        } else {
          statusBadge = '<span class="plan-status-badge plan-status-active">Active</span>';
        }

        const insuranceName = INSURANCE_TYPES[plan.type] ? INSURANCE_TYPES[plan.type].name : 'Unknown';
        const purchaseDateStr = purchaseDate.toLocaleDateString();
        const expiryDateStr = expiryDate.toLocaleDateString();

        rows += `<tr>
          <td>${mineName}</td>
          <td>${insuranceName}</td>
          <td>${purchaseDateStr}</td>
          <td>${expiryDateStr}</td>
          <td>${statusBadge}</td>
          <td>${daysLeft < 0 ? 'Expired' : daysLeft + ' days'}</td>
          <td><button class="plan-delete-btn" data-mine="${mineName}" data-type="${plan.type}" data-index="${index}">Delete</button></td>
        </tr>`;
      });
    });

    tbody.innerHTML = rows;

    // If accordion is open, recalc height to fit updated table
    const accordion = document.getElementById('activeInsuranceAccordion');
    const content = accordion ? accordion.querySelector('.insurance-accordion-content') : null;
    if (accordion && content && accordion.classList.contains('open')) {
      content.style.maxHeight = content.scrollHeight + 'px';
    }

    // Wire up delete buttons
    document.querySelectorAll('.plan-delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mineName = btn.dataset.mine;
        const type = btn.dataset.type;
        const index = parseInt(btn.dataset.index);
        
        deletePlan(mineName, type, index);
      });
    });
  }

  // Delete insurance plan
  function deletePlan(mineName, type, index) {
    const plans = getInsurancePlans();
    if (plans[mineName]) {
      plans[mineName].splice(index, 1);
      if (plans[mineName].length === 0) {
        delete plans[mineName];
      }
      saveInsurancePlans(plans);
      renderInsurancePlansTable();
      showToast(`Insurance plan deleted for ${mineName}.`, 'info');
    }
  }

  // Initialize Active Insurance Plans accordion (collapsible table)
  function initActiveInsuranceAccordion() {
    const accordion = document.getElementById('activeInsuranceAccordion');
    if (!accordion) return;

    const header = accordion.querySelector('.insurance-accordion-header');
    const content = accordion.querySelector('.insurance-accordion-content');
    const arrow = accordion.querySelector('.accordion-arrow');

    // Default collapsed state
    if (content) content.style.maxHeight = '0';
    if (arrow) arrow.textContent = '▼';

    if (header && content) {
      header.addEventListener('click', () => {
        accordion.classList.toggle('open');

        if (accordion.classList.contains('open')) {
          content.style.maxHeight = content.scrollHeight + 'px';
          if (arrow) arrow.textContent = '▲';
        } else {
          content.style.maxHeight = '0';
          if (arrow) arrow.textContent = '▼';
        }
      });
    }
  }

  // Initialize Insurance Card accordions
  function initInsuranceAccordions() {
    document.querySelectorAll('.insurance-card').forEach(card => {
      const header = card.querySelector('.ins-accordion-header');
      if (header) {
        header.addEventListener('click', (e) => {
          // Don't toggle if clicking the buy button or status badge
          if (e.target.classList.contains('insurance-buy-btn') || 
              e.target.classList.contains('insurance-status')) {
            return;
          }

          // Toggle open class
          card.classList.toggle('open');

          // Update arrow
          const arrow = card.querySelector('.ins-arrow');
          if (arrow) {
            arrow.textContent = card.classList.contains('open') ? '▲' : '▼';
          }
        });
      }
    });
  }

  // Initialize
  populateInsuranceMineDropdown();
  updateInsuranceUI('');
  initActiveInsuranceAccordion();
  initInsuranceAccordions();
  ensurePlansFromInsurance();
  checkExpiredPlans();
  renderInsurancePlansTable();
  
  // Auto-refresh plans table every 60 seconds to check for expirations
  setInterval(() => {
    checkExpiredPlans();
    renderInsurancePlansTable();
  }, 60000);
})();


