// Global Error Handler
window.onerror = function(msg, url, line) {
    const overlay = document.getElementById('error-overlay');
    overlay.style.display = 'block';
    document.getElementById('error-msg').textContent += `Error: ${msg}\nLine: ${line}\nUrl: ${url}\n\n`;
};

const RANKS = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];
const SUITS = ['s','h','d','c'];
const SUIT_SYMBOLS = {s:'♠', h:'♥', d:'♦', c:'♣'};

let state = {
    hole: [null, null],
    board: [null, null, null, null, null],
    playerCount: 6,
    folded: [],
    currentStepIndex: 0
};

const steps = [
    { id: 'hole1', type: 'card', title: 'Your Hand', theme: 'theme-hand' },
    { id: 'hole2', type: 'card', title: 'Your Hand', theme: 'theme-hand' },
    { id: 'players', type: 'players', title: 'Players', theme: 'theme-players' },
    { id: 'flop1', type: 'card', title: 'The Flop', street: 'flop', theme: 'theme-flop' },
    { id: 'flop2', type: 'card', title: 'The Flop', street: 'flop', theme: 'theme-flop' },
    { id: 'flop3', type: 'card', title: 'The Flop', street: 'flop', theme: 'theme-flop' },
    { id: 'turn', type: 'card', title: 'The Turn', street: 'turn', theme: 'theme-turn' },
    { id: 'river', type: 'card', title: 'The River', street: 'river', theme: 'theme-river' }
];

function init() {
    const wizard = document.getElementById('wizard');
    if (!wizard) return;
    wizard.innerHTML = '';
    steps.forEach((step, index) => {
        const div = document.createElement('div');
        div.className = 'step';
        div.innerHTML = `
            <div class="step-header">
                ${step.street ? `
                    <div class="street-tabs">
                        <div class="street-tab" id="tab-flop-${index}">Flop</div>
                        <div class="street-tab" id="tab-turn-${index}">Turn</div>
                        <div class="street-tab" id="tab-river-${index}">River</div>
                    </div>
                ` : ''}
                <div class="step-context" id="context-${step.id}"></div>
            </div>
            ${step.type === 'card' ? `
                <div class="picker-grid" id="ranks-${step.id}"></div>
                <div class="suit-row" id="suits-${step.id}"></div>
                <div class="scroll-hint" id="hint-${step.id}">
                    <div class="hint-arrow">↓</div>
                    <div class="hint-text"><span id="count-${step.id}">0</span> Beating Hands</div>
                </div>
                ${step.id === 'river' ? `<button class="btn-main" style="margin-top: 24px;" onclick="resetMatch()">Next Match</button>` : ''}
            ` : `
                <div class="player-controls">
                    <button class="counter-btn" id="players-minus">-</button>
                    <span class="player-count-display" id="player-count">${state.playerCount}</span>
                    <button class="counter-btn" id="players-plus">+</button>
                </div>
                <div class="chips-container" id="chips"></div>
                <button class="btn-main" id="btn-to-flop">Deal Flop</button>
            `}
        `;
        wizard.appendChild(div);
    });

    // Event Listeners
    const mBtn = document.getElementById('players-minus');
    const pBtn = document.getElementById('players-plus');
    const fBtn = document.getElementById('btn-to-flop');
    const bBtn = document.getElementById('btn-back');
    const rBtn = document.getElementById('btn-reset');

    if (mBtn) mBtn.onclick = () => changePlayers(-1);
    if (pBtn) pBtn.onclick = () => changePlayers(1);
    if (fBtn) fBtn.onclick = () => nextStep();
    if (bBtn) bBtn.onclick = () => prevStep();
    if (rBtn) rBtn.onclick = () => resetMatch();

    updateView();
}

function resetMatch() {
    state.hole = [null, null];
    state.board = [null, null, null, null, null];
    state.currentStepIndex = 0;
    updateHUD();
    updateView();
}

