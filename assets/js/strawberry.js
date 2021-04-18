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


    // Strawberry-ui.js

    let MAX_UID = 1000000;
    let MILLISECONDS_MULTIPLIER = 1000;
    let TRANSITION_END = 'transitionend';

    const toType = (obj) => {
        if (obj === null || obj === undefined) {
            return "" + obj;
        }
        return {}.toString.call(obj).match(/\s([a-z]+)/i)[1].toLowerCase();
    };

    // Public utility API

    const getUID = (prefix) => {
        do {
            preifx += Math.floor(Math.random() * MAX_UID);
        } while (document.getElementById(prefix));

        return prefix;
    }

    const getSelector = (element) => {
        let selector = element.getAttribute('data-target');

        if (!selector || selector === '#') {
            let hrefAttr = element.getAttribute('href');
            selector = hrefAttr && hrefAttr !== '#' ? hrefAttr.trim() : null;
        }

        return selector;
    }

    const getSelectorFromElement = (element) => {
        let selector = getSelector(element);

        if (selector) {
            return document.getElementById(selector) ? selector : null;
        }

        return null;
    }

    const getElementFromSelector = (element) => {
        let selector = getSelector(element);
        return selector ? document.querySelector(selector) : null;
    }

    const getTransitionDurationFromElement = (element) => {
        if (!element) {
            return 0;
        }

        let _window$getComputedSt = window.getComputedStyle(element),
            transitionDuration = _window$getComputedSt.transitionDuration,
            transitionDelay = _window$getComputedSt.transitionDelay;

        let floatTransitionDuration = parseFloat(transitionDuration);
        let floatTransitionDelay = parseFloat(transitionDelay);

        if (!floatTransitionDuration && !floatTransitionDelay) {
            return 0;
        }

        transitionDuration = transitionDuration.split(',')[0];
        transitionDelay = transitionDelay.split(',')[0];
        return (parseFloat(transitionDuration) + parseFloat(transitionDelay)) * MILLISECONDS_MULTIPLIER;
    }

    const triggerTransitionEnd = (element) => {
        element.dispatchEvent(new Event(TRANSITION_END));
    }

    const isElement = (obj) => {
        return (obj[0] || obj).modeType;
    }

    const emulateTransitionEnd = (element, duration) => {
        let called = false;
        let durationPadding = 5;
        let emulatedDuration = duration + durationPadding;

        function listener() {
            called = true;
            element.removeEventListener(TRANSITION_END, listener)
            setTimeout(() => {
                if (!called) {
                    triggerTransitionEnd(element);
                }
            }, emulatedDuration);
        }
    }

    const typeCheckConfig = (componentName, config, configTypes) => {
        Object.keys(configTypes).forEach((property) => {
            let expectedTypes = configTypes[property];
            let value = config[property];
            let valueType = value && isElement(value) ? 'element' : toType(value);

            if (!new RegExp(expectedTypes).test(valueType)) {
                throw new Error(componentName.toUpperCase() + ": " + ("Option \"" + property + "\" provided type \"" + valueType + "\" ") + ("but expected type \"" + expectedTypes + "\"."));
            }
        })
    }

    const isVisible = (element) => {
        if (!element) {
            return false;
        }

        if (element.style && element.parentNode && element.parentNode.style) {
            let elementStyle = getComputedStyle(element);
            let parentNodeStyle = getComputedStyle(element.parentNode);
            return elementStyle.display !== 'none' && parentNodeStyle.display !== 'none' && elementStyle.visibility !== 'hidden';
        }

        return false;
    }

    const findShadowRoot = (element) => {
        if (!document.documentElement.attachShadow) {
            return null;
        }

        if (typeof element.getRootNode === 'function') {
            let root = element.getRootNode();
            return root instanceof ShadowRoot ? root : null;
        }

        if (element instanceof ShadowRoot) {
            return element;
        }

        if (!element.parentNode) {
            return null;
        }

        return findShadowRoot(element.parentNode);
    }

    const noop = () => {
        return function() {};
    }

    const reflow = (element) => {
        return element.offsetHeight;
    }

    const getjQuery = () => {
        let _window = window,
            jQuery = _window.jQuery;

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
        setData: (instance, key, data) => {
            mapData.set(instance, key, data);
        },
        getData: (instance, key) => {
            return mapData.get(instance, key);
        },
        removeData: (instance, key) => {
            mapData.delete(instance, key);
        }
    }

    let namespaceRegex = /[^.]*(?=\..*)\.|.*/;
    let stripNameRegex = /\..*/;
    let stripUidRegex = /::\d+$/;
    const eventRegistry = {};

    let uidEvent = 1;
    const customEvents = {
        mouseenter: 'mouseover',
        mouseleave: 'mouseout'
    };

    const nativeEvents = ['click', 'dblclick', 'mouseup', 'mousedown', 'contextmenu', 'mousewheel', 'DOMMouseScroll', 'mouseover', 'mouseout', 'mousemove', 'selectstart', 'selectend', 'keydown', 'keypress', 'keyup', 'orientationchange', 'touchstart', 'touchmove', 'touchend', 'touchcancel', 'pointerdown', 'pointermove', 'pointerup', 'pointerleave', 'pointercancel', 'gesturestart', 'gesturechange', 'gestureend', 'focus', 'blur', 'change', 'reset', 'select', 'submit', 'focusin', 'focusout', 'load', 'unload', 'beforeunload', 'resize', 'move', 'DOMContentLoaded', 'readystatechange', 'error', 'abort', 'scroll'];

    const getUidEvent = (element, uid) => {
        return uid && uid + "::" + uidEvent++ || element.uidEvent || uidEvent++;
    }

    const getEvent = (element) => {
        let uid = getUidEvent(element);
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
        if (delegationSelector === void 0) {
            delegateSelector = null;
        }

        let uidEventList = Object.keys(events);

        for (let i = 0, len = uidEventList.length; i < len; i++) {
            let event = events[uidEventList[i]];

            if (event.originalHandler === handler && event.delegationSelector === delegationSelector) {
                return event;
            }
        }

        return null;
    }

    const normalizeParams = (originalTypeEvent, handler, delegationFn) => {
        let delegation = typeof handler === 'string';
        let originalHandler = delegation ? delegationFn : handler;

        let typeEvent = originalTypeEvent.replace(stripNameRegex, "");
        let custom = customEvents[typeEvent];

        if (custom) {
            typeEvent = custom;
        }

        let isNative = nativeEvents.indexOf(typeEvent) > -1;

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

        let _normalizeParams = normalizeParams(originalTypeEvent, handler, delegationFn),
            delegation = _normalizeParams[0],
            originalHandler = _normalizeParams[1],
            typeEvent = _normalizeParams[2];

        let events = getEvent(element);
        let handlers = events[typeEvent] || (events[typeEvent] = {});
        let previousFn = findHandler(handlers, originalHandler, delegation ? handler : null);

        if (previousFn) {
            previousFn.oneOff = previousFn.oneOff && oneOff;
            return;
        }

        let uid = getUidEvent(originalHandler, originalTypeEvent.replace(namespaceRegex, ''));
        let fn = delegation ? strawberryDelegationHandler(element, handler, delegationFn) : strawberryHandler(element, handler);
        fn.delegationSelector = delegation ? handler : null;
        fn.originalHandler = originalHandler;
        fn.oneOff = oneOff;
        fn.uidEvent = uid;
        handlers[uid] = fn;
        element.addEventListener(typeEvent, fn, delegation);
    }

    const removeHandler = (element, events, typeEvent, handler, delegationSelector) => {
        let fn = findHandler(events[typeEvent], handler, delegationSelector);

        if (!fn) {
            return;
        }

        element.removeEventListener(typeEvent, fn, Boolean(delegationSelector));
        delete events[typeEvent][fn.uidEvent];
    }

    const removeNamespacedHandlers = (element, events, typeEvent, namespace) => {
        let storeElementEvent = events[typeEvent] || {};

        Object.keys(storeElementEvent).forEach((handlerKey) => {
            if (handlerKey.indexOf(namespace) > -1) {
                let event = storeElementEvent[handlerKey];
                removeHandler(element, events, typeEvent, event.originalHandler, event.delegationSelector);
            }
        })
    }

    const EventHandler = {
        on: (element, event, handler, delegationFn) => {
            addHandler(element, event, handler, delegationFn, false);
        },
        one: (element, event, handler, delegationFn) => {
            addHandler(element, event, handler, delegationFn, true);
        },
        off: (element, originalTypeEvent, handler, delegationFn) => {
            if (typeof originalTypeEvent !== 'string' || !element) {
                return;
            }

            let _normalizeParams2 = normalizeParams(originalTypeEvent, handler, delegationFn),
                delegation = _normalizeParams2[0],
                originalHandler = _normalizeParams2[1],
                typeEvent = _normalizeParams2[2];

            let inNamespace = typeEvent !== originalTypeEvent;
            let events = getEvent(element);
            let isNamespace = originalTypeEvent.charAt(0) === '.';

            if (typeof originalHandler !== 'undefined') {
                if (!events || !events[typeEvent]) {
                    return;
                }

                removeHandler(element, events, typeEvent, originalHeader, delegation ? handler : null);
                return;
            }

            if (isNamespace) {
                Object.keys(events).forEach((elementEvent) => {
                    removeNamespacedHandlers(element, events, elementEvent, originalTypeEvent.slice(1));
                })
            }

            let storeElementEvent = ecents[typeEvent] || {};
            Object.keys(storeElementEvent).forEach((keyHandlers) => {
                let handlerKey = keyHandlers.replace(stripUidRegex, '');

                if (!inNamespace || originalTypeEvent.indexOf(handlerKey) > -1) {
                    let event = storeElementEvent[keyHandlers];

                    removeHandler(element, events, typeEvent, event.originalHandler, event.delegationSelector);
                }
            });
        },
        trigger: (element, event, args) => {
            if (typeof event !== 'string' || !element) {
                return null;
            }

            let $ = getjQuery();
            let typeEvent = event.replace(stripNameRegex, '');
            let inNamespace = event !== typeEvent;
            let isNative = nativeEvents.indexOf(typeEvent) > -1;
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
                evt.initEvent(typeEevnt, bubbles, true);
            } else {
                evt = new CustomEvent(event, {
                    bubbles: bubbles,
                    cancelable: true
                });
            }

            if (typeof args !== 'undefined') {
                Object.keys(args).forEach((key) => {
                    Object.defineProperty(evt, key, {
                        get: () => {
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

    let NAME$5 = 'modal';
    let VERSION$5 = '5.0.0-alpha3';
    let DATA_KEY$5 = 'bs.modal';
    let EVENT_KEY$5 = "." + DATA_KEY$5;
    let DATA_API_KEY$5 = '.data-api';
    let ESCAPE_KEY$1 = 'Escape';
    let Default$3 = {
        backdrop: true,
        keyboard: true,
        focus: true,
        show: true
    };
    let DefaultType$3 = {
        backdrop: '(boolean|string)',
        keyboard: 'boolean',
        focus: 'boolean',
        show: 'boolean'
    };
    let EVENT_HIDE$2 = "hide" + EVENT_KEY$5;
    let EVENT_HIDE_PREVENTED = "hidePrevented" + EVENT_KEY$5;
    let EVENT_HIDDEN$2 = "hidden" + EVENT_KEY$5;
    let EVENT_SHOW$2 = "show" + EVENT_KEY$5;
    let EVENT_SHOWN$2 = "shown" + EVENT_KEY$5;
    let EVENT_FOCUSIN = "focusin" + EVENT_KEY$5;
    let EVENT_RESIZE = "resize" + EVENT_KEY$5;
    let EVENT_CLICK_DISMISS = "click.dismiss" + EVENT_KEY$5;
    let EVENT_KEYDOWN_DISMISS = "keydown.dismiss" + EVENT_KEY$5;
    let EVENT_MOUSEUP_DISMISS = "mouseup.dismiss" + EVENT_KEY$5;
    let EVENT_MOUSEDOWN_DISMISS = "mousedown.dismiss" + EVENT_KEY$5;
    let EVENT_CLICK_DATA_API$5 = "click" + EVENT_KEY$5 + DATA_API_KEY$5;
    let CLASS_NAME_SCROLLBAR_MEASURER = 'modal-scrollbar-measure';
    let CLASS_NAME_BACKDROP = 'modal-backdrop';
    let CLASS_NAME_OPEN = 'modal-open';
    let CLASS_NAME_FADE = 'fade';
    let CLASS_NAME_SHOW$2 = 'show';
    let CLASS_NAME_STATIC = 'modal-static';
    let SELECTOR_DIALOG = '.modal-dialog';
    let SELECTOR_MODAL_BODY = '.modal-body';
    let SELECTOR_DATA_TOGGLE$3 = '[data-toggle="modal"]';
    let SELECTOR_DATA_DISMISS = '[data-dismiss="modal"]';
    let SELECTOR_FIXED_CONTENT = '.fixed-top, .fixed-bottom, .is-fixed, .sticky-top';
    let SELECTOR_STICKY_CONTENT = '.sticky-top';

    var Modal = /*#__PURE__*/ function() {
        function Modal(element, config) {
            this._config = this._getConfig(config);
            this._element = element;
            this._dialog = SelectorEngine.findOne(SELECTOR_DIALOG, element);
            this._backdrop = null;
            this._isShown = false;
            this._isBodyOverflowing = false;
            this._ignoreBackdropClick = false;
            this._isTransitioning = false;
            this._scrollbarWidth = 0;
            Data.setData(element, DATA_KEY$5, this);
        } // Getters


        var _proto = Modal.prototype;

        // Public
        _proto.toggle = function toggle(relatedTarget) {
            return this._isShown ? this.hide() : this.show(relatedTarget);
        };

        _proto.show = function show(relatedTarget) {
            var _this = this;

            if (this._isShown || this._isTransitioning) {
                return;
            }

            if (this._element.classList.contains(CLASS_NAME_FADE)) {
                this._isTransitioning = true;
            }

            var showEvent = EventHandler.trigger(this._element, EVENT_SHOW$2, {
                relatedTarget: relatedTarget
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

            EventHandler.on(this._element, EVENT_CLICK_DISMISS, SELECTOR_DATA_DISMISS, function(event) {
                return _this.hide(event);
            });
            EventHandler.on(this._dialog, EVENT_MOUSEDOWN_DISMISS, function() {
                EventHandler.one(_this._element, EVENT_MOUSEUP_DISMISS, function(event) {
                    if (event.target === _this._element) {
                        _this._ignoreBackdropClick = true;
                    }
                });
            });

            this._showBackdrop(function() {
                return _this._showElement(relatedTarget);
            });
        };

        _proto.hide = function hide(event) {
            var _this2 = this;

            if (event) {
                event.preventDefault();
            }

            if (!this._isShown || this._isTransitioning) {
                return;
            }

            var hideEvent = EventHandler.trigger(this._element, EVENT_HIDE$2);

            if (hideEvent.defaultPrevented) {
                return;
            }

            this._isShown = false;

            var transition = this._element.classList.contains(CLASS_NAME_FADE);

            if (transition) {
                this._isTransitioning = true;
            }

            this._setEscapeEvent();

            this._setResizeEvent();

            EventHandler.off(document, EVENT_FOCUSIN);

            this._element.classList.remove(CLASS_NAME_SHOW$2);

            EventHandler.off(this._element, EVENT_CLICK_DISMISS);
            EventHandler.off(this._dialog, EVENT_MOUSEDOWN_DISMISS);

            if (transition) {
                var transitionDuration = getTransitionDurationFromElement(this._element);
                EventHandler.one(this._element, TRANSITION_END, function(event) {
                    return _this2._hideModal(event);
                });
                emulateTransitionEnd(this._element, transitionDuration);
            } else {
                this._hideModal();
            }
        };

        _proto.dispose = function dispose() {
            [window, this._element, this._dialog].forEach(function(htmlElement) {
                return EventHandler.off(htmlElement, EVENT_KEY$5);
            });
            /**
             * `document` has 2 events `EVENT_FOCUSIN` and `EVENT_CLICK_DATA_API`
             * Do not move `document` in `htmlElements` array
             * It will remove `EVENT_CLICK_DATA_API` event that should remain
             */

            EventHandler.off(document, EVENT_FOCUSIN);
            Data.removeData(this._element, DATA_KEY$5);
            this._config = null;
            this._element = null;
            this._dialog = null;
            this._backdrop = null;
            this._isShown = null;
            this._isBodyOverflowing = null;
            this._ignoreBackdropClick = null;
            this._isTransitioning = null;
            this._scrollbarWidth = null;
        };

        _proto.handleUpdate = function handleUpdate() {
                this._adjustDialog();
            } // Private
        ;

        _proto._getConfig = function _getConfig(config) {
            config = _extends({}, Default$3, config);
            typeCheckConfig(NAME$5, config, DefaultType$3);
            return config;
        };

        _proto._showElement = function _showElement(relatedTarget) {
            var _this3 = this;

            var transition = this._element.classList.contains(CLASS_NAME_FADE);

            var modalBody = SelectorEngine.findOne(SELECTOR_MODAL_BODY, this._dialog);

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

            if (transition) {
                reflow(this._element);
            }

            this._element.classList.add(CLASS_NAME_SHOW$2);

            if (this._config.focus) {
                this._enforceFocus();
            }

            var transitionComplete = function transitionComplete() {
                if (_this3._config.focus) {
                    _this3._element.focus();
                }

                _this3._isTransitioning = false;
                EventHandler.trigger(_this3._element, EVENT_SHOWN$2, {
                    relatedTarget: relatedTarget
                });
            };

            if (transition) {
                var transitionDuration = getTransitionDurationFromElement(this._dialog);
                EventHandler.one(this._dialog, TRANSITION_END, transitionComplete);
                emulateTransitionEnd(this._dialog, transitionDuration);
            } else {
                transitionComplete();
            }
        };

        _proto._enforceFocus = function _enforceFocus() {
            var _this4 = this;

            EventHandler.off(document, EVENT_FOCUSIN); // guard against infinite focus loop

            EventHandler.on(document, EVENT_FOCUSIN, function(event) {
                if (document !== event.target && _this4._element !== event.target && !_this4._element.contains(event.target)) {
                    _this4._element.focus();
                }
            });
        };

        _proto._setEscapeEvent = function _setEscapeEvent() {
            var _this5 = this;

            if (this._isShown) {
                EventHandler.on(this._element, EVENT_KEYDOWN_DISMISS, function(event) {
                    if (_this5._config.keyboard && event.key === ESCAPE_KEY$1) {
                        event.preventDefault();

                        _this5.hide();
                    } else if (!_this5._config.keyboard && event.key === ESCAPE_KEY$1) {
                        _this5._triggerBackdropTransition();
                    }
                });
            } else {
                EventHandler.off(this._element, EVENT_KEYDOWN_DISMISS);
            }
        };

        _proto._setResizeEvent = function _setResizeEvent() {
            var _this6 = this;

            if (this._isShown) {
                EventHandler.on(window, EVENT_RESIZE, function() {
                    return _this6._adjustDialog();
                });
            } else {
                EventHandler.off(window, EVENT_RESIZE);
            }
        };

        _proto._hideModal = function _hideModal() {
            var _this7 = this;

            this._element.style.display = 'none';

            this._element.setAttribute('aria-hidden', true);

            this._element.removeAttribute('aria-modal');

            this._element.removeAttribute('role');

            this._isTransitioning = false;

            this._showBackdrop(function() {
                document.body.classList.remove(CLASS_NAME_OPEN);

                _this7._resetAdjustments();

                _this7._resetScrollbar();

                EventHandler.trigger(_this7._element, EVENT_HIDDEN$2);
            });
        };

        _proto._removeBackdrop = function _removeBackdrop() {
            this._backdrop.parentNode.removeChild(this._backdrop);

            this._backdrop = null;
        };

        _proto._showBackdrop = function _showBackdrop(callback) {
            var _this8 = this;

            var animate = this._element.classList.contains(CLASS_NAME_FADE) ? CLASS_NAME_FADE : '';

            if (this._isShown && this._config.backdrop) {
                this._backdrop = document.createElement('div');
                this._backdrop.className = CLASS_NAME_BACKDROP;

                if (animate) {
                    this._backdrop.classList.add(animate);
                }

                document.body.appendChild(this._backdrop);
                EventHandler.on(this._element, EVENT_CLICK_DISMISS, function(event) {
                    if (_this8._ignoreBackdropClick) {
                        _this8._ignoreBackdropClick = false;
                        return;
                    }

                    if (event.target !== event.currentTarget) {
                        return;
                    }

                    _this8._triggerBackdropTransition();
                });

                if (animate) {
                    reflow(this._backdrop);
                }

                this._backdrop.classList.add(CLASS_NAME_SHOW$2);

                if (!animate) {
                    callback();
                    return;
                }

                var backdropTransitionDuration = getTransitionDurationFromElement(this._backdrop);
                EventHandler.one(this._backdrop, TRANSITION_END, callback);
                emulateTransitionEnd(this._backdrop, backdropTransitionDuration);
            } else if (!this._isShown && this._backdrop) {
                this._backdrop.classList.remove(CLASS_NAME_SHOW$2);

                var callbackRemove = function callbackRemove() {
                    _this8._removeBackdrop();

                    callback();
                };

                if (this._element.classList.contains(CLASS_NAME_FADE)) {
                    var _backdropTransitionDuration = getTransitionDurationFromElement(this._backdrop);

                    EventHandler.one(this._backdrop, TRANSITION_END, callbackRemove);
                    emulateTransitionEnd(this._backdrop, _backdropTransitionDuration);
                } else {
                    callbackRemove();
                }
            } else {
                callback();
            }
        };

        _proto._triggerBackdropTransition = function _triggerBackdropTransition() {
                var _this9 = this;

                if (this._config.backdrop === 'static') {
                    var hideEvent = EventHandler.trigger(this._element, EVENT_HIDE_PREVENTED);

                    if (hideEvent.defaultPrevented) {
                        return;
                    }

                    var isModalOverflowing = this._element.scrollHeight > document.documentElement.clientHeight;

                    if (!isModalOverflowing) {
                        this._element.style.overflowY = 'hidden';
                    }

                    this._element.classList.add(CLASS_NAME_STATIC);

                    var modalTransitionDuration = getTransitionDurationFromElement(this._dialog);
                    EventHandler.off(this._element, TRANSITION_END);
                    EventHandler.one(this._element, TRANSITION_END, function() {
                        _this9._element.classList.remove(CLASS_NAME_STATIC);

                        if (!isModalOverflowing) {
                            EventHandler.one(_this9._element, TRANSITION_END, function() {
                                _this9._element.style.overflowY = '';
                            });
                            emulateTransitionEnd(_this9._element, modalTransitionDuration);
                        }
                    });
                    emulateTransitionEnd(this._element, modalTransitionDuration);

                    this._element.focus();
                } else {
                    this.hide();
                }
            } // ----------------------------------------------------------------------
            // the following methods are used to handle overflowing modals
            // ----------------------------------------------------------------------
        ;

        _proto._adjustDialog = function _adjustDialog() {
            var isModalOverflowing = this._element.scrollHeight > document.documentElement.clientHeight;

            if (!this._isBodyOverflowing && isModalOverflowing) {
                this._element.style.paddingLeft = this._scrollbarWidth + "px";
            }

            if (this._isBodyOverflowing && !isModalOverflowing) {
                this._element.style.paddingRight = this._scrollbarWidth + "px";
            }
        };

        _proto._resetAdjustments = function _resetAdjustments() {
            this._element.style.paddingLeft = '';
            this._element.style.paddingRight = '';
        };

        _proto._checkScrollbar = function _checkScrollbar() {
            var rect = document.body.getBoundingClientRect();
            this._isBodyOverflowing = Math.round(rect.left + rect.right) < window.innerWidth;
            this._scrollbarWidth = this._getScrollbarWidth();
        };

        _proto._setScrollbar = function _setScrollbar() {
            var _this10 = this;

            if (this._isBodyOverflowing) {
                // Note: DOMNode.style.paddingRight returns the actual value or '' if not set
                //   while $(DOMNode).css('padding-right') returns the calculated value or 0 if not set
                // Adjust fixed content padding
                SelectorEngine.find(SELECTOR_FIXED_CONTENT).forEach(function(element) {
                    var actualPadding = element.style.paddingRight;
                    var calculatedPadding = window.getComputedStyle(element)['padding-right'];
                    Manipulator.setDataAttribute(element, 'padding-right', actualPadding);
                    element.style.paddingRight = parseFloat(calculatedPadding) + _this10._scrollbarWidth + "px";
                }); // Adjust sticky content margin

                SelectorEngine.find(SELECTOR_STICKY_CONTENT).forEach(function(element) {
                    var actualMargin = element.style.marginRight;
                    var calculatedMargin = window.getComputedStyle(element)['margin-right'];
                    Manipulator.setDataAttribute(element, 'margin-right', actualMargin);
                    element.style.marginRight = parseFloat(calculatedMargin) - _this10._scrollbarWidth + "px";
                }); // Adjust body padding

                var actualPadding = document.body.style.paddingRight;
                var calculatedPadding = window.getComputedStyle(document.body)['padding-right'];
                Manipulator.setDataAttribute(document.body, 'padding-right', actualPadding);
                document.body.style.paddingRight = parseFloat(calculatedPadding) + this._scrollbarWidth + "px";
            }

            document.body.classList.add(CLASS_NAME_OPEN);
        };

        _proto._resetScrollbar = function _resetScrollbar() {
            // Restore fixed content padding
            SelectorEngine.find(SELECTOR_FIXED_CONTENT).forEach(function(element) {
                var padding = Manipulator.getDataAttribute(element, 'padding-right');

                if (typeof padding !== 'undefined') {
                    Manipulator.removeDataAttribute(element, 'padding-right');
                    element.style.paddingRight = padding;
                }
            }); // Restore sticky content and navbar-toggler margin

            SelectorEngine.find("" + SELECTOR_STICKY_CONTENT).forEach(function(element) {
                var margin = Manipulator.getDataAttribute(element, 'margin-right');

                if (typeof margin !== 'undefined') {
                    Manipulator.removeDataAttribute(element, 'margin-right');
                    element.style.marginRight = margin;
                }
            }); // Restore body padding

            var padding = Manipulator.getDataAttribute(document.body, 'padding-right');

            if (typeof padding === 'undefined') {
                document.body.style.paddingRight = '';
            } else {
                Manipulator.removeDataAttribute(document.body, 'padding-right');
                document.body.style.paddingRight = padding;
            }
        };

        _proto._getScrollbarWidth = function _getScrollbarWidth() {
                // thx d.walsh
                var scrollDiv = document.createElement('div');
                scrollDiv.className = CLASS_NAME_SCROLLBAR_MEASURER;
                document.body.appendChild(scrollDiv);
                var scrollbarWidth = scrollDiv.getBoundingClientRect().width - scrollDiv.clientWidth;
                document.body.removeChild(scrollDiv);
                return scrollbarWidth;
            } // Static
        ;

        Modal.jQueryInterface = function jQueryInterface(config, relatedTarget) {
            return this.each(function() {
                var data = Data.getData(this, DATA_KEY$5);

                var _config = _extends({}, Default$3, Manipulator.getDataAttributes(this), typeof config === 'object' && config ? config : {});

                if (!data) {
                    data = new Modal(this, _config);
                }

                if (typeof config === 'string') {
                    if (typeof data[config] === 'undefined') {
                        throw new TypeError("No method named \"" + config + "\"");
                    }

                    data[config](relatedTarget);
                } else if (_config.show) {
                    data.show(relatedTarget);
                }
            });
        };

        Modal.getInstance = function getInstance(element) {
            return Data.getData(element, DATA_KEY$5);
        };

        _createClass(Modal, null, [{
            key: "VERSION",
            get: function get() {
                return VERSION$5;
            }
        }, {
            key: "Default",
            get: function get() {
                return Default$3;
            }
        }]);

        return Modal;
    }();

    EventHandler.on(document, EVENT_CLICK_DATA_API$5, SELECTOR_DATA_TOGGLE$3, (event) => {
        let _this11 = this;

        let target = getElementFromSelector(this);

        if (this.tagName === 'A' || this.tagName === 'AREA') {
            event.preventDefault();
        }

        EventHandler.one(target, EVENT_SHOW$2, (showEvent) => {
            if (showEvent.defaultPrevented) {
                // only register focus restorer if modal will actually get shown
                return;
            }

            EventHandler.one(target, EVENT_HIDDEN$2, () => {
                if (isVisible(_this11)) {
                    _this11.focus();
                }
            });
        });
        let data = Data.getData(target, DATA_KEY$5);

        if (!data) {
            let config = _extends({}, Manipulator.getDataAttributes(target), Manipulator.getDataAttributes(this));

            data = new Modal(target, config);
        }

        data.show(this);
    });

    onDOMContentLoaded(() => {
        let $ = getjQuery();
        /* istanbul ignore if */

        if ($) {
            let JQUERY_NO_CONFLICT = $.fn[NAME$5];
            $.fn[NAME$5] = Modal.jQueryInterface;
            $.fn[NAME$5].Constructor = Modal;

            $.fn[NAME$5].noConflict = () => {
                $.fn[NAME$5] = JQUERY_NO_CONFLICT;
                return Modal.jQueryInterface;
            };
        }
    });

    const index_umd = {
        // Alert: Alert,
        // Button: Button,
        // Carousel: Carousel,
        // Collapse: Collapse,
        // Dropdown: Dropdown,
        Modal: Modal,
        // Popover: Popover,
        // ScrollSpy: ScrollSpy,
        // Tab: Tab,
        // Toast: Toast,
        // Tooltip: Tooltip
    };

    return index_umd;
})));