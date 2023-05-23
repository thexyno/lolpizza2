import { Accessor, Component, createResource, createSignal, For, Setter, Show } from "solid-js";

import styles from './App.module.css';

interface basketItem {
  name: string;
  quantity: number;
  selectedVariant: {
    prices: { delivery: number};
    selectedOptions: { [key: string]: { prices: { delivery: number } } };
  };
}

const calculatePrice = (item: basketItem) => {
  let basePrice = item.selectedVariant.prices.delivery;
  let optionPrice = Object.values(item.selectedVariant.selectedOptions).reduce((acc, x) => acc + x.prices.delivery, 0);
  return (basePrice + optionPrice) * item.quantity;
}

interface baskets {
  [key: string]: basketItem[];
}

let url2 = 'http://localhost:8080';

const fetchBasketId = async () => {
  if(window.localStorage.getItem('LolPizzaBasketId')) {
   return window.localStorage.getItem('LolPizzaBasketId') as string;
  }

  let basketId =  await fetch(`${url2}/basket`, { method: "POST" }).then((res) => res.text());
  window.localStorage.setItem('LolPizzaBasketId', basketId);
  return basketId;
}

const fetchBasket = async ({basketId, setBasketId}: { basketId: Accessor<string>, setBasketId: Setter<string>}) => {
  let bid = basketId();
  if (bid == "") {
    bid = await fetchBasketId();
    setBasketId(bid);
  }
  return await fetch(`${url2}/basket?id=${bid}`).then((res) => res.json());
}

const clearBasket = async (data: Accessor<string>, set: Setter<string>, refetch: Function) => {
  await fetch(`${url2}/basket?id=${data()}`, { method: "DELETE" }).then((res) => res.text());
  window.localStorage.removeItem('LolPizzaBasketId');
  set("");
  refetch();
}

const apply = async (data: Accessor<baskets>) => {
}

const Host: Component = () => {
  const [basketId, setBasketId] = createSignal<string>("");
  const [url, setUrl] = createSignal<string>(url2);
  const [data, { mutate, refetch }] = createResource<baskets>({ basketId, setBasketId }, fetchBasket);
  return (
    <div>
      <button onClick={() => refetch()}>Reload</button>
      <Show when={!data.loading} fallback={<>Loading</>}>
      <p>Basket ID: {basketId}</p>
      <p>Share Link: <code>fetch("{url}/id/{basketId}").then(x =&gt; x.text()).then(x =&gt; eval(x))</code></p>
      <table>
        <thead>
          <tr>
            <th>User</th>
            <th>Items</th>
            <th>Total Price</th>
          </tr>
        </thead>
        <tbody>
        <For each={Object.entries(data())}>
          {([user, items]) => (
            <tr>
              <td>{user}</td>
              <td>{items.map((item: basketItem) => `${item.name} x ${item.quantity} (${calculatePrice(item)/100.0}€)`).join(', ')}</td>
              <td>{items.map(calculatePrice).reduce((acc, x) => acc + x, 0)/100.0}€</td>
            </tr>
          )}
        </For>
        </tbody>
      </table>
      <button onClick={() => apply(data)}>Apply Basket to real basket</button>
      <button onClick={() => { clearBasket(basketId,setBasketId,refetch)}}>Clear Basket</button>
      </Show>
    </div>
  );
}


export default Host;
