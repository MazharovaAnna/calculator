// ===== 1. Ссылки на DOM =====
const expressionEl = document.getElementById("expression");
const previewEl = document.getElementById("preview");
const historyPanelEl = document.getElementById("historyPanel");
const historyListEl = document.getElementById("historyList");
const historyBtn = document.getElementById("historyBtn");

// ===== 2. Состояние =====
const state = {
  expression: "0",
  justEvaluated: false,
};

// ===== 3. Константы =====
const HISTORY_KEY = "calculator_history";
const HISTORY_LIMIT = 20;
const THEME_KEY = "calculator_theme";

// ===== 4. Тема =====
function applyTheme(theme) {
  document.body.classList.remove("theme-dark", "theme-light");
  document.body.classList.add("theme-" + theme);
}

function getInitialTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "dark" || saved === "light") return saved;
  } catch {}

  if (window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: light)").matches) {
    return "light";
  }
  return "dark";
}

function toggleTheme() {
  const current = document.body.classList.contains("theme-light")
    ? "light"
    : "dark";
  const next = current === "light" ? "dark" : "light";

  applyTheme(next);

  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {}
}

// На случай, если инлайн-скрипт в <head> не сработал (например, кэш)
if (!document.body.classList.contains("theme-light") &&
    !document.body.classList.contains("theme-dark")) {
  applyTheme(getInitialTheme());
}

// ===== 5. Отрисовка =====
function updateDisplay() {
  expressionEl.textContent = state.expression;
  previewEl.textContent = getPreview();
}

function getPreview() {
  if (state.expression === "0" || state.justEvaluated) return "";

  const last = state.expression.slice(-1);
  if ("+-*/(×÷−".includes(last)) return "";

  const value = evaluate(state.expression);
  if (value === null) return "";

  const formatted = formatResult(value);
  if (formatted === state.expression) return "";

  return formatted;
}

// ===== 6. Ввод =====
function appendNumber(number) {
  if (state.justEvaluated) {
    state.expression = number;
    state.justEvaluated = false;
    updateDisplay();
    return;
  }

  if (state.expression === "0") {
    state.expression = number;
  } else if (state.expression === "-0") {
    state.expression = "-" + number;
  } else {
    if (state.expression.replace(/[^0-9]/g, "").length >= 15) return;
    state.expression += number;
  }

  updateDisplay();
}

function appendDecimal() {
  if (state.justEvaluated) {
    state.expression = "0.";
    state.justEvaluated = false;
    updateDisplay();
    return;
  }

  const lastNumberMatch = state.expression.match(/[\d.]+$/);
  if (lastNumberMatch && lastNumberMatch[0].includes(".")) return;

  const last = state.expression.slice(-1);
  if (state.expression === "0" || "+-*/(".includes(last) ||
      "×÷−".includes(last)) {
    if (state.expression === "0") {
      state.expression = "0.";
    } else {
      state.expression += "0.";
    }
  } else {
    state.expression += ".";
  }

  updateDisplay();
}

function chooseOperator(op) {
  state.justEvaluated = false;

  const last = state.expression.slice(-1);

  if ("+-*/".includes(last)) {
    if (state.expression.length === 1 ||
        state.expression.slice(-2, -1) === "(") return;
    state.expression = state.expression.slice(0, -1) + op;
    updateDisplay();
    return;
  }

  if (last === "(") return;

  state.expression += op;
  updateDisplay();
}

function openParen() {
  state.justEvaluated = false;
  const last = state.expression.slice(-1);

  if (/\d/.test(last) || last === ")") {
    state.expression += "×";
  }

  if (state.expression === "0") {
    state.expression = "(";
  } else {
    state.expression += "(";
  }

  updateDisplay();
}

function closeParen() {
  const open = (state.expression.match(/\(/g) || []).length;
  const close = (state.expression.match(/\)/g) || []).length;
  if (open <= close) return;

  const last = state.expression.slice(-1);
  if ("+-*/(×÷−".includes(last)) return;

  state.expression += ")";
  updateDisplay();
}

function handleParen() {
  const last = state.expression.slice(-1);
  const open = (state.expression.match(/\(/g) || []).length;
  const close = (state.expression.match(/\)/g) || []).length;

  if (open > close && (/\d/.test(last) || last === ")")) {
    closeParen();
  } else {
    openParen();
  }
}

function backspace() {
  if (state.justEvaluated) {
    state.expression = "0";
    state.justEvaluated = false;
    updateDisplay();
    return;
  }

  if (state.expression.length > 1) {
    state.expression = state.expression.slice(0, -1);
  } else {
    state.expression = "0";
  }
  updateDisplay();
}

function clearAll() {
  state.expression = "0";
  state.justEvaluated = false;
  updateDisplay();
}

// ===== 7. Процент =====
function percent() {
  const match = state.expression.match(/(\d+\.?\d*)$/);
  if (!match) return;

  const num = parseFloat(match[0]);
  if (!isFinite(num)) return;

  const before = state.expression.slice(0, -match[0].length);
  const lastOp = before.slice(-1);

  let replacement;

  if (lastOp === "×" || lastOp === "*" || lastOp === "÷" || lastOp === "/") {
    replacement = formatResult(num / 100);
  } else if (lastOp === "+" || lastOp === "-" || lastOp === "−") {
    const leftExpr = before.slice(0, -1);
    const leftVal = evaluate(leftExpr);
    if (leftVal !== null && isFinite(leftVal)) {
      replacement = formatResult((leftVal * num) / 100);
    } else {
      replacement = formatResult(num / 100);
    }
  } else {
    replacement = formatResult(num / 100);
  }

  state.expression = state.expression.slice(0, -match[0].length) + replacement;
  updateDisplay();
}

