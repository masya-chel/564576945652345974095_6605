# Инженерный калькулятор компонентов DC-DC регулятора Vishay SiC461

Профессиональный калькулятор для расчета всех компонентов синхронного понижающего регулятора Vishay SiC461 (входное напряжение 4.5В – 60В, выходное 0.8В – 0.92×Vin, ток нагрузки до 10А).

---

## Варианты запуска на локальной машине

Вы можете использовать проект в двух режимах:

---

### Вариант 1. Интерактивное веб-приложение (с векторной схемой, графиками и BOM)

Требуется установленный [Node.js](https://nodejs.org/) (версия 18 или новее).

1. Распакуйте архив в удобную папку.
2. Откройте терминал в этой папке и установите зависимости:
   ```bash
   npm install
   ```
3. Запустите локальный сервер разработки:
   ```bash
   npm run dev
   ```
4. В терминале появится ссылка (обычно `http://localhost:5173` или `http://localhost:3000`). Откройте её в браузере.
5. Для сборки готового статического продакшн-сайта выполните:
   ```bash
   npm run build
   ```
   Готовые файлы появятся в папке `dist/`, их можно загрузить на любой хостинг или локальный веб-сервер.

---

### Вариант 2. Автономный консольный скрипт Python (без Node.js и без сторонних библиотек)

В архиве уже находится готовый файл `sic461_calculator.py`. Он работает на чистом **Python 3.8+** и использует только стандартные библиотеки (`math`, `json`, `sys`).

1. **Запуск со стандартными параметрами:**
   ```bash
   python sic461_calculator.py
   ```
2. **Запуск с загрузкой параметров из вашего JSON файла:**
   ```bash
   python sic461_calculator.py sample_preset_24v_5v_10a.json
   ```
3. **Запуск с сохранением рассчитанных результатов в JSON:**
   ```bash
   python sic461_calculator.py sample_preset_24v_5v_10a.json --export result.json
   ```

---

## Формат файла конфигурации (JSON)

Вы можете редактировать параметры прямо в JSON файле. Поддерживаются флаги способа задания (`inputModes`) и значения компонентов (`inputComponents`):

```json
{
  "inputModes": {
    "voutInputMode": "voltage",      // "voltage" (по числу Вольт) или "resistors" (по резисторам RFB1/RFB2)
    "softStartInputMode": "time",     // "time" (по времени Tss в мс) или "capacitor" (по емкости CSS в нФ)
    "uvloInputMode": "voltage"        // "voltage" (по напряжению Vin_start) или "resistors" (по резисторам REN1/REN2)
  },
  "inputComponents": {
    "rfb1Kohm": 52.5,
    "rfb2Kohm": 10.0,
    "cssNf": 31.25,
    "ren1Kohm": 127.5,
    "ren2Kohm": 10.0
  },
  "inputs": {
    "vinNom": 24.0,
    "vinMin": 18.0,
    "vinMax": 32.0,
    "vout": 5.0,
    "ioutMax": 10.0,
    "fswKhz": 500,
    "kind": 0.3,
    "voutRippleMaxMv": 30,
    "loadStepA": 5.0,
    "voltageOvershootMv": 150,
    "tssMs": 5.0,
    "vinStartUvlo": 16.5
  }
}
```

---

## Состав архива

- `src/` — исходный код интерфейса React + TypeScript + Tailwind CSS.
  - `src/utils/sic461Math.ts` — физико-математический движок с формулами из даташита Vishay.
  - `src/utils/eSeries.ts` — алгоритм подбора номиналов рядов E24 и E96.
  - `src/components/SchematicView.tsx` — интерактивная принципиальная схема SiC461.
  - `src/components/BomTable.tsx` — спецификация компонентов и экспорт в CSV/Excel.
- `sic461_calculator.py` — автономный консольный Python скрипт.
- `sample_preset_24v_5v_10a.json` — пример конфигурации проекта.
- `package.json`, `vite.config.ts`, `tsconfig.json` — конфигурация сборщика Vite.
