/* global window, document */

;
(function(win, doc) {
    'use strict';

    var _listeners = {};
    var _providers = {};

    var _frameByName = function(frameName) {
        // Avoid memory garbage
        
        if (frameName === '_parent') {
            return window.parent;
        } else {
            // Chrome only
            var frame = window.frames[frameName];

            if ("[object Window]" === ("" + frame)) {
                return frame;
            } else {
                return null;
            }
        }
    };

    var _generateNounce = function() {
        var size = 12;
        var text = "";
        var possible = ("ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
                        "abcdefghijklmnopqrstuvwxyz" +
                        "0123456789");

        for (var i = 0; i < size; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }

        return '_okra_' + text;
    };

    var _notifyListeners = function (event) {
        if (!_listeners.hasOwnProperty(event.origin)) {
            console.error('Cannot verify that the origin message is actually expected');            
            return;
        }

        var nounce = event.data.nounce;

        if (!nounce || nounce.indexOf('_okra_') !== 0) {
            console.error('Cannot verify that it is a valid listener');
            return;
        }

        if (!_listeners[event.origin].hasOwnProperty(nounce)) {
            console.error('Cannot verify that the nonce exists');
            return;
        }
                
        var listener = _listeners[event.origin][nounce];
        
        if (event.source !== _frameByName(listener.frameName)) {
            console.error('Cannot verify that the exact frame is the one sending the event');
            return;
        }
        
        listener(event.data);
    };
    
    var _handleRequest = function (event) {               
        if (!event.data || !event.data.name) {
            console.error('Request don`t have valid handler name');
            return;
        }
        
        // Wrap this check in a function
        if (!_providers.hasOwnProperty(event.data.name) 
            || !_providers[event.data.name]) {
            // TODO: Add the parameters to the error log
            console.error('No such provider was found');
            return;
        }
        
        var providerVariants = _providers[event.data.name];
        
        if (!providerVariants.hasOwnProperty(event.data.action) 
            || !providerVariants[event.data.action]) {
            console.error('No such provider variant was found');
            return;
        }
        
        var provider = providerVariants[event.data.action];
        
        if (!provider.isAllowed(event.origin)) {
            console.error('Origin is not allowed for this provider');
            return;   
        }
        
        if ("string" !== typeof event.data.nounce
            && event.data.nounce.indexOf('_okra_') !== 0) {
            console.error('Invalid nonce has been provided');
            return;   
        }
        
        var value = provider.callback();
        event.source.postMessage({
            type: 'response',
            action: 'get',
            value: value,
            nounce: event.data.nounce
        }, event.origin);
    };

    window.addEventListener('message', function (event) {
        console.log(event.data, event);
    
        if (event.data) {
            if (event.data.type === 'request') {
                _handleRequest(event);
            } else if (event.data.type === 'response') {
                _notifyListeners(event);
            }
        }
    }, false);    
    
    var createInlet = function(frameName, origin) {
        return {
            get: function(valueName, cb) {
                // TODO: Check for action??
                var nounce = _generateNounce();

                _listeners[origin] = _listeners[origin] || {};

                _listeners[origin][nounce] = function(data) {
                    cb(data.value);
                    delete _listeners[origin][nounce];
                };

                _listeners[origin][nounce].nounce = nounce;
                _listeners[origin][nounce].frameName = frameName;

                _frameByName(frameName).postMessage({
                    type: 'request',
                    action: 'get',
                    name: valueName,
                    nounce: nounce
                }, origin);
            }
        };
    };

    var createProvider = function (action, name, cb) {
        var _allowedOrigins = {};

        var provider = {
            callback: cb,
            // TODO: Support origin globe
            // TODO: Support `deny` and `destroy` methods
            allow: function (origin) {
                _allowedOrigins[origin] = true;
                return provider; // Allow subsequent `allow()` calls
            },
            isAllowed: function (origin) {
                if (origin && _allowedOrigins.hasOwnProperty(origin)) {
                    return !!_allowedOrigins[origin];
                } else {
                    return false;
                }
            }
        };
        
        _providers[name] = _providers[name] || {};
        _providers[name][action] = provider;
        
        return provider;
    };

    var Okra = {
        inlet: createInlet,
        provide: createProvider
    };

    win.Okra = Okra;
}(window, document));
