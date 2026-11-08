import { mountAdammSprite } from "./adamm-sprite.js";

export function createAdammAlert() {
  const alert = document.createElement("aside");
  alert.className = "adamm-alert";
  alert.setAttribute("aria-label", "Consell d’Adamm");
  alert.innerHTML = `
    <div class="adamm-alert-art" aria-hidden="true">
      <span class="adamm-alert-spark"></span>
      <canvas class="adamm-sprite" width="48" height="48"></canvas>
    </div>
    <div class="adamm-alert-bubble" inert>
      <strong>Adamm</strong>
      <p></p>
      <button type="button" aria-label="Tanca el consell d’Adamm">×</button>
    </div>
    <span class="adamm-alert-announcement" role="status"></span>`;
  document.body.append(alert);

  const sprite = mountAdammSprite(alert.querySelector("canvas"));
  const bubble = alert.querySelector(".adamm-alert-bubble");
  const message = bubble.querySelector("p");
  const announcement = alert.querySelector("[role=status]");
  const close = bubble.querySelector("button");
  let returnFocus;
  const listeners = new AbortController();
  const { signal } = listeners;

  function hide(restoreFocus = false) {
    if (!alert.hasAttribute("data-open")) return;
    alert.removeAttribute("data-open");
    sprite.setVisible(false);
    if (restoreFocus && bubble.contains(document.activeElement)) {
      returnFocus?.focus({ preventScroll: true });
    }
    bubble.inert = true;
    announcement.textContent = "";
  }

  close.addEventListener("click", () => hide(true), { signal });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && alert.hasAttribute("data-open") && !document.querySelector("dialog[open]")) {
      hide(true);
    }
  }, { signal });

  function destroy() {
    hide();
    listeners.abort();
    sprite.destroy();
    alert.remove();
  }

  window.addEventListener("pagehide", event => {
    if (!event.persisted) destroy();
  }, { signal });

  return {
    show(text, trigger = document.activeElement) {
      if (signal.aborted) return;
      const alreadyOpen = alert.hasAttribute("data-open");
      if (!bubble.contains(trigger)) returnFocus = trigger;
      message.textContent = text;
      alert.setAttribute("data-open", "");
      if (alreadyOpen) sprite.play("talk");
      else sprite.setVisible(true, "wave");
      bubble.inert = false;
      announcement.textContent = `Adamm: ${text}`;
    },
    hide,
    destroy,
  };
}
