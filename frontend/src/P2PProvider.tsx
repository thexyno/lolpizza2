import { Accessor, ParentProps, createContext, createEffect, createSignal, onMount, useContext } from "solid-js";
import { getRestaurantInfo, restaurantSlug } from "./lieferando-api";




type P2P = {
  baskets: baskets;
  hasPaid: string[];
  mode: "client" | "host" | "notInitialized";
  motd: string;
  restaurantInfo?: Awaited<ReturnType<typeof getRestaurantInfo>>;
  locked: boolean;
  secret?: string;
  id: string;
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

interface P2PContextFunctions {
  createNewHost: (motd?: string) => void;
  createNewClient: (hostId: string) => void;
  sendBasket: (basket: basketItem[], name: string) => void;
  clearBasket: (name: string) => void;
  setMotd: (motd: string) => void;
  tryRefresh: () => void;
  lock: (locked?: boolean) => void;
  setPaid: (name: string, paid: boolean) => void;
}

type P2PContextType = [Accessor<P2P>, P2PContextFunctions];


const P2PContext = createContext<P2PContextType>([{} as Accessor<P2P>, {} as P2PContextFunctions]);

export const BACKEND_URL = import.meta.env.BACKEND_URL ?? "http://localhost:8080";

const emptyP2P: P2P = { baskets: {}, hasPaid: [], id: "", mode: "notInitialized", motd: "", locked: false };
export type LocalStorageData = { id?: string; mode?: "client" | "host"; secret?: string; restaurantSlug?: string };
export const LocalStorageKey = "LolPizza2Data";

function initialP2P(): P2P {
  const hash = location.hash.slice(1);
  if (hash.startsWith("LP2=")) {
    const spl = hash.slice("LP2=".length).split("/");
    const hs = { slug: spl[1], id: spl[0] };
    console.log(hs);
    location.hash = '';
    if (hs.slug !== restaurantSlug()) {
      console.info("hash is sus, refresh not possible");
      return emptyP2P;
    } else {
      localStorage.setItem(LocalStorageKey, JSON.stringify({ mode: "client", id: hs.id, restaurantSlug: hs.slug }));
    }
  }

  const lsData = JSON.parse(localStorage.getItem(LocalStorageKey) || "{}") as LocalStorageData;
  if (!lsData.restaurantSlug || lsData.restaurantSlug !== location.pathname.split("/").pop()) {
    console.info(lsData);
    console.info("initial not possible");
    return emptyP2P;
  }
  if (lsData.mode === "host") {
    if (lsData.id && lsData.secret) {
      return { mode: "host", id: lsData.id, secret: lsData.secret, baskets: {}, hasPaid: [], motd: "", locked: false };
    }
  } else if (lsData.mode === "client" && lsData.id) {
    return { mode: "client", id: lsData.id, baskets: {}, hasPaid: [], motd: "", locked: false };
  }
  console.log(lsData)
  console.log('initial failed');
  return emptyP2P;
}

const cookieCheck = (cookie: string) => {
  if (cookie !== document.cookie.split(";").map((c) => c.trim()).filter((c) => c.startsWith("activeAddress="))[0]) {
    document.cookie = cookie;
    location.reload();
  }
};

type ServerEvent = {
  HasPaid: string[];
  RestaurantInfo: Awaited<ReturnType<typeof getRestaurantInfo>>;
  Cookie: string;
  BasketItems: baskets;
  Motd: string;
  Locked: boolean;
}
export function P2PProvider(props: ParentProps<{}>) {
  const [evtSource, setEvtSource] = createSignal<EventSource | null>(null);
  const [p2p, setP2p] = createSignal<P2P>(initialP2P())
  const startSSE = (hostId: string) => {
    if (evtSource()) {
      evtSource()?.close();
    }
    const eventSource = new EventSource(`${BACKEND_URL}/events/${hostId}`);
    setEvtSource(eventSource);
    eventSource.onmessage = (e) => {
      const evtMessage = JSON.parse(e.data) as ServerEvent;
      setP2p((p2p) => ({
        ...p2p,
        baskets: evtMessage.BasketItems,
        hasPaid: evtMessage.HasPaid,
        motd: evtMessage.Motd,
        restaurantInfo: evtMessage.RestaurantInfo,
        locked: evtMessage.Locked,
      }));
      cookieCheck(evtMessage.Cookie);
    };
  };
  const [timeoutId, setTimeoutId] = createSignal<number | null>(null);
  onMount(() => {
    setTimeoutId(setTimeout(() => {
      const evts = evtSource();
      if (evts?.CLOSED && p2p().id) { // try reviving the eventsource
        startSSE(p2p().id);
      }
    }, 1000));
  });
  const updateContent = () => {
    const p = p2p();
    if (!p.secret) {
      console.info("no secret, not updating");
      return;
    }
    fetch(`${BACKEND_URL}/basket?id=${p.id}&secret=${p.secret}`, {
      method: "PUT",
      body: JSON.stringify({
        HasPaid: p.hasPaid,
        RestaurantInfo: p.restaurantInfo,
        Cookie: document.cookie.split(";").map((c) => c.trim()).filter((c) => c.startsWith("activeAddress="))[0],
        Motd: p.motd,
        Locked: p.locked,
      })
    });
  };
  const refreshBasket = () => {
    fetch(`${BACKEND_URL}/basket?id=${p2p().id}`).then((res) => res.json()).then((res) => {
      res = res.Message;
      console.log(res);
      setP2p((p2p) => ({
        ...p2p,
        baskets: res.BasketItems,
        hasPaid: res.HasPaid,
        motd: res.Motd,
        restaurantInfo: res.RestaurantInfo,
        locked: res.Locked,
        cookie: res.Cookie,
      }));
      cookieCheck(res.Cookie);
    });
  };

  const store: P2PContextType = [
    p2p,
    {
      createNewHost: (motd = "", newPeer = false) => {
        getRestaurantInfo().then((restaurantInfo) => {
          fetch(`${BACKEND_URL}/basket`, {
            method: "POST",
            body: JSON.stringify({
              Motd: motd,
              RestaurantInfo: restaurantInfo,
              Cookie: document.cookie.split(";").map((c) => c.trim()).filter((c) => c.startsWith("activeAddress="))[0],
            })
          }).then((res) => res.json()).then((res) => {
            setP2p((p2p) => ({
              ...p2p,
              mode: "host",
              id: res.id,
              secret: res.secret,
              restaurantInfo,
            }));
            startSSE(res.id);
            localStorage.setItem(LocalStorageKey, JSON.stringify({ mode: "host", id: res.id, secret: res.secret, restaurantSlug: restaurantSlug() }));
          });
        });
      },
      createNewClient: (hostId: string) => {
        setP2p((p2p) => ({
          ...p2p,
          mode: "client",
          id: hostId,
        }));
        startSSE(hostId);
        localStorage.setItem(LocalStorageKey, JSON.stringify({ mode: "client", id: hostId, restaurantSlug: restaurantSlug() }));
        refreshBasket();

      },
      sendBasket: (basket: basketItem[], name: string) => {
        fetch(`${BACKEND_URL}/add?id=${p2p().id}`, { method: "POST", body: JSON.stringify({ BasketItems: basket, Name: name }) });
      },
      tryRefresh: () => {
        const hash = location.hash.slice(1);
        if (hash.startsWith("LP2=")) {
          const hs = JSON.parse(decodeURIComponent(hash.slice("LPBasketId=".length))) as { id: string, slug: string };
          location.hash = '';
          if (hs.slug !== restaurantSlug()) {
            console.info("hash is sus, refresh not possible");
            return;
          } else {
            localStorage.setItem(LocalStorageKey, JSON.stringify({ mode: "client", hostId: hs.id, restaurantSlug: hs.slug }));
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
          if (lsData.id && lsData.secret) {
            setP2p({ ...p2p(), mode: "host", id: lsData.id, secret: lsData.secret });
          }
          refreshBasket();
          startSSE(p2p().id);
        } else if (lsData.mode === "client" && lsData.id) {
          store[1].createNewClient(lsData.id);
        }
      },
      clearBasket: (name: string) => {
        fetch(`${BACKEND_URL}/clear?id=${p2p().id}`, { method: "POST", body: JSON.stringify({ Name: name }) });
      },
      setMotd: (motd: string) => {
        const data = p2p();
        if (data.mode === "host") {
          setP2p((p2p) => ({ ...p2p, motd }));
          updateContent();
        }
      },
      setPaid: (name: string, paid: boolean) => {
        if (p2p().mode === "host") {
          setP2p((p2p) => ({
            ...p2p,
            hasPaid: paid ? [...p2p.hasPaid, name] : p2p.hasPaid.filter((n) => n !== name),
          }));
          updateContent();
        }
      },
      lock: (locked = true) => {
        if (p2p().mode === "host") {
          setP2p((p2p) => ({ ...p2p, locked }));
          updateContent();
        }
      }
    }];
  onMount(() => {
    store[1].tryRefresh();
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
