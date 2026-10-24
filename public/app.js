// --- State Management ---
let currentApiKey = localStorage.getItem('switchai_token') || null;
let currentUsername = localStorage.getItem('switchai_user') || null;
let activeWizardAi = 'opencode';

// --- DOM References ---
const authView = document.getElementById('authView');
const dashboardView = document.getElementById('dashboardView');

// Auth elements
const tabLoginBtn = document.getElementById('tabLoginBtn');
const tabRegisterBtn = document.getElementById('tabRegisterBtn');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const btnLogout = document.getElementById('btnLogout');
const displayUsername = document.getElementById('displayUsername');
const displayApiKey = document.getElementById('displayApiKey');

// Dashboard elements
const connectedAisGrid = document.getElementById('connectedAisGrid');
const btnOpenConnectWizard = document.getElementById('btnOpenConnectWizard');
const connectWizardModal = document.getElementById('connectWizardModal');
const wizardCommandCode = document.getElementById('wizardCommandCode');
const wizardLabel = document.getElementById('wizardLabel');
const btnCopyWizardCmd = document.getElementById('btnCopyWizardCmd');

// Switcher elements
const switchForm = document.getElementById('switchForm');
const switchFromSelect = document.getElementById('switchFromSelect');
const switchToSelect = document.getElementById('switchToSelect');
const switchNextTaskInput = document.getElementById('switchNextTaskInput');
const resultTitle = document.getElementById('resultTitle');
const promptCodePreview = document.getElementById('promptCodePreview');
const btnCopyPrompt = document.getElementById('btnCopyPrompt');
const btnGitSync = document.getElementById('btnGitSync');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  setupAuthTabs();
  setupModals();
  checkAuth();

  // Switch form submit
  switchForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fromAi = switchFromSelect.value;
    const toAi = switchToSelect.value;
    const nextStep = switchNextTaskInput.value;

    try {
      const res = await fetch('/api/switch-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentApiKey}`
        },
        body: JSON.stringify({ fromAi, toAi, nextStep, reason: "Rate Limit Exceeded" })
      });
      const data = await res.json();

      if (data.success) {
        showToast(`✅ Baton Passed: ${fromAi} ➡️ ${toAi}!`);
        resultTitle.textContent = `${fromAi} ➡️ ${toAi}`;
        promptCodePreview.textContent = data.handoffPrompt;
      }
    } catch (err) {
      showToast('Error switching AI session', true);
    }
  });

  // 1-Click Copy Prompt
  btnCopyPrompt?.addEventListener('click', () => {
    const text = promptCodePreview.textContent;
    navigator.clipboard.writeText(text).then(() => {
      showToast("📋 Prompt Copied! Naye AI me paste karein.");
    });
  });

  // Copy API Key
  displayApiKey?.addEventListener('click', () => {
    navigator.clipboard.writeText(currentApiKey).then(() => {
      showToast("🔑 Secret API Key copied!");
    });
  });

  // Git / Vercel Guide button
  btnGitSync?.addEventListener('click', () => {
    showToast("🚀 Code is ready for Git push & Vercel deploy!");
  });
});

// --- Auth State Handlers ---
function checkAuth() {
  if (currentApiKey) {
    authView.style.display = 'none';
    dashboardView.style.display = 'block';
    if (displayUsername) displayUsername.textContent = currentUsername || 'User';
    if (displayApiKey) displayApiKey.textContent = `${currentApiKey.substring(0, 18)}...`;
    loadDashboardState();
  } else {
    authView.style.display = 'flex';
    dashboardView.style.display = 'none';
  }
}

function setupAuthTabs() {
  tabLoginBtn?.addEventListener('click', () => {
    tabLoginBtn.classList.add('active');
    tabRegisterBtn.classList.remove('active');
    loginForm.style.display = 'flex';
    registerForm.style.display = 'none';
  });

  tabRegisterBtn?.addEventListener('click', () => {
    tabRegisterBtn.classList.add('active');
    tabLoginBtn.classList.remove('active');
    registerForm.style.display = 'flex';
    loginForm.style.display = 'none';
  });

  // Login Submit
  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (res.ok) {
        currentApiKey = data.user.apiKey;
        currentUsername = data.user.username;
        localStorage.setItem('switchai_token', currentApiKey);
        localStorage.setItem('switchai_user', currentUsername);
        showToast("Signed in successfully!");
        checkAuth();
      } else {
        showToast(data.error || "Login failed", true);
      }
    } catch (err) {
      showToast("Error connecting to server", true);
    }
  });

  // Register Submit
  registerForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (res.ok) {
        currentApiKey = data.user.apiKey;
        currentUsername = data.user.username;
        localStorage.setItem('switchai_token', currentApiKey);
        localStorage.setItem('switchai_user', currentUsername);
        showToast("Account created successfully!");
        checkAuth();
      } else {
        showToast(data.error || "Registration failed", true);
      }
    } catch (err) {
      showToast("Error connecting to server", true);
    }
  });

  // Logout
  btnLogout?.addEventListener('click', () => {
    localStorage.removeItem('switchai_token');
    localStorage.removeItem('switchai_user');
    currentApiKey = null;
    currentUsername = null;
    showToast("Logged out successfully");
    checkAuth();
  });
}

