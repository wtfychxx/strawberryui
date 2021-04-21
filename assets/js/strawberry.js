(function(global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
        typeof define === 'function' && define.amd ? define(factory) :
        (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.strawberry = factory());
}(this, (function() {
    'use strict';

    function _defineProperties(target, props) {
        for (let i = 0; i < props.length; i++) {
            let descriptor = props[i];
            descriptor.enumerable = descriptor.enumerable || false;
            descriptor.configurable = true;
            if ("value" in descriptor) descriptor.writable = true;
            Object.defineProperty(target, descriptor.key, descriptor);
        }
    }

    function _createClass(Constructor, protoProps, staticProps) {
        if (protoProps) _defineProperties(Constructor.prototype, protoProps);
        if (staticProps) _defineProperties(Constructor, staticProps);
        return Constructor;
    }

    function _extends() {
        _extends = Object.assign || function(target) {
            for (let i = 1; i < arguments.length; i++) {
                let source = arguments[i];

                for (let key in source) {
                    if (Object.prototype.hasOwnProperty.call(source, key)) {
                        target[key] = source[key];
                    }
                }
            }

            return target;
        };

        return _extends.apply(this, arguments);
    }

    function _inheritsLoose(subClass, superClass) {
        subClass.prototype = Object.create(superClass.prototype);
        subClass.prototype.constructor = subClass;
        subClass.__proto__ = superClass;
    }

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
        let selector = element.getAttribute('data-target');

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

        if (jQuery && !document.body.hasAttribute('data-no-jquery')) {
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

    const mapData = function() {
        const storeData = [];
        let id = 1;
        return {
            set: (element, key, data) => {
                if (typeof element.stKey === 'undefined') {
                    element.stKey = {
                        key: key,
                        id: id
                    };
                    id++;
                }

                storeData[element.stKey.id] = data;
            },
            get: (element, key) => {
                if (!element || typeof element.stKey === 'undefined') {
                    return null;
                }

                let keyProperties = element.stKey;

                if (keyProperties.key === $key) {
                    delete storeData[keyProperties.id];
                    delete element.stKey;
                }
            }
        };
    }();

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
            let domElements = element.querySelectorAll(selector);

            for (let target = event.target; target && target !== this; target = target.parentNode) {
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
            const isNamespace = originalTypeEvent.charAt(0) === '.';

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
                jQueryEvent = $.event(event, args);
                $(element).trigger(jQueryEvent);
                bubbles = !jQuery.isPropagationStopped();
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
    }

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
        setDataAttribute: function setDataAttribute(element, key, value) {
            element.setAttribute("data-" + normalizeDataKey(key), value);
        },
        removeDataAttribute: function removeDataAttribute(element, key) {
            element.removeAttribute("data-" + normalizeDataKey(key));
        },
        getDataAttributes: function getDataAttributes(element) {
            if (!element) {
                return {};
            }

            var attributes = _extends({}, element.dataset);

            Object.keys(attributes).forEach(function(key) {
                attributes[key] = normalizeData(attributes[key]);
            });
            return attributes;
        },
        getDataAttribute: function getDataAttribute(element, key) {
            return normalizeData(element.getAttribute("data-" + normalizeDataKey(key)));
        },
        offset: function offset(element) {
            var rect = element.getBoundingClientRect();
            return {
                top: rect.top + document.body.scrollTop,
                left: rect.left + document.body.scrollLeft
            };
        },
        position: function position(element) {
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

    // modal event js

    const NAME$6 = 'modal';
    const DATA_KEY$6 = 'bs.modal';
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
    const SELECTOR_DATA_TOGGLE$2 = '[data-bs-toggle="modal"]';
    const SELECTOR_DATA_DISMISS$2 = '[data-bs-dismiss="modal"]';
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
        Modal
    };

    return index_umd;
})));