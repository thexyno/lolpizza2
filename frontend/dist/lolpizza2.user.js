// ==UserScript==
// @name       lolpizza2
// @namespace  npm/vite-plugin-monkey
// @version    0.0.0
// @author     monkey
// @icon       https://vitejs.dev/logo.svg
// @match      https://*.lieferando.de/*
// @match      https://lolpizza.ragon.xyz/*
// @match      http://localhost:8080/*
// ==/UserScript==

(n=>{const e=document.createElement("style");e.dataset.source="vite-plugin-monkey",e.textContent=n,document.head.append(e)})(" ._App_1d9p1_1{text-align:center}._logo_1d9p1_5{animation:_logo-spin_1d9p1_1 infinite 20s linear;height:40vmin;pointer-events:none}._header_1d9p1_11{z-index:9999;width:100%;background-color:#f1f1f1;border:1px solid #d3d3d3;text-align:center}._innerheader_1d9p1_18{padding:10px;display:flex;justify-content:space-between;z-index:10;background-color:#2196f3;color:#fff}table{width:100%}table,th,td{border:1px solid;border-collapse:collapse}._link_1d9p1_36{color:#b318f0} ");

(function () {
  'use strict';

  const sharedConfig = {
    context: void 0,
    registry: void 0
  };
  const equalFn = (a, b) => a === b;
  const $TRACK = Symbol("solid-track");
  const signalOptions = {
    equals: equalFn
  };
  let runEffects = runQueue;
  const STALE = 1;
  const PENDING = 2;
  const UNOWNED = {
    owned: null,
    cleanups: null,
    context: null,
    owner: null
  };
  var Owner = null;
  let Transition = null;
  let Listener = null;
  let Updates = null;
  let Effects = null;
  let ExecCount = 0;
  function createRoot(fn, detachedOwner) {
    const listener = Listener, owner = Owner, unowned = fn.length === 0, root = unowned ? UNOWNED : {
      owned: null,
      cleanups: null,
      context: null,
      owner: detachedOwner === void 0 ? owner : detachedOwner
    }, updateFn = unowned ? fn : () => fn(() => untrack(() => cleanNode(root)));
    Owner = root;
    Listener = null;
    try {
      return runUpdates(updateFn, true);
    } finally {
      Listener = listener;
      Owner = owner;
    }
  }
  function createSignal(value, options) {
    options = options ? Object.assign({}, signalOptions, options) : signalOptions;
    const s = {
      value,
      observers: null,
      observerSlots: null,
      comparator: options.equals || void 0
    };
    const setter = (value2) => {
      if (typeof value2 === "function") {
        value2 = value2(s.value);
      }
      return writeSignal(s, value2);
    };
    return [readSignal.bind(s), setter];
  }
  function createRenderEffect(fn, value, options) {
    const c = createComputation(fn, value, false, STALE);
    updateComputation(c);
  }
  function createEffect(fn, value, options) {
    runEffects = runUserEffects;
    const c = createComputation(fn, value, false, STALE);
    if (!options || !options.render)
      c.user = true;
    Effects ? Effects.push(c) : updateComputation(c);
  }
  function createMemo(fn, value, options) {
    options = options ? Object.assign({}, signalOptions, options) : signalOptions;
    const c = createComputation(fn, value, true, 0);
    c.observers = null;
    c.observerSlots = null;
    c.comparator = options.equals || void 0;
    updateComputation(c);
    return readSignal.bind(c);
  }
  function untrack(fn) {
    if (Listener === null)
      return fn();
    const listener = Listener;
    Listener = null;
    try {
      return fn();
    } finally {
      Listener = listener;
    }
  }
  function onMount(fn) {
    createEffect(() => untrack(fn));
  }
  function onCleanup(fn) {
    if (Owner === null)
      ;
    else if (Owner.cleanups === null)
      Owner.cleanups = [fn];
    else
      Owner.cleanups.push(fn);
    return fn;
  }
  function getOwner() {
    return Owner;
  }
  function runWithOwner(o, fn) {
    const prev = Owner;
    const prevListener = Listener;
    Owner = o;
    Listener = null;
    try {
      return runUpdates(fn, true);
    } catch (err) {
      handleError(err);
    } finally {
      Owner = prev;
      Listener = prevListener;
    }
  }
  function createContext(defaultValue, options) {
    const id = Symbol("context");
    return {
      id,
      Provider: createProvider(id),
      defaultValue
    };
  }
  function useContext(context) {
    let ctx;
    return (ctx = lookup(Owner, context.id)) !== void 0 ? ctx : context.defaultValue;
  }
  function children(fn) {
    const children2 = createMemo(fn);
    const memo = createMemo(() => resolveChildren(children2()));
    memo.toArray = () => {
      const c = memo();
      return Array.isArray(c) ? c : c != null ? [c] : [];
    };
    return memo;
  }
  function readSignal() {
    if (this.sources && this.state) {
      if (this.state === STALE)
        updateComputation(this);
      else {
        const updates = Updates;
        Updates = null;
        runUpdates(() => lookUpstream(this), false);
        Updates = updates;
      }
    }
    if (Listener) {
      const sSlot = this.observers ? this.observers.length : 0;
      if (!Listener.sources) {
        Listener.sources = [this];
        Listener.sourceSlots = [sSlot];
      } else {
        Listener.sources.push(this);
        Listener.sourceSlots.push(sSlot);
      }
      if (!this.observers) {
        this.observers = [Listener];
        this.observerSlots = [Listener.sources.length - 1];
      } else {
        this.observers.push(Listener);
        this.observerSlots.push(Listener.sources.length - 1);
      }
    }
    return this.value;
  }
  function writeSignal(node, value, isComp) {
    let current = node.value;
    if (!node.comparator || !node.comparator(current, value)) {
      node.value = value;
      if (node.observers && node.observers.length) {
        runUpdates(() => {
          for (let i = 0; i < node.observers.length; i += 1) {
            const o = node.observers[i];
            const TransitionRunning = Transition && Transition.running;
            if (TransitionRunning && Transition.disposed.has(o))
              ;
            if (TransitionRunning ? !o.tState : !o.state) {
              if (o.pure)
                Updates.push(o);
              else
                Effects.push(o);
              if (o.observers)
                markDownstream(o);
            }
            if (!TransitionRunning)
              o.state = STALE;
          }
          if (Updates.length > 1e6) {
            Updates = [];
            if (false)
              ;
            throw new Error();
          }
        }, false);
      }
    }
    return value;
  }
  function updateComputation(node) {
    if (!node.fn)
      return;
    cleanNode(node);
    const owner = Owner, listener = Listener, time = ExecCount;
    Listener = Owner = node;
    runComputation(node, node.value, time);
    Listener = listener;
    Owner = owner;
  }
  function runComputation(node, value, time) {
    let nextValue;
    try {
      nextValue = node.fn(value);
    } catch (err) {
      if (node.pure) {
        {
          node.state = STALE;
          node.owned && node.owned.forEach(cleanNode);
          node.owned = null;
        }
      }
      node.updatedAt = time + 1;
      return handleError(err);
    }
    if (!node.updatedAt || node.updatedAt <= time) {
      if (node.updatedAt != null && "observers" in node) {
        writeSignal(node, nextValue);
      } else
        node.value = nextValue;
      node.updatedAt = time;
    }
  }
  function createComputation(fn, init, pure, state = STALE, options) {
    const c = {
      fn,
      state,
      updatedAt: null,
      owned: null,
      sources: null,
      sourceSlots: null,
      cleanups: null,
      value: init,
      owner: Owner,
      context: null,
      pure
    };
    if (Owner === null)
      ;
    else if (Owner !== UNOWNED) {
      {
        if (!Owner.owned)
          Owner.owned = [c];
        else
          Owner.owned.push(c);
      }
    }
    return c;
  }
  function runTop(node) {
    if (node.state === 0)
      return;
    if (node.state === PENDING)
      return lookUpstream(node);
    if (node.suspense && untrack(node.suspense.inFallback))
      return node.suspense.effects.push(node);
    const ancestors = [node];
    while ((node = node.owner) && (!node.updatedAt || node.updatedAt < ExecCount)) {
      if (node.state)
        ancestors.push(node);
    }
    for (let i = ancestors.length - 1; i >= 0; i--) {
      node = ancestors[i];
      if (node.state === STALE) {
        updateComputation(node);
      } else if (node.state === PENDING) {
        const updates = Updates;
        Updates = null;
        runUpdates(() => lookUpstream(node, ancestors[0]), false);
        Updates = updates;
      }
    }
  }
  function runUpdates(fn, init) {
    if (Updates)
      return fn();
    let wait = false;
    if (!init)
      Updates = [];
    if (Effects)
      wait = true;
    else
      Effects = [];
    ExecCount++;
    try {
      const res = fn();
      completeUpdates(wait);
      return res;
    } catch (err) {
      if (!wait)
        Effects = null;
      Updates = null;
      handleError(err);
    }
  }
  function completeUpdates(wait) {
    if (Updates) {
      runQueue(Updates);
      Updates = null;
    }
    if (wait)
      return;
    const e = Effects;
    Effects = null;
    if (e.length)
      runUpdates(() => runEffects(e), false);
  }
  function runQueue(queue) {
    for (let i = 0; i < queue.length; i++)
      runTop(queue[i]);
  }
  function runUserEffects(queue) {
    let i, userLength = 0;
    for (i = 0; i < queue.length; i++) {
      const e = queue[i];
      if (!e.user)
        runTop(e);
      else
        queue[userLength++] = e;
    }
    for (i = 0; i < userLength; i++)
      runTop(queue[i]);
  }
  function lookUpstream(node, ignore) {
    node.state = 0;
    for (let i = 0; i < node.sources.length; i += 1) {
      const source = node.sources[i];
      if (source.sources) {
        const state = source.state;
        if (state === STALE) {
          if (source !== ignore && (!source.updatedAt || source.updatedAt < ExecCount))
            runTop(source);
        } else if (state === PENDING)
          lookUpstream(source, ignore);
      }
    }
  }
  function markDownstream(node) {
    for (let i = 0; i < node.observers.length; i += 1) {
      const o = node.observers[i];
      if (!o.state) {
        o.state = PENDING;
        if (o.pure)
          Updates.push(o);
        else
          Effects.push(o);
        o.observers && markDownstream(o);
      }
    }
  }
  function cleanNode(node) {
    let i;
    if (node.sources) {
      while (node.sources.length) {
        const source = node.sources.pop(), index = node.sourceSlots.pop(), obs = source.observers;
        if (obs && obs.length) {
          const n = obs.pop(), s = source.observerSlots.pop();
          if (index < obs.length) {
            n.sourceSlots[s] = index;
            obs[index] = n;
            source.observerSlots[index] = s;
          }
        }
      }
    }
    if (node.owned) {
      for (i = node.owned.length - 1; i >= 0; i--)
        cleanNode(node.owned[i]);
      node.owned = null;
    }
    if (node.cleanups) {
      for (i = node.cleanups.length - 1; i >= 0; i--)
        node.cleanups[i]();
      node.cleanups = null;
    }
    node.state = 0;
    node.context = null;
  }
  function handleError(err) {
    throw err;
  }
  function lookup(owner, key) {
    return owner ? owner.context && owner.context[key] !== void 0 ? owner.context[key] : lookup(owner.owner, key) : void 0;
  }
  function resolveChildren(children2) {
    if (typeof children2 === "function" && !children2.length)
      return resolveChildren(children2());
    if (Array.isArray(children2)) {
      const results = [];
      for (let i = 0; i < children2.length; i++) {
        const result = resolveChildren(children2[i]);
        Array.isArray(result) ? results.push.apply(results, result) : results.push(result);
      }
      return results;
    }
    return children2;
  }
  function createProvider(id, options) {
    return function provider(props) {
      let res;
      createRenderEffect(() => res = untrack(() => {
        Owner.context = {
          [id]: props.value
        };
        return children(() => props.children);
      }), void 0);
      return res;
    };
  }
  const FALLBACK = Symbol("fallback");
  function dispose(d) {
    for (let i = 0; i < d.length; i++)
      d[i]();
  }
  function mapArray(list, mapFn, options = {}) {
    let items = [], mapped = [], disposers = [], len = 0, indexes = mapFn.length > 1 ? [] : null;
    onCleanup(() => dispose(disposers));
    return () => {
      let newItems = list() || [], i, j;
      newItems[$TRACK];
      return untrack(() => {
        let newLen = newItems.length, newIndices, newIndicesNext, temp, tempdisposers, tempIndexes, start, end, newEnd, item;
        if (newLen === 0) {
          if (len !== 0) {
            dispose(disposers);
            disposers = [];
            items = [];
            mapped = [];
            len = 0;
            indexes && (indexes = []);
          }
          if (options.fallback) {
            items = [FALLBACK];
            mapped[0] = createRoot((disposer) => {
              disposers[0] = disposer;
              return options.fallback();
            });
            len = 1;
          }
        } else if (len === 0) {
          mapped = new Array(newLen);
          for (j = 0; j < newLen; j++) {
            items[j] = newItems[j];
            mapped[j] = createRoot(mapper);
          }
          len = newLen;
        } else {
          temp = new Array(newLen);
          tempdisposers = new Array(newLen);
          indexes && (tempIndexes = new Array(newLen));
          for (start = 0, end = Math.min(len, newLen); start < end && items[start] === newItems[start]; start++)
            ;
          for (end = len - 1, newEnd = newLen - 1; end >= start && newEnd >= start && items[end] === newItems[newEnd]; end--, newEnd--) {
            temp[newEnd] = mapped[end];
            tempdisposers[newEnd] = disposers[end];
            indexes && (tempIndexes[newEnd] = indexes[end]);
          }
          newIndices = /* @__PURE__ */ new Map();
          newIndicesNext = new Array(newEnd + 1);
          for (j = newEnd; j >= start; j--) {
            item = newItems[j];
            i = newIndices.get(item);
            newIndicesNext[j] = i === void 0 ? -1 : i;
            newIndices.set(item, j);
          }
          for (i = start; i <= end; i++) {
            item = items[i];
            j = newIndices.get(item);
            if (j !== void 0 && j !== -1) {
              temp[j] = mapped[i];
              tempdisposers[j] = disposers[i];
              indexes && (tempIndexes[j] = indexes[i]);
              j = newIndicesNext[j];
              newIndices.set(item, j);
            } else
              disposers[i]();
          }
          for (j = start; j < newLen; j++) {
            if (j in temp) {
              mapped[j] = temp[j];
              disposers[j] = tempdisposers[j];
              if (indexes) {
                indexes[j] = tempIndexes[j];
                indexes[j](j);
              }
            } else
              mapped[j] = createRoot(mapper);
          }
          mapped = mapped.slice(0, len = newLen);
          items = newItems.slice(0);
        }
        return mapped;
      });
      function mapper(disposer) {
        disposers[j] = disposer;
        if (indexes) {
          const [s, set] = createSignal(j);
          indexes[j] = set;
          return mapFn(newItems[j], s);
        }
        return mapFn(newItems[j]);
      }
    };
  }
  function createComponent(Comp, props) {
    return untrack(() => Comp(props || {}));
  }
  const narrowedError = (name) => `Stale read from <${name}>.`;
  function For(props) {
    const fallback = "fallback" in props && {
      fallback: () => props.fallback
    };
    return createMemo(mapArray(() => props.each, props.children, fallback || void 0));
  }
  function Show(props) {
    const keyed = props.keyed;
    const condition = createMemo(() => props.when, void 0, {
      equals: (a, b) => keyed ? a === b : !a === !b
    });
    return createMemo(() => {
      const c = condition();
      if (c) {
        const child = props.children;
        const fn = typeof child === "function" && child.length > 0;
        return fn ? untrack(() => child(keyed ? c : () => {
          if (!untrack(condition))
            throw narrowedError("Show");
          return props.when;
        })) : child;
      }
      return props.fallback;
    }, void 0, void 0);
  }
  function reconcileArrays(parentNode, a, b) {
    let bLength = b.length, aEnd = a.length, bEnd = bLength, aStart = 0, bStart = 0, after = a[aEnd - 1].nextSibling, map = null;
    while (aStart < aEnd || bStart < bEnd) {
      if (a[aStart] === b[bStart]) {
        aStart++;
        bStart++;
        continue;
      }
      while (a[aEnd - 1] === b[bEnd - 1]) {
        aEnd--;
        bEnd--;
      }
      if (aEnd === aStart) {
        const node = bEnd < bLength ? bStart ? b[bStart - 1].nextSibling : b[bEnd - bStart] : after;
        while (bStart < bEnd)
          parentNode.insertBefore(b[bStart++], node);
      } else if (bEnd === bStart) {
        while (aStart < aEnd) {
          if (!map || !map.has(a[aStart]))
            a[aStart].remove();
          aStart++;
        }
      } else if (a[aStart] === b[bEnd - 1] && b[bStart] === a[aEnd - 1]) {
        const node = a[--aEnd].nextSibling;
        parentNode.insertBefore(b[bStart++], a[aStart++].nextSibling);
        parentNode.insertBefore(b[--bEnd], node);
        a[aEnd] = b[bEnd];
      } else {
        if (!map) {
          map = /* @__PURE__ */ new Map();
          let i = bStart;
          while (i < bEnd)
            map.set(b[i], i++);
        }
        const index = map.get(a[aStart]);
        if (index != null) {
          if (bStart < index && index < bEnd) {
            let i = aStart, sequence = 1, t;
            while (++i < aEnd && i < bEnd) {
              if ((t = map.get(a[i])) == null || t !== index + sequence)
                break;
              sequence++;
            }
            if (sequence > index - bStart) {
              const node = a[aStart];
              while (bStart < index)
                parentNode.insertBefore(b[bStart++], node);
            } else
              parentNode.replaceChild(b[bStart++], a[aStart++]);
          } else
            aStart++;
        } else
          a[aStart++].remove();
      }
    }
  }
  const $$EVENTS = "_$DX_DELEGATE";
  function render(code, element, init, options = {}) {
    let disposer;
    createRoot((dispose2) => {
      disposer = dispose2;
      element === document ? code() : insert(element, code(), element.firstChild ? null : void 0, init);
    }, options.owner);
    return () => {
      disposer();
      element.textContent = "";
    };
  }
  function template(html, isCE, isSVG) {
    let node;
    const create = () => {
      const t = document.createElement("template");
      t.innerHTML = html;
      return isSVG ? t.content.firstChild.firstChild : t.content.firstChild;
    };
    const fn = isCE ? () => untrack(() => document.importNode(node || (node = create()), true)) : () => (node || (node = create())).cloneNode(true);
    fn.cloneNode = fn;
    return fn;
  }
  function delegateEvents(eventNames, document2 = window.document) {
    const e = document2[$$EVENTS] || (document2[$$EVENTS] = /* @__PURE__ */ new Set());
    for (let i = 0, l = eventNames.length; i < l; i++) {
      const name = eventNames[i];
      if (!e.has(name)) {
        e.add(name);
        document2.addEventListener(name, eventHandler);
      }
    }
  }
  function className(node, value) {
    if (value == null)
      node.removeAttribute("class");
    else
      node.className = value;
  }
  function use(fn, element, arg) {
    return untrack(() => fn(element, arg));
  }
  function insert(parent, accessor, marker, initial) {
    if (marker !== void 0 && !initial)
      initial = [];
    if (typeof accessor !== "function")
      return insertExpression(parent, accessor, initial, marker);
    createRenderEffect((current) => insertExpression(parent, accessor(), current, marker), initial);
  }
  function eventHandler(e) {
    const key = `$$${e.type}`;
    let node = e.composedPath && e.composedPath()[0] || e.target;
    if (e.target !== node) {
      Object.defineProperty(e, "target", {
        configurable: true,
        value: node
      });
    }
    Object.defineProperty(e, "currentTarget", {
      configurable: true,
      get() {
        return node || document;
      }
    });
    while (node) {
      const handler = node[key];
      if (handler && !node.disabled) {
        const data = node[`${key}Data`];
        data !== void 0 ? handler.call(node, data, e) : handler.call(node, e);
        if (e.cancelBubble)
          return;
      }
      node = node._$host || node.parentNode || node.host;
    }
  }
  function insertExpression(parent, value, current, marker, unwrapArray) {
    while (typeof current === "function")
      current = current();
    if (value === current)
      return current;
    const t = typeof value, multi = marker !== void 0;
    parent = multi && current[0] && current[0].parentNode || parent;
    if (t === "string" || t === "number") {
      if (t === "number")
        value = value.toString();
      if (multi) {
        let node = current[0];
        if (node && node.nodeType === 3) {
          node.data = value;
        } else
          node = document.createTextNode(value);
        current = cleanChildren(parent, current, marker, node);
      } else {
        if (current !== "" && typeof current === "string") {
          current = parent.firstChild.data = value;
        } else
          current = parent.textContent = value;
      }
    } else if (value == null || t === "boolean") {
      current = cleanChildren(parent, current, marker);
    } else if (t === "function") {
      createRenderEffect(() => {
        let v = value();
        while (typeof v === "function")
          v = v();
        current = insertExpression(parent, v, current, marker);
      });
      return () => current;
    } else if (Array.isArray(value)) {
      const array = [];
      const currentArray = current && Array.isArray(current);
      if (normalizeIncomingArray(array, value, current, unwrapArray)) {
        createRenderEffect(() => current = insertExpression(parent, array, current, marker, true));
        return () => current;
      }
      if (array.length === 0) {
        current = cleanChildren(parent, current, marker);
        if (multi)
          return current;
      } else if (currentArray) {
        if (current.length === 0) {
          appendNodes(parent, array, marker);
        } else
          reconcileArrays(parent, current, array);
      } else {
        current && cleanChildren(parent);
        appendNodes(parent, array);
      }
      current = array;
    } else if (value.nodeType) {
      if (Array.isArray(current)) {
        if (multi)
          return current = cleanChildren(parent, current, marker, value);
        cleanChildren(parent, current, null, value);
      } else if (current == null || current === "" || !parent.firstChild) {
        parent.appendChild(value);
      } else
        parent.replaceChild(value, parent.firstChild);
      current = value;
    } else
      console.warn(`Unrecognized value. Skipped inserting`, value);
    return current;
  }
  function normalizeIncomingArray(normalized, array, current, unwrap) {
    let dynamic = false;
    for (let i = 0, len = array.length; i < len; i++) {
      let item = array[i], prev = current && current[i], t;
      if (item == null || item === true || item === false)
        ;
      else if ((t = typeof item) === "object" && item.nodeType) {
        normalized.push(item);
      } else if (Array.isArray(item)) {
        dynamic = normalizeIncomingArray(normalized, item, prev) || dynamic;
      } else if (t === "function") {
        if (unwrap) {
          while (typeof item === "function")
            item = item();
          dynamic = normalizeIncomingArray(normalized, Array.isArray(item) ? item : [item], Array.isArray(prev) ? prev : [prev]) || dynamic;
        } else {
          normalized.push(item);
          dynamic = true;
        }
      } else {
        const value = String(item);
        if (prev && prev.nodeType === 3 && prev.data === value)
          normalized.push(prev);
        else
          normalized.push(document.createTextNode(value));
      }
    }
    return dynamic;
  }
  function appendNodes(parent, array, marker = null) {
    for (let i = 0, len = array.length; i < len; i++)
      parent.insertBefore(array[i], marker);
  }
  function cleanChildren(parent, current, marker, replacement) {
    if (marker === void 0)
      return parent.textContent = "";
    const node = replacement || document.createTextNode("");
    if (current.length) {
      let inserted = false;
      for (let i = current.length - 1; i >= 0; i--) {
        const el = current[i];
        if (node !== el) {
          const isParent = el.parentNode === parent;
          if (!inserted && !i)
            isParent ? parent.replaceChild(node, el) : parent.insertBefore(node, marker);
          else
            isParent && el.remove();
        } else
          inserted = true;
      }
    } else
      parent.insertBefore(node, marker);
    return [node];
  }
  const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
  function createElement(tagName, isSVG = false) {
    return isSVG ? document.createElementNS(SVG_NAMESPACE, tagName) : document.createElement(tagName);
  }
  function Portal(props) {
    const {
      useShadow
    } = props, marker = document.createTextNode(""), mount = () => props.mount || document.body, owner = getOwner();
    let content;
    let hydrating = !!sharedConfig.context;
    createEffect(() => {
      content || (content = runWithOwner(owner, () => props.children));
      const el = mount();
      if (el instanceof HTMLHeadElement) {
        const [clean, setClean] = createSignal(false);
        const cleanup = () => setClean(true);
        createRoot((dispose2) => insert(el, () => !clean() ? content : dispose2(), null));
        onCleanup(cleanup);
      } else {
        const container = createElement(props.isSVG ? "g" : "div", props.isSVG), renderRoot = useShadow && container.attachShadow ? container.attachShadow({
          mode: "open"
        }) : container;
        Object.defineProperty(container, "_$host", {
          get() {
            return marker.parentNode;
          },
          configurable: true
        });
        insert(renderRoot, content);
        el.appendChild(container);
        props.ref && props.ref(container);
        onCleanup(() => el.removeChild(container));
      }
    }, void 0, {
      render: !hydrating
    });
    return marker;
  }
  const App$1 = "_App_1d9p1_1";
  const logo = "_logo_1d9p1_5";
  const header = "_header_1d9p1_11";
  const innerheader = "_innerheader_1d9p1_18";
  const link = "_link_1d9p1_36";
  const styles = {
    App: App$1,
    logo,
    "logo-spin": "_logo-spin_1d9p1_1",
    header,
    innerheader,
    link
  };
  async function getRestaurantInfo() {
    const primarySlug = restaurantSlug();
    const sessionId = JSON.parse(decodeURIComponent(document.cookie.split(";").find((cookie) => cookie.includes("cwSession")).split("=")[1]))["id"];
    const restaurantInfo = await fetch(`https://cw-api.takeaway.com/api/v33/restaurant?slug=${primarySlug}`, {
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        "X-Country-Code": "de",
        "X-Language-Code": "de",
        "X-Session-Id": sessionId
      }
    }).then((res) => res.json());
    return restaurantInfo;
  }
  function restaurantSlug() {
    return window.location.pathname.split("/").pop();
  }
  const P2PContext = createContext([{}, {}]);
  const BACKEND_URL = {}.BACKEND_URL ?? "http://localhost:8080";
  const emptyP2P = {
    baskets: {},
    hasPaid: [],
    id: "",
    mode: "notInitialized",
    motd: "",
    locked: false
  };
  const LocalStorageKey = "LolPizza2Data";
  function initialP2P() {
    const hash = location.hash.slice(1);
    if (hash.startsWith("LP2=")) {
      const spl = hash.slice("LP2=".length).split("/");
      const hs = {
        slug: spl[1],
        id: spl[0]
      };
      console.log(hs);
      location.hash = "";
      if (hs.slug !== restaurantSlug()) {
        console.info("hash is sus, refresh not possible");
        return emptyP2P;
      } else {
        localStorage.setItem(LocalStorageKey, JSON.stringify({
          mode: "client",
          id: hs.id,
          restaurantSlug: hs.slug
        }));
      }
    }
    const lsData = JSON.parse(localStorage.getItem(LocalStorageKey) || "{}");
    if (!lsData.restaurantSlug || lsData.restaurantSlug !== location.pathname.split("/").pop()) {
      console.info(lsData);
      console.info("initial not possible");
      return emptyP2P;
    }
    if (lsData.mode === "host") {
      if (lsData.id && lsData.secret) {
        return {
          mode: "host",
          id: lsData.id,
          secret: lsData.secret,
          baskets: {},
          hasPaid: [],
          motd: "",
          locked: false
        };
      }
    } else if (lsData.mode === "client" && lsData.id) {
      return {
        mode: "client",
        id: lsData.id,
        baskets: {},
        hasPaid: [],
        motd: "",
        locked: false
      };
    }
    console.log(lsData);
    console.log("initial failed");
    return emptyP2P;
  }
  const cookieCheck = (cookie) => {
    if (cookie !== document.cookie.split(";").map((c) => c.trim()).filter((c) => c.startsWith("activeAddress="))[0]) {
      document.cookie = cookie;
      location.reload();
    }
  };
  function P2PProvider(props) {
    const [evtSource, setEvtSource] = createSignal(null);
    const [p2p, setP2p] = createSignal(initialP2P());
    const startSSE = (hostId) => {
      var _a;
      if (evtSource()) {
        (_a = evtSource()) == null ? void 0 : _a.close();
      }
      const eventSource = new EventSource(`${BACKEND_URL}/events/${hostId}`);
      setEvtSource(eventSource);
      eventSource.onmessage = (e) => {
        const evtMessage = JSON.parse(e.data);
        setP2p((p2p2) => ({
          ...p2p2,
          baskets: evtMessage.BasketItems,
          hasPaid: evtMessage.HasPaid,
          motd: evtMessage.Motd,
          restaurantInfo: evtMessage.RestaurantInfo,
          locked: evtMessage.Locked
        }));
        cookieCheck(evtMessage.Cookie);
      };
    };
    const [timeoutId, setTimeoutId] = createSignal(null);
    onMount(() => {
      setTimeoutId(setTimeout(() => {
        const evts = evtSource();
        if ((evts == null ? void 0 : evts.CLOSED) && p2p().id) {
          startSSE(p2p().id);
        }
      }, 1e3));
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
          Locked: p.locked
        })
      });
    };
    const refreshBasket = () => {
      fetch(`${BACKEND_URL}/basket?id=${p2p().id}`).then((res) => res.json()).then((res) => {
        res = res.Message;
        console.log(res);
        setP2p((p2p2) => ({
          ...p2p2,
          baskets: res.BasketItems,
          hasPaid: res.HasPaid,
          motd: res.Motd,
          restaurantInfo: res.RestaurantInfo,
          locked: res.Locked,
          cookie: res.Cookie
        }));
        cookieCheck(res.Cookie);
      });
    };
    const store = [p2p, {
      createNewHost: (motd = "", newPeer = false) => {
        getRestaurantInfo().then((restaurantInfo) => {
          fetch(`${BACKEND_URL}/basket`, {
            method: "POST",
            body: JSON.stringify({
              Motd: motd,
              RestaurantInfo: restaurantInfo,
              Cookie: document.cookie.split(";").map((c) => c.trim()).filter((c) => c.startsWith("activeAddress="))[0]
            })
          }).then((res) => res.json()).then((res) => {
            setP2p((p2p2) => ({
              ...p2p2,
              mode: "host",
              id: res.id,
              secret: res.secret,
              restaurantInfo
            }));
            startSSE(res.id);
            localStorage.setItem(LocalStorageKey, JSON.stringify({
              mode: "host",
              id: res.id,
              secret: res.secret,
              restaurantSlug: restaurantSlug()
            }));
          });
        });
      },
      createNewClient: (hostId) => {
        setP2p((p2p2) => ({
          ...p2p2,
          mode: "client",
          id: hostId
        }));
        startSSE(hostId);
        localStorage.setItem(LocalStorageKey, JSON.stringify({
          mode: "client",
          id: hostId,
          restaurantSlug: restaurantSlug()
        }));
        refreshBasket();
      },
      sendBasket: (basket, name) => {
        fetch(`${BACKEND_URL}/add?id=${p2p().id}`, {
          method: "POST",
          body: JSON.stringify({
            BasketItems: basket,
            Name: name
          })
        });
      },
      tryRefresh: () => {
        const hash = location.hash.slice(1);
        if (hash.startsWith("LP2=")) {
          const hs = JSON.parse(decodeURIComponent(hash.slice("LPBasketId=".length)));
          location.hash = "";
          if (hs.slug !== restaurantSlug()) {
            console.info("hash is sus, refresh not possible");
            return;
          } else {
            localStorage.setItem(LocalStorageKey, JSON.stringify({
              mode: "client",
              hostId: hs.id,
              restaurantSlug: hs.slug
            }));
          }
        }
        const lsData = JSON.parse(localStorage.getItem(LocalStorageKey) || "{}");
        if (!lsData.restaurantSlug || lsData.restaurantSlug !== location.pathname.split("/").pop()) {
          console.info(lsData);
          console.info("refresh not possible");
          return;
        }
        if (lsData.mode === "host") {
          console.info("refreshing in host mode");
          if (lsData.id && lsData.secret) {
            setP2p({
              ...p2p(),
              mode: "host",
              id: lsData.id,
              secret: lsData.secret
            });
          }
          refreshBasket();
          startSSE(p2p().id);
        } else if (lsData.mode === "client" && lsData.id) {
          store[1].createNewClient(lsData.id);
        }
      },
      clearBasket: (name) => {
        fetch(`${BACKEND_URL}/clear?id=${p2p().id}`, {
          method: "POST",
          body: JSON.stringify({
            Name: name
          })
        });
      },
      setMotd: (motd) => {
        const data = p2p();
        if (data.mode === "host") {
          setP2p((p2p2) => ({
            ...p2p2,
            motd
          }));
          updateContent();
        }
      },
      setPaid: (name, paid) => {
        if (p2p().mode === "host") {
          setP2p((p2p2) => ({
            ...p2p2,
            hasPaid: paid ? [...p2p2.hasPaid, name] : p2p2.hasPaid.filter((n) => n !== name)
          }));
          updateContent();
        }
      },
      lock: (locked = true) => {
        if (p2p().mode === "host") {
          setP2p((p2p2) => ({
            ...p2p2,
            locked
          }));
          updateContent();
        }
      }
    }];
    onMount(() => {
      store[1].tryRefresh();
    });
    return createComponent(P2PContext.Provider, {
      value: store,
      get children() {
        return props.children;
      }
    });
  }
  function useP2P() {
    return useContext(P2PContext);
  }
  const _tmpl$$3 = /* @__PURE__ */ template(`<button>Unlock Basket`), _tmpl$2$3 = /* @__PURE__ */ template(`<div><button>Apply Basket to real basket</button><button>Clear Basket`), _tmpl$3$2 = /* @__PURE__ */ template(`<div>MOTD: <input type="text">`), _tmpl$4$2 = /* @__PURE__ */ template(`<button>Lock Basket`);
  function deepEqual(x, y) {
    const ok = Object.keys, tx = typeof x, ty = typeof y;
    return x && y && tx === "object" && tx === ty ? ok(x).length === ok(y).length && ok(x).every((key) => deepEqual(x[key], y[key])) : x === y;
  }
  const apply = async (data) => {
    if (!data) {
      alert("No basket data");
      return;
    }
    let basketItems = [];
    const restaurantId = await getRestaurantInfo().then((x) => x.restaurantId);
    for (const [user, items] of Object.entries(data)) {
      for (let item of items) {
        const itemWithoutQuantity = {
          ...item,
          quantity: 1
        };
        let itemInStore = basketItems.find((x) => deepEqual({
          ...x,
          quantity: 1
        }, itemWithoutQuantity));
        if (itemInStore) {
          basketItems[basketItems.indexOf(itemInStore)].quantity += item.quantity;
        } else {
          basketItems.push(item);
        }
      }
    }
    let orders = JSON.parse(window.localStorage.getItem("savedOrders"));
    orders[restaurantId]["cartItems"] = basketItems;
    window.localStorage.setItem("savedOrders", JSON.stringify(orders));
    window.location.reload();
  };
  const Host = () => {
    const [p2p, p2pFun] = useP2P();
    console.log(p2p());
    return [(() => {
      const _el$ = _tmpl$2$3(), _el$3 = _el$.firstChild, _el$4 = _el$3.nextSibling;
      insert(_el$, createComponent(Show, {
        get when() {
          return p2p().locked;
        },
        get fallback() {
          return (() => {
            const _el$8 = _tmpl$4$2();
            _el$8.$$click = () => p2pFun.lock(true);
            return _el$8;
          })();
        },
        get children() {
          const _el$2 = _tmpl$$3();
          _el$2.$$click = () => p2pFun.lock(false);
          return _el$2;
        }
      }), _el$3);
      _el$3.$$click = () => apply(p2p().baskets);
      _el$4.$$click = () => p2pFun.createNewHost();
      return _el$;
    })(), (() => {
      const _el$5 = _tmpl$3$2(), _el$6 = _el$5.firstChild, _el$7 = _el$6.nextSibling;
      _el$7.$$input = (e) => p2pFun.setMotd(e.currentTarget.value);
      createRenderEffect(() => _el$7.value = p2p().motd);
      return _el$5;
    })()];
  };
  delegateEvents(["click", "input"]);
  const _tmpl$$2 = /* @__PURE__ */ template(`<div><label for="name">Name: </label><input id="name" placeholder="xXCoolerTypXx" type="text"><button>Send</button><button>Clear`), _tmpl$2$2 = /* @__PURE__ */ template(`<button>Send to LolPizza`), _tmpl$3$1 = /* @__PURE__ */ template(`<div>`), _tmpl$4$1 = /* @__PURE__ */ template(`<button>Please set your LolPizza Name`);
  const Client = () => {
    var _a;
    const [p2p, p2pFun] = useP2P();
    const [name, setName] = createSignal(window.localStorage.getItem("LolPizzaName") ?? "");
    async function send() {
      var _a2;
      const restaurantId = (_a2 = p2p().restaurantInfo) == null ? void 0 : _a2.restaurantId;
      console.log(p2p().restaurantInfo);
      if (!restaurantId) {
        alert("No restaurant id");
        return;
      }
      const order = JSON.parse(window.localStorage.getItem("savedOrders"))[restaurantId]["cartItems"];
      if (name() != "") {
        p2pFun.sendBasket(order, name());
      }
    }
    function saveName(nm) {
      window.localStorage.setItem("LolPizzaName", nm);
      setName(nm);
    }
    let nameInput;
    const [mountEl, setMountEl] = createSignal((_a = document.querySelector('div[data-qa="sidebar-title"]')) == null ? void 0 : _a.lastChild);
    const [timeoutId, setTimeoutId] = createSignal(null);
    createEffect(() => {
      setTimeoutId(setTimeout(() => {
        var _a2;
        const el = (_a2 = document.querySelector('div[data-qa="sidebar-title"]')) == null ? void 0 : _a2.lastChild;
        if (el) {
          setMountEl(el);
        }
      }, 1e3));
    }, []);
    return createComponent(Show, {
      get when() {
        return !p2p().locked;
      },
      get fallback() {
        return "Basket Locked";
      },
      get children() {
        return [(() => {
          const _el$ = _tmpl$$2(), _el$2 = _el$.firstChild, _el$3 = _el$2.nextSibling, _el$4 = _el$3.nextSibling, _el$5 = _el$4.nextSibling;
          _el$3.$$input = (e) => saveName(e.currentTarget.value);
          const _ref$ = nameInput;
          typeof _ref$ === "function" ? use(_ref$, _el$3) : nameInput = _el$3;
          _el$4.$$click = () => send();
          _el$5.$$click = () => p2pFun.clearBasket(name());
          createRenderEffect(() => _el$3.value = name());
          return _el$;
        })(), createComponent(Show, {
          get when() {
            return mountEl();
          },
          get children() {
            return createComponent(Portal, {
              get mount() {
                return mountEl();
              },
              get children() {
                const _el$6 = _tmpl$3$1();
                _el$6.style.setProperty("display", "flex");
                _el$6.style.setProperty("align-items", "center");
                _el$6.style.setProperty("justify-content", "center");
                insert(_el$6, createComponent(Show, {
                  get when() {
                    return name() != "";
                  },
                  get fallback() {
                    return (() => {
                      const _el$8 = _tmpl$4$1();
                      _el$8.$$click = () => nameInput.focus();
                      return _el$8;
                    })();
                  },
                  get children() {
                    const _el$7 = _tmpl$2$2();
                    _el$7.$$click = () => send();
                    return _el$7;
                  }
                }));
                return _el$6;
              }
            });
          }
        })];
      }
    });
  };
  delegateEvents(["input", "click"]);
  const _tmpl$$1 = /* @__PURE__ */ template(`<table><thead><tr><th>User</th><th>Items</th><th>Total Price</th><th>Has Paid</th></tr></thead><tbody>`), _tmpl$2$1 = /* @__PURE__ */ template(`<tr><td></td><td></td><td>€</td><td><input type="checkbox">`);
  const ItemTable = () => {
    const [p2p, p2pFun] = useP2P();
    const data = () => p2p().baskets;
    const hasPaid = () => p2p().hasPaid ?? [];
    const mode = () => p2p().mode;
    return (() => {
      const _el$ = _tmpl$$1(), _el$2 = _el$.firstChild, _el$3 = _el$2.nextSibling;
      insert(_el$3, createComponent(For, {
        get each() {
          return Object.entries(data() ?? {});
        },
        children: ([user, items]) => (() => {
          const _el$4 = _tmpl$2$1(), _el$5 = _el$4.firstChild, _el$6 = _el$5.nextSibling, _el$7 = _el$6.nextSibling, _el$8 = _el$7.firstChild, _el$9 = _el$7.nextSibling, _el$10 = _el$9.firstChild;
          insert(_el$5, user);
          insert(_el$6, () => items.map((item) => `${item.name} x ${item.quantity} (${calculatePrice(item) / 100}€)`).join(", "));
          insert(_el$7, () => items.map(calculatePrice).reduce((acc, x) => acc + x, 0) / 100, _el$8);
          _el$10.addEventListener("change", (x) => p2pFun.setPaid(user, x.currentTarget.checked));
          createRenderEffect(() => _el$10.disabled = mode() !== "host");
          createRenderEffect(() => _el$10.checked = hasPaid().includes(user));
          return _el$4;
        })()
      }));
      return _el$;
    })();
  };
  const calculatePrice = (item) => {
    let basePrice = item.selectedVariant.prices.delivery;
    let optionPrice = Object.values(item.selectedVariant.selectedOptions).reduce((acc, x) => acc + x.prices.delivery, 0);
    return (basePrice + optionPrice) * item.quantity;
  };
  const _tmpl$ = /* @__PURE__ */ template(`<span>MOTD: `), _tmpl$2 = /* @__PURE__ */ template(`<span>Locked`), _tmpl$3 = /* @__PURE__ */ template(`<button>Reconnect`), _tmpl$4 = /* @__PURE__ */ template(`<br>`), _tmpl$5 = /* @__PURE__ */ template(`<p>HOST Settings`), _tmpl$6 = /* @__PURE__ */ template(`<p>Client Settings`), _tmpl$7 = /* @__PURE__ */ template(`<div id="lolpizza-app"><div id="lolpizza-header"><span>Lolpizza2 in <!> mode</span></div><br><div>Current Host ID: <input><br><button>Create New Host</button><br></div><div>`);
  const _App = () => {
    const [p2p, p2pFun] = useP2P();
    const locked = () => p2p().locked;
    const mode = () => p2p().mode;
    const basketId = () => p2p().id;
    const motd = () => p2p().motd;
    return (() => {
      const _el$ = _tmpl$7(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild, _el$6 = _el$4.nextSibling;
      _el$6.nextSibling;
      const _el$10 = _el$2.nextSibling, _el$11 = _el$10.nextSibling, _el$12 = _el$11.firstChild, _el$13 = _el$12.nextSibling, _el$15 = _el$13.nextSibling, _el$16 = _el$15.nextSibling, _el$17 = _el$11.nextSibling;
      insert(_el$3, mode, _el$6);
      insert(_el$2, createComponent(Show, {
        get when() {
          return motd() !== "";
        },
        get children() {
          const _el$7 = _tmpl$();
          _el$7.firstChild;
          insert(_el$7, motd, null);
          return _el$7;
        }
      }), null);
      insert(_el$2, createComponent(Show, {
        get when() {
          return locked();
        },
        get children() {
          return _tmpl$2();
        }
      }), null);
      _el$11.style.setProperty("padding", "4px");
      _el$13.$$input = (e) => p2pFun.createNewClient(e.currentTarget.value);
      _el$13.style.setProperty("width", "21em");
      insert(_el$11, createComponent(Show, {
        get when() {
          return mode() === "client";
        },
        get children() {
          const _el$14 = _tmpl$3();
          _el$14.$$click = () => p2pFun.createNewClient(basketId());
          return _el$14;
        }
      }), _el$15);
      _el$16.$$click = () => p2pFun.createNewHost();
      insert(_el$17, createComponent(Show, {
        get when() {
          return basketId() !== "";
        },
        get children() {
          return ["URL: ", BACKEND_URL, "#LP2=", createMemo(() => basketId()), "/", createMemo(() => restaurantSlug()), _tmpl$4(), createComponent(ItemTable, {}), createComponent(Show, {
            get when() {
              return mode() === "host";
            },
            get children() {
              return [_tmpl$5(), createComponent(Host, {})];
            }
          }), _tmpl$6(), createComponent(Client, {})];
        }
      }));
      createRenderEffect((_p$) => {
        const _v$ = styles.header, _v$2 = styles.innerheader, _v$3 = mode() === "host";
        _v$ !== _p$._v$ && className(_el$, _p$._v$ = _v$);
        _v$2 !== _p$._v$2 && className(_el$2, _p$._v$2 = _v$2);
        _v$3 !== _p$._v$3 && (_el$13.disabled = _p$._v$3 = _v$3);
        return _p$;
      }, {
        _v$: void 0,
        _v$2: void 0,
        _v$3: void 0
      });
      createRenderEffect(() => _el$13.value = basketId());
      return _el$;
    })();
  };
  const App = () => {
    return createComponent(P2PProvider, {
      get children() {
        return createComponent(_App, {});
      }
    });
  };
  delegateEvents(["input", "click"]);
  const myLittleInterval = setInterval(() => {
    const el = document.querySelector('section[data-qa="page-section"]');
    if (el) {
      render(() => createComponent(App, {}), (() => {
        const app = document.createElement("div");
        el.prepend(app);
        return app;
      })());
      clearInterval(myLittleInterval);
    }
  }, 300);
  const GH_PAGES = "https://thexyno.github.io/lolpizza2";
  if (location.origin === GH_PAGES || location.origin === "http://localhost:8080" || location.origin === "https://lolpizza.ragon.xyz") {
    if (location.hash[0] === "#") {
      let hsh = location.hash.slice(1).split("/")[1];
      console.log(hsh);
      location.href = `https://www.lieferando.de/speisekarte/${hsh}${location.hash}`;
    }
  }

})();
