const vscode = require('vscode');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

const VISUAL_EXTS = ['.webm', '.mp4', '.gif', '.png', '.jpg', '.jpeg'];
const SOUND_EXTS = ['.wav'];

// у каждого вида события — цепочка папок: берём первую, где нашлись файлы
const FALLBACKS = {
  command: ['command'],
  done: ['done', 'command'],
  permission: ['permission', 'command'],
  annoyed: ['annoyed', 'command'],
  thinking: ['thinking'],
  idle: ['idle']
};

const DEFAULT_PHRASES = {
  command: ['Да, хозяин!', 'Работать-работать.', 'Сейчас-сейчас.', 'Моя готов работать!', 'Хорошо-о.'],
  done: ['Работа закончена!', 'Готово, хозяин.', "Job's done!"],
  permission: ['Что-то нужно, хозяин?', 'Моя ждать приказа.', 'Хм? Чего надо?'],
  annoyed: ['Моя занят, отстань!', 'Не тыкай в меня!', 'Хватит уже!', 'Ай! За что?!', 'Работать некогда, а ты тыкаешь...'],
  grumble: ['Работа-работа...', 'Зуг-зуг...', 'Моя скучать без работы.', 'Эх, вкалывай тут...']
};

function slaveHome() {
  const cfg = vscode.workspace.getConfiguration('wClaudeSlave');
  const p = (cfg.get('slaveHome') || '').trim();
  return p ? p : path.join(os.homedir(), '.claude', 'w-claude-slave');
}

function listAssets(kind, exts) {
  const home = path.join(slaveHome(), 'assets');
  for (const folder of FALLBACKS[kind] || [kind]) {
    const dir = path.join(home, folder);
    try {
      const files = fs.readdirSync(dir).filter(f => exts.includes(path.extname(f).toLowerCase()));
      if (files.length) return files.map(f => path.join(dir, f));
    } catch (e) { /* папки нет — идём дальше по цепочке */ }
  }
  return [];
}

function pickRandom(arr) {
  return arr.length ? arr[Math.floor(Math.random() * arr.length)] : null;
}

function loadPhrases() {
  const file = path.join(slaveHome(), 'assets', 'phrases.json');
  try {
    const custom = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Object.assign({}, DEFAULT_PHRASES, custom);
  } catch (e) {
    return DEFAULT_PHRASES;
  }
}

// соответствие «файл звука → фраза в облачке» (для знаков вроде «?», запрещённых в именах файлов)
function loadSoundmap() {
  const file = path.join(slaveHome(), 'assets', 'soundmap.json');
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return {};
  }
}

let logChannel = null;
function log(msg) {
  if (logChannel) logChannel.appendLine(new Date().toISOString().slice(11, 19) + ' ' + msg);
}

