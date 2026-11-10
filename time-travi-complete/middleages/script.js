// TIME TRACES — navigation, theme, scroll effects, timeline and gallery interactions
document.addEventListener("DOMContentLoaded", () => {
  // Keep the layout stable when an external image host is unavailable.
  const fallbackSvg = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500"><rect width="800" height="500" fill="#172536"/><path d="M0 390 210 210l130 110 130-170 330 240v110H0Z" fill="#263d50"/><circle cx="610" cy="125" r="48" fill="#c9a45e" opacity=".85"/><text x="400" y="455" fill="#e8d7b4" font-size="28" text-anchor="middle" font-family="sans-serif">Time Traces</text></svg>'
  );
  document.querySelectorAll("img").forEach(image => {
    image.addEventListener("error", () => {
      if (image.dataset.fallbackApplied) return;
      image.dataset.fallbackApplied = "true";
      image.src = fallbackSvg;
      image.classList.add("image-fallback");
    }, { once: true });
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;
  const menuButton = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".main-nav");
  const themeButton = document.querySelector(".theme-toggle");
  const progress = document.querySelector(".scroll-progress");

  // Responsive navigation: keyboard, outside-click and resize support
  if (menuButton && nav) {
    if (!nav.id) nav.id = "primary-navigation";
    menuButton.setAttribute("aria-controls", nav.id);

    const setMenuOpen = (isOpen, returnFocus = false) => {
      nav.classList.toggle("open", isOpen);
      menuButton.setAttribute("aria-expanded", String(isOpen));
      menuButton.textContent = isOpen ? "×" : "☰";
      menuButton.setAttribute("aria-label", isOpen ? "بستن منو" : "باز کردن منو");
      if (!isOpen && returnFocus) menuButton.focus();
    };

    menuButton.addEventListener("click", () => {
      setMenuOpen(!nav.classList.contains("open"));
    });
    nav.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => setMenuOpen(false));
    });
    document.addEventListener("click", event => {
      if (nav.classList.contains("open") &&
          !nav.contains(event.target) && !menuButton.contains(event.target)) {
        setMenuOpen(false);
      }
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && nav.classList.contains("open")) {
        setMenuOpen(false, true);
      }
    });
    window.addEventListener("resize", () => {
      if (window.innerWidth > 850 && nav.classList.contains("open")) {
        setMenuOpen(false);
      }
    }, { passive: true });
  }

  // Theme preference is remembered between pages
  let savedTheme = "dark";
  try { savedTheme = localStorage.getItem("timeTracesTheme") || "dark"; } catch (_) {}
  if (savedTheme === "light") body.classList.add("light-theme");
  const syncThemeControl = () => {
    if (!themeButton) return;
    const isLight = body.classList.contains("light-theme");
    themeButton.textContent = isLight ? "☾" : "☀";
    themeButton.title = isLight ? "فعال‌کردن حالت شب" : "فعال‌کردن حالت روز";
    themeButton.setAttribute("aria-label", themeButton.title);
  };
  syncThemeControl();
  themeButton?.addEventListener("click", () => {
    body.classList.toggle("light-theme");
    try { localStorage.setItem("timeTracesTheme", body.classList.contains("light-theme") ? "light" : "dark"); } catch (_) {}
    syncThemeControl();
  });

  // Reading progress bar
  const updateProgress = () => {
    if (!progress) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = `${max > 0 ? (window.scrollY / max) * 100 : 0}%`;
  };
  window.addEventListener("scroll", updateProgress, { passive: true });
  updateProgress();

  // Reveal cards as they enter the viewport
  const revealTargets = document.querySelectorAll(".era-card,.info-card,.timeline-item,.gallery-item");
  revealTargets.forEach(el => { el.style.opacity = "0"; el.style.transform = "translateY(18px)"; el.style.transition = "opacity .65s ease, transform .65s ease"; });
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = "1";
        entry.target.style.transform = "translateY(0)";
        observer.unobserve(entry.target);
      }
    }), { threshold: .12 });
    revealTargets.forEach(el => observer.observe(el));
  } else revealTargets.forEach(el => { el.style.opacity = "1"; el.style.transform = "none"; });

  // Current year in footer
  document.querySelectorAll("[data-year]").forEach(el => el.textContent = new Date().getFullYear());

  // Mark current page in the navigation
  const currentPage = body.dataset.page;
  if (currentPage && currentPage !== "explore") {
    nav?.querySelectorAll("a").forEach(link => {
      const target = link.getAttribute("href") || "";
      if (target.endsWith(`${currentPage}.html`)) link.classList.add("active");
    });
  }

  // Small interactive detail on the era cards
  document.querySelectorAll(".era-card").forEach(card => {
    card.addEventListener("pointermove", event => {
      if (window.matchMedia("(hover: none)").matches) return;
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - .5;
      const y = (event.clientY - rect.top) / rect.height - .5;
      card.style.transform = `translateY(-6px) perspective(900px) rotateY(${x * 3}deg) rotateX(${-y * 3}deg)`;
    });
    card.addEventListener("pointerleave", () => card.style.transform = "");
  });
});
/* Gallery search, category filters, slideshow, and image navigation */
document.addEventListener("DOMContentLoaded", () => {
  const gallery = document.querySelector(".gallery-grid");
  if (!gallery) return;
  const cards = [...gallery.querySelectorAll(".gallery-item")];
  const search = document.querySelector(".gallery-search");
  const filters = [...document.querySelectorAll(".filter-chip")];
  const resultLabel = document.querySelector(".gallery-results");
  const empty = document.querySelector(".gallery-empty");
  let activeFilter = "all";

  const categoryGroup = category => {
    const c = category.toLowerCase();
    if (/art|culture|painting|sculpture|manuscript/.test(c)) return "art";
    if (/technology|industry|manufacturing|factories|digital|space|innovation|objects/.test(c)) return "technology";
    return "architecture";
  };
  const filterGallery = () => {
    const term = (search?.value || "").trim().toLowerCase();
    let visible = 0;
    cards.forEach(card => {
      const haystack = `${card.dataset.title} ${card.dataset.category} ${card.querySelector("img")?.alt || ""}`.toLowerCase();
      const categoryOk = activeFilter === "all" || categoryGroup(card.dataset.category || "") === activeFilter;
      const searchOk = !term || haystack.includes(term);
      card.hidden = !(categoryOk && searchOk);
      if (!card.hidden) visible++;
    });
    if (resultLabel) resultLabel.textContent = `نمایش ${visible} از ${cards.length} تصویر`;
    if (empty) empty.hidden = visible !== 0;
  };
  search?.addEventListener("input", filterGallery);
  filters.forEach(button => button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filters.forEach(item => item.classList.toggle("active", item === button));
    filterGallery();
  }));

  const box = document.querySelector(".lightbox");
  if (!box) return;
  const boxImage = box.querySelector("img");
  const title = box.querySelector(".lightbox-title");
  const count = box.querySelector(".lightbox-count");
  const playButton = box.querySelector(".lightbox-play");
  let current = 0, timer = null;
  const visibleCards = () => cards.filter(card => !card.hidden);
  const show = index => {
    const list = visibleCards();
    if (!list.length) return;
    current = (index + list.length) % list.length;
    const card = list[current];
boxImage.removeAttribute("src");
    boxImage.src = card.querySelector("img")?.currentSrc || card.dataset.lightbox || "";
    boxImage.alt = card.dataset.title || "تصویر تاریخی";
    title.textContent = card.querySelector("img")?.alt || card.dataset.title || "تصویر تاریخی";
    count.textContent = `${current + 1} از ${list.length}`;
  };
  const stop = () => {
    if (timer) clearInterval(timer);
    timer = null;
    if (playButton) { playButton.textContent = "▶"; playButton.setAttribute("aria-label","شروع نمایش خودکار"); }
  };
  const open = index => {
    stop(); show(index);
    box.classList.add("open");
    box.setAttribute("aria-hidden","false");
    document.body.style.overflow = "hidden";
    box.querySelector(".lightbox-close").focus();
  };
  const close = () => {
    stop(); box.classList.remove("open");
    box.setAttribute("aria-hidden","true");
    document.body.style.overflow = "";
  };
  cards.forEach(card => card.addEventListener("click", () => open(visibleCards().indexOf(card))));
  box.querySelector(".lightbox-close")?.addEventListener("click", close);
  box.querySelector(".lightbox-prev")?.addEventListener("click", () => show(current - 1));
  box.querySelector(".lightbox-next")?.addEventListener("click", () => show(current + 1));
  box.addEventListener("click", event => { if (event.target === box) close(); });
  playButton?.addEventListener("click", () => {
    if (timer) { stop(); return; }
    playButton.textContent = "Ⅱ";
    playButton.setAttribute("aria-label","توقف نمایش خودکار");
    timer = setInterval(() => show(current + 1), 3200);
  });
  document.addEventListener("keydown", event => {
    if (!box.classList.contains("open")) return;
    if (event.key === "Escape") close();
    if (event.key === "ArrowLeft") show(current - 1);
    if (event.key === "ArrowRight") show(current + 1);
    if (event.key === " ") { event.preventDefault(); playButton?.click(); }
  });
  filterGallery();
});

