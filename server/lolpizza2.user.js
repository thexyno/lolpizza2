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
  const NO_INIT = {};
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
  function createComputed(fn, value, options) {
    const c = createComputation(fn, value, true, STALE);
    updateComputation(c);
  }
  function createRenderEffect(fn, value, options) {
    const c = createComputation(fn, value, false, STALE);
    updateComputation(c);
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
  function createResource(pSource, pFetcher, pOptions) {
    let source;
    let fetcher;
    let options;
    if (arguments.length === 2 && typeof pFetcher === "object" || arguments.length === 1) {
      source = true;
      fetcher = pSource;
      options = pFetcher || {};
    } else {
      source = pSource;
      fetcher = pFetcher;
      options = pOptions || {};
    }
    let pr = null, initP = NO_INIT, scheduled = false, resolved = "initialValue" in options, dynamic = typeof source === "function" && createMemo(source);
    const contexts = /* @__PURE__ */ new Set(), [value, setValue] = (options.storage || createSignal)(options.initialValue), [error, setError] = createSignal(void 0), [track, trigger] = createSignal(void 0, {
      equals: false
    }), [state, setState] = createSignal(resolved ? "ready" : "unresolved");
    function loadEnd(p, v, error2, key) {
      if (pr === p) {
        pr = null;
        key !== void 0 && (resolved = true);
        if ((p === initP || v === initP) && options.onHydrated)
          queueMicrotask(() => options.onHydrated(key, {
            value: v
          }));
        initP = NO_INIT;
        completeLoad(v, error2);
      }
      return v;
    }
    function completeLoad(v, err) {
      runUpdates(() => {
        if (err === void 0)
          setValue(() => v);
        setState(err !== void 0 ? "errored" : resolved ? "ready" : "unresolved");
        setError(err);
        for (const c of contexts.keys())
          c.decrement();
        contexts.clear();
      }, false);
    }
    function read() {
      const c = SuspenseContext, v = value(), err = error();
      if (err !== void 0 && !pr)
        throw err;
      if (Listener && !Listener.user && c) {
        createComputed(() => {
          track();
          if (pr) {
            if (c.resolved)
              ;
            else if (!contexts.has(c)) {
              c.increment();
              contexts.add(c);
            }
          }
        });
      }
      return v;
    }
    function load(refetching = true) {
      if (refetching !== false && scheduled)
        return;
      scheduled = false;
      const lookup = dynamic ? dynamic() : source;
      if (lookup == null || lookup === false) {
        loadEnd(pr, untrack(value));
        return;
      }
      const p = initP !== NO_INIT ? initP : untrack(() => fetcher(lookup, {
        value: value(),
        refetching
      }));
      if (typeof p !== "object" || !(p && "then" in p)) {
        loadEnd(pr, p, void 0, lookup);
        return p;
      }
      pr = p;
      scheduled = true;
      queueMicrotask(() => scheduled = false);
      runUpdates(() => {
        setState(resolved ? "refreshing" : "pending");
        trigger();
      }, false);
      return p.then((v) => loadEnd(p, v, void 0, lookup), (e) => loadEnd(p, void 0, castError(e), lookup));
    }
    Object.defineProperties(read, {
      state: {
        get: () => state()
      },
      error: {
        get: () => error()
      },
      loading: {
        get() {
          const s = state();
          return s === "pending" || s === "refreshing";
        }
      },
      latest: {
        get() {
          if (!resolved)
            return read();
          const err = error();
          if (err && !pr)
            throw err;
          return value();
        }
      }
    });
    if (dynamic)
      createComputed(() => load(false));
    else
      load(false);
    return [read, {
      refetch: load,
      mutate: setValue
    }];
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
  function onCleanup(fn) {
    if (Owner === null)
      ;
    else if (Owner.cleanups === null)
      Owner.cleanups = [fn];
    else
      Owner.cleanups.push(fn);
    return fn;
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
  let SuspenseContext;
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
  function castError(err) {
    if (err instanceof Error)
      return err;
    return new Error(typeof err === "string" ? err : "Unknown error", {
      cause: err
    });
  }
  function handleError(err) {
    throw err;
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
  function Switch(props) {
    let keyed = false;
    const equals = (a, b) => a[0] === b[0] && (keyed ? a[1] === b[1] : !a[1] === !b[1]) && a[2] === b[2];
    const conditions = children(() => props.children), evalConditions = createMemo(() => {
      let conds = conditions();
      if (!Array.isArray(conds))
        conds = [conds];
      for (let i = 0; i < conds.length; i++) {
        const c = conds[i].when;
        if (c) {
          keyed = !!conds[i].keyed;
          return [i, c, conds[i]];
        }
      }
      return [-1];
    }, void 0, {
      equals
    });
    return createMemo(() => {
      const [index, when, cond] = evalConditions();
      if (index < 0)
        return props.fallback;
      const c = cond.children;
      const fn = typeof c === "function" && c.length > 0;
      return fn ? untrack(() => c(keyed ? when : () => {
        if (untrack(evalConditions)[0] !== index)
          throw narrowedError("Match");
        return cond.when;
      })) : c;
    }, void 0, void 0);
  }
  function Match(props) {
    return props;
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
    const primarySlug = window.location.pathname.split("/").pop();
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
  const _tmpl$$3 = /* @__PURE__ */ template(`<button>Unlock Basket`), _tmpl$2$2 = /* @__PURE__ */ template(`<div><button>Apply Basket to real basket</button><button>Clear Basket`), _tmpl$3$1 = /* @__PURE__ */ template(`<button>Lock Basket`);
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
  const lock = async (data) => await fetch(`${url2}/basket/lock?id=${data}`, {
    method: "POST"
  }).then((res) => res.text()).then((res) => console.log(res));
  const unlock = async (data) => await fetch(`${url2}/basket/lock?id=${data}&unlock=true`, {
    method: "POST"
  }).then((res) => res.text()).then((res) => console.log(res));
  const clearBasket = async (data, set, refetch) => {
    await fetch(`${url2}/basket?id=${data}`, {
      method: "DELETE"
    }).then((res) => res.text()).then(() => {
      window.localStorage.removeItem("LolPizzaBasketId");
      set("");
      refetch();
    });
  };
  const Host = (props) => {
    return (() => {
      const _el$ = _tmpl$2$2(), _el$3 = _el$.firstChild, _el$4 = _el$3.nextSibling;
      insert(_el$, createComponent(Show, {
        get when() {
          return props.locked;
        },
        get fallback() {
          return (() => {
            const _el$5 = _tmpl$3$1();
            _el$5.$$click = () => lock(props.basketId).then(() => props.refetch());
            return _el$5;
          })();
        },
        get children() {
          const _el$2 = _tmpl$$3();
          _el$2.$$click = () => unlock(props.basketId).then(() => props.refetch());
          return _el$2;
        }
      }), _el$3);
      _el$3.$$click = () => apply(props.data);
      _el$4.$$click = () => clearBasket(props.basketId, props.setBasketId, props.refetch);
      return _el$;
    })();
  };
  delegateEvents(["click"]);
  const _tmpl$$2 = /* @__PURE__ */ template(`<div><label for="name">Name: </label><input id="name" placeholder="xXCoolerTypXx" type="text"><button>Send`);
  const Client = (props) => {
    const [name, setName] = createSignal(window.localStorage.getItem("LolPizzaName") ?? "");
    async function send() {
      const restaurantId = await getRestaurantInfo().then((x) => x.restaurantId);
      const order = JSON.parse(window.localStorage.getItem("savedOrders"))[restaurantId]["cartItems"];
      if (name() != "") {
        fetch(`http://localhost:8080/basket?id=${props.basketId}&name=${encodeURIComponent(name())}`, {
          method: "PUT",
          body: JSON.stringify(order)
        });
      }
    }
    function saveName(nm) {
      window.localStorage.setItem("LolPizzaName", nm);
      setName(nm);
    }
    return createComponent(Show, {
      get when() {
        return !props.locked;
      },
      get fallback() {
        return "Basket Locked";
      },
      get children() {
        const _el$ = _tmpl$$2(), _el$2 = _el$.firstChild, _el$3 = _el$2.nextSibling, _el$4 = _el$3.nextSibling;
        _el$3.$$input = (e) => saveName(e.currentTarget.value);
        _el$4.$$click = () => send();
        createRenderEffect(() => _el$3.value = name());
        return _el$;
      }
    });
  };
  delegateEvents(["input", "click"]);
  const _tmpl$$1 = /* @__PURE__ */ template(`<table><thead><tr><th>User</th><th>Items</th><th>Total Price</th></tr></thead><tbody>`), _tmpl$2$1 = /* @__PURE__ */ template(`<tr><td></td><td></td><td>€`);
  const ItemTable = (props) => {
    return (() => {
      const _el$ = _tmpl$$1(), _el$2 = _el$.firstChild, _el$3 = _el$2.nextSibling;
      insert(_el$3, createComponent(For, {
        get each() {
          return Object.entries(props.data ?? {});
        },
        children: ([user, items]) => (() => {
          const _el$4 = _tmpl$2$1(), _el$5 = _el$4.firstChild, _el$6 = _el$5.nextSibling, _el$7 = _el$6.nextSibling, _el$8 = _el$7.firstChild;
          insert(_el$5, user);
          insert(_el$6, () => items.map((item) => `${item.name} x ${item.quantity} (${calculatePrice(item) / 100}€)`).join(", "));
          insert(_el$7, () => items.map(calculatePrice).reduce((acc, x) => acc + x, 0) / 100, _el$8);
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
  const _tmpl$ = /* @__PURE__ */ template(`<br>`), _tmpl$2 = /* @__PURE__ */ template(`<div id="lolpizza-app"><div id="lolpizza-header"><span>Lolpizza2 in <!> mode</span><button>Switch</button></div><br><div><p>ID: <input> <button>Fetch</button> <br></p></div><div>`), _tmpl$3 = /* @__PURE__ */ template(`<span>Locked`), _tmpl$4 = /* @__PURE__ */ template(`<span>`);
  const LocalStorageUrl = "LolPizzaUrl";
  const LocalStorageTag = "LolPizzaBasketId";
  const url2 = localStorage.getItem(LocalStorageUrl) ?? "http://localhost:8080";
  const App = () => {
    const [mode, setMode] = createSignal(window.lolpizzaMode ?? "host");
    const [basketId, setBasketId] = createSignal("");
    const [url, setUrl] = createSignal(url2);
    const fetchBasketId = async (force = false) => {
      if (!force) {
        if (window.localStorage.getItem(LocalStorageTag))
          setBasketId(window.localStorage.getItem(LocalStorageTag));
      } else {
        const activeAddress = document.cookie.split("; ").find((x) => x.startsWith("activeAddress="));
        if (!activeAddress) {
          alert("Please select an address");
          return;
        }
        let basketIdInt = await fetch(`${url()}/basket?url=${encodeURIComponent(location.origin + location.pathname)}&activeAddress=${activeAddress}`, {
          method: "POST"
        }).then((res) => res.text());
        window.localStorage.setItem(LocalStorageTag, basketIdInt);
        setBasketId(basketIdInt);
      }
    };
    const fetchBasket = async (initial = false) => {
      if (initial) {
        fetchBasketId(false);
      }
      let bid = basketId();
      if (bid == "") {
        return {
          content: {},
          meta: {
            Url: "",
            Locked: false,
            ActiveAddress: ""
          }
        };
      }
      const b = await fetch(`${url()}/basket?id=${bid}`).then((res) => res.json());
      const activeAddress = document.cookie.split("; ").find((x) => x.startsWith("activeAddress="));
      document.cookie = b.meta.ActiveAddress;
      if (!activeAddress || !document.location.href.startsWith(b.meta.Url)) {
        window.localStorage.setItem(LocalStorageTag, basketId());
        document.location.href = b.meta.Url;
      }
      return b;
    };
    const [data, {
      mutate,
      refetch
    }] = createResource(fetchBasket);
    const timer = setInterval(() => {
      refetch();
    }, 2e3);
    onCleanup(() => clearInterval(timer));
    const locked = () => {
      var _a, _b;
      return ((_b = (_a = data()) == null ? void 0 : _a.meta) == null ? void 0 : _b.Locked) ?? false;
    };
    const content = () => {
      var _a;
      return (_a = data()) == null ? void 0 : _a.content;
    };
    return (() => {
      const _el$ = _tmpl$2(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild, _el$6 = _el$4.nextSibling;
      _el$6.nextSibling;
      const _el$7 = _el$3.nextSibling, _el$8 = _el$2.nextSibling, _el$9 = _el$8.nextSibling, _el$10 = _el$9.firstChild, _el$11 = _el$10.firstChild, _el$12 = _el$11.nextSibling, _el$13 = _el$12.nextSibling, _el$14 = _el$13.nextSibling, _el$15 = _el$9.nextSibling;
      insert(_el$3, mode, _el$6);
      insert(_el$2, (() => {
        const _c$ = createMemo(() => !!locked());
        return () => _c$() ? _tmpl$3() : _tmpl$4();
      })(), _el$7);
      _el$7.$$click = () => setMode(mode() === "host" ? "client" : "host");
      _el$9.style.setProperty("padding", "4px");
      _el$10.style.setProperty("text-align", "left");
      _el$10.style.setProperty("width", "100%");
      _el$12.$$input = (e) => setBasketId(e.currentTarget.value);
      _el$12.style.setProperty("width", "21em");
      _el$14.$$click = () => fetchBasketId(true);
      insert(_el$15, createComponent(Show, {
        get when() {
          return basketId() !== "";
        },
        get children() {
          return ["URL: ", createMemo(() => url()), "/a#", createMemo(() => basketId()), _tmpl$(), createComponent(ItemTable, {
            get data() {
              return content();
            }
          }), createComponent(Switch, {
            get children() {
              return [createComponent(Match, {
                get when() {
                  return mode() === "host";
                },
                get children() {
                  return createComponent(Host, {
                    get locked() {
                      return locked();
                    },
                    get data() {
                      return content();
                    },
                    get basketId() {
                      return basketId();
                    },
                    setBasketId,
                    refetch
                  });
                }
              }), createComponent(Match, {
                get when() {
                  return mode() === "client";
                },
                get children() {
                  return createComponent(Client, {
                    get basketId() {
                      return basketId();
                    },
                    get locked() {
                      return locked();
                    }
                  });
                }
              })];
            }
          })];
        }
      }));
      createRenderEffect((_p$) => {
        const _v$ = styles.header, _v$2 = styles.innerheader;
        _v$ !== _p$._v$ && className(_el$, _p$._v$ = _v$);
        _v$2 !== _p$._v$2 && className(_el$2, _p$._v$2 = _v$2);
        return _p$;
      }, {
        _v$: void 0,
        _v$2: void 0
      });
      createRenderEffect(() => _el$12.value = basketId());
      return _el$;
    })();
  };
  delegateEvents(["click", "input"]);
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
  if (location.origin === "https://lolpizza.ragon.xyz" || location.origin === "http://localhost:8080") {
    fetch("/basket?id=" + location.hash.slice(1)).then((x) => x.json()).then((x) => {
      let hsh = {
        basketId: location.hash.slice(1),
        domain: location.origin
      };
      console.log(hsh);
      location.href = `${x.meta.Url}#LPBasketId=${encodeURIComponent(JSON.stringify(hsh))}`;
    });
  }
  if (location.hash.startsWith("#LPBasketId=")) {
    const hsh = JSON.parse(decodeURIComponent(location.hash.slice("#LPBasketId=".length)));
    if (hsh) {
      console.log(hsh);
      localStorage.setItem(LocalStorageTag, hsh.basketId);
      localStorage.setItem(LocalStorageUrl, hsh.domain);
      location.hash = "";
    }
  }

})();