function playWav(file, onDone) {
  log('play: ' + file);
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    if (onDone) onDone();
  };
  const escaped = file.replace(/'/g, "''");
  const p = spawn('powershell.exe', [
    '-NoProfile', '-WindowStyle', 'Hidden', '-Command',
    `(New-Object Media.SoundPlayer '${escaped}').PlaySync()`
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = '';
  p.stderr.on('data', d => { err += d.toString(); });
  p.on('error', e => { log('spawn ERROR: ' + e.message); finish(); });
  p.on('exit', c => { log('player exit ' + c + (err.trim() ? ' | stderr: ' + err.trim() : ' | ok')); finish(); });
  setTimeout(finish, 10000); // страховка, если процесс завис
}

class SlaveViewProvider {
  constructor(context) {
    this.context = context;
    this.view = null;
    this.working = false;
    this.lastActivity = Date.now();
    this.annoyIndex = 0;
    this.phrases = loadPhrases();
    this.soundmap = loadSoundmap();
    this.soundPlaying = false;
    this.pending = []; // события, ждущие, пока договорит текущая фраза
  }

  get muted() {
    return vscode.workspace.getConfiguration('wClaudeSlave').get('muted');
  }

  get subtitlesOn() {
    return vscode.workspace.getConfiguration('wClaudeSlave').get('subtitles');
  }

  get reactionMs() {
    const s = vscode.workspace.getConfiguration('wClaudeSlave').get('reactionSeconds');
    return Math.max(1, Number(s) || 6) * 1000;
  }

  resolveWebviewView(view) {
    this.view = view;
    const assetsDir = path.join(slaveHome(), 'assets');
    view.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.file(assetsDir),
        vscode.Uri.file(path.join(this.context.extensionPath, 'media'))
      ]
    };
    view.webview.html = getHtml(view.webview);
    view.webview.onDidReceiveMessage(msg => {
      if (msg.type === 'ready') this.sendInit();
      else if (msg.type === 'poke') this.poke();
      else if (msg.type === 'reset') {
        log('ручной сброс (двойной клик)');
        this.working = false;
        this.pending = [];
        this.postState();
      }
      else if (msg.type === 'mute') {
        vscode.workspace.getConfiguration('wClaudeSlave').update('muted', !!msg.muted, true);
      }
      else if (msg.type === 'subs') {
        vscode.workspace.getConfiguration('wClaudeSlave').update('subtitles', !!msg.on, true);
      }
    });
  }

  toUri(file) {
    return this.view ? this.view.webview.asWebviewUri(vscode.Uri.file(file)).toString() : null;
  }

  sendInit() {
    if (!this.view) return;
    const portrait = pickRandom(listAssets('idle', ['.png', '.jpg', '.jpeg', '.gif']));
    const thinking = pickRandom(listAssets('thinking', ['.webm', '.mp4', '.gif']));
    this.view.webview.postMessage({
      type: 'init',
      portrait: portrait ? this.toUri(portrait) : null,
      thinking: thinking ? this.toUri(thinking) : null,
      muted: this.muted,
      subtitles: this.subtitlesOn,
      reactionMs: this.reactionMs,
      working: this.working
    });
  }

  postState() {
    if (this.view) this.view.webview.postMessage({ type: 'state', working: this.working });
  }

  playEvent(kind, opts = {}) {
    const silent = !!opts.silent;

    // звуковое событие ждёт, пока договорит предыдущее.
    // тихие подсказки (запрос прав) не встают в очередь и не блокируют.
    if (this.soundPlaying && !silent) {
      if (this.pending.length < 2) this.pending.push([kind, opts]);
      else log('queue full, dropped: ' + kind);
      return;
    }
    this.lastActivity = Date.now();

    const visual = pickRandom(listAssets(kind, VISUAL_EXTS));
    const sound = silent ? null : pickRandom(listAssets(kind, SOUND_EXTS));

    // фраза в облачке = фраза звука: из soundmap.json или имени wav-файла
    // («Угу 2.wav» → «Угу»); если звука нет — случайная из текстового пула
    let phrase;
    if (sound) {
      const base = path.basename(sound);
      phrase = this.soundmap[base] || base.replace(/\.wav$/i, '').replace(/ \d+$/, '');
    }
    if (!phrase) {
      const pool = this.phrases[opts.phraseKey || kind] || [];
      if (opts.sequential && pool.length) {
        phrase = pool[this.annoyIndex % pool.length];
        this.annoyIndex++;
      } else {
        phrase = pickRandom(pool);
      }
    }

    log('event: ' + kind + ' | sound: ' + (sound ? path.basename(sound) : (silent ? 'тихо' : 'НЕТ')) + ' | muted: ' + this.muted);
    if (sound && !this.muted) {
      this.soundPlaying = true;
      playWav(sound, () => {
        this.soundPlaying = false;
        const next = this.pending.shift();
        if (next) this.playEvent(next[0], next[1]);
        // фраза договорена — гасим говорящую анимацию (если дальше нет очереди)
        else if (this.view) this.view.webview.postMessage({ type: 'quiet' });
      });
    }
    if (this.view && visual) {
      const ext = path.extname(visual).toLowerCase();
      this.view.webview.postMessage({
        type: 'play',
        src: this.toUri(visual),
        isVideo: ['.webm', '.mp4'].includes(ext),
        subtitle: this.subtitlesOn ? (phrase || '') : '',
        working: this.working
      });
    }
  }

  poke() {
    this.playEvent('annoyed', { sequential: true });
  }

  handleClaudeEvent(ev) {
    if (ev === 'prompt') {
      this.working = true;
      this.workingSince = Date.now();
      this.playEvent('command');
      this.postState();
    } else if (ev === 'stop') {
      // «Работа закончена» — только если раб реально был занят.
      // Шальной stop в простое (напр. от другой сессии) молчит.
      const wasWorking = this.working;
      this.working = false;
      if (wasWorking) this.playEvent('done');
      this.postState();
    } else if (ev === 'end') {
      // сессия закрыта/сброшена: тихо снимаем «работает», без фразы
      this.working = false;
      this.pending = [];
      this.postState();
    } else if (ev === 'notify') {
      // запрос прав / ожидание ввода — середина задачи: молча привлекаем внимание, без звука
      this.playEvent('permission', { silent: true });
    }
  }

  // страховка от зависшего «работает»: Stop мог не прийти (сессию закрыли, прервали)
  checkStuckWorking() {
    if (!this.working) return;
    const cfg = vscode.workspace.getConfiguration('wClaudeSlave');
    const mins = Math.max(1, Number(cfg.get('workingTimeoutMinutes')) || 20);
    if (Date.now() - (this.workingSince || 0) > mins * 60 * 1000) {
      log('working ' + mins + ' мин без Stop — сбрасываю в покой');
      this.working = false;
      this.postState();
    }
  }

  maybeGrumble() {
    const cfg = vscode.workspace.getConfiguration('wClaudeSlave');
    if (!cfg.get('idleGrumble') || this.working) return;
    const minutes = Math.max(1, cfg.get('idleGrumbleMinutes') || 7);
    if (Date.now() - this.lastActivity < 3 * 60 * 1000) return; // не раньше 3 минут тишины
    if (Math.random() < 1 / minutes) {
      this.playEvent('annoyed', { phraseKey: 'grumble' });
    }
  }
}

