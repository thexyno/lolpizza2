import { Accessor, Component, createResource, createSignal, For, Setter, Show } from "solid-js";
import { url2 } from "./App";
import { basketItem, baskets } from "./types";
import { getRestaurantInfo } from "./lieferando-api";

type mp = { [s: string]: any };

function deepEqual(x: mp, y: mp): boolean {
  const ok = Object.keys, tx = typeof x, ty = typeof y;
  return x && y && tx === 'object' && tx === ty ? (
    ok(x).length === ok(y).length &&
    ok(x).every(key => deepEqual(x[key], y[key]))
  ) : (x === y);
}

const apply = async (data?: baskets) => {
  if (!data) {
    alert("No basket data");
    return;
  }
  let basketItems: basketItem[] = [];
  const restaurantId = await getRestaurantInfo().then(x => x.restaurantId);
  for (const [user, items] of Object.entries(data)) {
    for (let item of items) {
      const itemWithoutQuantity = { ...item, quantity: 1 };
      let itemInStore = basketItems.find((x) => deepEqual({ ...x, quantity: 1 }, itemWithoutQuantity));
      if (itemInStore) {
        basketItems[basketItems.indexOf(itemInStore)].quantity += item.quantity;
      } else {
        basketItems.push(item);
      }
    }
  }
  let orders = JSON.parse(window.localStorage.getItem("savedOrders")!);
  orders[restaurantId]["cartItems"] = basketItems;
  window.localStorage.setItem("savedOrders", JSON.stringify(orders));
  window.location.reload();
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

const Host: Component<{ data?: baskets, basketId: string, setBasketId: Setter<string>, refetch: Function, locked: boolean }> = (props) => {
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
