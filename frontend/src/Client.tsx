import { Component } from "solid-js";

const Host: Component = () => {
const url = (window as any).lolpizzaUrl as string;
return (
<div>
<button onClick={() => send()}>Send</button>
</div>
);
}


export default Host;