function ensureEventsFile() {
  const home = slaveHome();
  const file = path.join(home, 'events.jsonl');
  try {
    fs.mkdirSync(home, { recursive: true });
    if (!fs.existsSync(file)) fs.writeFileSync(file, '');
  } catch (e) { /* ignore */ }
  return file;
}

function activate(context) {
  logChannel = vscode.window.createOutputChannel('W_Claude_Slave');
  context.subscriptions.push(logChannel);
  log('activated | home: ' + slaveHome());

  // прогрев аудио-стека (powershell + .NET + устройство), чтобы ПЕРВАЯ фраза
  // после открытия VS Code не обрезалась холодным стартом. primer.wav — тишина.
  try {
    const primer = path.join(slaveHome(), 'assets', 'primer.wav');
    if (fs.existsSync(primer)) { log('audio prime'); playWav(primer); }
  } catch (e) { /* ignore */ }

  const provider = new SlaveViewProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('wClaudeSlave.view', provider, {
      webviewOptions: { retainContextWhenHidden: true }
    })
  );

  const eventsFile = ensureEventsFile();
  let offset = 0;
  try { offset = fs.statSync(eventsFile).size; } catch (e) { /* ignore */ }

  fs.watchFile(eventsFile, { interval: 250 }, (curr, prev) => {
    if (curr.size < offset) offset = 0; // файл обрезали
    if (curr.size <= offset) return;
    const stream = fs.createReadStream(eventsFile, { start: offset, end: curr.size - 1, encoding: 'utf8' });
    let chunk = '';
    stream.on('data', d => { chunk += d; });
    stream.on('end', () => {
      offset = curr.size;
      for (const line of chunk.split(/\r?\n/)) {
        const t = line.trim();
        if (!t) continue;
        try {
          const ev = JSON.parse(t);
          provider.handleClaudeEvent(ev.event);
        } catch (e) { /* мусорная строка — пропускаем */ }
      }
    });
  });
  context.subscriptions.push({ dispose: () => fs.unwatchFile(eventsFile) });

  const grumbleTimer = setInterval(() => {
    provider.checkStuckWorking();
    provider.maybeGrumble();
  }, 60 * 1000);
  context.subscriptions.push({ dispose: () => clearInterval(grumbleTimer) });

  // при первом запуске после установки — показать панель, дальше не навязываемся
  if (!context.globalState.get('slaveRevealed')) {
    context.globalState.update('slaveRevealed', true);
    vscode.commands.executeCommand('wClaudeSlave.view.focus').then(undefined, () => {});
  }
}

