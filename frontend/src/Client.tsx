import { Component, createSignal, Show } from "solid-js";

const Client: Component<{ locked: boolean }> = (props) => {
  const [name, setName] = createSignal("");
  function send(): void {
    throw new Error("Function not implemented.");
  }

  return (
    <Show when={!props.locked} fallback={<>Basket Locked</>}>
      <div>
        <label for="name">Name: </label>
        <input id="name" placeholder="xXCoolerTypXx" type="text" value={name()} onInput={(e) => setName(e.currentTarget.value)} />
        <button onClick={() => send()}>Send</button>
      </div>
    </Show>
  );
}


export default Client;
