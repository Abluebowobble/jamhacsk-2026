/* =====================================================================
   Hestia marketing site — interactions
   Progressive enhancement only. No information lives in motion; every
   animation has a reduced-motion fallback. Defensive: nothing throws if
   an element is absent.
   ===================================================================== */
(function () {
  "use strict";

  // Progressive enhancement flag: reveal-hiding only applies when JS runs,
  // so content is never stuck invisible if this script fails to load.
  document.documentElement.classList.add("js");

  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. Sticky nav: shadow/border once scrolled ---------- */
  var nav = document.getElementById("nav");
  if (nav) {
    var onScroll = function () {
      nav.setAttribute("data-scrolled", window.scrollY > 8 ? "true" : "false");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- 2. Mobile drawer ---------- */
  var toggle = document.getElementById("navToggle");
  var drawer = document.getElementById("navDrawer");
  if (toggle && drawer) {
    var setOpen = function (open) {
      drawer.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    };
    toggle.addEventListener("click", function () {
      setOpen(!drawer.classList.contains("is-open"));
    });
    drawer.addEventListener("click", function (e) {
      if (e.target.closest("a")) setOpen(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setOpen(false);
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth > 860) setOpen(false);
    });
  }

  /* ---------- 3. Reveal on scroll ---------- */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));
  if (revealEls.length) {
    if (prefersReduced || !("IntersectionObserver" in window)) {
      revealEls.forEach(function (el) { el.classList.add("is-visible"); });
    } else {
      var ro = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            ro.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
      revealEls.forEach(function (el) { ro.observe(el); });
    }
  }

  /* ---------- 4. Scrollspy: highlight current section in nav ---------- */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".nav__links .nav__link"));
  var spyTargets = navLinks
    .map(function (a) {
      var id = (a.getAttribute("href") || "").replace("#", "");
      var sec = id && document.getElementById(id);
      return sec ? { link: a, sec: sec } : null;
    })
    .filter(Boolean);
  if (spyTargets.length && "IntersectionObserver" in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var match = spyTargets.find(function (t) { return t.sec === entry.target; });
        if (!match) return;
        if (entry.isIntersecting) {
          spyTargets.forEach(function (t) { t.link.removeAttribute("aria-current"); });
          match.link.setAttribute("aria-current", "true");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    spyTargets.forEach(function (t) { spy.observe(t.sec); });
  }

  /* ---------- 5. FAQ accordion (single-open, accessible) ---------- */
  Array.prototype.slice.call(document.querySelectorAll("[data-accordion]")).forEach(function (root) {
    var items = Array.prototype.slice.call(root.querySelectorAll("[data-acc-item]"));
    items.forEach(function (item, i) {
      var btn = item.querySelector("[data-acc-trigger]");
      var panel = item.querySelector("[data-acc-panel]");
      if (!btn || !panel) return;
      // Wire programmatic association between trigger and the panel it reveals.
      var pid = panel.id || ("acc-panel-" + (i + 1));
      var bid = btn.id || ("acc-trigger-" + (i + 1));
      panel.id = pid; btn.id = bid;
      btn.setAttribute("aria-controls", pid);
      panel.setAttribute("role", "region");
      panel.setAttribute("aria-labelledby", bid);
      btn.addEventListener("click", function () {
        var isOpen = item.getAttribute("data-open") === "true";
        if (!isOpen && root.getAttribute("data-accordion") === "single") {
          items.forEach(function (other) {
            other.setAttribute("data-open", "false");
            var b = other.querySelector("[data-acc-trigger]");
            if (b) b.setAttribute("aria-expanded", "false");
          });
        }
        item.setAttribute("data-open", String(!isOpen));
        btn.setAttribute("aria-expanded", String(!isOpen));
      });
    });
  });

  /* ---------- 6. Count-up stats (animate to target on reveal) ---------- */
  var countEls = Array.prototype.slice.call(document.querySelectorAll("[data-countup]"));
  if (countEls.length) {
    var runCount = function (el) {
      var target = parseFloat(el.getAttribute("data-countup")) || 0;
      var decimals = parseInt(el.getAttribute("data-countup-decimals") || "0", 10);
      var prefix = el.getAttribute("data-countup-prefix") || "";
      var suffix = el.getAttribute("data-countup-suffix") || "";
      var fmt = function (v) {
        return prefix + v.toLocaleString("en-US", {
          minimumFractionDigits: decimals, maximumFractionDigits: decimals
        }) + suffix;
      };
      if (prefersReduced) { el.textContent = fmt(target); return; }
      var dur = 1400, start = null;
      var step = function (ts) {
        if (start === null) start = ts;
        var t = Math.min(1, (ts - start) / dur);
        var eased = 1 - Math.pow(1 - t, 3); /* ease-out cubic */
        el.textContent = fmt(target * eased);
        if (t < 1) requestAnimationFrame(step);
        else el.textContent = fmt(target);
      };
      requestAnimationFrame(step);
    };
    if (!("IntersectionObserver" in window)) {
      countEls.forEach(runCount);
    } else {
      var co = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { runCount(entry.target); co.unobserve(entry.target); }
        });
      }, { threshold: 0.5 });
      countEls.forEach(function (el) { co.observe(el); });
    }
  }

  /* ---------- 7. Signature: safety-loop countdown demo --------------
     Contract (rendered by the "how it works" section):
       [data-loop]                 container; receives data-loop-state
       [data-loop-duration="10"]   warning countdown length (seconds)
       [data-loop-play]            play / reset button
       [data-loop-count]           text node for the mono countdown
       [data-loop-ring]            optional <circle> drained during warning
                                   (uses data-circ = circumference, or r)
       [data-loop-progress]        optional el; gets style --p (0..1 remaining)
       [data-loop-step="N"]        step markers highlighted as state advances
     States advance: attended → unattended → warning(count) → shutoff → safe
  ------------------------------------------------------------------ */
  Array.prototype.slice.call(document.querySelectorAll("[data-loop]")).forEach(function (root) {
    var duration = parseInt(root.getAttribute("data-loop-duration") || "10", 10);
    var playBtn = root.querySelector("[data-loop-play]");
    var countEl = root.querySelector("[data-loop-count]");
    var ring = root.querySelector("[data-loop-ring]");
    var progress = root.querySelector("[data-loop-progress]");
    var steps = Array.prototype.slice.call(root.querySelectorAll("[data-loop-step]"));
    var readoutLabel = root.querySelector("[data-loop-readout-label]");
    var statusRegion = root.querySelector("[data-loop-status]");

    var STATE_STEP = { attended: 1, unattended: 1, warning: 2, shutoff: 3, safe: 3 };
    var READOUT_LABELS = {
      attended: "At rest", unattended: "Watching",
      warning: "Time to act", shutoff: "Shut off", safe: "All clear"
    };
    // Full sentences for the aria-live region (announced once per transition).
    var STATUS_TEXT = {
      attended: "Stove on. Someone is cooking.",
      unattended: "Everyone stepped away. Hestia is watching.",
      warning: "Unattended. The stove will shut off automatically if no one returns.",
      shutoff: "The stove was turned off automatically.",
      safe: "The stove is off. The kitchen is safe."
    };
    var circ = 0;
    if (ring) {
      circ = parseFloat(ring.getAttribute("data-circ"));
      if (!circ) {
        var r = parseFloat(ring.getAttribute("r")) || 0;
        circ = 2 * Math.PI * r;
      }
      ring.style.strokeDasharray = circ;
      ring.style.strokeDashoffset = 0;
    }

    var timers = [];
    var rafId = null;
    var clearAll = function () {
      timers.forEach(clearTimeout); timers = [];
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
    };
    var later = function (fn, ms) { timers.push(setTimeout(fn, ms)); };

    var setStep = function (state) {
      var active = STATE_STEP[state] || 0;
      steps.forEach(function (s) {
        var n = parseInt(s.getAttribute("data-loop-step"), 10);
        s.setAttribute("data-active", String(n <= active));
        s.setAttribute("data-current", String(n === active));
      });
    };
    var setState = function (state) {
      root.setAttribute("data-loop-state", state);
      setStep(state);
      if (readoutLabel && READOUT_LABELS[state]) readoutLabel.textContent = READOUT_LABELS[state];
      if (statusRegion && STATUS_TEXT[state]) statusRegion.textContent = STATUS_TEXT[state];
    };
    var setRemaining = function (frac) { /* frac = remaining 0..1 */
      if (ring) ring.style.strokeDashoffset = String(circ * (1 - frac));
      if (progress) progress.style.setProperty("--p", String(frac));
    };

    var reset = function () {
      clearAll();
      setState("attended");
      if (countEl) countEl.textContent = duration + "s";
      setRemaining(1);
      if (playBtn) {
        playBtn.setAttribute("data-running", "false");
        playBtn.setAttribute("aria-label", "Play the loop");
      }
    };

    var runWarning = function () {
      setState("warning");
      var startTs = null;
      var totalMs = duration * 1000;
      var tick = function (ts) {
        if (startTs === null) startTs = ts;
        var elapsed = ts - startTs;
        var remaining = Math.max(0, totalMs - elapsed);
        var secs = Math.ceil(remaining / 1000);
        if (countEl) countEl.textContent = secs + "s";
        setRemaining(remaining / totalMs);
        if (remaining > 0) {
          rafId = requestAnimationFrame(tick);
        } else {
          if (countEl) countEl.textContent = "0s";
          setState("shutoff");
          later(function () {
            setState("safe");
            if (countEl) countEl.textContent = "off";
            later(reset, 3200);
            if (playBtn) playBtn.setAttribute("data-running", "false");
          }, 2400);
        }
      };
      if (prefersReduced) {
        /* No smooth drain — step the readout each second instead. */
        var s = duration;
        var stepSec = function () {
          if (countEl) countEl.textContent = s + "s";
          setRemaining(s / duration);
          if (s <= 0) {
            setState("shutoff");
            later(function () { setState("safe"); if (countEl) countEl.textContent = "off"; later(reset, 3200); if (playBtn) playBtn.setAttribute("data-running", "false"); }, 2000);
            return;
          }
          s -= 1; later(stepSec, 1000);
        };
        stepSec();
      } else {
        rafId = requestAnimationFrame(tick);
      }
    };

    var play = function () {
      clearAll();
      if (playBtn) {
        playBtn.setAttribute("data-running", "true");
        playBtn.setAttribute("aria-label", "Reset");
      }
      setState("unattended");
      if (countEl) countEl.textContent = duration + "s";
      setRemaining(1);
      later(runWarning, prefersReduced ? 600 : 1500);
    };

    if (playBtn) {
      playBtn.addEventListener("click", function () {
        if (playBtn.getAttribute("data-running") === "true") { reset(); }
        else { play(); }
      });
    }
    reset();
  });
})();