function deactivate() {}

function getHtml(webview) {
  const nonce = crypto.randomBytes(16).toString('hex');
  const csp = `default-src 'none'; img-src ${webview.cspSource}; media-src ${webview.cspSource}; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';`;
  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<style>
  html, body {
    height: 100%; margin: 0; padding: 0 0 0 16px;
    box-sizing: border-box;
    background: transparent;
    display: flex; flex-direction: column; align-items: flex-start; justify-content: center;
    overflow: hidden;
    font-family: Georgia, 'Times New Roman', serif;
    user-select: none;
  }
  #frame {
    position: relative;
    width: min(60vh, 80vw, 280px);
    aspect-ratio: 1;
    cursor: pointer;
  }
  #frame img, #frame video {
    position: absolute; inset: 0;
    width: 100%; height: 100%;
    object-fit: cover;
    border-radius: 10px;
    display: none;
  }
  #frame .visible { display: block; }
  #frame.working .visible {
    animation: bob 1.2s ease-in-out infinite;
  }
  @keyframes bob {
    0%, 100% { transform: translateY(0) scale(1); }
    50% { transform: translateY(-3px) scale(1.015); }
  }
  #bubble {
    position: absolute;
    left: 50%; top: 6px;
    transform: translateX(-50%) scale(.9);
    max-width: 88%;
    background: #f7ecd0;
    color: #3a2a12;
    border: 2px solid #8a6d3b;
    border-radius: 12px;
    padding: 5px 10px;
    font-size: 13px;
    line-height: 1.25;
    text-align: center;
    box-shadow: 0 2px 8px rgba(0,0,0,.55);
    opacity: 0;
    transition: opacity .2s, transform .2s;
    z-index: 4;
    pointer-events: none;
  }
  #bubble.show { opacity: 1; transform: translateX(-50%) scale(1); }
  #bubble::after {
    content: '';
    position: absolute;
    bottom: -12px; left: 50%; margin-left: -7px;
    border: 7px solid transparent;
    border-top-color: #8a6d3b;
  }
  #bubble::before {
    content: '';
    position: absolute;
    bottom: -8px; left: 50%; margin-left: -5px;
    border: 5px solid transparent;
    border-top-color: #f7ecd0;
    z-index: 1;
  }
  #status {
    margin-top: 2px;
    font-size: 12px;
    color: var(--vscode-descriptionForeground, #999);
    height: 1.4em;
  }
  #status .dots::after {
    content: '';
    animation: dots 1.5s steps(4, end) infinite;
  }
  @keyframes dots {
    0% { content: ''; }
    25% { content: '.'; }
    50% { content: '..'; }
    75% { content: '...'; }
  }
  #controls {
    position: absolute; top: 6px; right: 6px; z-index: 5;
    display: flex; flex-direction: column; gap: 4px;
    opacity: 0; transition: opacity .2s;
  }
  #frame:hover #controls { opacity: 1; }
  #controls button {
    background: rgba(0,0,0,.45);
    border: none; border-radius: 6px;
    color: #fff; font-size: 14px;
    width: 28px; height: 28px;
    cursor: pointer;
  }
  #controls button.off { opacity: .45; }
  #empty {
    color: var(--vscode-descriptionForeground, #999);
    font-size: 13px; text-align: center; padding: 12px;
    display: none;
  }
</style>
</head>
<body>
  <div id="frame">
    <div id="controls">
      <button id="mute" title="Звук вкл/выкл">🔊</button>
      <button id="subs" title="Облачко вкл/выкл">💬</button>
    </div>
    <div id="bubble"></div>
    <img id="portrait" alt="">
    <video id="clip" muted playsinline></video>
  </div>
  <div id="status"></div>
  <div id="empty">Нет ассетов — закинь файлы в ~/.claude/w-claude-slave/assets</div>

