// ===== 1. Ссылки на DOM =====
const currentEl = document.getElementById("current");
const historyEl = document.getElementById("history");
const buttonsEl = document.getElementById("buttons");

// ===== 2. Состояние =====
const state = {
  currentInput: "0",
  previousInput: null,
  operator: null,
  shouldResetScreen: false,
};

// ===== 3. Отрисовка =====
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

// ===== 4. Цифры =====
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

// ===== 5. Десятичная запятая =====
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

// ===== 6. Оператор =====
function chooseOperator(op) {
  // Если пользователь уже выбрал оператор, но не ввёл второе число —
  // просто меняем оператор (как в iOS: жмёшь "+", потом "×" — станет "×")
  if (state.operator !== null && state.shouldResetScreen) {
    state.operator = op;
    updateDisplay();
    return;
  }

  // Если уже есть previousInput и оператор — сначала посчитаем
  // (цепочка "2 + 3 + ..." должна давать промежуточный результат 5)
  if (state.previousInput !== null && state.operator !== null) {
    calculate();
  }

  state.previousInput = state.currentInput;
  state.operator = op;
  state.shouldResetScreen = true;
  updateDisplay();
}

// ===== 7. Вычисление =====
function calculate() {
  // Нечего считать
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

  // Округляем до 12 значащих цифр, убираем хвостовые нули
  state.currentInput = formatResult(result);
  state.previousInput = null;
  state.operator = null;
  state.shouldResetScreen = true;
  updateDisplay();
}

// Красивое форматирование числа результата
function formatResult(num) {
  if (!isFinite(num)) return "Ошибка";
  // toPrecision(12) убирает плавающие артефакты типа 0.1+0.2=0.30000000000000004
  // parseFloat в конце срезает хвостовые нули: "12.30" -> 12.3
  return String(parseFloat(num.toPrecision(12)));
}

// ===== 8. Очистка =====
function clearAll() {
  state.currentInput = "0";
  state.previousInput = null;
  state.operator = null;
  state.shouldResetScreen = false;
  updateDisplay();
}

// ===== 9. Backspace =====
function backspace() {
  // Если экран уже "сброшен" (только что нажали оператор или "=") — не трогаем
  if (state.shouldResetScreen) return;

  // Стираем по одному символу
  if (state.currentInput.length > 1) {
    state.currentInput = state.currentInput.slice(0, -1);
  } else {
    state.currentInput = "0";
  }

  updateDisplay();
}

// ===== 10. Делегирование событий =====
buttonsEl.addEventListener("click", (event) => {
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
    case "decimal":   appendDecimal(); break;
    case "clear":     clearAll();      break;
    case "backspace": backspace();     break;
    case "equals":    calculate();     break;
    case "percent":
    case "paren":
      break;
  }
});

// ===== 11. Первая отрисовка =====
updateDisplay();