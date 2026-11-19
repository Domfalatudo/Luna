(() => {
  const hero = document.querySelector(".landing-hero");
  if (hero) {
    const stageButtons = [...hero.querySelectorAll(".landing-stage button")];
    const eyebrow = document.getElementById("hero-eyebrow");
    const description = document.getElementById("hero-description");
    const primaryLink = document.getElementById("hero-primary-link");
    const coordinate = document.getElementById("hero-coordinate");
    const heroArt = hero.querySelector(".landing-hero-art");
    const slides = [
      {
        eyebrow: "Protótipo Luna",
        description: "Foto original do protótipo: esfera difusora branca apoiada na estrutura de madeira.",
        primary: ["Conheça o projeto", "pages/sobre.html"],
        coordinate: "ESTUDO Nº 01<br> LUNA"
      },
      {
        eyebrow: "Luna · Apoio financeiro prático",
        description: "A proposta da Luna é transformar necessidades financeiras individuais em soluções práticas e personalizadas. O conceito ainda está em desenvolvimento.",
        primary: ["Saiba mais sobre o projeto", "pages/sobre.html"],
        coordinate: "DESTAQUE Nº 02<br>PROTÓTIPO LUNA"
      },
      {
        eyebrow: "Creators · Ideias em construção",
        description: "Conheça quem está por trás do projeto e acompanhe os próximos passos à medida que forem definidos.",
        primary: ["Conheça os creators", "pages/creators.html"],
        coordinate: "ESTUDO Nº 03<br>FEITO EM EQUIPE"
      }
    ];
    let slideIndex = 0;
    let slideTimer;
    let progressFrame;
    const resetProgress = () => {
      if (progressFrame) window.cancelAnimationFrame(progressFrame);
      progressFrame = 0;
      stageButtons.forEach((button) => {
        button.classList.remove("is-counting", "is-wrapping");
        void button.offsetWidth;
      });
    };
    const pauseSlides = () => {
      window.clearTimeout(slideTimer);
      resetProgress();
    };
    const scheduleNextSlide = () => {
      pauseSlides();
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
          document.hidden || hero.matches(":hover") ||
          document.activeElement.matches(":focus-visible")) return;
      const progressButton = stageButtons[slideIndex === slides.length - 1 ? slideIndex - 1 : slideIndex];
      progressButton.classList.toggle("is-wrapping", slideIndex === slides.length - 1);
      progressFrame = window.requestAnimationFrame(() => {
        progressFrame = 0;
        if (!hero.matches(":hover") && !document.hidden) {
          progressButton.classList.add("is-counting");
        }
      });
      slideTimer = window.setTimeout(() => showSlide(slideIndex + 1), 5500);
    };
    const showSlide = (nextIndex) => {
      slideIndex = (nextIndex + slides.length) % slides.length;
      const slide = slides[slideIndex];
      hero.classList.add("is-changing");
      window.setTimeout(() => {
        eyebrow.textContent = slide.eyebrow;
        description.textContent = slide.description;
        primaryLink.href = slide.primary[1];
        primaryLink.firstChild.textContent = slide.primary[0];
        coordinate.innerHTML = slide.coordinate;
        hero.dataset.slide = String(slideIndex);
        heroArt.setAttribute("aria-label", slideIndex === 2
          ? "Prévia dos cinco cards de creators do projeto"
          : slideIndex === 1
            ? "Protótipo Luna: esfera branca aberta com estrutura mecânica interna e base de madeira"
            : "Fotografia original do protótipo Luna, com esfera difusora branca e base de madeira");
        stageButtons.forEach((button, index) => {
          button.setAttribute("aria-pressed", String(index === slideIndex));
        });
        resetProgress();
        hero.classList.remove("is-changing");
        scheduleNextSlide();
      }, 220);
    };
    stageButtons.forEach((button, index) => {
      button.addEventListener("click", () => {
        pauseSlides();
        showSlide(index);
      });
    });
    hero.addEventListener("pointerenter", pauseSlides);
    hero.addEventListener("pointerleave", scheduleNextSlide);
    hero.addEventListener("focusin", pauseSlides);
    hero.addEventListener("focusout", (event) => {
      if (!hero.contains(event.relatedTarget)) scheduleNextSlide();
    });
    document.addEventListener("visibilitychange", scheduleNextSlide);
    window.addEventListener("pagehide", pauseSlides, {once: true});
    scheduleNextSlide();
  }

  const heading = document.getElementById("home-title");
  const visual = heading?.querySelector(".typing-visual");
  if (!heading || !visual || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const lead = visual.querySelector(".typing-lead");
  const middle = visual.querySelector(".typing-middle");
  const ending = visual.querySelector(".typing-ending");
  const lines = [...visual.querySelectorAll(".typing-line")];
  const phrases = [
    {lead: "Construindo", middle: "ideias em", ending: "movimento."},
    {lead: "Luna", middle: "para criar", ending: "soluções."},
    {lead: "Tecnologia", middle: "que inspira", ending: "o futuro."},
    {lead: "Ideias que", middle: "ganham", ending: "movimento."}
  ];
  const wait = (duration) => new Promise((resolve) => window.setTimeout(resolve, duration));
  const writePhrase = async (phrase, deleting = false) => {
    const parts = [
      {element: lead, line: lines[0], text: phrase.lead},
      {element: middle, line: lines[1], text: phrase.middle},
      {element: ending, line: lines[2], text: phrase.ending}
    ];
    const characters = parts.flatMap(({element, text}) =>
      [...text].map((character) => ({element, character, line: element.closest(".typing-line")}))
    );

    if (deleting) {
      for (const {element, line} of characters.reverse()) {
        lines.forEach((item) => item.classList.toggle("is-active", item === line));
        element.textContent = element.textContent.slice(0, -1);
        await wait(38);
      }
      return;
    }

    for (const {element, character, line} of characters) {
      lines.forEach((item) => item.classList.toggle("is-active", item === line));
      element.textContent += character;
      await wait(78);
    }
  };

  let phraseIndex = 0;
  lines.forEach((line, index) => line.classList.toggle("is-active", index === 0));
  const animate = async () => {
    while (true) {
      await wait(1700);
      await writePhrase(phrases[phraseIndex], true);
      phraseIndex = (phraseIndex + 1) % phrases.length;
      await wait(280);
      await writePhrase(phrases[phraseIndex]);
    }
  };
  animate();
})();