<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  const portraitEl = document.getElementById('portrait');
  const clipEl = document.getElementById('clip');
  const frameEl = document.getElementById('frame');
  const bubbleEl = document.getElementById('bubble');
  const statusEl = document.getElementById('status');
  const muteBtn = document.getElementById('mute');
  const subsBtn = document.getElementById('subs');
  const emptyEl = document.getElementById('empty');

  let state = { portrait: null, muted: false, subtitles: true, reactionMs: 6000, working: false };
  let subtitleTimer = null;
  let returnTimer = null;

  function syncButtons() {
    muteBtn.textContent = state.muted ? '🔇' : '🔊';
    muteBtn.classList.toggle('off', state.muted);
    subsBtn.classList.toggle('off', !state.subtitles);
  }

  function show(el) {
    portraitEl.classList.remove('visible');
    clipEl.classList.remove('visible');
    el.classList.add('visible');
  }

  function updateStatus() {
    frameEl.classList.toggle('working', state.working);
    statusEl.innerHTML = state.working ? '⚒ работает<span class="dots"></span>' : '';
  }

  // перезапуск GIF: добавляем метку времени, чтобы <img> точно перегрузил кадр 0
  function bust(url) {
    return url + (url.indexOf('?') >= 0 ? '&' : '?') + '_t=' + Date.now();
  }

  function showStatic() {
    clearTimeout(returnTimer);
    clipEl.pause();
    if (state.portrait) portraitEl.src = state.portrait;
    show(portraitEl);
    updateStatus();
  }

  // проиграть анимацию-реакцию; если не «работаем» — вернуться к портрету по таймеру
  function playAnimation(src) {
    clearTimeout(returnTimer);
    if (/\\.(webm|mp4)$/i.test(src)) {
      // на случай, если пользователь всё же положит видео и оно заведётся
      clipEl.loop = state.working;
      clipEl.src = src;
      show(clipEl);
      clipEl.play().catch(() => {});
    } else {
      clipEl.pause();
      portraitEl.src = bust(src);
      show(portraitEl);
    }
    updateStatus();
    // говорящая анимация живёт максимум reactionMs как страховка;
    // обычно её раньше прервёт 'quiet' (звук договорил) — поэтому,
    // пока орк «работает», гиф не крутится бесконечно, только на самой фразе
    returnTimer = setTimeout(showStatic, state.reactionMs);
  }

  function setSubtitle(text) {
    clearTimeout(subtitleTimer);
    if (!state.subtitles) text = '';
    bubbleEl.textContent = text || '';
    bubbleEl.classList.toggle('show', !!text);
    if (text) subtitleTimer = setTimeout(() => bubbleEl.classList.remove('show'), 4500);
  }

  frameEl.addEventListener('click', () => vscode.postMessage({ type: 'poke' }));
  frameEl.addEventListener('dblclick', () => vscode.postMessage({ type: 'reset' }));

  muteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    state.muted = !state.muted;
    syncButtons();
    vscode.postMessage({ type: 'mute', muted: state.muted });
  });

  subsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    state.subtitles = !state.subtitles;
    syncButtons();
    if (!state.subtitles) setSubtitle('');
    vscode.postMessage({ type: 'subs', on: state.subtitles });
  });

  window.addEventListener('message', (e) => {
    const msg = e.data;
    if (msg.type === 'init') {
      state.portrait = msg.portrait;
      state.muted = msg.muted;
      state.subtitles = msg.subtitles !== false;
      if (msg.reactionMs) state.reactionMs = msg.reactionMs;
      state.working = msg.working;
      syncButtons();
      emptyEl.style.display = msg.portrait ? 'none' : 'block';
      showStatic();
    } else if (msg.type === 'play') {
      state.working = msg.working;
      if (msg.reactionMs) state.reactionMs = msg.reactionMs;
      setSubtitle(msg.subtitle);
      if (msg.src) playAnimation(msg.src);
      else if (!state.working) showStatic();
      else updateStatus();
    } else if (msg.type === 'state') {
      // смена статуса «работает» — только покачивание и подпись,
      // говорящую анимацию не трогаем (ей заведует play/quiet)
      state.working = msg.working;
      updateStatus();
    } else if (msg.type === 'quiet') {
      // фраза договорена — прекратить говорящую анимацию, вернуть портрет
      // (updateStatus внутри сохранит покачивание, если орк ещё «работает»)
      showStatic();
    }
  });

  clipEl.addEventListener('ended', () => { if (!state.working) showStatic(); });

  vscode.postMessage({ type: 'ready' });
</script>
</body>
</html>`;
}

module.exports = { activate, deactivate, getHtml };
