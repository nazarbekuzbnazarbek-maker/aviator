let currentUser = null;

window.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch('/api/me');
        const data = await res.json();
        if (data.authenticated) {
            currentUser = data.user;
            refreshUI();
            showLobby();
        } else {
            showAuthModal();
        }
    } catch (e) { showAuthModal(); }
});

function refreshUI() {
    if (!currentUser) return;
    document.getElementById('userBalanceDisplay').textContent = `${currentUser.balance.toLocaleString()} UZS`;
    if (currentUser.is_admin) {
        document.getElementById('adminNavBtn').classList.remove('hidden');
    }
}

function switchTab(type) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if (type === 'login') {
        document.querySelectorAll('.tab-btn')[0].classList.add('active');
        document.getElementById('loginForm').classList.remove('hidden');
        document.getElementById('registerForm').classList.add('hidden');
    } else {
        document.querySelectorAll('.tab-btn')[1].classList.add('active');
        document.getElementById('registerForm').classList.remove('hidden');
        document.getElementById('loginForm').classList.add('hidden');
    }
}

function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

async function requestSmsCode() {
    const phone = document.getElementById('regPhone').value;
    const chatId = document.getElementById('regChatId').value;
    const res = await fetch('/api/send_code', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ phone, chat_id: chatId }) });
    const data = await res.json();
    alert(data.message + (data.debug_code ? ` (Kod: ${data.debug_code})` : ''));
}

async function handleLogin(e) {
    e.preventDefault();
    const phone = document.getElementById('loginPhone').value;
    const password = document.getElementById('loginPass').value;
    const res = await fetch('/api/login', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ phone, password }) });
    const data = await res.json();
    if (data.success) { currentUser = data.user; refreshUI(); hideAuthModal(); showLobby(); } else { alert(data.message); }
}

async function handleRegister(e) {
    e.preventDefault();
    const phone = document.getElementById('regPhone').value;
    const password = document.getElementById('regPass').value;
    const code = document.getElementById('regCode').value;
    const res = await fetch('/api/register', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ phone, password, code }) });
    const data = await res.json();
    if (data.success) { currentUser = data.user; refreshUI(); hideAuthModal(); showLobby(); alert("Tabriklaymiz! Hisobingizga 5,000 UZS bonus qo'shildi!"); } else { alert(data.message); }
}

async function handleLogout() {
    await fetch('/api/logout', { method: 'POST' });
    currentUser = null;
    showAuthModal();
}

async function modifyServerBalance(amt) {
    const res = await fetch('/api/update_balance', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ amount: amt }) });
    const data = await res.json();
    if (data.success) { currentUser.balance = data.new_balance; refreshUI(); }
}

async function sendDeposit() {
    const amount = parseFloat(document.getElementById('depAmount').value);
    const card = document.getElementById('depCard').value;
    const res = await fetch('/api/deposit_request', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ amount, card }) });
    const data = await res.json();
    alert(data.message);
    closeModal('depositModal');
}

async function sendWithdraw() {
    const amount = parseFloat(document.getElementById('witAmount').value);
    const card = document.getElementById('witCard').value;
    const res = await fetch('/api/withdraw_request', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ amount, card }) });
    const data = await res.json();
    alert(data.message);
    closeModal('withdrawModal');
}

async function openAdminPanel() {
    hideAllSections();
    document.getElementById('adminSection').classList.remove('hidden');
    const res = await fetch('/api/admin/data');
    const data = await res.json();
    if (data.success) {
        let html = '';
        data.deposits.forEach(d => {
            html += `<div style="display:flex; justify-content:space-between; padding:6px; border-bottom:1px solid #1e293b;">
                <span>${d.phone} - ${d.amount.toLocaleString()} UZS</span>
                <span><b>${d.status}</b> ${d.status === 'Kutilmoqda' ? `<button onclick="approveDep(${d.id})">Tasdiqlash</button>` : ''}</span>
            </div>`;
        });
        document.getElementById('adminDepositsList').innerHTML = html || 'So\'rovlar yo\'q';
    }
}

async function approveDep(id) {
    await fetch('/api/admin/action_deposit', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ id, action: 'approve' }) });
    openAdminPanel();
}

async function setForecast(game, mode) {
    await fetch('/api/admin/set_forecast', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ game, mode }) });
    document.getElementById(`${game}ForecastStatus`).textContent = mode.toUpperCase();
    alert(`Prognoz o'zgartirildi: ${mode}`);
}

function showAuthModal() { document.getElementById('authOverlay').classList.remove('hidden'); document.getElementById('topBar').classList.add('hidden'); hideAllSections(); }
function hideAuthModal() { document.getElementById('authOverlay').classList.add('hidden'); document.getElementById('topBar').classList.remove('hidden'); }
function hideAllSections() { document.getElementById('lobbySection').classList.add('hidden'); document.getElementById('swampSection').classList.add('hidden'); document.getElementById('aviatorSection').classList.add('hidden'); document.getElementById('adminSection').classList.add('hidden'); }
function showLobby() { hideAllSections(); document.getElementById('lobbySection').classList.remove('hidden'); }
function openGame(t) { hideAllSections(); if (t === 'swamp') { document.getElementById('swampSection').classList.remove('hidden'); if(window.initSwampGame) initSwampGame(); } else { document.getElementById('aviatorSection').classList.remove('hidden'); if(window.initAviatorGame) initAviatorGame(); } }