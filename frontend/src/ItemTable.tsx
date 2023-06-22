import { Component, For } from "solid-js";
import { basketItem, baskets } from "./types";

const ItemTable: Component<{data: baskets}> = (props) => {
const data  = props.data;
  return (
      <table>
        <thead>
          <tr>
            <th>User</th>
            <th>Items</th>
            <th>Total Price</th>
          </tr>
        </thead>
        <tbody>
        <For each={Object.entries(data)}>
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
  );
}

const calculatePrice = (item: basketItem) => {
  let basePrice = item.selectedVariant.prices.delivery;
  let optionPrice = Object.values(item.selectedVariant.selectedOptions).reduce((acc, x) => acc + x.prices.delivery, 0);
  return (basePrice + optionPrice) * item.quantity;
}

export default ItemTable;
