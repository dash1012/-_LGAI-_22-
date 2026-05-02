/**
 * 지갑지키미 App Logic
 * Vanilla JS + LocalStorage + Gemini 2.0 Flash API (v1beta REST)
 */

/* ============================================================
   config
   ============================================================ */
const GEMINI_API_KEY = "AIzaSyAH2n76UC57aMhyNlpMRWJh5MWgCn7zDRQ";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

/* State */
let currentUser = null;
let currentScreen = 'auth';
let transactions = [];

/* ============================================================
   init & routing
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initClock();
  loadData();
  
  if (currentUser) {
    if (!currentUser.onboarded) {
      document.getElementById('onboarding-modal').classList.add('open');
      document.getElementById('ob-name').value = currentUser.name || '';
      document.getElementById('ob-age').value = currentUser.age || '';
    }
    navigateTo('home');
  } else {
    navigateTo('auth');
  }
});

function loadData() {
  const userJson = localStorage.getItem('wallet_user');
  if (userJson) currentUser = JSON.parse(userJson);
  
  const txJson = localStorage.getItem('wallet_tx');
  if (txJson) transactions = JSON.parse(txJson);
}

function saveData() {
  if (currentUser) localStorage.setItem('wallet_user', JSON.stringify(currentUser));
  localStorage.setItem('wallet_tx', JSON.stringify(transactions));
}

function navigateTo(screenId) {
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  const screenEl = document.getElementById(`screen-${screenId}`);
  if (screenEl) screenEl.classList.add('active');
  
  // Bottom nav reflection
  document.querySelectorAll('.bn-item').forEach(el => el.classList.remove('active'));
  const btn = document.querySelector(`.bn-item[onclick="navigateTo('${screenId}')"]`);
  if (btn) btn.classList.add('active');
  
  currentScreen = screenId;
  
  // Screen specific init
  if (screenId === 'home') renderHome();
  if (screenId === 'report') renderReport();
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

function initClock() {
  const update = () => {
    const now = new Date();
    let h = now.getHours();
    let m = now.getMinutes();
    const str = `${h}:${m < 10 ? '0'+m : m}`;
    document.querySelectorAll('[id$="-time"]').forEach(el => el.textContent = str);
  };
  update();
  setInterval(update, 10000);
}

function formatNum(num) {
  return Number(num).toLocaleString('ko-KR');
}

/* ============================================================
   Gemini API Wrapper
   ============================================================ */
async function askGemini(systemInstruction, promptText) {
  try {
    const payload = {
      system_instruction: { parts: [{ text: systemInstruction }] },
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: { temperature: 0.7 }
    };

    const res = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      console.error("Gemini API Error:", await res.text());
      return "데이터 분석 중 오류가 발생했습니다 ㅠㅠ";
    }

    const data = await res.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    // Remove markdown codeblock artifacts if JSON is requested
    if (text.startsWith("```json")) {
      text = text.replace(/```json\n/g, '').replace(/\n```/g, '');
    }
    return text.trim();
  } catch (err) {
    console.error("Fetch Error:", err);
    return "네트워크 오류가 발생했습니다.";
  }
}

/* ============================================================
   Auth
   ============================================================ */
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(el => el.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');
  
  if (tab === 'login') {
    document.getElementById('form-login').classList.remove('hidden');
    document.getElementById('form-register').classList.add('hidden');
  } else {
    document.getElementById('form-login').classList.add('hidden');
    document.getElementById('form-register').classList.remove('hidden');
  }
}

function doRegister() {
  const id = document.getElementById('reg-id').value.trim();
  const pw = document.getElementById('reg-pw').value;
  const name = document.getElementById('reg-name').value.trim();
  const age = document.getElementById('reg-age').value;
  const err = document.getElementById('reg-error');
  
  if (!id || !pw || !name || !age) {
    err.textContent = "모든 항목을 입력해주세요.";
    err.classList.add('show');
    return;
  }
  
  currentUser = {
    id, pw, name, age,
    onboarded: false,
    createdAt: new Date().toISOString()
  };
  saveData();
  
  err.classList.remove('show');
  
  // Show onboarding
  document.getElementById('screen-auth').classList.remove('active');
  document.getElementById('screen-home').classList.add('active'); // bg
  document.getElementById('onboarding-modal').classList.add('open');
  document.getElementById('ob-name').value = name;
  document.getElementById('ob-age').value = age;
}