/* Bookmarkable historical facts — saved locally in this browser */
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".info-card").forEach((card, index) => {
    const heading = card.querySelector("h3");
    if (!heading) return;
    const key = `timeTracesSaved:${document.body.dataset.page}:${heading.textContent}`;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "fact-save";
    let isSaved = false;
    try { isSaved = localStorage.getItem(key) === "yes"; } catch (_) {}
    button.textContent = isSaved ? "★ ذخیره شد" : "☆ ذخیره نکته";
    button.setAttribute("aria-pressed", String(isSaved));
    button.addEventListener("click", () => {
      const saved = button.getAttribute("aria-pressed") !== "true";
      button.setAttribute("aria-pressed", String(saved));
      button.textContent = saved ? "★ ذخیره شد" : "☆ ذخیره نکته";
      try { localStorage.setItem(key, saved ? "yes" : "no"); } catch (_) {
        button.setAttribute("aria-pressed", "false");
        button.textContent = "☆ ذخیره نکته";
      }
    });
    card.append(button);
  });
});

/* Era knowledge mini-quiz: one question selected from the current page */
document.addEventListener("DOMContentLoaded", () => {
  const questions = {
    ancienthistory: {q:"کدام رودخانه در شکل‌گیری تمدن مصر باستان نقش محوری داشت؟",a:["نیل","دانوب","تیمز"],correct:0,why:"طغیان سالانه رود نیل خاک حاصلخیزی بر جای می‌گذاشت و کشاورزی، رفت‌وآمد و شکل‌گیری سکونتگاه‌ها را ممکن می‌کرد."},
    middleages: {q:"کدام بنای یونان باستان به آتنا تقدیم شده بود؟",a:["پارتنون","پانتئون","کولوسئوم"],correct:0,why:"پارتنون بر فراز آکروپولیس آتن ساخته شده بود و به ایزدبانو آتنا تقدیم شده بود."},
    renaissance: {q:"کدام فناوری به گسترش نوشته‌های چاپی در اروپا کمک کرد؟",a:["چاپ با حروف متحرک","توربین بخار","تلگراف"],correct:0,why:"چاپ با حروف متحرک امکان تکثیر سریع‌تر و گسترده‌تر کتاب‌ها و نوشته‌ها را فراهم کرد."},
    ageofrevolutions: {q:"کدام سازمان در سال ۱۹۴۵ برای گسترش همکاری بین‌المللی تأسیس شد؟",a:["سازمان ملل متحد","جامعه ملل","اتحادیه اروپا"],correct:0,why:"سازمان ملل متحد در سال ۱۹۴۵، پس از پایان جنگ جهانی دوم، برای گسترش همکاری میان کشورها تأسیس شد."},
    modernarea: {q:"فضاپیمای آپولو ۱۱ در چه سالی فضانوردان را به سطح ماه رساند؟",a:["۱۹۶۹","۱۹۱۸","۲۰۰۱"],correct:0,why:"آپولو ۱۱ در ژوئیه سال ۱۹۶۹ بر سطح ماه فرود آمد."}
  };
  const data = questions[document.body.dataset.page];
  const host = document.querySelector(".next-era");
  if (!data || !host) return;
  const quiz = document.createElement("div");
  quiz.className = "era-quiz";
  quiz.innerHTML = `<p class="eyebrow">دانش خود را بسنجید</p><h3>آزمون کوتاه این دوره</h3><p class="quiz-question"></p><div class="quiz-options"></div><p class="quiz-feedback" aria-live="polite"></p><button type="button" class="quiz-again" hidden>تلاش دوباره</button>`;
  host.prepend(quiz);
  quiz.querySelector(".quiz-question").textContent = data.q;
  const options = quiz.querySelector(".quiz-options");
  data.a.forEach((answer,index) => {
    const button = document.createElement("button");
    button.type = "button"; button.className = "quiz-option"; button.textContent = answer;
    button.addEventListener("click", () => {
      if (options.dataset.answered) return;
      options.dataset.answered = "yes";
      const correct = index === data.correct;
      button.classList.add(correct ? "correct" : "incorrect");
      quiz.querySelector(".quiz-feedback").textContent = `${correct ? "آفرین، پاسخ درست است." : "این پاسخ درست نیست."} ${data.why}`;
      options.querySelectorAll("button").forEach((item,i) => { item.disabled = true; if(i===data.correct)item.classList.add("correct"); });
      quiz.querySelector(".quiz-again").hidden = false;
    });
    options.append(button);
  });
  quiz.querySelector(".quiz-again").addEventListener("click", () => {
    options.dataset.answered = "";
    options.querySelectorAll("button").forEach((button,index) => { button.disabled=false; button.classList.remove("correct","incorrect"); });
    quiz.querySelector(".quiz-feedback").textContent = "";
    quiz.querySelector(".quiz-again").hidden = true;
  });
});


