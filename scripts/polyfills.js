// Полифиллы для кроссбраузерности

// Проверка поддержки localStorage
(function() {
    if (typeof Storage === 'undefined') {
        console.warn('localStorage не поддерживается в этом браузере');
        // Создаем заглушку для localStorage
        window.localStorage = {
            _data: {},
            setItem: function(id, val) {
                this._data[id] = String(val);
            },
            getItem: function(id) {
                return this._data.hasOwnProperty(id) ? this._data[id] : null;
            },
            removeItem: function(id) {
                delete this._data[id];
            },
            clear: function() {
                this._data = {};
            }
        };
    }
})();

// Полифилл для Object.assign (для старых браузеров)
if (typeof Object.assign !== 'function') {
    Object.assign = function(target) {
        'use strict';
        if (target == null) {
            throw new TypeError('Cannot convert undefined or null to object');
        }
        var to = Object(target);
        for (var index = 1; index < arguments.length; index++) {
            var nextSource = arguments[index];
            if (nextSource != null) {
                for (var nextKey in nextSource) {
                    if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                        to[nextKey] = nextSource[nextKey];
                    }
                }
            }
        }
        return to;
    };
}

// Полифилл для Array.includes (для старых браузеров)
if (!Array.prototype.includes) {
    Array.prototype.includes = function(searchElement, fromIndex) {
        'use strict';
        if (this == null) {
            throw new TypeError('Array.prototype.includes called on null or undefined');
        }
        var O = Object(this);
        var len = parseInt(O.length) || 0;
        if (len === 0) {
            return false;
        }
        var n = parseInt(fromIndex) || 0;
        var k;
        if (n >= 0) {
            k = n;
        } else {
            k = len + n;
            if (k < 0) {
                k = 0;
            }
        }
        function sameValueZero(x, y) {
            return x === y || (typeof x === 'number' && typeof y === 'number' && isNaN(x) && isNaN(y));
        }
        for (; k < len; k++) {
            if (sameValueZero(O[k], searchElement)) {
                return true;
            }
        }
        return false;
    };
}

// Полифилл для String.includes (для старых браузеров)
if (!String.prototype.includes) {
    String.prototype.includes = function(search, start) {
        'use strict';
        if (typeof start !== 'number') {
            start = 0;
        }
        if (start + search.length > this.length) {
            return false;
        } else {
            return this.indexOf(search, start) !== -1;
        }
    };
}

// Полифилл для Element.matches (для старых браузеров)
if (!Element.prototype.matches) {
    Element.prototype.matches = 
        Element.prototype.matchesSelector || 
        Element.prototype.mozMatchesSelector ||
        Element.prototype.msMatchesSelector || 
        Element.prototype.oMatchesSelector || 
        Element.prototype.webkitMatchesSelector ||
        function(s) {
            var matches = (this.document || this.ownerDocument).querySelectorAll(s),
                i = matches.length;
            while (--i >= 0 && matches.item(i) !== this) {}
            return i > -1;            
        };
}

// Полифилл для forEach для NodeList (для старых браузеров)
if (window.NodeList && !NodeList.prototype.forEach) {
    NodeList.prototype.forEach = function(callback, thisArg) {
        thisArg = thisArg || window;
        for (var i = 0; i < this.length; i++) {
            callback.call(thisArg, this[i], i, this);
        }
    };
}

// Проверка поддержки CSS Grid и добавление класса для fallback
(function() {
    function supportsCSSGrid() {
        return CSS.supports('display', 'grid');
    }
    
    if (!supportsCSSGrid()) {
        document.documentElement.classList.add('no-grid');
    }
})();

// Полифилл для requestAnimationFrame
(function() {
    var lastTime = 0;
    var vendors = ['webkit', 'moz'];
    for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] || 
                                      window[vendors[x] + 'CancelRequestAnimationFrame'];
    }
    
    if (!window.requestAnimationFrame) {
        window.requestAnimationFrame = function(callback) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() {
                callback(currTime + timeToCall);
            }, timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
    }
    
    if (!window.cancelAnimationFrame) {
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
    }
})();

// Безопасная обработка JSON
if (typeof JSON === 'undefined') {
    console.error('JSON не поддерживается в этом браузере');
}

