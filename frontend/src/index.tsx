/* @refresh reload */
import { render } from 'solid-js/web';

import App, { LocalStorageTag, LocalStorageUrl } from './App';

const myLittleInterval = setInterval(() => {
  const el = document.querySelector('section[data-qa="page-section"]');
  if (el) {
    render(
      () => <App />,
      (() => {
        const app = document.createElement('div');
        el.prepend(app);
        return app;
      })(),
    );
    clearInterval(myLittleInterval);
  }
}, 300);

export interface hash {
  basketId: string;
  domain: string;
}

if (location.origin === 'https://lolpizza.ragon.xyz' || location.origin === 'http://localhost:8080') {
  fetch('/basket?id=' + location.hash.slice(1)).then(x => x.json()).then(x => {
    let hsh: hash = { basketId: location.hash.slice(1), domain: location.origin };
    console.log(hsh);
    location.href = `${x.meta.Url}#LPBasketId=${encodeURIComponent(JSON.stringify(hsh))}`;
  });
}

if (location.hash.startsWith('#LPBasketId=')) {
  const hsh = JSON.parse(decodeURIComponent(location.hash.slice('#LPBasketId='.length))) as hash;
  if (hsh) {
    console.log(hsh);
    localStorage.setItem(LocalStorageTag, hsh.basketId);
    localStorage.setItem(LocalStorageUrl, hsh.domain);
    location.hash = '';
  }
}