function doLogin() {
  const id = document.getElementById('login-id').value.trim();
  const pw = document.getElementById('login-pw').value;
  const err = document.getElementById('login-error');
  
  const savedUserJson = localStorage.getItem('wallet_user');
  if (!savedUserJson) {
    err.textContent = "가입된 정보가 없습니다.";
    err.classList.add('show');
    return;
  }
  
  const savedUser = JSON.parse(savedUserJson);
  if (savedUser.id === id && savedUser.pw === pw) {
    currentUser = savedUser;
    err.classList.remove('show');
    navigateTo('home');
  } else {
    err.textContent = "아이디 또는 비밀번호가 올바르지 않습니다.";
    err.classList.add('show');
  }
}

function completeOnboarding() {
  const n = document.getElementById('ob-name').value;
  const a = document.getElementById('ob-age').value;
  if (!n) return showToast("이름을 입력해주세요.");
  
  currentUser.name = n;
  currentUser.age = a;
  currentUser.onboarded = true;
  saveData();
  
  document.getElementById('onboarding-modal').classList.remove('open');
  navigateTo('home');
  showToast("환영합니다!");
}

function doLogout() {
  currentUser = null;
  currentScreen = 'auth';
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  document.getElementById('screen-auth').classList.add('active');
  document.getElementById('login-id').value = '';
  document.getElementById('login-pw').value = '';
}

function clearAllData() {
  if(confirm("모든 소비 내역과 계정 정보를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.")) {
    localStorage.removeItem('wallet_user');
    localStorage.removeItem('wallet_tx');
    transactions = [];
    doLogout();
    showToast("초기화 되었습니다.");
  }
}

/* ============================================================
   Home
   ============================================================ */
async function renderHome() {
  if (!currentUser) return;
  document.getElementById('home-username').textContent = `${currentUser.name}님`;
  
  // Settings sync
  document.getElementById('settings-avatar').textContent = currentUser.name.charAt(currentUser.name.length - 1);
  document.getElementById('settings-name').textContent = currentUser.name;
  document.getElementById('s-name-val').textContent = currentUser.name;
  document.getElementById('s-age-val').textContent = currentUser.age + "세";
  document.getElementById('s-id-val').textContent = currentUser.id;
  
  const d = new Date(currentUser.createdAt);
  document.getElementById('settings-sub').textContent = `${currentUser.age}세 · 가입일 ${d.getFullYear()}.${d.getMonth()+1}.${d.getDate()}`;
  
  // Calculate balance
  let spent = 0;
  let income = 0;
  transactions.forEach(t => {
    if (t.type === 'expense') spent += parseInt(t.amount);
    if (t.type === 'income') income += parseInt(t.amount);
  });
  
  const balance = income - spent;
  
  document.getElementById('home-balance').innerHTML = `${formatNum(balance)}<span>원</span>`;
  document.getElementById('home-spent').textContent = formatNum(spent);
  document.getElementById('home-income').textContent = formatNum(income);
  
  document.getElementById('s-spent-val').textContent = formatNum(spent) + "원";
  document.getElementById('s-income-val').textContent = formatNum(income) + "원";
  document.getElementById('s-count-val').textContent = transactions.length + "건";
  
  let p = 0;
  if (income > 0) {
    p = (spent / income) * 100;
    if (p > 100) p = 100;
  }
  document.getElementById('home-progress').style.width = `${p}%`;
  
  // Render Tx List
  const listEl = document.getElementById('home-recent-list');
  const recentTx = [...transactions].sort((a,b) => b.timestamp - a.timestamp).slice(0, 3);
  
  if (recentTx.length === 0) {
    listEl.innerHTML = `
      <div class="tx-list">
        <div class="empty-notice">
          <span class="empty-icon">📭</span>
          아직 소비 내역이 없어요<br>
          <span style="font-size:12px;color:var(--muted)">기록 탭에서 소비를 등록해보세요!</span>
        </div>
      </div>
    `;
    document.getElementById('rfm-grid').innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:20px;font-size:12px;color:var(--sub)">소비 내역이 없습니다.</div>`;
    document.getElementById('home-ai-feedback').textContent = "안녕! 나는 용돈이야 😊 소비를 기록하면 내가 분석해서 피드백을 줄게!";
  } else {
    let html = `<div class="tx-list">`;
    recentTx.forEach(t => {
      let icon = "💸", color = "#FFF0E8", amtClass = "expense", prefix = "-";
      if (t.category === '식비') { icon = "🍔"; }
      if (t.category === '외식') { icon = "🍕"; }
      if (t.category === '오락') { icon = "🎮"; color = "#EDE9FE"; }
      if (t.category === '교통') { icon = "🚌"; color = "#DCFCE7"; }
      if (t.category === '문구') { icon = "📚"; color = "#ECFEFF"; }
      
      if (t.type === 'income') {
        icon = "💰"; color = "#DCFCE7"; amtClass = "income"; prefix = "+";
      }
      
      let tagsHtml = "";
      if (t.type === 'expense' && t.aiAnalysis && t.aiAnalysis.rfm_tags) {
        t.aiAnalysis.rfm_tags.forEach(tag => {
          let tClass = "normal";
          if (tag.includes('야간')) tClass = 'night';
          if (tag.includes('반복')) tClass = 'repeat';
          if (tag.includes('초과') || tag.includes('비필수')) tClass = 'over';
          if (tag.includes('계획')) tClass = 'planned';
          tagsHtml += `<span class="rfm-tag ${tClass}">${tag}</span>`;
        });
      }
      
      html += `
        <div class="tx-item">
          <div class="tx-icon" style="background:${color}">${icon}</div>
          <div class="tx-info">
            <div class="tx-name">${t.name || t.incomeType}</div>
            <div class="tx-meta">${t.time || t.date} · ${t.category || t.type}</div>
          </div>
          <div class="tx-right">
            <div class="tx-amount ${amtClass}">${prefix}${formatNum(t.amount)}</div>
            <div style="display:flex;gap:3px;margin-top:2px;">${tagsHtml}</div>
          </div>
        </div>
      `;
    });
    html += `</div>`;
    listEl.innerHTML = html;
    
    // Call Gemini for Home insights
    await generateHomeInsights();
  }
}

