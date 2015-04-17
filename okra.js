/* global window, document */

;(function(win, doc) {
    'use strict';
    
    // TODO: Add `on` functionality to listen to re-occurring events
    // TODO: Support `set` functionality to send data
    // TODO: Support `call` functionality to denote calling

    var _listeners = {};
    var _providers = {};

    // TODO: Error handling

    var _frameByName = function(frameName) {
        // Avoid memory garbage
        
        if (frameName === '_parent') {
            return window.parent;
        } else {
            // TODO: Filter frames by name as well
            var frame = document.getElementsByName(frameName)[0];
            
            if (!frame) {
                return null;
            }

            if (frame.contentWindow) {
                return frame.contentWindow;
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
        if (event.data) {
            if (event.data.type === 'request') {
                _handleRequest(event);
            } else if (event.data.type === 'response') {
                _notifyListeners(event);
            }
        }
    }, false);
    
    var _referrerToOrigin = function () {
        if (!document.referrer) {
            return null;
        }
    
        var a = document.createElement('a');
        a.href = document.referrer;
        return a.origin;
    }
    
    // Send `childLoaded` event to the parent
    if (window !== window.parent) {
        // TODO: Check for possible security issues in allowing 
        //       referrer blindly
        // TODO: Convert to a faster event, such as DOMReady
        window.addEventListener('load', function () {
            window.parent.postMessage({
               type: "childLoaded"
            }, _referrerToOrigin());
        }, false);
    }
    
    var createInlet = function(frameName, origin) {
        var _messagesQueue = [];
        
        // TODO: Really? that's a lousy check
        var _isFrameLoaded = window !== window.parent;
        
        // TODO: Find a better name for this
        var _realPostMessage = function (message) {
            // TODO: Rename `_frameByName` to `_windowByFrameName`
            var frame = _frameByName(frameName);
            frame.postMessage(message, origin);
        };
    
        var _postMessage = function (message) {
            if (_isFrameLoaded) {
                _realPostMessage(message);
            } else {
                _messagesQueue.push(message);
            }
        };
        
        // Detect a childLoad event
        var _loadListener = function (event) {
            var frameWin = _frameByName(frameName);
            if (event.origin === origin && event.source === frameWin) {
                if (event.data && 'childLoaded' === event.data.type) {
                    while (_messagesQueue.length) {
                        var message = _messagesQueue.pop();
                        _realPostMessage(message);                    
                    }
                
                    window.removeEventListener(
                        'message', 
                        _loadListener, 
                        false
                    );                
                }                
            }
        };
        
        window.addEventListener('message', _loadListener, false);  
    
    
        var _getValue = function (valueName, cb) {
            // TODO: Check for action??
            var nounce = _generateNounce();

            _listeners[origin] = _listeners[origin] || {};

            _listeners[origin][nounce] = function(data) {
                cb(data.value);
                delete _listeners[origin][nounce];
            };

            _listeners[origin][nounce].nounce = nounce;
            _listeners[origin][nounce].frameName = frameName;
            
            _postMessage({
                type: 'request',
                action: 'get',
                name: valueName,
                nounce: nounce
            });
        };
            
        return {
            get: _getValue
        };
    };

    var createProvider = function (action, name, cb) {
        var _allowedOrigins = {};

        var provider = {
            callback: cb,
            // TODO: Support origin globe
            // TODO: Support `deny` and `destroy` methods
            allow: function (origin) {
                if (origin === document.referrer) {
                    origin = _referrerToOrigin();
                }
            
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
