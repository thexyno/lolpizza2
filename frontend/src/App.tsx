import { Component, createEffect, createResource, createSignal, Match, onCleanup, onMount, Setter, Show, Switch } from 'solid-js';

import styles from './App.module.css';
import Host from './Host';
import Client from './Client';
import { baskets, mode } from './types';
import ItemTable from './ItemTable';

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

export const url2 = 'http://localhost:8080';

const LocalStorageTag = "LolPizzaBasketId";

const App: Component = () => {
  const [mode, setMode] = createSignal<mode>((window as any).lolpizzaMode as mode ?? 'host');
  createEffect(() => {
    dragElement(document.getElementById("lolpizza-app")!, document.getElementById("lolpizza-header")!);
  });
  const [basketId, setBasketId] = createSignal<string>("");
  const [url, setUrl] = createSignal<string>(url2);
  const fetchBasketId = async (force = false) => {
    if (!force) {
      if (window.localStorage.getItem(LocalStorageTag))
        setBasketId(window.localStorage.getItem(LocalStorageTag) as string);
    } else {
      let basketIdInt = await fetch(`${url()}/basket`, { method: "POST" }).then((res) => res.text());
      window.localStorage.setItem(LocalStorageTag, basketIdInt);
      setBasketId(basketIdInt);
    }
  }
  const fetchBasket = async (initial = false) => {
    if (initial) {
      fetchBasketId(false)
    }

    let bid = basketId();
    if (bid == "") {
      return { content: [], meta: { Url: "", Locked: false } };
    }
    return await fetch(`${url()}/basket?id=${bid}`).then((res) => res.json());
  }
  const [data, { mutate, refetch }] = createResource<{ content: baskets, meta: { Url: string, Locked: boolean } }>(fetchBasket);
  const timer = setInterval(() => {
    refetch();
  }, 2000);
  onCleanup(() => clearInterval(timer));
  const locked = () => {
    console.log(data());
    console.log(data()?.meta?.Locked ?? false);
    return data()?.meta?.Locked ?? false
  };
  const content = () => data()?.content ?? {};


  return (
    <div class={styles.header} id="lolpizza-app">
      <div class={styles.innerheader} id="lolpizza-header">
        <span>Lolpizza2 in {mode} mode</span>
        {locked() ? <span>Locked</span> : <span></span>}
        <button onClick={() => setMode(mode() === 'host' ? 'client' : 'host')}>Switch</button>
      </div>
      <br />
      <div style={{ padding: '4px' }}>
        <p style={{ "text-align": 'left', width: '100%' }}>ID: <input style={{ width: '21em' }} value={basketId()} onInput={(e) => setBasketId(e.currentTarget.value)} /> <button onClick={() => fetchBasketId(true)}>Fetch</button>  <br />
          Console: <code>fetch("{url()}/id/{basketId}").then(x =&gt; x.text()).then(x =&gt; eval(x))</code></p>
      </div>
      <div>
        <Show when={basketId() !== ""}>
          <ItemTable data={content()} />
          <Switch>
            <Match when={mode() === 'host'}>
              <Host locked={locked()} data={content()} basketId={basketId()} setBasketId={setBasketId} refetch={refetch} />
            </Match>
            <Match when={mode() === 'client'}>
              <Client locked={locked()} />
            </Match>
          </Switch>
        </Show>
      </div>
    </div>
  );
};

export default App;