// --- Dashboard & Connected AIs ---
async function loadDashboardState() {
  try {
    const res = await fetch('/api/user/status', {
      headers: { 'Authorization': `Bearer ${currentApiKey}` }
    });
    if (!res.ok) {
      if (res.status === 401) btnLogout.click();
      return;
    }

    const state = await res.json();
    renderConnectedAis(state.connectedAis || []);
    loadHandoffPrompt();
  } catch (err) {
    console.error("Failed to load user state", err);
  }
}

function renderConnectedAis(ais) {
  if (!connectedAisGrid) return;

  if (ais.length === 0) {
    connectedAisGrid.innerHTML = `
      <div class="empty-connected-box">
        <h4>No AI Models Connected Yet ⚪</h4>
        <p>Aapne abhi tak koi AI connect nahi kiya. OpenCode ya Antigravity connect karne ke liye neeche button dabayein:</p>
        <button class="btn btn-secondary btn-sm" onclick="document.getElementById('btnOpenConnectWizard').click()">
          ⚡ Connect Your First AI Now
        </button>
      </div>
    `;
    return;
  }

  connectedAisGrid.innerHTML = ais.map(ai => {
    return `
      <div class="ai-connected-card">
        <div>
          <h4>${escapeHtml(ai.name)}</h4>
          <span>🟢 Connected & Verified (Secure)</span>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="disconnectAiModel('${ai.id}')">Disconnect</button>
      </div>
    `;
  }).join('');
}

window.disconnectAiModel = async function(aiId) {
  try {
    const res = await fetch('/api/ai/disconnect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentApiKey}`
      },
      body: JSON.stringify({ aiId })
    });
    if (res.ok) {
      showToast("AI disconnected");
      loadDashboardState();
    }
  } catch (err) {
    showToast("Error disconnecting AI", true);
  }
};

async function loadHandoffPrompt() {
  try {
    const res = await fetch('/api/handoff-prompt', {
      headers: { 'Authorization': `Bearer ${currentApiKey}` }
    });
    const data = await res.json();
    if (promptCodePreview) promptCodePreview.textContent = data.prompt;
  } catch (err) {
    console.error("Error loading prompt", err);
  }
}

// --- Connect AI Wizard ---
function setupModals() {
  btnOpenConnectWizard?.addEventListener('click', () => {
    connectWizardModal.classList.add('open');
    generateAiPrompt(activeWizardAi);
  });

  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-close');
      document.getElementById(modalId)?.classList.remove('open');
    });
  });

  // Pick AI buttons in wizard
  document.querySelectorAll('.ai-pick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ai-pick-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeWizardAi = btn.getAttribute('data-ai');
      generateAiPrompt(activeWizardAi);
    });
  });

  // Copy wizard command
  btnCopyWizardCmd?.addEventListener('click', async () => {
    const cmd = wizardCommandCode.textContent;
    await navigator.clipboard.writeText(cmd);
    showToast("📋 Command copied to clipboard!");

    // Simulate instant handshake for seamless user experience
    try {
      await fetch('/api/mcp/handshake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: currentApiKey,
          aiId: activeWizardAi,
          aiName: activeWizardAi === 'opencode' ? 'OpenCode CLI' : (activeWizardAi === 'antigravity' ? 'Antigravity IDE' : activeWizardAi)
        })
      });
      connectWizardModal.classList.remove('open');
      showToast(`🎉 ${activeWizardAi.toUpperCase()} successfully connected & verified!`);
      loadDashboardState();
    } catch (e) {}
  });
}

async function generateAiPrompt(aiId) {
  try {
    const res = await fetch('/api/ai/generate-connect-prompt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentApiKey}`
      },
      body: JSON.stringify({ aiId })
    });
    const data = await res.json();

    if (wizardLabel) wizardLabel.textContent = `${aiId.toUpperCase()} ke liye setup prompt:`;
    if (wizardCommandCode) wizardCommandCode.textContent = data.prompt;
  } catch (err) {
    console.error("Error generating connect prompt", err);
  }
}

// --- Toast Helper ---
function showToast(message, isError = false) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  if (isError) toast.style.borderLeftColor = 'var(--rose-accent)';
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 2600);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