// ===== 8. Вычисление =====
function calculate() {
  const open = (state.expression.match(/\(/g) || []).length;
  const close = (state.expression.match(/\)/g) || []).length;
  const missing = open - close;
  for (let i = 0; i < missing; i++) {
    state.expression += ")";
  }

  const value = evaluate(state.expression);
  if (value === null || !isFinite(value)) {
    state.expression = "Ошибка";
    state.justEvaluated = true;
    updateDisplay();
    return;
  }

  const formatted = formatResult(value);
  saveToHistory(state.expression, formatted);

  state.expression = formatted;
  state.justEvaluated = true;
  updateDisplay();
}

function formatResult(num) {
  if (!isFinite(num)) return "Ошибка";
  return String(parseFloat(num.toPrecision(12)));
}

// ===== 9. Парсер =====
function normalize(str) {
  return str
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-");
}

function evaluate(expr) {
  try {
    const tokens = tokenize(normalize(expr));
    const parser = new Parser(tokens);
    const result = parser.parseExpression();
    if (!parser.isAtEnd()) return null;
    return result;
  } catch {
    return null;
  }
}

function tokenize(str) {
  const tokens = [];
  let i = 0;
  while (i < str.length) {
    const ch = str[i];
    if (ch === " ") { i++; continue; }
    if (/[0-9.]/.test(ch)) {
      let num = "";
      while (i < str.length && /[0-9.]/.test(str[i])) {
        num += str[i++];
      }
      tokens.push({ type: "number", value: parseFloat(num) });
      continue;
    }
    if ("+-*/()".includes(ch)) {
      tokens.push({ type: ch });
      i++;
      continue;
    }
    throw new Error("Unexpected char: " + ch);
  }
  return tokens;
}

class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  peek() { return this.tokens[this.pos]; }
  next()  { return this.tokens[this.pos++]; }
  isAtEnd() { return this.pos >= this.tokens.length; }

  parseExpression() {
    let left = this.parseTerm();
    while (!this.isAtEnd()) {
      const t = this.peek();
      if (t.type === "+" || t.type === "-") {
        this.next();
        const right = this.parseTerm();
        left = t.type === "+" ? left + right : left - right;
      } else {
        break;
      }
    }
    return left;
  }

  parseTerm() {
    let left = this.parseFactor();
    while (!this.isAtEnd()) {
      const t = this.peek();
      if (t.type === "*" || t.type === "/") {
        this.next();
        const right = this.parseFactor();
        if (t.type === "/") {
          if (right === 0) throw new Error("Division by zero");
          left = left / right;
        } else {
          left = left * right;
        }
      } else {
        break;
      }
    }
    return left;
  }

  parseFactor() {
    const t = this.peek();
    if (!t) throw new Error("Unexpected end");

    if (t.type === "-") {
      this.next();
      return -this.parseFactor();
    }
    if (t.type === "+") {
      this.next();
      return this.parseFactor();
    }

    if (t.type === "number") {
      this.next();
      return t.value;
    }

    if (t.type === "(") {
      this.next();
      const value = this.parseExpression();
      const closing = this.next();
      if (!closing || closing.type !== ")") {
        throw new Error("Missing )");
      }
      return value;
    }

    throw new Error("Unexpected token: " + t.type);
  }
}

// ===== 10. История =====
function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveToHistory(expression, result) {
  const history = loadHistory();
  history.unshift({ expr: expression, result: String(result), time: Date.now() });
  const trimmed = history.slice(0, HISTORY_LIMIT);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch {}
  if (!historyPanelEl.hidden) renderHistory();
}

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
    const expr = document.createElement("span");
    expr.className = "history-item__expr";
    expr.textContent = item.expr;
    const result = document.createElement("span");
    result.className = "history-item__result";
    result.textContent = "= " + item.result;
    li.append(expr, result);
    li.addEventListener("click", () => {
      state.expression = item.result;
      state.justEvaluated = true;
      updateDisplay();
      closeHistory();
    });
    historyListEl.appendChild(li);
  });
}

function clearHistory() {
  try { localStorage.removeItem(HISTORY_KEY); } catch {}
  renderHistory();
}

function openHistory() {
  renderHistory();
  historyPanelEl.hidden = false;
}

function closeHistory() {
  historyPanelEl.hidden = true;
}

// ===== 11. Делегирование =====
document.addEventListener("click", (event) => {
  const btn = event.target.closest("button");
  if (!btn) return;

  const { number, operator, action } = btn.dataset;

  if (number !== undefined) { appendNumber(number); return; }
  if (operator !== undefined) { chooseOperator(operator); return; }

  switch (action) {
    case "decimal":        appendDecimal();  break;
    case "clear":          clearAll();       break;
    case "backspace":      backspace();      break;
    case "equals":         calculate();      break;
    case "percent":        percent();        break;
    case "paren":          handleParen();    break;
    case "history":        openHistory();    break;
    case "close-history":  closeHistory();   break;
    case "clear-history":  clearHistory();   break;
    case "toggle-theme":   toggleTheme();    break;
  }
});

// ===== 12. Первая отрисовка =====
updateDisplay();