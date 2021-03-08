export default function (node) {
  let mouseButtonIsPressed = false;
  const mouseNotPressed = () => (mouseButtonIsPressed = false);
  const mouseIsPressed = () => (mouseButtonIsPressed = true);

  function handleMouseMove(event) {
    if (mouseButtonIsPressed) {
      node.dispatchEvent(
        new CustomEvent("drag", {
          detail: { mouseX: event.clientX, mouseY: event.clientY },
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