async function generateHomeInsights() {
  if (transactions.filter(t=>t.type==='expense').length === 0) return;
  
  const expList = transactions.filter(t=>t.type==='expense');
  const context = JSON.stringify(expList.slice(-10).map(t => ({
    name: t.name, amount: t.amount, category: t.category, time: t.time
  })));
  
  const sys = `당신은 청소년의 용돈 관리를 돕는 AI '용돈이'입니다. JSON 형식으로만 응답하세요. { "r": "야간% 및 코멘트", "f": "단기반복 횟수 코멘트", "m1": "예산 사용률 코멘트", "m2": "비필수(오락/외식) % 코멘트", "feedback": "가장 최근 소비 내역을 포함한 사용자 친화적 반말 1~2줄 피드백 (이모지 포함)" }`;
  
  document.getElementById('rfm-grid').innerHTML = `<div class="loading-dots" style="grid-column:1/-1;text-align:center;padding:20px;color:var(--primary);font-size:12px;font-weight:700">분석 중</div>`;
  document.getElementById('home-ai-feedback').innerHTML = `<span class="loading-dots">데이터 분석 중</span>`;
  
  const result = await askGemini(sys, `최근 10건 내역: ${context}`);
  try {
    const json = JSON.parse(result);
    // Render RFM
    document.getElementById('rfm-grid').innerHTML = `
      <div class="rfm-mini-item r">
        <div class="rfm-mini-tag">R · 야간구매</div>
        <div class="rfm-mini-desc">${json.r}</div>
      </div>
      <div class="rfm-mini-item f">
        <div class="rfm-mini-tag">F · 반복구매</div>
        <div class="rfm-mini-desc">${json.f}</div>
      </div>
      <div class="rfm-mini-item m">
        <div class="rfm-mini-tag">M · 예산사용</div>
        <div class="rfm-mini-desc">${json.m1}</div>
      </div>
      <div class="rfm-mini-item m2">
        <div class="rfm-mini-tag">M · 비필수소비</div>
        <div class="rfm-mini-desc">${json.m2}</div>
      </div>
    `;
    document.getElementById('home-ai-feedback').innerHTML = json.feedback;
  } catch (e) {
    document.getElementById('rfm-grid').innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:10px;font-size:11px">분석 실패</div>`;
    document.getElementById('home-ai-feedback').textContent = "분석에 실패했어요. 😢";
  }
}

