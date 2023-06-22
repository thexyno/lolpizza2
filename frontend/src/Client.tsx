import { Component, createSignal, Show } from "solid-js";
import { getRestaurantInfo } from "./lieferando-api";
import { basketItem } from "./types";

const Client: Component<{ locked: boolean, basketId: string }> = (props) => {
  const [name, setName] = createSignal(window.localStorage.getItem("LolPizzaName") ?? "");
  async function send(): Promise<void> {
    const restaurantId = await getRestaurantInfo().then(x => x.restaurantId);
    const order = JSON.parse(window.localStorage.getItem("savedOrders")!)[restaurantId]["cartItems"] as basketItem[];
    if (name() != "") {
      fetch(`http://localhost:8080/basket?id=${props.basketId}&name=${encodeURIComponent(name())}`, {
        method: "PUT",
        body: JSON.stringify(order)
      })
    }
  }
  function saveName(nm: string) {
    window.localStorage.setItem("LolPizzaName", nm);
    setName(nm);
  }

  return (
    <Show when={!props.locked} fallback={<>Basket Locked</>}>
      <div>
        <label for="name">Name: </label>
        <input id="name" placeholder="xXCoolerTypXx" type="text" value={name()} onInput={(e) => saveName(e.currentTarget.value)} />
        <button onClick={() => send()}>Send</button>
      </div>
    </Show>
  );
}


export default Client;
