const load = (e) => {
    e.preventDefault();

    if (typeof(e.target) == 'undefined') { return; }

    if (e.target.tagName !== 'A') { return; }

    const href = e.target.getAttribute('href');

    if (href.indexOf('#') === -1) {
        const hrefParts = href.split('=');
        const container = hrefParts[0].substr(1);
        const source = hrefParts[1];

        const request = new XMLHttpRequest();

        request.onreadystatechange = () => {
            if (request.readyState < 4) {
                // handle preload
                return;
            }
            if (request.status !== 200) {
                // handle error http
                return;
            }
            if (request.readyState === 4) {
                successCallBack();
            }
        }

        request.open('GET', source, true);
        request.send('');
        successCallBack = () => {
            evalScript(container, request.responseText);

            history.pushState('', '', `?${container}=${source}`);
        }

    }
}

const allNavLoader = document.querySelectorAll('.nav-loader');
allNavLoader.forEach((el) => {
    el.addEventListener('click', load, false);
});

const evalScript = (container, element) => {
    const elementDOM = new DOMParser().parseFromString(element, 'text/html');
    const elementContainer = document.getElementById(container);
    elementContainer.innerHTML = element;
    const scripts = elementDOM.getElementsByTagName('script');
    while (scripts.length) {
        const script = scripts[0];
        script.parentNode.removeChild(script);
        const newScript = document.createElement('script');
        if (script.src) {
            newScript.src = script.src;
        } else if (script.textContent) {
            newScript.textContent = script.textContent;
        } else if (script.innerText) {
            newScript.innerText = script.innerText;
        }
        document.body.appendChild(newScript);
    }
}