/* ============================================================
   Record (기록)
   ============================================================ */
let currentRecordType = 'expense';
let currentObj = { category: '', time: '야간', isPlanned: true, incomeType: '용돈' };

function setRecordType(type) {
  currentRecordType = type;
  document.getElementById('btn-expense').classList.toggle('active', type === 'expense');
  document.getElementById('btn-income').classList.toggle('active', type === 'income');
  
  if (type === 'expense') {
    document.getElementById('expense-form').classList.remove('hidden');
    document.getElementById('income-form').classList.add('hidden');
  } else {
    document.getElementById('expense-form').classList.add('hidden');
    document.getElementById('income-form').classList.remove('hidden');
  }
}

function selectCategory(el) {
  document.getElementById('cat-chips').querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  currentObj.category = el.dataset.cat;
}

function selectTime(el) {
  document.getElementById('time-chips').querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  currentObj.time = el.dataset.time;
}

function selectPlan(isPlanned) {
  currentObj.isPlanned = isPlanned;
  document.getElementById('plan-yes').classList.toggle('active', isPlanned);
  document.getElementById('plan-no').classList.toggle('active', !isPlanned);
}

function selectIncomeType(el) {
  document.getElementById('income-type-chips').querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  currentObj.incomeType = el.dataset.type;
}

async function submitExpense() {
  const amt = document.getElementById('exp-amount').value;
  const name = document.getElementById('exp-name').value;
  
  if (!amt || !name || !currentObj.category) {
    return showToast("금액, 항목명, 카테고리를 모두 입력해주세요.");
  }
  
  const btn = document.getElementById('record-submit-btn');
  btn.disabled = true;
  btn.innerHTML = `<div class="spinner"></div> 분석 중...`;
  
  // Gemini Analysis for impulse buying
  const sys = `당신은 청소년 소비 분석가입니다. 방금 입력된 소비 건을 분석하세요. JSON 응답: { "isImpulsive": boolean, "rfm_tags": ["🌙야간", "🔄반복" 등 최대 2개], "comment": "친근한 반말로 충동소비 여부와 조언 1문장" }`;
  const info = `항목:${name}, 금액:${amt}, 카테고리:${currentObj.category}, 시간대:${currentObj.time}, 계획여부:${currentObj.isPlanned ? '계획됨':'즉흥적'}`;
  
  const res = await askGemini(sys, info);
  let analysis = { isImpulsive: false, rfm_tags: [], comment: "기록이 완료되었어요!" };
  
  try {
    analysis = JSON.parse(res);
  } catch(e) { console.error("Parse err", e); }
  
  const tx = {
    id: Date.now().toString(),
    type: 'expense',
    amount: amt,
    name: name,
    category: currentObj.category,
    time: currentObj.time,
    isPlanned: currentObj.isPlanned,
    aiAnalysis: analysis,
    date: new Date().toLocaleDateString(),
    timestamp: Date.now()
  };
  
  transactions.push(tx);
  saveData();
  
  // Show result
  const resEl = document.getElementById('ai-record-result');
  resEl.classList.remove('hidden');
  let tagsHtml = "";
  if(analysis.rfm_tags) {
    analysis.rfm_tags.forEach(t => tagsHtml += `<div class="ai-result-tag" style="background:#EDE9FE;color:#7C3AED">${t}</div>`);
  }
  
  resEl.innerHTML = `
    <div class="ai-result-card">
      <div class="result-header">
        <div class="ai-avatar" style="width:28px;height:28px;font-size:14px">🤖</div>
        <div class="result-title">${analysis.isImpulsive ? '🔥 충동소비 감지!' : '✅ 칭찬해요!'}</div>
      </div>
      <div class="result-body">${analysis.comment}</div>
      <div class="ai-result-tags">${tagsHtml}</div>
    </div>
  `;
  
  btn.innerHTML = `<span>🤖</span> 기록 완료!`;
  setTimeout(() => {
    // reset
    document.getElementById('exp-amount').value = '';
    document.getElementById('exp-name').value = '';
    resEl.classList.add('hidden');
    btn.disabled = false;
    btn.innerHTML = `<span>🤖</span> AI 분석 후 기록하기`;
    navigateTo('home');
  }, 2500);
}

