import { Component, createEffect } from 'solid-js';

import styles from './App.module.css';
import Host from './Host';
import Client from './Client';

function dragElement(elmnt: HTMLElement, header: HTMLElement) {
  console.log("dragging");
  var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  header.onmousedown = dragMouseDown;

  function dragMouseDown(e: any) {
    e = e || window.event;
    e.preventDefault();
    // get the mouse cursor position at startup:
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // call a function whenever the cursor moves:
    document.onmousemove = elementDrag;
  }

  function elementDrag(e: any) {
    e = e || window.event;
    e.preventDefault();
    // calculate the new cursor position:
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // set the element's new position:
    elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
    elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
  }

  function closeDragElement() {
    // stop moving when mouse button is released:
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

const App: Component = () => {
  const mode = (window as any).lolpizzaMode as string ?? 'host';
  createEffect(() => {
    dragElement(document.getElementById("lolpizza-app")!, document.getElementById("lolpizza-header")!);
  });

  return (
    <div class={styles.header} id="lolpizza-app">
      <div class={styles.innerheader} id="lolpizza-header">
        Lolpizza2 in {mode} mode
      </div>
      <br />
      <div>
      {mode === 'host' ? <Host /> : <Client />}
      </div>
    </div>
  );
};

export default App;
