import Peer, { DataConnection } from "peerjs";
import { Accessor, ParentProps, Setter, createContext, createEffect, createSignal, onMount, useContext } from "solid-js";
import { getRestaurantInfo, restaurantSlug } from "./lieferando-api";




type P2P = {
  baskets: baskets;
  hasPaid: string[];
  hostPeer: DataConnection | null;
  hostPeerId: string;
  mode: "client" | "host" | "notInitialized";
  motd: string;
  peer?: Peer;
  peers: DataConnection[];
  restaurantInfo?: Awaited<ReturnType<typeof getRestaurantInfo>>;
  locked: boolean;
}



export interface basketItem {
  name: string;
  quantity: number;
  selectedVariant: {
    prices: { delivery: number };
    selectedOptions: { [key: string]: { prices: { delivery: number } } };
  };
}

export interface baskets {
  [key: string]: basketItem[];
}

export type ClientToHostPayload = { type: "basket"; basket: basketItem[]; name: string } | { type: "clearBasket"; name: string };

export type HostToClientPayload = { motd: string; baskets: baskets; hasPaid: string[]; locked: boolean; restaurantInfo: Awaited<ReturnType<typeof getRestaurantInfo>> };

export type LocalStorageData = { hostId?: string; mode?: "client" | "host"; motd?: string; hasPaid?: string[]; baskets?: baskets; restaurantSlug?: string; };
export const LocalStorageKey = "LolPizza2Data";

interface P2PContextFunctions {
  createNewHost: (motd?: string, newPeer?: boolean) => void;
  createNewClient: (hostId: string) => void;
  sendBasket: (basket: basketItem[], name: string) => void;
  tryRefresh: () => void;
  clearBasket: (name: string) => void;
  setMotd: (motd: string) => void;
  lock: (locked?: boolean) => void;
  setPaid: (name: string, paid: boolean) => void;
}

type P2PContextType = [Accessor<P2P>, P2PContextFunctions];


const P2PContext = createContext<P2PContextType>([{} as Accessor<P2P>, {} as P2PContextFunctions]);

function hostHandleData(
  data: unknown,
  setP2p: Setter<P2P>
) {
  if (typeof data !== "object") { console.error("data is not an object: ", data); return; }
  const payload = data as ClientToHostPayload;
  if (payload.type === "basket") {
    setP2p((p2p) => ({
      ...p2p,
      baskets: {
        ...p2p.baskets,
        [payload.name]: payload.basket,
      },
    }));
  } else if (payload.type === "clearBasket") {
    setP2p((p2p) => ({
      ...p2p,
      baskets: Object.fromEntries(Object.entries(p2p.baskets).filter(([name]) => name !== payload.name)),
    }));
  }
}

function clientHandleData(
  data: unknown,
  setP2p: Setter<P2P>
) {
  console.debug("Client received: ", data);
  if (typeof data !== "object") { console.error("data is not an object: ", data); return; }
  const payload = data as HostToClientPayload;
  setP2p((p2p) => ({
    ...p2p,
    motd: payload.motd,
    baskets: payload.baskets,
    hasPaid: payload.hasPaid,
    locked: payload.locked,
    restaurantInfo: payload.restaurantInfo,
  }));
}

function setLSPeerId(peerId: string): void {
  const ls = JSON.parse(localStorage.getItem(LocalStorageKey) || "null");
  ls.hostId = peerId;
  localStorage.setItem(LocalStorageKey, JSON.stringify(ls));
}

function createPeer(newPeer = false): Peer {
  const lsPeerId = JSON.parse(localStorage.getItem(LocalStorageKey) || "null")?.hostId;
  let peer: Peer;
  if (lsPeerId && !newPeer) {
    peer = new Peer(lsPeerId);
  } else {
    peer = new Peer();
    setLSPeerId(peer.id);
  }
  return peer;
}

let hostDying = false;

