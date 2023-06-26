/* @refresh reload */
import { render } from 'solid-js/web';
import App from './App';

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
  peerId: string;
  slug: string;
}

const GH_PAGES = "https://thexyno.github.io/lolpizza2";
if (location.origin === GH_PAGES || location.origin === 'http://localhost:8080') {
    let hsh = JSON.parse(decodeURIComponent(location.hash.slice(1))) as hash;
    console.log(hsh);
    location.href = `https://www.lieferando.de/speisekarte/${hsh.slug}#LPBasketId=${encodeURIComponent(JSON.stringify(hsh))}`;
}
