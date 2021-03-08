export default function (node) {
  let mouseButtonIsPressed = false;
  const mouseNotPressed = () => (mouseButtonIsPressed = false);
  const mouseIsPressed = () => (mouseButtonIsPressed = true);

  function handleMouseMove(event) {
    if (!mouseButtonIsPressed) return;
    const { left, top, width, height } = node.getBoundingClientRect();
    let x = event.clientX - left;
    let y = event.clientY - top;

    if (mouseIsInsideContainer(x, y, width, height)) {
      node.dispatchEvent(
        new CustomEvent("drag", {
          detail: { mouseX: x, mouseY: y },
        })
      );
    }
  }

  window.addEventListener("mousedown", mouseIsPressed);
  window.addEventListener("mouseup", mouseNotPressed);
  window.addEventListener("mousemove", handleMouseMove);

  return {
    destroy() {
      window.removeEventListener("mousedown", mouseIsPressed);
      window.removeEventListener("mouseup", mouseNotPressed);
      window.removeEventListener("mousemove", handleMouseMove);
    },
  };
}

function mouseIsInsideContainer(x, y, width, height) {
  return x > 0 && y > 0 && x < width && y < height;
}
