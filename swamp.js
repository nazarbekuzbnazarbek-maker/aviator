let swampActive = false, swampRowIndex = 0, currentSwampBet = 5000;
const swampMults = [1.30, 2.17, 5.43, 27.16];
let swampGameCounter = 0;

function setSwampBet(val) { document.getElementById('swampBetInput').value = val; currentSwampBet = val; }
function initSwampGame() { buildSwampGrid(); }

function buildSwampGrid() {
    const box = document.getElementById('swampRowsContainer'); box.innerHTML = '';
    for (let r = 0; r < 4; r++) {
        const row = document.createElement('div'); row.className = 'swamp-row-item'; row.id = `sRow_${r}`;
        for (let c = 0; c < 5; c++) {
            const leaf = document.createElement('div'); leaf.className = `leaf-node ${r === 0 && swampActive ? 'active-row-glow' : ''}`;
            leaf.onclick = () => chooseLeaf(r, c); row.appendChild(leaf);
        }
        const label = document.createElement('div'); label.className = 'swamp-mult-indicator'; label.textContent = `x ${swampMults[r]}`;
        row.appendChild(label); box.appendChild(row);
    }
}

async function startSwampGame() {
    if (swampActive) return;
    currentSwampBet = parseFloat(document.getElementById('swampBetInput').value) || 5000;
    if (currentUser.balance < currentSwampBet) { alert("Balans yetarli emas!"); return; }
    await modifyServerBalance(-currentSwampBet);
    swampActive = true; swampRowIndex = 0;
    document.getElementById('swampBetBtn').style.opacity = '0.4';
    document.getElementById('swampTakeBtn').classList.remove('disabled');
    document.getElementById('swampTakeBtn').disabled = false;
    buildSwampGrid();
}

async function chooseLeaf(r, c) {
    if (!swampActive || r !== swampRowIndex) return;

    const fRes = await fetch('/api/get_forecast/swamp');
    const fData = await fRes.json();
    let mode = fData.mode;

    let isWin = (mode === 'win') ? true : (mode === 'lose' ? false : (swampGameCounter % 6 === 0));

    const rowEl = document.getElementById(`sRow_${r}`);
    const leaves = rowEl.querySelectorAll('.leaf-node');

    if (isWin) {
        leaves[c].textContent = '🐸'; swampRowIndex++;
        if (swampRowIndex >= 4) {
            let totalWin = currentSwampBet * swampMults[3];
            await modifyServerBalance(totalWin);
            alert(`Tabriklaymiz! ${totalWin.toLocaleString()} UZS yutdingiz!`);
            swampGameCounter++; resetSwamp();
        } else {
            document.querySelectorAll('.leaf-node').forEach(l => l.classList.remove('active-row-glow'));
            document.getElementById(`sRow_${swampRowIndex}`).querySelectorAll('.leaf-node').forEach(l => l.classList.add('active-row-glow'));
        }
    } else {
        leaves[c].textContent = '🌊'; leaves[c].style.background = '#334155';
        alert("Afsuski, yutqazdingiz!");
        swampGameCounter++; resetSwamp();
    }
}

async function cashoutSwamp() {
    if (!swampActive || swampRowIndex === 0) return;
    let win = currentSwampBet * swampMults[swampRowIndex - 1];
    await modifyServerBalance(win);
    alert(`Yutuq qo'shildi: ${win.toLocaleString()} UZS`);
    swampGameCounter++; resetSwamp();
}

function resetSwamp() {
    swampActive = false; swampRowIndex = 0;
    document.getElementById('swampBetBtn').style.opacity = '1';
    document.getElementById('swampTakeBtn').classList.add('disabled');
    document.getElementById('swampTakeBtn').disabled = true;
    buildSwampGrid();
}