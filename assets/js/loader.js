const load = (e) => {
    event.preventDefault();

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
            document.getElementById(container).innerHTML = request.responseText;

            history.pushState('', '', `?${container}=${source}`);
        }

    }
}

document.addEventListener('click', load, false);