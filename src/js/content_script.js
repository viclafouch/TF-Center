import React from 'react'
import ReactDOM from 'react-dom';
import App from '@components/App'
import getPathname from './getDom/_location'
import { urlsAvailable } from './config/config';
import { wait, getUrlParameter } from '@utils';
import YouTubeProvider, { YouTubeContext } from '@stores/YouTubeContext';
import { getStorages } from '@stores/BrowserStorage';
import getYouTubeDatasFromDOM from '@stores/DatasDom'
import { BrowserRouter } from 'react-router-dom'
import { getAllUrlParams, uena } from '@utils/index';

const style = [
  'background: linear-gradient(to right, #5433ff, #20bdff, #a5fecb);',
  'color: #fff',
  'padding: 10px 20px',
  'line-height: 35px'
].join(';');
console.log(`%cTF\'s Center on ${process.env.NODE_ENV} mode!`, style);

function initExtension() {

  function fadeOutEffect(elem) {
    let fadeTarget = elem;
    let fadeEffect = setInterval(function () {
      if (!fadeTarget.style.opacity) {
        fadeTarget.style.opacity = 1;
      }
      if (fadeTarget.style.opacity > 0) {
        fadeTarget.style.opacity -= 0.1;
      } else {
        fadeTarget.style.display = 'none'
        clearInterval(fadeEffect);
      }
    }, 200);
  }

  document.getElementById("confirmBox") && fadeOutEffect(document.getElementById("confirmBox"));

  chrome.runtime.sendMessage({ type: 'showPageAction' });

  const myReactApp = document.createElement("div");
  myReactApp.setAttribute("id", "TFsCenter");

  Promise.all([getStorages('local'), getStorages('sync')])
    .then(async storages => {
      const storage = storages.reduce((a, d) => Object.assign(d, a), {});
      const pathname = getPathname()

      // For /watch, website uses Angular and asynchrone injection, wait DOM ready
      if (pathname === '/watch') {
        while (!document.getElementById('info').querySelector('#top-level-buttons')) {
          await wait(50)
        }
        // Forbid duplicate
        if (document.getElementById('info').querySelector('#button-flag-TF')) return;
      }

      const params = getAllUrlParams()
      const youtubeDatasFromDOM = await getYouTubeDatasFromDOM(params);
      const youtubeDatasDeputy = youtubeDatasFromDOM.reduce((a, d) => Object.assign(d, a), {});

      if (pathname === '/watch') {
        myReactApp.setAttribute("id", "button-flag-TF");
        document.getElementById('info').querySelector('#top-level-buttons').appendChild(myReactApp);
      } else {
        const session_token = document.querySelector('[name="session_token"]').value
        youtubeDatasDeputy.session_token = session_token
        document.body.innerHTML = '';
        document.body.appendChild(myReactApp);
        document.documentElement.setAttribute('data-theme', storage.theme)
      }

      await new Promise(resolve => ReactDOM.render(
        <YouTubeProvider
          pathname={pathname}
          storage={storage}
          youtubeDatasDeputy={youtubeDatasDeputy}
        >
          <BrowserRouter>
            <YouTubeContext.Consumer>
              {(context) => <App context={context} notification={context.state.notification} />}
            </YouTubeContext.Consumer>
          </BrowserRouter>
        </YouTubeProvider>
      , myReactApp, resolve()))
    })
    .catch(e => {
      e = e.id ? e : e.message
      document.body.innerHTML = '';
      const div = document.createElement('div')
      const h1 = document.createElement('h1');
      h1.textContent = '500 Server Error (TF-Center)'
      const p = document.createElement('p')
      p.innerHTML = 'Sorry, something went wrong. <br /> A team of hightly trained monkeys has been dispatched to deal this situation.'
      const perror = document.createElement('p');
      perror.textContent = process.env.NODE_ENV === 'development' ? JSON.stringify(e) : uena(JSON.stringify(e))
      div.appendChild(h1)
      div.appendChild(p)
      div.appendChild(perror)
      myReactApp.appendChild(div)
      myReactApp.classList.add('container-error')
      document.body.appendChild(myReactApp);
    })
    .finally(() => {
      document.body.classList.add('TFs-ready')
    })
}

let pathname = getPathname()

if (getUrlParameter('v') || urlsAvailable.includes(pathname)) {
  initExtension();
}

// if async page changes
let oldHref = document.location.href;
window.onload = function () {
  let bodyList = document.querySelector("body")
  let observer = new MutationObserver(mutations => {
      mutations.forEach(async () => {
        if (oldHref != document.location.href) {
          oldHref = document.location.href;
          let elem = document.getElementById('button-flag-TF');
          let newId = getUrlParameter('v');
          elem && elem.parentNode.removeChild(elem);
          await wait(0)

          // Check if page is a watched page
          if (!newId) return;

          // While can no exceded 3s (security process)
          let stopAtInMilliseconds = 3000;
          let seconds = 0;
          while (!document.querySelector(`[video-id="${newId}"]`)) {
            await wait(50)
            seconds+= 50
            if (seconds >= stopAtInMilliseconds) return;
          }

          return initExtension()
        }
      });
    });

  let config = {
    childList: true,
    subtree: true
  };

  observer.observe(bodyList, config);
};