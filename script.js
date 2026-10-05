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

// Символы операторов для вывода в history
function prettyOperator(op) {
  return { "/": "÷", "*": "×", "-": "−", "+": "+" }[op] ?? op;
}

// ===== 4. Добавление цифр =====
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

// ===== 5. Добавление десятичной запятой =====
function appendDecimal() {
  // Если только что нажали оператор или "=" — начинаем с "0."
  if (state.shouldResetScreen) {
    state.currentInput = "0.";
    state.shouldResetScreen = false;
    updateDisplay();
    return;
  }

  // Не даём поставить вторую точку в одном числе
  if (state.currentInput.includes(".")) return;

  state.currentInput += ".";
  updateDisplay();
}

// ===== 6. Делегирование событий =====
buttonsEl.addEventListener("click", (event) => {
  const btn = event.target.closest("button");
  if (!btn) return;

  const { number, operator, action } = btn.dataset;

  if (number !== undefined) {
    appendNumber(number);
    return;
  }

  if (operator !== undefined) {
    // chooseOperator(operator) — следующим шагом
    console.log("operator:", operator);
    return;
  }

  switch (action) {
    case "decimal":
      appendDecimal();
      break;

    case "clear":
      
      console.log("clear");
      break;

    case "backspace":
      
      console.log("backspace");
      break;

    case "equals":
      
      console.log("equals");
      break;

    case "percent":
    case "paren":
      
      break;

    default:
      
      break;
  }
});

// ===== 7. Первая отрисовка =====
updateDisplay();