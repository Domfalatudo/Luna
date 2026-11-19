(() => {
  const form = document.getElementById("chat-form");
  if (!form) return;

  const conversation = document.getElementById("conversation");
  const input = document.getElementById("prompt");
  const status = document.getElementById("chat-status");
  const clear = document.getElementById("clear-chat");
  const submitButton = form.querySelector('button[type="submit"]');
  const suggestions = conversation.parentElement.querySelectorAll(".suggestion");
  const suggestionButtons = Array.from(suggestions);
  const defaultSuggestions = suggestionButtons.map((button) => button.textContent);
  const opening = conversation.querySelector(".message.assistant")?.textContent || "";
  const messages = [];
  const maxMessages = 12;
  const submitLabel = submitButton.textContent;
  const dashboardKey = "luna-finance-dashboard-v1";
  const controlKey = "luna-finance-full-control-v1";
  const guidanceKey = "luna-finance-guidance-context-v2";
  const legacyGuidanceKey = "luna-finance-guidance-preferences-v1";
  const currencies = {
    ARS: "Peso argentino",
    AUD: "Dólar australiano",
    BOB: "Boliviano",
    BRL: "Real brasileiro",
    CAD: "Dólar canadense",
    CHF: "Franco suíço",
    CLP: "Peso chileno",
    CNY: "Yuan chinês",
    COP: "Peso colombiano",
    EUR: "Euro",
    GBP: "Libra esterlina",
    JPY: "Iene japonês",
    MXN: "Peso mexicano",
    PEN: "Sol peruano",
    PYG: "Guarani paraguaio",
    USD: "Dólar americano",
    UYU: "Peso uruguaio",
  };
  const categories = {
    income: "Renda mensal",
    bill: "Conta ou parcela",
    essential: "Despesa essencial",
    goal: "Objetivo",
    other: "Outro",
  };
  const cadences = {
    monthly: "mensal",
    "one-time": "pontual",
    unknown: "frequência não informada",
  };
  const dashboard = document.querySelector(".finance-dashboard");
  const guidanceStatus = dashboard ? document.getElementById("finance-guidance-status") : null;
  let dashboardItems = [];
  let guidanceQuestions = [];
  let guidanceAnswers = [];
  let storageError = "";
  let fullControl = false;
  let sendAuthorizationPending = false;
  let requestInFlight = false;

  const isDashboardItem = (item) =>
    item &&
    typeof item.id === "string" &&
    /^[A-Za-z0-9_-]{1,64}$/.test(item.id) &&
    typeof item.name === "string" &&
    item.name.trim().length > 0 &&
    item.name.length <= 80 &&
    Object.hasOwn(categories, item.category) &&
    (item.currency === null || Object.hasOwn(currencies, item.currency)) &&
    (item.amount === null || (
      typeof item.amount === "number" &&
      Number.isFinite(item.amount) &&
      item.amount >= 0 &&
      item.amount <= 1e10 &&
      Object.hasOwn(currencies, item.currency)
    )) &&
    Object.hasOwn(cadences, item.cadence);

  const saveDashboard = (items) => {
    try {
      localStorage.setItem(dashboardKey, JSON.stringify(items));
      storageError = "";
      return true;
    } catch {
      storageError = "Não foi possível salvar o painel neste navegador. Confira o espaço disponível e as permissões de armazenamento.";
      status.textContent = storageError;
      return false;
    }
  };

  const formatMoney = (amount, currency) => new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    currencyDisplay: "code",
  }).format(amount);

  const makeElement = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };

  const calculateScientificExpression = (expression, degrees) => {
    const normalized = expression
      .replaceAll("×", "*")
      .replaceAll("÷", "/")
      .replaceAll("π", "pi")
      .replaceAll(",", ".");
    const tokenPattern = /(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|sin|cos|tan|sqrt|log|ln|abs|exp|pi|e|[()+\-*/^%]/iy;
    const tokens = [];
    let offset = 0;
    while (offset < normalized.length) {
      if (/\s/.test(normalized[offset])) {
        offset += 1;
        continue;
      }
      tokenPattern.lastIndex = offset;
      const match = tokenPattern.exec(normalized);
      if (!match) throw new Error("Confira a expressão digitada.");
      tokens.push(match[0].toLowerCase());
      offset = tokenPattern.lastIndex;
    }
    if (!tokens.length) throw new Error("Digite uma expressão para calcular.");

    let position = 0;
    const peek = () => tokens[position];
    const consume = () => tokens[position++];
    const startsImplicitValue = (token) =>
      token === "(" ||
      token === "pi" ||
      token === "e" ||
      ["sin", "cos", "tan", "sqrt", "log", "ln", "abs", "exp"].includes(token);
    const checked = (value) => {
      if (!Number.isFinite(value)) throw new Error("O resultado não é um número válido.");
      return value;
    };

    const parseExpression = () => {
      let value = parseTerm();
      while (peek() === "+" || peek() === "-") {
        const operator = consume();
        const right = parseTerm();
        value = checked(operator === "+" ? value + right : value - right);
      }
      return value;
    };
    const parseTerm = () => {
      let value = parseUnary();
      while (true) {
        const token = peek();
        if (token === "*" || token === "/") {
          const operator = consume();
          const right = parseUnary();
          if (operator === "/" && right === 0) throw new Error("Não é possível dividir por zero.");
          value = checked(operator === "*" ? value * right : value / right);
        } else if (startsImplicitValue(token)) {
          value = checked(value * parseUnary());
        } else {
          return value;
        }
      }
    };
    const parseUnary = () => {
      if (peek() === "+") {
        consume();
        return parseUnary();
      }
      if (peek() === "-") {
        consume();
        return -parseUnary();
      }
      return parsePower();
    };
    const parsePower = () => {
      let value = parsePostfix();
      if (peek() === "^") {
        consume();
        value = checked(value ** parseUnary());
      }
      return value;
    };
    const parsePostfix = () => {
      let value = parsePrimary();
      while (peek() === "%") {
        consume();
        value /= 100;
      }
      return checked(value);
    };
    const parsePrimary = () => {
      const token = consume();
      if (token === undefined) throw new Error("A expressão está incompleta.");
      if (token === "(") {
        const value = parseExpression();
        if (consume() !== ")") throw new Error("Feche os parênteses da expressão.");
        return value;
      }
      if (token === "pi") return Math.PI;
      if (token === "e") return Math.E;
      if (/^(?:\d|\.)/.test(token)) {
        const number = Number(token);
        if (!Number.isFinite(number)) throw new Error("Confira os números digitados.");
        return number;
      }
      if (["sin", "cos", "tan", "sqrt", "log", "ln", "abs", "exp"].includes(token)) {
        if (consume() !== "(") throw new Error(`Use ${token}(valor).`);
        const argument = parseExpression();
        if (consume() !== ")") throw new Error("Feche os parênteses da função.");
        const angle = degrees ? argument * (Math.PI / 180) : argument;
        switch (token) {
          case "sin": return checked(Math.sin(angle));
          case "cos": return checked(Math.cos(angle));
          case "tan": return checked(Math.tan(angle));
          case "sqrt":
            if (argument < 0) throw new Error("Raiz quadrada de número negativo não é real.");
            return Math.sqrt(argument);
          case "log":
            if (argument <= 0) throw new Error("O logaritmo precisa de um valor maior que zero.");
            return Math.log10(argument);
          case "ln":
            if (argument <= 0) throw new Error("O logaritmo precisa de um valor maior que zero.");
            return Math.log(argument);
          case "abs": return Math.abs(argument);
          case "exp": return checked(Math.exp(argument));
        }
      }
      throw new Error("Confira a expressão digitada.");
    };

    const result = parseExpression();
    if (position < tokens.length) throw new Error("Confira operadores e parênteses.");
    return checked(result);
  };

  const initializeScientificCalculator = () => {
    const keys = document.getElementById("finance-calculator-keys");
    if (!keys) return;
    const display = document.getElementById("finance-calculator-display");
    const result = document.getElementById("finance-calculator-result");
    const mode = document.getElementById("finance-calculator-mode");
    let degrees = true;

    const calculate = () => {
      try {
        const value = calculateScientificExpression(display.value, degrees);
        const rounded = Number(value.toPrecision(12));
        result.textContent = `Resultado: ${new Intl.NumberFormat("pt-BR", {
          maximumFractionDigits: 10,
        }).format(rounded)}`;
        display.dataset.result = String(rounded);
      } catch (error) {
        delete display.dataset.result;
        result.textContent = error instanceof Error ? error.message : "Não foi possível calcular essa expressão.";
      }
    };

    keys.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      if (button.dataset.action === "clear") {
        display.value = "";
        delete display.dataset.result;
        result.textContent = "Digite uma expressão ou use os botões.";
      } else if (button.dataset.action === "delete") {
        display.value = display.value.slice(0, -1);
        delete display.dataset.result;
      } else if (button.dataset.action === "calculate") {
        calculate();
      } else if (button.dataset.value) {
        if (display.dataset.result) {
          display.value = /^[+\-*/^%]/.test(button.dataset.value) ? display.dataset.result : "";
          delete display.dataset.result;
        }
        display.value += button.dataset.value;
        display.focus();
      }
    });
    display.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        calculate();
      } else if (event.key === "Escape") {
        display.value = "";
        delete display.dataset.result;
        result.textContent = "Digite uma expressão ou use os botões.";
      }
    });
    mode.addEventListener("click", () => {
      degrees = !degrees;
      mode.textContent = degrees ? "DEG" : "RAD";
      mode.setAttribute("aria-pressed", String(!degrees));
      mode.setAttribute("aria-label", `Modo ${degrees ? "graus" : "radianos"}`);
    });
  };

  const renderItemBarChart = ({ chartId, barsId, noteId, items, label, emptyText, cadenceLabel, countLabels }) => {
    const chart = document.getElementById(chartId);
    const chartBars = document.getElementById(barsId);
    const note = document.getElementById(noteId);
    chartBars.replaceChildren();
    if (!items.length) {
      const message = emptyText;
      chartBars.append(makeElement("span", "finance-empty", message));
      chartBars.style.removeProperty("--finance-bars-count");
      chart.setAttribute("aria-label", message);
      note.textContent = `${cadenceLabel} na moeda selecionada (${document.getElementById("finance-currency-select").value}).`;
      return;
    }

    const currency = document.getElementById("finance-currency-select").value;
    const maxAmount = items.reduce((max, item) => Math.max(max, item.amount), 1);
    chartBars.style.setProperty("--finance-bars-count", String(items.length));
    items.forEach((item) => {
      const group = makeElement("div", "finance-column-group");
      const amount = makeElement("strong", "finance-column-value", formatMoney(item.amount, currency));
      const bar = makeElement("i", `finance-column-bar finance-column-bar-${item.category}`);
      const name = makeElement("span", "finance-column-label", item.name);
      const track = makeElement("div", "finance-column-track");
      const barHeight = item.amount > 0 ? Math.max((item.amount / maxAmount) * 100, 3) : 0;
      bar.style.height = `${barHeight}%`;
      bar.setAttribute("aria-hidden", "true");
      group.title = `${item.name} · ${categories[item.category]} · ${cadences[item.cadence]} · ${formatMoney(item.amount, currency)}`;
      group.setAttribute(
        "aria-label",
        `${item.name}, ${categories[item.category]}, ${cadences[item.cadence]}, ${formatMoney(item.amount, currency)}`
      );
      track.append(bar);
      group.append(amount, track, name);
      chartBars.append(group);
    });
    chart.setAttribute(
      "aria-label",
      `${items.length} itens em ${currency}, em ordem decrescente: ${items.map((item) => `${item.name}, ${categories[item.category]}, ${cadences[item.cadence]}, ${formatMoney(item.amount, currency)}`).join("; ")}.`
    );
    const countLabel = countLabels
      ? items.length === 1 ? countLabels.singular : countLabels.plural
      : label === "renda"
        ? items.length === 1 ? "fonte de renda" : "fontes de renda"
        : items.length === 1 ? "gasto" : "gastos";
    note.textContent = `${items.length} ${countLabel} · mensais e pontuais · em ordem decrescente · ${currency}. Deslize para ver todos.`;
  };

  const renderDashboard = () => {
    if (!dashboard) return;

    const monthlyItems = (category) => dashboardItems
      .filter((item) => item.category === category && item.cadence === "monthly" && item.amount !== null);
    const totalsByCurrency = (items) => {
      const totals = new Map();
      items.forEach((item) => totals.set(item.currency, (totals.get(item.currency) || 0) + item.amount));
      return totals;
    };
    const formatTotals = (items) => [...totalsByCurrency(items)]
      .map(([currency, amount]) => formatMoney(amount, currency))
      .join(" · ");
    const setMetric = (category, amountId, noteId, includeAllCadences = false) => {
      const knownItems = dashboardItems.filter((item) => item.category === category);
      const confirmedMonthly = monthlyItems(category);
      const pendingItems = knownItems.filter((item) => item.amount === null || item.cadence !== "monthly");
      const amount = document.getElementById(amountId);
      if (includeAllCadences) {
        const pricedItems = knownItems.filter((item) => item.amount !== null);
        const totalsByCadenceAndCurrency = new Map();
        pricedItems.forEach((item) => {
          const key = `${item.currency}\u0000${item.cadence}`;
          const group = totalsByCadenceAndCurrency.get(key) || {
            currency: item.currency,
            cadence: item.cadence,
            total: 0,
            count: 0,
          };
          group.total += item.amount;
          group.count += 1;
          totalsByCadenceAndCurrency.set(key, group);
        });
        const groups = [...totalsByCadenceAndCurrency.values()];
        amount.textContent = groups.length
          ? groups.map((group) => {
            const cadence = group.cadence === "monthly"
              ? "/mês"
              : group.cadence === "one-time"
                ? "pontual"
                : "freq. não informada";
            return `${formatMoney(group.total, group.currency)} ${cadence}`;
          }).join(" · ")
          : "—";
        amount.classList.toggle("finance-metric-multiple", groups.length > 1);
        if (groups.length) {
          const pricedCount = pricedItems.length;
          const unpricedCount = knownItems.length - pricedCount;
          const frequencyCounts = new Map();
          pricedItems.forEach((item) => {
            frequencyCounts.set(item.cadence, (frequencyCounts.get(item.cadence) || 0) + 1);
          });
          const frequencySummary = [...frequencyCounts]
            .map(([cadence, count]) => {
              const frequency = cadence === "monthly"
                ? count === 1 ? "mensal" : "mensais"
                : cadence === "one-time"
                  ? count === 1 ? "pontual" : "pontuais"
                  : count === 1 ? "sem frequência" : "sem frequência";
              return `${count} ${frequency}`;
            })
            .join(" · ");
          document.getElementById(noteId).textContent = unpricedCount
            ? `${frequencySummary} · ${unpricedCount} sem valor`
            : `${pricedCount} item(ns) · ${frequencySummary}`;
        } else if (knownItems.length) {
          document.getElementById(noteId).textContent = `${knownItems.length} item(ns) sem valor informado`;
        } else {
          document.getElementById(noteId).textContent = "Ainda não informado";
        }
        return;
      }

      amount.textContent = confirmedMonthly.length
        ? formatTotals(confirmedMonthly)
        : "—";
      amount.classList.toggle("finance-metric-multiple", totalsByCurrency(confirmedMonthly).size > 1);
      if (confirmedMonthly.length) {
        document.getElementById(noteId).textContent = `${confirmedMonthly.length} item(ns) confirmado(s)`;
      } else if (pendingItems.length) {
        document.getElementById(noteId).textContent = `${pendingItems.length} item(ns) sem valor mensal definido`;
      } else {
        document.getElementById(noteId).textContent = "Ainda não informado";
      }
    };

    setMetric("income", "metric-income", "metric-income-note");
    setMetric("bill", "metric-bills", "metric-bills-note");
    setMetric("essential", "metric-essential", "metric-essential-note", true);
    const goals = dashboardItems.filter((item) => item.category === "goal");
    document.getElementById("metric-goals").textContent = String(goals.length);
    document.getElementById("metric-goals-note").textContent = goals.length
      ? `${goals.length} objetivo(s) confirmado(s)`
      : "Nenhum objetivo registrado";

    const donut = document.getElementById("finance-donut");
    const summary = document.getElementById("finance-category-summary");
    const currencySelect = document.getElementById("finance-currency-select");
    const currenciesInPanel = [...new Set(dashboardItems.map((item) => item.currency).filter(Boolean))]
      .sort((left, right) => currencies[left].localeCompare(currencies[right], "pt-BR"));
    const previousCurrency = currencySelect.value;
    const availableCurrencies = currenciesInPanel.length ? currenciesInPanel : ["BRL"];
    currencySelect.replaceChildren(...availableCurrencies.map((currency) => {
      const option = makeElement("option", "", `${currency} · ${currencies[currency]}`);
      option.value = currency;
      return option;
    }));
    const selectedCurrency = availableCurrencies.includes(previousCurrency) ? previousCurrency : availableCurrencies[0];
    currencySelect.value = selectedCurrency;
    const monthlyInCurrency = (category) => dashboardItems.filter(
      (item) =>
        item.category === category &&
        item.amount !== null &&
        item.currency === selectedCurrency &&
        item.cadence === "monthly"
    );
    const sumItems = (items) => items.reduce((total, item) => total + item.amount, 0);
    const incomeItems = monthlyInCurrency("income");
    const billItems = monthlyInCurrency("bill");
    const essentialItems = monthlyInCurrency("essential");
    const incomeTotal = sumItems(incomeItems);
    const billTotal = sumItems(billItems);
    const essentialTotal = sumItems(essentialItems);
    const expensesTotal = billTotal + essentialTotal;
    const monthlyOutgoingItems = dashboardItems.filter(
      (item) =>
        ["bill", "essential", "other"].includes(item.category) &&
        item.amount !== null &&
        item.currency === selectedCurrency &&
        item.cadence === "monthly"
    );
    const monthlyOutgoingTotal = sumItems(monthlyOutgoingItems);
    const commitmentGauge = document.getElementById("finance-commitment-gauge");
    const commitmentArc = document.getElementById("finance-commitment-arc");
    const commitmentPercent = document.getElementById("finance-commitment-percent");
    const commitmentCaption = document.getElementById("finance-commitment-caption");
    const commitmentNote = document.getElementById("finance-commitment-note");
    commitmentArc.style.strokeDasharray = "0 100";
    commitmentArc.classList.remove("is-over-income");
    if (!incomeItems.length || incomeTotal <= 0) {
      commitmentPercent.textContent = "—";
      commitmentCaption.textContent = "RENDA NÃO INFORMADA";
      commitmentNote.textContent = `Informe renda mensal positiva em ${selectedCurrency} para calcular.`;
      commitmentGauge.setAttribute(
        "aria-label",
        `Não foi possível calcular o comprometimento mensal: não há renda mensal positiva confirmada em ${selectedCurrency}.`
      );
    } else if (!monthlyOutgoingItems.length) {
      commitmentPercent.textContent = "—";
      commitmentCaption.textContent = "DESPESAS NÃO INFORMADAS";
      commitmentNote.textContent = `Não há despesas recorrentes confirmadas em ${selectedCurrency}. Isso não significa que seus gastos sejam zero.`;
      commitmentGauge.setAttribute(
        "aria-label",
        `Não foi possível calcular o comprometimento mensal: não há despesas recorrentes confirmadas em ${selectedCurrency}.`
      );
    } else {
      const commitmentRatio = monthlyOutgoingTotal / incomeTotal;
      const commitmentPercentage = Math.round(commitmentRatio * 100);
      commitmentPercent.textContent = `${commitmentPercentage}%`;
      commitmentCaption.textContent = commitmentRatio > 1 ? "ACIMA DA RENDA INFORMADA" : "DA RENDA INFORMADA";
      commitmentArc.style.strokeDasharray = `${Math.min(commitmentRatio, 1) * 100} 100`;
      commitmentArc.classList.toggle("is-over-income", commitmentRatio > 1);
      commitmentNote.textContent = `${formatMoney(monthlyOutgoingTotal, selectedCurrency)} em despesas recorrentes informadas de ${formatMoney(incomeTotal, selectedCurrency)} de renda. Outros gastos podem não estar registrados.`;
      commitmentGauge.setAttribute(
        "aria-label",
        `${commitmentPercentage}% da renda mensal informada está comprometida pelas despesas recorrentes registradas: ${formatMoney(monthlyOutgoingTotal, selectedCurrency)} de ${formatMoney(incomeTotal, selectedCurrency)} em ${selectedCurrency}.`
      );
    }

    const comparison = document.getElementById("finance-comparison-chart");
    const comparisonIncome = document.getElementById("finance-comparison-income");
    const comparisonOutgoings = document.getElementById("finance-comparison-outgoings");
    const comparisonIncomeBar = document.getElementById("finance-comparison-income-bar");
    const comparisonOutgoingsBar = document.getElementById("finance-comparison-outgoings-bar");
    const comparisonNote = document.getElementById("finance-comparison-note");
    comparisonIncome.textContent = incomeItems.length ? formatMoney(incomeTotal, selectedCurrency) : "—";
    comparisonOutgoings.textContent = billItems.length || essentialItems.length
      ? formatMoney(expensesTotal, selectedCurrency)
      : "—";
    const comparisonScale = Math.max(incomeTotal, expensesTotal, 1);
    comparisonIncomeBar.style.width = `${incomeItems.length && incomeTotal > 0 ? Math.max((incomeTotal / comparisonScale) * 100, 2) : 0}%`;
    comparisonOutgoingsBar.style.width = `${(billItems.length || essentialItems.length) && expensesTotal > 0 ? Math.max((expensesTotal / comparisonScale) * 100, 2) : 0}%`;
    comparison.setAttribute(
      "aria-label",
      `Na moeda ${selectedCurrency}, renda mensal informada: ${incomeItems.length ? formatMoney(incomeTotal, selectedCurrency) : "sem dados"}; contas e despesas essenciais informadas: ${billItems.length || essentialItems.length ? formatMoney(expensesTotal, selectedCurrency) : "sem dados"}.`
    );
    comparisonNote.textContent = incomeItems.length && (billItems.length || essentialItems.length)
      ? "Compara apenas renda, contas e despesas essenciais mensais já informadas."
      : "Informe renda e despesas mensais na mesma moeda para comparar.";

    const expenseItems = dashboardItems
      .filter(
        (item) =>
          ["bill", "essential", "other"].includes(item.category) &&
          item.amount !== null &&
          item.currency === selectedCurrency
      )
      .sort((left, right) => right.amount - left.amount);
    const donutColors = ["#292928", "#8e8b80", "#b7a47b", "#718779", "#9a7182", "#6e8797", "#bd7d5d", "#7d7699", "#89974d", "#a49387", "#658e8b", "#aa8f45"];
    const donutSegments = expenseItems
      .filter((item) => item.amount > 0)
      .map((item) => ({
        ...item,
        color: donutColors[expenseItems.indexOf(item) % donutColors.length],
      }));
    const spendingTotal = sumItems(expenseItems);
    const centerX = 84;
    const centerY = 84;
    const ringRadius = 60;
    const circumference = 2 * Math.PI * ringRadius;
    let ringOffset = 0;
    const svgNamespace = "http://www.w3.org/2000/svg";
    const donutSvg = document.createElementNS(svgNamespace, "svg");
    donutSvg.setAttribute("viewBox", "0 0 168 168");
    donutSvg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    donutSvg.setAttribute("class", "donut-svg");
    donutSvg.setAttribute("role", "img");
    donutSvg.setAttribute(
      "aria-label",
      spendingTotal
        ? `Composição de ${expenseItems.length} gastos mensais e pontuais em ${selectedCurrency}: ${expenseItems.map((item) => `${item.name}, ${categories[item.category]}, ${cadences[item.cadence]}, ${formatMoney(item.amount, selectedCurrency)}`).join("; ")}.`
        : "Ainda não há gastos com valor confirmado nessa moeda."
    );

    const createSegment = (segment) => {
      const element = document.createElementNS(svgNamespace, "circle");
      element.setAttribute("class", "donut-segment");
      element.setAttribute("fill", "none");
      element.setAttribute("stroke", segment.color);
      element.setAttribute("stroke-width", "26");
      element.setAttribute("stroke-dasharray", `${(segment.amount / spendingTotal) * circumference} ${circumference}`);
      element.setAttribute("stroke-dashoffset", String(-ringOffset));
      element.setAttribute("data-id", segment.id);
      element.setAttribute("role", "button");
      element.setAttribute("aria-label", `${segment.name}: ${formatMoney(segment.amount, selectedCurrency)}`);
      element.setAttribute("tabindex", "0");
      element.setAttribute("cx", String(centerX));
      element.setAttribute("cy", String(centerY));
      element.setAttribute("r", String(ringRadius));
      element.setAttribute("pointer-events", "stroke");
      ringOffset += (segment.amount / spendingTotal) * circumference;
      return element;
    };

    if (donutSegments.length) {
      donutSegments.forEach((segment) => donutSvg.append(createSegment(segment)));
    } else {
      const emptyCircle = document.createElementNS(svgNamespace, "circle");
      emptyCircle.setAttribute("cx", String(centerX));
      emptyCircle.setAttribute("cy", String(centerY));
      emptyCircle.setAttribute("r", String(ringRadius));
      emptyCircle.setAttribute("fill", "none");
      emptyCircle.setAttribute("stroke", "#e9e8e4");
      emptyCircle.setAttribute("stroke-width", "26");
      donutSvg.append(emptyCircle);
    }

    const donutCenter = makeElement("div", "donut-center");
    donutCenter.append(
      makeElement("strong", "", spendingTotal ? formatMoney(spendingTotal, selectedCurrency) : "—"),
      makeElement("span", "", spendingTotal ? "TOTAL REGISTRADO" : "SEM VALORES")
    );
    donut.replaceChildren(donutSvg, donutCenter);
    donut.classList.toggle("donut-interactive", donutSegments.length > 0);

    donut.querySelectorAll(".donut-segment").forEach((segment) => {
      segment.addEventListener("mouseenter", () => {
        segment.style.filter = "brightness(1.2)";
        segment.style.transition = "filter 0.2s";
      });
      segment.addEventListener("mouseleave", () => {
        segment.style.filter = "";
      });
      segment.addEventListener("click", () => {
        const itemId = segment.dataset.id;
        const item = donutSegments.find((s) => s.id === itemId);
        if (item) status.textContent = `${item.name}: ${formatMoney(item.amount, selectedCurrency)}`;
      });
      segment.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          segment.click();
        }
      });
    });
    summary.replaceChildren();
    if (!expenseItems.length) {
      summary.append(makeElement("li", "finance-empty", "Cada gasto aparecerá individualmente aqui."));
    } else {
      expenseItems.forEach((expense) => {
        const item = makeElement("li");
        const details = makeElement("span", "finance-legend-details");
        const share = spendingTotal ? Math.round((expense.amount / spendingTotal) * 100) : 0;
        details.append(
          makeElement("span", "finance-legend-name", expense.name),
          makeElement("small", "finance-legend-meta", `${categories[expense.category]} · ${cadences[expense.cadence]} · ${share}%`)
        );
        const swatch = makeElement("i");
        swatch.style.backgroundColor = expense.amount > 0
          ? donutColors[expenseItems.indexOf(expense) % donutColors.length]
          : "#e0ded7";
        item.append(
          swatch,
          details,
          makeElement("strong", "", formatMoney(expense.amount, selectedCurrency))
        );
        summary.append(item);
      });
    }

    const itemList = document.getElementById("finance-items-list");
    itemList.replaceChildren();
    if (!dashboardItems.length) {
      itemList.append(makeElement("p", "finance-empty", "Seu painel está vazio. Conte à Luna o que gostaria de organizar."));
    } else {
      dashboardItems.forEach((item, index) => {
        const row = makeElement("div");
        row.append(
          makeElement("span", "", String(index + 1).padStart(2, "0")),
        );
        const details = makeElement("p");
        details.append(
          makeElement("strong", "", item.name),
          makeElement(
            "small",
            "",
            `${categories[item.category]} · ${item.amount === null ? "valor não informado" : formatMoney(item.amount, item.currency)} · ${cadences[item.cadence]}`
          )
        );
        row.append(details, makeElement("b", "", item.amount === null ? "SEM VALOR" : "CONFIRMADO"));
        itemList.append(row);
      });
    }

    const expenses = dashboardItems
      .filter(
        (item) =>
          ["bill", "essential", "other"].includes(item.category) &&
          item.amount !== null &&
          item.currency === selectedCurrency
      )
      .sort((left, right) => right.amount - left.amount);
    const incomes = dashboardItems
      .filter((item) => item.category === "income" && item.amount !== null && item.currency === selectedCurrency)
      .sort((left, right) => right.amount - left.amount);
    const essentials = dashboardItems
      .filter((item) => item.category === "essential" && item.amount !== null && item.currency === selectedCurrency)
      .sort((left, right) => right.amount - left.amount);
    renderItemBarChart({
      chartId: "finance-category-chart",
      barsId: "finance-chart-bars",
      noteId: "finance-accounts-note",
      items: expenses,
      label: "gasto",
      emptyText: dashboardItems.length
        ? `Nenhum gasto com valor confirmado em ${selectedCurrency}.`
        : "Adicione seus gastos para montar o gráfico de barras.",
      cadenceLabel: "Gastos mensais e pontuais",
    });
    renderItemBarChart({
      chartId: "finance-income-chart",
      barsId: "finance-income-bars",
      noteId: "finance-income-note",
      items: incomes,
      label: "renda",
      emptyText: dashboardItems.length
        ? `Nenhuma renda com valor confirmado em ${selectedCurrency}.`
        : "Adicione suas rendas para montar o gráfico de barras.",
      cadenceLabel: "Rendas mensais e pontuais",
    });
    renderItemBarChart({
      chartId: "finance-essential-chart",
      barsId: "finance-essential-bars",
      noteId: "finance-essential-note",
      items: essentials,
      label: "despesas essenciais",
      emptyText: dashboardItems.length
        ? `Nenhuma despesa essencial com valor confirmado em ${selectedCurrency}.`
        : "Converse com a Luna para identificar despesas essenciais.",
      cadenceLabel: "Despesas essenciais mensais e pontuais",
      countLabels: { singular: "despesa essencial", plural: "despesas essenciais" },
    });
  };

  const readDashboard = () => {
    if (!dashboard) return [];
    try {
      const saved = localStorage.getItem(dashboardKey);
      if (!saved) return [];
      const parsedItems = JSON.parse(saved);
      const items = Array.isArray(parsedItems)
        ? parsedItems.map((item) => item && item.currency === undefined
          ? { ...item, currency: item.amount === null ? null : "BRL" }
          : item)
        : parsedItems;
      if (!Array.isArray(items) || items.length > 50 || !items.every(isDashboardItem)) {
        throw new Error("Os dados salvos do painel estão inválidos. Apague-os antes de continuar.");
      }
      if (items.some((item, index) => item.currency !== parsedItems[index].currency)) saveDashboard(items);
      return items;
    } catch (error) {
      storageError = error.message || "Não foi possível ler os dados locais do painel.";
      status.textContent = storageError;
      submitButton.disabled = true;
      return [];
    }
  };
  const suggestionTopics = [
    {
      keywords: ["vencimento", "vencer", "atraso", "atrasada", "data", "priorizar", "prioridade"],
      prompts: [
        "Como posso organizar as contas por data de vencimento?",
        "O que devo conferir antes de priorizar uma conta?",
        "Pode me ajudar a montar uma lista de vencimentos?",
      ],
    },
    {
      keywords: ["dívida", "divida", "parcela", "juros", "credor", "negociar", "negociação"],
      prompts: [
        "Quais informações devo conferir sobre essa dívida?",
        "Como posso comparar opções de negociação com segurança?",
        "Que perguntas posso fazer ao credor?",
      ],
    },
    {
      keywords: ["painel", "gráfico", "objetivo", "confirmado", "alteração", "atualizar"],
      prompts: [
        "Como os dados confirmados aparecem no painel?",
        "O que devo conferir antes de aplicar uma alteração?",
        "Como posso adicionar ou retirar um item do painel?",
      ],
    },
    {
      keywords: ["conta", "contas", "despesa", "despesas", "gasto", "gastos", "orçamento", "renda"],
      prompts: [
        "Como posso organizar minhas despesas por categoria?",
        "Que informações posso reunir para entender meus gastos?",
        "Pode sugerir um jeito simples de acompanhar minhas contas?",
      ],
    },
  ];

  const normalize = (text) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const updateSuggestions = () => {
    const recentMessages = messages.slice(-8).reverse();
    const topic = recentMessages
      .map((message) => {
        const content = normalize(message.content);
        return suggestionTopics.find((candidate) =>
          candidate.keywords.some((keyword) => content.includes(normalize(keyword)))
        );
      })
      .find(Boolean);
    const asked = new Set(
      messages
        .filter((message) => message.role === "user")
        .map((message) => normalize(message.content))
    );
    const prompts = [...(topic?.prompts || []), ...defaultSuggestions]
      .filter((prompt, index, all) =>
        !asked.has(normalize(prompt)) &&
        all.findIndex((candidate) => normalize(candidate) === normalize(prompt)) === index
      );

    suggestionButtons.forEach((button, index) => {
      button.textContent = prompts[index] || defaultSuggestions[index];
    });
  };

  const showChatAuthorization = (title, detail, onAuthorize, onDeny) => {
    const prompt = makeElement("div", "message assistant finance-chat-approval");
    prompt.append(makeElement("strong", "", title), makeElement("p", "", detail));
    const actions = makeElement("div", "button-row");
    const authorize = makeElement("button", "button button-dark", "Autorizar");
    const deny = makeElement("button", "button button-light", "Não autorizar");
    authorize.type = "button";
    deny.type = "button";
    const finish = (answer, callback) => {
      authorize.disabled = true;
      deny.disabled = true;
      callback();
      actions.replaceChildren(makeElement("span", "finance-chat-approval-result", answer));
      scrollConversationToBottom();
    };
    authorize.addEventListener("click", () => finish("Autorizado", onAuthorize));
    deny.addEventListener("click", () => finish("Não autorizado", onDeny));
    actions.append(authorize, deny);
    prompt.append(actions);
    conversation.append(prompt);
    scrollConversationToBottom();
    return prompt;
  };

  const renderGuidance = (insights, steps) => {
    if (!dashboard) return;
    const insightList = document.getElementById("finance-insights-list");
    insightList.replaceChildren();
    if (!insights.length) {
      insightList.append(makeElement("p", "finance-empty", "Ainda não há pontos específicos para avaliar."));
    } else {
      insights.forEach((insight, index) => {
        const row = makeElement("div");
        const details = makeElement("p");
        details.append(
          makeElement("strong", "", insight.title),
          makeElement("small", "", insight.detail)
        );
        row.append(
          makeElement("span", "", String(index + 1).padStart(2, "0")),
          details,
          makeElement("b", "", "AVALIAR")
        );
        insightList.append(row);
      });
    }

    const stepList = document.getElementById("finance-step-list");
    stepList.replaceChildren();
    if (!steps.length) {
      stepList.append(makeElement("li", "finance-empty", "A Luna não sugeriu passos específicos ainda."));
    } else {
      steps.forEach((step, index) => {
        const item = makeElement("li");
        const details = makeElement("div");
        details.append(
          makeElement("strong", "", step.title),
          makeElement("p", "", step.detail),
          makeElement("small", "finance-step-reason", `Por que isso ajuda: ${step.reason}`)
        );
        item.append(
          makeElement("span", "", String(index + 1).padStart(2, "0")),
          details,
          makeElement("i", "", "○")
        );
        stepList.append(item);
      });
    }
  };

  const normalizeQuestion = (text) =>
    text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

  const saveGuidanceContext = () => {
    try {
      localStorage.setItem(guidanceKey, JSON.stringify({
        questions: guidanceQuestions,
        answers: guidanceAnswers,
      }));
      return true;
    } catch {
      guidanceStatus.textContent = "Não foi possível salvar as perguntas e respostas neste navegador.";
      return false;
    }
  };

  const renderGuidanceQuestions = (questions) => {
    if (!dashboard) return;
    const container = document.getElementById("finance-guidance-questions");
    const saveButton = document.querySelector('#finance-guidance-form button[type="submit"]');
    const existingAnswers = new Map(guidanceAnswers.map((entry) => [
      normalizeQuestion(entry.question),
      entry.answer,
    ]));
    guidanceQuestions = questions;
    container.replaceChildren();
    saveButton.disabled = !questions.length;
    if (!questions.length) {
      container.append(makeElement("p", "finance-empty", "A Luna ainda não encontrou outra pergunta necessária. Continue a conversa para atualizar esta parte."));
      saveGuidanceContext();
      return;
    }

    questions.forEach((question, index) => {
      const field = makeElement("div", "finance-guidance-question");
      const questionId = `finance-guidance-question-${index + 1}`;
      const label = makeElement("label", "", question.question);
      label.htmlFor = questionId;
      const textarea = makeElement("textarea");
      textarea.id = questionId;
      textarea.name = `question-${index + 1}`;
      textarea.maxLength = 500;
      textarea.rows = 2;
      textarea.placeholder = question.placeholder;
      textarea.dataset.guidanceQuestion = question.question;
      textarea.value = existingAnswers.get(normalizeQuestion(question.question)) || "";
      field.append(label, textarea, makeElement("small", "", question.reason));
      container.append(field);
    });
    saveGuidanceContext();
  };

  const isGuidanceList = (items, includeReason = false) =>
    Array.isArray(items) &&
    items.length <= 5 &&
    items.every((item) =>
      item &&
      typeof item.title === "string" &&
      item.title.trim().length > 0 &&
      item.title.length <= 80 &&
      typeof item.detail === "string" &&
      item.detail.trim().length > 0 &&
      item.detail.length <= 240 &&
      (!includeReason || (
        typeof item.reason === "string" &&
        item.reason.trim().length > 0 &&
        item.reason.length <= 200
      ))
    );

  const isGuidanceQuestionList = (questions) =>
    Array.isArray(questions) &&
    questions.length <= 3 &&
    questions.every((question) =>
      question &&
      typeof question.question === "string" &&
      question.question.trim().length > 0 &&
      question.question.length <= 180 &&
      typeof question.placeholder === "string" &&
      question.placeholder.length <= 120 &&
      typeof question.reason === "string" &&
      question.reason.trim().length > 0 &&
      question.reason.length <= 180
    );

  const applyDashboardUpdates = (updates) => {
    const nextItems = [...dashboardItems];
    for (const update of updates) {
      if (update.action === "add") {
        if (nextItems.length >= 50) {
          status.textContent = "O painel atingiu o limite de 50 itens. Apague um item antes de adicionar outro.";
          return false;
        }
        nextItems.push({
          id: crypto.randomUUID().replace(/-/g, ""),
          name: update.name.trim(),
          category: update.category,
          amount: update.amount,
          currency: update.currency,
          cadence: update.cadence,
        });
      } else {
        const index = nextItems.findIndex((item) => item.id === update.id);
        if (index === -1) {
          status.textContent = "Esse item já não existe no painel.";
          return false;
        }
        if (update.action === "remove") {
          nextItems.splice(index, 1);
        } else {
          nextItems[index] = {
            id: update.id,
            name: update.name.trim(),
            category: update.category,
            amount: update.amount,
            currency: update.currency,
            cadence: update.cadence,
          };
        }
      }
    }
    if (!saveDashboard(nextItems)) return false;
    dashboardItems = nextItems;
    renderDashboard();
    return true;
  };

  const presentUpdates = (updates) => {
    if (fullControl) {
      if (applyDashboardUpdates(updates)) {
        status.textContent = "O painel foi atualizado.";
      }
      return;
    }

    updates.forEach((update) => {
      const action = update.action === "add"
        ? "Adicionar"
        : update.action === "remove"
          ? "Remover"
          : "Atualizar";
      const amount = update.amount === null
        ? "valor não informado"
        : formatMoney(update.amount, update.currency);
      const details = `${update.name} · ${categories[update.category]} · ${amount} · ${cadences[update.cadence]}`;
      showChatAuthorization(
        `${action} este item no painel?`,
        details,
        () => {
          if (applyDashboardUpdates([update])) status.textContent = "Item autorizado e painel atualizado.";
        },
        () => { status.textContent = "A alteração não foi aplicada."; }
      );
    });
  };

  if (dashboard) {
    initializeScientificCalculator();
    dashboardItems = readDashboard();
    const currencySelect = document.getElementById("finance-currency-select");
    currencySelect.addEventListener("change", renderDashboard);
    const guidanceForm = document.getElementById("finance-guidance-form");
    try {
      const savedPreferences = localStorage.getItem(guidanceKey);
      if (savedPreferences) {
        const parsedContext = JSON.parse(savedPreferences);
        if (
          !parsedContext ||
          !Array.isArray(parsedContext.questions) ||
          !isGuidanceQuestionList(parsedContext.questions) ||
          !Array.isArray(parsedContext.answers) ||
          parsedContext.answers.length > 12 ||
          !parsedContext.answers.every((answer) =>
            answer &&
            typeof answer.question === "string" &&
            answer.question.trim().length > 0 &&
            answer.question.length <= 180 &&
            typeof answer.answer === "string" &&
            answer.answer.trim().length > 0 &&
            answer.answer.length <= 500
          )
        ) {
          throw new Error("As perguntas e respostas salvas estão inválidas.");
        }
        guidanceQuestions = parsedContext.questions;
        guidanceAnswers = parsedContext.answers;
      } else {
        const legacyValue = localStorage.getItem(legacyGuidanceKey);
        if (legacyValue) {
          const legacyPreferences = JSON.parse(legacyValue);
          const legacyLabels = {
            priority: {
              unsure: "Ainda estou entendendo",
              bills: "Contas e vencimentos",
              debt: "Dívidas e parcelas",
              essentials: "Despesas essenciais",
              income: "Renda e trabalho",
              goal: "Um objetivo de compra",
            },
            challenge: {
              unsure: "Ainda não sei",
              late: "Evitar atrasos",
              "tight-budget": "Fazer o dinheiro durar",
              "irregular-income": "Lidar com renda variável",
              planning: "Planejar uma compra ou objetivo",
              tracking: "Acompanhar o que entra e sai",
            },
            horizon: {
              unsure: "Sem prazo definido",
              today: "Hoje",
              week: "Nesta semana",
              month: "Neste mês",
              future: "Mais para frente",
            },
          };
          const legacyQuestions = {
            priority: "O que você quer priorizar?",
            challenge: "O que está mais difícil agora?",
            horizon: "Quando você precisa de ajuda?",
          };
          guidanceAnswers = Object.keys(legacyQuestions)
            .filter((key) => legacyLabels[key][legacyPreferences[key]] && legacyPreferences[key] !== "unsure")
            .map((key) => ({
              question: legacyQuestions[key],
              answer: legacyLabels[key][legacyPreferences[key]],
            }));
          if (guidanceAnswers.length && saveGuidanceContext()) {
            localStorage.removeItem(legacyGuidanceKey);
          }
        }
      }
    } catch (error) {
      guidanceStatus.textContent = error.message || "Não foi possível carregar suas respostas.";
    }
    renderGuidanceQuestions(guidanceQuestions);
    guidanceForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const currentAnswers = Array.from(
        guidanceForm.querySelectorAll("[data-guidance-question]")
      )
        .map((field) => ({
          question: field.dataset.guidanceQuestion,
          answer: field.value.trim(),
        }));
      const answersByQuestion = new Map(guidanceAnswers.map((entry) => [
        normalizeQuestion(entry.question),
        entry,
      ]));
      currentAnswers.forEach((entry) => {
        const key = normalizeQuestion(entry.question);
        if (entry.answer) answersByQuestion.set(key, entry);
        else answersByQuestion.delete(key);
      });
      guidanceAnswers = [...answersByQuestion.values()].slice(-12);
      if (!saveGuidanceContext()) return;
      guidanceStatus.textContent = currentAnswers.some((entry) => entry.answer)
        ? "Respostas salvas. A Luna vai considerá-las na próxima mensagem."
        : "Não há respostas para salvar ainda.";
    });
    renderDashboard();
    const controlToggle = document.getElementById("ai-control-toggle");
    try {
      fullControl = localStorage.getItem(controlKey) === "true";
    } catch {
      status.textContent = "Não foi possível carregar a preferência de controle.";
    }
    const renderControl = () => {
      controlToggle.setAttribute("aria-pressed", String(fullControl));
      controlToggle.textContent = fullControl ? "Controle total: ativado" : "Controle total";
    };
    renderControl();
    controlToggle.addEventListener("click", () => {
      if (fullControl) {
        try {
          localStorage.setItem(controlKey, "false");
          fullControl = false;
          renderControl();
          status.textContent = "Controle total desativado.";
        } catch {
          status.textContent = "Não foi possível alterar o controle total.";
        }
        return;
      }
      showChatAuthorization(
        "Autorizar Controle total?",
        "A IA poderá enviar cada mensagem, o histórico recente, o painel e as respostas do questionário ao serviço de IA sem pedir confirmação de novo. Também poderá adicionar, editar e remover itens do painel automaticamente. O envio só acontece quando você envia uma mensagem.",
        () => {
          try {
            localStorage.setItem(controlKey, "true");
            fullControl = true;
            renderControl();
            status.textContent = "Controle total ativado.";
          } catch {
            status.textContent = "Não foi possível ativar o controle total.";
          }
        },
        () => { status.textContent = "Controle total não foi ativado."; }
      );
    });
    document.getElementById("clear-dashboard")?.addEventListener("click", () => {
      showChatAuthorization(
        "Apagar os dados do painel?",
        "Isso remove todos os itens e gráficos salvos neste navegador.",
        () => {
          try {
            localStorage.removeItem(dashboardKey);
            localStorage.removeItem(controlKey);
            localStorage.removeItem(guidanceKey);
            localStorage.removeItem(legacyGuidanceKey);
            dashboardItems = [];
            fullControl = false;
            guidanceQuestions = [];
            guidanceAnswers = [];
            renderGuidanceQuestions([]);
            localStorage.removeItem(guidanceKey);
            guidanceStatus.textContent = "As respostas ficam neste navegador.";
            renderDashboard();
            renderGuidance([], []);
            renderControl();
            storageError = "";
            status.textContent = "Os dados do painel foram apagados.";
          } catch {
            status.textContent = "Não foi possível apagar os dados do painel.";
          }
        },
        () => { status.textContent = "Os dados do painel foram mantidos."; }
      );
    });
  }

  const scrollConversationToBottom = () => {
    requestAnimationFrame(() => {
      conversation.style.scrollBehavior = "auto";
      conversation.scrollTop = conversation.scrollHeight;
      conversation.style.removeProperty("scroll-behavior");
    });
  };

  const addMessage = (text, role) => {
    const node = document.createElement("div");
    node.className = `message ${role}`;
    node.textContent = text;
    conversation.appendChild(node);
    scrollConversationToBottom();
    return node;
  };

  const sendMessage = async (text) => {
    if (requestInFlight) return;
    if (storageError) {
      status.textContent = storageError;
      return;
    }

    requestInFlight = true;
    const userMessage = addMessage(text, "user");
    input.value = "";
    status.textContent = "A Luna está pensando...";
    submitButton.disabled = true;
    submitButton.textContent = "Pensando...";
    submitButton.setAttribute("aria-busy", "true");
    conversation.setAttribute("aria-busy", "true");
    clear.disabled = true;
    suggestions.forEach((button) => { button.disabled = true; });

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: text }].slice(-maxMessages),
          ...(dashboard ? { dashboard: dashboardItems } : {}),
          ...(dashboard ? {
            guidanceContext: {
              questions: guidanceQuestions,
              answers: guidanceAnswers,
            },
          } : {}),
          dataConsent: true,
        }),
      });
      let result;
      try {
        result = await response.json();
      } catch {
        throw new Error("O backend retornou uma resposta inválida. Confira se o servidor está atualizado.");
      }
      if (!response.ok) {
        throw new Error(result.error || "Não foi possível obter uma resposta da Luna.");
      }
      if (typeof result.reply !== "string" || !result.reply.trim()) {
        throw new Error("A IA não retornou uma resposta. Tente novamente.");
      }
      if (dashboard) {
        if (
          !isGuidanceList(result.insights) ||
          !isGuidanceList(result.steps, true) ||
          !isGuidanceQuestionList(result.questions)
        ) {
          throw new Error("A IA retornou sugestões ou perguntas inválidas. Tente novamente.");
        }
        const validUpdates = Array.isArray(result.updates) &&
          result.updates.length <= 8 &&
          result.updates.every((update) =>
            update &&
            ["add", "update", "remove"].includes(update.action) &&
            (update.action === "add"
              ? update.id === null
              : dashboardItems.some((item) => item.id === update.id)) &&
            typeof update.name === "string" &&
            update.name.trim().length > 0 &&
            update.name.length <= 80 &&
            Object.hasOwn(categories, update.category) &&
            (update.currency === null || Object.hasOwn(currencies, update.currency)) &&
            (update.amount === null || (
              typeof update.amount === "number" &&
              Number.isFinite(update.amount) &&
              update.amount >= 0 &&
              update.amount <= 1e10 &&
              Object.hasOwn(currencies, update.currency)
            )) &&
            Object.hasOwn(cadences, update.cadence)
          );
        if (!validUpdates) {
          throw new Error("A IA retornou alterações inválidas para o painel. Tente novamente.");
        }
        renderGuidance(result.insights, result.steps);
        renderGuidanceQuestions(result.questions);
      }

      messages.push({ role: "user", content: text }, { role: "assistant", content: result.reply });
      if (messages.length > maxMessages) messages.splice(0, messages.length - maxMessages);
      addMessage(result.reply, "assistant");
      updateSuggestions();
      if (dashboard) presentUpdates(result.updates);
      status.textContent = "Resposta gerada.";
    } catch (error) {
      userMessage.remove();
      input.value = text;
      status.textContent = error instanceof TypeError
        ? "Não foi possível conectar ao backend. Inicie o servidor Node.js com npm start."
        : error.message;
      input.focus();
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = submitLabel;
      submitButton.removeAttribute("aria-busy");
      conversation.removeAttribute("aria-busy");
      clear.disabled = false;
      requestInFlight = false;
      suggestions.forEach((button) => { button.disabled = false; });
    }
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (requestInFlight || sendAuthorizationPending) return;
    const text = input.value.trim();
    if (!text) {
      status.textContent = "Digite uma mensagem antes de enviar.";
      input.focus();
      return;
    }

    if (fullControl) {
      sendMessage(text);
      return;
    }

    sendAuthorizationPending = true;
    const historyCount = Math.min(messages.length, maxMessages - 1);
    const panelCount = dashboardItems.length;
    const hasGuidanceAnswers = dashboard && guidanceAnswers.length > 0;
    const details = dashboard
      ? `A mensagem, até ${historyCount} mensagens recentes, ${panelCount} itens do painel${hasGuidanceAnswers ? " e suas respostas ao questionário" : ""} serão enviados à IA da Luna.`
      : `A mensagem e até ${historyCount} mensagens recentes serão enviados à IA da Luna.`;
    showChatAuthorization(
      "Autorizar este envio?",
      details,
      () => {
        sendAuthorizationPending = false;
        sendMessage(text);
      },
      () => {
        sendAuthorizationPending = false;
        status.textContent = "Envio cancelado.";
        input.focus();
      }
    );
  });

  suggestions.forEach((button) => {
    button.addEventListener("click", () => {
      input.value = button.textContent;
      input.focus();
    });
  });

  clear.addEventListener("click", () => {
    if (requestInFlight || sendAuthorizationPending) return;
    showChatAuthorization(
      "Limpar a conversa?",
      "Isso remove as mensagens exibidas nesta página.",
      () => {
        messages.length = 0;
        conversation.replaceChildren();
        if (opening) addMessage(opening, "assistant");
        renderGuidance([], []);
        suggestionButtons.forEach((button, index) => {
          button.textContent = defaultSuggestions[index];
        });
        status.textContent = "Conversa limpa.";
        input.focus();
      },
      () => { status.textContent = "A conversa foi mantida."; }
    );
  });
})();
