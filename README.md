# Warcraft Slave for Claude Code

Раб (Slave) из Warcraft III живёт в панели VS Code и реагирует на работу Claude Code: проговаривает фирменные фразы, когда ты отправляешь команду и когда задача выполнена, огрызается, если по нему кликнуть.

> A Warcraft III worker lives in a VS Code panel and reacts to Claude Code: he speaks his signature lines when you send a command and when the task is done, and grumbles when clicked.

---

## ⚠️ Дисклеймер / Disclaimer

**RU:** Это некоммерческий фан-проект, никак не связанный с Blizzard Entertainment. Голосовые реплики, портрет и анимация — собственность **Blizzard Entertainment** (Warcraft III). Эти ассеты **НЕ входят** в репозиторий и здесь не распространяются — код и озвучка разделены намеренно. Чтобы услышать звук, подставь свои файлы (см. [Ассеты](#ассеты)). Проект ничего не продаёт и сделан для личного использования.

**EN:** This is a non-commercial fan project, not affiliated with or endorsed by Blizzard Entertainment. The voice lines, portrait and animation are the property of **Blizzard Entertainment** (Warcraft III). Those assets are **NOT included** in this repository and are not distributed here — code and audio are deliberately kept separate. To hear sound, supply your own files (see [Assets](#ассеты)). Nothing is sold; this is for personal use only.

The MIT license in [LICENSE](LICENSE) covers **only the source code**, not any Blizzard assets.

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
Claude Code ──hook──> ~/.claude/slave/slave-event.cmd ──append──> events.jsonl
                                                                       │
VS Code extension (warcraft-slave) ──watches the file────────────────┘
        ├─ показывает анимацию/портрет в webview-панели «Slave»
        └─ играет .wav через PowerShell SoundPlayer (звук идёт, даже если панель скрыта)
```

Хуки Claude Code (`UserPromptSubmit`, `Stop`, `Notification`, `SessionEnd`) дописывают событие в `events.jsonl`, расширение следит за файлом и реагирует. Хуки добавляются рядом с уже существующими — ничего не ломается.

## Установка

Требуется Windows + VS Code + Claude Code.

```powershell
git clone https://github.com/ParkerShot/vscode-warcraft-slave.git
cd vscode-warcraft-slave
powershell -ExecutionPolicy Bypass -File setup.ps1
```

`setup.ps1` идемпотентен (можно запускать повторно) и:
1. ставит расширение в `%USERPROFILE%\.vscode\extensions`
2. создаёт «дом» `%USERPROFILE%\.claude\slave` (`events.jsonl`, `slave-event.cmd`, `assets\`)
3. дописывает хуки в `%USERPROFILE%\.claude\settings.json`, не трогая твои существующие

Потом перезапусти VS Code (или `Developer: Reload Window`). Панель **«Slave»** появится внизу рядом с терминалом; её можно перетащить куда удобно.

Альтернатива — поставить `.vsix` из [Releases](../../releases) вручную (`code --install-extension warcraft-slave-0.1.0.vsix`), затем всё равно запустить `setup.ps1` для дома и хуков.

## Ассеты

Ассеты Blizzard в комплект не входят (см. дисклеймер). Положи свои файлы в `%USERPROFILE%\.claude\slave\assets\<папка>`:

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
| `warcraftSlave.muted` | `false` | выключить звук |
| `warcraftSlave.subtitles` | `true` | показывать облачко с текстом |
| `warcraftSlave.reactionSeconds` | `6` | макс. длина говорящей анимации (страховка, обычно обрывается по концу звука) |
| `warcraftSlave.workingTimeoutMinutes` | `20` | через сколько сбросить «работает», если `Stop` не пришёл |
| `warcraftSlave.idleGrumble` | `false` | изредка бурчать в простое |
| `warcraftSlave.slaveHome` | `""` | своя папка вместо `~/.claude/slave` |

Двойной клик — мгновенный сброс состояния «работает».

## Заметки

- Хуки Claude Code глобальные — раб реагирует на все твои сессии Claude Code.
- Диагностика: панель **OUTPUT → канал «Slave»** — там видно каждое событие и запуск плеера.

## Credits

Warcraft III и все связанные ассеты © Blizzard Entertainment. Код расширения — MIT, см. [LICENSE](LICENSE).
