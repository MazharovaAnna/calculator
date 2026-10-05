// ===== 1. Ссылки на DOM =====
const currentEl = document.getElementById("current");
const historyEl = document.getElementById("history");

const historyPanelEl = document.getElementById("historyPanel");
const historyListEl = document.getElementById("historyList");
const historyBtn = document.getElementById("historyBtn");

// ===== 2. Состояние =====
const state = {
  currentInput: "0",
  previousInput: null,
  operator: null,
  shouldResetScreen: false,
};

// ===== 3. Константы истории =====
const HISTORY_KEY = "calculator_history";
const HISTORY_LIMIT = 20;

// ===== 4. Отрисовка экрана =====
function updateDisplay() {
  currentEl.textContent = state.currentInput;
  historyEl.textContent =
    state.previousInput !== null && state.operator !== null
      ? `${state.previousInput} ${prettyOperator(state.operator)}`
      : "";
}

function prettyOperator(op) {
  return { "/": "÷", "*": "×", "-": "−", "+": "+" }[op] ?? op;
}

// ===== 5. Цифры =====
function appendNumber(number) {
  if (state.shouldResetScreen) {
    state.currentInput = number;
    state.shouldResetScreen = false;
    updateDisplay();
    return;
  }

  if (state.currentInput === "0") {
    state.currentInput = number;
  } else {
    if (state.currentInput.replace(".", "").length >= 12) return;
    state.currentInput += number;
  }

  updateDisplay();
}

// ===== 6. Десятичная запятая =====
function appendDecimal() {
  if (state.shouldResetScreen) {
    state.currentInput = "0.";
    state.shouldResetScreen = false;
    updateDisplay();
    return;
  }

  if (state.currentInput.includes(".")) return;

  state.currentInput += ".";
  updateDisplay();
}

// ===== 7. Оператор =====
function chooseOperator(op) {
  // Пользователь уже выбрал оператор, но не ввёл второе число — меняем оператор
  if (state.operator !== null && state.shouldResetScreen) {
    state.operator = op;
    updateDisplay();
    return;
  }

  // Уже есть previousInput и оператор — считаем промежуточный результат
  if (state.previousInput !== null && state.operator !== null) {
    calculate();
  }

  state.previousInput = state.currentInput;
  state.operator = op;
  state.shouldResetScreen = true;
  updateDisplay();
}

// ===== 8. Вычисление =====
function calculate() {
  if (state.operator === null || state.previousInput === null) return;

  const a = parseFloat(state.previousInput);
  const b = parseFloat(state.currentInput);

  let result;
  switch (state.operator) {
    case "+": result = a + b; break;
    case "-": result = a - b; break;
    case "*": result = a * b; break;
    case "/":
      if (b === 0) {
        state.currentInput = "Ошибка";
        state.previousInput = null;
        state.operator = null;
        state.shouldResetScreen = true;
        updateDisplay();
        return;
      }
      result = a / b;
      break;
    default:
      return;
  }

  const formatted = formatResult(result);
  const expression = `${state.previousInput} ${prettyOperator(state.operator)} ${state.currentInput}`;

  saveToHistory(expression, formatted);

  state.currentInput = formatted;
  state.previousInput = null;
  state.operator = null;
  state.shouldResetScreen = true;
  updateDisplay();
}

// Красивое форматирование результата
function formatResult(num) {
  if (!isFinite(num)) return "Ошибка";
  return String(parseFloat(num.toPrecision(12)));
}

// ===== 9. Очистка =====
function clearAll() {
  state.currentInput = "0";
  state.previousInput = null;
  state.operator = null;
  state.shouldResetScreen = false;
  updateDisplay();
}

// ===== 10. Backspace =====
function backspace() {
  if (state.shouldResetScreen) return;

  if (state.currentInput.length > 1) {
    state.currentInput = state.currentInput.slice(0, -1);
  } else {
    state.currentInput = "0";
  }

  updateDisplay();
}

// ===== 11. История: чтение / запись =====
function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToHistory(expression, result) {
  const history = loadHistory();
  history.unshift({
    expr: expression,
    result: String(result),
    time: Date.now(),
  });

  const trimmed = history.slice(0, HISTORY_LIMIT);

  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage переполнен или недоступен — молча игнорируем
  }

  if (!historyPanelEl.hidden) {
    renderHistory();
  }
}

// ===== 12. История: рендер =====
function renderHistory() {
  const history = loadHistory();
  historyListEl.innerHTML = "";

  if (history.length === 0) {
    const empty = document.createElement("div");
    empty.className = "history-panel__empty";
    empty.textContent = "Пока пусто";
    historyListEl.appendChild(empty);
    return;
  }

  history.forEach((item) => {
    const li = document.createElement("li");
    li.className = "history-item";
    li.title = "Нажми, чтобы подставить результат";

    const expr = document.createElement("span");
    expr.className = "history-item__expr";
    expr.textContent = item.expr;

    const result = document.createElement("span");
    result.className = "history-item__result";
    result.textContent = `= ${item.result}`;

    li.append(expr, result);

    li.addEventListener("click", () => {
      state.currentInput = item.result;
      state.shouldResetScreen = true;
      updateDisplay();
      closeHistory();
    });

    historyListEl.appendChild(li);
  });
}

// ===== 13. История: очистка и открытие / закрытие =====
function clearHistory() {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {}
  renderHistory();
}

function openHistory() {
  renderHistory();
  historyPanelEl.hidden = false;
}

function closeHistory() {
  historyPanelEl.hidden = true;
}

// ===== 14. Делегирование событий =====
document.addEventListener("click", (event) => {
  const btn = event.target.closest("button");
  if (!btn) return;

  const { number, operator, action } = btn.dataset;

  if (number !== undefined) {
    appendNumber(number);
    return;
  }

  if (operator !== undefined) {
    chooseOperator(operator);
    return;
  }

  switch (action) {
    case "decimal":        appendDecimal();  break;
    case "clear":          clearAll();       break;
    case "backspace":      backspace();      break;
    case "equals":         calculate();      break;
    case "history":        openHistory();    break;
    case "close-history":  closeHistory();   break;
    case "clear-history":  clearHistory();   break;
    case "percent":
    case "paren":
      break;
  }
});

// ===== 15. Первая отрисовка =====
updateDisplay();