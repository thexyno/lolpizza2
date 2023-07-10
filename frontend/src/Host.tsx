import { Component, Setter, Show } from "solid-js";
import { basketItem, baskets } from "./types";
import { getRestaurantInfo } from "./lieferando-api";
import { useP2P } from "./P2PProvider";

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

const Host: Component = () => {
  const [p2p, p2pFun] = useP2P();
  console.log(p2p());
  return (
    <>
      <div>
        <Show when={p2p().locked} fallback={<button onClick={() => p2pFun.lock(true)}>Lock Basket</button>}>
          <button onClick={() => p2pFun.lock(false)}>Unlock Basket</button>
        </Show>
        <button onClick={() => apply(p2p().baskets)}>Apply Basket to real basket</button>
        <button onClick={() => p2pFun.createNewHost()}>Clear Basket</button>
      </div>
      <div>
        MOTD: <input type="text" value={p2p().motd} onKeyPress={(e) => {
          var keyCode = e.code || e.key;
          if (keyCode == 'Enter') {
            p2pFun.setMotd(e.currentTarget.value);
          }
        }} />
      </div>
    </>
  );
}


export default Host;
