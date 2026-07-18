# W_Claude_Slave for Claude Code

A Warcraft grunt lives in your VS Code panel and reacts to Claude Code: he speaks his signature lines when you send a command and when the task is done, and grumbles when clicked.

🇷🇺 [Русский](#-русский) · 🇬🇧 [English](#-english)

---

## ⚠️ Дисклеймер / Disclaimer

**RU:** Некоммерческий фан-проект для личного использования, ничего не продаётся. Голосовые реплики, портрет и анимация принадлежат их правообладателям и **НЕ входят** в репозиторий — код и ассеты разделены намеренно. Чтобы услышать звук, подставь свои файлы (см. раздел «Ассеты»).

**EN:** Non-commercial fan project for personal use; nothing is sold. The voice lines, portrait and animation belong to their respective owners and are **NOT included** in this repository — code and assets are kept separate. To hear sound, supply your own files (see the "Assets" section).

The MIT license in [LICENSE](LICENSE) covers **only the source code**, not the game assets.

---

# 🇷🇺 Русский

Раб из Warcraft III живёт в панели VS Code и реагирует на работу Claude Code: проговаривает фирменные фразы, когда ты отправляешь команду и когда задача выполнена, огрызается, если по нему кликнуть.

## Что он делает

- **Отправил команду** Claude Code → раб проговаривает фразу («Готов вкалывать», «Сделаю», «Угу»…) + облачко с текстом
- **Пока Claude думает** → спокойный портрет с лёгким покачиванием и «⚒ работает»
- **Задача выполнена** → «Работа закончена!»
- **Нужно твоё внимание** (запрос прав) → молча показывает облачко, без звука
- **Клик по нему** → огрызается («Не мешай, я занят», «Нет времени»…)

Говорящая анимация играет **только пока звучит фраза** — договорил, вернулся к портрету.

При наведении — кнопки 🔊 (звук) и 💬 (облачко), обе запоминаются в настройках.

## Как это работает

```
Claude Code ──hook──> ~/.claude/w-claude-slave/slave-event.cmd ──append──> events.jsonl
                                                                       │
VS Code extension (w-claude-slave) ──watches the file────────────────┘
        ├─ показывает анимацию/портрет в webview-панели «W_Claude_Slave»
        └─ играет .wav через PowerShell SoundPlayer (звук идёт, даже если панель скрыта)
```

Хуки Claude Code (`UserPromptSubmit`, `Stop`, `Notification`, `SessionEnd`) дописывают событие в `events.jsonl`, расширение следит за файлом и реагирует. Хуки добавляются рядом с уже существующими — ничего не ломается.

Звук играет **только когда Claude Code работает в VS Code** — из десктоп-приложения Claude раб молчит.

## Установка

Требуется Windows + VS Code + Claude Code.

### Самый простой путь (со звуком)

1. Скачай бандл со звуком: **[w-claude-slave-full-bundle.zip (Google Drive)](https://drive.google.com/file/d/18Aq01QdY99UCpDgkmQ3KBLcgs0uVeUNl/view?usp=drive_link)** — там код + установщик + ассеты.
2. Распакуй куда угодно, зайди в папку.
3. В терминале: `powershell -ExecutionPolicy Bypass -File setup.ps1`
4. Перезапусти VS Code (или `Developer: Reload Window`).

> Бандл содержит игровые ассеты (озвучка, портрет) — только для личного некоммерческого использования, см. дисклеймер. В самом репозитории этих ассетов нет.

### Из исходников (без ассетов)

```powershell
git clone https://github.com/ParkerShot/W_Claude_Slave.git
cd W_Claude_Slave
powershell -ExecutionPolicy Bypass -File setup.ps1
```

Здесь ассеты не входят — подставь свои (см. «Ассеты»).

`setup.ps1` идемпотентен (можно запускать повторно) и:
1. ставит расширение в `%USERPROFILE%\.vscode\extensions`
2. создаёт «дом» `%USERPROFILE%\.claude\w-claude-slave` (`events.jsonl`, `slave-event.cmd`, `assets\`)
3. дописывает хуки в `%USERPROFILE%\.claude\settings.json`, не трогая твои существующие

Потом перезапусти VS Code (или `Developer: Reload Window`). Панель **«W_Claude_Slave»** появится внизу рядом с терминалом; её можно перетащить куда удобно.

Альтернатива — поставить `.vsix` из [Releases](../../releases) вручную (`code --install-extension w-claude-slave-0.1.0.vsix`), затем всё равно запустить `setup.ps1` для дома и хуков.

### Вручную, без скрипта

Если не хочешь запускать `.ps1` — можно сделать всё руками. `setup.ps1` просто автоматизирует эти же 4 шага. Ниже `<ПРОФИЛЬ>` = твой профиль, напр. `C:\Users\Ivan`.

**1. Поставь расширение.** В VS Code: вкладка **Extensions** → кнопка «**…**» вверху → **Install from VSIX…** → выбери `w-claude-slave-0.1.0.vsix` (из [Releases](../../releases) или из бандла).

**2. Положи ассеты.** Создай папку `<ПРОФИЛЬ>\.claude\w-claude-slave\assets\` и внутри — папки `command`, `done`, `permission`, `annoyed`, `idle`. Разложи туда свои `.wav`/`.gif`/`.png` (см. «Ассеты»). Из бандла — просто скопируй готовую папку `assets`.

**3. Создай писалку событий.** Файл `<ПРОФИЛЬ>\.claude\w-claude-slave\slave-event.cmd` с содержимым:

```bat
@echo off
if /I "%CLAUDE_CODE_ENTRYPOINT%"=="claude-desktop" exit /b 0
echo {"event":"%~1"}>>"%~dp0events.jsonl"
```

(вторая строка = озвучивать только из VS Code, а не из десктоп-приложения Claude)

**4. Пропиши хуки.** Открой `<ПРОФИЛЬ>\.claude\settings.json` и добавь эти 4 хука в объект `"hooks"` (если файла/объекта нет — создай; если хуки уже есть — просто допиши эти рядом). Путь в `args` замени на свой полный:

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

**5.** Перезапусти VS Code (`Developer: Reload Window`).

> JSON чувствителен к запятым — лишняя/пропущенная сломает файл. Если не уверен — проще `setup.ps1`.

## Ассеты

Игровые ассеты в комплект репозитория не входят (см. дисклеймер). Положи свои файлы в `%USERPROFILE%\.claude\w-claude-slave\assets\<папка>`:

| Папка | Когда играет | Форматы |
|---|---|---|
| `command/` | отправил команду | `.wav` (звук) + `.gif` (анимация) |
| `done/` | задача выполнена | то же |
| `permission/` | нужно внимание (без звука) | `.wav` для облачка + `.gif` |
| `annoyed/` | клик по рабу | то же |
| `idle/` | портрет в простое | `.png/.jpg` |

- Файл выбирается случайно из папки; пустая папка → берётся из `command/`.
- **Текст в облачке = имя wav-файла** (`Готов вкалывать.wav` → «Готов вкалывать»). Для знаков, запрещённых в именах файлов (`?`, `:`), заведи `assets\soundmap.json`: `{ "Чего.wav": "Чего?" }`.
- Дубли различай числовым суффиксом: `Угу 2.wav` покажет «Угу».
- **Звук — только `.wav`** (PowerShell SoundPlayer). Конвертация: `ffmpeg -i in.mp3 out.wav`.
- Чтобы первая фраза после запуска не обрезалась холодным стартом аудио — в начало каждого wav добавь ~300 мс тишины: `ffmpeg -i in.wav -af "adelay=300:all=1" out.wav`. Плюс расширение при старте проигрывает беззвучный `assets\primer.wav` для прогрева.
- Гиф — зациклённая говорящая анимация (рендерится в `<img>`, надёжнее видео в webview).

После добавления файлов — `Developer: Reload Window`.

## Настройки (VS Code Settings)

| Настройка | По умолчанию | Что делает |
|---|---|---|
| `wClaudeSlave.muted` | `false` | выключить звук |
| `wClaudeSlave.subtitles` | `true` | показывать облачко с текстом |
| `wClaudeSlave.reactionSeconds` | `6` | макс. длина говорящей анимации (страховка, обычно обрывается по концу звука) |
| `wClaudeSlave.workingTimeoutMinutes` | `20` | через сколько сбросить «работает», если `Stop` не пришёл |
| `wClaudeSlave.idleGrumble` | `false` | изредка бурчать в простое |
| `wClaudeSlave.slaveHome` | `""` | своя папка вместо `~/.claude/w-claude-slave` |

Двойной клик — мгновенный сброс состояния «работает».

## Заметки

- Хуки Claude Code глобальные — раб реагирует на все твои сессии Claude Code в VS Code.
- Диагностика: панель **OUTPUT → канал «W_Claude_Slave»** — там видно каждое событие и запуск плеера.

## Credits

Игровые ассеты принадлежат их правообладателям. Код расширения — MIT, см. [LICENSE](LICENSE).

---

# 🇬🇧 English

A Warcraft III worker lives in a VS Code panel and reacts to Claude Code: he speaks his signature lines when you send a command and when the task is done, and grumbles when clicked.

## What it does

- **Sent a command** to Claude Code → the slave speaks a line ("Ready to work!", "Will do", "Yep"…) + a speech bubble
- **While Claude is thinking** → a calm portrait with a light bob and "⚒ working"
- **Task done** → "Job's done!"
- **Needs your attention** (permission prompt) → silently shows a speech bubble, no sound
- **Click him** → grumbles ("Kinda busy", "No time"…)

The talking animation plays **only while the line is being spoken** — once it's done, he returns to the portrait.

Hover to reveal 🔊 (mute) and 💬 (subtitles) buttons; both persist in settings.

## How it works

```
Claude Code ──hook──> ~/.claude/w-claude-slave/slave-event.cmd ──append──> events.jsonl
                                                                       │
VS Code extension (w-claude-slave) ──watches the file────────────────┘
        ├─ shows the animation/portrait in the "W_Claude_Slave" webview panel
        └─ plays .wav via PowerShell SoundPlayer (works even with the panel hidden)
```

Claude Code hooks (`UserPromptSubmit`, `Stop`, `Notification`, `SessionEnd`) append an event to `events.jsonl`; the extension watches the file and reacts. Hooks are added alongside any existing ones — nothing gets overwritten.

Sound only plays **while Claude Code runs inside VS Code** — the slave stays quiet when Claude Code runs in the Claude desktop app.

## Installation

Requires Windows + VS Code + Claude Code.

### Easiest path (with sound)

1. Download the sound bundle: **[w-claude-slave-full-bundle.zip (Google Drive)](https://drive.google.com/file/d/18Aq01QdY99UCpDgkmQ3KBLcgs0uVeUNl/view?usp=drive_link)** — code + installer + assets.
2. Unzip anywhere, `cd` into the folder.
3. In a terminal: `powershell -ExecutionPolicy Bypass -File setup.ps1`
4. Restart VS Code (or `Developer: Reload Window`).

> The bundle contains game assets (voice lines, portrait) for personal, non-commercial use only — see the disclaimer. The repository itself does not contain these assets.

### From source (no assets)

```powershell
git clone https://github.com/ParkerShot/W_Claude_Slave.git
cd W_Claude_Slave
powershell -ExecutionPolicy Bypass -File setup.ps1
```

No assets included here — supply your own (see "Assets").

`setup.ps1` is idempotent (safe to re-run) and:
1. installs the extension into `%USERPROFILE%\.vscode\extensions`
2. creates the home folder `%USERPROFILE%\.claude\w-claude-slave` (`events.jsonl`, `slave-event.cmd`, `assets\`)
3. appends hooks to `%USERPROFILE%\.claude\settings.json` without touching your existing ones

Then restart VS Code (or `Developer: Reload Window`). The **"W_Claude_Slave"** panel shows up at the bottom next to the terminal; drag it wherever's convenient.

Alternative — install the `.vsix` from [Releases](../../releases) manually (`code --install-extension w-claude-slave-0.1.0.vsix`), then still run `setup.ps1` for the home folder and hooks.

### Manual, no script

If you'd rather not run a `.ps1` — you can do it all by hand. `setup.ps1` just automates these same 4 steps. `<PROFILE>` below = your user profile, e.g. `C:\Users\Ivan`.

**1. Install the extension.** In VS Code: **Extensions** tab → the "**…**" button → **Install from VSIX…** → pick `w-claude-slave-0.1.0.vsix` (from [Releases](../../releases) or the bundle).

**2. Drop in assets.** Create `<PROFILE>\.claude\w-claude-slave\assets\` with subfolders `command`, `done`, `permission`, `annoyed`, `idle`. Put your own `.wav`/`.gif`/`.png` files there (see "Assets"). From the bundle — just copy the ready-made `assets` folder.

**3. Create the event writer.** File `<PROFILE>\.claude\w-claude-slave\slave-event.cmd`:

```bat
@echo off
if /I "%CLAUDE_CODE_ENTRYPOINT%"=="claude-desktop" exit /b 0
echo {"event":"%~1"}>>"%~dp0events.jsonl"
```

(line 2 = only speak from VS Code, not from the Claude desktop app)

**4. Register the hooks.** Open `<PROFILE>\.claude\settings.json` and add these 4 hooks to the `"hooks"` object (create the file/object if missing; if hooks already exist, just add these alongside). Replace the path in `args` with your own:

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

**5.** Restart VS Code (`Developer: Reload Window`).

> JSON is picky about commas — a missing or extra one breaks the file. If unsure, `setup.ps1` is easier.

## Assets

Game assets are not part of the repository (see disclaimer). Drop your own files into `%USERPROFILE%\.claude\w-claude-slave\assets\<folder>`:

| Folder | When it plays | Formats |
|---|---|---|
| `command/` | you sent a command | `.wav` (sound) + `.gif` (animation) |
| `done/` | task finished | same |
| `permission/` | needs attention (silent) | `.wav` for the bubble text + `.gif` |
| `annoyed/` | clicked on the slave | same |
| `idle/` | idle portrait | `.png`/`.jpg` |

- A file is picked at random from the folder; an empty folder falls back to `command/`.
- **Bubble text = the wav filename** (`Ready to work.wav` → "Ready to work"). For characters not allowed in filenames (`?`, `:`), add `assets\soundmap.json`: `{ "What.wav": "What?" }`.
- Distinguish duplicates with a numeric suffix: `Yep 2.wav` shows as "Yep".
- **Sound is `.wav` only** (PowerShell SoundPlayer). Convert with `ffmpeg -i in.mp3 out.wav`.
- To stop the very first line after launch from getting clipped by audio cold-start, add ~300ms of silence to the start of each wav: `ffmpeg -i in.wav -af "adelay=300:all=1" out.wav`. The extension also plays a silent `assets\primer.wav` on activation to warm up the audio stack.
- GIF is the looping talking animation (rendered in an `<img>`, more reliable than video inside a webview).

After adding files — `Developer: Reload Window`.

## Settings (VS Code Settings)

| Setting | Default | What it does |
|---|---|---|
| `wClaudeSlave.muted` | `false` | mute sound |
| `wClaudeSlave.subtitles` | `true` | show the speech bubble |
| `wClaudeSlave.reactionSeconds` | `6` | max length of the talking animation (a safety net, usually cut short by the sound ending) |
| `wClaudeSlave.workingTimeoutMinutes` | `20` | resets the "working" state after this many minutes if `Stop` never arrives |
| `wClaudeSlave.idleGrumble` | `false` | occasionally grumble while idle |
| `wClaudeSlave.slaveHome` | `""` | custom folder instead of `~/.claude/w-claude-slave` |

Double-click resets the "working" state instantly.

## Notes

- Claude Code hooks are global — the slave reacts to every Claude Code session running in VS Code.
- Diagnostics: **OUTPUT panel → "W_Claude_Slave" channel** — shows every event and player invocation.

## Credits

Game assets belong to their respective owners. Extension code is MIT, see [LICENSE](LICENSE).