function submitIncome() {
  const amt = document.getElementById('inc-amount').value;
  const memo = document.getElementById('inc-memo').value;
  
  if (!amt) return showToast("금액을 입력해주세요.");
  
  const tx = {
    id: Date.now().toString(),
    type: 'income',
    amount: amt,
    incomeType: currentObj.incomeType,
    name: memo || currentObj.incomeType,
    date: new Date().toLocaleDateString(),
    timestamp: Date.now()
  };
  
  transactions.push(tx);
  saveData();
  showToast("수익이 등록되었습니다!");
  
  document.getElementById('inc-amount').value = '';
  document.getElementById('inc-memo').value = '';
  navigateTo('home');
}


/* ============================================================
   Report (리포트)
   ============================================================ */
let currentReportTab = 'monthly';

function switchReportTab(tab) {
  currentReportTab = tab;
  document.querySelectorAll('.report-tab').forEach(el => el.classList.remove('active'));
  document.getElementById(`rtab-${tab}`).classList.add('active');
  
  document.getElementById('report-monthly').classList.add('hidden');
  document.getElementById('report-category').classList.add('hidden');
  document.getElementById('report-rfm').classList.add('hidden');
  
  document.getElementById(`report-${tab}`).classList.remove('hidden');
}

async function renderReport() {
  const exps = transactions.filter(t=>t.type==='expense');
  const incs = transactions.filter(t=>t.type==='income');
  
  let tSpent = 0, tInc = 0;
  exps.forEach(t => tSpent += parseInt(t.amount));
  incs.forEach(t => tInc += parseInt(t.amount));
  
  document.getElementById('rep-total-spent').textContent = formatNum(tSpent);
  document.getElementById('rep-total-income').textContent = formatNum(tInc);
  document.getElementById('rep-balance').textContent = formatNum(tInc - tSpent);
  document.getElementById('rep-count').textContent = transactions.length + "건";
  
  if (exps.length === 0) return;
  
  // Trigger generation automatically for Monthly and RFM
  document.getElementById('report-monthly-feedback').innerHTML = `<span class="loading-dots">데이터 분석 중</span>`;
  document.getElementById('report-insights').innerHTML = `<div style="text-align:center;padding:20px;color:var(--muted)">인사이트 추출 중...</div>`;
  
  // 1. Monthly AI
  const sys1 = `당신은 재무 코치입니다. JSON 규격: { "comment": "월간 총평 2줄", "insights": ["인사이트문장1", "인사이트문장2"] }. 입력은 총소비, 총수익 정보.`;
  const info1 = `총소비:${tSpent}, 총수익:${tInc}, 소비건수:${exps.length}`;
  askGemini(sys1, info1).then(res => {
    try {
      const json = JSON.parse(res);
      document.getElementById('report-monthly-feedback').innerHTML = json.comment;
      let html = "";
      json.insights.forEach((ins, i) => {
        const colors = ["#0891B2", "#7C3AED", "#DC2626", "#16A34A"];
        html += `<div class="insight-item"><div class="insight-dot" style="background:${colors[i%4]}"></div><div class="insight-text">${ins}</div></div>`;
      });
      document.getElementById('report-insights').innerHTML = html;
    } catch(e){}
  });

  // 2. Category
  const catMap = {};
  exps.forEach(t => {
    if(!catMap[t.category]) catMap[t.category] = 0;
    catMap[t.category] += parseInt(t.amount);
  });
  const catStr = JSON.stringify(catMap);
  const sysCat = `카테고리별 소비액을 보고 JSON 배열로 피드백을 주세요. [{ "cat": "카테고리명", "amount": 숫자, "feedback": "1줄평" }]`;
  askGemini(sysCat, catStr).then(res => {
    try {
      const arr = JSON.parse(res);
      let html = "";
      arr.forEach(item => {
        html += `<div class="category-feedback-item">
          <div class="cat-name">${item.cat}</div>
          <div class="cat-amount">${formatNum(item.amount)}원 지출</div>
          <div class="cat-text">${item.feedback}</div>
        </div>`;
      });
      document.getElementById('report-category-list').innerHTML = html;
    } catch(e){}
  });
  
  // 3. RFM Calculation (Manual + AI Feedback)
  let nightCount = 0;
  let repCount = 0; // simplified
  let nonEssential = 0;
  
  exps.forEach(t => {
    if (t.time === '야간') nightCount++;
    if (t.category === '외식' || t.category === '오락') nonEssential += parseInt(t.amount);
  });
  
  let rRate = Math.round((nightCount / exps.length) * 100) || 0;
  let mRate = tInc > 0 ? Math.round((tSpent / tInc) * 100) : 0;
  let m2Rate = tSpent > 0 ? Math.round((nonEssential / tSpent) * 100) : 0;
  
  document.getElementById('rfm-r-val').textContent = rRate + "%";
  document.getElementById('rfm-m-val').textContent = mRate + "%";
  document.getElementById('rfm-m2-val').textContent = m2Rate + "%";
  
  document.getElementById('rfm-r-bar').style.width = Math.min(rRate, 100) + "%";
  document.getElementById('rfm-m-bar').style.width = Math.min(mRate, 100) + "%";
  document.getElementById('rfm-m2-bar').style.width = Math.min(m2Rate, 100) + "%";
  
}

