import { Component, createSignal, Show } from "solid-js";
import { basketItem, useP2P } from "./P2PProvider";

const Client: Component = () => {
  const [p2p, p2pFun] = useP2P();
  const [name, setName] = createSignal(window.localStorage.getItem("LolPizzaName") ?? "");
  async function send(): Promise<void> {
    const restaurantId = p2p().restaurantInfo?.restaurantId;
    if (!restaurantId) {
      alert("No restaurant id");
      return;
    }
    const order = JSON.parse(window.localStorage.getItem("savedOrders")!)[restaurantId]["cartItems"] as basketItem[];
    if (name() != "") {
      p2pFun.sendBasket(order,name());
    }
  }
  function saveName(nm: string) {
    window.localStorage.setItem("LolPizzaName", nm);
    setName(nm);
  }

  return (
    <Show when={!p2p().locked} fallback={<>Basket Locked</>}>
      <div>
        <label for="name">Name: </label>
        <input id="name" placeholder="xXCoolerTypXx" type="text" value={name()} onInput={(e) => saveName(e.currentTarget.value)} />
        <button onClick={() => send()}>Send</button>
        <button onClick={() => p2pFun.clearBasket(name())}>Clear</button>
      </div>
    </Show>
  );
}


export default Client;
