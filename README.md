# W_Claude_Slave

[RU](#w_claude_slave--раб-для-claude-code) · [EN](#w_claude_slave--a-grunt-for-claude-code)

`v0.1.0`

---

## W_Claude_Slave — раб для Claude Code

Раб из Warcraft III живёт в панели VS Code и реагирует на работу Claude Code: проговаривает фирменные фразы, когда ты отправляешь команду и когда задача выполнена, огрызается, если по нему кликнуть.

> Некоммерческий фан-проект для личного использования, ничего не продаётся. Голосовые реплики, портрет и анимация принадлежат их правообладателям и **не входят** в репозиторий — код и ассеты разделены намеренно. MIT-лицензия (см. [LICENSE](LICENSE)) покрывает только исходный код.

### Что он делает

- **Отправил команду** Claude Code → раб проговаривает фразу («Готов вкалывать», «Сделаю», «Угу»…) + облачко с текстом
- **Пока Claude думает** → спокойный портрет с лёгким покачиванием и «⚒ работает»
- **Задача выполнена** → «Работа закончена!»
- **Нужно твоё внимание** (запрос прав) → молча показывает облачко, без звука
- **Клик по нему** → огрызается («Не мешай, я занят», «Нет времени»…)

Говорящая анимация играет только пока звучит фраза — договорил, вернулся к портрету. При наведении — кнопки 🔊 (звук) и 💬 (облачко), обе запоминаются в настройках.

### Как это работает

```
Claude Code ──hook──> ~/.claude/w-claude-slave/slave-event.cmd ──append──> events.jsonl
                                                                       │
VS Code extension (w-claude-slave) ──watches the file────────────────┘
        ├─ показывает анимацию/портрет в webview-панели «W_Claude_Slave»
        └─ играет .wav через PowerShell SoundPlayer (звук идёт, даже если панель скрыта)
```

Хуки Claude Code (`UserPromptSubmit`, `Stop`, `Notification`, `SessionEnd`) дописывают событие в `events.jsonl`, расширение следит за файлом и реагирует. Хуки добавляются рядом с уже существующими — ничего не ломается. Звук играет только когда Claude Code работает в VS Code.

### Установка

Требуется Windows + VS Code + Claude Code.

**Самый простой путь (со звуком)**

1. Скачай бандл: [w-claude-slave-full-bundle.zip (Google Drive)](https://drive.google.com/file/d/18Aq01QdY99UCpDgkmQ3KBLcgs0uVeUNl/view?usp=drive_link) — код + установщик + ассеты.
2. Распакуй, зайди в папку.
3. `powershell -ExecutionPolicy Bypass -File setup.ps1`
4. Перезапусти VS Code (`Developer: Reload Window`).

**Из исходников (без ассетов)**

```
git clone https://github.com/ParkerShot/W_Claude_Slave.git
cd W_Claude_Slave
powershell -ExecutionPolicy Bypass -File setup.ps1
```

Ассеты сюда не входят — подставь свои (см. «Ассеты» ниже).

`setup.ps1` идемпотентен: ставит расширение в `%USERPROFILE%\.vscode\extensions`, создаёт «дом» `%USERPROFILE%\.claude\w-claude-slave`, дописывает 4 хука в `%USERPROFILE%\.claude\settings.json`, не трогая существующие.

Альтернатива — поставить `.vsix` из [Releases](../../releases) вручную (`Extensions` → «…» → `Install from VSIX…`), затем всё равно запустить `setup.ps1` для дома и хуков.

<details>
<summary><strong>Вручную, без скрипта</strong></summary>

`setup.ps1` просто автоматизирует эти же 4 шага. `<ПРОФИЛЬ>` = твой профиль, напр. `C:\Users\Ivan`.

1. **Расширение.** `Extensions` → «…» → `Install from VSIX…` → `w-claude-slave-0.1.0.vsix`.
2. **Ассеты.** Создай `<ПРОФИЛЬ>\.claude\w-claude-slave\assets\` с папками `command`, `done`, `permission`, `annoyed`, `idle`, разложи свои `.wav`/`.gif`/`.png`.
3. **Писалка событий.** Файл `<ПРОФИЛЬ>\.claude\w-claude-slave\slave-event.cmd`:
   ```bat
   @echo off
   if /I "%CLAUDE_CODE_ENTRYPOINT%"=="claude-desktop" exit /b 0
   echo {"event":"%~1"}>>"%~dp0events.jsonl"
   ```
4. **Хуки.** В `<ПРОФИЛЬ>\.claude\settings.json` добавь в объект `"hooks"`:
   ```json
   "UserPromptSubmit": [
     { "matcher": "", "hooks": [ { "type": "command", "command": "cmd.exe",
       "args": ["/c", "C:\\Users\\ИМЯ\\.claude\\w-claude-slave\\slave-event.cmd", "prompt"], "async": true, "timeout": 10 } ] }
   ],
   "Stop": [
     { "matcher": "", "hooks": [ { "type": "command", "command": "cmd.exe",
       "args": ["/c", "C:\\Users\\ИМЯ\\.claude\\w-claude-slave\\slave-event.cmd", "stop"], "async": true, "timeout": 10 } ] }
   ],
   "Notification": [
     { "matcher": "", "hooks": [ { "type": "command", "command": "cmd.exe",
       "args": ["/c", "C:\\Users\\ИМЯ\\.claude\\w-claude-slave\\slave-event.cmd", "notify"], "async": true, "timeout": 10 } ] }
   ],
   "SessionEnd": [
     { "matcher": "", "hooks": [ { "type": "command", "command": "cmd.exe",
       "args": ["/c", "C:\\Users\\ИМЯ\\.claude\\w-claude-slave\\slave-event.cmd", "end"], "async": true, "timeout": 10 } ] }
   ]
   ```
5. Перезапусти VS Code.

> JSON чувствителен к запятым. Если не уверен — проще `setup.ps1`.
</details>

### Ассеты

Игровые ассеты не входят в репозиторий. Положи свои файлы в `%USERPROFILE%\.claude\w-claude-slave\assets\<папка>`:

| Папка | Когда играет | Форматы |
|---|---|---|
| `command/` | отправил команду | `.wav` + `.gif` |
| `done/` | задача выполнена | то же |
| `permission/` | нужно внимание (без звука) | `.wav` + `.gif` |
| `annoyed/` | клик по рабу | то же |
| `idle/` | портрет в простое | `.png`/`.jpg` |

- Файл выбирается случайно; пустая папка → берётся из `command/`.
- Текст в облачке = имя wav-файла (`Готов вкалывать.wav` → «Готов вкалывать»). Знаки вроде `?` — через `assets\soundmap.json`: `{ "Чего.wav": "Чего?" }`.
- Дубли — числовым суффиксом: `Угу 2.wav` покажет «Угу».
- Звук — только `.wav` (`ffmpeg -i in.mp3 out.wav`).
- Первая фраза после запуска может обрезаться холодным стартом аудио — расширение прогревает звук `assets\primer.wav`, плюс добавь ~300 мс тишины в начало каждого wav (`ffmpeg -i in.wav -af "adelay=300:all=1" out.wav`).
- Гиф — зациклённая говорящая анимация.

После добавления файлов — `Developer: Reload Window`.

### Настройки

| Настройка | По умолчанию | Что делает |
|---|---|---|
| `wClaudeSlave.muted` | `false` | выключить звук |
| `wClaudeSlave.subtitles` | `true` | показывать облачко |
| `wClaudeSlave.reactionSeconds` | `6` | макс. длина говорящей анимации |
| `wClaudeSlave.workingTimeoutMinutes` | `20` | сброс «работает», если `Stop` не пришёл |
| `wClaudeSlave.idleGrumble` | `false` | изредка бурчать в простое |
| `wClaudeSlave.slaveHome` | `""` | своя папка вместо `~/.claude/w-claude-slave` |

Двойной клик по рабу — мгновенный сброс состояния «работает».

### Диагностика

Хуки Claude Code глобальные — раб реагирует на все сессии Claude Code в VS Code. Панель **OUTPUT → канал «W_Claude_Slave»** показывает каждое событие и запуск плеера.

### Лицензия

MIT — см. [LICENSE](LICENSE). Действует только на код, не на игровые ассеты.

---

## W_Claude_Slave — a grunt for Claude Code

A Warcraft III worker lives in a VS Code panel and reacts to Claude Code: he speaks his signature lines when you send a command and when the task is done, and grumbles when clicked.

> Non-commercial fan project for personal use; nothing is sold. The voice lines, portrait and animation belong to their respective owners and are **not included** in this repository — code and assets are kept separate. The MIT license (see [LICENSE](LICENSE)) covers the source code only.

### What it does

- **Sent a command** to Claude Code → the slave speaks a line ("Ready to work!", "Will do", "Yep"…) + a speech bubble
- **While Claude is thinking** → a calm portrait with a light bob and "⚒ working"
- **Task done** → "Job's done!"
- **Needs your attention** (permission prompt) → silently shows a speech bubble, no sound
- **Click him** → grumbles ("Kinda busy", "No time"…)

The talking animation plays only while the line is being spoken — then he returns to the portrait. Hover to reveal 🔊 (mute) and 💬 (subtitles) buttons; both persist in settings.

### How it works

```
Claude Code ──hook──> ~/.claude/w-claude-slave/slave-event.cmd ──append──> events.jsonl
                                                                       │
VS Code extension (w-claude-slave) ──watches the file────────────────┘
        ├─ shows the animation/portrait in the "W_Claude_Slave" webview panel
        └─ plays .wav via PowerShell SoundPlayer (works even with the panel hidden)
```

Claude Code hooks (`UserPromptSubmit`, `Stop`, `Notification`, `SessionEnd`) append an event to `events.jsonl`; the extension watches the file and reacts. Hooks are added alongside any existing ones — nothing gets overwritten. Sound only plays while Claude Code runs inside VS Code.

### Installation

Requires Windows + VS Code + Claude Code.

**Easiest path (with sound)**

1. Download the bundle: [w-claude-slave-full-bundle.zip (Google Drive)](https://drive.google.com/file/d/18Aq01QdY99UCpDgkmQ3KBLcgs0uVeUNl/view?usp=drive_link) — code + installer + assets.
2. Unzip, `cd` into the folder.
3. `powershell -ExecutionPolicy Bypass -File setup.ps1`
4. Restart VS Code (`Developer: Reload Window`).

**From source (no assets)**

```
git clone https://github.com/ParkerShot/W_Claude_Slave.git
cd W_Claude_Slave
powershell -ExecutionPolicy Bypass -File setup.ps1
```

No assets included here — supply your own (see "Assets" below).

`setup.ps1` is idempotent: installs the extension into `%USERPROFILE%\.vscode\extensions`, creates the home folder `%USERPROFILE%\.claude\w-claude-slave`, appends 4 hooks to `%USERPROFILE%\.claude\settings.json` without touching your existing ones.

Alternative — install the `.vsix` from [Releases](../../releases) manually (`Extensions` → "…" → `Install from VSIX…`), then still run `setup.ps1` for the home folder and hooks.

<details>
<summary><strong>Manual, no script</strong></summary>

`setup.ps1` just automates these same 4 steps. `<PROFILE>` = your user profile, e.g. `C:\Users\Ivan`.

1. **Extension.** `Extensions` → "…" → `Install from VSIX…` → `w-claude-slave-0.1.0.vsix`.
2. **Assets.** Create `<PROFILE>\.claude\w-claude-slave\assets\` with subfolders `command`, `done`, `permission`, `annoyed`, `idle`; drop your own `.wav`/`.gif`/`.png`.
3. **Event writer.** File `<PROFILE>\.claude\w-claude-slave\slave-event.cmd`:
   ```bat
   @echo off
   if /I "%CLAUDE_CODE_ENTRYPOINT%"=="claude-desktop" exit /b 0
   echo {"event":"%~1"}>>"%~dp0events.jsonl"
   ```
4. **Hooks.** In `<PROFILE>\.claude\settings.json` add to the `"hooks"` object:
   ```json
   "UserPromptSubmit": [
     { "matcher": "", "hooks": [ { "type": "command", "command": "cmd.exe",
       "args": ["/c", "C:\\Users\\NAME\\.claude\\w-claude-slave\\slave-event.cmd", "prompt"], "async": true, "timeout": 10 } ] }
   ],
   "Stop": [
     { "matcher": "", "hooks": [ { "type": "command", "command": "cmd.exe",
       "args": ["/c", "C:\\Users\\NAME\\.claude\\w-claude-slave\\slave-event.cmd", "stop"], "async": true, "timeout": 10 } ] }
   ],
   "Notification": [
     { "matcher": "", "hooks": [ { "type": "command", "command": "cmd.exe",
       "args": ["/c", "C:\\Users\\NAME\\.claude\\w-claude-slave\\slave-event.cmd", "notify"], "async": true, "timeout": 10 } ] }
   ],
   "SessionEnd": [
     { "matcher": "", "hooks": [ { "type": "command", "command": "cmd.exe",
       "args": ["/c", "C:\\Users\\NAME\\.claude\\w-claude-slave\\slave-event.cmd", "end"], "async": true, "timeout": 10 } ] }
   ]
   ```
5. Restart VS Code.

> JSON is picky about commas. If unsure, `setup.ps1` is easier.
</details>

### Assets

Game assets are not part of the repository. Drop your own files into `%USERPROFILE%\.claude\w-claude-slave\assets\<folder>`:

| Folder | When it plays | Formats |
|---|---|---|
| `command/` | you sent a command | `.wav` + `.gif` |
| `done/` | task finished | same |
| `permission/` | needs attention (silent) | `.wav` + `.gif` |
| `annoyed/` | clicked on the slave | same |
| `idle/` | idle portrait | `.png`/`.jpg` |

- A file is picked at random; an empty folder falls back to `command/`.
- Bubble text = the wav filename (`Ready to work.wav` → "Ready to work"). Characters like `?` — via `assets\soundmap.json`: `{ "What.wav": "What?" }`.
- Duplicates — a numeric suffix: `Yep 2.wav` shows as "Yep".
- Sound is `.wav` only (`ffmpeg -i in.mp3 out.wav`).
- The very first line after launch can get clipped by audio cold-start — the extension warms up with `assets\primer.wav`, plus add ~300ms of silence to the start of each wav (`ffmpeg -i in.wav -af "adelay=300:all=1" out.wav`).
- GIF is the looping talking animation.

After adding files — `Developer: Reload Window`.

### Settings

| Setting | Default | What it does |
|---|---|---|
| `wClaudeSlave.muted` | `false` | mute sound |
| `wClaudeSlave.subtitles` | `true` | show the speech bubble |
| `wClaudeSlave.reactionSeconds` | `6` | max length of the talking animation |
| `wClaudeSlave.workingTimeoutMinutes` | `20` | resets "working" if `Stop` never arrives |
| `wClaudeSlave.idleGrumble` | `false` | occasionally grumble while idle |
| `wClaudeSlave.slaveHome` | `""` | custom folder instead of `~/.claude/w-claude-slave` |

Double-click the slave to instantly reset the "working" state.

### Diagnostics

Claude Code hooks are global — the slave reacts to every Claude Code session running in VS Code. The **OUTPUT panel → "W_Claude_Slave" channel** shows every event and player invocation.

### License

MIT — see [LICENSE](LICENSE). Covers the code only, not game assets.
