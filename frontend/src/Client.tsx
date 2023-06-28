import { Component, createEffect, createSignal, Show } from "solid-js";
import { basketItem, useP2P } from "./P2PProvider";
import { Portal } from "solid-js/web";

const Client: Component = () => {
  const [p2p, p2pFun] = useP2P();
  const [name, setName] = createSignal(window.localStorage.getItem("LolPizzaName") ?? "");
  async function send(): Promise<void> {
    const restaurantId = p2p().restaurantInfo?.restaurantId;
    console.log(p2p().restaurantInfo);
    if (!restaurantId) {
      alert("No restaurant id");
      return;
    }
    const order = JSON.parse(window.localStorage.getItem("savedOrders")!)[restaurantId]["cartItems"] as basketItem[];
    if (name() != "") {
      p2pFun.sendBasket(order, name());
    }
  }
  function saveName(nm: string) {
    window.localStorage.setItem("LolPizzaName", nm);
    setName(nm);
  }

  let nameInput: HTMLInputElement;

  const [mountEl, setMountEl] = createSignal<ChildNode | null | undefined>(document.querySelector('div[data-qa="sidebar-title"]')?.lastChild);
  const [timeoutId, setTimeoutId] = createSignal<any | null>(null);

  createEffect(() => {
    setTimeoutId(setTimeout(() => {
      const el = document.querySelector('div[data-qa="sidebar-title"]')?.lastChild!;
      if (el) {
        setMountEl(el);
      }
    }, 1000));
  }, []);



  return (
    <Show when={!p2p().locked} fallback={<>Basket Locked</>}>
      <div>
        <label for="name">Name: </label>
        <input ref={nameInput} id="name" placeholder="xXCoolerTypXx" type="text" value={name()} onInput={(e) => saveName(e.currentTarget.value)} />
        <button onClick={() => send()}>Send</button>
        <button onClick={() => p2pFun.clearBasket(name())}>Clear</button>
      </div>
      <Show when={mountEl()}>
        <Portal mount={mountEl()!}>
          <div style={{ display: "flex", "align-items": "center", "justify-content": "center" }}>
            <Show when={name() != ""} fallback={<button onClick={() => nameInput.focus()}>Please set your LolPizza Name</button>}>
              <button onClick={() => send()}>Send to LolPizza</button>
            </Show>
          </div>
        </Portal>
      </Show>
    </Show>
  );
}


export default Client;