function setupHostConnections(peer: Peer, setP2p: Setter<P2P>, store: P2PContextType) {
  window.addEventListener("beforeunload", (x) => {
    console.log("destroying peer");
    peer.destroy();
    x.preventDefault();
  });
  window.addEventListener("unload", (x) => {
    console.log("destroying peer");
    peer.destroy();
    x.preventDefault();
  });
  getRestaurantInfo().then((restaurantInfo) => {
    console.log("restaurantInfo: ", restaurantInfo);
    setP2p((p2p) => ({ ...p2p, restaurantInfo }));
  }).catch((err) => {
    console.error(err);
  });
  peer.removeAllListeners();
  peer.on("connection", (conn) => {
    console.info("new connection: ", conn.connectionId);
    setP2p((p2p) => ({ ...p2p, peers: [...p2p.peers, conn] }));
    setTimeout(() => {
      updateClients(store[0]());
    }, 50);

    conn.on("close", () => {
      setP2p((p2p) => ({
        ...p2p,
        peers: p2p.peers.filter((p) => p.peer !== conn.peer),
      }));
    });
    conn.on("error", (err) => {
      console.error(err);
    });
    conn.on("data", (data) => {
      console.log("data from peer: ", conn.connectionId, ": ", data);
      hostHandleData(data, setP2p);
    });
  });
  peer.on("disconnected", () => {
    peer.reconnect();
  });
  peer.on("error", (err) => {
    console.error(err);
    if (err.message.includes("is taken") && !hostDying) {
      hostDying = true;
      setP2p((p2p) => ({ ...p2p, hostPeerId: peer.id, peer: undefined }));
      setLSPeerId(peer.id + "1");
      store[1].tryRefresh()
    } else {
      peer.reconnect();
      console.log("reconnecting");
    }
  });
  peer.on("open", () => {
    console.info("host: connection opened");
    setP2p((p2p) => ({ ...p2p, hostPeerId: peer.id }));
  });
}

let clientDying = false;

function setupClientConnections(peer: Peer, setP2p: Setter<P2P>, hostId: string, store: any) {
  console.log("setting up client connections");
  peer.removeAllListeners();
  peer.on("open", () => {
    console.info("client: peer opened");
    const conn = peer.connect(hostId, { reliable: true });
    conn.on("open", () => {
      console.info("client: connection opened");
      clientDying = false;
    });
    conn.on("data", (data) => {
      console.log("data from host: ", conn.connectionId, ": ", data);
      clientHandleData(data, setP2p);
    });
    peer.on("error", (err) => {
      console.error("client peer error: ",err);
    });
    conn.on("close", () => {
      console.info("connection closed");
      console.debug("reconn");
      let hid = hostId;
      if (!conn.open && !clientDying) {
        console.log("host not available");
        clientDying = true;
        hid += "1";
      }
      store[1].createNewClient(hid);
    });
    conn.on("error", (err) => {
      console.error("conn error: ",err);
    });
    setP2p((p2p) => ({ ...p2p, peer, hostPeer: conn, hostPeerId: hostId }));
  });
}

function updateClients(p2p: P2P) {
  if (p2p.mode === "host") {
    if (!p2p.restaurantInfo) {
      console.warn("Restaurant info not loaded yet");
      return;
    }

    const dataToSend: HostToClientPayload = { motd: p2p.motd, baskets: p2p.baskets, hasPaid: p2p.hasPaid, locked: p2p.locked, restaurantInfo: p2p.restaurantInfo };
    p2p.peers.forEach((peer) => {
      peer.send(dataToSend);
    });
  }
  if (p2p.peer?.id) {
    const lsData = JSON.stringify({
      hostId: p2p.mode === 'host' ? p2p.peer?.id: p2p.hostPeerId, motd: p2p.motd, hasPaid: p2p.hasPaid, baskets: p2p.baskets, restaurantSlug: restaurantSlug(), mode: p2p.mode
    });
    console.log(lsData)
    localStorage.setItem(LocalStorageKey, lsData);
  }
}

const emptyP2P: P2P = { baskets: {}, hasPaid: [], hostPeer: null, hostPeerId: "", mode: "notInitialized", motd: "", peers: [], locked: false };

function initialP2P(): P2P {
  const hash = location.hash.slice(1);
  if (hash.startsWith("LPBasketId=")) {
    const hs = JSON.parse(decodeURIComponent(hash.slice("LPBasketId=".length))) as { peerId: string, slug: string };
    location.hash = '';
    if (hs.slug !== restaurantSlug()) {
      console.info("hash is sus, refresh not possible");
      return emptyP2P;
    } else {
      localStorage.setItem(LocalStorageKey, JSON.stringify({ mode: "client", hostId: hs.peerId, restaurantSlug: hs.slug }));
    }
  }

  const lsData = JSON.parse(localStorage.getItem(LocalStorageKey) || "{}") as LocalStorageData;
  if (!lsData.restaurantSlug || lsData.restaurantSlug !== location.pathname.split("/").pop()) {
    console.info(lsData);
    console.info("refresh not possible");
    return emptyP2P;
  }
  if (lsData.mode === "host") {
    if (lsData.hostId) {
      const peer = createPeer();
      return { peer: peer, mode: "host", peers: [], baskets: lsData.baskets ?? {}, motd: lsData.motd ?? "", hasPaid: lsData.hasPaid ?? [], hostPeer: null, hostPeerId: peer.id, locked: false };
    }
  } else if (lsData.mode === "client" && lsData.hostId) {
    const peer = createPeer(true);
    return { peer: peer, mode: "client", peers: [], baskets: {}, motd: "", hasPaid: [], hostPeer: null, hostPeerId: lsData.hostId, locked: false };
  }
  console.log(lsData)
  console.log('initial failed');
  return emptyP2P;
}

