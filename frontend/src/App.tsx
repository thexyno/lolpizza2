import { Component, Match, Show, Switch } from 'solid-js';

import styles from './App.module.css';
import Host from './Host';
import Client from './Client';
import ItemTable from './ItemTable';
import { P2PProvider, useP2P } from './P2PProvider';
import { restaurantSlug } from './lieferando-api';



const _App: Component = () => {
  const [p2p, p2pFun] = useP2P();
  const locked = () => p2p().locked;
  const content = () => p2p().baskets;
  const mode = () => p2p().mode;
  const basketId = () => p2p().hostPeerId;
  const motd = () => p2p().motd;


  return (
    <div class={styles.header} id="lolpizza-app">
      <div class={styles.innerheader} id="lolpizza-header">
        <span>Lolpizza2 in {mode()} mode</span>
        <Show when={motd() !== ""}>
          <span>MOTD: {motd()}</span>
        </Show>
        <Show when={locked()}>
          <span>Locked</span>
        </Show>
        <Show when={mode() === "client"}>
          <span>Connection {p2p().hostPeer?.open ? "established" : "lost"}</span>
        </Show>
        <Show when={mode() === "host"}>
          <span>Connections: {p2p().peers.map(x => x.connectionId)}</span>
        </Show>
      </div>
      <br />
      <div style={{ padding: '4px' }}>
        Current Host ID: <input style={{ width: '21em' }} disabled={mode() === "host"} value={basketId()} onInput={(e) => p2pFun.createNewClient(e.currentTarget.value)} />
        <Show when={mode() === "client"}>
          <button onClick={() => p2pFun.createNewClient(basketId())}>Reconnect</button>
        </Show>
        <br />
        <button onClick={() => p2pFun.createNewHost("", true)}>Create New Host</button>
        <br />
      </div>
      <div>
        <Show when={basketId() !== ""}>
          URL: {location.href.split("#")[0]}#LPBasketId={encodeURIComponent(JSON.stringify({ peerId: basketId(), slug: restaurantSlug() }))}<br />
          <ItemTable />
          <Show when={mode() === 'host'} >
            <p>HOST Settings</p>
            <Host />
          </Show>
          <p>Client Settings</p>
          <Client />
        </Show>
      </div>
    </div >
  );
};

const App: Component = () => {
  return <P2PProvider><_App /></P2PProvider>;
};

export default App;
