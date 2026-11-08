import { createAdammAlert } from "./adamm-alert.js";
import { mountAdammSprite } from "./adamm-sprite.js";

const testAlert = document.querySelector("#adamm-test-alert");
const alert = createAdammAlert();
testAlert.addEventListener("click", () => {
  alert.show("La consulta encara és oberta. Ves a Difusió si vols recuperar l’enllaç per compartir-la.", testAlert);
});

const stage = document.querySelector("#adamm-stage");
const sprite = mountAdammSprite(stage.querySelector("canvas"));
const controls = document.querySelector("#adamm-controls");
const status = document.querySelector("#adamm-status");

controls.addEventListener("click", event => {
  const button = event.target.closest("button[data-motion]");
  if (!button) return;
  const motion = button.dataset.motion;
  if (motion === "peek-out") sprite.setVisible(false);
  else sprite.play(motion);
  status.textContent = button.textContent;
});

sprite.ready.then(loaded => {
  if (!loaded) {
    status.textContent = "No s'ha pogut carregar l'Adamm.";
    return;
  }
  controls.disabled = false;
  sprite.setVisible(true);
  status.textContent = "Adamm en repòs";
});

window.addEventListener("pagehide", event => {
  if (!event.persisted) sprite.destroy();
});
