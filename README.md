# W_Claude_Slave for Claude Code

Раб (Slave) из Warcraft III живёт в панели VS Code и реагирует на работу Claude Code: проговаривает фирменные фразы, когда ты отправляешь команду и когда задача выполнена, огрызается, если по нему кликнуть.

> A Warcraft III worker lives in a VS Code panel and reacts to Claude Code: he speaks his signature lines when you send a command and when the task is done, and grumbles when clicked.

---

## ⚠️ Дисклеймер / Disclaimer

**RU:** Некоммерческий фан-проект для личного использования, ничего не продаётся. Голосовые реплики, портрет и анимация принадлежат их правообладателям и **НЕ входят** в репозиторий — код и ассеты разделены намеренно. Чтобы услышать звук, подставь свои файлы (см. [Ассеты](#ассеты)).

**EN:** Non-commercial fan project for personal use; nothing is sold. The voice lines, portrait and animation belong to their respective owners and are **NOT included** in this repository — code and assets are kept separate. To hear sound, supply your own files (see [Assets](#ассеты)).

The MIT license in [LICENSE](LICENSE) covers **only the source code**, not the game assets.

---

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

## Установка

Требуется Windows + VS Code + Claude Code.

### Самый простой путь (со звуком)

1. Скачай бандл со звуком: **[slave-full-bundle.zip (Google Drive)](https://drive.google.com/file/d/18Aq01QdY99UCpDgkmQ3KBLcgs0uVeUNl/view?usp=drive_link)** — там код + установщик + ассеты.
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

Здесь ассеты не входят — подставь свои (см. [Ассеты](#ассеты)).

`setup.ps1` идемпотентен (можно запускать повторно) и:
1. ставит расширение в `%USERPROFILE%\.vscode\extensions`
2. создаёт «дом» `%USERPROFILE%\.claude\w-claude-slave` (`events.jsonl`, `slave-event.cmd`, `assets\`)
3. дописывает хуки в `%USERPROFILE%\.claude\settings.json`, не трогая твои существующие

Потом перезапусти VS Code (или `Developer: Reload Window`). Панель **«W_Claude_Slave»** появится внизу рядом с терминалом; её можно перетащить куда удобно.

Альтернатива — поставить `.vsix` из [Releases](../../releases) вручную (`code --install-extension w-claude-slave-0.1.0.vsix`), затем всё равно запустить `setup.ps1` для дома и хуков.

### Вручную, без скрипта

Если не хочешь запускать `.ps1` — можно сделать всё руками. `setup.ps1` просто автоматизирует эти же 4 шага. Ниже `<ПРОФИЛЬ>` = твой профиль, напр. `C:\Users\Ivan`.

**1. Поставь расширение.** В VS Code: вкладка **Extensions** → кнопка «**…**» вверху → **Install from VSIX…** → выбери `w-claude-slave-0.1.0.vsix` (из [Releases](../../releases) или из бандла).

**2. Положи ассеты.** Создай папку `<ПРОФИЛЬ>\.claude\w-claude-slave\assets\` и внутри — папки `command`, `done`, `permission`, `annoyed`, `idle`. Разложи туда свои `.wav`/`.gif`/`.png` (см. [Ассеты](#ассеты)). Из бандла — просто скопируй готовую папку `assets`.

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

- Хуки Claude Code глобальные — раб реагирует на все твои сессии Claude Code.
- Диагностика: панель **OUTPUT → канал «W_Claude_Slave»** — там видно каждое событие и запуск плеера.

## Credits

Игровые ассеты принадлежат их правообладателям. Код расширения — MIT, см. [LICENSE](LICENSE).