/* Time Traces — temporal navigation and travel effects */
document.addEventListener("DOMContentLoaded", () => {
  // Session timer: counts time spent exploring the project.
  // sessionStorage keeps the start time while navigating between pages
  // and refreshing this tab, then clears it when the tab's session ends.
  const clock = document.querySelector(".live-clock");
  if (clock) {
    const sessionKey = "timeTracesSessionStartedAt";
    let startedAt = Number(sessionStorage.getItem(sessionKey));
    if (!startedAt || !Number.isFinite(startedAt)) {
      startedAt = Date.now();
      sessionStorage.setItem(sessionKey, String(startedAt));
    }

    const toPersianDigits = value => String(value).replace(/\d/g, digit => "۰۱۲۳۴۵۶۷۸۹"[digit]);
    const tick = () => {
      const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
      const hours = Math.floor(elapsedSeconds / 3600);
      const minutes = Math.floor((elapsedSeconds % 3600) / 60);
      const seconds = elapsedSeconds % 60;
      const formatted = [hours, minutes, seconds]
        .map(value => String(value).padStart(2, "0"))
        .join(":");
      clock.textContent = toPersianDigits(formatted);
      clock.setAttribute("aria-label", `مدت حضور: ${formatted}`);
    };
    tick();
    setInterval(tick, 1000);
  }

  // Cinematic portal transition when choosing a destination
  const links = [...document.querySelectorAll('a.era-card, .main-nav a[href*="html/"]')];
  if (links.length) {
    const overlay = document.createElement("div");
    overlay.className = "travel-transition";
    overlay.innerHTML = '<div class="travel-message">در حال آغاز سفر در زمان<small>در حال تنظیم مختصات مقصد...</small></div>';
    document.body.append(overlay);
    links.forEach(link => link.addEventListener("click", event => {
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#") || event.metaKey || event.ctrlKey || event.shiftKey) return;
      event.preventDefault();
      overlay.classList.add("active");
      document.body.style.overflow = "hidden";
      window.setTimeout(() => window.location.href = href, 850);
    }));
  }

  // Subtle pointer-based perspective on destination cards
  if (window.matchMedia("(pointer:fine)").matches) {
    document.querySelectorAll(".era-card").forEach(card => {
      card.addEventListener("pointermove", event => {
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - .5;
        const y = (event.clientY - rect.top) / rect.height - .5;
        card.style.transform = `perspective(900px) rotateY(${x * 3}deg) rotateX(${-y * 3}deg) translateY(-5px)`;
      });
      card.addEventListener("pointerleave", () => card.style.removeProperty("transform"));
    });
  }

  // A "return to present" control on destination pages
  if (document.body.dataset.page !== "explore") {
    const returnLink = document.createElement("a");
    returnLink.href = "../index.html#eras";
    returnLink.className = "return-present";
    returnLink.innerHTML = '<span>⌛</span> بازگشت به درگاه زمان';
    returnLink.setAttribute("aria-label","بازگشت به درگاه سفر در زمان");
    document.body.append(returnLink);
  }
});


