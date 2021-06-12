(function(global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
        typeof define === 'function' && define.amd ? define(factory) :
        (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.strawberry = factory());
}(this, (function() {
    'use strict';

    const MAX_UID = 1000000;
    const MILLISECONDS_MULTIPLIER = 1000;
    const TRANSITION_END = 'transitionend';

    const toType = (obj) => {
        if (obj === null || obj === undefined) {
            return `${obj}`;
        }
        return {}.toString.call(obj).match(/\s([a-z]+)/i)[1].toLowerCase();
    };

    // Public utility API

    const getUID = (prefix) => {
        do {
            prefix += Math.floor(Math.random() * MAX_UID);
        } while (document.getElementById(prefix));

        return prefix;
    };

    const getSelector = (element) => {
        let selector = element.getAttribute('data-st-target');

        if (!selector || selector === '#') {
            let hrefAttr = element.getAttribute('href');

            if (!hrefAttr || !hrefAttr.includes('#') && !hrefAttr.startWith('.')) {
                return null;
            }

            if (hrefAttr.includes('#' && !hrefAttr.startWith('#'))) {
                hrefAttr = '#' + hrefAttr.split('#')[1];
            }

            selector = hrefAttr && hrefAttr !== '#' ? hrefAttr.trim() : null;
        }

        return selector;
    };

    const getSelectorFromElement = (element) => {
        const selector = getSelector(element);

        if (selector) {
            return document.querySelector(selector) ? selector : null;
        }

        return null;
    };

    const getElementFromSelector = (element) => {
        const selector = getSelector(element);
        return selector ? document.querySelector(selector) : null;
    };

    const getTransitionDurationFromElement = (element) => {
        if (!element) {
            return 0;
        }

        let {
            transitionDuration,
            transitionDelay
        } = window.getComputedStyle(element);

        const floatTransitionDuration = Number.parseFloat(transitionDuration);
        const floatTransitionDelay = Number.parseFloat(transitionDelay);

        if (!floatTransitionDuration && !floatTransitionDelay) {
            return 0;
        }

        transitionDuration = transitionDuration.split(',')[0];
        transitionDelay = transitionDelay.split(',')[0];
        return (Number.parseFloat(transitionDuration) + Number.parseFloat(transitionDelay)) * MILLISECONDS_MULTIPLIER;
    };

    const triggerTransitionEnd = (element) => {
        element.dispatchEvent(new Event(TRANSITION_END));
    }

    const isElement$1 = (obj) => (obj[0] || obj).nodeType;

    const emulateTransitionEnd = (element, duration) => {
        let called = false;
        const durationPadding = 5;
        const emulatedDuration = duration + durationPadding;

        function listener() {
            called = true;
            element.removeEventListener(TRANSITION_END, listener)
        }

        element.addEventListener(TRANSITION_END, listener);
        setTimeout(() => {
            if (!called) {
                triggerTransitionEnd(element);
            }
        }, emulatedDuration);
    }

    const typeCheckConfig = (componentName, config, configTypes) => {
        Object.keys(configTypes).forEach((property) => {
            const expectedTypes = configTypes[property];
            const value = config[property];
            const valueType = value && isElement$1(value) ? 'element' : toType(value);

            if (!new RegExp(expectedTypes).test(valueType)) {
                throw new TypeError(`${componentName.toUpperCase()}: ` + `Option "${property}" provided type "${valueType}" ` + `but expected type "${expectedTypes}".`);
            }
        });
    };

    const isVisible = (element) => {
        if (!element) {
            return false;
        }

        if (element.style && element.parentNode && element.parentNode.style) {
            const elementStyle = getComputedStyle(element);
            const parentNodeStyle = getComputedStyle(element.parentNode);
            return elementStyle.display !== 'none' && parentNodeStyle.display !== 'none' && elementStyle.visibility !== 'hidden';
        }

        return false;
    };

    const isDisabled = (element) => {
        if (!element || element.nodeType !== Node.ELEMENT_NODE) {
            return true;
        }

        if (element.classList.contains('disabled')) {
            return true;
        }

        if (typeof element.disabled !== 'undefined') {
            return element.disabled;
        }

        return element.hasAttribute('disabled') && element.getAttribute('disabled') !== 'false';
    }

    const findShadowRoot = (element) => {
        if (!document.documentElement.attachShadow) {
            return null;
        }

        if (typeof element.getRootNode === 'function') {
            const root = element.getRootNode();
            return root instanceof ShadowRoot ? root : null;
        }

        if (element instanceof ShadowRoot) {
            return element;
        }

        if (!element.parentNode) {
            return null;
        }

        return findShadowRoot(element.parentNode);
    };

    const noop = () => {
        return function() {};
    };

    const reflow = (element) => {
        return element.offsetHeight;
    }

    const getjQuery = () => {
        const {
            jQuery
        } = window;

        if (jQuery && !document.body.hasAttribute('data-st-no-jquery')) {
            return jQuery;
        }

        return null;
    }

    const onDOMContentLoaded = (callback) => {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', callback);
        } else {
            callback();
        }
    }

    const isRTL = () => document.documentElement.dir === 'rtl';

    const defineJQueryPlugin = (name, plugin) => {
        onDOMContentLoaded(() => {
            const $ = getjQuery();

            if ($) {
                const JQUERY_NO_CONFLICT = $.fn[name];
                $.fn[name] = plugin.jQueryInterface;
                $.fn[name].Constructor = plugin;

                $.fn[name].noConflict = () => {
                    $.fn[name] = JQUERY_NO_CONFLICT;
                    return plugin.jQueryInterface;
                };
            }
        })
    }

    const elementMap = new Map();

    const Data = {
        set(element, key, instance) {
            if (!elementMap.has(element)) {
                elementMap.set(element, new Map());
            }

            const instanceMap = elementMap.get(element);

            if (!instanceMap.has(key) && instanceMap.size !== 0) {
                console.error(`Strawberry doesn't allow more than one instance per element. Bound instance: ${Array.from(instanceMap.keys())[0]}.`);
                return;
            }

            instanceMap.set(key, instance);
        },

        get(element, key) {
            if (elementMap.has(element)) {
                return elementMap.get(element).get(key) || null;
            }

            return null;
        },

        remove(element, key) {
            if (!elementMap.has(element)) {
                return;
            }

            const instanceMap = elementMap.get(element);
            instanceMap.delete(key);

            if (instanceMap.size === 0) {
                elementMap.delete(element);
            }
        }
    }

    const namespaceRegex = /[^.]*(?=\..*)\.|.*/;
    const stripNameRegex = /\..*/;
    const stripUidRegex = /::\d+$/;
    const eventRegistry = {};

    let uidEvent = 1;
    const customEvents = {
        mouseenter: 'mouseover',
        mouseleave: 'mouseout'
    };

    const nativeEvents = new Set(['click', 'dblclick', 'mouseup', 'mousedown', 'contextmenu', 'mousewheel', 'DOMMouseScroll', 'mouseover', 'mouseout', 'mousemove', 'selectstart', 'selectend', 'keydown', 'keypress', 'keyup', 'orientationchange', 'touchstart', 'touchmove', 'touchend', 'touchcancel', 'pointerdown', 'pointermove', 'pointerup', 'pointerleave', 'pointercancel', 'gesturestart', 'gesturechange', 'gestureend', 'focus', 'blur', 'change', 'reset', 'select', 'submit', 'focusin', 'focusout', 'load', 'unload', 'beforeunload', 'resize', 'move', 'DOMContentLoaded', 'readystatechange', 'error', 'abort', 'scroll']);

    const getUidEvent = (element, uid) => {
        return uid && `${uid}::${uidEvent++}` || element.uidEvent || uidEvent++;
    }

    const getEvent = (element) => {
        const uid = getUidEvent(element);
        element.uidEvent = uid;
        eventRegistry[uid] = eventRegistry[uid] || {};
        return eventRegistry[uid];
    }

    const strawberryHandler = (element, fn) => {
        return function handler(event) {
            event.delegateTarget = element;

            if (handler.oneOff) {
                EventHandler.off(element, event.type, fn);
            }

            return fn.apply(element, [event]);
        }
    }

    const strawberryDelegationHandler = (element, selector, fn) => {
        return function handler(event) {
            const domElements = element.querySelectorAll(selector);

            for (let {
                    target
                } = event; target && target !== this; target = target.parentNode) {
                for (let i = domElements.length; i--;) {
                    if (domElements[i] === target) {
                        event.delegateTarget = target;

                        if (handler.oneOff) {
                            EventHandleroff(element, event.type, fn);
                        }

                        return fn.apply(target, [event]);
                    }
                }
            }
        }
    }

    const findHandler = (events, handler, delegationSelector) => {
        const uidEventList = Object.keys(events);

        for (let i = 0, len = uidEventList.length; i < len; i++) {
            const event = events[uidEventList[i]];

            if (event.originalHandler === handler && event.delegationSelector === delegationSelector) {
                return event;
            }
        }

        return null;
    }

    const normalizeParams = (originalTypeEvent, handler, delegationFn) => {
        const delegation = typeof handler === 'string';
        const originalHandler = delegation ? delegationFn : handler;

        let typeEvent = originalTypeEvent.replace(stripNameRegex, "");
        const custom = customEvents[typeEvent];

        if (custom) {
            typeEvent = custom;
        }

        const isNative = nativeEvents.has(typeEvent);

        if (!isNative) {
            typeEvent = originalTypeEvent;
        }

        return [delegation, originalHandler, typeEvent];
    }

    const addHandler = (element, originalTypeEvent, handler, delegationFn, oneOff) => {
        if (typeof originalTypeEvent !== 'string' || !element) {
            return;
        }

        if (!handler) {
            handler = delegationFn;
            delegationFn = null;
        }

        const [delegation, originalHandler, typeEvent] = normalizeParams(originalTypeEvent, handler, delegationFn);
        const events = getEvent(element);
        const handlers = events[typeEvent] || (events[typeEvent] = {});
        const previousFn = findHandler(handlers, originalHandler, delegation ? handler : null);

        if (previousFn) {
            previousFn.oneOff = previousFn.oneOff && oneOff;
            return;
        }

        const uid = getUidEvent(originalHandler, originalTypeEvent.replace(namespaceRegex, ''));
        const fn = delegation ? strawberryDelegationHandler(element, handler, delegationFn) : strawberryHandler(element, handler);
        fn.delegationSelector = delegation ? handler : null;
        fn.originalHandler = originalHandler;
        fn.oneOff = oneOff;
        fn.uidEvent = uid;
        handlers[uid] = fn;
        element.addEventListener(typeEvent, fn, delegation);
    }

    const removeHandler = (element, events, typeEvent, handler, delegationSelector) => {
        const fn = findHandler(events[typeEvent], handler, delegationSelector);

        if (!fn) {
            return;
        }

        element.removeEventListener(typeEvent, fn, Boolean(delegationSelector));
        delete events[typeEvent][fn.uidEvent];
    }

    const removeNamespacedHandlers = (element, events, typeEvent, namespace) => {
        const storeElementEvent = events[typeEvent] || {};

        Object.keys(storeElementEvent).forEach((handlerKey) => {
            if (handlerKey.includes(namespace)) {
                const event = storeElementEvent[handlerKey];
                removeHandler(element, events, typeEvent, event.originalHandler, event.delegationSelector);
            }
        })
    }

    const EventHandler = {
        on(element, event, handler, delegationFn) {
            addHandler(element, event, handler, delegationFn, false);
        },
        one(element, event, handler, delegationFn) {
            addHandler(element, event, handler, delegationFn, true);
        },
        off(element, originalTypeEvent, handler, delegationFn) {
            if (typeof originalTypeEvent !== 'string' || !element) {
                return;
            }

            const [delegation, originalHandler, typeEvent] = normalizeParams(originalTypeEvent, handler, delegationFn);
            const inNamespace = typeEvent !== originalTypeEvent;
            const events = getEvent(element);
            const isNamespace = originalTypeEvent.startsWith('.');

            if (typeof originalHandler !== 'undefined') {
                if (!events || !events[typeEvent]) {
                    return;
                }

                removeHandler(element, events, typeEvent, originalHandler, delegation ? handler : null);
                return;
            }

            if (isNamespace) {
                Object.keys(events).forEach((elementEvent) => {
                    removeNamespacedHandlers(element, events, elementEvent, originalTypeEvent.slice(1));
                });
            }

            const storeElementEvent = events[typeEvent] || {};
            Object.keys(storeElementEvent).forEach((keyHandlers) => {
                const handlerKey = keyHandlers.replace(stripUidRegex, '');

                if (!inNamespace || originalTypeEvent.includes(handlerKey)) {
                    const event = storeElementEvent[keyHandlers];
                    removeHandler(element, events, typeEvent, event.originalHandler, event.delegationSelector);
                }
            });
        },
        trigger(element, event, args) {
            if (typeof event !== 'string' || !element) {
                return null;
            }

            const $ = getjQuery();
            const typeEvent = event.replace(stripNameRegex, '');
            const inNamespace = event !== typeEvent;
            const isNative = nativeEvents.has(typeEvent);
            let jQueryEvent;
            let bubbles = true;
            let nativeDispatch = true;
            let defaultPrevented = false;
            let evt = null;

            if (inNamespace && $) {
                jQueryEvent = $.Event(event, args);
                $(element).trigger(jQueryEvent);
                bubbles = !jQueryEvent.isPropagationStopped();
                nativeDispatch = !jQueryEvent.isImmediatePropagationStopped();
                defaultPrevented = jQueryEvent.isDefaultPrevented();
            }

            if (isNative) {
                evt = document.createEvent('HTMLEvents');
                evt.initEvent(typeEvent, bubbles, true);
            } else {
                evt = new CustomEvent(event, {
                    bubbles,
                    cancelable: true
                });
            }

            if (typeof args !== 'undefined') {
                Object.keys(args).forEach((key) => {
                    Object.defineProperty(evt, key, {
                        get() {
                            return args[key];
                        }
                    });
                });
            }

            if (defaultPrevented) {
                evt.preventDefault();
            }

            if (nativeDispatch) {
                element.dispatchEvent(evt);
            }

            if (evt.defaultPrevented && typeof jQueryEvent !== 'undefined') {
                jQueryEvent.preventDefault();
            }

            return evt;
        }
    };

    const VERSION = '1.0.0-alpha';

    class BaseComponent {
        constructor(element) {
            element = typeof element === 'string' ? document.querySelector(element) : element;

            if (!element) {
                return;
            }

            this._element = element;
            Data.set(this._element, this.constructor.DATA_KEY, this);
        }

        dispose() {
            Data.remove(this._element, this.constructor.DATA_KEY);
            this._element = null;
        }

        static getInstance(element) {
            return Data.get(element, this.DATA_KEY);
        }

        static get VERSION() {
            return VERSION;
        }
    }

    function normalizeData(val) {
        if (val === 'true') {
            return true;
        }

        if (val === 'false') {
            return false;
        }

        if (val === Number(val).toString()) {
            return Number(val);
        }

        if (val === '' || val === 'null') {
            return null;
        }

        return val;
    }

    function normalizeDataKey(key) {
        return key.replace(/[A-Z]/g, function(chr) {
            return "-" + chr.toLowerCase();
        });
    }

    const Manipulator = {
        setDataAttribute(element, key, value) {
            element.setAttribute(`data-st-${normalizeDataKey(key)}`, value);
        },

        removeDataAttribute(element, key) {
            element.removeAttribute(`data-st-${normalizeDataKey(key)}`);
        },

        getDataAttributes(element) {
            if (!element) {
                return {};
            }

            const attributes = {};
            Object.keys(element.dataset).filter(key => key.startsWith('st')).forEach(key => {
                let pureKey = key.replace(/^st/, '');
                pureKey = pureKey.charAt(0).toLowerCase() + pureKey.slice(1, pureKey.length);
                attributes[pureKey] = normalizeData(element.dataset[key]);
            });
            return attributes;
        },

        getDataAttribute(element, key) {
            return normalizeData(element.getAttribute(`data-st-${normalizeDataKey(key)}`));
        },

        offset(element) {
            const rect = element.getBoundingClientRect();
            return {
                top: rect.top + document.body.scrollTop,
                left: rect.left + document.body.scrollLeft
            };
        },

        position(element) {
            return {
                top: element.offsetTop,
                left: element.offsetLeft
            };
        }

    };

    // SelectorEngine.js
    let NODE_TEXT = 3;
    const SelectorEngine = {
        matches: (element, selector) => {
            return element.matches(selector);
        },
        find: (selector, element) => {
            let _ref;

            if (element === void 0) {
                element = document.documentElement;
            }

            return (_ref = []).concat.apply(_ref, Element.prototype.querySelectorAll.call(element, selector));
        },
        findOne: (selector, element) => {
            if (element === void 0) {
                element = document.documentElement;
            }

            return Element.prototype.querySelector.call(element, selector);
        },
        children: (element, selector) => {
            let _ref2;

            let children = (_ref2 = []).concat.apply(_ref2, element.children);

            return children.filter((child) => {
                return child.matches(selector);
            });
        },
        parents: (element, selector) => {
            let parents = [];
            let ancestor = element.parentNode;

            while (ancestor && ancestor.nodeType === Node.ELEMENT_NODE && ancestor.nodeType !== NODE_TEXT) {
                if (this.matches(ancestor, selector)) {
                    parents.push(ancestor);
                }

                ancestor = ancestor.parentNode;
            }

            return parents;
        },
        prev: (element, selector) => {
            let previous = element.previousElementSibling;

            while (previous) {
                if (previous.matches(selector)) {
                    return [previous];
                }

                previous = previous.previousElementSibling;
            }

            return [];
        },
        next: (element, selector) => {
            let next = element.nextElementSibling;

            while (next) {
                if (this.matches(next, selector)) {
                    return [next];
                }

                next = next.nextElementSibling;
            }

            return [];
        }
    };

    // alert event js

    const NAME$b = 'alert';
    const DATA_KEY$b = 'st.alert';
    const EVENT_KEY$b = `.${DATA_KEY$b}`;
    const DATA_API_KEY$8 = '.data-api';
    const SELECTOR_DISMISS = '[data-st-dismiss="alert"]';
    const EVENT_CLOSE = `close${EVENT_KEY$b}`;
    const EVENT_CLOSED = `closed${EVENT_KEY$b}`;
    const EVENT_CLICK_DATA_API$7 = `click${EVENT_KEY$b}${DATA_API_KEY$8}`;
    const CLASS_NAME_ALERT = 'alert';
    const CLASS_NAME_FADE$5 = 'fade';
    const CLASS_NAME_SHOW$8 = 'show';

    class Alert extends BaseComponent {
        static get DATA_KEY() {
            return DATA_KEY$b;
        }

        close(element) {
            const rootElement = element ? this.getRootElement(element) : this._element;

            const customEvent = this._triggerCloseEvent(rootElement);

            if (customEvenet === null || customEvent.defaultPrevented) {
                return;
            }

            this._removeElement(rootElement);
        }

        _getRootElement(element) {
            return getElementFromSelector(element) || element.closest(`.${CLASS_NAME_ALERT}`);
        }

        _triggerCloseEvenet(element) {
            return EventHandler.trigger(element, EVENT_CLOSE);
        }

        _removeelement(element) {
            element.classList.remove(CLASS_NAME_SHOW$8);

            if (!element.classList.contains(CLASS_NAME_FADE$5)) {
                this._destroyElement(element);

                return;
            }

            const transitionDuration = getTransitionDurationFromElement(element);
            EventHandler.one(element, 'transitionend', () => this._destroyElement(element))
            emulateTransitionEnd(element, transitionDuration);
        }

        _destroyElement(element) {
            if (element.parentNode) {
                element.parentNode.remoceChild(element);
            }

            EventHandler.trigger(element, EVENT_CLOSED);
        }

        static jQueryInterface(config) {
            return this.each(function() {
                let data = Data.get(this, DATA_KEY$b);

                if (!data) {
                    data = new Alert(this);
                }

                if (config === 'close') {
                    data[config](this);
                }
            })
        }

        static handleDismiss(alertInstance) {
            return function(event) {
                if (event) {
                    event.preventDefault();
                }

                alertInstance.close(this);
            };
        }
    }

    EventHandler.on(document, EVENT_CLICK_DATA_API$7, SELECTOR_DISMISS, Alert.handleDismiss(new Alert()));

    defineJQueryPlugin(NAME$b, Alert);

    const NAME$8 = 'collapse';
    const DATA_KEY$8 = 'st.collapse';
    const EVENT_KEY$8 = `.${DATA_KEY$8}`;
    const DATA_API_KEY$5 = '.data-api';
    const Default$7 = {
        toggle: true,
        parent: ''
    };

    const DefaultType$7 = {
        toggle: 'boolean',
        parent: '(string|element)'
    };

    const EVENT_SHOW$5 = `show${EVENT_KEY$8}`;
    const EVENT_SHOWN$5 = `shown${EVENT_KEY$8}`;
    const EVENT_HIDE$5 = `hide${EVENT_KEY$8}`;
    const EVENT_HIDDEN$5 = `hidden${EVENT_KEY$8}`;
    const EVENT_CLICK_DATA_API$4 = `click${EVENT_KEY$8}${DATA_API_KEY$5}`;
    const CLASS_NAME_SHOW$7 = 'show';
    const CLASS_NAME_COLLAPSE = 'collapse';
    const CLASS_NAME_COLLAPSING = 'collapsing';
    const CLASS_NAME_COLLAPSED = 'collapsed';
    const WIDTH = 'width';
    const HEIGHT = 'height';
    const SELECTOR_ACTIVES = '.show, .collapsing';
    const SELECTOR_DATA_TOGGLE$4 = '[data-st-toggle="collapse"]';

    class Collapse extends BaseComponent {
        constructor(element, config) {
            super(element);
            this._isTransitioning = false;
            this._config = this._getConfig(config);
            this._triggerArray = SelectorEngine.find(`${SELECTOR_DATA_TOGGLE$4}[href="#${this._element.id}"], ` + `${SELECTOR_DATA_TOGGLE$4}[data-st-target="#${this._element.id}"]`);
            const toggleList = SelectorEngine.find(SELECTOR_DATA_TOGGLE$4);

            for (let i = 0, len = toggleList.length; i < len; i++) {
                const elem = toggleList[i];
                const selector = getSelectorFromElement(elem);
                const filterElement = SelectorEngine.find(selector).filter(foundElem => foundElem === this._element);

                if (selector !== null && filterElement.length) {
                    this._selector = selector;

                    this._triggerArray.push(elem);
                }
            }

            this._parent = this._config.parent ? this._getParent() : null;

            if (!this._config.parent) {
                this._addAriaAndCollapsedClass(this._element, this._triggerArray);
            }

            if (this._config.toggle) {
                this.toggle();
            }

        }
        static get Default() {
            return Default$7;
        }

        static get DATA_KEY() {
                return DATA_KEY$8;
            } // Public


        toggle() {
            if (this._element.classList.contains(CLASS_NAME_SHOW$7)) {
                this.hide();
            } else {
                this.show();
            }
        }

        show() {
            if (this._isTransitioning || this._element.classList.contains(CLASS_NAME_SHOW$7)) {
                return;
            }

            let actives;
            let activesData;

            if (this._parent) {
                actives = SelectorEngine.find(SELECTOR_ACTIVES, this._parent).filter(elem => {
                    if (typeof this._config.parent === 'string') {
                        return elem.getAttribute('data-st-parent') === this._config.parent;
                    }

                    return elem.classList.contains(CLASS_NAME_COLLAPSE);
                });

                if (actives.length === 0) {
                    actives = null;
                }
            }

            const container = SelectorEngine.findOne(this._selector);

            if (actives) {
                const tempActiveData = actives.find(elem => container !== elem);
                activesData = tempActiveData ? Data.get(tempActiveData, DATA_KEY$8) : null;

                if (activesData && activesData._isTransitioning) {
                    return;
                }
            }

            const startEvent = EventHandler.trigger(this._element, EVENT_SHOW$5);

            if (startEvent.defaultPrevented) {
                return;
            }

            if (actives) {
                actives.forEach(elemActive => {
                    if (container !== elemActive) {
                        Collapse.collapseInterface(elemActive, 'hide');
                    }

                    if (!activesData) {
                        Data.set(elemActive, DATA_KEY$8, null);
                    }
                });
            }

            const dimension = this._getDimension();

            this._element.classList.remove(CLASS_NAME_COLLAPSE);

            this._element.classList.add(CLASS_NAME_COLLAPSING);

            this._element.style[dimension] = 0;

            if (this._triggerArray.length) {
                this._triggerArray.forEach(element => {
                    element.classList.remove(CLASS_NAME_COLLAPSED);
                    element.setAttribute('aria-expanded', true);
                });
            }

            this.setTransitioning(true);

            const complete = () => {
                this._element.classList.remove(CLASS_NAME_COLLAPSING);

                this._element.classList.add(CLASS_NAME_COLLAPSE, CLASS_NAME_SHOW$7);

                this._element.style[dimension] = '';
                this.setTransitioning(false);
                EventHandler.trigger(this._element, EVENT_SHOWN$5);
            };

            const capitalizedDimension = dimension[0].toUpperCase() + dimension.slice(1);
            const scrollSize = `scroll${capitalizedDimension}`;
            const transitionDuration = getTransitionDurationFromElement(this._element);
            EventHandler.one(this._element, 'transitionend', complete);
            emulateTransitionEnd(this._element, transitionDuration);
            this._element.style[dimension] = `${this._element[scrollSize]}px`;
        }

        hide() {
            if (this._isTransitioning || !this._element.classList.contains(CLASS_NAME_SHOW$7)) {
                return;
            }

            const startEvent = EventHandler.trigger(this._element, EVENT_HIDE$5);

            if (startEvent.defaultPrevented) {
                return;
            }

            const dimension = this._getDimension();

            this._element.style[dimension] = `${this._element.getBoundingClientRect()[dimension]}px`;
            reflow(this._element);

            this._element.classList.add(CLASS_NAME_COLLAPSING);

            this._element.classList.remove(CLASS_NAME_COLLAPSE, CLASS_NAME_SHOW$7);

            const triggerArrayLength = this._triggerArray.length;

            if (triggerArrayLength > 0) {
                for (let i = 0; i < triggerArrayLength; i++) {
                    const trigger = this._triggerArray[i];
                    const elem = getElementFromSelector(trigger);

                    if (elem && !elem.classList.contains(CLASS_NAME_SHOW$7)) {
                        trigger.classList.add(CLASS_NAME_COLLAPSED);
                        trigger.setAttribute('aria-expanded', false);
                    }
                }
            }

            this.setTransitioning(true);

            const complete = () => {
                this.setTransitioning(false);

                this._element.classList.remove(CLASS_NAME_COLLAPSING);

                this._element.classList.add(CLASS_NAME_COLLAPSE);

                EventHandler.trigger(this._element, EVENT_HIDDEN$5);
            };

            this._element.style[dimension] = '';
            const transitionDuration = getTransitionDurationFromElement(this._element);
            EventHandler.one(this._element, 'transitionend', complete);
            emulateTransitionEnd(this._element, transitionDuration);
        }

        setTransitioning(isTransitioning) {
            this._isTransitioning = isTransitioning;
        }

        dispose() {
                super.dispose();
                this._config = null;
                this._parent = null;
                this._triggerArray = null;
                this._isTransitioning = null;
            } // Private


        _getConfig(config) {
            config = {...Default$7,
                ...config
            };
            config.toggle = Boolean(config.toggle); // Coerce string values

            typeCheckConfig(NAME$8, config, DefaultType$7);
            return config;
        }

        _getDimension() {
            return this._element.classList.contains(WIDTH) ? WIDTH : HEIGHT;
        }

        _getParent() {
            let {
                parent
            } = this._config;

            if (isElement$1(parent)) {
                // it's a jQuery object
                if (typeof parent.jquery !== 'undefined' || typeof parent[0] !== 'undefined') {
                    parent = parent[0];
                }
            } else {
                parent = SelectorEngine.findOne(parent);
            }

            const selector = `${SELECTOR_DATA_TOGGLE$4}[data-st-parent="${parent}"]`;
            SelectorEngine.find(selector, parent).forEach(element => {
                const selected = getElementFromSelector(element);

                this._addAriaAndCollapsedClass(selected, [element]);
            });
            return parent;
        }

        _addAriaAndCollapsedClass(element, triggerArray) {
                if (!element || !triggerArray.length) {
                    return;
                }

                const isOpen = element.classList.contains(CLASS_NAME_SHOW$7);
                triggerArray.forEach(elem => {
                    if (isOpen) {
                        elem.classList.remove(CLASS_NAME_COLLAPSED);
                    } else {
                        elem.classList.add(CLASS_NAME_COLLAPSED);
                    }

                    elem.setAttribute('aria-expanded', isOpen);
                });
            } // Static


        static collapseInterface(element, config) {
            let data = Data.get(element, DATA_KEY$8);
            const _config = {...Default$7,
                ...Manipulator.getDataAttributes(element),
                ...(typeof config === 'object' && config ? config : {})
            };

            if (!data && _config.toggle && typeof config === 'string' && /show|hide/.test(config)) {
                _config.toggle = false;
            }

            if (!data) {
                data = new Collapse(element, _config);
            }

            if (typeof config === 'string') {
                if (typeof data[config] === 'undefined') {
                    throw new TypeError(`No method named "${config}"`);
                }

                data[config]();
            }
        }

        static jQueryInterface(config) {
            return this.each(function() {
                Collapse.collapseInterface(this, config);
            });
        }
    }

    EventHandler.on(document, EVENT_CLICK_DATA_API$4, SELECTOR_DATA_TOGGLE$4, function(event) {
        if (event.target.tagNAme === 'A' || event.delegateTarget && event.delegateTarget.tagName === 'A') {
            event.preventDefault();
        }

        const triggerData = Manipulator.getDataAttributes(this);
        const selector = getSelectorFromElement(this);
        const selectorElements = SelectorEngine.find(selector);
        selectorElements.forEach(element => {
            const data = Data.get(element, DATA_KEY$8);
            let config;

            if (data) {
                // update parent attribute
                if (data._parent === null && typeof triggerData.parent === 'string') {
                    data._config.parent = triggerData.parent;
                    data._parent = data._getParent();
                }

                config = 'toggle';
            } else {
                config = triggerData;
            }

            Collapse.collapseInterface(element, config);
        });


    });

    defineJQueryPlugin(NAME$8, Collapse);

    const NAME$7 = 'dropdown';
    const DATA_KEY$7 = 'st.dropdown';
    const EVENT_KEY$7 = `.${DATA_KEY$7}`;
    const DATA_API_KEY$4 = '.data-api';
    const ESCAPE_KEY$2 = 'Escape';
    const SPACE_KEY = 'Space';
    const TAB_KEY = 'Tab';
    const ARROW_UP_KEY = 'ArrowUp';
    const ARROW_DOWN_KEY = 'ArrowDown';
    const RIGHT_MOUSE_BUTTON = 2; // MouseEvent.button value for the secondary button, usually the right button

    const REGEXP_KEYDOWN = new RegExp(`${ARROW_UP_KEY}|${ARROW_DOWN_KEY}|${ESCAPE_KEY$2}`);
    const EVENT_HIDE$4 = `hide${EVENT_KEY$7}`;
    const EVENT_HIDDEN$4 = `hidden${EVENT_KEY$7}`;
    const EVENT_SHOW$4 = `show${EVENT_KEY$7}`;
    const EVENT_SHOWN$4 = `shown${EVENT_KEY$7}`;
    const EVENT_CLICK = `click${EVENT_KEY$7}`;
    const EVENT_CLICK_DATA_API$3 = `click${EVENT_KEY$7}${DATA_API_KEY$4}`;
    const EVENT_KEYDOWN_DATA_API = `keydown${EVENT_KEY$7}${DATA_API_KEY$4}`;
    const EVENT_KEYUP_DATA_API = `keyup${EVENT_KEY$7}${DATA_API_KEY$4}`;
    const CLASS_NAME_DISABLED = 'disabled';
    const CLASS_NAME_SHOW$6 = 'show';
    const CLASS_NAME_DROPUP = 'dropup';
    const CLASS_NAME_DROPEND = 'dropend';
    const CLASS_NAME_DROPSTART = 'dropstart';
    const CLASS_NAME_NAVBAR = 'navbar';
    const SELECTOR_DATA_TOGGLE$3 = '[data-st-toggle="dropdown"]';
    const SELECTOR_MENU = '.dropdown-menu';
    const SELECTOR_NAVBAR_NAV = '.navbar-nav';
    const SELECTOR_VISIBLE_ITEMS = '.dropdown-menu .dropdown-item:not(.disabled):not(:disabled)';
    const PLACEMENT_TOP = isRTL() ? 'top-end' : 'top-start';
    const PLACEMENT_TOPEND = isRTL() ? 'top-start' : 'top-end';
    const PLACEMENT_BOTTOM = isRTL() ? 'bottom-end' : 'bottom-start';
    const PLACEMENT_BOTTOMEND = isRTL() ? 'bottom-start' : 'bottom-end';
    const PLACEMENT_RIGHT = isRTL() ? 'left-start' : 'right-start';
    const PLACEMENT_LEFT = isRTL() ? 'right-start' : 'left-start';
    const Default$6 = {
        offset: [0, 2],
        boundary: 'clippingParents',
        reference: 'toggle',
        display: 'dynamic',
        popperConfig: null
    };
    const DefaultType$6 = {
        offset: '(array|string|function)',
        boundary: '(string|element)',
        reference: '(string|element|object)',
        display: 'string',
        popperConfig: '(null|object|function)'
    };
    /**
     * ------------------------------------------------------------------------
     * Class Definition
     * ------------------------------------------------------------------------
     */

    class Dropdown extends BaseComponent {
        constructor(element, config) {
                super(element);
                this._popper = null;
                this._config = this._getConfig(config);
                this._menu = this._getMenuElement();
                this._inNavbar = this._detectNavbar();

                this._addEventListeners();
            } // Getters


        static get Default() {
            return Default$6;
        }

        static get DefaultType() {
            return DefaultType$6;
        }

        static get DATA_KEY() {
                return DATA_KEY$7;
            } // Public


        toggle() {
            if (this._element.disabled || this._element.classList.contains(CLASS_NAME_DISABLED)) {
                return;
            }

            const isActive = this._element.classList.contains(CLASS_NAME_SHOW$6);

            Dropdown.clearMenus();

            if (isActive) {
                return;
            }

            this.show();
        }

        show() {
            if (this._element.disabled || this._element.classList.contains(CLASS_NAME_DISABLED) || this._menu.classList.contains(CLASS_NAME_SHOW$6)) {
                return;
            }

            const parent = Dropdown.getParentFromElement(this._element);
            const relatedTarget = {
                relatedTarget: this._element
            };
            const showEvent = EventHandler.trigger(this._element, EVENT_SHOW$4, relatedTarget);

            if (showEvent.defaultPrevented) {
                return;
            } // Totally disable Popper for Dropdowns in Navbar


            if (this._inNavbar) {
                Manipulator.setDataAttribute(this._menu, 'popper', 'none');
            } else {
                if (typeof Popper === 'undefined') {
                    throw new TypeError('Strawberry\'s dropdowns require Popper (https://popper.js.org)');
                }

                let referenceElement = this._element;

                if (this._config.reference === 'parent') {
                    referenceElement = parent;
                } else if (isElement$1(this._config.reference)) {
                    referenceElement = this._config.reference; // Check if it's jQuery element

                    if (typeof this._config.reference.jquery !== 'undefined') {
                        referenceElement = this._config.reference[0];
                    }
                } else if (typeof this._config.reference === 'object') {
                    referenceElement = this._config.reference;
                }

                const popperConfig = this._getPopperConfig();

                const isDisplayStatic = popperConfig.modifiers.find(modifier => modifier.name === 'applyStyles' && modifier.enabled === false);
                this._popper = createPopper(referenceElement, this._menu, popperConfig);

                if (isDisplayStatic) {
                    Manipulator.setDataAttribute(this._menu, 'popper', 'static');
                }
            } // If this is a touch-enabled device we add extra
            // empty mouseover listeners to the body's immediate children;
            // only needed because of broken event delegation on iOS
            // https://www.quirksmode.org/blog/archives/2014/02/mouse_event_bub.html


            if ('ontouchstart' in document.documentElement && !parent.closest(SELECTOR_NAVBAR_NAV)) {
                [].concat(...document.body.children).forEach(elem => EventHandler.on(elem, 'mouseover', null, noop()));
            }

            this._element.focus();

            this._element.setAttribute('aria-expanded', true);

            this._menu.classList.toggle(CLASS_NAME_SHOW$6);

            this._element.classList.toggle(CLASS_NAME_SHOW$6);

            EventHandler.trigger(this._element, EVENT_SHOWN$4, relatedTarget);
        }

        hide() {
            if (this._element.disabled || this._element.classList.contains(CLASS_NAME_DISABLED) || !this._menu.classList.contains(CLASS_NAME_SHOW$6)) {
                return;
            }

            const relatedTarget = {
                relatedTarget: this._element
            };
            const hideEvent = EventHandler.trigger(this._element, EVENT_HIDE$4, relatedTarget);

            if (hideEvent.defaultPrevented) {
                return;
            }

            if (this._popper) {
                this._popper.destroy();
            }

            this._menu.classList.toggle(CLASS_NAME_SHOW$6);

            this._element.classList.toggle(CLASS_NAME_SHOW$6);

            Manipulator.removeDataAttribute(this._menu, 'popper');
            EventHandler.trigger(this._element, EVENT_HIDDEN$4, relatedTarget);
        }

        dispose() {
            EventHandler.off(this._element, EVENT_KEY$7);
            this._menu = null;

            if (this._popper) {
                this._popper.destroy();

                this._popper = null;
            }

            super.dispose();
        }

        update() {
                this._inNavbar = this._detectNavbar();

                if (this._popper) {
                    this._popper.update();
                }
            } // Private


        _addEventListeners() {
            EventHandler.on(this._element, EVENT_CLICK, event => {
                event.preventDefault();
                this.toggle();
            });
        }

        _getConfig(config) {
            config = {...this.constructor.Default,
                ...Manipulator.getDataAttributes(this._element),
                ...config
            };
            typeCheckConfig(NAME$7, config, this.constructor.DefaultType);

            if (typeof config.reference === 'object' && !isElement$1(config.reference) && typeof config.reference.getBoundingClientRect !== 'function') {
                // Popper virtual elements require a getBoundingClientRect method
                throw new TypeError(`${NAME$7.toUpperCase()}: Option "reference" provided type "object" without a required "getBoundingClientRect" method.`);
            }

            return config;
        }

        _getMenuElement() {
            return SelectorEngine.next(this._element, SELECTOR_MENU)[0];
        }

        _getPlacement() {
            const parentDropdown = this._element.parentNode;

            if (parentDropdown.classList.contains(CLASS_NAME_DROPEND)) {
                return PLACEMENT_RIGHT;
            }

            if (parentDropdown.classList.contains(CLASS_NAME_DROPSTART)) {
                return PLACEMENT_LEFT;
            } // We need to trim the value because custom properties can also include spaces


            const isEnd = getComputedStyle(this._menu).getPropertyValue('--st-position').trim() === 'end';

            if (parentDropdown.classList.contains(CLASS_NAME_DROPUP)) {
                return isEnd ? PLACEMENT_TOPEND : PLACEMENT_TOP;
            }

            return isEnd ? PLACEMENT_BOTTOMEND : PLACEMENT_BOTTOM;
        }

        _detectNavbar() {
            return this._element.closest(`.${CLASS_NAME_NAVBAR}`) !== null;
        }

        _getOffset() {
            const {
                offset
            } = this._config;

            if (typeof offset === 'string') {
                return offset.split(',').map(val => Number.parseInt(val, 10));
            }

            if (typeof offset === 'function') {
                return popperData => offset(popperData, this._element);
            }

            return offset;
        }

        _getPopperConfig() {
                const defaultstPopperConfig = {
                    placement: this._getPlacement(),
                    modifiers: [{
                        name: 'preventOverflow',
                        options: {
                            boundary: this._config.boundary
                        }
                    }, {
                        name: 'offset',
                        options: {
                            offset: this._getOffset()
                        }
                    }]
                }; // Disable Popper if we have a static display

                if (this._config.display === 'static') {
                    defaultstPopperConfig.modifiers = [{
                        name: 'applyStyles',
                        enabled: false
                    }];
                }

                return {...defaultstPopperConfig,
                    ...(typeof this._config.popperConfig === 'function' ? this._config.popperConfig(defaultstPopperConfig) : this._config.popperConfig)
                };
            } // Static


        static dropdownInterface(element, config) {
            let data = Data.get(element, DATA_KEY$7);

            const _config = typeof config === 'object' ? config : null;

            if (!data) {
                data = new Dropdown(element, _config);
            }

            if (typeof config === 'string') {
                if (typeof data[config] === 'undefined') {
                    throw new TypeError(`No method named "${config}"`);
                }

                data[config]();
            }
        }

        static jQueryInterface(config) {
            return this.each(function() {
                Dropdown.dropdownInterface(this, config);
            });
        }

        static clearMenus(event) {
            if (event) {
                if (event.button === RIGHT_MOUSE_BUTTON || event.type === 'keyup' && event.key !== TAB_KEY) {
                    return;
                }

                if (/input|select|textarea|form/i.test(event.target.tagName)) {
                    return;
                }
            }

            const toggles = SelectorEngine.find(SELECTOR_DATA_TOGGLE$3);

            for (let i = 0, len = toggles.length; i < len; i++) {
                const context = Data.get(toggles[i], DATA_KEY$7);
                const relatedTarget = {
                    relatedTarget: toggles[i]
                };

                if (event && event.type === 'click') {
                    relatedTarget.clickEvent = event;
                }

                if (!context) {
                    continue;
                }

                const dropdownMenu = context._menu;

                if (!toggles[i].classList.contains(CLASS_NAME_SHOW$6)) {
                    continue;
                }

                if (event) {
                    // Don't close the menu if the clicked element or one of its parents is the dropdown button
                    if ([context._element].some(element => event.composedPath().includes(element))) {
                        continue;
                    } // Tab navigation through the dropdown menu shouldn't close the menu


                    if (event.type === 'keyup' && event.key === TAB_KEY && dropdownMenu.contains(event.target)) {
                        continue;
                    }
                }

                const hideEvent = EventHandler.trigger(toggles[i], EVENT_HIDE$4, relatedTarget);

                if (hideEvent.defaultPrevented) {
                    continue;
                } // If this is a touch-enabled device we remove the extra
                // empty mouseover listeners we added for iOS support


                if ('ontouchstart' in document.documentElement) {
                    [].concat(...document.body.children).forEach(elem => EventHandler.off(elem, 'mouseover', null, noop()));
                }

                toggles[i].setAttribute('aria-expanded', 'false');

                if (context._popper) {
                    context._popper.destroy();
                }

                dropdownMenu.classList.remove(CLASS_NAME_SHOW$6);
                toggles[i].classList.remove(CLASS_NAME_SHOW$6);
                Manipulator.removeDataAttribute(dropdownMenu, 'popper');
                EventHandler.trigger(toggles[i], EVENT_HIDDEN$4, relatedTarget);
            }
        }

        static getParentFromElement(element) {
            return getElementFromSelector(element) || element.parentNode;
        }

        static dataApiKeydownHandler(event) {
            // If not input/textarea:
            //  - And not a key in REGEXP_KEYDOWN => not a dropdown command
            // If input/textarea:
            //  - If space key => not a dropdown command
            //  - If key is other than escape
            //    - If key is not up or down => not a dropdown command
            //    - If trigger inside the menu => not a dropdown command
            if (/input|textarea/i.test(event.target.tagName) ? event.key === SPACE_KEY || event.key !== ESCAPE_KEY$2 && (event.key !== ARROW_DOWN_KEY && event.key !== ARROW_UP_KEY || event.target.closest(SELECTOR_MENU)) : !REGEXP_KEYDOWN.test(event.key)) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            if (this.disabled || this.classList.contains(CLASS_NAME_DISABLED)) {
                return;
            }

            const parent = Dropdown.getParentFromElement(this);
            const isActive = this.classList.contains(CLASS_NAME_SHOW$6);

            if (event.key === ESCAPE_KEY$2) {
                const button = this.matches(SELECTOR_DATA_TOGGLE$3) ? this : SelectorEngine.prev(this, SELECTOR_DATA_TOGGLE$3)[0];
                button.focus();
                Dropdown.clearMenus();
                return;
            }

            if (!isActive && (event.key === ARROW_UP_KEY || event.key === ARROW_DOWN_KEY)) {
                const button = this.matches(SELECTOR_DATA_TOGGLE$3) ? this : SelectorEngine.prev(this, SELECTOR_DATA_TOGGLE$3)[0];
                button.click();
                return;
            }

            if (!isActive || event.key === SPACE_KEY) {
                Dropdown.clearMenus();
                return;
            }

            const items = SelectorEngine.find(SELECTOR_VISIBLE_ITEMS, parent).filter(isVisible);

            if (!items.length) {
                return;
            }

            let index = items.indexOf(event.target); // Up

            if (event.key === ARROW_UP_KEY && index > 0) {
                index--;
            } // Down


            if (event.key === ARROW_DOWN_KEY && index < items.length - 1) {
                index++;
            } // index is -1 if the first keydown is an ArrowUp


            index = index === -1 ? 0 : index;
            items[index].focus();
        }

    }
    /**
     * ------------------------------------------------------------------------
     * Data Api implementation
     * ------------------------------------------------------------------------
     */


    EventHandler.on(document, EVENT_KEYDOWN_DATA_API, SELECTOR_DATA_TOGGLE$3, Dropdown.dataApiKeydownHandler);
    EventHandler.on(document, EVENT_KEYDOWN_DATA_API, SELECTOR_MENU, Dropdown.dataApiKeydownHandler);
    EventHandler.on(document, EVENT_CLICK_DATA_API$3, Dropdown.clearMenus);
    EventHandler.on(document, EVENT_KEYUP_DATA_API, Dropdown.clearMenus);
    EventHandler.on(document, EVENT_CLICK_DATA_API$3, SELECTOR_DATA_TOGGLE$3, function(event) {
        event.preventDefault();
        Dropdown.dropdownInterface(this);
    });
    defineJQueryPlugin(NAME$7, Dropdown);

    // modal event js

    const NAME$6 = 'modal';
    const DATA_KEY$6 = 'st.modal';
    const EVENT_KEY$6 = `.${DATA_KEY$6}`;
    const DATA_API_KEY$3 = '.data-api';
    const ESCAPE_KEY$1 = 'Escape';
    const Default$5 = {
        backdrop: true,
        keyboard: true,
        focus: true
    };
    const DefaultType$5 = {
        backdrop: '(boolean|string)',
        keyboard: 'boolean',
        focus: 'boolean'
    };
    const EVENT_HIDE$3 = `hide${EVENT_KEY$6}`;
    const EVENT_HIDE_PREVENTED = `hidePrevented${EVENT_KEY$6}`;
    const EVENT_HIDDEN$3 = `hidden${EVENT_KEY$6}`;
    const EVENT_SHOW$3 = `show${EVENT_KEY$6}`;
    const EVENT_SHOWN$3 = `shown${EVENT_KEY$6}`;
    const EVENT_FOCUSIN$1 = `focusin${EVENT_KEY$6}`;
    const EVENT_RESIZE = `resize${EVENT_KEY$6}`;
    const EVENT_CLICK_DISMISS$2 = `click.dismiss${EVENT_KEY$6}`;
    const EVENT_KEYDOWN_DISMISS = `keydown.dismiss${EVENT_KEY$6}`;
    const EVENT_MOUSEUP_DISMISS = `mouseup.dismiss${EVENT_KEY$6}`;
    const EVENT_MOUSEDOWN_DISMISS = `mousedown.dismiss${EVENT_KEY$6}`;
    const EVENT_CLICK_DATA_API$2 = `click${EVENT_KEY$6}${DATA_API_KEY$3}`;
    const CLASS_NAME_SCROLLBAR_MEASURER = 'modal-scrollbar-measure';
    const CLASS_NAME_BACKDROP = 'modal-backdrop';
    const CLASS_NAME_OPEN = 'modal-open';
    const CLASS_NAME_FADE$4 = 'fade';
    const CLASS_NAME_SHOW$5 = 'show';
    const CLASS_NAME_STATIC = 'modal-static';
    const SELECTOR_DIALOG = '.modal-dialog';
    const SELECTOR_MODAL_BODY = '.modal-body';
    const SELECTOR_DATA_TOGGLE$2 = '[data-st-toggle="modal"]';
    const SELECTOR_DATA_DISMISS$2 = '[data-st-dismiss="modal"]';
    const SELECTOR_FIXED_CONTENT$1 = '.fixed-top, .fixed-bottom, .is-fixed, .sticky-top';
    const SELECTOR_STICKY_CONTENT$1 = '.sticky-top';

    class Modal extends BaseComponent {
        constructor(element, config) {
                super(element);
                this._config = this._getConfig(config);
                this._dialog = SelectorEngine.findOne(SELECTOR_DIALOG, this._element);
                this._backdrop = null;
                this._isShown = false;
                this._isBodyOverflowing = false;
                this._ignoreBackdropClick = false;
                this._isTransitioning = false;
                this._scrollbarWidth = 0;
            } // Getters


        static get Default() {
            return Default$5;
        }

        static get DATA_KEY() {
                return DATA_KEY$6;
            } // Public


        toggle(relatedTarget) {
            return this._isShown ? this.hide() : this.show(relatedTarget);
        }

        show(relatedTarget) {
            if (this._isShown || this._isTransitioning) {
                return;
            }

            if (this._isAnimated()) {
                this._isTransitioning = true;
            }

            const showEvent = EventHandler.trigger(this._element, EVENT_SHOW$3, {
                relatedTarget
            });

            if (this._isShown || showEvent.defaultPrevented) {
                return;
            }

            this._isShown = true;

            this._checkScrollbar();

            this._setScrollbar();

            this._adjustDialog();

            this._setEscapeEvent();

            this._setResizeEvent();

            EventHandler.on(this._element, EVENT_CLICK_DISMISS$2, SELECTOR_DATA_DISMISS$2, event => this.hide(event));
            EventHandler.on(this._dialog, EVENT_MOUSEDOWN_DISMISS, () => {
                EventHandler.one(this._element, EVENT_MOUSEUP_DISMISS, event => {
                    if (event.target === this._element) {
                        this._ignoreBackdropClick = true;
                    }
                });
            });

            this._showBackdrop(() => this._showElement(relatedTarget));
        }

        hide(event) {
            if (event) {
                event.preventDefault();
            }

            if (!this._isShown || this._isTransitioning) {
                return;
            }

            const hideEvent = EventHandler.trigger(this._element, EVENT_HIDE$3);

            if (hideEvent.defaultPrevented) {
                return;
            }

            this._isShown = false;

            const isAnimated = this._isAnimated();

            if (isAnimated) {
                this._isTransitioning = true;
            }

            this._setEscapeEvent();

            this._setResizeEvent();

            EventHandler.off(document, EVENT_FOCUSIN$1);

            this._element.classList.remove(CLASS_NAME_SHOW$5);

            EventHandler.off(this._element, EVENT_CLICK_DISMISS$2);
            EventHandler.off(this._dialog, EVENT_MOUSEDOWN_DISMISS);

            if (isAnimated) {
                const transitionDuration = getTransitionDurationFromElement(this._element);
                EventHandler.one(this._element, 'transitionend', event => this._hideModal(event));
                emulateTransitionEnd(this._element, transitionDuration);
            } else {
                this._hideModal();
            }
        }

        dispose() {
            [window, this._element, this._dialog].forEach(htmlElement => EventHandler.off(htmlElement, EVENT_KEY$6));
            super.dispose();
            /**
             * `document` has 2 events `EVENT_FOCUSIN` and `EVENT_CLICK_DATA_API`
             * Do not move `document` in `htmlElements` array
             * It will remove `EVENT_CLICK_DATA_API` event that should remain
             */

            EventHandler.off(document, EVENT_FOCUSIN$1);
            this._config = null;
            this._dialog = null;
            this._backdrop = null;
            this._isShown = null;
            this._isBodyOverflowing = null;
            this._ignoreBackdropClick = null;
            this._isTransitioning = null;
            this._scrollbarWidth = null;
        }

        handleUpdate() {
                this._adjustDialog();
            } // Private


        _getConfig(config) {
            config = {...Default$5,
                ...config
            };
            typeCheckConfig(NAME$6, config, DefaultType$5);
            return config;
        }

        _showElement(relatedTarget) {
            const isAnimated = this._isAnimated();

            const modalBody = SelectorEngine.findOne(SELECTOR_MODAL_BODY, this._dialog);

            if (!this._element.parentNode || this._element.parentNode.nodeType !== Node.ELEMENT_NODE) {
                // Don't move modal's DOM position
                document.body.appendChild(this._element);
            }

            this._element.style.display = 'block';

            this._element.removeAttribute('aria-hidden');

            this._element.setAttribute('aria-modal', true);

            this._element.setAttribute('role', 'dialog');

            this._element.scrollTop = 0;

            if (modalBody) {
                modalBody.scrollTop = 0;
            }

            if (isAnimated) {
                reflow(this._element);
            }

            this._element.classList.add(CLASS_NAME_SHOW$5);

            if (this._config.focus) {
                this._enforceFocus();
            }

            const transitionComplete = () => {
                if (this._config.focus) {
                    this._element.focus();
                }

                this._isTransitioning = false;
                EventHandler.trigger(this._element, EVENT_SHOWN$3, {
                    relatedTarget
                });
            };

            if (isAnimated) {
                const transitionDuration = getTransitionDurationFromElement(this._dialog);
                EventHandler.one(this._dialog, 'transitionend', transitionComplete);
                emulateTransitionEnd(this._dialog, transitionDuration);
            } else {
                transitionComplete();
            }
        }

        _enforceFocus() {
            EventHandler.off(document, EVENT_FOCUSIN$1); // guard against infinite focus loop

            EventHandler.on(document, EVENT_FOCUSIN$1, event => {
                if (document !== event.target && this._element !== event.target && !this._element.contains(event.target)) {
                    this._element.focus();
                }
            });
        }

        _setEscapeEvent() {
            if (this._isShown) {
                EventHandler.on(this._element, EVENT_KEYDOWN_DISMISS, event => {
                    if (this._config.keyboard && event.key === ESCAPE_KEY$1) {
                        event.preventDefault();
                        this.hide();
                    } else if (!this._config.keyboard && event.key === ESCAPE_KEY$1) {
                        this._triggerBackdropTransition();
                    }
                });
            } else {
                EventHandler.off(this._element, EVENT_KEYDOWN_DISMISS);
            }
        }

        _setResizeEvent() {
            if (this._isShown) {
                EventHandler.on(window, EVENT_RESIZE, () => this._adjustDialog());
            } else {
                EventHandler.off(window, EVENT_RESIZE);
            }
        }

        _hideModal() {
            this._element.style.display = 'none';

            this._element.setAttribute('aria-hidden', true);

            this._element.removeAttribute('aria-modal');

            this._element.removeAttribute('role');

            this._isTransitioning = false;

            this._showBackdrop(() => {
                document.body.classList.remove(CLASS_NAME_OPEN);

                this._resetAdjustments();

                this._resetScrollbar();

                EventHandler.trigger(this._element, EVENT_HIDDEN$3);
            });
        }

        _removeBackdrop() {
            this._backdrop.parentNode.removeChild(this._backdrop);

            this._backdrop = null;
        }

        _showBackdrop(callback) {
            const isAnimated = this._isAnimated();

            if (this._isShown && this._config.backdrop) {
                this._backdrop = document.createElement('div');
                this._backdrop.className = CLASS_NAME_BACKDROP;

                if (isAnimated) {
                    this._backdrop.classList.add(CLASS_NAME_FADE$4);
                }

                document.body.appendChild(this._backdrop);
                EventHandler.on(this._element, EVENT_CLICK_DISMISS$2, event => {
                    if (this._ignoreBackdropClick) {
                        this._ignoreBackdropClick = false;
                        return;
                    }

                    if (event.target !== event.currentTarget) {
                        return;
                    }

                    if (this._config.backdrop === 'static') {
                        this._triggerBackdropTransition();
                    } else {
                        this.hide();
                    }
                });

                if (isAnimated) {
                    reflow(this._backdrop);
                }

                this._backdrop.classList.add(CLASS_NAME_SHOW$5);

                if (!isAnimated) {
                    callback();
                    return;
                }

                const backdropTransitionDuration = getTransitionDurationFromElement(this._backdrop);
                EventHandler.one(this._backdrop, 'transitionend', callback);
                emulateTransitionEnd(this._backdrop, backdropTransitionDuration);
            } else if (!this._isShown && this._backdrop) {
                this._backdrop.classList.remove(CLASS_NAME_SHOW$5);

                const callbackRemove = () => {
                    this._removeBackdrop();

                    callback();
                };

                if (isAnimated) {
                    const backdropTransitionDuration = getTransitionDurationFromElement(this._backdrop);
                    EventHandler.one(this._backdrop, 'transitionend', callbackRemove);
                    emulateTransitionEnd(this._backdrop, backdropTransitionDuration);
                } else {
                    callbackRemove();
                }
            } else {
                callback();
            }
        }

        _isAnimated() {

            return this._element.classList.contains(CLASS_NAME_FADE$4);
        }

        _triggerBackdropTransition() {
                const hideEvent = EventHandler.trigger(this._element, EVENT_HIDE_PREVENTED);

                if (hideEvent.defaultPrevented) {
                    return;
                }

                const isModalOverflowing = this._element.scrollHeight > document.documentElement.clientHeight;

                if (!isModalOverflowing) {
                    this._element.style.overflowY = 'hidden';
                }

                this._element.classList.add(CLASS_NAME_STATIC);

                const modalTransitionDuration = getTransitionDurationFromElement(this._dialog);
                EventHandler.off(this._element, 'transitionend');
                EventHandler.one(this._element, 'transitionend', () => {
                    this._element.classList.remove(CLASS_NAME_STATIC);

                    if (!isModalOverflowing) {
                        EventHandler.one(this._element, 'transitionend', () => {
                            this._element.style.overflowY = '';
                        });
                        emulateTransitionEnd(this._element, modalTransitionDuration);
                    }
                });
                emulateTransitionEnd(this._element, modalTransitionDuration);

                this._element.focus();
            } // ----------------------------------------------------------------------
            // the following methods are used to handle overflowing modals
            // ----------------------------------------------------------------------


        _adjustDialog() {
            const isModalOverflowing = this._element.scrollHeight > document.documentElement.clientHeight;

            if (!this._isBodyOverflowing && isModalOverflowing && !isRTL() || this._isBodyOverflowing && !isModalOverflowing && isRTL()) {
                this._element.style.paddingLeft = `${this._scrollbarWidth}px`;
            }

            if (this._isBodyOverflowing && !isModalOverflowing && !isRTL() || !this._isBodyOverflowing && isModalOverflowing && isRTL()) {
                this._element.style.paddingRight = `${this._scrollbarWidth}px`;
            }
        }

        _resetAdjustments() {
            this._element.style.paddingLeft = '';
            this._element.style.paddingRight = '';
        }

        _checkScrollbar() {
            const rect = document.body.getBoundingClientRect();
            this._isBodyOverflowing = Math.round(rect.left + rect.right) < window.innerWidth;
            this._scrollbarWidth = this._getScrollbarWidth();
        }

        _setScrollbar() {
            if (this._isBodyOverflowing) {
                this._setElementAttributes(SELECTOR_FIXED_CONTENT$1, 'paddingRight', calculatedValue => calculatedValue + this._scrollbarWidth);

                this._setElementAttributes(SELECTOR_STICKY_CONTENT$1, 'marginRight', calculatedValue => calculatedValue - this._scrollbarWidth);

                this._setElementAttributes('body', 'paddingRight', calculatedValue => calculatedValue + this._scrollbarWidth);
            }

            document.body.classList.add(CLASS_NAME_OPEN);
        }

        _setElementAttributes(selector, styleProp, callback) {
            SelectorEngine.find(selector).forEach(element => {
                if (element !== document.body && window.innerWidth > element.clientWidth + this._scrollbarWidth) {
                    return;
                }

                const actualValue = element.style[styleProp];
                const calculatedValue = window.getComputedStyle(element)[styleProp];
                Manipulator.setDataAttribute(element, styleProp, actualValue);
                element.style[styleProp] = callback(Number.parseFloat(calculatedValue)) + 'px';
            });
        }

        _resetScrollbar() {
            this._resetElementAttributes(SELECTOR_FIXED_CONTENT$1, 'paddingRight');

            this._resetElementAttributes(SELECTOR_STICKY_CONTENT$1, 'marginRight');

            this._resetElementAttributes('body', 'paddingRight');
        }

        _resetElementAttributes(selector, styleProp) {
            SelectorEngine.find(selector).forEach(element => {
                const value = Manipulator.getDataAttribute(element, styleProp);

                if (typeof value === 'undefined' && element === document.body) {
                    element.style[styleProp] = '';
                } else {
                    Manipulator.removeDataAttribute(element, styleProp);
                    element.style[styleProp] = value;
                }
            });
        }

        _getScrollbarWidth() {
                // thx d.walsh
                const scrollDiv = document.createElement('div');
                scrollDiv.className = CLASS_NAME_SCROLLBAR_MEASURER;
                document.body.appendChild(scrollDiv);
                const scrollbarWidth = scrollDiv.getBoundingClientRect().width - scrollDiv.clientWidth;
                document.body.removeChild(scrollDiv);
                return scrollbarWidth;
            } // Static


        static jQueryInterface(config, relatedTarget) {
            return this.each(function() {
                let data = Data.get(this, DATA_KEY$6);
                const _config = {...Default$5,
                    ...Manipulator.getDataAttributes(this),
                    ...(typeof config === 'object' && config ? config : {})
                };

                if (!data) {
                    data = new Modal(this, _config);
                }

                if (typeof config === 'string') {
                    if (typeof data[config] === 'undefined') {
                        throw new TypeError(`No method named "${config}"`);
                    }

                    data[config](relatedTarget);
                }
            });
        }
    }

    EventHandler.on(document, EVENT_CLICK_DATA_API$2, SELECTOR_DATA_TOGGLE$2, function(event) {
        const target = getElementFromSelector(this);

        if (this.tagName === 'A' || this.tagName === 'AREA') {
            event.preventDefault();
        }

        EventHandler.one(target, EVENT_SHOW$3, showEvent => {
            if (showEvent.defaultPrevented) {
                // only register focus restorer if modal will actually get shown
                return;
            }

            EventHandler.one(target, EVENT_HIDDEN$3, () => {
                if (isVisible(this)) {
                    this.focus();
                }
            });
        });
        let data = Data.get(target, DATA_KEY$6);

        if (!data) {
            const config = {...Manipulator.getDataAttributes(target),
                ...Manipulator.getDataAttributes(this)
            };
            data = new Modal(target, config);
        }

        data.toggle(this);
    });

    defineJQueryPlugin(NAME$6, Modal);

    const index_umd = {
        Modal,
        Alert,
        Collapse
    };

    return index_umd;
})));