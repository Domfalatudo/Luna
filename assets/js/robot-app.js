(() => {
  const app = document.getElementById("activity-log");
  if (!app) return;
  class SimulationTransport {
    constructor() { this.connected = false; }
    async connect() { this.connected = true; }
    async disconnect() { this.connected = false; }
    async send(command, speed) {
      if (!this.connected) throw new Error("Demonstração encerrada.");
      return {command, speed, simulated: true};
    }
  }
  const transport = new SimulationTransport();
  let demoActive = true;
  const log = (message) => {
    const item = document.createElement("li");
    const time = document.createElement("time");
    time.dateTime = new Date().toISOString();
    time.textContent = new Intl.DateTimeFormat("pt-BR", {hour: "2-digit", minute: "2-digit", second: "2-digit"}).format(new Date());
    const description = document.createElement("span");
    description.textContent = message;
    item.append(time, description);
    app.prepend(item);
    while (app.children.length > 30) app.lastElementChild.remove();
  };
  const setState = (active) => {
    demoActive = active;
    document.getElementById("connection-state").textContent = active ? "Modo de demonstração" : "Desconectado";
    document.getElementById("connection-indicator").classList.toggle("active", active);
    document.getElementById("demo-toggle").textContent = active ? "Encerrar demonstração" : "Iniciar demonstração";
    document.getElementById("connection-note").textContent = active
      ? "Dados fictícios. Nenhuma conexão Bluetooth, Wi-Fi, USB/serial ou API está ativa."
      : "Demonstração encerrada. Nenhum dispositivo físico foi conectado.";
    document.querySelectorAll("[data-command]").forEach((button) => { button.disabled = !active; });
    document.getElementById("speed-control").disabled = !active;
    document.getElementById("distance-value").textContent = active ? "42" : "—";
    document.getElementById("battery-value").textContent = active ? "86" : "—";
    document.getElementById("motor-value").textContent = "Parados";
    document.getElementById("motion-label").textContent = active ? "Estado simulado: parado" : "Estado: indisponível";
    document.getElementById("last-update").textContent = active ? new Intl.DateTimeFormat("pt-BR", {hour:"2-digit", minute:"2-digit", second:"2-digit"}).format(new Date()) : "—";
  };
  document.getElementById("demo-toggle").addEventListener("click", async () => {
    if (demoActive) {
      await transport.disconnect();
      setState(false);
      log("Demonstração local encerrada.");
    } else {
      await transport.connect();
      setState(true);
      log("Demonstração local iniciada — estado fictício.");
    }
  });
  document.getElementById("speed-control").addEventListener("input", (event) => {
    const value = Math.max(0, Math.min(50, Number(event.target.value)));
    event.target.value = String(value);
    document.getElementById("speed-value").textContent = `${value}%`;
  });
  document.querySelectorAll("[data-command]").forEach((button) => button.addEventListener("click", async () => {
    if (!demoActive) return;
    const command = button.dataset.command;
    const speed = Number(document.getElementById("speed-control").value);
    try {
      const result = await transport.send(command, speed);
      const isMoving = result.command !== "parar";
      document.getElementById("motor-value").textContent = isMoving ? "Simulados" : "Parados";
      document.getElementById("motion-label").textContent = `Estado simulado: ${result.command}`;
      document.getElementById("command-status").textContent = `Comando "${result.command}" simulado a ${speed}%. Nenhum hardware foi acionado.`;
      document.getElementById("last-update").textContent = new Intl.DateTimeFormat("pt-BR", {hour:"2-digit", minute:"2-digit", second:"2-digit"}).format(new Date());
      log(`Comando "${result.command}" simulado a ${speed}%.`);
    } catch (error) {
      document.getElementById("command-status").textContent = error.message;
      log(`Comando rejeitado: ${error.message}`);
    }
  }));
  document.getElementById("clear-history").addEventListener("click", () => {
    app.replaceChildren();
    log("Histórico temporário limpo.");
  });
  transport.connect().then(() => {
    setState(true);
    log("Modo de demonstração local iniciado. Dados fictícios.");
  }).catch((error) => {
    setState(false);
    log(`Não foi possível iniciar a demonstração: ${error.message}`);
  });
})();
