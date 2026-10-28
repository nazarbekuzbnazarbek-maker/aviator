let aviGame = { active: false, mult: 1.00, crashAt: 1.00, betVal: 5000, activeBet: false, cashed: false };
let aviGameCounter = 0;

function initAviatorGame() { runAviatorCycle(); }

async function handleAviatorAction() {
    let btn = document.getElementById('aviBtn1');
    let val = parseFloat(document.getElementById('aviBetInput1').value) || 5000;
    aviGame.betVal = val;

    if (!aviGame.active && !aviGame.activeBet) {
        if (currentUser.balance < val) { alert("Balans yetarli emas!"); return; }
        await modifyServerBalance(-val);
        aviGame.activeBet = true; aviGame.cashed = false;
        btn.style.background = '#ef4444'; btn.textContent = 'CANCEL';
    } else if (aviGame.active && aviGame.activeBet && !aviGame.cashed) {
        let win = val * aviGame.mult;
        await modifyServerBalance(win);
        aviGame.cashed = true;
        btn.style.background = '#eab308'; btn.textContent = `CASHED (${Math.round(win)})`;
    }
}

async function runAviatorCycle() {
    if (aviGame.active) return;
    aviGame.active = true; aviGame.mult = 1.00;

    const fRes = await fetch('/api/get_forecast/aviator');
    const fData = await fRes.json();
    let mode = fData.mode;

    let isWin = (mode === 'win') ? true : (mode === 'lose' ? false : (aviGameCounter % 6 === 0));
    aviGame.crashAt = isWin ? (Math.random() * 4 + 2.2).toFixed(2) : 1.00;

    document.getElementById('aviFlewAway').classList.add('hidden');
    let start = Date.now();

    function frame() {
        let t = (Date.now() - start) / 1000;
        aviGame.mult = (aviGame.crashAt == 1.00) ? 1.00 : Math.pow(1.09, t * 2.2);

        document.getElementById('aviMultDisplay').textContent = `${aviGame.mult.toFixed(2)}x`;
        drawAviCanvas(t);

        if (aviGame.mult >= aviGame.crashAt) {
            aviGame.active = false;
            document.getElementById('aviFlewAway').classList.remove('hidden');
            resetAvi();
            aviGameCounter++;
            setTimeout(runAviatorCycle, 4000);
        } else { requestAnimationFrame(frame); }
    }
    requestAnimationFrame(frame);
}

function drawAviCanvas(t) {
    const cvs = document.getElementById('aviatorCanvas'); if (!cvs) return;
    const ctx = cvs.getContext('2d'); ctx.clearRect(0, 0, cvs.width, cvs.height);
    ctx.beginPath(); ctx.moveTo(0, cvs.height);
    let ex = Math.min(cvs.width * 0.85, t * 70), ey = Math.max(40, cvs.height - (t * 40));
    ctx.quadraticCurveTo(ex / 2, cvs.height, ex, ey);
    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 4; ctx.stroke();
    ctx.font = '22px sans-serif'; ctx.fillText('✈️', ex - 12, ey + 10);
}

function resetAvi() {
    let btn = document.getElementById('aviBtn1');
    aviGame.activeBet = false; aviGame.cashed = false;
    btn.style.background = '#22c55e'; btn.textContent = 'BET';
}