function changePlayers(delta) {
    state.playerCount = Math.max(2, Math.min(9, state.playerCount + delta));
    state.folded = state.folded.filter(p => p <= state.playerCount);
    const display = document.getElementById('player-count');
    if (display) display.textContent = state.playerCount;
    renderPlayers();
    updateHUD();
}

function renderPlayers() {
    const container = document.getElementById('chips');
    if (!container) return;
    container.innerHTML = '';
    for (let i = 1; i <= state.playerCount; i++) {
        const chip = document.createElement('div');
        chip.className = 'chip';
        if (i === 1) { chip.textContent = 'YOU'; chip.classList.add('active'); }
        else {
            chip.textContent = 'P' + i;
            if (!state.folded.includes(i)) chip.classList.add('active');
            chip.onclick = () => {
                if (state.folded.includes(i)) state.folded = state.folded.filter(p => p !== i);
                else state.folded.push(i);
                renderPlayers();
                updateHUD();
            };
        }
        if (state.folded.includes(i)) chip.classList.add('folded');
        container.appendChild(chip);
    }
}

function updateView() {
    const wizard = document.getElementById('wizard');
    if (!wizard) return;
    const stepElements = wizard.querySelectorAll('.step');
    stepElements.forEach((el, idx) => {
        if (idx === state.currentStepIndex) el.classList.add('active');
        else el.classList.remove('active');
    });
    
    const currentStep = steps[state.currentStepIndex];
    if (currentStep.type === 'card') {
        renderPicker(currentStep.id);
    } else if (currentStep.type === 'players') {
        renderPlayers();
    }
    
    // Update Header & Icons
    const bBtn = document.getElementById('btn-back');
    if (bBtn) {
        if (state.currentStepIndex === 0) bBtn.classList.add('hidden');
        else bBtn.classList.remove('hidden');
    }

    const headerStatus = document.getElementById('header-status');
    if (headerStatus) headerStatus.textContent = currentStep.title;

    // Update Theme
    document.body.className = currentStep.theme;
    
    updateContexts();
    updateStreetTabs();
}

function updateStreetTabs() {
    const filled = state.board.filter(c => c !== null).length;
    steps.forEach((s, idx) => {
        ['flop', 'turn', 'river'].forEach(street => {
            const tab = document.getElementById(`tab-${street}-${idx}`);
            if (!tab) return;
            tab.classList.remove('active', 'done');
            if (street === 'flop') {
                if (filled >= 3) tab.classList.add('done');
                else if (state.currentStepIndex >= 3 && state.currentStepIndex <= 5) tab.classList.add('active');
            } else if (street === 'turn') {
                if (filled >= 4) tab.classList.add('done');
                else if (state.currentStepIndex === 6) tab.classList.add('active');
            } else if (street === 'river') {
                if (filled >= 5) tab.classList.add('done');
                else if (state.currentStepIndex === 7) tab.classList.add('active');
            }
        });
    });
}

