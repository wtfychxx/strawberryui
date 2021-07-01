(function(global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
        typeof define === 'function' && define.amd ? define(factory) :
        (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.tools = factory());
}(this, (function() {
    const dataFetcher = ({ url, method, element }) => {
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

        request.open(method, url, true);
        request.send('');
        successCallBack = () => {
            document.querySelector(element).innerHTML = request.responseText;
        }
    }

    const getNavbar = async() => {
        const data = await tools.dataFetcher({
            url: './navbar.html',
            method: 'GET',
            element: '#navbar-content'
        });
    }

    const returnValue = {
        dataFetcher,
        getNavbar
    }

    return returnValue;
})));