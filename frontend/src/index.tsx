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
if (location.origin === GH_PAGES || location.origin === 'http://localhost:8080' || location.origin === 'https://lolpizza.ragon.xyz') {
  if (location.hash[0] === "#") {
    let hsh = location.hash.slice(1).split("/")[1];
    console.log(hsh);
    location.href = `https://www.lieferando.de/speisekarte/${hsh}${location.hash}`;
  }
}
