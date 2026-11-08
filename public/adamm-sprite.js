const frameSize = 48;
const animations = {
  idle: [0, 4, 230],
  blink: [1, 3, 65],
  "peek-in": [2, 4, 75],
  "peek-out": [3, 4, 65],
  wave: [4, 6, 100],
  listen: [5, 4, 155],
  nod: [6, 4, 90],
  cheer: [7, 6, 85],
  talk: [8, 3, 125],
};

let sheet;

function loadSheet() {
  return sheet ??= new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      if (image.naturalWidth < frameSize * 6 || image.naturalHeight < frameSize * 9) {
        reject(new Error("Invalid Adamm sprite sheet"));
      } else {
        resolve(image);
      }
    };
    image.onerror = reject;
    image.src = "/adamm-sheet.png";
  });
}

export function mountAdammSprite(canvas) {
  const context = canvas.getContext("2d");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let image, timer, queued, blinkAt;
  let visible = false;
  let destroyed = false;
  let state = "hidden";
  canvas.dataset.spriteState = state;

  function scheduleBlink() {
    blinkAt = performance.now() + 2000 + Math.random() * 4000;
  }

  function draw(name, frame) {
    context.clearRect(0, 0, frameSize, frameSize);
    context.drawImage(image, frame * frameSize, animations[name][0] * frameSize,
      frameSize, frameSize, 0, 0, frameSize, frameSize);
  }

  function start(name) {
    clearTimeout(timer);
    state = name;
    canvas.dataset.spriteState = name;
    if (!image || name === "hidden") return;
    if (reducedMotion.matches) {
      draw("idle", 0);
      return;
    }
    if (name === "blink") scheduleBlink();
    const [, count, duration] = animations[name];
    let frame = 0;
    function step() {
      draw(name, frame++);
      timer = setTimeout(() => {
        if (name === "idle" && performance.now() >= blinkAt) start("blink");
        else if (frame < count) step();
        else if (name === "peek-out") start("hidden");
        else if (queued) {
          const gesture = queued;
          queued = undefined;
          start(gesture);
        } else if (performance.now() >= blinkAt) start("blink");
        else start("idle");
      }, name === "idle" ? Math.min(duration, Math.max(0, blinkAt - performance.now())) : duration);
    }
    step();
  }

  function setVisible(next, gesture) {
    if (destroyed) return;
    const changed = visible !== next;
    visible = next;
    queued = undefined;
    if (changed && next) scheduleBlink();
    if (!image) {
      queued = next ? gesture : undefined;
      return;
    }
    if (reducedMotion.matches) start(next ? "idle" : "hidden");
    else if (!next) {
      if (changed) start("peek-out");
    } else if (changed || state === "peek-in") {
      queued = gesture;
      if (changed) start("peek-in");
    } else if (gesture) start(gesture);
  }

  function play(gesture) {
    if (destroyed) return;
    if (gesture === "peek-in" && visible && image) start("peek-in");
    else if (gesture === "peek-in") setVisible(true);
    else if (gesture === "idle" && visible && state !== "peek-in") start("idle");
    else setVisible(true, gesture === "idle" ? undefined : gesture);
  }

  function onMotionChange() {
    queued = undefined;
    scheduleBlink();
    start(visible ? "idle" : "hidden");
  }

  reducedMotion.addEventListener("change", onMotionChange);
  const ready = loadSheet().then(loaded => {
    if (destroyed) return false;
    image = loaded;
    if (visible) start(reducedMotion.matches ? "idle" : "peek-in");
    return true;
  }, () => false);

  function destroy() {
    destroyed = true;
    clearTimeout(timer);
    reducedMotion.removeEventListener("change", onMotionChange);
  }

  return { setVisible, play, ready, destroy };
}
