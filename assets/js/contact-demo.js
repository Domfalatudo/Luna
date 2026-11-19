(() => {
  const form = document.getElementById("contact-form");
  if (!form) return;
  const status = document.getElementById("contact-status");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) {
      status.textContent = "Confira os campos obrigatórios e o formato do e-mail.";
      return;
    }
    status.textContent = "Validação concluída. A mensagem não foi enviada; configure um serviço de recebimento para habilitar o contato.";
  });
})();