/* Suggestion form — validation, object data, array methods and DOM updates */
document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("#suggestion-form");
  if (!form) return;

  const fields = {
    visitorName: {
      input: document.querySelector("#visitor-name"),
      error: document.querySelector("#name-error"),
      validate(value) {
        if (!value.trim()) return "لطفاً نام خود را وارد کنید.";
        if (value.trim().length < 2) return "نام باید دست‌کم ۲ حرف داشته باشد.";
        return "";
      }
    },
    visitorEmail: {
      input: document.querySelector("#visitor-email"),
      error: document.querySelector("#email-error"),
      validate(value) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
        if (!value.trim()) return "لطفاً ایمیل خود را وارد کنید.";
        if (!emailPattern.test(value.trim())) return "فرمت ایمیل معتبر نیست.";
        return "";
      }
    },
    topic: {
      input: document.querySelector("#visitor-topic"),
      error: document.querySelector("#topic-error"),
      validate(value) {
        if (!value.trim()) return "موضوع پیشنهادی را بنویسید.";
        if (value.trim().length < 3) return "موضوع باید دست‌کم ۳ حرف داشته باشد.";
        return "";
      }
    },
    reason: {
      input: document.querySelector("#visitor-reason"),
      error: document.querySelector("#reason-error"),
      validate(value) {
        if (!value.trim()) return "دلیل پیشنهادتان را بنویسید.";
        if (value.trim().length < 10) return "توضیح شما باید دست‌کم ۱۰ حرف داشته باشد.";
        return "";
      }
    }
  };

  const status = document.querySelector("#form-status");
  const validateField = field => {
    const message = field.validate(field.input.value);
    field.error.textContent = message;
    field.input.setAttribute("aria-invalid", String(Boolean(message)));
    return !message;
  };

  // Live validation gives feedback before the user submits the form.
  Object.values(fields).forEach(field => {
    field.input.addEventListener("blur", () => validateField(field));
    field.input.addEventListener("input", () => {
      if (field.input.getAttribute("aria-invalid") === "true") validateField(field);
    });
  });

  form.addEventListener("submit", event => {
    event.preventDefault();

    // Array methods: every() checks all fields; map() collects their values.
    const allValid = Object.values(fields).every(validateField);
    if (!allValid) {
      status.textContent = "لطفاً خطاهای مشخص‌شده را اصلاح کنید.";
      status.classList.add("error");
      const firstInvalid = Object.values(fields).find(field => field.input.getAttribute("aria-invalid") === "true");
      firstInvalid?.input.focus();
      return;
    }

    const suggestion = Object.fromEntries(
      Object.entries(fields).map(([key, field]) => [key, field.input.value.trim()])
    );
    suggestion.createdAt = new Date().toISOString();

    // Store the submitted suggestions locally; no information is sent to a server.
    let savedSuggestions = [];
    try {
      savedSuggestions = JSON.parse(localStorage.getItem("timeTracesSuggestions") || "[]");
      if (!Array.isArray(savedSuggestions)) savedSuggestions = [];
      savedSuggestions.push(suggestion);
      localStorage.setItem("timeTracesSuggestions", JSON.stringify(savedSuggestions));
      status.textContent = "پیشنهاد شما با موفقیت در همین مرورگر ذخیره شد. سپاس از همراهی شما!";
      status.classList.remove("error");
      form.reset();
      Object.values(fields).forEach(field => {
        field.error.textContent = "";
        field.input.removeAttribute("aria-invalid");
      });
    } catch (error) {
      status.textContent = "ذخیره‌سازی در این مرورگر در دسترس نیست؛ لطفاً تنظیمات مرورگر را بررسی کنید.";
      status.classList.add("error");
    }
  });
});