export function P2PProvider(props: ParentProps<{}>) {
  const [p2p, setP2p] = createSignal<P2P>(initialP2P())
  const store: P2PContextType = [
    p2p,
    {
      createNewHost: (motd = "", newPeer = false) => {
        if (p2p()?.peer) {
          p2p()?.peer?.destroy();
        }
        const peer = createPeer(newPeer);
        setP2p({ peer, mode: "host", peerId: peer.id, peers: [], baskets: {}, motd: motd, hasPaid: [], hostPeer: null, hostPeerId: "", locked: false });
        setupHostConnections(peer, setP2p, store as any);
      },
      createNewClient: (hostId: string) => {
        if (p2p().peer) {
          p2p().peer?.destroy();
        }
        const peer = createPeer(true);
        setP2p({ peer, mode: "client", peers: [], baskets: {}, motd: "", hasPaid: [], hostPeer: null, hostPeerId: hostId, locked: false });
        setupClientConnections(peer, setP2p, hostId, store);
      },
      sendBasket: (basket: basketItem[], name: string) => {
        if (p2p().mode === "client") {
          p2p().hostPeer?.send({ type: "basket", basket, name });
        } else {
          setP2p((p2p) => ({
            ...p2p,
            baskets: {
              ...p2p.baskets,
              name: basket,
            },
            hasPaid: [
              ...p2p.hasPaid,
              name],
          }));
        }
      },
      tryRefresh: () => {
        const hash = location.hash.slice(1);
        if (hash.startsWith("LPBasketId=")) {
          const hs = JSON.parse(decodeURIComponent(hash.slice("LPBasketId=".length))) as { peerId: string, slug: string };
          location.hash = '';
          if (hs.slug !== restaurantSlug()) {
            console.info("hash is sus, refresh not possible");
            return;
          } else {
            localStorage.setItem(LocalStorageKey, JSON.stringify({ mode: "client", hostId: hs.peerId, restaurantSlug: hs.slug }));
          }
        }

        const lsData = JSON.parse(localStorage.getItem(LocalStorageKey) || "{}") as LocalStorageData;
        if (!lsData.restaurantSlug || lsData.restaurantSlug !== location.pathname.split("/").pop()) {
          console.info(lsData);
          console.info("refresh not possible");
          return;
        }
        if (lsData.mode === "host") {
          console.info("refreshing in host mode");
          if (lsData.hostId) {
            const peer = p2p().peer?.open ? p2p().peer! : createPeer();
            setP2p({ peer: peer, mode: "host", peerId: peer.id, peers: [], baskets: lsData.baskets ?? {}, motd: lsData.motd ?? "", hasPaid: lsData.hasPaid ?? [], hostPeer: null, hostPeerId: peer.id, locked: false });
            setupHostConnections(peer, setP2p, store as any);
          }
        } else if (lsData.mode === "client" && lsData.hostId) {
          store[1].createNewClient(lsData.hostId);
        }
      },
      clearBasket: (name: string) => {
        if (p2p().mode === "client") {
          p2p().hostPeer?.send({ type: "clearBasket", name });
        } else {
          setP2p((p2p) => ({
            ...p2p,
            baskets: Object.fromEntries(Object.entries(p2p.baskets).filter(([n]) => n !== name)),
          }));
        }
      },
      setMotd: (motd: string) => {
        const data = p2p();
        if (data.mode === "host")
          setP2p((p2p) => ({ ...p2p, motd }));
      },
      setPaid: (name: string, paid: boolean) => {
        if (p2p().mode === "host") {
          setP2p((p2p) => ({
            ...p2p,
            hasPaid: paid ? [...p2p.hasPaid, name] : p2p.hasPaid.filter((n) => n !== name),
          }));
        }
      },
      lock: (locked = true) => {
        if (p2p().mode === "host")
          setP2p((p2p) => ({ ...p2p, locked }));
      }
    }];
  createEffect(() => updateClients(p2p()));
  onMount(() => {
    (store[1] as any).tryRefresh();
  });

  return (
    <P2PContext.Provider value={store as P2PContextType}>
      {props.children}
    </P2PContext.Provider>
  );
}

export function useP2P() {
  return useContext(P2PContext);
}