/* ============================================================
   Chatbot (챗봇)
   ============================================================ */
function autoResizeTextarea(el) {
  el.style.height = 'auto';
  el.style.height = (el.scrollHeight) + 'px';
}

function sendQuickQ(text) {
  document.getElementById('chat-input').value = text;
  sendChat();
}

async function sendChat() {
  const inputEl = document.getElementById('chat-input');
  const text = inputEl.value.trim();
  if(!text) return;
  
  inputEl.value = '';
  inputEl.style.height = 'auto';
  
  addMemoToChat('me', text);
  
  // Context
  const exps = transactions.filter(t=>t.type==='expense');
  let tSpent = 0, tInc = 0;
  transactions.forEach(t => {
    if(t.type==='expense') tSpent += parseInt(t.amount);
    if(t.type==='income') tInc += parseInt(t.amount);
  });
  
  const ctx = `내 나이는 ${currentUser.age}세, 현재 잔액은 ${tInc-tSpent}원, 이번달 총지출 ${tSpent}원. 내 소비 기록: ${JSON.stringify(exps.slice(-15).map(t=>({이름:t.name,금액:t.amount,분류:t.category,시간:t.time})))}.`;
  const sys = `당신은 ${currentUser.name}의 개인 용돈 관리 AI 챗봇 '용돈이'입니다. 데이터 컨텍스트를 기반으로, 10대~20대가 좋아할 친근한 반말로, 이모지를 사용해서 답변하세요. 잔액이나 소비 패턴을 근거로 제시하세요. 마크다운 태그를 적절히 사용해 강조하세요.`;
  
  const aiBubbleId = 'ai-chat-' + Date.now();
  addMemoToChat('ai', '<span class="loading-dots">타이핑 중</span>', aiBubbleId);
  
  const prompt = `컨텍스트: ${ctx}\n질문: ${text}`;
  const responseText = await askGemini(sys, prompt);
  
  // Using HTML formatter for markdown simple bold
  let htmlText = responseText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                             .replace(/\n/g, '<br>');
  
  document.getElementById(aiBubbleId).innerHTML = htmlText;
  scrollToBottom();
}

function addMemoToChat(role, html, id = null) {
  const container = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = `chat-bubble ${role === 'me' ? 'user' : ''} fade-in`;
  const avatar = role === 'me' ? `<div class="chat-av me">나</div>` : `<div class="chat-av ai">🤖</div>`;
  
  div.innerHTML = `
    ${avatar}
    <div class="chat-msg" ${id ? `id="${id}"` : ''}>${html}</div>
  `;
  container.appendChild(div);
  scrollToBottom();
}

function scrollToBottom() {
  const container = document.getElementById('chat-messages-container');
  container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
}
