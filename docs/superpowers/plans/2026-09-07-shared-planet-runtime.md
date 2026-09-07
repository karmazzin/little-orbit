# Shared Planet Runtime Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development for independent extraction/review and execute coupled integration sequentially. Track completion here.

**Goal:** Обе планеты используют общую основу без изменения поведения.

**Architecture:** `src/runtime/` хранит ввод, камеру, кадр, настройку графики и аудио. `src/worlds/khvoya/` и `src/worlds/amber/` хранят подключение контента, местные обновления и сохранения. Тонкие прежние точки входа сохраняют существующие пути загрузки; переходы остаются перезагрузкой страницы.

**Tech Stack:** TypeScript, Three.js, Vite, node:test; браузерная QA через Playwright вне зависимостей игры.

**Spec:** `docs/architecture.md` и согласованное `docs/superpowers/drafts/2026-09-07-shared-planet-runtime.md`.

## Global Constraints

- Текущий незакоммиченный Янтарь входит в исходную точку.
- Не менять геометрию, тексты, коэффициенты управления, сюжет, ключи/форматы сохранений и переходы.
- Существующие различия планет сохраняются через параметры или местные callbacks.
- Не добавлять универсальную ECS, новый движок, бесшовную загрузку или новые зависимости игры.

## 1. Контрольная точка и QA

- [x] Копия всех 169 файлов рабочего дерева, SHA256 manifest и binary diff: `/private/tmp/little-orbit-before-shared-runtime-20260907`.
- [x] Отдельная ветка `codex/shared-planet-runtime`; исходное рабочее дерево сохранено.
- [x] Исходные 187 тестов прошли, production build прошёл (существующее предупреждение о размере three chunk).
- [x] Воспроизводимые проверки обоих миров в изолированном браузере против копии и результата.

## 2. Общая настройка

Files: новые `src/runtime/audio.ts`, `src/runtime/renderer.ts`, изменения обоих запусков.

- [x] Выделить `setupGameAudio(baseUrl)` с живыми getters `soundChosen`/`audioOn`, существующими `music`, `worldAudio`, `toggleSound`, `renderMusicTransition`. Оставить Soundscape Хвои и шаги Янтаря в местных модулях.
- [x] Выделить `createGameRenderer(canvas, initialPixelRatio?)`, `resizeGameView(renderer,camera)` и `applyRenderQuality(renderer,sun,stats,quality)`; не менять моменты выбора качества.
- [x] Проверить tsc и аудио/графические тесты, затем браузерную интеграцию.

## 3. Состояние, ввод и камера

Files: новые `src/runtime/session.ts`, `src/runtime/controls.ts`, `src/runtime/camera.ts`, `tests/runtime.test.ts`.

- [x] Ввести общее состояние `createSessionState()` для started/overview, distance/elevation, keys и очередей, drag/softMouse/trackingPlanet. Состояние конкретного player получать callback, поскольку reset заменяет объект.
- [x] Добавить тесты ограничения камеры поверх рельефа и воды, очередей разовых команд и объединения клавиш с joystick до переноса алгоритмов.
- [x] `createGameControls({session,canvas,camera,player,planetOrbit,radius,touchMode,isPaused,toast,actions,onVisibilityReset,cameraLook})` с однократным `bind()` объединяет обработчики мыши, клавиатуры, touch и захвата; `actions` предоставляет местные игровые команды. Escape Хвои и Янтаря сохраняет различия callback-ом.
- [x] `updateGameCamera({session,camera,player,sample,planetOrbit,dt,welcomeRotation,trackedPosition}, cameraLook)` использует прежние коэффициенты; формулу вращения стартового меню вычисляет мир.
- [x] Оба запуска используют модуль; местные особые состояния костра/подъёма сохраняются.

## 4. Каркас кадра

Files: новый `src/runtime/loop.ts`, tests/runtime.test.ts, оба запуска.

- [x] Тесты первого кадра, dt clamp, скрытой вкладки, фиксированного шага и остановки в середине шага.
- [x] `FrameClock.next(ms,hidden)` возвращает frameMs/dt/previousDelta или null; reset сбрасывает last.
- [x] `FixedStepper.advance(dt,paused,step,canStep?)` сохраняет накопитель и шаг 1/60; reset при паузе/visibility.
- [x] Подключить оба мира без перестановки их событий. Хвоя сохраняет проверку паузы внутри цикла; Янтарь — прежний цикл. Местная симуляция жителей/контента остаётся в мире.

## 5. Изоляция миров и приёмка

- [x] Переместить планетную сборку из двух main в `src/worlds/khvoya/game.ts`, `src/worlds/amber/game.ts`; оставить тонкие main для совместимости. Янтарные sky/world поместить в amber с совместимыми re-export для текущих потребителей.
- [x] Общие системы не импортируют планетную сборку и не ветвятся по имени планеты.
- [x] Проверить весь набор тестов, сборку, сценарии обеих планет и сравнение baseline; провести независимый обзор diff относительно контрольной копии.
- [x] Обновить архитектурную документацию фактическими границами, отметить оставшийся местный код и точные ограничения QA.

## Решения при исполнении

Работа выполняется в текущем каталоге в отдельной ветке с полной контрольной копией: это сохраняет доступ пользователя к незакоммиченному Янтарю и текущему серверу. Новые файлы включены в копию. Автоматического коммита исходных пользовательских изменений нет.

Аудио выделяется независимым агентом только в новый файл; другой агент пишет браузерную QA против неизменяемой копии. Перенос запуска, управления и цикла выполняется последовательно одним исполнителем, чтобы не было конфликтов общих файлов.

## Результаты и уточнения

Основной перенос завершён; сценарии мира находятся в `worlds/`, а совместимые корневые re-export сохранены. Для сохранения поведения используются локальные callbacks обновлений, а не универсальная схема всех механик. Обработчики и аудио имеют срок жизни страницы; бесшовные переходы не добавлялись. Остаточные старые зависимости перечислены в `docs/architecture.md`.

Подробная проверка: `2026-09-07-shared-planet-runtime-verification.md`.