function renderPicker(stepId) {
    const rankGrid = document.getElementById(`ranks-${stepId}`);
    if (!rankGrid) return;
    rankGrid.innerHTML = '';
    RANKS.forEach((r, i) => {
        const btn = document.createElement('button');
        btn.className = 'picker-btn';
        btn.textContent = r;
        btn.dataset.rank = r;

        // Disable rank if all 4 suits are used globally
        let availableSuits = 0;
        for (let s = 0; s < 4; s++) {
            if (!isCardUsed(i * 4 + s)) availableSuits++;
        }
        if (availableSuits === 0) btn.classList.add('disabled');

        btn.onclick = () => {
            rankGrid.querySelectorAll('.picker-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            showSuits(stepId, i);
        };
        rankGrid.appendChild(btn);

        // Force a row break after the 4th and 8th card to create the 4-4-5 layout
        if (i === 3 || i === 7) {
            const br = document.createElement('div');
            br.style.flexBasis = '100%';
            br.style.height = '0';
            rankGrid.appendChild(br);
        }
    });
}

function showSuits(stepId, rankIndex) {
    const suitRow = document.getElementById(`suits-${stepId}`);
    if (!suitRow) return;
    suitRow.innerHTML = '';
    suitRow.classList.add('active');
    SUITS.forEach((s, i) => {
        const btn = document.createElement('button');
        btn.className = 'suit-btn';
        btn.dataset.suit = s;
        btn.textContent = SUIT_SYMBOLS[s];
        const idx = rankIndex * 4 + i;
        if (isCardUsed(idx)) btn.classList.add('disabled');
        btn.onclick = () => selectCard(stepId, idx);
        suitRow.appendChild(btn);
    });
}

function isCardUsed(idx) {
    return [...state.hole, ...state.board].includes(idx);
}

function selectCard(stepId, cardIdx) {
    const map = { 
        hole1: [state.hole, 0], 
        hole2: [state.hole, 1], 
        flop1: [state.board, 0], 
        flop2: [state.board, 1], 
        flop3: [state.board, 2], 
        turn: [state.board, 3], 
        river: [state.board, 4] 
    };
    if (map[stepId]) map[stepId][0][map[stepId][1]] = cardIdx;
    updateHUD();
    nextStep();
}

function nextStep() {
    if (state.currentStepIndex < steps.length - 1) {
        state.currentStepIndex++;
        updateView();
    }
}

function prevStep() {
    if (state.currentStepIndex > 0) {
        // Clear the card at the current step we are moving AWAY from
        const s = steps[state.currentStepIndex];
        if (s.type === 'card') {
            const map = { 
                hole1: [state.hole, 0], hole2: [state.hole, 1], 
                flop1: [state.board, 0], flop2: [state.board, 1], flop3: [state.board, 2], 
                turn: [state.board, 3], river: [state.board, 4] 
            };
            if (map[s.id]) map[s.id][0][map[s.id][1]] = null;
        }

        state.currentStepIndex--;
        updateView();
        updateHUD();
    }
}

function updateContexts() {
    steps.forEach(s => {
        const ctx = document.getElementById(`context-${s.id}`);
        if (!ctx) return;
        ctx.innerHTML = '';

        const holePresent = state.hole.some(c => c !== null);
        const boardPresent = state.board.some(c => c !== null);

        const createEl = (c, isHole, idx) => {
            const r = c >> 2, su = c & 3;
            const el = document.createElement('div');
            el.className = 'card-mini';
            if (isHole) el.classList.add('is-hand');
            if (su === 1 || su === 2) el.classList.add('red');
            el.textContent = RANKS[r] + SUIT_SYMBOLS[SUITS[su]];
            el.onclick = () => {
                if (isHole) {
                    state.hole[idx] = null;
                    state.currentStepIndex = idx;
                } else {
                    state.board[idx] = null;
                    state.currentStepIndex = idx + 3;
                }
                updateView(); updateHUD();
            };
            return el;
        };

        if (holePresent) {
            const group = document.createElement('div');
            group.className = 'context-group';
            group.innerHTML = '<span class="context-label">Hand</span>';
            const cardsDiv = document.createElement('div');
            cardsDiv.className = 'context-cards';
            state.hole.forEach((c, i) => { if (c !== null) cardsDiv.appendChild(createEl(c, true, i)); });
            group.appendChild(cardsDiv);
            ctx.appendChild(group);
        }

        if (holePresent && boardPresent) {
            const div = document.createElement('div');
            div.className = 'context-divider';
            ctx.appendChild(div);
        }

        if (boardPresent) {
            const group = document.createElement('div');
            group.className = 'context-group';
            group.innerHTML = '<span class="context-label">Board</span>';
            const cardsDiv = document.createElement('div');
            cardsDiv.className = 'context-cards';
            state.board.forEach((c, i) => { if (c !== null) cardsDiv.appendChild(createEl(c, false, i)); });
            group.appendChild(cardsDiv);
            ctx.appendChild(group);
        }
    });
}

// --- POKER ENGINE ---
function score5(ca1,ca2,ca3,ca4,ca5) {
    const cards = [ca1,ca2,ca3,ca4,ca5];
    const ranks = [], suits = [];
    for(let i=0; i<5; i++) { ranks[i] = cards[i] >> 2; suits[i] = cards[i] & 3; }
    ranks.sort((a,b) => b-a);
    const counts = {};
    for(let i=0; i<5; i++) counts[ranks[i]] = (counts[ranks[i]] || 0) + 1;
    const keys = Object.keys(counts).map(Number).sort((a,b) => counts[b] === counts[a] ? b-a : counts[b]-counts[a]);
    const isFlush = suits[0]===suits[1] && suits[0]===suits[2] && suits[0]===suits[3] && suits[0]===suits[4];
    const isStraight = (ranks[0]-ranks[4] === 4 && new Set(ranks).size === 5) || (ranks[0]===12 && ranks[1]===3 && ranks[4]===0);
    const sHigh = isStraight ? (ranks[0]===12 && ranks[1]===3 ? 3 : ranks[0]) : 0;
    let cat = 0, tie = 0;
    const c0 = counts[keys[0]], c1 = counts[keys[1]] || 0;
    if (isFlush && isStraight) { cat = 8e13; tie = sHigh; }
    else if (c0 === 4) { cat = 7e13; tie = keys[0]*13 + keys[1]; }
    else if (c0 === 3 && c1 === 2) { cat = 6e13; tie = keys[0]*13 + keys[1]; }
    else if (isFlush) { cat = 5e13; for(let i=0; i<5; i++) tie += ranks[i]*Math.pow(13, 4-i); }
    else if (isStraight) { cat = 4e13; tie = sHigh; }
    else if (c0 === 3) { cat = 3e13; tie = keys[0]*169+keys[1]*13+keys[2]; }
    else if (c0 === 2 && c1 === 2) { cat = 2e13; tie = keys[0]*169+keys[1]*13+keys[2]; }
    else if (c0 === 2) { cat = 1e13; tie = keys[0]*2197+keys[1]*169+keys[2]*13+keys[3]; }
    else { cat = 0; for(let i=0; i<5; i++) tie += ranks[i]*Math.pow(13, 4-i); }
    return cat + tie;
}

const COMB7_5 = [];
(function(){
    for(let a=0;a<3;a++)for(let b=a+1;b<4;b++)for(let d=b+1;d<5;d++)for(let e=d+1;e<6;e++)for(let f=e+1;f<7;f++) COMB7_5.push([a,b,d,e,f]);
})();

function getBestArr(c) {
    if (c.length < 5) return 0;
    if (c.length === 5) return score5(...c);
    if (c.length === 6) {
        let max = 0;
        for(let i=0; i<6; i++) {
            const copy = [...c]; copy.splice(i, 1);
            max = Math.max(max, score5(...copy));
        }
        return max;
    }
    let max = 0;
    for(let i=0; i<21; i++) {
        const comb = COMB7_5[i];
        const s = score5(c[comb[0]], c[comb[1]], c[comb[2]], c[comb[3]], c[comb[4]]);
        if (s > max) max = s;
    }
    return max;
}

function updateHUD() {
    const h = state.hole.filter(c => c !== null);
    const b = state.board.filter(c => c !== null);
    if (h.length === 2) {
        const current = [...h, ...b];
        const bestScore = getBestArr(current);
        const handEl = document.getElementById('hud-hand');
        if (handEl) handEl.textContent = current.length >= 5 ? getHandName(bestScore) : "-";

        const outsPanel = document.getElementById('outs-panel');
        if (b.length >= 3 && b.length < 5) {
            const known = new Set([...h, ...b]);
            const curMax = bestScore;
            let outs = [];
            for(let i=0; i<52; i++) {
                if (known.has(i)) continue;
                if (getBestArr([...current, i]) > curMax) outs.push(i);
            }
            const outsCountEl = document.getElementById('hud-outs');
            const outsHeaderEl = document.getElementById('outs-header');
            const rule = b.length === 3 ? 4 : 2;
            if (outsCountEl) outsCountEl.textContent = outs.length;
            if (outsHeaderEl) outsHeaderEl.textContent = `Outs (${outs.length * rule}%)`;
            if (outsPanel) {
                outsPanel.innerHTML = '';
                outsPanel.style.display = 'flex';
                outs.forEach(o => {
                    const badge = document.createElement('div');
                    badge.className = 'out-badge';
                    if ((o&3)===1 || (o&3)===2) badge.classList.add('red');
                    badge.textContent = RANKS[o>>2] + SUIT_SYMBOLS[SUITS[o&3]];
                    outsPanel.appendChild(badge);
                });
            }
        } else {
            if (outsPanel) outsPanel.style.display = 'none';
            const outsCountEl = document.getElementById('hud-outs');
            const outsHeaderEl = document.getElementById('outs-header');
            if (outsCountEl) outsCountEl.textContent = "0";
            if (outsHeaderEl) outsHeaderEl.textContent = "Outs";
        }

        const stats = runSimulation();
        const w = Math.round(stats.win * 100);
        const winEl = document.getElementById('hud-win');
        if (winEl) winEl.textContent = w + '%';
        const m = document.getElementById('hud-meter');
        if (m) {
            m.style.width = w + '%';
            m.style.backgroundColor = w > 60 ? 'var(--green)' : (w > 40 ? 'var(--amber)' : 'var(--red)');
        }
        updateAnalysis();
    } else {
        // Reset HUD values if hand is incomplete
        if (document.getElementById('hud-win')) document.getElementById('hud-win').textContent = '0%';
        if (document.getElementById('hud-hand')) document.getElementById('hud-hand').textContent = '-';
        if (document.getElementById('hud-outs')) document.getElementById('hud-outs').textContent = '0';
        if (document.getElementById('hud-meter')) document.getElementById('hud-meter').style.width = '0%';
        updateAnalysis();
    }
}

function updateAnalysis() {
    const container = document.getElementById('better-hands-container');
    if (!container) return;

    const h = state.hole.filter(c => c !== null);
    const b = state.board.filter(c => c !== null);
    
    if (h.length < 2) {
        container.innerHTML = '<div class="analysis-placeholder">Complete your hand to see analysis</div>';
        return;
    }

    const currentCards = [...h, ...b];
    const myBest = getBestArr(currentCards);
    const known = new Set([...h, ...b]);
    const deck = [];
    for (let i = 0; i < 52; i++) if (!known.has(i)) deck.push(i);

    const categories = [
        { name: "Straight Flush", min: 8e13 },
        { name: "4 of a Kind", min: 7e13 },
        { name: "Full House", min: 6e13 },
        { name: "Flush", min: 5e13 },
        { name: "Straight", min: 4e13 },
        { name: "3 of a Kind", min: 3e13 },
        { name: "Two Pair", min: 2e13 },
        { name: "One Pair", min: 1e13 },
        { name: "High Card", min: 0 }
    ];

    const results = {};
    let totalBeatingHands = 0;

    // Check all 2-card combinations for opponents
    for (let i = 0; i < deck.length; i++) {
        for (let j = i + 1; j < deck.length; j++) {
            const opH = [deck[i], deck[j]];
            const opBest = getBestArr([...opH, ...b]);
            
            if (opBest > myBest) {
                totalBeatingHands++;
                for (const cat of categories) {
                    if (opBest >= cat.min) {
                        if (!results[cat.name]) {
                            results[cat.name] = { score: opBest, hand: opH, count: 0 };
                        }
                        results[cat.name].count++;
                        if (opBest > results[cat.name].score) {
                            results[cat.name].score = opBest;
                            results[cat.name].hand = opH;
                        }
                        break;
                    }
                }
            }
        }
    }

    // Update scroll hints
    steps.forEach(s => {
        const hint = document.getElementById(`hint-${s.id}`);
        const countEl = document.getElementById(`count-${s.id}`);
        if (hint && countEl) {
            countEl.textContent = totalBeatingHands;
            if (totalBeatingHands > 0) hint.classList.add('visible');
            else hint.classList.remove('visible');
        }
    });

    const betterCategories = categories.filter(c => results[c.name]);

    if (betterCategories.length === 0) {
        container.innerHTML = '<div class="analysis-placeholder">You have the nuts! (Nothing currently beats you)</div>';
        return;
    }

    container.innerHTML = '';
    betterCategories.forEach(cat => {
        const data = results[cat.name];
        const item = document.createElement('div');
        item.className = 'better-hand-item';
        
        const info = document.createElement('div');
        info.className = 'better-hand-info';
        info.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span class="better-hand-name">${cat.name}</span>
                <span style="background: var(--accent); color: #000; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 10px;">${data.count}</span>
            </div>
            <span class="better-hand-desc">${data.count} possible combinations</span>
        `;
        
        const cardsDiv = document.createElement('div');
        cardsDiv.className = 'better-hand-cards';
        data.hand.forEach(c => {
            const r = c >> 2, su = c & 3;
            const cardEl = document.createElement('div');
            cardEl.className = 'card-mini';
            cardEl.style.width = '30px';
            cardEl.style.height = '42px';
            cardEl.style.fontSize = '12px';
            if (su === 1 || su === 2) cardEl.classList.add('red');
            cardEl.textContent = RANKS[r] + SUIT_SYMBOLS[SUITS[su]];
            cardsDiv.appendChild(cardEl);
        });

        item.appendChild(info);
        item.appendChild(cardsDiv);
        container.appendChild(item);
    });
}

function getHandName(s) {
    if (s >= 8e13) return "Straight Flush"; if (s >= 7e13) return "4 of a Kind";
    if (s >= 6e13) return "Full House"; if (s >= 5e13) return "Flush";
    if (s >= 4e13) return "Straight"; if (s >= 3e13) return "3 of a Kind";
    if (s >= 2e13) return "Two Pair"; if (s >= 1e13) return "One Pair";
    return "High Card";
}

function runSimulation() {
    const h = state.hole.filter(c => c !== null);
    const b = state.board.filter(c => c !== null);
    if (h.length < 2) return { win:0 };
    const opCount = state.playerCount - 1 - state.folded.length;
    const deck = [];
    const known = new Set([...h, ...b]);
    for(let i=0; i<52; i++) if(!known.has(i)) deck.push(i);
    let wins = 0, ties = 0, iterations = 1500;
    for(let i=0; i<iterations; i++) {
        const d = [...deck];
        for (let j = d.length - 1; j > 0; j--) {
            const k = Math.floor(Math.random() * (j + 1));
            const tmp = d[j]; d[j] = d[k]; d[k] = tmp;
        }
        const sb = [...b];
        while(sb.length < 5) sb.push(d.pop());
        const myBest = getBestArr([...h, ...sb]);
        let lose = false, tie = false;
        for(let p=0; p<opCount; p++) {
            const opH = [d.pop(), d.pop()];
            const opBest = getBestArr([...opH, ...sb]);
            if (opBest > myBest) { lose = true; break; }
            if (opBest === myBest) tie = true;
        }
        if (!lose) { if (tie) ties++; else wins++; }
    }
    return { win: wins/iterations + (ties/iterations)*0.5 };
}

init();
