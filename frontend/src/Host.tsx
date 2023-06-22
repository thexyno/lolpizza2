import { Accessor, Component, createResource, createSignal, For, Setter, Show } from "solid-js";
import { url2 } from "./App";
import { baskets } from "./types";



const apply = async (data: baskets) => {
}

const lock = async (data: string) =>
  await fetch(`${url2}/basket/lock?id=${data}`, { method: "POST" }).then((res) => res.text()).then((res) => console.log(res));
const unlock = async (data: string) =>
  await fetch(`${url2}/basket/lock?id=${data}&unlock=true`, { method: "POST" }).then((res) => res.text()).then((res) => console.log(res));

const clearBasket = async (data: string, set: Setter<string>, refetch: Function) => {
  await fetch(`${url2}/basket?id=${data}`, { method: "DELETE" }).then((res) => res.text()).then(() => {
    window.localStorage.removeItem('LolPizzaBasketId');
    set("");
    refetch();
  });
}

const Host: Component<{ data: baskets, basketId: string, setBasketId: Setter<string>, refetch: Function, locked: boolean }> = (props) => {
  return (
    <div>
      <Show when={props.locked} fallback={<button onClick={() => lock(props.basketId).then(() => props.refetch())}>Lock Basket</button>}>
        <button onClick={() => unlock(props.basketId).then(() => props.refetch())}>Unlock Basket</button>
      </Show>
      <button onClick={() => apply(props.data)}>Apply Basket to real basket</button>
      <button onClick={() => clearBasket(props.basketId, props.setBasketId, props.refetch)}>Clear Basket</button>
    </div>
  );
}


export default Host;
