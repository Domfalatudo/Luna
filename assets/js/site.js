(() => {
  const transitionKey = "robot-site-transition";
  let navigating = false;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  if (finePointer.matches) {
    document.documentElement.classList.add("has-site-cursor");
    const cursor = document.createElement("div");
    cursor.className = "site-cursor";
    cursor.setAttribute("aria-hidden", "true");
    cursor.innerHTML = `<svg class="site-cursor-icon cursor-arrow" viewBox="0 0 28 34"><path d="M3.5 2.5v24l6.4-6.1 4.1 10 4-1.7-4.2-9.7h9.1L3.5 2.5Z"/></svg>
      <svg class="site-cursor-icon cursor-hand" viewBox="0 0 30 36"><path d="M9.5 17V8.5a2 2 0 0 1 4 0V16 6.5a2 2 0 0 1 4 0V16 8a2 2 0 0 1 4 0v9 2.5l1-2a2 2 0 0 1 3.5 2l-3.8 8.2a6 6 0 0 1-5.4 3.4h-3.1a6 6 0 0 1-4.8-2.4L4.2 22a2.1 2.1 0 0 1 3.1-2.8L9.5 21V17Z"/></svg>
      <svg class="site-cursor-icon cursor-busy" viewBox="0 0 32 32"><g><circle cx="16" cy="16" r="11.5"/><path d="M16 4.5v4M27.5 16h-4M16 27.5v-4M4.5 16h4"/></g><circle class="cursor-busy-core" cx="16" cy="16" r="2.5"/></svg>
      <svg class="site-cursor-icon cursor-unavailable" viewBox="0 0 32 32"><circle cx="16" cy="16" r="11.5"/><path d="m8 24 16-16"/></svg>
      <svg class="site-cursor-icon cursor-text" viewBox="0 0 20 30"><path d="M10 3v24M5 3h10M5 27h10"/></svg>`;
    document.body.append(cursor);
    let cursorFrame = 0;
    let pointerX = 0;
    let pointerY = 0;
    let cursorTarget;
    const setCursorState = () => {
      cursorFrame = 0;
      if (!cursorTarget) return;
      const blocked = cursorTarget.matches(":disabled, [aria-disabled='true'], [data-cursor='unavailable']") ||
        cursorTarget.closest("[aria-disabled='true'], [data-cursor='unavailable']");
      const busy = cursorTarget.matches("[aria-busy='true'], [data-cursor='busy']") ||
        cursorTarget.closest("[aria-busy='true'], [data-cursor='busy']") ||
        document.documentElement.getAttribute("aria-busy") === "true";
      const isText = cursorTarget.matches("input:not([type='button']):not([type='submit']):not([type='reset']):not([type='checkbox']):not([type='radio']), textarea, [contenteditable='true']");
      let state = "arrow";
      if (busy) state = "busy";
      else if (blocked) state = "unavailable";
      else if (isText) state = "text";
      else if (cursorTarget.closest("a[href], button:not(:disabled), [role='button'], summary, label[for], select, [data-cursor='pointer']") ||
        window.getComputedStyle(cursorTarget).cursor === "pointer") state = "hand";
      cursor.dataset.state = state;
      cursor.style.transform = `translate3d(${pointerX}px, ${pointerY}px, 0)`;
    };
    const updateCursor = (event) => {
      if (event.pointerType !== "mouse") return;
      pointerX = event.clientX;
      pointerY = event.clientY;
      cursorTarget = event.target instanceof Element ? event.target : event.target.parentElement || document.documentElement;
      cursor.classList.add("is-visible");
      if (!cursorFrame) cursorFrame = window.requestAnimationFrame(setCursorState);
    };
    const refreshCursorState = () => {
      cursorTarget = document.elementFromPoint(pointerX, pointerY);
      if (!cursorFrame) cursorFrame = window.requestAnimationFrame(setCursorState);
    };
    const cursorObserver = new MutationObserver(refreshCursorState);
    cursorObserver.observe(document.documentElement, {
      attributes: true,
      subtree: true,
      attributeFilter: ["aria-busy", "aria-disabled", "data-cursor", "disabled"]
    });
    window.addEventListener("pointermove", updateCursor, { passive: true });
    window.addEventListener("pointerout", (event) => {
      if (!event.relatedTarget) cursor.classList.remove("is-visible");
    });
    window.addEventListener("blur", () => cursor.classList.remove("is-visible"));
    window.addEventListener("pagehide", () => {
      window.cancelAnimationFrame(cursorFrame);
      cursorObserver.disconnect();
      window.removeEventListener("pointermove", updateCursor);
      cursor.remove();
    }, { once: true });
  }
  if (!prefersReducedMotion) {
    const flareLayer = document.createElement("div");
    flareLayer.className = "selection-flares";
    flareLayer.setAttribute("aria-hidden", "true");
    document.body.append(flareLayer);
    let selectionFrame = 0;
    let selectionTimer;
    const renderSelectionFlares = () => {
      selectionFrame = 0;
      window.clearTimeout(selectionTimer);
      flareLayer.replaceChildren();
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.toString().trim()) return;
      const range = selection.getRangeAt(0);
      const node = range.commonAncestorContainer;
      const element = node instanceof Element ? node : node.parentElement;
      if (element && element.closest("input, textarea, select, [contenteditable='true']")) return;
      [...range.getClientRects()].slice(0, 60).forEach((rect, index) => {
        if (rect.width < 3 || rect.height < 3) return;
        const flare = document.createElement("span");
        flare.className = "selection-flare";
        flare.style.left = `${rect.left}px`;
        flare.style.top = `${rect.bottom - 1}px`;
        flare.style.width = `${rect.width}px`;
        flare.style.animationDelay = `${Math.min(index * 12, 120)}ms`;
        flareLayer.append(flare);
      });
      selectionTimer = window.setTimeout(() => flareLayer.replaceChildren(), 900);
    };
    document.addEventListener("selectionchange", () => {
      if (!selectionFrame) selectionFrame = window.requestAnimationFrame(renderSelectionFlares);
    });

    if (finePointer.matches) {
      const sparkleLayer = document.createElement("div");
      sparkleLayer.className = "click-sparkles";
      sparkleLayer.setAttribute("aria-hidden", "true");
      document.body.append(sparkleLayer);
      const removeSparkle = (sparkle) => sparkle.remove();
      const sparkleAtClick = (event) => {
        if (event.button !== 0 || event.pointerType !== "mouse") return;
        const sparkle = document.createElement("span");
        sparkle.className = "click-sparkle";
        sparkle.style.left = `${event.clientX}px`;
        sparkle.style.top = `${event.clientY}px`;
        [[-13, -12], [13, -11], [-12, 12], [13, 12]].forEach(([x, y], index) => {
          const star = document.createElement("span");
          star.className = "click-sparkle-star";
          star.style.setProperty("--spark-x", `${x}px`);
          star.style.setProperty("--spark-y", `${y}px`);
          star.style.animationDelay = `${index * 18}ms`;
          sparkle.append(star);
        });
        sparkleLayer.append(sparkle);
        sparkle.addEventListener("animationend", () => removeSparkle(sparkle), { once: true });
        window.setTimeout(() => removeSparkle(sparkle), 700);
      };
      document.addEventListener("click", sparkleAtClick, { capture: true });
      window.addEventListener("pagehide", () => {
        document.removeEventListener("click", sparkleAtClick, { capture: true });
        sparkleLayer.remove();
      }, { once: true });
    }

    window.addEventListener("pagehide", () => {
      window.cancelAnimationFrame(selectionFrame);
      window.clearTimeout(selectionTimer);
      flareLayer.remove();
    }, { once: true });
  }
  const scrollbarEdge = 28;
  const scrollbarHideDelay = 700;
  let scrollbarHideTimer;
  const showScrollbarsNearEdge = (event) => {
    if (event.pointerType !== "mouse") return;
    const nearScrollbar = event.clientX >= window.innerWidth - scrollbarEdge ||
      event.clientX <= scrollbarEdge;
    window.clearTimeout(scrollbarHideTimer);
    document.documentElement.classList.toggle("scrollbars-visible", nearScrollbar);
    if (!nearScrollbar) {
      scrollbarHideTimer = window.setTimeout(() => {
        document.documentElement.classList.remove("scrollbars-visible");
      }, scrollbarHideDelay);
    }
  };
  window.addEventListener("pointermove", showScrollbarsNearEdge, { passive: true });
  window.addEventListener("blur", () => {
    window.clearTimeout(scrollbarHideTimer);
    document.documentElement.classList.remove("scrollbars-visible");
  });
  window.addEventListener("pagehide", () => {
    window.clearTimeout(scrollbarHideTimer);
    window.removeEventListener("pointermove", showScrollbarsNearEdge);
  }, { once: true });
  const transitionLayer = document.createElement("div");
  transitionLayer.id = "page-transition";
  transitionLayer.setAttribute("aria-hidden", "true");
  document.body.prepend(transitionLayer);

  let pendingDestination = "";
  try {
    pendingDestination = sessionStorage.getItem(transitionKey) || "";
    sessionStorage.removeItem(transitionKey);
  } catch {
    pendingDestination = "";
  }

  if (!prefersReducedMotion && pendingDestination === window.location.href) {
    transitionLayer.classList.add("is-entering");
    transitionLayer.addEventListener("animationend", () => {
      transitionLayer.remove();
    }, { once: true });
  } else {
    transitionLayer.remove();
  }

  document.addEventListener("click", (event) => {
    if (prefersReducedMotion || navigating || event.defaultPrevented || event.button !== 0 ||
      event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const target = event.target instanceof Element ? event.target : event.target.parentElement;
    const link = target && target.closest("a[href]");
    if (!link || link.target || link.hasAttribute("download")) return;
    const rawHref = link.getAttribute("href");
    if (!rawHref || rawHref.startsWith("#") || rawHref.startsWith("/") ||
      rawHref.includes(":")) return;

    const destination = new URL(link.href, window.location.href);
    if (destination.protocol !== window.location.protocol ||
      destination.host !== window.location.host ||
      (destination.pathname === window.location.pathname &&
        destination.search === window.location.search &&
        destination.hash !== "")) return;
    if (destination.href === window.location.href) return;

    event.preventDefault();
    navigating = true;
    if (finePointer.matches) document.documentElement.setAttribute("aria-busy", "true");
    try {
      sessionStorage.setItem(transitionKey, destination.href);
    } catch {
      // The outgoing transition still works if session storage is unavailable.
    }
    transitionLayer.classList.add("is-leaving");

    let fallbackTimer = window.setTimeout(() => {
      window.location.assign(destination.href);
    }, 1000);
    transitionLayer.addEventListener("animationend", () => {
      window.clearTimeout(fallbackTimer);
      window.location.assign(destination.href);
    }, { once: true });
  });

  const root = document.body.dataset.root || "./";
  const page = document.body.dataset.page || "";
  const navItems = [
    ["Início", "index.html", "inicio"],
    ["Sobre", "pages/sobre.html", "sobre"],
    ["Creators", "pages/creators.html", "creators"],
    ["Explorar", "pages/modelo-3d.html", "modelo"],
    ["Atualizações", "pages/noticias.html", "noticias"]
  ];
  const header = document.getElementById("site-header");
  if (header) {
    header.className = "site-header";
    header.innerHTML = `<a class="brand" href="${root}index.html">Luna <span>apoio financeiro</span></a>
      <div class="nav-wrap"><button class="menu-toggle" type="button" aria-expanded="false" aria-controls="main-nav">Menu</button>
      <nav class="site-nav" id="main-nav" aria-label="Navegação principal">${navItems.map(([label, href, key]) => `<a href="${root}${href}"${page === key ? ' aria-current="page"' : ""}>${label}</a>`).join("")}
      <a class="nav-cta" href="${root}pages/app-robo.html"${page === "app" ? ' aria-current="page"' : ""}>Aplicativo da Luna</a><span class="nav-indicator" aria-hidden="true"></span></nav></div>`;
    const toggle = header.querySelector(".menu-toggle");
    const nav = header.querySelector(".site-nav");
    const indicator = nav.querySelector(".nav-indicator");
    const navLinks = [...nav.querySelectorAll("a")];
    const currentLink = nav.querySelector('a[aria-current="page"]');
    const moveIndicator = (link) => {
      const isMobile = window.matchMedia("(max-width: 640px)").matches;
      if (!link || (isMobile && !nav.classList.contains("is-open"))) return;
      const navRect = nav.getBoundingClientRect();
      const linkRect = link.getBoundingClientRect();
      indicator.style.width = `${linkRect.width}px`;
      indicator.style.transform = `translateX(${linkRect.left - navRect.left}px)`;
      indicator.style.top = `${linkRect.bottom - navRect.top + 2}px`;
      indicator.classList.add("is-visible");
    };
    navLinks.forEach((link) => {
      link.addEventListener("pointerenter", () => moveIndicator(link));
      link.addEventListener("focus", () => moveIndicator(link));
    });
    nav.addEventListener("pointerleave", () => moveIndicator(currentLink));
    nav.addEventListener("focusout", (event) => {
      if (!nav.contains(event.relatedTarget)) moveIndicator(currentLink);
    });
    if (currentLink) requestAnimationFrame(() => moveIndicator(currentLink));
    window.addEventListener("resize", () => moveIndicator(currentLink));
    toggle.addEventListener("click", () => {
      const opened = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!opened));
      nav.classList.toggle("is-open", !opened);
      if (!opened) {
        window.clearTimeout(hideHeaderTimer);
        header.classList.remove("is-hidden");
        requestAnimationFrame(() => moveIndicator(currentLink));
      } else {
        scheduleHeaderHide();
      }
    });

    const scrollThreshold = 8;
    const hideDelay = 2500;
    let hideHeaderTimer;
    let scrollFrame = 0;
    let previousScrollY = Math.max(0, window.scrollY);
    const canHideHeader = () => window.scrollY > 48 &&
      toggle.getAttribute("aria-expanded") !== "true" && !header.matches(":focus-within");
    const scheduleHeaderHide = () => {
      window.clearTimeout(hideHeaderTimer);
      if (!canHideHeader()) return;
      hideHeaderTimer = window.setTimeout(() => {
        if (canHideHeader()) header.classList.add("is-hidden");
      }, hideDelay);
    };
    const handleScroll = () => {
      if (scrollFrame) return;
      scrollFrame = window.requestAnimationFrame(() => {
        scrollFrame = 0;
        const currentScrollY = Math.max(0, window.scrollY);
        const delta = currentScrollY - previousScrollY;
        if (currentScrollY <= 48) {
          previousScrollY = currentScrollY;
          window.clearTimeout(hideHeaderTimer);
          header.classList.remove("is-hidden");
          return;
        }
        if (Math.abs(delta) >= scrollThreshold) {
          previousScrollY = currentScrollY;
          if (delta > 0) {
            if (canHideHeader()) header.classList.add("is-hidden");
          } else {
            header.classList.remove("is-hidden");
          }
        }
        scheduleHeaderHide();
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    header.addEventListener("focusin", () => {
      window.clearTimeout(hideHeaderTimer);
      header.classList.remove("is-hidden");
    });
    header.addEventListener("focusout", (event) => {
      if (!header.contains(event.relatedTarget)) scheduleHeaderHide();
    });
    window.addEventListener("resize", scheduleHeaderHide);
    window.addEventListener("pagehide", () => {
      window.clearTimeout(hideHeaderTimer);
      if (scrollFrame) window.cancelAnimationFrame(scrollFrame);
    }, { once: true });
    scheduleHeaderHide();
  }
  const footer = document.getElementById("site-footer");
  if (footer) {
    footer.className = "site-footer";
    footer.innerHTML = `<div class="footer-inner"><div><a class="brand" href="${root}index.html">Luna <span>apoio financeiro</span></a><p>Proposta em desenvolvimento para transformar necessidades financeiras em próximos passos práticos. Esta interface é demonstrativa.</p><span class="small-note">© ${new Date().getFullYear()} · Base demonstrativa</span></div>
      <nav class="footer-links" aria-label="Links institucionais"><a href="${root}pages/sobre.html">Sobre</a><a href="${root}pages/referencias.html">Referências</a><a href="${root}pages/contato.html">Contato</a><a href="${root}pages/privacidade.html">Privacidade</a></nav></div>`;
  }

  const mobileLinks = [
    { label: "Início", href: "index.html", pages: ["inicio"], icon: "M3 10.5 12 3l9 7.5M5.5 9v11h13V9M9 20v-6h6v6" },
    { label: "Luna", href: "pages/app-robo.html", pages: ["app"], icon: "M8 7V4m8 3V4M5 10h14v10H5zM8 14h.01M16 14h.01M9 17h6" },
    { label: "3D", href: "pages/modelo-3d.html", pages: ["modelo"], icon: "m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5" },
    { label: "IA", href: "pages/ia.html", pages: ["ia"], icon: "M4 5h16v12H9l-5 4V5Zm4 5h.01M12 10h.01M16 10h.01" }
  ];
  const moreLinks = [
    ["Sobre", "pages/sobre.html", "sobre"],
    ["Creators", "pages/creators.html", "creators"],
    ["Jogo da velha", "pages/jogo.html", "jogo"],
    ["Atualizações", "pages/noticias.html", "noticias"],
    ["Referências", "pages/referencias.html", "referencias"],
    ["Contato", "pages/contato.html", "contato"],
    ["Privacidade", "pages/privacidade.html", "privacidade"]
  ];
  const mobileDock = document.createElement("div");
  mobileDock.className = "mobile-navigation";
  mobileDock.innerHTML = `<div class="mobile-more-backdrop" data-close-mobile-menu hidden></div>
    <nav class="mobile-more-panel" id="mobile-more-panel" aria-label="Outras páginas" hidden>
      <p class="eyebrow">Mais páginas</p>
      <div class="mobile-more-links">${moreLinks.map(([label, href, key]) => `<a href="${root}${href}"${page === key ? ' aria-current="page"' : ""}>${label}<span aria-hidden="true">↗</span></a>`).join("")}</div>
    </nav>
    <nav class="mobile-dock" aria-label="Navegação rápida">
      ${mobileLinks.map(({ label, href, pages, icon }) => `<a class="mobile-dock-link"${pages.includes(page) ? ' aria-current="page"' : ""} href="${root}${href}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${icon}"/></svg><span>${label}</span></a>`).join("")}
      <button class="mobile-dock-more" type="button" aria-controls="mobile-more-panel" aria-expanded="false"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg><span>Mais</span></button>
    </nav>`;
  document.body.append(mobileDock);
  const moreButton = mobileDock.querySelector(".mobile-dock-more");
  const morePanel = mobileDock.querySelector(".mobile-more-panel");
  const backdrop = mobileDock.querySelector(".mobile-more-backdrop");
  const closeMoreMenu = () => {
    moreButton.setAttribute("aria-expanded", "false");
    moreButton.classList.remove("is-active");
    morePanel.hidden = true;
    backdrop.hidden = true;
  };
  moreButton.addEventListener("click", () => {
    const opened = moreButton.getAttribute("aria-expanded") === "true";
    moreButton.setAttribute("aria-expanded", String(!opened));
    moreButton.classList.toggle("is-active", !opened);
    morePanel.hidden = opened;
    backdrop.hidden = opened;
  });
  backdrop.addEventListener("click", closeMoreMenu);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMoreMenu();
  });
  window.addEventListener("resize", () => {
    if (window.matchMedia("(min-width: 641px)").matches) closeMoreMenu();
  });

  if (page !== "ia") {
    const assistant = document.createElement("aside");
    assistant.className = "assistant-widget";
    assistant.innerHTML = `<section class="assistant-card" id="assistant-card" aria-label="Atalho para o chat da Luna" aria-hidden="true" hidden>
        <div class="assistant-card-heading"><span class="assistant-face assistant-face-small" aria-hidden="true"><i></i><b></b></span><div><strong>Luna</strong></div><button class="assistant-close icon-close-button" type="button" aria-label="Fechar mini chat"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4.5 4.5 7 7m0-7-7 7"/></svg></button></div>
        <p class="assistant-message" id="assistant-message" aria-live="polite"></p>
        <a class="button assistant-open-link" href="${root}pages/ia.html">Conversar com a Luna <span aria-hidden="true">↗</span></a>
      </section>
      <button class="assistant-launcher" type="button" aria-label="Abrir atalho para o chat da Luna" aria-expanded="false" aria-controls="assistant-card">
        <span class="assistant-face" aria-hidden="true"><i></i><b></b></span><span class="assistant-launcher-label">Ajuda</span>
      </button>`;
    document.body.append(assistant);
    const launcher = assistant.querySelector(".assistant-launcher");
    const card = assistant.querySelector(".assistant-card");
    const closeButton = assistant.querySelector(".assistant-close");
    const message = assistant.querySelector(".assistant-message");
    const assistantMessage = "Oi! Eu sou a Luna. Posso ajudar você a encontrar as páginas e conhecer a proposta do projeto.";
    let assistantCloseTimer;
    let typingTimer;
    const setAssistantOpen = (opened) => {
      window.clearTimeout(assistantCloseTimer);
      window.clearInterval(typingTimer);
      launcher.setAttribute("aria-expanded", String(opened));
      assistant.classList.toggle("is-open", opened);
      assistant.classList.toggle("is-closing", !opened);
      launcher.setAttribute("aria-label", opened ? "Atalho para o chat da Luna aberto" : "Abrir atalho para o chat da Luna");
      if (opened) {
        card.hidden = false;
        card.inert = false;
        card.setAttribute("aria-hidden", "false");
        card.classList.remove("is-closing");
        card.classList.remove("is-ready");
        message.classList.remove("is-typed");
        message.textContent = "";
        void card.offsetWidth;
        card.classList.add("is-opening");
        const typingDelay = prefersReducedMotion ? 0 : 430;
        assistantCloseTimer = window.setTimeout(() => {
          if (launcher.getAttribute("aria-expanded") !== "true") return;
          if (prefersReducedMotion) {
            message.textContent = assistantMessage;
            message.classList.add("is-typed");
            card.classList.add("is-ready");
            return;
          }
          let index = 0;
          typingTimer = window.setInterval(() => {
            message.textContent += assistantMessage[index];
            index += 1;
            if (index >= assistantMessage.length) {
              window.clearInterval(typingTimer);
              message.classList.add("is-typed");
              card.classList.add("is-ready");
            }
          }, 28);
        }, typingDelay);
        closeButton.focus();
        return;
      }

      card.inert = true;
      card.setAttribute("aria-hidden", "true");
      card.classList.remove("is-opening");
      card.classList.add("is-closing");
      const finishClosing = () => {
        if (launcher.getAttribute("aria-expanded") !== "true") {
          card.hidden = true;
          card.classList.remove("is-closing");
          card.classList.remove("is-ready");
          assistant.classList.remove("is-closing");
        }
      };
      card.addEventListener("animationend", finishClosing, { once: true });
      assistantCloseTimer = window.setTimeout(finishClosing, 320);
    };
    launcher.addEventListener("click", () => setAssistantOpen(launcher.getAttribute("aria-expanded") !== "true"));
    closeButton.addEventListener("click", () => {
      setAssistantOpen(false);
      launcher.focus();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && launcher.getAttribute("aria-expanded") === "true") {
        setAssistantOpen(false);
        launcher.focus();
      }
    });
    document.addEventListener("click", (event) => {
      if (!assistant.contains(event.target) && launcher.getAttribute("aria-expanded") === "true") setAssistantOpen(false);
    });
  }

  // Skeleton loading overlay removal
  const skeletonOverlay = document.querySelector(".skeleton-overlay");
  if (skeletonOverlay) {
    const hideSkeleton = () => {
      document.documentElement.classList.add("is-loaded");
      document.body.classList.add("is-loaded");
      skeletonOverlay.classList.add("is-hidden");
      skeletonOverlay.addEventListener("transitionend", () => skeletonOverlay.remove(), { once: true });
    };
    if (document.readyState === "complete") {
      hideSkeleton();
    } else {
      window.addEventListener("load", hideSkeleton, { once: true });
    }
  }
})();
