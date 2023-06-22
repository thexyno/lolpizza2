import { Component, createEffect, createResource, createSignal, Match, onCleanup, onMount, Setter, Show, Switch } from 'solid-js';

import styles from './App.module.css';
import Host from './Host';
import Client from './Client';
import { baskets, getBasketResponse, mode } from './types';
import ItemTable from './ItemTable';

export const LocalStorageUrl = "LolPizzaUrl";
export const LocalStorageTag = "LolPizzaBasketId";

export const url2 = localStorage.getItem(LocalStorageUrl) ?? 'https://lolpizza.ragon.xyz';


const App: Component = () => {
  const [mode, setMode] = createSignal<mode>((window as any).lolpizzaMode as mode ?? 'host');
  const [basketId, setBasketId] = createSignal<string>("");
  const [url, setUrl] = createSignal<string>(url2);
  const fetchBasketId = async (force = false) => {
    if (!force) {
      if (window.localStorage.getItem(LocalStorageTag))
        setBasketId(window.localStorage.getItem(LocalStorageTag) as string);
    } else {
      const activeAddress = document.cookie.split("; ").find(x => x.startsWith("activeAddress="));
      if (!activeAddress) {
        alert("Please select an address");
        return;
      }
      let basketIdInt = await fetch(`${url()}/basket?url=${encodeURIComponent(location.origin + location.pathname)}&activeAddress=${activeAddress}`, { method: "POST" }).then((res) => res.text());
      window.localStorage.setItem(LocalStorageTag, basketIdInt);
      setBasketId(basketIdInt);
    }
  }
  const fetchBasket = async (initial = false): Promise<getBasketResponse> => {
    if (initial) {
      fetchBasketId(false)
    }

    let bid = basketId();
    if (bid == "") {
      return { content: {}, meta: { Url: "", Locked: false, ActiveAddress: '' } };
    }
    const b = await fetch(`${url()}/basket?id=${bid}`).then((res) => res.json()) as getBasketResponse;
    const activeAddress = document.cookie.split("; ").find(x => x.startsWith("activeAddress="));
    document.cookie = b.meta.ActiveAddress;

    if (!activeAddress || !document.location.href.startsWith(b.meta.Url)) {
      window.localStorage.setItem(LocalStorageTag, basketId());
      document.location.href = b.meta.Url;
    }
    return b;
  }
  const [data, { mutate, refetch }] = createResource<{ content: baskets, meta: { Url: string, Locked: boolean } }>(fetchBasket);
  const timer = setInterval(() => {
    refetch();
  }, 2000);
  onCleanup(() => clearInterval(timer));
  const locked = () => data()?.meta?.Locked ?? false;
  const content = () => data()?.content;


  return (
    <div class={styles.header} id="lolpizza-app">
      <div class={styles.innerheader} id="lolpizza-header">
        <span>Lolpizza2 in {mode()} mode</span>
        {locked() ? <span>Locked</span> : <span></span>}
        <button onClick={() => setMode(mode() === 'host' ? 'client' : 'host')}>Switch</button>
      </div>
      <br />
      <div style={{ padding: '4px' }}>
        <p style={{ "text-align": 'left', width: '100%' }}>ID: <input style={{ width: '21em' }} value={basketId()} onInput={(e) => setBasketId(e.currentTarget.value)} /> <button onClick={() => fetchBasketId(true)}>Fetch</button>  <br />

        </p>
      </div>
      <div>
        <Show when={basketId() !== ""}>
          URL: {url()}/a#{basketId()}<br />
          <ItemTable data={content()} />
          <Switch>
            <Match when={mode() === 'host'}>
              <Host locked={locked()} data={content()} basketId={basketId()} setBasketId={setBasketId} refetch={refetch} />
            </Match>
            <Match when={mode() === 'client'}>
              <Client url={url()} basketId={basketId()} locked={locked()} />
            </Match>
          </Switch>
        </Show>
      </div>
    </div>
  );
};

export default App;
