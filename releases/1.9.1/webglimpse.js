/*!
 * Web Glimpse v1.9.1
 * Released: 2016-11-22 16:56:17 UTC
 * https://glimpse.metsci.com/webglimpse/
 *
 * Copyright (c) 2014, Metron, Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 * 3. Neither the name of the copyright holder nor the names of its contributors
 *    may be used to endorse or promote products derived from this software without
 *    specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
 * ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
var Webglimpse;

(function(Webglimpse) {
    // Alias for more readable access to static constants
    Webglimpse.GL = WebGLRenderingContext;
    function hasval(value) {
        // Double-equals is weird: ( undefined == null ) is true
        return value != null;
    }
    Webglimpse.hasval = hasval;
    function isNumber(value) {
        return typeof value === "number";
    }
    Webglimpse.isNumber = isNumber;
    function isString(value) {
        return typeof value === "string";
    }
    Webglimpse.isString = isString;
    function isEmpty(array) {
        return array.length === 0;
    }
    Webglimpse.isEmpty = isEmpty;
    function notEmpty(array) {
        return array.length > 0;
    }
    Webglimpse.notEmpty = notEmpty;
    function alwaysTrue() {
        return true;
    }
    Webglimpse.alwaysTrue = alwaysTrue;
    function alwaysFalse() {
        return false;
    }
    Webglimpse.alwaysFalse = alwaysFalse;
    function constantFn(value) {
        return function() {
            return value;
        };
    }
    Webglimpse.constantFn = constantFn;
    function log10(x) {
        return Math.log(x) * (1 / Math.LN10);
    }
    Webglimpse.log10 = log10;
    function order(x) {
        return Math.floor(log10(x) + 1e-12);
    }
    Webglimpse.order = order;
    function clamp(xMin, xMax, x) {
        return Math.max(xMin, Math.min(xMax, x));
    }
    Webglimpse.clamp = clamp;
    function copyArray(values) {
        return values.slice(0);
    }
    Webglimpse.copyArray = copyArray;
    function ensureCapacityFloat32(buffer, minNewCapacity) {
        // if minNewCapacity is NaN, null, or undefined, don't try to resize the buffer
        if (!minNewCapacity || buffer.length >= minNewCapacity) {
            return buffer;
        } else {
            var newCapacity = Math.max(minNewCapacity, 2 * buffer.length);
            return new Float32Array(newCapacity);
        }
    }
    Webglimpse.ensureCapacityFloat32 = ensureCapacityFloat32;
    function ensureCapacityUint32(buffer, minNewCapacity) {
        // if minNewCapacity is NaN, null, or undefined, don't try to resize the buffer
        if (!minNewCapacity || buffer.length >= minNewCapacity) {
            return buffer;
        } else {
            var newCapacity = Math.max(minNewCapacity, 2 * buffer.length);
            return new Uint32Array(newCapacity);
        }
    }
    Webglimpse.ensureCapacityUint32 = ensureCapacityUint32;
    function ensureCapacityUint16(buffer, minNewCapacity) {
        // if minNewCapacity is NaN, null, or undefined, don't try to resize the buffer
        if (!minNewCapacity || buffer.length >= minNewCapacity) {
            return buffer;
        } else {
            var newCapacity = Math.max(minNewCapacity, 2 * buffer.length);
            return new Uint16Array(newCapacity);
        }
    }
    Webglimpse.ensureCapacityUint16 = ensureCapacityUint16;
    Webglimpse.getObjectId = function() {
        var keyName = "webglimpse_ObjectId";
        var nextValue = 0;
        return function(obj) {
            var value = obj[keyName];
            if (!hasval(value)) {
                value = (nextValue++).toString();
                obj[keyName] = value;
            }
            return value;
        };
    }();
    function concatLines() {
        var lines = [];
        for (var _i = 0; _i < arguments.length - 0; _i++) {
            lines[_i] = arguments[_i + 0];
        }
        return lines.join("\n");
    }
    Webglimpse.concatLines = concatLines;
    /**
    * Parses a timestamp from the format 'YYYY-MM-DDTHH:mm:ss[.SSS]ZZ' into posix-milliseconds.
    *
    * Format examples:
    *   - '2014-01-01T00:00:00Z'
    *   - '2014-01-01T00:00:00.000+00:00'
    *
    * Use of a colon in numeric timezones is optional. However, it is strongly encouraged, for
    * compatibility with Date in major browsers.
    *
    * Parsing is strict, and will throw an error if the input string does not match the expected
    * format. A notable example is that the seconds field must not have more than three decimal
    * places.
    *
    */
    function parseTime_PMILLIS(time_ISO8601) {
        // Moment's lenient parsing is way too lenient -- but its strict parsing is a little too
        // strict, so we have to try several possible formats.
        //
        // We could pass in multiple formats to try all at once, but Moment's docs warn that that
        // can be slow. Plus, we expect some formats to be more common than others, so we can make
        // the common formats fast at the expense of the less common ones.
        //
        var m = moment(time_ISO8601, "YYYY-MM-DDTHH:mm:ssZZ", true);
        if (m.isValid()) return m.valueOf();
        var m = moment(time_ISO8601, "YYYY-MM-DDTHH:mm:ss.SSSZZ", true);
        if (m.isValid()) return m.valueOf();
        var m = moment(time_ISO8601, "YYYY-MM-DDTHH:mm:ss.SSZZ", true);
        if (m.isValid()) return m.valueOf();
        var m = moment(time_ISO8601, "YYYY-MM-DDTHH:mm:ss.SZZ", true);
        if (m.isValid()) return m.valueOf();
        throw new Error("Failed to parse time-string: '" + time_ISO8601 + "'");
    }
    Webglimpse.parseTime_PMILLIS = parseTime_PMILLIS;
    /**
    * Formats a timestamp from posix-millis into the format 'YYYY-MM-DDThh:mm:ss.SSSZZ' (for
    * example '2014-01-01T00:00:00.000Z').
    *
    * The input value is effectively truncated (not rounded!) to milliseconds. So for example,
    * formatTime_ISO8601(12345.999) will return '1970-01-01T00:00:12.345Z' -- exactly the same
    * as for an input of 12345.
    *
    */
    function formatTime_ISO8601(time_PMILLIS) {
        return moment(time_PMILLIS).toISOString();
    }
    Webglimpse.formatTime_ISO8601 = formatTime_ISO8601;
})(Webglimpse || (Webglimpse = {}));

var Webglimpse;

(function(Webglimpse) {
    var CacheEntry = function() {
        function CacheEntry(value) {
            this.touched = false;
            this.value = value;
        }
        return CacheEntry;
    }();
    var Cache = function() {
        function Cache(helper) {
            this.helper = helper;
            this.map = {};
        }
        Cache.prototype.value = function(key) {
            if (!this.map.hasOwnProperty(key)) {
                this.map[key] = new CacheEntry(this.helper.create(key));
            }
            var en = this.map[key];
            en.touched = true;
            return en.value;
        };
        Cache.prototype.clear = function() {
            for (var k in this.map) {
                if (this.map.hasOwnProperty(k)) {
                    this.helper.dispose(this.map[k].value, k);
                }
            }
            this.map = {};
        };
        Cache.prototype.remove = function(key) {
            if (this.map.hasOwnProperty(key)) {
                this.helper.dispose(this.map[key].value, key);
                delete this.map[key];
            }
        };
        Cache.prototype.removeAll = function(keys) {
            for (var i = 0; i < keys.length; i++) {
                this.remove(keys[i]);
            }
        };
        Cache.prototype.retain = function(key) {
            var newMap = {};
            if (this.map.hasOwnProperty(key)) {
                newMap[key] = this.map[key];
                delete this.map[key];
            }
            for (var k in this.map) {
                if (this.map.hasOwnProperty(k)) {
                    this.helper.dispose(this.map[k].value, k);
                }
            }
            this.map = newMap;
        };
        Cache.prototype.retainAll = function(keys) {
            var newMap = {};
            for (var i = 0; i < keys.length; i++) {
                var k = keys[i];
                if (this.map.hasOwnProperty(k)) {
                    newMap[k] = this.map[k];
                    delete this.map[k];
                }
            }
            for (var k2 in this.map) {
                if (this.map.hasOwnProperty(k2)) {
                    this.helper.dispose(this.map[k2].value, k2);
                }
            }
            this.map = newMap;
        };
        Cache.prototype.resetTouches = function() {
            for (var k in this.map) {
                if (this.map.hasOwnProperty(k)) {
                    this.map[k].touched = false;
                }
            }
        };
        Cache.prototype.retainTouched = function() {
            var newMap = {};
            for (var k in this.map) {
                if (this.map.hasOwnProperty(k)) {
                    var en = this.map[k];
                    if (en.touched) {
                        newMap[k] = this.map[k];
                    } else {
                        this.helper.dispose(en.value, k);
                    }
                }
            }
            this.map = newMap;
        };
        return Cache;
    }();
    Webglimpse.Cache = Cache;
})(Webglimpse || (Webglimpse = {}));

var Webglimpse;

(function(Webglimpse) {
    var MultiKeyCacheEntry = function() {
        function MultiKeyCacheEntry(keyParts, value) {
            this.touched = false;
            this.keyParts = keyParts;
            this.value = value;
        }
        return MultiKeyCacheEntry;
    }();
    var MultiKeyCache = function() {
        function MultiKeyCache(helper) {
            this.helper = helper;
            this.map = {};
        }
        MultiKeyCache.prototype.combineKeyParts = function(keyParts) {
            var esc = "\\";
            var sep = ";";
            var escapedEsc = esc + esc;
            var escapedSep = esc + sep;
            var escapedParts = [];
            for (var n = 0; n < keyParts.length; n++) {
                escapedParts[n] = keyParts[n].replace(esc, escapedEsc).replace(sep, escapedSep);
            }
            return escapedParts.join(sep);
        };
        MultiKeyCache.prototype.value = function() {
            var keyParts = [];
            for (var _i = 0; _i < arguments.length - 0; _i++) {
                keyParts[_i] = arguments[_i + 0];
            }
            var key = this.combineKeyParts(keyParts);
            if (!this.map.hasOwnProperty(key)) {
                this.map[key] = new MultiKeyCacheEntry(keyParts, this.helper.create(keyParts));
            }
            var en = this.map[key];
            en.touched = true;
            return en.value;
        };
        MultiKeyCache.prototype.remove = function() {
            var keyParts = [];
            for (var _i = 0; _i < arguments.length - 0; _i++) {
                keyParts[_i] = arguments[_i + 0];
            }
            var key = this.combineKeyParts(keyParts);
            if (this.map.hasOwnProperty(key)) {
                var en = this.map[key];
                this.helper.dispose(en.value, en.keyParts);
                delete this.map[key];
            }
        };
        MultiKeyCache.prototype.retain = function() {
            var keyParts = [];
            for (var _i = 0; _i < arguments.length - 0; _i++) {
                keyParts[_i] = arguments[_i + 0];
            }
            var newMap = {};
            var retainKey = this.combineKeyParts(keyParts);
            if (this.map.hasOwnProperty(retainKey)) {
                newMap[retainKey] = this.map[retainKey];
                delete this.map[retainKey];
            }
            for (var key in this.map) {
                if (this.map.hasOwnProperty(key)) {
                    var en = this.map[key];
                    this.helper.dispose(en.value, en.keyParts);
                }
            }
            this.map = newMap;
        };
        MultiKeyCache.prototype.resetTouches = function() {
            for (var key in this.map) {
                if (this.map.hasOwnProperty(key)) {
                    this.map[key].touched = false;
                }
            }
        };
        MultiKeyCache.prototype.retainTouched = function() {
            var newMap = {};
            for (var key in this.map) {
                if (this.map.hasOwnProperty(key)) {
                    var en = this.map[key];
                    if (en.touched) {
                        newMap[key] = this.map[key];
                    } else {
                        this.helper.dispose(en.value, en.keyParts);
                    }
                }
            }
            this.map = newMap;
        };
        MultiKeyCache.prototype.clear = function() {
            for (var key in this.map) {
                if (this.map.hasOwnProperty(key)) {
                    var en = this.map[key];
                    this.helper.dispose(en.value, en.keyParts);
                }
            }
            this.map = {};
        };
        return MultiKeyCache;
    }();
    Webglimpse.MultiKeyCache = MultiKeyCache;
    var TwoKeyCache = function() {
        function TwoKeyCache(helper) {
            this.cache = new MultiKeyCache({
                create: function(keyParts) {
                    return helper.create(keyParts[0], keyParts[1]);
                },
                dispose: function(value, keyParts) {
                    helper.dispose(value, keyParts[0], keyParts[1]);
                }
            });
        }
        TwoKeyCache.prototype.value = function(keyPart1, keyPart2) {
            return this.cache.value(keyPart1, keyPart2);
        };
        TwoKeyCache.prototype.remove = function(keyPart1, keyPart2) {
            this.cache.remove(keyPart1, keyPart2);
        };
        TwoKeyCache.prototype.retain = function(keyPart1, keyPart2) {
            this.cache.retain(keyPart1, keyPart2);
        };
        TwoKeyCache.prototype.resetTouches = function() {
            this.cache.resetTouches();
        };
        TwoKeyCache.prototype.retainTouched = function() {
            this.cache.retainTouched();
        };
        TwoKeyCache.prototype.clear = function() {
            this.cache.clear();
        };
        return TwoKeyCache;
    }();
    Webglimpse.TwoKeyCache = TwoKeyCache;
    var ThreeKeyCache = function() {
        function ThreeKeyCache(helper) {
            this.cache = new MultiKeyCache({
                create: function(keyParts) {
                    return helper.create(keyParts[0], keyParts[1], keyParts[2]);
                },
                dispose: function(value, keyParts) {
                    helper.dispose(value, keyParts[0], keyParts[1], keyParts[2]);
                }
            });
        }
        ThreeKeyCache.prototype.value = function(keyPart1, keyPart2, keyPart3) {
            return this.cache.value(keyPart1, keyPart2, keyPart3);
        };
        ThreeKeyCache.prototype.remove = function(keyPart1, keyPart2, keyPart3) {
            this.cache.remove(keyPart1, keyPart2, keyPart3);
        };
        ThreeKeyCache.prototype.retain = function(keyPart1, keyPart2, keyPart3) {
            this.cache.retain(keyPart1, keyPart2, keyPart3);
        };
        ThreeKeyCache.prototype.resetTouches = function() {
            this.cache.resetTouches();
        };
        ThreeKeyCache.prototype.retainTouched = function() {
            this.cache.retainTouched();
        };
        ThreeKeyCache.prototype.clear = function() {
            this.cache.clear();
        };
        return ThreeKeyCache;
    }();
    Webglimpse.ThreeKeyCache = ThreeKeyCache;
})(Webglimpse || (Webglimpse = {}));

var Webglimpse;

(function(Webglimpse) {
    var BoundsUnmodifiable = function() {
        function BoundsUnmodifiable(bounds) {
            this.bounds = bounds;
        }
        Object.defineProperty(BoundsUnmodifiable.prototype, "iStart", {
            get: function() {
                return this.bounds.iStart;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(BoundsUnmodifiable.prototype, "jStart", {
            get: function() {
                return this.bounds.jStart;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(BoundsUnmodifiable.prototype, "iEnd", {
            get: function() {
                return this.bounds.iEnd;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(BoundsUnmodifiable.prototype, "jEnd", {
            get: function() {
                return this.bounds.jEnd;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(BoundsUnmodifiable.prototype, "i", {
            get: function() {
                return this.bounds.i;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(BoundsUnmodifiable.prototype, "j", {
            get: function() {
                return this.bounds.j;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(BoundsUnmodifiable.prototype, "w", {
            get: function() {
                return this.bounds.w;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(BoundsUnmodifiable.prototype, "h", {
            get: function() {
                return this.bounds.h;
            },
            enumerable: true,
            configurable: true
        });
        BoundsUnmodifiable.prototype.xFrac = function(i) {
            return this.bounds.xFrac(i);
        };
        BoundsUnmodifiable.prototype.yFrac = function(j) {
            return this.bounds.yFrac(j);
        };
        BoundsUnmodifiable.prototype.contains = function(i, j) {
            return this.bounds.contains(i, j);
        };
        return BoundsUnmodifiable;
    }();
    Webglimpse.BoundsUnmodifiable = BoundsUnmodifiable;
    var Bounds = function() {
        function Bounds() {
            this._iStart = 0;
            this._jStart = 0;
            this._iEnd = 0;
            this._jEnd = 0;
            this._unmod = new BoundsUnmodifiable(this);
        }
        Object.defineProperty(Bounds.prototype, "iStart", {
            get: function() {
                return this._iStart;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Bounds.prototype, "jStart", {
            get: function() {
                return this._jStart;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Bounds.prototype, "iEnd", {
            get: function() {
                return this._iEnd;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Bounds.prototype, "jEnd", {
            get: function() {
                return this._jEnd;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Bounds.prototype, "i", {
            get: function() {
                return this._iStart;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Bounds.prototype, "j", {
            get: function() {
                return this._jStart;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Bounds.prototype, "w", {
            get: function() {
                return this._iEnd - this._iStart;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Bounds.prototype, "h", {
            get: function() {
                return this._jEnd - this._jStart;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Bounds.prototype, "unmod", {
            get: function() {
                return this._unmod;
            },
            enumerable: true,
            configurable: true
        });
        Bounds.prototype.xFrac = function(i) {
            return (i - this._iStart) / (this._iEnd - this._iStart);
        };
        Bounds.prototype.yFrac = function(j) {
            return (j - this._jStart) / (this._jEnd - this._jStart);
        };
        Bounds.prototype.contains = function(i, j) {
            return this._iStart <= i && i < this._iEnd && this._jStart <= j && j < this._jEnd;
        };
        Bounds.prototype.setEdges = function(iStart, iEnd, jStart, jEnd) {
            this._iStart = iStart;
            this._jStart = jStart;
            this._iEnd = iEnd;
            this._jEnd = jEnd;
        };
        Bounds.prototype.setRect = function(i, j, w, h) {
            this.setEdges(i, i + w, j, j + h);
        };
        Bounds.prototype.setBounds = function(bounds) {
            this.setEdges(bounds.iStart, bounds.iEnd, bounds.jStart, bounds.jEnd);
        };
        Bounds.prototype.cropToEdges = function(iCropStart, iCropEnd, jCropStart, jCropEnd) {
            this._iStart = Webglimpse.clamp(iCropStart, iCropEnd, this._iStart);
            this._jStart = Webglimpse.clamp(jCropStart, jCropEnd, this._jStart);
            this._iEnd = Webglimpse.clamp(iCropStart, iCropEnd, this._iEnd);
            this._jEnd = Webglimpse.clamp(jCropStart, jCropEnd, this._jEnd);
        };
        Bounds.prototype.cropToRect = function(iCrop, jCrop, wCrop, hCrop) {
            this.cropToEdges(iCrop, iCrop + wCrop, jCrop, jCrop + hCrop);
        };
        Bounds.prototype.cropToBounds = function(cropBounds) {
            this.cropToEdges(cropBounds.iStart, cropBounds.iEnd, cropBounds.jStart, cropBounds.jEnd);
        };
        return Bounds;
    }();
    Webglimpse.Bounds = Bounds;
    function newBoundsFromRect(i, j, w, h) {
        var b = new Bounds();
        b.setRect(i, j, w, h);
        return b;
    }
    Webglimpse.newBoundsFromRect = newBoundsFromRect;
    function newBoundsFromEdges(iStart, iEnd, jStart, jEnd) {
        var b = new Bounds();
        b.setEdges(iStart, iEnd, jStart, jEnd);
        return b;
    }
    Webglimpse.newBoundsFromEdges = newBoundsFromEdges;
})(Webglimpse || (Webglimpse = {}));

var Webglimpse;

(function(Webglimpse) {
    var Color = function() {
        function Color(r, g, b, a) {
            if (typeof a === "undefined") {
                a = 1;
            }
            this._r = r;
            this._g = g;
            this._b = b;
            this._a = a;
        }
        Object.defineProperty(Color.prototype, "r", {
            get: function() {
                return this._r;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Color.prototype, "g", {
            get: function() {
                return this._g;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Color.prototype, "b", {
            get: function() {
                return this._b;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Color.prototype, "a", {
            get: function() {
                return this._a;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Color.prototype, "cssString", {
            get: function() {
                return "rgba(" + Math.round(255 * this._r) + "," + Math.round(255 * this._g) + "," + Math.round(255 * this._b) + "," + this._a + ")";
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Color.prototype, "rgbaString", {
            get: function() {
                return "" + Math.round(255 * this._r) + "," + Math.round(255 * this._g) + "," + Math.round(255 * this._b) + "," + Math.round(255 * this._a);
            },
            enumerable: true,
            configurable: true
        });
        Color.prototype.withAlphaTimes = function(aFactor) {
            return new Color(this._r, this._g, this._b, aFactor * this._a);
        };
        return Color;
    }();
    Webglimpse.Color = Color;
    function darker(color, factor) {
        return new Color(color.r * factor, color.g * factor, color.b * factor, color.a);
    }
    Webglimpse.darker = darker;
    function rgba(r, g, b, a) {
        return new Color(r, g, b, a);
    }
    Webglimpse.rgba = rgba;
    function rgb(r, g, b) {
        return new Color(r, g, b, 1);
    }
    Webglimpse.rgb = rgb;
    function sameColor(c1, c2) {
        if (c1 === c2) return true;
        if (!Webglimpse.hasval(c1) || !Webglimpse.hasval(c2)) return false;
        return c1.r === c2.r && c1.g === c2.g && c1.b === c2.b && c1.a === c2.a;
    }
    Webglimpse.sameColor = sameColor;
    function parseRgba(rgbaString) {
        var tokens = rgbaString.split(",", 4);
        return new Color(parseInt(tokens[0]) / 255, parseInt(tokens[1]) / 255, parseInt(tokens[2]) / 255, parseInt(tokens[3]) / 255);
    }
    Webglimpse.parseRgba = parseRgba;
    /**
    * Creates a Color object based on a CSS color string. Supports the following notations:
    *  - hex
    *  - rgb/rgba
    *  - hsl/hsla
    *  - named colors
    *
    * Behavior is undefined for strings that are not in one of the listed notations.
    *
    * Note that different browsers may use different color values for the named colors.
    *
    */
    Webglimpse.parseCssColor = function() {
        var canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        var g = canvas.getContext("2d");
        return function(cssColorString) {
            g.clearRect(0, 0, 1, 1);
            g.fillStyle = cssColorString;
            g.fillRect(0, 0, 1, 1);
            var rgbaData = g.getImageData(0, 0, 1, 1).data;
            var R = rgbaData[0] / 255;
            var G = rgbaData[1] / 255;
            var B = rgbaData[2] / 255;
            var A = rgbaData[3] / 255;
            return rgba(R, G, B, A);
        };
    }();
    function gray(brightness) {
        return new Color(brightness, brightness, brightness, 1);
    }
    Webglimpse.gray = gray;
    // XXX: Make final
    Webglimpse.black = rgb(0, 0, 0);
    Webglimpse.white = rgb(1, 1, 1);
    Webglimpse.red = rgb(1, 0, 0);
    Webglimpse.green = rgb(0, 1, 0);
    Webglimpse.blue = rgb(0, 0, 1);
    Webglimpse.cyan = rgb(0, 1, 1);
    Webglimpse.magenta = rgb(1, 0, 1);
    Webglimpse.yellow = rgb(1, 1, 0);
    Webglimpse.periwinkle = rgb(.561, .561, .961);
})(Webglimpse || (Webglimpse = {}));

var Webglimpse;

(function(Webglimpse) {
    // see: http://www.cs.rit.edu/usr/local/pub/wrc/graphics/doc/opengl/books/blue/glOrtho.html
    // see: http://www.songho.ca/opengl/gl_projectionmatrix.html#ortho
    function glOrtho(left, right, bottom, top, near, far) {
        var tx = (right + left) / (right - left);
        var ty = (top + bottom) / (top - bottom);
        var tz = (far + near) / (far - near);
        // GL ES (and therefore WebGL) requires matrices to be column-major
        return new Float32Array([ 2 / (right - left), 0, 0, 0, 0, 2 / (top - bottom), 0, 0, 0, 0, -2 / (far - near), 0, -tx, -ty, -tz, 1 ]);
    }
    Webglimpse.glOrtho = glOrtho;
    function glOrthoViewport(viewport) {
        return glOrtho(-.5, viewport.w - .5, -.5, viewport.h - .5, -1, 1);
    }
    Webglimpse.glOrthoViewport = glOrthoViewport;
    function glOrthoAxis(axis) {
        return glOrtho(axis.xAxis.vMin, axis.xAxis.vMax, axis.yAxis.vMin, axis.yAxis.vMax, -1, 1);
    }
    Webglimpse.glOrthoAxis = glOrthoAxis;
})(Webglimpse || (Webglimpse = {}));

var Webglimpse;

(function(Webglimpse) {
    function requireString(s) {
        if (Webglimpse.isString(s)) {
            return s;
        } else {
            throw new Error("Expected a string, but value is " + s);
        }
    }
    var OrderedSet = function() {
        function OrderedSet(values, idFn, useNotifications) {
            if (typeof values === "undefined") {
                values = [];
            }
            if (typeof idFn === "undefined") {
                idFn = Webglimpse.getObjectId;
            }
            if (typeof useNotifications === "undefined") {
                useNotifications = true;
            }
            this._idOf = idFn;
            this._valuesArray = Webglimpse.copyArray(values);
            this._ids = [];
            this._indexes = {};
            this._valuesMap = {};
            for (var n = 0; n < this._valuesArray.length; n++) {
                var value = this._valuesArray[n];
                var id = requireString(this._idOf(value));
                this._ids[n] = id;
                this._indexes[id] = n;
                this._valuesMap[id] = value;
            }
            if (useNotifications) {
                this._valueAdded = new Webglimpse.Notification2();
                this._valueMoved = new Webglimpse.Notification3();
                this._valueRemoved = new Webglimpse.Notification2();
            }
        }
        Object.defineProperty(OrderedSet.prototype, "valueAdded", {
            get: function() {
                return this._valueAdded;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(OrderedSet.prototype, "valueMoved", {
            get: function() {
                return this._valueMoved;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(OrderedSet.prototype, "valueRemoved", {
            get: function() {
                return this._valueRemoved;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(OrderedSet.prototype, "length", {
            get: function() {
                return this._valuesArray.length;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(OrderedSet.prototype, "isEmpty", {
            get: function() {
                return this._valuesArray.length === 0;
            },
            enumerable: true,
            configurable: true
        });
        OrderedSet.prototype.toArray = function() {
            return Webglimpse.copyArray(this._valuesArray);
        };
        /**
        * The callback should not modify its array arg; if it does, the subsequent behavior
        * of this OrderedSet is undefined.
        */
        OrderedSet.prototype.every = function(callbackFn, thisArg) {
            return this._valuesArray.every(callbackFn, thisArg);
        };
        /**
        * The callback should not modify its array arg; if it does, the subsequent behavior
        * of this OrderedSet is undefined.
        */
        OrderedSet.prototype.some = function(callbackFn, thisArg) {
            return this._valuesArray.some(callbackFn, thisArg);
        };
        /**
        * The callback should not modify its array arg; if it does, the subsequent behavior
        * of this OrderedSet is undefined.
        */
        OrderedSet.prototype.forEach = function(callbackFn, thisArg) {
            this._valuesArray.forEach(callbackFn, thisArg);
        };
        /**
        * The callback should not modify its array arg; if it does, the subsequent behavior
        * of this OrderedSet is undefined.
        */
        OrderedSet.prototype.map = function(callbackFn, thisArg) {
            return this._valuesArray.map(callbackFn, thisArg);
        };
        /**
        * The callback should not modify its array arg; if it does, the subsequent behavior
        * of this OrderedSet is undefined.
        */
        OrderedSet.prototype.filter = function(callbackFn, thisArg) {
            return this._valuesArray.filter(callbackFn, thisArg);
        };
        /**
        * The callback should not modify its array arg; if it does, the subsequent behavior
        * of this OrderedSet is undefined.
        */
        OrderedSet.prototype.reduce = function(callbackFn, initialValue) {
            return this._valuesArray.reduce(callbackFn, initialValue);
        };
        /**
        * The callback should not modify its array arg; if it does, the subsequent behavior
        * of this OrderedSet is undefined.
        */
        OrderedSet.prototype.reduceRight = function(callbackFn, initialValue) {
            return this._valuesArray.reduceRight(callbackFn, initialValue);
        };
        OrderedSet.prototype.idAt = function(index) {
            return this._ids[index];
        };
        OrderedSet.prototype.valueAt = function(index) {
            return this._valuesArray[index];
        };
        OrderedSet.prototype.indexFor = function(id) {
            return Webglimpse.isString(id) ? this._indexes[id] : undefined;
        };
        OrderedSet.prototype.valueFor = function(id) {
            return Webglimpse.isString(id) ? this._valuesMap[id] : undefined;
        };
        OrderedSet.prototype.idOf = function(value) {
            return requireString(this._idOf(value));
        };
        OrderedSet.prototype.indexOf = function(value) {
            return this._indexes[requireString(this._idOf(value))];
        };
        OrderedSet.prototype.hasValue = function(value) {
            return this.hasId(requireString(this._idOf(value)));
        };
        OrderedSet.prototype.hasValues = function(values) {
            for (var n = 0; n < values.length; n++) {
                if (!this.hasValue(values[n])) {
                    return false;
                }
            }
            return true;
        };
        OrderedSet.prototype.hasId = function(id) {
            return Webglimpse.isString(id) && Webglimpse.hasval(this._valuesMap[id]);
        };
        OrderedSet.prototype.hasIds = function(ids) {
            for (var n = 0; n < ids.length; n++) {
                if (!this.hasId(ids[n])) {
                    return false;
                }
            }
            return true;
        };
        OrderedSet.prototype.add = function(value, index, moveIfExists) {
            var index = Webglimpse.hasval(index) ? index : this._valuesArray.length;
            if (!Webglimpse.hasval(moveIfExists)) moveIfExists = false;
            this._add(value, index, moveIfExists);
        };
        OrderedSet.prototype.addAll = function(values, index, moveIfExists) {
            var index = Webglimpse.hasval(index) ? index : this._valuesArray.length;
            if (!Webglimpse.hasval(moveIfExists)) moveIfExists = false;
            for (var n = 0; n < values.length; n++) {
                var actualIndex = this._add(values[n], index, moveIfExists);
                index = actualIndex + 1;
            }
        };
        OrderedSet.prototype._add = function(value, newIndex, moveIfExists) {
            var id = requireString(this._idOf(value));
            var oldIndex = this._indexes[id];
            if (!Webglimpse.hasval(oldIndex)) {
                this._ids.splice(newIndex, 0, id);
                this._valuesArray.splice(newIndex, 0, value);
                this._valuesMap[id] = value;
                for (var n = newIndex; n < this._ids.length; n++) {
                    this._indexes[this._ids[n]] = n;
                }
                if (this._valueAdded) {
                    this._valueAdded.fire(value, newIndex);
                }
            } else if (newIndex !== oldIndex && moveIfExists) {
                this._ids.splice(oldIndex, 1);
                this._valuesArray.splice(oldIndex, 1);
                if (newIndex > oldIndex) {
                    newIndex--;
                    this._ids.splice(newIndex, 0, id);
                    this._valuesArray.splice(newIndex, 0, value);
                    for (var n = oldIndex; n <= newIndex; n++) {
                        this._indexes[this._ids[n]] = n;
                    }
                } else {
                    this._ids.splice(newIndex, 0, id);
                    this._valuesArray.splice(newIndex, 0, value);
                    for (var n = newIndex; n <= oldIndex; n++) {
                        this._indexes[this._ids[n]] = n;
                    }
                }
                if (this._valueMoved) {
                    this._valueMoved.fire(value, oldIndex, newIndex);
                }
            } else {
                newIndex = oldIndex;
            }
            // Return the actual insertion index -- may differ from the originally
            // requested index if an existing value had to be moved
            return newIndex;
        };
        OrderedSet.prototype.removeValue = function(value) {
            this.removeId(requireString(this._idOf(value)));
        };
        OrderedSet.prototype.removeId = function(id) {
            if (Webglimpse.isString(id)) {
                var index = this._indexes[id];
                if (Webglimpse.hasval(index)) {
                    this._remove(id, index);
                }
            }
        };
        OrderedSet.prototype.removeIndex = function(index) {
            var id = this._ids[index];
            if (Webglimpse.isString(id)) {
                this._remove(id, index);
            }
        };
        OrderedSet.prototype.removeAll = function() {
            for (var n = this._valuesArray.length - 1; n >= 0; n--) {
                var id = this._ids[n];
                this._remove(id, n);
            }
        };
        OrderedSet.prototype.retainValues = function(values) {
            var idsToRetain = {};
            for (var n = 0; n < values.length; n++) {
                var id = this._idOf(values[n]);
                if (Webglimpse.isString(id)) {
                    idsToRetain[id] = true;
                }
            }
            this._retain(idsToRetain);
        };
        OrderedSet.prototype.retainIds = function(ids) {
            var idsToRetain = {};
            for (var n = 0; n < ids.length; n++) {
                var id = ids[n];
                if (Webglimpse.isString(id)) {
                    idsToRetain[id] = true;
                }
            }
            this._retain(idsToRetain);
        };
        OrderedSet.prototype.retainIndices = function(indices) {
            var idsToRetain = {};
            for (var n = 0; n < indices.length; n++) {
                var id = this._ids[indices[n]];
                idsToRetain[id] = true;
            }
            this._retain(idsToRetain);
        };
        OrderedSet.prototype._retain = function(ids) {
            for (var n = this._valuesArray.length - 1; n >= 0; n--) {
                var id = this._ids[n];
                if (!ids.hasOwnProperty(id)) {
                    this._remove(id, n);
                }
            }
        };
        OrderedSet.prototype._remove = function(id, index) {
            var value = this._valuesArray[index];
            this._ids.splice(index, 1);
            this._valuesArray.splice(index, 1);
            delete this._indexes[id];
            delete this._valuesMap[id];
            for (var n = index; n < this._ids.length; n++) {
                this._indexes[this._ids[n]] = n;
            }
            if (this._valueRemoved) {
                this._valueRemoved.fire(value, index);
            }
        };
        return OrderedSet;
    }();
    Webglimpse.OrderedSet = OrderedSet;
    var OrderedStringSet = function() {
        function OrderedStringSet(values, useNotifications) {
            if (typeof values === "undefined") {
                values = [];
            }
            if (typeof useNotifications === "undefined") {
                useNotifications = true;
            }
            this._valuesArray = [];
            this._indexes = {};
            for (var n = 0; n < values.length; n++) {
                var value = requireString(values[n]);
                this._valuesArray[n] = value;
                this._indexes[value] = n;
            }
            if (useNotifications) {
                this._valueAdded = new Webglimpse.Notification2();
                this._valueMoved = new Webglimpse.Notification3();
                this._valueRemoved = new Webglimpse.Notification2();
            }
        }
        Object.defineProperty(OrderedStringSet.prototype, "valueAdded", {
            get: function() {
                return this._valueAdded;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(OrderedStringSet.prototype, "valueMoved", {
            get: function() {
                return this._valueMoved;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(OrderedStringSet.prototype, "valueRemoved", {
            get: function() {
                return this._valueRemoved;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(OrderedStringSet.prototype, "length", {
            get: function() {
                return this._valuesArray.length;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(OrderedStringSet.prototype, "isEmpty", {
            get: function() {
                return this._valuesArray.length === 0;
            },
            enumerable: true,
            configurable: true
        });
        OrderedStringSet.prototype.toArray = function() {
            return Webglimpse.copyArray(this._valuesArray);
        };
        /**
        * The callback should not modify its array arg; if it does, the subsequent behavior
        * of this OrderedStringSet is undefined.
        */
        OrderedStringSet.prototype.every = function(callbackFn, thisArg) {
            return this._valuesArray.every(callbackFn, thisArg);
        };
        /**
        * The callback should not modify its array arg; if it does, the subsequent behavior
        * of this OrderedStringSet is undefined.
        */
        OrderedStringSet.prototype.some = function(callbackFn, thisArg) {
            return this._valuesArray.some(callbackFn, thisArg);
        };
        /**
        * The callback should not modify its array arg; if it does, the subsequent behavior
        * of this OrderedStringSet is undefined.
        */
        OrderedStringSet.prototype.forEach = function(callbackFn, thisArg) {
            this._valuesArray.forEach(callbackFn, thisArg);
        };
        /**
        * The callback should not modify its array arg; if it does, the subsequent behavior
        * of this OrderedStringSet is undefined.
        */
        OrderedStringSet.prototype.map = function(callbackFn, thisArg) {
            return this._valuesArray.map(callbackFn, thisArg);
        };
        /**
        * The callback should not modify its array arg; if it does, the subsequent behavior
        * of this OrderedStringSet is undefined.
        */
        OrderedStringSet.prototype.filter = function(callbackFn, thisArg) {
            return this._valuesArray.filter(callbackFn, thisArg);
        };
        /**
        * The callback should not modify its array arg; if it does, the subsequent behavior
        * of this OrderedStringSet is undefined.
        */
        OrderedStringSet.prototype.reduce = function(callbackFn, initialValue) {
            return this._valuesArray.reduce(callbackFn, initialValue);
        };
        /**
        * The callback should not modify its array arg; if it does, the subsequent behavior
        * of this OrderedStringSet is undefined.
        */
        OrderedStringSet.prototype.reduceRight = function(callbackFn, initialValue) {
            return this._valuesArray.reduceRight(callbackFn, initialValue);
        };
        OrderedStringSet.prototype.valueAt = function(index) {
            return this._valuesArray[index];
        };
        OrderedStringSet.prototype.indexOf = function(value) {
            return Webglimpse.isString(value) ? this._indexes[value] : undefined;
        };
        OrderedStringSet.prototype.hasValue = function(value) {
            return Webglimpse.isString(value) && Webglimpse.hasval(this._indexes[value]);
        };
        OrderedStringSet.prototype.hasValues = function(values) {
            for (var n = 0; n < values.length; n++) {
                if (!this.hasValue(values[n])) {
                    return false;
                }
            }
            return true;
        };
        OrderedStringSet.prototype.add = function(value, index, moveIfExists) {
            var index = Webglimpse.hasval(index) ? index : this._valuesArray.length;
            if (!Webglimpse.hasval(moveIfExists)) moveIfExists = false;
            this._add(value, index, moveIfExists);
        };
        OrderedStringSet.prototype.addAll = function(values, index, moveIfExists) {
            var index = Webglimpse.hasval(index) ? index : this._valuesArray.length;
            if (!Webglimpse.hasval(moveIfExists)) moveIfExists = false;
            for (var n = 0; n < values.length; n++) {
                var actualIndex = this._add(values[n], index, moveIfExists);
                index = actualIndex + 1;
            }
        };
        OrderedStringSet.prototype._add = function(value, newIndex, moveIfExists) {
            requireString(value);
            var oldIndex = this._indexes[value];
            if (!Webglimpse.hasval(oldIndex)) {
                this._valuesArray.splice(newIndex, 0, value);
                for (var n = newIndex; n < this._valuesArray.length; n++) {
                    this._indexes[this._valuesArray[n]] = n;
                }
                if (this._valueAdded) {
                    this._valueAdded.fire(value, newIndex);
                }
            } else if (newIndex !== oldIndex && moveIfExists) {
                this._valuesArray.splice(oldIndex, 1);
                if (newIndex > oldIndex) {
                    newIndex--;
                    this._valuesArray.splice(newIndex, 0, value);
                    for (var n = oldIndex; n <= newIndex; n++) {
                        this._indexes[this._valuesArray[n]] = n;
                    }
                } else {
                    this._valuesArray.splice(newIndex, 0, value);
                    for (var n = newIndex; n <= oldIndex; n++) {
                        this._indexes[this._valuesArray[n]] = n;
                    }
                }
                if (this._valueMoved) {
                    this._valueMoved.fire(value, oldIndex, newIndex);
                }
            } else {
                newIndex = oldIndex;
            }
            // Return the actual insertion index -- may differ from the originally
            // requested index if an existing value had to be moved
            return newIndex;
        };
        OrderedStringSet.prototype.removeValue = function(value) {
            if (Webglimpse.isString(value)) {
                var index = this._indexes[value];
                if (Webglimpse.hasval(index)) {
                    this._remove(value, index);
                }
            }
        };
        OrderedStringSet.prototype.removeIndex = function(index) {
            var value = this._valuesArray[index];
            if (Webglimpse.isString(value)) {
                this._remove(value, index);
            }
        };
        OrderedStringSet.prototype.removeAll = function() {
            for (var n = this._valuesArray.length - 1; n >= 0; n--) {
                var value = this._valuesArray[n];
                this._remove(value, n);
            }
        };
        OrderedStringSet.prototype.retainValues = function(values) {
            var valuesToRetain = {};
            for (var n = 0; n < values.length; n++) {
                var value = values[n];
                if (Webglimpse.isString(value)) {
                    valuesToRetain[value] = true;
                }
            }
            this._retain(valuesToRetain);
        };
        OrderedStringSet.prototype.retainIndices = function(indices) {
            var valuesToRetain = {};
            for (var n = 0; n < indices.length; n++) {
                var value = this._valuesArray[indices[n]];
                valuesToRetain[value] = true;
            }
            this._retain(valuesToRetain);
        };
        OrderedStringSet.prototype._retain = function(values) {
            for (var n = this._valuesArray.length - 1; n >= 0; n--) {
                var value = this._valuesArray[n];
                if (!values.hasOwnProperty(value)) {
                    this._remove(value, n);
                }
            }
        };
        OrderedStringSet.prototype._remove = function(value, index) {
            this._valuesArray.splice(index, 1);
            delete this._indexes[value];
            for (var n = index; n < this._valuesArray.length; n++) {
                this._indexes[this._valuesArray[n]] = n;
            }
            if (this._valueRemoved) {
                this._valueRemoved.fire(value, index);
            }
        };
        return OrderedStringSet;
    }();
    Webglimpse.OrderedStringSet = OrderedStringSet;
})(Webglimpse || (Webglimpse = {}));

var Webglimpse;

(function(Webglimpse) {
    var Notification = function() {
        function Notification() {
            this._listeners = new Webglimpse.OrderedSet([], Webglimpse.getObjectId, false);
            this._deferring = false;
            this._deferred = [];
        }
        Notification.prototype.on = function(listener) {
            if (this._deferring) {
                var self = this;
                this._deferred.push(function() {
                    self._listeners.add(listener);
                });
            } else {
                this._listeners.add(listener);
            }
        };
        Notification.prototype.off = function(listener) {
            if (this._deferring) {
                var self = this;
                this._deferred.push(function() {
                    self._listeners.removeValue(listener);
                });
            } else {
                this._listeners.removeValue(listener);
            }
        };
        Notification.prototype.dispose = function() {
            this._listeners.removeAll();
        };
        Notification.prototype.fire = function() {
            this._deferring = true;
            try {
                for (var n = 0; n < this._listeners.length; n++) {
                    var consumed = this._listeners.valueAt(n)();
                    if (consumed) return consumed;
                }
                return false;
            } finally {
                if (this._deferred.length > 0) {
                    for (var n = 0; n < this._deferred.length; n++) {
                        this._deferred[n]();
                    }
                    this._deferred = [];
                }
                this._deferring = false;
            }
        };
        return Notification;
    }();
    Webglimpse.Notification = Notification;
    var Notification1 = function() {
        function Notification1() {
            this._listeners = new Webglimpse.OrderedSet([], Webglimpse.getObjectId, false);
            this._deferring = false;
            this._deferred = [];
        }
        Notification1.prototype.on = function(listener) {
            if (this._deferring) {
                var self = this;
                this._deferred.push(function() {
                    self._listeners.add(listener);
                });
            } else {
                this._listeners.add(listener);
            }
        };
        Notification1.prototype.off = function(listener) {
            if (this._deferring) {
                var self = this;
                this._deferred.push(function() {
                    self._listeners.removeValue(listener);
                });
            } else {
                this._listeners.removeValue(listener);
            }
        };
        Notification1.prototype.dispose = function() {
            this._listeners.removeAll();
        };
        Notification1.prototype.fire = function(a) {
            this._deferring = true;
            try {
                for (var n = 0; n < this._listeners.length; n++) {
                    var consumed = this._listeners.valueAt(n)(a);
                    if (consumed) return consumed;
                }
                return false;
            } finally {
                if (this._deferred.length > 0) {
                    for (var n = 0; n < this._deferred.length; n++) {
                        this._deferred[n]();
                    }
                    this._deferred = [];
                }
                this._deferring = false;
            }
        };
        return Notification1;
    }();
    Webglimpse.Notification1 = Notification1;
    var Notification2 = function() {
        function Notification2() {
            this._listeners = new Webglimpse.OrderedSet([], Webglimpse.getObjectId, false);
            this._deferring = false;
            this._deferred = [];
        }
        Notification2.prototype.on = function(listener) {
            if (this._deferring) {
                var self = this;
                this._deferred.push(function() {
                    self._listeners.add(listener);
                });
            } else {
                this._listeners.add(listener);
            }
        };
        Notification2.prototype.off = function(listener) {
            if (this._deferring) {
                var self = this;
                this._deferred.push(function() {
                    self._listeners.removeValue(listener);
                });
            } else {
                this._listeners.removeValue(listener);
            }
        };
        Notification2.prototype.dispose = function() {
            this._listeners.removeAll();
        };
        Notification2.prototype.fire = function(a, b) {
            this._deferring = true;
            try {
                for (var n = 0; n < this._listeners.length; n++) {
                    var consumed = this._listeners.valueAt(n)(a, b);
                    if (consumed) return consumed;
                }
                return false;
            } finally {
                if (this._deferred.length > 0) {
                    for (var n = 0; n < this._deferred.length; n++) {
                        this._deferred[n]();
                    }
                    this._deferred = [];
                }
                this._deferring = false;
            }
        };
        return Notification2;
    }();
    Webglimpse.Notification2 = Notification2;
    var Notification3 = function() {
        function Notification3() {
            this._listeners = new Webglimpse.OrderedSet([], Webglimpse.getObjectId, false);
            this._deferring = false;
            this._deferred = [];
        }
        Notification3.prototype.on = function(listener) {
            if (this._deferring) {
                var self = this;
                this._deferred.push(function() {
                    self._listeners.add(listener);
                });
            } else {
                this._listeners.add(listener);
            }
        };
        Notification3.prototype.off = function(listener) {
            if (this._deferring) {
                var self = this;
                this._deferred.push(function() {
                    self._listeners.removeValue(listener);
                });
            } else {
                this._listeners.removeValue(listener);
            }
        };
        Notification3.prototype.dispose = function() {
            this._listeners.removeAll();
        };
        Notification3.prototype.fire = function(a, b, c) {
            this._deferring = true;
            try {
                for (var n = 0; n < this._listeners.length; n++) {
                    var consumed = this._listeners.valueAt(n)(a, b, c);
                    if (consumed) return consumed;
                }
                return false;
            } finally {
                if (this._deferred.length > 0) {
                    for (var n = 0; n < this._deferred.length; n++) {
                        this._deferred[n]();
                    }
                    this._deferred = [];
                }
                this._deferring = false;
            }
        };
        return Notification3;
    }();
    Webglimpse.Notification3 = Notification3;
})(Webglimpse || (Webglimpse = {}));

var Webglimpse;

(function(Webglimpse) {
    // XXX: These probably belong in their own namespace
    function indexOf(vs, x) {
        var a = 0;
        var b = vs.length - 1;
        while (a <= b) {
            // Bitwise-or-zero truncates to integer
            var pivot = (a + b) / 2 | 0;
            var vPivot = vs[pivot];
            if (vPivot < x) {
                a = pivot + 1;
            } else if (vPivot > x) {
                b = pivot - 1;
            } else {
                // This is a little sloppy if either value is NaN, or if one is +0.0 and the other is -0.0
                return pivot;
            }
        }
        return -(a + 1);
    }
    Webglimpse.indexOf = indexOf;
    function indexNearest(vs, x) {
        var i = indexOf(vs, x);
        // Exact value found
        if (i >= 0) return i;
        // Find the closer of the adjacent values
        var iAfter = -i - 1;
        var iBefore = iAfter - 1;
        if (iAfter >= vs.length) return iBefore;
        if (iBefore < 0) return iAfter;
        var diffAfter = vs[iAfter] - x;
        var diffBefore = x - vs[iBefore];
        return diffAfter <= diffBefore ? iAfter : iBefore;
    }
    Webglimpse.indexNearest = indexNearest;
    function indexAfter(vs, x) {
        var i = indexOf(vs, x);
        // Exact value not found
        if (i < 0) return -i - 1;
        // If the exact value was found, find the value's last occurrence
        var n = vs.length;
        for (var j = i + 1; j < n; j++) {
            if (vs[j] > x) return j;
        }
        return n;
    }
    Webglimpse.indexAfter = indexAfter;
    function indexAtOrAfter(vs, x) {
        var i = indexOf(vs, x);
        // Exact value not found
        if (i < 0) return -i - 1;
        // If the exact value was found, find the value's first occurrence
        var n = vs.length;
        for (var j = i; j > 0; j--) {
            if (vs[j - 1] < x) return j;
        }
        return 0;
    }
    Webglimpse.indexAtOrAfter = indexAtOrAfter;
    function indexBefore(vs, x) {
        return indexAtOrAfter(vs, x) - 1;
    }
    Webglimpse.indexBefore = indexBefore;
    function indexAtOrBefore(vs, x) {
        return indexAfter(vs, x) - 1;
    }
    Webglimpse.indexAtOrBefore = indexAtOrBefore;
})(Webglimpse || (Webglimpse = {}));

var Webglimpse;

(function(Webglimpse) {
    // AA Binary Tree
    //
    // see: http://user.it.uu.se/~arnea/ps/simp.pdf
    //      http://en.wikipedia.org/wiki/AA_tree
    //
    // Tree is self-balancing. Nodes are assigned a level number to assist balancing.
    //
    // The following invariants hold for AA tree level numbers:
    // 1) Leaf node level is 1
    // 2) node.left.level = node.level - 1
    // 3) node.right.level = node.level or node.right.level = node.level - 1
    // 4) grandchild nodes have level less than their grandparents
    // 5) every node of level greater than 1 has two children
    //
    // Requirements 2 and 3 allow "right horizontal links" but not "left horizontal links".
    // The "skew" rotation operation turns a left horizontal link that may arise from insertion/deletion into a right horizontal link.
    // The" skew" operation might result in two subsequent horizontal links (which is not permitted by requirement 4. This
    // condition is fixed by the "splay" rotation operation.
    //
    // Duplicate values (as determined by the Comparator) are not permitted (insertion of a duplicate value will be ignored).
    // Supports O(log n) insertion and deletion and O(1) size retrieval.
    //
    var BinaryTree = function() {
        function BinaryTree(comparator) {
            this._root = null;
            this._comp = comparator;
            this._size = 0;
        }
        // Inserts the value into the tree. Nothing is inserted if the value already exists
        BinaryTree.prototype.insert = function(value) {
            this._root = this.insert0(value, this._root);
        };
        // Removes the value from the tree (if it exists)
        BinaryTree.prototype.remove = function(value) {
            this._root = this.remove0(value, this._root);
        };
        // Removes all values from the tree (size will be 0)
        BinaryTree.prototype.removeAll = function() {
            this._root = null;
            this._size = 0;
        };
        BinaryTree.prototype.contains = function(value) {
            return this.contains0(value, this._root) !== null;
        };
        // Gets the actual value stored in the tree or null if it does not exist.
        // Normally this is not useful. This method is provided for trees which store additional
        // data in their values besides their sort order.
        BinaryTree.prototype.getValue = function(value) {
            return this.contains0(value, this._root);
        };
        Object.defineProperty(BinaryTree.prototype, "size", {
            get: function() {
                return this._size;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(BinaryTree.prototype, "isEmpty", {
            get: function() {
                return this._size === 0;
            },
            enumerable: true,
            configurable: true
        });
        // Returns the lowest element greater than or equal to the given value, or null if no such element exists
        BinaryTree.prototype.ceiling = function(value) {
            return this.higher0(value, this._root, true);
        };
        // Returns the greatest element less than or equal to the given value, or null if no such element exists
        BinaryTree.prototype.floor = function(value) {
            return this.lower0(value, this._root, true);
        };
        // Returns the greatest element strictly less than the given value, or null if no such element exists
        BinaryTree.prototype.lower = function(value) {
            return this.lower0(value, this._root, false);
        };
        // Returns the lowest element strictly greater than the given value, or null if no such element exists
        BinaryTree.prototype.higher = function(value) {
            return this.higher0(value, this._root, false);
        };
        // Returns all elements greater than (or equal to, if inclusive is true) the provided value (sorted from low to high)
        BinaryTree.prototype.headSet = function(value, inclusive) {
            if (typeof inclusive === "undefined") {
                inclusive = true;
            }
            var results = new Array();
            this.head0(value, inclusive, this._root, results);
            return results;
        };
        // Returns all elements less than ( or equal to, if inclusive is true) the provided value (sorted from low to high)
        BinaryTree.prototype.tailSet = function(value, inclusive) {
            if (typeof inclusive === "undefined") {
                inclusive = false;
            }
            var results = new Array();
            this.tail0(value, inclusive, this._root, results);
            return results;
        };
        // Returns all elements between the provided values (sorted from low to high)
        BinaryTree.prototype.subSet = function(low, high, lowInclusive, highInclusive) {
            if (typeof lowInclusive === "undefined") {
                lowInclusive = true;
            }
            if (typeof highInclusive === "undefined") {
                highInclusive = false;
            }
            var results = new Array();
            this.sub0(low, high, lowInclusive, highInclusive, this._root, results);
            return results;
        };
        // Returns all elements in the tree (sorted from low to high)
        BinaryTree.prototype.toArray = function() {
            var results = new Array();
            this.addAll0(this._root, results);
            return results;
        };
        BinaryTree.prototype.iterator = function() {
            // find the first node by traversing left links down the tree
            var node = this._root;
            var down;
            var stack = new Array();
            while (node != null && node.left != null) {
                stack.push(node);
                node = node.left;
            }
            down = node.right != null;
            return {
                next: function() {
                    var value = node.value;
                    // down indicates we should follow the right link
                    if (down && node != null && node.right != null) {
                        node = node.right;
                        while (node != null && node.left != null) {
                            stack.push(node);
                            node = node.left;
                        }
                        down = node.right != null;
                    } else {
                        node = stack.pop();
                        down = true;
                    }
                    return value;
                },
                hasNext: function() {
                    return node != null;
                }
            };
        };
        BinaryTree.prototype.compare = function(node1, node2) {
            return this._comp.compare(node1, node2);
        };
        BinaryTree.prototype.contains0 = function(value, node) {
            if (node == null) {
                return null;
            }
            var comp = this.compare(value, node.value);
            if (comp > 0) {
                return this.contains0(value, node.right);
            } else if (comp < 0) {
                return this.contains0(value, node.left);
            } else {
                return node.value;
            }
        };
        BinaryTree.prototype.lower0 = function(value, node, inclusive) {
            if (node == null) {
                return null;
            }
            var comp = this.compare(value, node.value);
            var candidate;
            if (comp > 0) {
                candidate = this.lower0(value, node.right, inclusive);
                // don't need to compare again, candidate will be closer to value
                return candidate != null ? candidate : node.value;
            } else if (comp < 0 || !inclusive && comp == 0) {
                // current node's value is lower -- if we don't find a better value:
                //   * return this node's value if lower
                //   * otherwise return null
                candidate = this.lower0(value, node.left, inclusive);
                if (candidate == null) candidate = node.value;
                comp = this.compare(value, candidate);
                return comp > 0 || inclusive && comp == 0 ? candidate : null;
            } else {
                // the node's value equals the search value and inclusive is true
                return node.value;
            }
        };
        BinaryTree.prototype.higher0 = function(value, node, inclusive) {
            if (node == null) {
                return null;
            }
            var comp = this.compare(value, node.value);
            var candidate;
            if (comp < 0) {
                candidate = this.higher0(value, node.left, inclusive);
                // don't need to compare again, candidate will be closer to value
                return candidate != null ? candidate : node.value;
            } else if (comp > 0 || !inclusive && comp == 0) {
                // current node's value is lower -- if we don't find a better value:
                //   * return this node's value if higher
                //   * otherwise return null
                candidate = this.higher0(value, node.right, inclusive);
                if (candidate == null) candidate = node.value;
                comp = this.compare(value, candidate);
                return comp < 0 || inclusive && comp == 0 ? candidate : null;
            } else {
                // the node's value equals the search value and inclusive is true
                return node.value;
            }
        };
        BinaryTree.prototype.sub0 = function(low, high, lowInclusive, highInclusive, node, results) {
            if (node == null) {
                return;
            }
            // low end of range is above node value
            var compLow = this.compare(low, node.value);
            if (compLow > 0 || compLow == 0 && !lowInclusive) {
                return this.sub0(low, high, lowInclusive, highInclusive, node.right, results);
            }
            // high end of range is below node value
            var compHigh = this.compare(high, node.value);
            if (compHigh < 0 || compHigh == 0 && !highInclusive) {
                return this.sub0(low, high, lowInclusive, highInclusive, node.left, results);
            }
            // value is within range
            this.sub0(low, high, lowInclusive, highInclusive, node.left, results);
            results.push(node.value);
            this.sub0(low, high, lowInclusive, highInclusive, node.right, results);
        };
        BinaryTree.prototype.head0 = function(value, inclusive, node, results) {
            if (node == null) {
                return;
            }
            var comp = this.compare(value, node.value);
            if (comp < 0 || comp == 0 && inclusive) {
                this.head0(value, inclusive, node.left, results);
                results.push(node.value);
                this.addAll0(node.right, results);
            } else if (comp > 0) {
                this.head0(value, inclusive, node.right, results);
            }
        };
        BinaryTree.prototype.tail0 = function(value, inclusive, node, results) {
            if (node == null) {
                return;
            }
            var comp = this.compare(value, node.value);
            if (comp > 0 || comp == 0 && inclusive) {
                this.addAll0(node.left, results);
                results.push(node.value);
                this.tail0(value, inclusive, node.right, results);
            } else if (comp < 0) {
                this.tail0(value, inclusive, node.left, results);
            }
        };
        BinaryTree.prototype.addAll0 = function(node, results) {
            if (node == null) {
                return;
            }
            this.addAll0(node.left, results);
            results.push(node.value);
            this.addAll0(node.right, results);
        };
        // 1) turn deletion of internal node into deletion of leaf node by swapping with closest successor or predecessor
        //    (which will always be in level 1)
        // 2) lower level of nodes whose children are two levels below them (not allowed by invariants 2 and 3)
        //    also lower level of nodes who are now leaf nodes (level > 1 not allowed by invariant 1)
        // 3) skew and split the entire level
        BinaryTree.prototype.remove0 = function(value, node) {
            if (node == null) {
                return node;
            }
            // find and remove the node
            var comp = this.compare(value, node.value);
            if (comp < 0) {
                node.left = this.remove0(value, node.left);
            } else if (comp > 0) {
                node.right = this.remove0(value, node.right);
            } else {
                if (node.isLeaf()) {
                    return null;
                } else if (node.left == null) {
                    var lower = node.getSuccessor();
                    node.right = this.remove0(lower.value, node.right);
                    node.value = lower.value;
                } else {
                    var lower = node.getPredecessor();
                    node.left = this.remove0(lower.value, node.left);
                    node.value = lower.value;
                }
                this._size -= 1;
            }
            // rebalance the tree
            node = this.decreaseLevel0(node);
            node = this.skew0(node);
            node.right = this.skew0(node.right);
            if (node.right != null) {
                node.right.right = this.skew0(node.right.right);
            }
            node = this.split0(node);
            node.right = this.split0(node.right);
            return node;
        };
        // return the level of the node, or 0 if null
        BinaryTree.prototype.level0 = function(node) {
            if (node == null) {
                return 0;
            } else {
                return node.level;
            }
        };
        // lower the level of nodes which violate invariants 1, 2, and/or 3
        BinaryTree.prototype.decreaseLevel0 = function(node) {
            var correctLevel = Math.min(this.level0(node.left), this.level0(node.right)) + 1;
            if (correctLevel < node.level) {
                node.level = correctLevel;
                if (node.right != null && correctLevel < node.right.level) {
                    node.right.level = correctLevel;
                }
            }
            return node;
        };
        // 1) insert the value as you would in a binary tree
        // 2) walk back to the root performing skew() then split() operations
        // returns an updated version of the provided node (after the insert)
        BinaryTree.prototype.insert0 = function(value, node) {
            if (node == null) {
                this._size += 1;
                return this.newTreeNode0(value);
            }
            // find the appropriate spot and insert the node
            var comp = this.compare(value, node.value);
            if (comp < 0) {
                node.left = this.insert0(value, node.left);
            } else if (comp > 0) {
                node.right = this.insert0(value, node.right);
            }
            // always perform a skew then split to rebalance tree
            // (if no balancing is necessary, these operations will return the node unchanged)
            node = this.skew0(node);
            node = this.split0(node);
            return node;
        };
        BinaryTree.prototype.newTreeNode0 = function(value) {
            return new TreeNode(value);
        };
        BinaryTree.prototype.skew0 = function(node) {
            if (node == null) {
                return null;
            } else if (node.left == null) {
                return node;
            } else if (node.left.level == node.level) {
                // swap the pointers of the horizontal (same level value) left links
                var left = node.left;
                node.left = left.right;
                left.right = node;
                return left;
            } else {
                return node;
            }
        };
        BinaryTree.prototype.split0 = function(node) {
            if (node == null) {
                return null;
            } else if (node.right == null || node.right.right == null) {
                return node;
            } else if (node.level == node.right.right.level) {
                // two horizontal (same level value) right links
                // take the middle node, elevate it, and return it
                var right = node.right;
                node.right = right.left;
                right.left = node;
                right.level = right.level + 1;
                return right;
            } else {
                return node;
            }
        };
        return BinaryTree;
    }();
    Webglimpse.BinaryTree = BinaryTree;
    var TreeNode = function() {
        function TreeNode(value, level, left, right) {
            if (typeof level === "undefined") {
                level = 1;
            }
            if (typeof left === "undefined") {
                left = null;
            }
            if (typeof right === "undefined") {
                right = null;
            }
            this._level = level;
            this._right = right;
            this._left = left;
            this._value = value;
        }
        Object.defineProperty(TreeNode.prototype, "level", {
            get: function() {
                return this._level;
            },
            set: function(level) {
                this._level = level;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TreeNode.prototype, "right", {
            get: function() {
                return this._right;
            },
            set: function(node) {
                this._right = node;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TreeNode.prototype, "left", {
            get: function() {
                return this._left;
            },
            set: function(node) {
                this._left = node;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TreeNode.prototype, "value", {
            get: function() {
                return this._value;
            },
            set: function(value) {
                this._value = value;
            },
            enumerable: true,
            configurable: true
        });
        TreeNode.prototype.isLeaf = function() {
            return this.right == null && this.left == null;
        };
        TreeNode.prototype.getSuccessor = function() {
            var node = this.right;
            while (node != null && node.left != null) {
                node = node.left;
            }
            return node;
        };
        TreeNode.prototype.getPredecessor = function() {
            var node = this.left;
            while (node != null && node.right != null) {
                node = node.right;
            }
            return node;
        };
        TreeNode.prototype.toString = function() {
            return this.value.toString() + ":" + this.level.toString();
        };
        return TreeNode;
    }();
    Webglimpse.TreeNode = TreeNode;
    var StringComparator = function() {
        function StringComparator() {}
        StringComparator.prototype.compare = function(value1, value2) {
            return value1.toLocaleLowerCase().localeCompare(value2.toLocaleLowerCase());
        };
        return StringComparator;
    }();
    Webglimpse.StringComparator = StringComparator;
    var NumberComparator = function() {
        function NumberComparator() {}
        NumberComparator.prototype.compare = function(value1, value2) {
            return value1 - value2;
        };
        return NumberComparator;
    }();
    Webglimpse.NumberComparator = NumberComparator;
    function createStringTree() {
        return new BinaryTree(new StringComparator());
    }
    Webglimpse.createStringTree = createStringTree;
    function createNumberTree() {
        return new BinaryTree(new NumberComparator());
    }
    Webglimpse.createNumberTree = createNumberTree;
})(Webglimpse || (Webglimpse = {}));

var __extends = this.__extends || function(d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() {
        this.constructor = d;
    }
    __.prototype = b.prototype;
    d.prototype = new __();
};

var Webglimpse;

(function(Webglimpse) {
    // A sorted map which allows multiple string values per key (K)
    var SortedMultimap = function() {
        function SortedMultimap(comparator, idFn) {
            if (typeof idFn === "undefined") {
                idFn = Webglimpse.getObjectId;
            }
            this._tree = new Webglimpse.BinaryTree(this.createContainerComparator(comparator));
            this._idFn = idFn;
        }
        SortedMultimap.prototype.createContainerComparator = function(comparator) {
            return {
                compare: function(container1, container2) {
                    return comparator.compare(container1.key, container2.key);
                }
            };
        };
        // Inserts the value into the tree. Nothing is inserted if the value already exists
        SortedMultimap.prototype.insert = function(key, value) {
            var wrappedKey = new Container(key);
            var values = this._tree.getValue(wrappedKey);
            if (values === null) {
                values = wrappedKey;
                this._tree.insert(values);
            }
            values.add(value, this._idFn);
        };
        SortedMultimap.prototype.remove = function(key, value) {
            var wrappedKey = new Container(key);
            var values = this._tree.getValue(wrappedKey);
            if (values === null) return;
            values.remove(value, this._idFn);
            if (values.size === 0) {
                this._tree.remove(values);
            }
        };
        SortedMultimap.prototype.contains = function(key, value) {
            var wrappedKey = new Container(key);
            var values = this._tree.getValue(wrappedKey);
            if (values === null) {
                return false;
            } else {
                return values.contains(value, this._idFn);
            }
        };
        // Returns the lowest element greater than or equal to the given value, or null if no such element exists
        SortedMultimap.prototype.ceiling = function(key) {
            return this.unwrap(this._tree.ceiling(this.wrap(key)));
        };
        // Returns the greatest element less than or equal to the given value, or null if no such element exists
        SortedMultimap.prototype.floor = function(key) {
            return this.unwrap(this._tree.floor(this.wrap(key)));
        };
        // Returns the greatest element strictly less than the given value, or null if no such element exists
        SortedMultimap.prototype.lower = function(key) {
            return this.unwrap(this._tree.lower(this.wrap(key)));
        };
        // Returns the lowest element strictly greater than the given value, or null if no such element exists
        SortedMultimap.prototype.higher = function(key) {
            return this.unwrap(this._tree.higher(this.wrap(key)));
        };
        // Returns all elements greater than (or equal to, if inclusive is true) the provided value (sorted from low to high)
        SortedMultimap.prototype.headSet = function(key, inclusive) {
            if (typeof inclusive === "undefined") {
                inclusive = true;
            }
            return this.unwrapArray(this._tree.headSet(this.wrap(key), inclusive));
        };
        // Returns all elements less than ( or equal to, if inclusive is true) the provided value (sorted from low to high)
        SortedMultimap.prototype.tailSet = function(key, inclusive) {
            if (typeof inclusive === "undefined") {
                inclusive = false;
            }
            return this.unwrapArray(this._tree.tailSet(this.wrap(key), inclusive));
        };
        // Returns all elements between the provided values (sorted from low to high)
        SortedMultimap.prototype.subSet = function(low, high, lowInclusive, highInclusive) {
            if (typeof lowInclusive === "undefined") {
                lowInclusive = true;
            }
            if (typeof highInclusive === "undefined") {
                highInclusive = false;
            }
            var wrappedLow = new Container(low);
            var wrappedHigh = new Container(high);
            var values = this._tree.subSet(wrappedLow, wrappedHigh, lowInclusive, highInclusive);
            return this.unwrapArray(values);
        };
        // Returns all keys in the tree (sorted from low to high)
        SortedMultimap.prototype.toArray = function() {
            return this.unwrapArray(this._tree.toArray());
        };
        SortedMultimap.prototype.iterator = function() {
            var iter = this._tree.iterator();
            var currentArray = null;
            var currentIndex = 0;
            return {
                next: function() {
                    var value;
                    if (currentArray == null || currentIndex >= currentArray.length) {
                        currentArray = iter.next().toArray();
                        currentIndex = 0;
                        value = currentArray[currentIndex];
                    } else {
                        value = currentArray[currentIndex];
                    }
                    currentIndex += 1;
                    return value;
                },
                hasNext: function() {
                    return iter.hasNext() || currentArray != null && currentIndex < currentArray.length;
                }
            };
        };
        SortedMultimap.prototype.wrap = function(key) {
            return new Container(key);
        };
        SortedMultimap.prototype.unwrap = function(values) {
            if (values === null) {
                return [];
            } else {
                return values.toArray();
            }
        };
        SortedMultimap.prototype.unwrapArray = function(values) {
            var unwrappedValues = new Array();
            values.forEach(function(value) {
                value.toArray().forEach(function(value) {
                    unwrappedValues.push(value);
                });
            });
            return unwrappedValues;
        };
        return SortedMultimap;
    }();
    Webglimpse.SortedMultimap = SortedMultimap;
    var SortedStringMultimap = function(_super) {
        __extends(SortedStringMultimap, _super);
        function SortedStringMultimap(comparator) {
            _super.call(this, comparator, function(value) {
                return value;
            });
        }
        return SortedStringMultimap;
    }(SortedMultimap);
    Webglimpse.SortedStringMultimap = SortedStringMultimap;
    // a container which stores a set of values (V) associated with a sorted key (K)
    // OrderedSet or even BinaryTree could be used here instead
    // more sophisticated set implementation: http://stackoverflow.com/questions/7958292/mimicking-sets-in-javascript
    var Container = function() {
        function Container(key) {
            this._key = key;
            this._values = {};
        }
        Object.defineProperty(Container.prototype, "size", {
            get: function() {
                return this.toArray().length;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Container.prototype, "key", {
            get: function() {
                return this._key;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Container.prototype, "values", {
            get: function() {
                return this._values;
            },
            enumerable: true,
            configurable: true
        });
        Container.prototype.toArray = function() {
            var _this = this;
            return Object.keys(this._values).map(function(key) {
                return _this._values[key];
            });
        };
        Container.prototype.contains = function(value, idFn) {
            // safer than 'value in this._values' because of potential conflict with built in properties/methods
            return Object.prototype.hasOwnProperty.call(this._values, idFn(value));
        };
        Container.prototype.add = function(value, idFn) {
            this._values[idFn(value)] = value;
        };
        Container.prototype.remove = function(value, idFn) {
            delete this._values[idFn(value)];
        };
        return Container;
    }();
})(Webglimpse || (Webglimpse = {}));

var Webglimpse;

(function(Webglimpse) {
    function initSplitContainer(container) {
        var tilesResized = new Webglimpse.Notification();
        _initSplitContainer(container, tilesResized);
        window.addEventListener("resize", function() {
            tilesResized.fire();
        });
        tilesResized.fire();
        return tilesResized;
    }
    Webglimpse.initSplitContainer = initSplitContainer;
    function _initSplitContainer(container, tilesResized) {
        var tileA = null;
        var tileB = null;
        var sep = null;
        var children = container.childNodes;
        for (var n = 0; n < children.length; n++) {
            var child = children[n];
            if (child.nodeType === 1 && child.classList) {
                var element = child;
                if (tileA == null) {
                    if (element.classList.contains("splitContainerNS") || element.classList.contains("splitContainerEW") || element.classList.contains("splitTile")) {
                        tileA = element;
                    }
                } else if (sep == null) {
                    if (element.classList.contains("splitSep")) {
                        sep = element;
                    }
                } else if (tileB == null) {
                    if (element.classList.contains("splitContainerNS") || element.classList.contains("splitContainerEW") || element.classList.contains("splitTile")) {
                        tileB = element;
                    }
                } else {
                    break;
                }
            }
        }
        if (tileA == null) throw new Error("Failed to init split-container: could not find first tile");
        if (sep == null) throw new Error("Failed to init split-container: could not find separator");
        if (tileB == null) throw new Error("Failed to init split-container: could not find second tile");
        if (container.classList.contains("splitContainerNS")) {
            _initSplitNS(container, tileA, sep, tileB, tilesResized);
        } else if (container.classList.contains("splitContainerEW")) {
            _initSplitEW(container, tileA, sep, tileB, tilesResized);
        }
        if (tileA.classList.contains("splitContainerNS") || tileA.classList.contains("splitContainerEW")) {
            _initSplitContainer(tileA, tilesResized);
        }
        if (tileB.classList.contains("splitContainerNS") || tileB.classList.contains("splitContainerEW")) {
            _initSplitContainer(tileB, tilesResized);
        }
    }
    function _initSplitNS(container, tileA, sep, tileB, tilesResized) {
        sep.classList.add("splitSepNS");
        sep.style.left = "0px";
        sep.style.right = "0px";
        tileA.style.left = "0px";
        tileA.style.right = "0px";
        tileB.style.left = "0px";
        tileB.style.right = "0px";
        var minHeightA = 1;
        var minHeightB = 1;
        var recentFracA = null;
        function layoutTiles(prelimHeightA) {
            var heightSep = sep.getBoundingClientRect().height;
            var heightContainer = container.getBoundingClientRect().height;
            var heightContent = heightContainer - heightSep;
            if (recentFracA == null) {
                recentFracA = tileA.getBoundingClientRect().height / heightContent;
            }
            var keepFracA = prelimHeightA == null;
            if (keepFracA) {
                prelimHeightA = Math.round(recentFracA * heightContent);
            }
            var maxHeightA = heightContainer - heightSep - minHeightB;
            var topA = 0;
            var heightA = Math.max(minHeightA, Math.min(maxHeightA, prelimHeightA));
            tileA.style.top = topA + "px";
            tileA.style.height = heightA + "px";
            var topSep = topA + heightA;
            sep.style.top = topSep + "px";
            sep.style.height = heightSep + "px";
            var topB = topSep + heightSep;
            var heightB = Math.max(minHeightB, heightContainer - topB);
            tileB.style.top = topB + "px";
            tileB.style.height = heightB + "px";
            if (!keepFracA && heightContent >= heightA && heightContent >= minHeightA + minHeightB) {
                recentFracA = heightA / heightContent;
            }
        }
        var sepGrab = null;
        sep.addEventListener("mousedown", function(ev) {
            if (ev.button === 0) {
                sepGrab = ev.clientY - tileA.getBoundingClientRect().top - tileA.getBoundingClientRect().height;
                ev.preventDefault();
            }
        });
        // During a DRAG we want all move events, even ones that occur outside the canvas -- so subscribe to WINDOW's mousemove
        window.addEventListener("mousemove", function(ev) {
            if (sepGrab != null) {
                layoutTiles(ev.clientY - tileA.getBoundingClientRect().top - sepGrab);
                tilesResized.fire();
            }
        });
        // The window always gets the mouse-up event at the end of a drag -- even if it occurs outside the browser window
        window.addEventListener("mouseup", function(ev) {
            if (sepGrab != null && ev.button === 0) {
                layoutTiles(ev.clientY - tileA.getBoundingClientRect().top - sepGrab);
                tilesResized.fire();
                sepGrab = null;
            }
        });
        tilesResized.on(layoutTiles);
    }
    function _initSplitEW(container, tileA, sep, tileB, tilesResized) {
        sep.classList.add("splitSepEW");
        sep.style.top = "0px";
        sep.style.bottom = "0px";
        tileA.style.top = "0px";
        tileA.style.bottom = "0px";
        tileB.style.top = "0px";
        tileB.style.bottom = "0px";
        var minWidthA = 1;
        var minWidthB = 1;
        var recentFracA = null;
        function layoutTiles(prelimWidthA) {
            var widthSep = sep.getBoundingClientRect().width;
            var widthContainer = container.getBoundingClientRect().width;
            var widthContent = widthContainer - widthSep;
            if (recentFracA == null) {
                recentFracA = tileA.getBoundingClientRect().width / widthContent;
            }
            var keepFracA = prelimWidthA == null;
            if (keepFracA) {
                prelimWidthA = Math.round(recentFracA * widthContent);
            }
            var maxWidthA = widthContainer - widthSep - minWidthB;
            var leftA = 0;
            var widthA = Math.max(minWidthA, Math.min(maxWidthA, prelimWidthA));
            tileA.style.left = leftA + "px";
            tileA.style.width = widthA + "px";
            var leftSep = leftA + widthA;
            sep.style.left = leftSep + "px";
            sep.style.width = widthSep + "px";
            var leftB = leftSep + widthSep;
            var widthB = Math.max(minWidthB, widthContainer - leftB);
            tileB.style.left = leftB + "px";
            tileB.style.width = widthB + "px";
            if (!keepFracA && widthContent >= widthA && widthContent >= minWidthA + minWidthB) {
                recentFracA = widthA / widthContent;
            }
        }
        var sepGrab = null;
        sep.addEventListener("mousedown", function(ev) {
            if (ev.button === 0) {
                sepGrab = ev.clientX - tileA.getBoundingClientRect().left - tileA.getBoundingClientRect().width;
                ev.preventDefault();
            }
        });
        // During a DRAG we want all move events, even ones that occur outside the canvas -- so subscribe to WINDOW's mousemove
        window.addEventListener("mousemove", function(ev) {
            if (sepGrab != null) {
                layoutTiles(ev.clientX - tileA.getBoundingClientRect().left - sepGrab);
                tilesResized.fire();
            }
        });
        // The window always gets the mouse-up event at the end of a drag -- even if it occurs outside the browser window
        window.addEventListener("mouseup", function(ev) {
            if (sepGrab != null && ev.button === 0) {
                layoutTiles(ev.clientX - tileA.getBoundingClientRect().left - sepGrab);
                tilesResized.fire();
                sepGrab = null;
            }
        });
        tilesResized.on(layoutTiles);
    }
})(Webglimpse || (Webglimpse = {}));

var Webglimpse;

(function(Webglimpse) {
    function newStaticBuffer(data) {
        return new StaticBufferImpl(data);
    }
    Webglimpse.newStaticBuffer = newStaticBuffer;
    function newDynamicBuffer(data) {
        if (typeof data === "undefined") {
            data = new Float32Array(0);
        }
        return new DynamicBufferImpl(data);
    }
    Webglimpse.newDynamicBuffer = newDynamicBuffer;
    var BufferEntry = function() {
        function BufferEntry(gl, buffer) {
            this.capacity = 0;
            this.marker = null;
            this.gl = gl;
            this.buffer = buffer;
        }
        return BufferEntry;
    }();
    var AbstractBuffer = function() {
        function AbstractBuffer() {
            this.buffers = {};
            this.currentMarker = 0;
        }
        AbstractBuffer.prototype.init = function(gl, target) {
            throw new Error("Method is abstract");
        };
        AbstractBuffer.prototype.update = function(gl, target, capacity) {
            throw new Error("Method is abstract");
        };
        AbstractBuffer.prototype.setDirty = function() {
            this.currentMarker++;
        };
        AbstractBuffer.prototype.bind = function(gl, target) {
            var glId = Webglimpse.getObjectId(gl);
            if (this.buffers[glId] === undefined) {
                var buffer = gl.createBuffer();
                if (!Webglimpse.hasval(buffer)) throw new Error("Failed to create buffer");
                this.buffers[glId] = new BufferEntry(gl, buffer);
                gl.bindBuffer(target, this.buffers[glId].buffer);
                this.buffers[glId].capacity = this.init(gl, target);
                this.buffers[glId].marker = this.currentMarker;
            } else if (this.buffers[glId].marker !== this.currentMarker) {
                gl.bindBuffer(target, this.buffers[glId].buffer);
                this.buffers[glId].capacity = this.update(gl, target, this.buffers[glId].capacity);
                this.buffers[glId].marker = this.currentMarker;
            } else {
                gl.bindBuffer(target, this.buffers[glId].buffer);
            }
        };
        AbstractBuffer.prototype.unbind = function(gl, target) {
            gl.bindBuffer(target, null);
        };
        AbstractBuffer.prototype.dispose = function() {
            for (var glid in this.buffers) {
                if (this.buffers.hasOwnProperty(glid)) {
                    var en = this.buffers[glid];
                    en.gl.deleteBuffer(en.buffer);
                }
            }
            this.buffers = {};
        };
        return AbstractBuffer;
    }();
    var StaticBufferImpl = function(_super) {
        __extends(StaticBufferImpl, _super);
        function StaticBufferImpl(data) {
            _super.call(this);
            this._data = data;
        }
        StaticBufferImpl.prototype.init = function(gl, target) {
            gl.bufferData(target, this._data, Webglimpse.GL.STATIC_DRAW);
            return this._data.byteLength;
        };
        StaticBufferImpl.prototype.update = function(gl, target, capacity) {
            throw new Error("This buffer is static and should never need to be updated");
        };
        return StaticBufferImpl;
    }(AbstractBuffer);
    var DynamicBufferImpl = function(_super) {
        __extends(DynamicBufferImpl, _super);
        function DynamicBufferImpl(data) {
            _super.call(this);
            this._data = data;
        }
        DynamicBufferImpl.prototype.setData = function(data) {
            this._data = data;
            this.setDirty();
        };
        DynamicBufferImpl.prototype.init = function(gl, target) {
            gl.bufferData(target, this._data, Webglimpse.GL.DYNAMIC_DRAW);
            return this._data.byteLength;
        };
        DynamicBufferImpl.prototype.update = function(gl, target, capacity) {
            if (this._data.byteLength <= capacity) {
                gl.bufferSubData(target, 0, this._data);
                return capacity;
            } else {
                gl.bufferData(target, this._data, Webglimpse.GL.DYNAMIC_DRAW);
                return this._data.byteLength;
            }
        };
        return DynamicBufferImpl;
    }(AbstractBuffer);
})(Webglimpse || (Webglimpse = {}));

var Webglimpse;

(function(Webglimpse) {
    function compileShader(gl, shaderType, glsl) {
        var shader = gl.createShader(shaderType);
        gl.shaderSource(shader, glsl);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, Webglimpse.GL.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
        return shader;
    }
    function linkProgram(gl, shaders) {
        var program = gl.createProgram();
        for (var i = 0; i < shaders.length; i++) {
            gl.attachShader(program, shaders[i]);
        }
        try {
            gl.linkProgram(program);
            if (!gl.getProgramParameter(program, Webglimpse.GL.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
            return program;
        } finally {}
    }
    function createProgram(gl, vertShaderSource, fragShaderSource) {
        var shaders = [];
        try {
            shaders.push(compileShader(gl, Webglimpse.GL.VERTEX_SHADER, vertShaderSource));
            shaders.push(compileShader(gl, Webglimpse.GL.FRAGMENT_SHADER, fragShaderSource));
            return linkProgram(gl, shaders);
        } finally {}
    }
    var ProgramEntry = function() {
        function ProgramEntry(gl, program) {
            this.gl = gl;
            this.program = program;
        }
        return ProgramEntry;
    }();
    var Program = function() {
        function Program(vertShaderSource, fragShaderSource) {
            this.programs = {};
            this.vertShaderSource = vertShaderSource;
            this.fragShaderSource = fragShaderSource;
        }
        // XXX: Would be nice if this weren't public
        Program.prototype._program = function(gl) {
            var glId = Webglimpse.getObjectId(gl);
            if (this.programs[glId] === undefined) {
                var program = createProgram(gl, this.vertShaderSource, this.fragShaderSource);
                this.programs[glId] = new ProgramEntry(gl, program);
            }
            return this.programs[glId].program;
        };
        Program.prototype.use = function(gl) {
            gl.useProgram(this._program(gl));
        };
        Program.prototype.endUse = function(gl) {
            gl.useProgram(null);
        };
        Program.prototype.dispose = function() {
            for (var glid in this.programs) {
                if (this.programs.hasOwnProperty(glid)) {
                    var en = this.programs[glid];
                    en.gl.deleteProgram(en.program);
                }
            }
            this.programs = {};
        };
        return Program;
    }();
    Webglimpse.Program = Program;
    var Uniform = function() {
        function Uniform(program, name, optional) {
            this.locations = {};
            this.program = program;
            this.name = name;
            this.optional = optional;
        }
        // XXX: Would be nice if this weren't public
        Uniform.prototype._location = function(gl) {
            var glId = Webglimpse.getObjectId(gl);
            if (this.locations[glId] === undefined) {
                var location = gl.getUniformLocation(this.program._program(gl), this.name);
                if (!this.optional && !Webglimpse.hasval(location)) throw new Error("Uniform '" + this.name + "' not found");
                this.locations[glId] = location;
            }
            return this.locations[glId];
        };
        return Uniform;
    }();
    Webglimpse.Uniform = Uniform;
    var Uniform1f = function(_super) {
        __extends(Uniform1f, _super);
        function Uniform1f(program, name, optional) {
            if (typeof optional === "undefined") {
                optional = false;
            }
            _super.call(this, program, name, optional);
        }
        Uniform1f.prototype.setData = function(gl, x) {
            var location = this._location(gl);
            if (Webglimpse.hasval(location)) gl.uniform1f(location, x);
        };
        return Uniform1f;
    }(Uniform);
    Webglimpse.Uniform1f = Uniform1f;
    var Uniform2f = function(_super) {
        __extends(Uniform2f, _super);
        function Uniform2f(program, name, optional) {
            if (typeof optional === "undefined") {
                optional = false;
            }
            _super.call(this, program, name, optional);
        }
        Uniform2f.prototype.setData = function(gl, x, y) {
            var location = this._location(gl);
            if (Webglimpse.hasval(location)) gl.uniform2f(location, x, y);
        };
        return Uniform2f;
    }(Uniform);
    Webglimpse.Uniform2f = Uniform2f;
    var Uniform3f = function(_super) {
        __extends(Uniform3f, _super);
        function Uniform3f(program, name, optional) {
            if (typeof optional === "undefined") {
                optional = false;
            }
            _super.call(this, program, name, optional);
        }
        Uniform3f.prototype.setData = function(gl, x, y, z) {
            var location = this._location(gl);
            if (Webglimpse.hasval(location)) gl.uniform3f(location, x, y, z);
        };
        return Uniform3f;
    }(Uniform);
    Webglimpse.Uniform3f = Uniform3f;
    var Uniform4f = function(_super) {
        __extends(Uniform4f, _super);
        function Uniform4f(program, name, optional) {
            if (typeof optional === "undefined") {
                optional = false;
            }
            _super.call(this, program, name, optional);
        }
        Uniform4f.prototype.setData = function(gl, x, y, z, w) {
            var location = this._location(gl);
            if (Webglimpse.hasval(location)) gl.uniform4f(location, x, y, z, w);
        };
        return Uniform4f;
    }(Uniform);
    Webglimpse.Uniform4f = Uniform4f;
    var UniformMatrix4f = function(_super) {
        __extends(UniformMatrix4f, _super);
        function UniformMatrix4f(program, name, optional) {
            if (typeof optional === "undefined") {
                optional = false;
            }
            _super.call(this, program, name, optional);
        }
        UniformMatrix4f.prototype.setData = function(gl, value, transpose) {
            if (typeof transpose === "undefined") {
                transpose = false;
            }
            var location = this._location(gl);
            if (Webglimpse.hasval(location)) gl.uniformMatrix4fv(location, transpose, value);
        };
        return UniformMatrix4f;
    }(Uniform);
    Webglimpse.UniformMatrix4f = UniformMatrix4f;
    var Uniform1i = function(_super) {
        __extends(Uniform1i, _super);
        function Uniform1i(program, name, optional) {
            if (typeof optional === "undefined") {
                optional = false;
            }
            _super.call(this, program, name, optional);
        }
        Uniform1i.prototype.setData = function(gl, x) {
            var location = this._location(gl);
            if (Webglimpse.hasval(location)) gl.uniform1i(location, x);
        };
        return Uniform1i;
    }(Uniform);
    Webglimpse.Uniform1i = Uniform1i;
    var Uniform2i = function(_super) {
        __extends(Uniform2i, _super);
        function Uniform2i(program, name, optional) {
            if (typeof optional === "undefined") {
                optional = false;
            }
            _super.call(this, program, name, optional);
        }
        Uniform2i.prototype.setData = function(gl, x, y) {
            var location = this._location(gl);
            if (Webglimpse.hasval(location)) gl.uniform2i(location, x, y);
        };
        return Uniform2i;
    }(Uniform);
    Webglimpse.Uniform2i = Uniform2i;
    var Uniform3i = function(_super) {
        __extends(Uniform3i, _super);
        function Uniform3i(program, name, optional) {
            if (typeof optional === "undefined") {
                optional = false;
            }
            _super.call(this, program, name, optional);
        }
        Uniform3i.prototype.setData = function(gl, x, y, z) {
            var location = this._location(gl);
            if (Webglimpse.hasval(location)) gl.uniform3i(location, x, y, z);
        };
        return Uniform3i;
    }(Uniform);
    Webglimpse.Uniform3i = Uniform3i;
    var Uniform4i = function(_super) {
        __extends(Uniform4i, _super);
        function Uniform4i(program, name, optional) {
            if (typeof optional === "undefined") {
                optional = false;
            }
            _super.call(this, program, name, optional);
        }
        Uniform4i.prototype.setData = function(gl, x, y, z, w) {
            var location = this._location(gl);
            if (Webglimpse.hasval(location)) gl.uniform4i(location, x, y, z, w);
        };
        return Uniform4i;
    }(Uniform);
    Webglimpse.Uniform4i = Uniform4i;
    var UniformColor = function(_super) {
        __extends(UniformColor, _super);
        function UniformColor(program, name, optional) {
            if (typeof optional === "undefined") {
                optional = false;
            }
            _super.call(this, program, name, optional);
        }
        UniformColor.prototype.setData = function(gl, color) {
            var location = this._location(gl);
            if (Webglimpse.hasval(location)) gl.uniform4f(location, color.r, color.g, color.b, color.a);
        };
        return UniformColor;
    }(Uniform);
    Webglimpse.UniformColor = UniformColor;
    var UniformSampler2D = function(_super) {
        __extends(UniformSampler2D, _super);
        function UniformSampler2D(program, name, optional) {
            if (typeof optional === "undefined") {
                optional = false;
            }
            _super.call(this, program, name, optional);
        }
        UniformSampler2D.prototype.setDataAndBind = function(gl, textureUnit, texture) {
            var location = this._location(gl);
            if (Webglimpse.hasval(location)) {
                texture.bind(gl, textureUnit);
                gl.uniform1i(location, textureUnit);
                this.currentTexture = texture;
            }
        };
        UniformSampler2D.prototype.unbind = function(gl) {
            if (Webglimpse.hasval(this.currentTexture)) {
                this.currentTexture.unbind(gl);
                this.currentTexture = null;
            }
        };
        return UniformSampler2D;
    }(Uniform);
    Webglimpse.UniformSampler2D = UniformSampler2D;
    var Attribute = function() {
        function Attribute(program, name) {
            this.locations = {};
            this.program = program;
            this.name = name;
        }
        // XXX: Would be nice if this weren't public
        Attribute.prototype._location = function(gl) {
            var glId = Webglimpse.getObjectId(gl);
            if (this.locations[glId] === undefined) {
                var location = gl.getAttribLocation(this.program._program(gl), this.name);
                if (location === -1) throw new Error('Attribute "' + this.name + '" not found');
                this.locations[glId] = location;
            }
            return this.locations[glId];
        };
        Attribute.prototype.setDataAndEnable = function(gl, buffer, size, type, normalized, stride, offset) {
            if (typeof normalized === "undefined") {
                normalized = false;
            }
            if (typeof stride === "undefined") {
                stride = 0;
            }
            if (typeof offset === "undefined") {
                offset = 0;
            }
            var location = this._location(gl);
            gl.enableVertexAttribArray(location);
            buffer.bind(gl, Webglimpse.GL.ARRAY_BUFFER);
            gl.vertexAttribPointer(location, size, type, normalized, stride, offset);
            buffer.unbind(gl, Webglimpse.GL.ARRAY_BUFFER);
        };
        Attribute.prototype.disable = function(gl) {
            gl.disableVertexAttribArray(this._location(gl));
        };
        return Attribute;
    }();
    Webglimpse.Attribute = Attribute;
})(Webglimpse || (Webglimpse = {}));

var Webglimpse;

(function(Webglimpse) {
    var TextureEntry = function() {
        function TextureEntry(gl, target, texture) {
            this.gl = gl;
            this.target = target;
            this.texture = texture;
            this.textureUnit = -1;
        }
        return TextureEntry;
    }();
    var Texture = function() {
        function Texture(helper) {
            this.helper = helper;
            this.textures = {};
        }
        Texture.prototype.bind = function(gl, textureUnit) {
            var glId = Webglimpse.getObjectId(gl);
            if (Webglimpse.hasval(this.textures[glId])) {
                var en = this.textures[glId];
                gl.activeTexture(Webglimpse.GL.TEXTURE0 + textureUnit);
                gl.bindTexture(en.target, en.texture);
                en.textureUnit = textureUnit;
            } else {
                var target = this.helper.target(gl);
                var texture = gl.createTexture();
                if (!Webglimpse.hasval(texture)) throw new Error("Failed to create texture");
                this.textures[glId] = new TextureEntry(gl, target, texture);
                var en = this.textures[glId];
                gl.activeTexture(Webglimpse.GL.TEXTURE0 + textureUnit);
                gl.bindTexture(en.target, en.texture);
                en.textureUnit = textureUnit;
                this.helper.init(gl, target);
            }
        };
        Texture.prototype.unbind = function(gl) {
            var glId = Webglimpse.getObjectId(gl);
            if (Webglimpse.hasval(this.textures[glId])) {
                var en = this.textures[glId];
                gl.activeTexture(Webglimpse.GL.TEXTURE0 + en.textureUnit);
                gl.bindTexture(en.target, null);
                en.textureUnit = -1;
            }
        };
        Texture.prototype.dispose = function() {
            for (var glid in this.textures) {
                if (this.textures.hasOwnProperty(glid)) {
                    var en = this.textures[glid];
                    en.gl.deleteTexture(en.texture);
                }
            }
            this.textures = {};
        };
        return Texture;
    }();
    Webglimpse.Texture = Texture;
    var FloatDataTexture2D = function(_super) {
        __extends(FloatDataTexture2D, _super);
        function FloatDataTexture2D(w, h, array) {
            this._w = w;
            this._h = h;
            _super.call(this, {
                target: function(gl) {
                    return Webglimpse.GL.TEXTURE_2D;
                },
                init: function(gl, target) {
                    if (!gl.getExtension("OES_texture_float")) {
                        throw new Error("OES_texture_float extension is required");
                    }
                    gl.texParameteri(target, Webglimpse.GL.TEXTURE_MAG_FILTER, Webglimpse.GL.NEAREST);
                    gl.texParameteri(target, Webglimpse.GL.TEXTURE_MIN_FILTER, Webglimpse.GL.NEAREST);
                    gl.texParameteri(target, Webglimpse.GL.TEXTURE_WRAP_S, Webglimpse.GL.CLAMP_TO_EDGE);
                    gl.texParameteri(target, Webglimpse.GL.TEXTURE_WRAP_T, Webglimpse.GL.CLAMP_TO_EDGE);
                    // GL.LUMINANCE isn't supported with GL.FLOAT
                    gl.texImage2D(target, 0, Webglimpse.GL.RGBA, w, h, 0, Webglimpse.GL.RGBA, Webglimpse.GL.FLOAT, array);
                }
            });
        }
        Object.defineProperty(FloatDataTexture2D.prototype, "w", {
            get: function() {
                return this._w;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(FloatDataTexture2D.prototype, "h", {
            get: function() {
                return this._h;
            },
            enumerable: true,
            configurable: true
        });
        return FloatDataTexture2D;
    }(Texture);
    Webglimpse.FloatDataTexture2D = FloatDataTexture2D;
    var Texture2D = function(_super) {
        __extends(Texture2D, _super);
        function Texture2D(w, h, minFilter, magFilter, draw) {
            this._w = w;
            this._h = h;
            var canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            draw(canvas.getContext("2d"));
            _super.call(this, {
                target: function(gl) {
                    return Webglimpse.GL.TEXTURE_2D;
                },
                init: function(gl, target) {
                    gl.texParameteri(target, Webglimpse.GL.TEXTURE_MAG_FILTER, magFilter);
                    gl.texParameteri(target, Webglimpse.GL.TEXTURE_MIN_FILTER, minFilter);
                    gl.texParameteri(target, Webglimpse.GL.TEXTURE_WRAP_S, Webglimpse.GL.CLAMP_TO_EDGE);
                    gl.texParameteri(target, Webglimpse.GL.TEXTURE_WRAP_T, Webglimpse.GL.CLAMP_TO_EDGE);
                    gl.texImage2D(target, 0, Webglimpse.GL.RGBA, Webglimpse.GL.RGBA, Webglimpse.GL.UNSIGNED_BYTE, canvas);
                }
            });
        }
        Object.defineProperty(Texture2D.prototype, "w", {
            get: function() {
                return this._w;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Texture2D.prototype, "h", {
            get: function() {
                return this._h;
            },
            enumerable: true,
            configurable: true
        });
        return Texture2D;
    }(Texture);
    Webglimpse.Texture2D = Texture2D;
    var TextureRenderer = function() {
        function TextureRenderer() {
            this.textureRenderer_VERTSHADER = Webglimpse.concatLines("                                                                                                                 ", "  uniform vec2 u_XyFrac;                                                                                         ", "  uniform vec2 u_Anchor;                                                                                         ", "  uniform float u_Rotation_CCWRAD;                                                                               ", "  uniform vec2 u_ImageSize;                                                                                      ", "  uniform vec2 u_ViewportSize;                                                                                   ", "                                                                                                                 ", "  attribute vec2 a_ImageFrac;                                                                                    ", "                                                                                                                 ", "  varying vec2 v_StCoord;                                                                                        ", "                                                                                                                 ", "  void main( ) {                                                                                                 ", "      float cosRot = cos( u_Rotation_CCWRAD );                                                                   ", "      float sinRot = sin( u_Rotation_CCWRAD );                                                                   ", "                                                                                                                 ", "      // Column major                                                                                            ", "      mat2 rotation = mat2( cosRot, sinRot,                                                                      ", "                           -sinRot, cosRot );                                                                    ", "                                                                                                                 ", "      vec2 xy = -1.0 + 2.0*( u_XyFrac + rotation*( u_ImageSize*( a_ImageFrac - u_Anchor ) ) / u_ViewportSize );  ", "      gl_Position = vec4( xy, 0.0, 1.0 );                                                                        ", "                                                                                                                 ", "      v_StCoord = vec2( a_ImageFrac.x, 1.0 - a_ImageFrac.y );                                                    ", "  }                                                                                                              ", "                                                                                                                 ");
            this.textureRenderer_FRAGSHADER = Webglimpse.concatLines("                                                         ", "  precision mediump float;                               ", "                                                         ", "  uniform sampler2D u_Sampler;                           ", "                                                         ", "  varying vec2 v_StCoord;                                ", "                                                         ", "  void main( ) {                                         ", "      gl_FragColor = texture2D( u_Sampler, v_StCoord );  ", "  }                                                      ", "                                                         ");
            this.program = new Webglimpse.Program(this.textureRenderer_VERTSHADER, this.textureRenderer_FRAGSHADER);
            this.u_XyFrac = new Webglimpse.Uniform2f(this.program, "u_XyFrac");
            this.u_Anchor = new Webglimpse.Uniform2f(this.program, "u_Anchor");
            this.u_Rotation_CCWRAD = new Webglimpse.Uniform1f(this.program, "u_Rotation_CCWRAD");
            this.u_ImageSize = new Webglimpse.Uniform2f(this.program, "u_ImageSize");
            this.u_ViewportSize = new Webglimpse.Uniform2f(this.program, "u_ViewportSize");
            this.u_Sampler = new Webglimpse.UniformSampler2D(this.program, "u_Sampler");
            this.a_ImageFrac = new Webglimpse.Attribute(this.program, "a_ImageFrac");
            this.imageFracData = Webglimpse.newStaticBuffer(new Float32Array([ 0, 0, 0, 1, 1, 0, 1, 1 ]));
            this.wViewport = 0;
            this.hViewport = 0;
        }
        TextureRenderer.prototype.begin = function(gl, viewport) {
            gl.blendFuncSeparate(Webglimpse.GL.SRC_ALPHA, Webglimpse.GL.ONE_MINUS_SRC_ALPHA, Webglimpse.GL.ONE, Webglimpse.GL.ONE_MINUS_SRC_ALPHA);
            gl.enable(Webglimpse.GL.BLEND);
            this.program.use(gl);
            this.u_ViewportSize.setData(gl, viewport.w, viewport.h);
            this.a_ImageFrac.setDataAndEnable(gl, this.imageFracData, 2, Webglimpse.GL.FLOAT);
            this.wViewport = viewport.w;
            this.hViewport = viewport.h;
        };
        TextureRenderer.prototype.draw = function(gl, texture, xFrac, yFrac, options) {
            var xAnchor = Webglimpse.hasval(options) && Webglimpse.hasval(options.xAnchor) ? options.xAnchor : .5;
            var yAnchor = Webglimpse.hasval(options) && Webglimpse.hasval(options.yAnchor) ? options.yAnchor : .5;
            var rotation_CCWRAD = Webglimpse.hasval(options) && Webglimpse.hasval(options.rotation_CCWRAD) ? options.rotation_CCWRAD : 0;
            var width = Webglimpse.hasval(options) && Webglimpse.hasval(options.width) ? options.width : texture.w;
            var height = Webglimpse.hasval(options) && Webglimpse.hasval(options.height) ? options.height : texture.h;
            this.u_XyFrac.setData(gl, Webglimpse.nearestPixel(xFrac, this.wViewport, xAnchor, texture.w), Webglimpse.nearestPixel(yFrac, this.hViewport, yAnchor, texture.h));
            this.u_Anchor.setData(gl, xAnchor, yAnchor);
            this.u_Rotation_CCWRAD.setData(gl, rotation_CCWRAD);
            this.u_ImageSize.setData(gl, width, height);
            this.u_Sampler.setDataAndBind(gl, 0, texture);
            gl.drawArrays(Webglimpse.GL.TRIANGLE_STRIP, 0, 4);
        };
        TextureRenderer.prototype.end = function(gl) {
            this.a_ImageFrac.disable(gl);
            this.u_Sampler.unbind(gl);
            this.program.endUse(gl);
        };
        return TextureRenderer;
    }();
    Webglimpse.TextureRenderer = TextureRenderer;
})(Webglimpse || (Webglimpse = {}));

var Webglimpse;

(function(Webglimpse) {
    var textDim = function() {
        // Use div to figure out how big our texture needs to be
        var div = document.createElement("div");
        div.style.setProperty("position", "absolute");
        div.style.setProperty("padding", "0");
        div.style.setProperty("margin", "0");
        div.style.setProperty("width", "auto");
        div.style.setProperty("height", "auto");
        div.style.setProperty("visibility", "hidden");
        return function(s, font) {
            div.style.setProperty("font", font);
            div.textContent = s;
            document.body.appendChild(div);
            var width = div.clientWidth;
            var height = div.clientHeight;
            document.body.removeChild(div);
            return {
                w: width,
                h: height
            };
        };
    }();
    function newFontMetricsCache() {
        return new Webglimpse.Cache({
            create: function(font) {
                var dim = textDim("fMgyj", font);
                var w = dim.w;
                var h = dim.h;
                var canvas = document.createElement("canvas");
                canvas.width = w;
                canvas.height = h;
                var g = canvas.getContext("2d");
                g.font = font;
                g.textAlign = "left";
                g.textBaseline = "top";
                g.fillStyle = "black";
                g.clearRect(0, 0, w, h);
                g.fillText("fM", 0, 0);
                var rgbaData = g.getImageData(0, 0, w, h).data;
                var jTop = -1;
                for (var j = 0; j < h && jTop < 0; j++) {
                    for (var i = 0; i < w && jTop < 0; i++) {
                        var alpha = rgbaData[(j * w + i) * 4 + 3];
                        if (alpha !== 0) jTop = j;
                    }
                }
                var jBaseline = -1;
                for (var j = h - 1; j >= 0 && jBaseline < 0; j--) {
                    for (var i = 0; i < w && jBaseline < 0; i++) {
                        var alpha = rgbaData[(j * w + i) * 4 + 3];
                        if (alpha !== 0) jBaseline = j;
                    }
                }
                g.clearRect(0, 0, w, h);
                g.fillText("gyj", 0, 0);
                var rgbaData = g.getImageData(0, 0, w, h).data;
                var jBottom = -1;
                for (var j = h - 1; j >= 0 && jBottom < 0; j--) {
                    for (var i = 0; i < w && jBottom < 0; i++) {
                        var alpha = rgbaData[(j * w + i) * 4 + 3];
                        if (alpha !== 0) jBottom = j;
                    }
                }
                return {
                    jTop: jTop,
                    jBaseline: jBaseline,
                    jBottom: jBottom
                };
            },
            dispose: function() {}
        });
    }
    var getRawFontMetrics = function() {
        var cache = newFontMetricsCache();
        return function(font) {
            return cache.value(font);
        };
    }();
    var getTextWidth = function() {
        var canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        var g = canvas.getContext("2d");
        g.textAlign = "left";
        g.textBaseline = "top";
        return function(font, text) {
            g.font = font;
            return g.measureText(text).width;
        };
    }();
    var TextTexture2D = function(_super) {
        __extends(TextTexture2D, _super);
        function TextTexture2D(w, h, jBaseline, minFilter, magFilter, draw) {
            _super.call(this, w, h, minFilter, magFilter, draw);
            this._jBaseline = jBaseline;
        }
        Object.defineProperty(TextTexture2D.prototype, "jBaseline", {
            get: function() {
                return this._jBaseline;
            },
            enumerable: true,
            configurable: true
        });
        TextTexture2D.prototype.yAnchor = function(textFrac) {
            // Things tend to look the way you expect if textFrac is interpreted as
            // a fraction of the way from the bottom of the baseline pixel up to the
            // top of the top pixel
            //
            var bottom = this.jBaseline + 1;
            var h = this.h;
            return 1 - (1 - textFrac) * bottom / h;
        };
        return TextTexture2D;
    }(Webglimpse.Texture2D);
    Webglimpse.TextTexture2D = TextTexture2D;
    function newTextTextureCache(font, color) {
        var createTextTexture = createTextTextureFactory(font);
        return new Webglimpse.Cache({
            create: function(text) {
                return createTextTexture(color, text);
            },
            dispose: function(texture) {
                texture.dispose();
            }
        });
    }
    Webglimpse.newTextTextureCache = newTextTextureCache;
    function newTextTextureCache2(font) {
        var createTextTexture = createTextTextureFactory(font);
        return new Webglimpse.TwoKeyCache({
            create: function(rgbaString, text) {
                var color = Webglimpse.parseRgba(rgbaString);
                return createTextTexture(color, text);
            },
            dispose: function(texture) {
                texture.dispose();
            }
        });
    }
    Webglimpse.newTextTextureCache2 = newTextTextureCache2;
    function newTextTextureCache3() {
        return new Webglimpse.ThreeKeyCache({
            create: function(font, rgbaString, text) {
                var createTextTexture = createTextTextureFactory(font);
                var color = Webglimpse.parseRgba(rgbaString);
                return createTextTexture(color, text);
            },
            dispose: function(texture) {
                texture.dispose();
            }
        });
    }
    Webglimpse.newTextTextureCache3 = newTextTextureCache3;
    function createTextTextureFactory(font) {
        var rawFontMetrics = getRawFontMetrics(font);
        var jBaseline = rawFontMetrics.jBaseline - rawFontMetrics.jTop;
        var h = rawFontMetrics.jBottom - rawFontMetrics.jTop + 1;
        return function(color, text) {
            var w = getTextWidth(font, text);
            return new TextTexture2D(w, h, jBaseline, Webglimpse.GL.NEAREST, Webglimpse.GL.NEAREST, function(g) {
                // Some browsers use hinting for canvas fillText! This behaves poorly on a transparent
                // background -- so we draw white text onto a black background, then infer alpha from
                // the pixel color (black = transparent, white = opaque).
                //
                // We compute alpha as (R+G+B)/3. This grayscales the image the browser drew, effectively
                // de-hinting it.
                //
                g.fillStyle = "black";
                g.fillRect(0, 0, w, h);
                g.font = font;
                g.textAlign = "left";
                g.textBaseline = "top";
                g.fillStyle = "white";
                g.save();
                g.translate(0, -rawFontMetrics.jTop);
                g.fillText(text, 0, 0);
                g.restore();
                var r255 = 255 * color.r;
                var g255 = 255 * color.g;
                var b255 = 255 * color.b;
                var aFactor = color.a / 3;
                var pixels = g.getImageData(0, 0, w, h);
                for (var j = 0; j < pixels.height; j++) {
                    for (var i = 0; i < pixels.width; i++) {
                        var pixelOffset = (j * pixels.width + i) * 4;
                        var a255 = aFactor * (pixels.data[pixelOffset + 0] + pixels.data[pixelOffset + 1] + pixels.data[pixelOffset + 2]);
                        pixels.data[pixelOffset + 0] = r255;
                        pixels.data[pixelOffset + 1] = g255;
                        pixels.data[pixelOffset + 2] = b255;
                        pixels.data[pixelOffset + 3] = a255;
                    }
                }
                g.putImageData(pixels, 0, 0);
            });
        };
    }
    Webglimpse.createTextTextureFactory = createTextTextureFactory;
    function newTextHintsCache(font) {
        var rawFontMetrics = getRawFontMetrics(font);
        var jBaseline = rawFontMetrics.jBaseline - rawFontMetrics.jTop;
        var h = rawFontMetrics.jBottom - rawFontMetrics.jTop + 1;
        return new Webglimpse.Cache({
            create: function(text) {
                var w = getTextWidth(font, text);
                // XXX: For now, assuming subpixels are horizontal-RGB
                // Draw text triple-sized, to get an alpha for each r,g,b subpixel
                var canvas3 = document.createElement("canvas");
                canvas3.width = 3 * w;
                canvas3.height = h;
                var g3 = canvas3.getContext("2d");
                g3.fillStyle = "black";
                g3.fillRect(0, 0, canvas3.width, canvas3.height);
                g3.save();
                g3.translate(0, -rawFontMetrics.jTop);
                g3.scale(3, 1);
                g3.font = font;
                g3.textAlign = "left";
                g3.textBaseline = "top";
                g3.fillStyle = "white";
                g3.fillText(text, 0, 0);
                g3.restore();
                var srcRgba = g3.getImageData(0, 0, canvas3.width, canvas3.height).data;
                return new Webglimpse.Texture2D(w, h, Webglimpse.GL.NEAREST, Webglimpse.GL.NEAREST, function(g) {
                    var destImage = g.createImageData(w, h);
                    var destRgba = destImage.data;
                    var weightLeft = 1;
                    var weightCenter = 2;
                    var weightRight = 1;
                    var weightNorm = 1 / (weightLeft + weightCenter + weightRight);
                    for (var j = 0; j < h; j++) {
                        for (var i = 0; i < w; i++) {
                            // Get alpha values for relevant src-pixels: one from just left of the dest-pixel, all
                            // three from inside the dest-pixel, and one from just right of the dest-pixel.
                            //
                            // Some browsers use hinting for canvas fillText! This behaves poorly on a transparent
                            // background -- so we draw white text onto a black background, then infer alpha from
                            // the pixel color (black = transparent, white = opaque).
                            //
                            // We compute alpha as (R+G+B)/3. This grayscales the image the browser drew, effectively
                            // de-hinting it so that we can re-hint it ourselves later (during blending, when the
                            // background color is known).
                            //
                            var srcPixelIndex = (j * 3 * w + 3 * i) * 4;
                            var srcAlphaL = i > 0 ? (srcRgba[srcPixelIndex - 4] + srcRgba[srcPixelIndex - 3] + srcRgba[srcPixelIndex - 2]) / (3 * 255) : 0;
                            var srcAlpha0 = (srcRgba[srcPixelIndex + 0] + srcRgba[srcPixelIndex + 1] + srcRgba[srcPixelIndex + 2]) / (3 * 255);
                            var srcAlpha1 = (srcRgba[srcPixelIndex + 4] + srcRgba[srcPixelIndex + 5] + srcRgba[srcPixelIndex + 6]) / (3 * 255);
                            var srcAlpha2 = (srcRgba[srcPixelIndex + 8] + srcRgba[srcPixelIndex + 9] + srcRgba[srcPixelIndex + 10]) / (3 * 255);
                            var srcAlphaR = i < w - 1 ? (srcRgba[srcPixelIndex + 12] + srcRgba[srcPixelIndex + 13] + srcRgba[srcPixelIndex + 14]) / (3 * 255) : 0;
                            // Weighted averages to find subpixel alphas
                            var alphaLeft = weightNorm * (weightLeft * srcAlphaL + weightCenter * srcAlpha0 + weightRight * srcAlpha1);
                            var alphaCenter = weightNorm * (weightLeft * srcAlpha0 + weightCenter * srcAlpha1 + weightRight * srcAlpha2);
                            var alphaRight = weightNorm * (weightLeft * srcAlpha1 + weightCenter * srcAlpha2 + weightRight * srcAlphaR);
                            // Store subpixel alphas in dest-pixel
                            var destPixelIndex = (j * w + i) * 4;
                            destRgba[destPixelIndex + 0] = Math.round(255 * alphaLeft);
                            destRgba[destPixelIndex + 1] = Math.round(255 * alphaCenter);
                            destRgba[destPixelIndex + 2] = Math.round(255 * alphaRight);
                            // Alpha will be used in computing final alpha of blended result -- use the average of
                            // the subpixel alphas
                            //
                            // If alpha is 1, Firefox will interpret it as 100%. Causes some pixels that should be
                            // very dim to come out very bright. As a workaround, nudge them down to zero.
                            //
                            var alphaAvg = Math.round(255 * (alphaLeft + alphaCenter + alphaRight) / 3);
                            destRgba[destPixelIndex + 3] = alphaAvg === 1 ? 0 : alphaAvg;
                        }
                    }
                    g.putImageData(destImage, 0, 0);
                });
            },
            dispose: function(texture) {
                texture.dispose();
            }
        });
    }
    Webglimpse.newTextHintsCache = newTextHintsCache;
    var HintedTextRenderer = function() {
        function HintedTextRenderer() {
            this.textRenderer_VERTSHADER = Webglimpse.concatLines("                                                                                                  ", "  uniform vec2 u_XyFrac;                                                                          ", "  uniform vec2 u_Anchor;                                                                          ", "  uniform vec2 u_ImageSize;                                                                       ", "  uniform vec2 u_ViewportSize;                                                                    ", "                                                                                                  ", "  attribute vec2 a_ImageFrac;                                                                     ", "                                                                                                  ", "  varying vec2 v_StCoord;                                                                         ", "                                                                                                  ", "  void main( ) {                                                                                  ", "      vec2 xy = -1.0 + 2.0*( u_XyFrac + u_ImageSize*( a_ImageFrac - u_Anchor )/u_ViewportSize );  ", "      gl_Position = vec4( xy, 0.0, 1.0 );                                                         ", "                                                                                                  ", "      v_StCoord = vec2( a_ImageFrac.x, 1.0 - a_ImageFrac.y );                                     ", "  }                                                                                               ", "                                                                                                  ");
            this.textRenderer_FRAGSHADER = Webglimpse.concatLines("                                                                 ", "  precision mediump float;                                       ", "                                                                 ", "  uniform sampler2D u_Hints;                                     ", "  uniform float u_Alpha;                                         ", "                                                                 ", "  varying vec2 v_StCoord;                                        ", "                                                                 ", "  void main( ) {                                                 ", "      gl_FragColor = u_Alpha * texture2D( u_Hints, v_StCoord );  ", "  }                                                              ", "                                                                 ");
            this.program = new Webglimpse.Program(this.textRenderer_VERTSHADER, this.textRenderer_FRAGSHADER);
            this.u_XyFrac = new Webglimpse.Uniform2f(this.program, "u_XyFrac");
            this.u_Anchor = new Webglimpse.Uniform2f(this.program, "u_Anchor");
            this.u_ImageSize = new Webglimpse.Uniform2f(this.program, "u_ImageSize");
            this.u_ViewportSize = new Webglimpse.Uniform2f(this.program, "u_ViewportSize");
            this.u_Alpha = new Webglimpse.Uniform1f(this.program, "u_Alpha");
            this.u_Hints = new Webglimpse.UniformSampler2D(this.program, "u_Hints");
            this.a_ImageFrac = new Webglimpse.Attribute(this.program, "a_ImageFrac");
            this.imageFracData = Webglimpse.newStaticBuffer(new Float32Array([ 0, 0, 0, 1, 1, 0, 1, 1 ]));
            this.wViewport = 0;
            this.hViewport = 0;
        }
        HintedTextRenderer.prototype.begin = function(gl, viewport) {
            this.program.use(gl);
            this.u_ViewportSize.setData(gl, viewport.w, viewport.h);
            this.a_ImageFrac.setDataAndEnable(gl, this.imageFracData, 2, Webglimpse.GL.FLOAT);
            this.wViewport = viewport.w;
            this.hViewport = viewport.h;
        };
        HintedTextRenderer.prototype.draw = function(gl, hints, xFrac, yFrac, options) {
            var xAnchor = Webglimpse.hasval(options) && Webglimpse.hasval(options.xAnchor) ? options.xAnchor : .5;
            var yAnchor = Webglimpse.hasval(options) && Webglimpse.hasval(options.yAnchor) ? options.yAnchor : .5;
            var color = Webglimpse.hasval(options) && Webglimpse.hasval(options.color) ? options.color : Webglimpse.black;
            // The hints texture stores subpixel alphas in its R,G,B components. For example, a red hint-pixel indicates
            // that, at that pixel, the final R component should be color.r (R_hint=1, so red is opaque), but the
            // final G and B components should be the G and B from the background pixel (G_hint=0, B_hint=0, so green
            // and blue are transparent).
            //
            // GL does not allow arbitrary blending, but we can use the blending options it does provide to get the effect
            // we want.
            //
            // There are 4 things to keep an eye on:
            //
            // 1. The RGB part of color, which is put into glBlendColor
            // 2. The A part of color, which is sent to the frag-shader (NOT passed to glBlendColor)
            // 3. The subpixel alphas, which are sent to the frag-shader in the hints-texture
            // 4. The glBlendFunc, which is set up in an unusual way
            //
            //
            // With this setup, we get:
            //
            //    R_final = ( R_frag )*R_foreground + ( 1 - R_frag )*R_background
            //    G_final = ( G_frag )*G_foreground + ( 1 - G_frag )*G_background
            //    B_final = ( B_frag )*B_foreground + ( 1 - B_frag )*B_background
            //    A_final = ( A_frag )*1            + ( 1 - A_frag )*A_background
            //
            // So R_frag, the output from the frag shader, is a weight that is used to take a weighted average between
            // foreground and background colors.
            //
            // The frag-shader is doing A_foreground*RGBA_hint. Conceptually, R_hint is really a subpixel alpha for the
            // red subpixel, so it is helpful to call it A_redhint (and analogously for G and B):
            //
            //    R_frag = A_foreground * A_redhint
            //    G_frag = A_foreground * A_greenhint
            //    B_frag = A_foreground * A_bluehint
            //
            // So the blended RGB is a weighted average of RGB_foreground and RGB_background, with a weighting factor of
            // ( A_foreground * A_subpixel ), where A_subpixel is either A_redhint, A_greenhint, or A_bluehint. Basically,
            // we have a separate alpha for each subpixel!
            //
            //
            // For the final alpha component, we want:
            //
            //    A_final = ( 1 - (1-A_background)*(1-A_frag) )
            //
            // A little algebra shows that to be equivalent to:
            //
            //    A_final = ( A_frag )*1 + ( 1 - A_frag )*A_background
            //
            // Which is exactly what we get, as long as we pass an alpha of 1 into glBlendColor.
            //
            //
            this.u_XyFrac.setData(gl, Webglimpse.nearestPixel(xFrac, this.wViewport, xAnchor, hints.w), Webglimpse.nearestPixel(yFrac, this.hViewport, yAnchor, hints.h));
            this.u_Anchor.setData(gl, xAnchor, yAnchor);
            this.u_ImageSize.setData(gl, hints.w, hints.h);
            this.u_Alpha.setData(gl, color.a);
            this.u_Hints.setDataAndBind(gl, 0, hints);
            gl.enable(Webglimpse.GL.BLEND);
            gl.blendColor(color.r, color.g, color.b, 1);
            gl.blendFunc(Webglimpse.GL.CONSTANT_COLOR, Webglimpse.GL.ONE_MINUS_SRC_COLOR);
            gl.drawArrays(Webglimpse.GL.TRIANGLE_STRIP, 0, 4);
        };
        HintedTextRenderer.prototype.end = function(gl) {
            this.a_ImageFrac.disable(gl);
            this.u_Hints.unbind(gl);
            this.program.endUse(gl);
        };
        return HintedTextRenderer;
    }();
    Webglimpse.HintedTextRenderer = HintedTextRenderer;
})(Webglimpse || (Webglimpse = {}));

var Webglimpse;

(function(Webglimpse) {
    function xFrac(ev) {
        return ev.paneViewport.xFrac(ev.i);
    }
    Webglimpse.xFrac = xFrac;
    function yFrac(ev) {
        return ev.paneViewport.yFrac(ev.j);
    }
    Webglimpse.yFrac = yFrac;
    var PaneChild = function() {
        function PaneChild(pane, layoutArg, layoutOptions) {
            this.pane = pane;
            this.layoutArg = layoutArg;
            this.layoutOptions = layoutOptions;
            this.viewport = Webglimpse.newBoundsFromRect(0, 0, 0, 0);
            this.scissor = Webglimpse.newBoundsFromRect(0, 0, 0, 0);
            this.prefSize = {
                w: 0,
                h: 0
            };
        }
        return PaneChild;
    }();
    var Pane = function() {
        function Pane(layout, consumesInputEvents, isInside) {
            if (typeof consumesInputEvents === "undefined") {
                consumesInputEvents = true;
            }
            if (typeof isInside === "undefined") {
                isInside = Webglimpse.alwaysTrue;
            }
            var _this = this;
            // Input Handling
            //
            this._mouseUp = new Webglimpse.Notification1();
            this._mouseDown = new Webglimpse.Notification1();
            this._mouseMove = new Webglimpse.Notification1();
            this._mouseWheel = new Webglimpse.Notification1();
            this._mouseEnter = new Webglimpse.Notification1();
            this._mouseExit = new Webglimpse.Notification1();
            this._contextMenu = new Webglimpse.Notification1();
            this.painters = [];
            this.consumesInputEvents = consumesInputEvents;
            this.isInside = isInside;
            this._mouseCursor = consumesInputEvents ? "default" : null;
            this._mouseCursorChanged = new Webglimpse.Notification();
            this._childMouseCursorListener = function() {
                return _this._mouseCursorChanged.fire();
            };
            this.children = new Webglimpse.OrderedSet([], function(paneChild) {
                return Webglimpse.getObjectId(paneChild.pane);
            }, false);
            this._layout = layout;
            this._viewport = Webglimpse.newBoundsFromRect(0, 0, 0, 0);
            this._scissor = Webglimpse.newBoundsFromRect(0, 0, 0, 0);
            this._viewportChanged = new Webglimpse.Notification();
            this._dispose = new Webglimpse.Notification();
            this._dispose.on(function() {
                _this._mouseUp.dispose();
                _this._mouseDown.dispose();
                _this._mouseMove.dispose();
                _this._mouseWheel.dispose();
                _this._mouseEnter.dispose();
                _this._mouseExit.dispose();
                _this._contextMenu.dispose();
                for (var i = 0; i < _this.children.length; i++) {
                    _this.children.valueAt(i).pane.dispose.fire();
                }
            });
        }
        Object.defineProperty(Pane.prototype, "layout", {
            get: function() {
                return this.layout;
            },
            set: function(layout) {
                this._layout = layout;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Pane.prototype, "mouseCursor", {
            get: function() {
                return this._mouseCursor;
            },
            set: function(mouseCursor) {
                if (mouseCursor !== this._mouseCursor) {
                    this._mouseCursor = mouseCursor;
                    this._mouseCursorChanged.fire();
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Pane.prototype, "mouseCursorChanged", {
            get: function() {
                return this._mouseCursorChanged;
            },
            enumerable: true,
            configurable: true
        });
        Pane.prototype.addPainter = function(painter) {
            this.painters.push(painter);
        };
        Pane.prototype.addPane = function(pane, layoutArg, layoutOptions) {
            if (typeof layoutArg === "undefined") {
                layoutArg = null;
            }
            if (typeof layoutOptions === "undefined") {
                layoutOptions = {};
            }
            this.children.add(new PaneChild(pane, layoutArg, layoutOptions));
            pane.mouseCursorChanged.on(this._childMouseCursorListener);
        };
        Pane.prototype.removePane = function(pane) {
            this.children.removeValue(this._childFor(pane));
            pane.mouseCursorChanged.off(this._childMouseCursorListener);
        };
        Pane.prototype.layoutArg = function(pane) {
            return this._childFor(pane).layoutArg;
        };
        Pane.prototype.setLayoutArg = function(pane, layoutArg) {
            this._childFor(pane).layoutArg = layoutArg;
        };
        Pane.prototype.updateLayoutArgs = function(updateFn) {
            for (var c = 0; c < this.children.length; c++) {
                var child = this.children.valueAt(c);
                child.layoutArg = updateFn(child.layoutArg, child.layoutOptions);
            }
        };
        Pane.prototype.layoutOptions = function(pane) {
            return this._childFor(pane).layoutOptions;
        };
        Pane.prototype._childFor = function(pane) {
            return this.children.valueFor(Webglimpse.getObjectId(pane));
        };
        // Layout & Paint
        //
        Pane.prototype.updatePrefSizes = function(result) {
            for (var c = 0; c < this.children.length; c++) {
                var child = this.children.valueAt(c);
                child.pane.updatePrefSizes(child.prefSize);
            }
            // This pane
            if (Webglimpse.hasval(this._layout) && Webglimpse.hasval(this._layout.updatePrefSize)) {
                this._layout.updatePrefSize(result, this.children.toArray());
            } else {
                result.w = null;
                result.h = null;
            }
        };
        Pane.prototype.updateBounds = function(viewport, scissor) {
            // This pane
            var viewportChanged = viewport.iStart !== this._viewport.iStart || viewport.iEnd !== this._viewport.iEnd || viewport.jStart !== this._viewport.jStart || viewport.jEnd !== this._viewport.jEnd;
            this._viewport.setBounds(viewport);
            this._scissor.setBounds(scissor);
            // Child panes
            if (Webglimpse.hasval(this._layout) && Webglimpse.hasval(this._layout.updateChildViewports)) {
                this._layout.updateChildViewports(this.children.toArray(), viewport);
                for (var c = 0; c < this.children.length; c++) {
                    var child = this.children.valueAt(c);
                    child.scissor.setBounds(child.viewport.unmod);
                    child.scissor.cropToBounds(scissor);
                    child.pane.updateBounds(child.viewport.unmod, child.scissor.unmod);
                }
            } else if (this.children.length > 0) {
                throw new Error("Pane has " + this.children.length + " " + (this.children.length === 1 ? "child" : "children") + ", but its layout is " + this.layout);
            }
            // Notify
            if (viewportChanged) {
                this._viewportChanged.fire();
            }
        };
        Pane.prototype.paint = function(gl) {
            var viewport = this._viewport.unmod;
            var scissor = this._scissor.unmod;
            if (scissor.w > 0 && scissor.h > 0) {
                // This pane
                gl.viewport(viewport.i, viewport.j, viewport.w, viewport.h);
                gl.enable(Webglimpse.GL.SCISSOR_TEST);
                gl.scissor(scissor.i, scissor.j, scissor.w, scissor.h);
                for (var p = 0; p < this.painters.length; p++) {
                    this.painters[p](gl, viewport);
                }
                for (var c = 0; c < this.children.length; c++) {
                    this.children.valueAt(c).pane.paint(gl);
                }
            }
        };
        Object.defineProperty(Pane.prototype, "viewport", {
            get: function() {
                return this._viewport.unmod;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Pane.prototype, "scissor", {
            get: function() {
                return this._scissor.unmod;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Pane.prototype, "viewportChanged", {
            get: function() {
                return this._viewportChanged;
            },
            enumerable: true,
            configurable: true
        });
        Pane.prototype.panesAt = function(i, j) {
            var result = [];
            this._panesAt(i, j, result);
            return result;
        };
        Pane.prototype._panesAt = function(i, j, result) {
            if (this._scissor.contains(i, j)) {
                for (var c = this.children.length - 1; c >= 0; c--) {
                    var consumed = this.children.valueAt(c).pane._panesAt(i, j, result);
                    if (consumed) return true;
                }
                if (this.isInside(this._viewport.unmod, i, j)) {
                    result.push(this);
                    return this.consumesInputEvents;
                }
            }
            return false;
        };
        Object.defineProperty(Pane.prototype, "mouseUp", {
            get: function() {
                return this._mouseUp;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Pane.prototype, "mouseDown", {
            get: function() {
                return this._mouseDown;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Pane.prototype, "mouseMove", {
            get: function() {
                return this._mouseMove;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Pane.prototype, "mouseWheel", {
            get: function() {
                return this._mouseWheel;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Pane.prototype, "mouseEnter", {
            get: function() {
                return this._mouseEnter;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Pane.prototype, "mouseExit", {
            get: function() {
                return this._mouseExit;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Pane.prototype, "contextMenu", {
            get: function() {
                return this._contextMenu;
            },
            enumerable: true,
            configurable: true
        });
        Pane.prototype.fireMouseUp = function(i, j, clickCount, mouseEvent) {
            return this._mouseUp.fire({
                paneViewport: this._viewport.unmod,
                i: i,
                j: j,
                clickCount: clickCount,
                mouseEvent: mouseEvent
            });
        };
        Pane.prototype.fireMouseDown = function(i, j, clickCount, mouseEvent) {
            return this._mouseDown.fire({
                paneViewport: this._viewport.unmod,
                i: i,
                j: j,
                clickCount: clickCount,
                mouseEvent: mouseEvent
            });
        };
        Pane.prototype.fireMouseMove = function(i, j, mouseEvent) {
            return this._mouseMove.fire({
                paneViewport: this._viewport.unmod,
                i: i,
                j: j,
                mouseEvent: mouseEvent
            });
        };
        Pane.prototype.fireMouseWheel = function(i, j, wheelSteps, mouseEvent) {
            return this._mouseWheel.fire({
                paneViewport: this._viewport.unmod,
                i: i,
                j: j,
                wheelSteps: wheelSteps,
                mouseEvent: mouseEvent
            });
        };
        Pane.prototype.fireMouseEnter = function(i, j, mouseEvent) {
            return this._mouseEnter.fire({
                paneViewport: this._viewport.unmod,
                i: i,
                j: j,
                mouseEvent: mouseEvent
            });
        };
        Pane.prototype.fireMouseExit = function(i, j, mouseEvent) {
            return this._mouseExit.fire({
                paneViewport: this._viewport.unmod,
                i: i,
                j: j,
                mouseEvent: mouseEvent
            });
        };
        Pane.prototype.fireContextMenu = function(i, j, mouseEvent) {
            return this._contextMenu.fire({
                paneViewport: this._viewport.unmod,
                i: i,
                j: j,
                mouseEvent: mouseEvent
            });
        };
        Object.defineProperty(Pane.prototype, "dispose", {
            // Disposal
            //
            get: function() {
                return this._dispose;
            },
            enumerable: true,
            configurable: true
        });
        return Pane;
    }();
    Webglimpse.Pane = Pane;
    function requireGL(canvasElement) {
        try {
            var glA = canvasElement.getContext("webgl");
            if (glA) return glA;
        } catch (e) {}
        try {
            var glB = canvasElement.getContext("experimental-webgl");
            if (glB) return glB;
        } catch (e) {}
        throw new Error("WebGLContextCreationError");
    }
    Webglimpse.requireGL = requireGL;
    function iMouse(element, ev) {
        return ev.clientX - element.getBoundingClientRect().left;
    }
    function jMouse(element, ev) {
        return element.clientHeight - (ev.clientY - element.getBoundingClientRect().top);
    }
    function mouseWheelSteps(ev) {
        // Firefox puts the scroll amount in the 'detail' field; everybody else puts it in 'wheelDelta'
        // Firefox uses positive values for a downward scroll; everybody else uses positive for upward
        var raw = ev.wheelDelta !== undefined ? ev.wheelDelta : -ev.detail;
        if (raw > 0) {
            return -1;
        }
        if (raw < 0) {
            return +1;
        }
        return 0;
    }
    // Button presses for mouse events are reported differently in different browsers:
    // The results below are for the following browser versions:
    // Chrome Version 40.0.2214.94 (64-bit)
    // Firefox 35.0.1
    // IE 11.0.9600.17501
    //
    // ‘mousemove’ event with left mouse button down:
    //
    //                        Chrome                Firefox                  IE
    // MouseEvent.button      0                     0                        0
    // MouseEvent.buttons     1                     1                        1
    // MouseEvent.which       1                     1                        1
    //
    // ‘mousemove’ event with no mouse button down:
    //
    //                        Chrome                Firefox                  IE
    // MouseEvent.button      0                     0                        0
    // MouseEvent.buttons     undefined             0                        0
    // MouseEvent.which       0                     1                        1
    //
    //
    // For more info see: http://stackoverflow.com/questions/3944122/detect-left-mouse-button-press
    //
    function isLeftMouseDown(ev) {
        // it appears that ev.buttons works across the board now, so ev.buttons === 1 is probably all that is necessary
        if (ev.buttons !== undefined) {
            return ev.buttons === 1;
        } else {
            return ev.which === 1;
        }
    }
    Webglimpse.isLeftMouseDown = isLeftMouseDown;
    // detects whether any mouse button is down
    function isMouseDown(ev) {
        return ev.buttons !== 0;
    }
    Webglimpse.isMouseDown = isMouseDown;
    function attachEventListeners(element, contentPane) {
        function detectEntersAndExits(oldPanes, newPanes, i, j, mouseEvent) {
            for (var n = 0; n < oldPanes.length; n++) {
                oldPanes[n]["isHovered"] = false;
            }
            for (var n = 0; n < newPanes.length; n++) {
                newPanes[n]["isHovered"] = true;
            }
            for (var n = 0; n < oldPanes.length; n++) {
                var oldPane = oldPanes[n];
                if (!oldPane["isHovered"]) {
                    oldPane.fireMouseExit(i, j, mouseEvent);
                }
            }
            for (var n = 0; n < newPanes.length; n++) {
                newPanes[n]["wasHovered"] = false;
            }
            for (var n = 0; n < oldPanes.length; n++) {
                oldPanes[n]["wasHovered"] = true;
            }
            for (var n = 0; n < newPanes.length; n++) {
                var newPane = newPanes[n];
                if (!newPane["wasHovered"]) {
                    newPane.fireMouseEnter(i, j, mouseEvent);
                }
            }
        }
        // Support for reporting click count. Browsers handle reporting single/double
        // clicks differently, so it's generally not a good idea to use both listeners
        // at one. That's why it's done this way instead of using the 'dblclick' event.
        var multiPressTimeout_MILLIS = 250;
        var prevPress_PMILLIS = 0;
        var clickCount = 1;
        var currentPanes = [];
        var currentMouseCursor = null;
        var dragging = false;
        var pendingExit = false;
        function refreshMouseCursor() {
            var newMouseCursor = null;
            for (var n = 0; n < currentPanes.length; n++) {
                newMouseCursor = currentPanes[n].mouseCursor;
                if (Webglimpse.hasval(newMouseCursor)) break;
            }
            if (!Webglimpse.hasval(newMouseCursor)) {
                newMouseCursor = "default";
            }
            if (newMouseCursor !== currentMouseCursor) {
                element.style.cursor = newMouseCursor;
                currentMouseCursor = newMouseCursor;
            }
        }
        refreshMouseCursor();
        contentPane.mouseCursorChanged.on(refreshMouseCursor);
        element.addEventListener("mousedown", function(ev) {
            var press_PMILLIS = new Date().getTime();
            var i = iMouse(element, ev);
            var j = jMouse(element, ev);
            if (press_PMILLIS - prevPress_PMILLIS < multiPressTimeout_MILLIS) {
                clickCount++;
            } else {
                clickCount = 1;
            }
            prevPress_PMILLIS = press_PMILLIS;
            var newPanes = contentPane.panesAt(i, j);
            detectEntersAndExits(currentPanes, newPanes, i, j, ev);
            currentPanes = newPanes;
            for (var n = 0; n < currentPanes.length; n++) {
                currentPanes[n].fireMouseDown(i, j, clickCount, ev);
            }
            refreshMouseCursor();
            dragging = true;
            // Disable browser-default double-click action, which selects text and messes up subsequent drags
            ev.preventDefault();
        });
        // Only want NON-DRAG moves from the canvas (e.g. we don't want moves that occur in an overlay div) -- so subscribe to CANVAS's mousemove
        element.addEventListener("mousemove", function(ev) {
            if (!dragging) {
                var i = iMouse(element, ev);
                var j = jMouse(element, ev);
                var newPanes = contentPane.panesAt(i, j);
                detectEntersAndExits(currentPanes, newPanes, i, j, ev);
                currentPanes = newPanes;
                for (var n = 0; n < currentPanes.length; n++) {
                    currentPanes[n].fireMouseMove(i, j, ev);
                }
                refreshMouseCursor();
            }
        });
        // During a DRAG we want all move events, even ones that occur outside the canvas -- so subscribe to WINDOW's mousemove
        window.addEventListener("mousemove", function(ev) {
            if (dragging) {
                var i = iMouse(element, ev);
                var j = jMouse(element, ev);
                for (var n = 0; n < currentPanes.length; n++) {
                    currentPanes[n].fireMouseMove(i, j, ev);
                }
            }
        });
        element.addEventListener("mouseout", function(ev) {
            var i = iMouse(element, ev);
            var j = jMouse(element, ev);
            if (dragging) {
                for (var n = 0; n < currentPanes.length; n++) {
                    currentPanes[n].fireMouseMove(i, j, ev);
                }
                pendingExit = true;
            } else {
                detectEntersAndExits(currentPanes, [], i, j, ev);
                currentPanes = [];
                refreshMouseCursor();
            }
        });
        element.addEventListener("mouseover", function(ev) {
            var i = iMouse(element, ev);
            var j = jMouse(element, ev);
            if (dragging) {
                pendingExit = false;
            } else {
                var newPanes = contentPane.panesAt(i, j);
                detectEntersAndExits(currentPanes, newPanes, i, j, ev);
                currentPanes = newPanes;
                for (var n = 0; n < currentPanes.length; n++) {
                    currentPanes[n].fireMouseMove(i, j, ev);
                }
                refreshMouseCursor();
            }
        });
        var endDrag = function(ev) {
            var i = iMouse(element, ev);
            var j = jMouse(element, ev);
            for (var n = 0; n < currentPanes.length; n++) {
                currentPanes[n].fireMouseUp(i, j, clickCount, ev);
            }
            dragging = false;
            if (pendingExit) {
                detectEntersAndExits(currentPanes, [], i, j, ev);
                currentPanes = [];
                pendingExit = false;
                refreshMouseCursor();
            } else {
                var newPanes = contentPane.panesAt(i, j);
                detectEntersAndExits(currentPanes, newPanes, i, j, ev);
                currentPanes = newPanes;
                for (var n = 0; n < currentPanes.length; n++) {
                    currentPanes[n].fireMouseMove(i, j, ev);
                }
                refreshMouseCursor();
            }
        };
        // The window always gets the mouse-up event at the end of a drag -- even if it occurs outside the browser window
        window.addEventListener("mouseup", function(ev) {
            if (dragging) {
                endDrag(ev);
            }
        });
        // We don't receive mouse events that happen over another iframe -- even during a drag. If we miss a mouseup that
        // should terminate a drag, we end up stuck in dragging mode, which makes for a really lousy user experience. To
        // avoid that, whenever the mouse moves, check whether the button is down. If we're still in dragging mode, but
        // the button is now up, end the drag.
        // If we're dragging, and we see a mousemove with no buttons down, end the drag
        var recentDrag = null;
        var handleMissedMouseUp = function(ev) {
            if (dragging) {
                if (!isMouseDown(ev) && recentDrag) {
                    var mouseUp = document.createEvent("MouseEvents");
                    mouseUp.initMouseEvent("mouseup", true, true, window, 0, recentDrag.screenX, recentDrag.screenY, ev.screenX - window.screenX, ev.screenY - window.screenY, recentDrag.ctrlKey, recentDrag.altKey, recentDrag.shiftKey, recentDrag.metaKey, 0, null);
                    endDrag(mouseUp);
                }
                recentDrag = ev;
            }
        };
        window.addEventListener("mousemove", handleMissedMouseUp);
        var w = window;
        while (w.parent !== w) {
            try {
                w.parent.addEventListener("mousemove", handleMissedMouseUp);
                w = w.parent;
            } catch (e) {
                // Cross-origin security may prevent us from adding a listener to a window other than our own -- in that case,
                // the least bad option is to terminate drags on exit from the highest accessible window
                w.addEventListener("mouseout", function(ev) {
                    if (dragging) {
                        var mouseUp = document.createEvent("MouseEvents");
                        mouseUp.initMouseEvent("mouseup", true, true, window, 0, ev.screenX, ev.screenY, ev.screenX - window.screenX, ev.screenY - window.screenY, ev.ctrlKey, ev.altKey, ev.shiftKey, ev.metaKey, 0, null);
                        endDrag(mouseUp);
                    }
                });
                break;
            }
        }
        // Firefox uses event type 'DOMMouseScroll' for mouse-wheel events; everybody else uses 'mousewheel'
        var handleMouseWheel = function(ev) {
            var i = iMouse(element, ev);
            var j = jMouse(element, ev);
            if (dragging) {
                for (var n = 0; n < currentPanes.length; n++) {
                    currentPanes[n].fireMouseMove(i, j, ev);
                }
            } else {
                var newPanes = contentPane.panesAt(i, j);
                detectEntersAndExits(currentPanes, newPanes, i, j, ev);
                currentPanes = newPanes;
                for (var n = 0; n < currentPanes.length; n++) {
                    currentPanes[n].fireMouseMove(i, j, ev);
                }
            }
            var wheelSteps = mouseWheelSteps(ev);
            for (var n = 0; n < currentPanes.length; n++) {
                currentPanes[n].fireMouseWheel(i, j, wheelSteps, ev);
            }
        };
        element.addEventListener("mousewheel", handleMouseWheel);
        element.addEventListener("DOMMouseScroll", handleMouseWheel, false);
        element.addEventListener("contextmenu", function(ev) {
            var i = iMouse(element, ev);
            var j = jMouse(element, ev);
            if (dragging) {
                for (var n = 0; n < currentPanes.length; n++) {
                    currentPanes[n].fireMouseMove(i, j, ev);
                }
            } else {
                var newPanes = contentPane.panesAt(i, j);
                detectEntersAndExits(currentPanes, newPanes, i, j, ev);
                currentPanes = newPanes;
                for (var n = 0; n < currentPanes.length; n++) {
                    currentPanes[n].fireMouseMove(i, j, ev);
                }
                refreshMouseCursor();
            }
            for (var n = 0; n < currentPanes.length; n++) {
                currentPanes[n].fireContextMenu(i, j, ev);
            }
            // Disable browser-default context menu
            ev.preventDefault();
        });
    }
    function newDrawable(canvas) {
        var contentPane = null;
        var contentPrefSizeNotification = new Webglimpse.Notification1();
        var contentPrefSize = {
            w: null,
            h: null
        };
        var contentViewport = Webglimpse.newBoundsFromRect(0, 0, 0, 0);
        var gl = requireGL(canvas);
        var pendingRequestId = null;
        return {
            setContentPane: function(pane) {
                if (Webglimpse.hasval(contentPane)) {}
                contentPane = pane;
                attachEventListeners(canvas, contentPane);
            },
            redraw: function() {
                if (!Webglimpse.hasval(pendingRequestId)) {
                    pendingRequestId = window.requestAnimationFrame(function() {
                        if (Webglimpse.hasval(contentPane)) {
                            var oldPrefSize = {
                                w: contentPrefSize.w,
                                h: contentPrefSize.h
                            };
                            contentPane.updatePrefSizes(contentPrefSize);
                            contentViewport.setRect(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
                            contentPane.updateBounds(contentViewport.unmod, contentViewport.unmod);
                            contentPane.paint(gl);
                        }
                        pendingRequestId = null;
                        if (oldPrefSize.w !== contentPrefSize.w || oldPrefSize.h !== contentPrefSize.h) {
                            contentPrefSizeNotification.fire({
                                w: contentPrefSize.w,
                                h: contentPrefSize.h
                            });
                        }
                    });
                }
            },
            getPrefSize: function() {
                return {
                    w: contentPrefSize.w,
                    h: contentPrefSize.h
                };
            },
            prefSizeChanged: function() {
                return contentPrefSizeNotification;
            }
        };
    }
    Webglimpse.newDrawable = newDrawable;
})(Webglimpse || (Webglimpse = {}));

var Webglimpse;

(function(Webglimpse) {
    function newGroupPainter() {
        var painters = [];
        for (var _i = 0; _i < arguments.length - 0; _i++) {
            painters[_i] = arguments[_i + 0];
        }
        return function(gl, viewport) {
            for (var n = 0; n < painters.length; n++) {
                painters[n](gl, viewport);
            }
        };
    }
    Webglimpse.newGroupPainter = newGroupPainter;
    function newBlendingBackgroundPainter(color) {
        var program = new Webglimpse.Program(Webglimpse.xyNdc_VERTSHADER, Webglimpse.solid_FRAGSHADER);
        var u_Color = new Webglimpse.UniformColor(program, "u_Color");
        var a_XyNdc = new Webglimpse.Attribute(program, "a_XyNdc");
        var numVertices = 4;
        var xy_NDC = new Float32Array(2 * numVertices);
        var xyBuffer_NDC = Webglimpse.newDynamicBuffer();
        return function(gl) {
            if (color.a >= 1) {
                gl.disable(Webglimpse.GL.BLEND);
            } else {
                gl.blendFuncSeparate(Webglimpse.GL.SRC_ALPHA, Webglimpse.GL.ONE_MINUS_SRC_ALPHA, Webglimpse.GL.ONE, Webglimpse.GL.ONE_MINUS_SRC_ALPHA);
                gl.enable(Webglimpse.GL.BLEND);
            }
            program.use(gl);
            u_Color.setData(gl, color);
            xy_NDC[0] = -1;
            xy_NDC[1] = 1;
            xy_NDC[2] = -1;
            xy_NDC[3] = -1;
            xy_NDC[4] = 1;
            xy_NDC[5] = 1;
            xy_NDC[6] = 1;
            xy_NDC[7] = -1;
            xyBuffer_NDC.setData(xy_NDC);
            a_XyNdc.setDataAndEnable(gl, xyBuffer_NDC, 2, Webglimpse.GL.FLOAT);
            gl.drawArrays(Webglimpse.GL.TRIANGLE_STRIP, 0, numVertices);
            a_XyNdc.disable(gl);
            program.endUse(gl);
        };
    }
    Webglimpse.newBlendingBackgroundPainter = newBlendingBackgroundPainter;
    var Background = function() {
        function Background(color) {
            this._color = color;
        }
        Object.defineProperty(Background.prototype, "color", {
            get: function() {
                return this._color;
            },
            set: function(color) {
                if (!Webglimpse.sameColor(this._color, color)) {
                    this._color = color;
                }
            },
            enumerable: true,
            configurable: true
        });
        Background.prototype.newPainter = function() {
            var background = this;
            return function(gl, viewport) {
                if (Webglimpse.hasval(background.color)) {
                    gl.clearColor(background.color.r, background.color.g, background.color.b, background.color.a);
                    gl.clear(Webglimpse.GL.COLOR_BUFFER_BIT);
                }
            };
        };
        return Background;
    }();
    Webglimpse.Background = Background;
    function newBackgroundPainter(color) {
        return function(gl) {
            gl.clearColor(color.r, color.g, color.b, color.a);
            gl.clear(Webglimpse.GL.COLOR_BUFFER_BIT);
        };
    }
    Webglimpse.newBackgroundPainter = newBackgroundPainter;
    function newTexturePainter(texture, xFrac, yFrac, options) {
        var textureRenderer = new Webglimpse.TextureRenderer();
        return function(gl, viewport) {
            textureRenderer.begin(gl, viewport);
            textureRenderer.draw(gl, texture, xFrac, yFrac, options);
            textureRenderer.end(gl);
        };
    }
    Webglimpse.newTexturePainter = newTexturePainter;
    function newSolidPane(color) {
        var pane = new Webglimpse.Pane(null);
        pane.addPainter(newBackgroundPainter(color));
        return pane;
    }
    Webglimpse.newSolidPane = newSolidPane;
    function fitToTexture(texture) {
        return function(parentPrefSize) {
            parentPrefSize.w = texture.w;
            parentPrefSize.h = texture.h;
        };
    }
    Webglimpse.fitToTexture = fitToTexture;
    function fixedSize(w, h) {
        return function(parentPrefSize) {
            parentPrefSize.w = w;
            parentPrefSize.h = h;
        };
    }
    Webglimpse.fixedSize = fixedSize;
    /**
    * Takes (x,y) in NDC (Normalized Device Coords), in attribute a_XyNdc
    */
    Webglimpse.xyNdc_VERTSHADER = Webglimpse.concatLines("                                                ", "  attribute vec2 a_XyNdc;                       ", "                                                ", "  void main( ) {                                ", "      gl_Position = vec4( a_XyNdc, 0.0, 1.0 );  ", "  }                                             ", "                                                ");
    /**
    * Takes (x,y) as fractions of the viewport, in attribute a_XyFrac
    */
    Webglimpse.xyFrac_VERTSHADER = Webglimpse.concatLines("                                                                ", "  attribute vec2 a_XyFrac;                                      ", "                                                                ", "  void main( ) {                                                ", "      gl_Position = vec4( ( -1.0 + 2.0*a_XyFrac ), 0.0, 1.0 );  ", "  }                                                             ", "                                                                ");
    Webglimpse.solid_FRAGSHADER = Webglimpse.concatLines("                               ", "  precision lowp float;        ", "  uniform vec4 u_Color;        ", "                               ", "  void main( ) {               ", "      gl_FragColor = u_Color;  ", "  }                            ", "                               ");
    Webglimpse.varyingColor_FRAGSHADER = Webglimpse.concatLines("                               ", "  precision lowp float;        ", "  varying vec4 v_Color;        ", "                               ", "  void main( ) {               ", "      gl_FragColor = v_Color;  ", "  }                            ", "                               ");
    Webglimpse.modelview_VERTSHADER = Webglimpse.concatLines("    uniform mat4 u_modelViewMatrix;                       ", "    attribute vec4 a_Position;                            ", "                                                          ", "    void main( ) {                                        ", "        gl_Position = u_modelViewMatrix * a_Position ;    ", "    }                                                     ", "                                                          ");
    Webglimpse.nearestPixelCenter_GLSLFUNC = Webglimpse.concatLines("                                                                    ", "  float nearestPixelCenter( float frac, float pixelSize ) {         ", "      return ( floor( frac*pixelSize + 1e-4 ) + 0.5 ) / pixelSize;  ", "  }                                                                 ", "                                                                    ");
    (function(Side) {
        Side[Side["TOP"] = 0] = "TOP";
        Side[Side["BOTTOM"] = 1] = "BOTTOM";
        Side[Side["RIGHT"] = 2] = "RIGHT";
        Side[Side["LEFT"] = 3] = "LEFT";
    })(Webglimpse.Side || (Webglimpse.Side = {}));
    var Side = Webglimpse.Side;
    /**
    * Converts viewport-fraction to NDC (Normalized Device Coords)
    */
    function fracToNdc(frac) {
        return -1 + 2 * frac;
    }
    Webglimpse.fracToNdc = fracToNdc;
    function nearestPixel(viewportFrac, viewportSize, imageAnchor, imageSize) {
        var anchor = imageAnchor * imageSize % 1;
        return (Math.floor(viewportFrac * viewportSize - anchor + .5 + 1e-4) + anchor) / viewportSize;
    }
    Webglimpse.nearestPixel = nearestPixel;
    function putQuadXys(xys, index, xLeft, xRight, yTop, yBottom) {
        var n = index;
        n = putUpperLeftTriangleXys(xys, n, xLeft, xRight, yTop, yBottom);
        n = putLowerRightTriangleXys(xys, n, xLeft, xRight, yTop, yBottom);
        return n;
    }
    Webglimpse.putQuadXys = putQuadXys;
    function putUpperLeftTriangleXys(xys, index, xLeft, xRight, yTop, yBottom) {
        var n = index;
        xys[n++] = xLeft;
        xys[n++] = yTop;
        xys[n++] = xRight;
        xys[n++] = yTop;
        xys[n++] = xLeft;
        xys[n++] = yBottom;
        return n;
    }
    Webglimpse.putUpperLeftTriangleXys = putUpperLeftTriangleXys;
    function putLowerRightTriangleXys(xys, index, xLeft, xRight, yTop, yBottom) {
        var n = index;
        xys[n++] = xLeft;
        xys[n++] = yBottom;
        xys[n++] = xRight;
        xys[n++] = yTop;
        xys[n++] = xRight;
        xys[n++] = yBottom;
        return n;
    }
    Webglimpse.putLowerRightTriangleXys = putLowerRightTriangleXys;
    function putUpperRightTriangleXys(xys, index, xLeft, xRight, yTop, yBottom) {
        var n = index;
        xys[n++] = xLeft;
        xys[n++] = yTop;
        xys[n++] = xRight;
        xys[n++] = yTop;
        xys[n++] = xRight;
        xys[n++] = yBottom;
        return n;
    }
    Webglimpse.putUpperRightTriangleXys = putUpperRightTriangleXys;
    function putLowerLeftTriangleXys(xys, index, xLeft, xRight, yTop, yBottom) {
        var n = index;
        xys[n++] = xLeft;
        xys[n++] = yBottom;
        xys[n++] = xLeft;
        xys[n++] = yTop;
        xys[n++] = xRight;
        xys[n++] = yBottom;
        return n;
    }
    Webglimpse.putLowerLeftTriangleXys = putLowerLeftTriangleXys;
    function putQuadRgbas(rgbas, index, color) {
        return putRgbas(rgbas, index, color, 6);
    }
    Webglimpse.putQuadRgbas = putQuadRgbas;
    function putRgbas(rgbas, index, color, count) {
        var n = index;
        for (var v = 0; v < count; v++) {
            rgbas[n++] = color.r;
            rgbas[n++] = color.g;
            rgbas[n++] = color.b;
            rgbas[n++] = color.a;
        }
        return n;
    }
    Webglimpse.putRgbas = putRgbas;
    function clearSelection() {
        var selection = window.getSelection();
        if (selection) {
            if (selection["removeAllRanges"]) {
                selection["removeAllRanges"]();
            } else if (selection["empty"]) {
                selection["empty"]();
            }
        }
    }
    Webglimpse.clearSelection = clearSelection;
    var SimpleModel = function() {
        function SimpleModel(value) {
            if (typeof value === "undefined") {
                value = null;
            }
            this._value = value;
            this._changed = new Webglimpse.Notification();
        }
        Object.defineProperty(SimpleModel.prototype, "value", {
            get: function() {
                return this._value;
            },
            set: function(value) {
                if (value !== this._value) {
                    this._value = value;
                    this._changed.fire();
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SimpleModel.prototype, "changed", {
            get: function() {
                return this._changed;
            },
            enumerable: true,
            configurable: true
        });
        return SimpleModel;
    }();
    Webglimpse.SimpleModel = SimpleModel;
    var XyModel = function() {
        function XyModel(x, y) {
            this._x = x;
            this._y = y;
            this._changed = new Webglimpse.Notification();
        }
        Object.defineProperty(XyModel.prototype, "x", {
            get: function() {
                return this._x;
            },
            set: function(x) {
                if (x !== this._x) {
                    this._x = x;
                    this._changed.fire();
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(XyModel.prototype, "y", {
            get: function() {
                return this._y;
            },
            set: function(y) {
                if (y !== this._y) {
                    this._y = y;
                    this._changed.fire();
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(XyModel.prototype, "changed", {
            get: function() {
                return this._changed;
            },
            enumerable: true,
            configurable: true
        });
        XyModel.prototype.setXy = function(x, y) {
            if (x !== this._x || y !== this._y) {
                this._x = x;
                this._y = y;
                this._changed.fire();
            }
        };
        return XyModel;
    }();
    Webglimpse.XyModel = XyModel;
})(Webglimpse || (Webglimpse = {}));

var Webglimpse;

(function(Webglimpse) {
    var Label = function() {
        function Label(text, font, fgColor, bgColor) {
            this._font = font;
            this._text = text;
            this._fgColor = fgColor;
            this._bgColor = bgColor;
        }
        Object.defineProperty(Label.prototype, "font", {
            get: function() {
                return this._font;
            },
            set: function(font) {
                if (this._font !== font) {
                    this._font = font;
                    this._textureFactory = null;
                    if (this._texture) {
                        this._texture.dispose();
                        this._texture = null;
                    }
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Label.prototype, "color", {
            // retained for backwards compatibility, should use fgColor
            get: function() {
                return this._fgColor;
            },
            // retained for backwards compatibility, should use fgColor
            set: function(fgColor) {
                if (!Webglimpse.sameColor(this._fgColor, fgColor)) {
                    this._fgColor = fgColor;
                    if (this._texture) {
                        this._texture.dispose();
                        this._texture = null;
                    }
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Label.prototype, "fgColor", {
            get: function() {
                return this._fgColor;
            },
            set: function(fgColor) {
                if (!Webglimpse.sameColor(this._fgColor, fgColor)) {
                    this._fgColor = fgColor;
                    if (this._texture) {
                        this._texture.dispose();
                        this._texture = null;
                    }
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Label.prototype, "bgColor", {
            get: function() {
                return this._bgColor;
            },
            set: function(bgColor) {
                if (!Webglimpse.sameColor(this._bgColor, bgColor)) {
                    this._bgColor = bgColor;
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Label.prototype, "text", {
            get: function() {
                return this._text;
            },
            set: function(text) {
                if (this._text !== text) {
                    this._text = text;
                    if (this._texture) {
                        this._texture.dispose();
                        this._texture = null;
                    }
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Label.prototype, "texture", {
            get: function() {
                if (!this._textureFactory) {
                    this._textureFactory = this._font ? Webglimpse.createTextTextureFactory(this._font) : null;
                }
                if (!this._texture) {
                    this._texture = this._fgColor && this._text ? this._textureFactory(this._fgColor, this._text) : null;
                }
                return this._texture;
            },
            enumerable: true,
            configurable: true
        });
        return Label;
    }();
    Webglimpse.Label = Label;
    function fitToLabel(label) {
        return function(parentPrefSize) {
            var texture = label.texture;
            parentPrefSize.w = texture ? texture.w : 0;
            parentPrefSize.h = texture ? texture.h : 0;
        };
    }
    Webglimpse.fitToLabel = fitToLabel;
    function newLabelPainter(label, xFrac, yFrac, xAnchor, yAnchor, rotation_CCWRAD) {
        var textureRenderer = new Webglimpse.TextureRenderer();
        return function(gl, viewport) {
            if (Webglimpse.hasval(label.bgColor)) {
                gl.clearColor(label.bgColor.r, label.bgColor.g, label.bgColor.b, label.bgColor.a);
                gl.clear(Webglimpse.GL.COLOR_BUFFER_BIT);
            }
            var texture = label.texture;
            if (texture) {
                textureRenderer.begin(gl, viewport);
                textureRenderer.draw(gl, texture, xFrac, yFrac, {
                    xAnchor: xAnchor,
                    yAnchor: texture.yAnchor(yAnchor),
                    rotation_CCWRAD: rotation_CCWRAD
                });
                textureRenderer.end(gl);
            }
        };
    }
    Webglimpse.newLabelPainter = newLabelPainter;
})(Webglimpse || (Webglimpse = {}));

var Webglimpse;

(function(Webglimpse) {
    function newVerticalScrollLayout() {
        var layout = {
            updatePrefSize: function(parentPrefSize, children) {
                if (children.length === 1) {
                    var childPrefSize = children[0].prefSize;
                    // XXX: Need some way to override the child's pref-height
                    if (!Webglimpse.hasval(childPrefSize.h)) {
                        throw new Error("Vertical-scroll layout requires child to have a defined pref-height, but its pref-height is " + childPrefSize.h);
                    }
                    parentPrefSize.w = childPrefSize.w;
                    parentPrefSize.h = childPrefSize.h;
                } else if (children.length > 1) {
                    throw new Error("Vertical-scroll layout only works with 1 child, but pane has " + this.children.length + " children");
                }
            },
            jOffset: 0,
            hContent: 0,
            hVisible: 0,
            updateChildViewports: function(children, parentViewport) {
                if (children.length === 1) {
                    var child = children[0];
                    var j;
                    var h = child.prefSize.h;
                    if (h <= parentViewport.h) {
                        j = parentViewport.jEnd - h;
                    } else {
                        j = Math.min(parentViewport.j, parentViewport.jEnd - h + Math.max(0, Math.round(layout.jOffset)));
                    }
                    child.viewport.setRect(parentViewport.i, j, parentViewport.w, h);
                    layout.jOffset = j + h - parentViewport.jEnd;
                    layout.hContent = h;
                    layout.hVisible = parentViewport.h;
                } else if (children.length > 1) {
                    throw new Error("Vertical-scroll layout only works with 1 child, but pane has " + this.children.length + " children");
                }
            }
        };
        return layout;
    }
    Webglimpse.newVerticalScrollLayout = newVerticalScrollLayout;
    function newVerticalScrollbar(scrollLayout, drawable, options) {
        var bgColor = Webglimpse.hasval(options) && Webglimpse.hasval(options.bgColor) ? options.bgColor : Webglimpse.gray(.9);
        var scrollbar = new Webglimpse.Pane(null);
        scrollbar.addPainter(Webglimpse.newBackgroundPainter(bgColor));
        scrollbar.addPainter(newVerticalScrollbarPainter(scrollLayout, options));
        attachVerticalScrollMouseListeners(scrollbar, scrollLayout, drawable);
        return scrollbar;
    }
    Webglimpse.newVerticalScrollbar = newVerticalScrollbar;
    function newVerticalScrollbarPainter(scrollLayout, options) {
        var fgColor = Webglimpse.hasval(options) && Webglimpse.hasval(options.fgColor) ? options.fgColor : Webglimpse.gray(.56);
        var borderColor = Webglimpse.hasval(options) && Webglimpse.hasval(options.borderColor) ? options.borderColor : Webglimpse.gray(.42);
        var borderThickness = Webglimpse.hasval(options) && Webglimpse.hasval(options.borderThickness) ? options.borderThickness : 1;
        var borderTop = Webglimpse.hasval(options) && Webglimpse.hasval(options.borderTop) ? options.borderTop : true;
        var borderLeft = Webglimpse.hasval(options) && Webglimpse.hasval(options.borderLeft) ? options.borderLeft : false;
        var borderRight = Webglimpse.hasval(options) && Webglimpse.hasval(options.borderRight) ? options.borderRight : false;
        var borderBottom = Webglimpse.hasval(options) && Webglimpse.hasval(options.borderBottom) ? options.borderBottom : true;
        var program = new Webglimpse.Program(Webglimpse.xyFrac_VERTSHADER, Webglimpse.solid_FRAGSHADER);
        var u_Color = new Webglimpse.UniformColor(program, "u_Color");
        var a_XyFrac = new Webglimpse.Attribute(program, "a_XyFrac");
        var numFillVertices = 6;
        var numBorderVertices = (borderTop ? 6 : 0) + (borderLeft ? 6 : 0) + (borderRight ? 6 : 0) + (borderBottom ? 6 : 0);
        var xyFrac = new Float32Array(2 * Math.max(numFillVertices, numBorderVertices));
        var xyFracBuffer = Webglimpse.newDynamicBuffer();
        return function(gl, viewport) {
            var hFrac = scrollLayout.hVisible / scrollLayout.hContent;
            if (hFrac < 1) {
                var yTop = Math.round((scrollLayout.hContent - scrollLayout.jOffset) / scrollLayout.hContent * viewport.h + 1e-4);
                var yBottom = Math.round((scrollLayout.hContent - (scrollLayout.jOffset + scrollLayout.hVisible)) / scrollLayout.hContent * viewport.h + 1e-4);
                var yFracTop = yTop / viewport.h;
                var yFracBottom = yBottom / viewport.h;
                var wBorderFrac = borderThickness / viewport.w;
                var hBorderFrac = borderThickness / viewport.h;
                gl.disable(Webglimpse.GL.BLEND);
                program.use(gl);
                // Fill
                //
                Webglimpse.putQuadXys(xyFrac, 0, 0 + (borderLeft ? wBorderFrac : 0), 1 - (borderRight ? wBorderFrac : 0), yFracTop - (borderTop ? hBorderFrac : 0), yFracBottom + (borderBottom ? hBorderFrac : 0));
                xyFracBuffer.setData(xyFrac.subarray(0, 2 * numFillVertices));
                a_XyFrac.setDataAndEnable(gl, xyFracBuffer, 2, Webglimpse.GL.FLOAT);
                u_Color.setData(gl, fgColor);
                gl.drawArrays(Webglimpse.GL.TRIANGLES, 0, numFillVertices);
                // Border
                //
                var index = 0;
                if (borderTop) index = Webglimpse.putQuadXys(xyFrac, index, 0, 1 - (borderRight ? wBorderFrac : 0), yFracTop, yFracTop - hBorderFrac);
                if (borderBottom) index = Webglimpse.putQuadXys(xyFrac, index, 0 + (borderLeft ? wBorderFrac : 0), 1, yFracBottom + hBorderFrac, yFracBottom);
                if (borderRight) index = Webglimpse.putQuadXys(xyFrac, index, 1 - wBorderFrac, 1, yFracTop, yFracBottom + (borderBottom ? hBorderFrac : 0));
                if (borderLeft) index = Webglimpse.putQuadXys(xyFrac, index, 0, 0 + wBorderFrac, yFracTop - (borderTop ? hBorderFrac : 0), yFracBottom);
                xyFracBuffer.setData(xyFrac.subarray(0, 2 * numBorderVertices));
                a_XyFrac.setDataAndEnable(gl, xyFracBuffer, 2, Webglimpse.GL.FLOAT);
                u_Color.setData(gl, borderColor);
                gl.drawArrays(Webglimpse.GL.TRIANGLES, 0, numBorderVertices);
                a_XyFrac.disable(gl);
                program.endUse(gl);
            }
        };
    }
    Webglimpse.newVerticalScrollbarPainter = newVerticalScrollbarPainter;
    // mouse listener for scrolling while panning on the timeline itself
    function attachTimelineVerticalScrollMouseListeners(pane, scrollLayout, drawable) {
        // Used when dragging inside pane
        var grab = null;
        var jOffset = null;
        pane.mouseDown.on(function(ev) {
            if (Webglimpse.isLeftMouseDown(ev.mouseEvent)) {
                grab = ev.j;
                jOffset = scrollLayout.jOffset;
            }
        });
        pane.mouseMove.on(function(ev) {
            if (Webglimpse.hasval(grab)) {
                scrollLayout.jOffset = jOffset - (grab - ev.j);
                drawable.redraw();
            }
        });
        pane.mouseUp.on(function(ev) {
            grab = null;
        });
    }
    Webglimpse.attachTimelineVerticalScrollMouseListeners = attachTimelineVerticalScrollMouseListeners;
    // mouse listener for scrolling while interacting with the scrollbar
    function attachVerticalScrollMouseListeners(scrollbar, scrollLayout, drawable) {
        // Used when dragging the handle
        var grab = null;
        // Used when scrollbar is pressed-and-held outside the handle
        var pageScrollTimer = null;
        var recentPointerFrac = null;
        scrollbar.mouseDown.on(function(ev) {
            if (Webglimpse.isLeftMouseDown(ev.mouseEvent) && !Webglimpse.hasval(grab)) {
                var topFrac = (scrollLayout.hContent - scrollLayout.jOffset) / scrollLayout.hContent;
                var fracExtent = scrollLayout.hVisible / scrollLayout.hContent;
                var pointerFrac = Webglimpse.yFrac(ev);
                if (topFrac - fracExtent <= pointerFrac && pointerFrac <= topFrac) {
                    grab = (topFrac - pointerFrac) / fracExtent;
                } else {
                    // If the mouse is pressed on the scrollbar but outside the handle:
                    //
                    //  1. Immediately scroll one page toward the mouse
                    //  2. Wait 500ms
                    //  3. If the mouse-button is still down, scroll one page toward the mouse
                    //  4. Wait 50ms
                    //  5. Go to Step 3
                    //
                    // (A "page" is 7/8 of the viewport extent.)
                    //
                    var direction = 0;
                    if (pointerFrac < topFrac - fracExtent) direction = +1; else if (pointerFrac > topFrac) direction = -1;
                    scrollLayout.jOffset += direction * Math.max(1, .875 * scrollLayout.hVisible);
                    drawable.redraw();
                    recentPointerFrac = pointerFrac;
                    var pageScroll = function() {
                        var topFrac = (scrollLayout.hContent - scrollLayout.jOffset) / scrollLayout.hContent;
                        var fracExtent = scrollLayout.hVisible / scrollLayout.hContent;
                        var pointerFrac = recentPointerFrac;
                        var direction = 0;
                        if (pointerFrac < topFrac - fracExtent) direction = +1; else if (pointerFrac > topFrac) direction = -1;
                        scrollLayout.jOffset += direction * Math.max(1, .875 * scrollLayout.hVisible);
                        drawable.redraw();
                        pageScrollTimer = setTimeout(pageScroll, 50);
                    };
                    pageScrollTimer = setTimeout(pageScroll, 500);
                }
            }
        });
        scrollbar.mouseMove.on(function(ev) {
            var pointerFrac = Webglimpse.yFrac(ev);
            if (Webglimpse.hasval(grab)) {
                var fracExtent = scrollLayout.hVisible / scrollLayout.hContent;
                var topFrac = pointerFrac + grab * fracExtent;
                scrollLayout.jOffset = scrollLayout.hContent - topFrac * scrollLayout.hContent;
                drawable.redraw();
            }
            if (Webglimpse.hasval(pageScrollTimer)) {
                recentPointerFrac = pointerFrac;
            }
        });
        scrollbar.mouseUp.on(function(ev) {
            grab = null;
            if (Webglimpse.hasval(pageScrollTimer)) {
                clearTimeout(pageScrollTimer);
                pageScrollTimer = null;
                recentPointerFrac = null;
            }
        });
    }
    Webglimpse.attachVerticalScrollMouseListeners = attachVerticalScrollMouseListeners;
})(Webglimpse || (Webglimpse = {}));

var Webglimpse;

(function(Webglimpse) {
    function newInsets() {
        var insets = [];
        for (var _i = 0; _i < arguments.length - 0; _i++) {
            insets[_i] = arguments[_i + 0];
        }
        switch (insets.length) {
          case 1:
            return {
                top: insets[0],
                right: insets[0],
                bottom: insets[0],
                left: insets[0]
            };

          case 2:
            return {
                top: insets[0],
                right: insets[1],
                bottom: insets[0],
                left: insets[1]
            };

          case 3:
            return {
                top: insets[0],
                right: insets[1],
                bottom: insets[2],
                left: insets[1]
            };

          case 4:
            return {
                top: insets[0],
                right: insets[1],
                bottom: insets[2],
                left: insets[3]
            };

          default:
            throw new Error("Expected 1, 2, 3, or 4 args, but found " + insets.length);
        }
    }
    Webglimpse.newInsets = newInsets;
    function newInsetLayout(insets) {
        return {
            updatePrefSize: function(parentPrefSize, children) {
                if (children.length === 0) {
                    parentPrefSize.w = insets.left + insets.right;
                    parentPrefSize.h = insets.top + insets.bottom;
                } else if (children.length === 1) {
                    var childPrefSize = children[0].prefSize;
                    parentPrefSize.w = Webglimpse.hasval(childPrefSize.w) ? childPrefSize.w + insets.left + insets.right : null;
                    parentPrefSize.h = Webglimpse.hasval(childPrefSize.h) ? childPrefSize.h + insets.top + insets.bottom : null;
                } else if (children.length > 1) {
                    throw new Error("Inset layout works with at most 1 child, but pane has " + this.children.length + " children");
                }
            },
            updateChildViewports: function(children, parentViewport) {
                if (children.length === 1) {
                    var childViewport = children[0].viewport;
                    childViewport.setEdges(parentViewport.iStart + insets.left, parentViewport.iEnd - insets.right, parentViewport.jStart + insets.bottom, parentViewport.jEnd - insets.top);
                } else if (children.length > 1) {
                    throw new Error("Inset layout works with at most 1 child, but pane has " + this.children.length + " children");
                }
            }
        };
    }
    Webglimpse.newInsetLayout = newInsetLayout;
    function newInsetPane(pane, insets, bgColor, consumeInputEvents) {
        if (typeof bgColor === "undefined") {
            bgColor = null;
        }
        if (typeof consumeInputEvents === "undefined") {
            consumeInputEvents = true;
        }
        var insetPane = new Webglimpse.Pane(newInsetLayout(insets), consumeInputEvents);
        if (Webglimpse.hasval(bgColor)) {
            insetPane.addPainter(Webglimpse.newBackgroundPainter(bgColor));
        }
        insetPane.addPane(pane);
        return insetPane;
    }
    Webglimpse.newInsetPane = newInsetPane;
})(Webglimpse || (Webglimpse = {}));

var Webglimpse;

(function(Webglimpse) {
    function newCornerLayout(hSide, vSide) {
        return {
            updatePrefSize: function(parentPrefSize, children) {
                if (children.length === 1) {
                    var childPrefSize = children[0].prefSize;
                    parentPrefSize.w = childPrefSize.w;
                    parentPrefSize.h = childPrefSize.h;
                } else if (children.length > 1) {
                    throw new Error("Corner layout only works with 1 child, but pane has " + this.children.length + " children");
                }
            },
            updateChildViewports: function(children, parentViewport) {
                if (children.length === 1) {
                    var child = children[0];
                    var iStart;
                    var iEnd;
                    var w = child.prefSize.w;
                    if (hSide === 2) {
                        iEnd = parentViewport.iEnd;
                        iStart = Webglimpse.hasval(w) ? Math.max(iEnd - w, parentViewport.iStart) : parentViewport.iStart;
                    } else {
                        iStart = parentViewport.iStart;
                        iEnd = Webglimpse.hasval(w) ? Math.min(iStart + w, parentViewport.iEnd) : parentViewport.iEnd;
                    }
                    var jStart;
                    var jEnd;
                    var h = child.prefSize.h;
                    if (vSide === 1) {
                        jStart = parentViewport.jStart;
                        jEnd = Webglimpse.hasval(h) ? Math.min(jStart + h, parentViewport.jEnd) : parentViewport.jEnd;
                    } else {
                        jEnd = parentViewport.jEnd;
                        jStart = Webglimpse.hasval(h) ? Math.max(jEnd - h, parentViewport.jStart) : parentViewport.jStart;
                    }
                    child.viewport.setEdges(iStart, iEnd, jStart, jEnd);
                } else if (children.length > 1) {
                    throw new Error("Corner layout only works with 1 child, but pane has " + this.children.length + " children");
                }
            }
        };
    }
    Webglimpse.newCornerLayout = newCornerLayout;
})(Webglimpse || (Webglimpse = {}));

var Webglimpse;

(function(Webglimpse) {
    // 'pref'     indicates the child's height should be its preferred height
    // 'pref-max' indicates the child's height should be at most its preferred height, but should be made smaller
    //            (treated as a flex with child.layoutOptions.height === null) if their is insufficient room in the
    //            parentViewport to accommodate all children at their set size
    //
    // This layout is essentially a generalization of timeline_layout.ts. If you use a row_layout with the center element set to pref-max
    // you get the same effect as timeline_layout).
    function childHeight(child) {
        var usePrefHeight = !Webglimpse.hasval(child.layoutOptions) || child.layoutOptions.height === undefined || child.layoutOptions.height === "pref" || child.layoutOptions.height === "pref-max";
        return usePrefHeight ? child.prefSize.h : child.layoutOptions.height;
    }
    // see above, like childHeight( ) but don't count 'pref-max'
    function childHeightOverfull(child) {
        var usePrefHeight = !Webglimpse.hasval(child.layoutOptions) || child.layoutOptions.height === undefined || child.layoutOptions.height === "pref";
        if (usePrefHeight) {
            return child.prefSize.h;
        } else if (child.layoutOptions.height == "pref-max") {
            return null;
        } else {
            return child.layoutOptions.height;
        }
    }
    function calculateFlexData(childrenToPlace, parentViewport, childHeight) {
        var numFlexible = 0;
        var totalHeight = 0;
        for (var c = 0; c < childrenToPlace.length; c++) {
            var h = childHeight(childrenToPlace[c]);
            if (Webglimpse.hasval(h)) {
                totalHeight += h;
            } else {
                numFlexible++;
            }
        }
        var totalFlexHeight = parentViewport.h - totalHeight;
        var flexHeight = totalFlexHeight / numFlexible;
        return {
            numFlexible: numFlexible,
            totalHeight: totalHeight,
            flexHeight: flexHeight,
            totalFlexHeight: totalFlexHeight,
            childHeight: childHeight
        };
    }
    function newRowLayout(topToBottom) {
        if (typeof topToBottom === "undefined") {
            topToBottom = true;
        }
        return {
            updatePrefSize: function(parentPrefSize, children) {
                var childrenToPlace = [];
                for (var c = 0; c < children.length; c++) {
                    var child = children[c];
                    if (Webglimpse.isNumber(child.layoutArg) && !(child.layoutOptions && child.layoutOptions.hide)) {
                        childrenToPlace.push(child);
                    }
                }
                var wMax = 0;
                var hSum = 0;
                for (var c = 0; c < childrenToPlace.length; c++) {
                    var child = childrenToPlace[c];
                    var honorChildWidth = !(child.layoutOptions && child.layoutOptions.ignoreWidth);
                    if (honorChildWidth) {
                        var w = child.prefSize.w;
                        if (Webglimpse.hasval(wMax) && Webglimpse.hasval(w)) {
                            wMax = Math.max(wMax, w);
                        } else {
                            wMax = null;
                        }
                    }
                    var h = childHeight(child);
                    if (Webglimpse.hasval(hSum) && Webglimpse.hasval(h)) {
                        hSum += h;
                    } else {
                        hSum = null;
                    }
                }
                parentPrefSize.w = wMax;
                parentPrefSize.h = hSum;
            },
            updateChildViewports: function(children, parentViewport) {
                var childrenToPlace = [];
                var childrenToHide = [];
                for (var c = 0; c < children.length; c++) {
                    var child = children[c];
                    if (Webglimpse.isNumber(child.layoutArg) && !(child.layoutOptions && child.layoutOptions.hide)) {
                        childrenToPlace.push(child);
                    } else {
                        childrenToHide.push(child);
                    }
                }
                // Use the original index to make the sort stable
                var indexProp = "webglimpse_rowLayout_index";
                for (var c = 0; c < childrenToPlace.length; c++) {
                    var child = childrenToPlace[c];
                    child[indexProp] = c;
                }
                childrenToPlace.sort(function(a, b) {
                    var orderDiff = a.layoutArg - b.layoutArg;
                    return orderDiff !== 0 ? orderDiff : a[indexProp] - b[indexProp];
                });
                // calculate assuming sufficient space
                var flexData = calculateFlexData(children, parentViewport, childHeight);
                // recalculate allowing 'pref-max' children to shrink if insufficient space
                if (flexData.totalHeight > parentViewport.h) {
                    flexData = calculateFlexData(children, parentViewport, childHeightOverfull);
                }
                if (topToBottom) {
                    var iStart = parentViewport.iStart;
                    var iEnd = parentViewport.iEnd;
                    var jEnd = parentViewport.jEnd;
                    var jRemainder = 0;
                    for (var c = 0; c < childrenToPlace.length; c++) {
                        var child = childrenToPlace[c];
                        var jStart;
                        var h = flexData.childHeight(child);
                        if (Webglimpse.hasval(h)) {
                            jStart = jEnd - h;
                        } else {
                            var jStart0 = jEnd - flexData.flexHeight - jRemainder;
                            jStart = Math.round(jStart0);
                            jRemainder = jStart - jStart0;
                        }
                        child.viewport.setEdges(iStart, iEnd, jStart, jEnd);
                        jEnd = jStart;
                    }
                } else {
                    var iStart = parentViewport.iStart;
                    var iEnd = parentViewport.iEnd;
                    var jStart = parentViewport.jStart;
                    var jRemainder = 0;
                    for (var c = 0; c < childrenToPlace.length; c++) {
                        var child = childrenToPlace[c];
                        var jEnd;
                        var h = flexData.childHeight(child);
                        if (Webglimpse.hasval(h)) {
                            jEnd = jStart + h;
                        } else {
                            var jEnd0 = jStart + flexData.flexHeight + jRemainder;
                            jEnd = Math.round(jEnd0);
                            jRemainder = jEnd0 - jEnd;
                        }
                        child.viewport.setEdges(iStart, iEnd, jStart, jEnd);
                        jStart = jEnd;
                    }
                }
                for (var c = 0; c < childrenToHide.length; c++) {
                    childrenToHide[c].viewport.setEdges(0, 0, 0, 0);
                }
            }
        };
    }
    Webglimpse.newRowLayout = newRowLayout;
})(Webglimpse || (Webglimpse = {}));

var Webglimpse;

(function(Webglimpse) {
    function childWidth(child) {
        var usePrefWidth = !Webglimpse.hasval(child.layoutOptions) || child.layoutOptions.width === undefined || child.layoutOptions.width === "pref";
        return usePrefWidth ? child.prefSize.w : child.layoutOptions.width;
    }
    function newColumnLayout(leftToRight) {
        if (typeof leftToRight === "undefined") {
            leftToRight = true;
        }
        return {
            updatePrefSize: function(parentPrefSize, children) {
                var childrenToPlace = [];
                for (var c = 0; c < children.length; c++) {
                    var child = children[c];
                    if (Webglimpse.isNumber(child.layoutArg) && !(child.layoutOptions && child.layoutOptions.hide)) {
                        childrenToPlace.push(child);
                    }
                }
                var hMax = 0;
                var wSum = 0;
                for (var c = 0; c < childrenToPlace.length; c++) {
                    var child = childrenToPlace[c];
                    var honorChildHeight = !(child.layoutOptions && child.layoutOptions.ignoreHeight);
                    if (honorChildHeight) {
                        var h = child.prefSize.h;
                        if (Webglimpse.hasval(hMax) && Webglimpse.hasval(h)) {
                            hMax = Math.max(hMax, h);
                        } else {
                            hMax = null;
                        }
                    }
                    var w = childWidth(child);
                    if (Webglimpse.hasval(wSum) && Webglimpse.hasval(w)) {
                        wSum += w;
                    } else {
                        wSum = null;
                    }
                }
                parentPrefSize.w = wSum;
                parentPrefSize.h = hMax;
            },
            updateChildViewports: function(children, parentViewport) {
                var childrenToPlace = [];
                var childrenToHide = [];
                for (var c = 0; c < children.length; c++) {
                    var child = children[c];
                    if (Webglimpse.isNumber(child.layoutArg) && !(child.layoutOptions && child.layoutOptions.hide)) {
                        childrenToPlace.push(child);
                    } else {
                        childrenToHide.push(child);
                    }
                }
                // Use the original index to make the sort stable
                var indexProp = "webglimpse_columnLayout_index";
                for (var c = 0; c < childrenToPlace.length; c++) {
                    var child = childrenToPlace[c];
                    child[indexProp] = c;
                }
                childrenToPlace.sort(function(a, b) {
                    var orderDiff = a.layoutArg - b.layoutArg;
                    return orderDiff !== 0 ? orderDiff : a[indexProp] - b[indexProp];
                });
                var numFlexible = 0;
                var totalFlexWidth = parentViewport.w;
                for (var c = 0; c < childrenToPlace.length; c++) {
                    var w = childWidth(childrenToPlace[c]);
                    if (Webglimpse.hasval(w)) {
                        totalFlexWidth -= w;
                    } else {
                        numFlexible++;
                    }
                }
                var flexWidth = totalFlexWidth / numFlexible;
                if (leftToRight) {
                    var jStart = parentViewport.jStart;
                    var jEnd = parentViewport.jEnd;
                    var iStart = parentViewport.iStart;
                    var iRemainder = 0;
                    for (var c = 0; c < childrenToPlace.length; c++) {
                        var child = childrenToPlace[c];
                        var iEnd;
                        var w = childWidth(child);
                        if (Webglimpse.hasval(w)) {
                            iEnd = iStart + w;
                        } else {
                            var iEnd0 = iStart + flexWidth + iRemainder;
                            iEnd = Math.round(iEnd0);
                            iRemainder = iEnd0 - iEnd;
                        }
                        child.viewport.setEdges(iStart, iEnd, jStart, jEnd);
                        iStart = iEnd;
                    }
                } else {
                    var jStart = parentViewport.jStart;
                    var jEnd = parentViewport.jEnd;
                    var iEnd = parentViewport.iEnd;
                    var iRemainder = 0;
                    for (var c = 0; c < childrenToPlace.length; c++) {
                        var child = childrenToPlace[c];
                        var iStart;
                        var w = childWidth(child);
                        if (Webglimpse.hasval(w)) {
                            iStart = iEnd - w;
                        } else {
                            var iStart0 = iEnd - flexWidth - iRemainder;
                            iStart = Math.round(iStart0);
                            iRemainder = iStart - iStart0;
                        }
                        child.viewport.setEdges(iStart, iEnd, jStart, jEnd);
                        iEnd = iStart;
                    }
                }
                for (var c = 0; c < childrenToHide.length; c++) {
                    childrenToHide[c].viewport.setEdges(0, 0, 0, 0);
                }
            }
        };
    }
    Webglimpse.newColumnLayout = newColumnLayout;
})(Webglimpse || (Webglimpse = {}));

var Webglimpse;

(function(Webglimpse) {
    /**
    * Simple layout which sets the sizes of all child panes to the size of the parent pane
    * (causing all the children to 'overlay' each other and the parent).
    */
    function newOverlayLayout() {
        return {
            updatePrefSize: function(parentPrefSize, children) {
                var underlays = [];
                for (var c = 0; c < children.length; c++) {
                    var child = children[c];
                    var isUnderlay = child.layoutArg;
                    if (isUnderlay) {
                        underlays.push(child);
                    }
                }
                if (!Webglimpse.isEmpty(underlays)) {
                    var maxChildPrefWidth = 0;
                    var maxChildPrefHeight = 0;
                    for (var c = 0; c < underlays.length; c++) {
                        var childPrefSize = underlays[c].prefSize;
                        var childPrefWidth = childPrefSize.w;
                        if (Webglimpse.hasval(maxChildPrefWidth) && Webglimpse.hasval(childPrefWidth)) {
                            maxChildPrefWidth = Math.max(maxChildPrefWidth, childPrefWidth);
                        } else {
                            maxChildPrefWidth = null;
                        }
                        var childPrefHeight = childPrefSize.h;
                        if (Webglimpse.hasval(maxChildPrefHeight) && Webglimpse.hasval(childPrefHeight)) {
                            maxChildPrefHeight = Math.max(maxChildPrefHeight, childPrefHeight);
                        } else {
                            maxChildPrefHeight = null;
                        }
                    }
                    parentPrefSize.w = maxChildPrefWidth;
                    parentPrefSize.h = maxChildPrefHeight;
                } else {
                    parentPrefSize.w = 0;
                    parentPrefSize.h = 0;
                }
            },
            updateChildViewports: function(children, parentViewport) {
                for (var c = 0; c < children.length; c++) {
                    children[c].viewport.setBounds(parentViewport);
                }
            }
        };
    }
    Webglimpse.newOverlayLayout = newOverlayLayout;
})(Webglimpse || (Webglimpse = {}));

var Webglimpse;

(function(Webglimpse) {
    /**
    * A layout similar to overlay_layout except only one child pane is visible at a time.
    * That child pane has its size set to the size of the parent pane. The other children panes
    * are made invisible until they are the active pane.
    *
    * The layoutArg for each child is a boolean, true if it should be the active pane. One is chosen
    * arbitrarily if multiple panes have true layoutArg.
    */
    function newCardLayout() {
        return {
            updatePrefSize: function(parentPrefSize, children) {
                var activeChild;
                for (var c = 0; c < children.length; c++) {
                    var child = children[c];
                    var isActive = child.layoutArg;
                    if (isActive) {
                        activeChild = child;
                    }
                }
                if (Webglimpse.hasval(activeChild)) {
                    var childPrefSize = activeChild.prefSize;
                    var childPrefWidth = childPrefSize.w;
                    if (Webglimpse.hasval(childPrefWidth)) {
                        parentPrefSize.w = childPrefWidth;
                    } else {
                        parentPrefSize.w = null;
                    }
                    var childPrefHeight = childPrefSize.h;
                    if (Webglimpse.hasval(childPrefHeight)) {
                        parentPrefSize.h = childPrefHeight;
                    } else {
                        parentPrefSize.h = null;
                    }
                } else {
                    parentPrefSize.w = 0;
                    parentPrefSize.h = 0;
                }
            },
            updateChildViewports: function(children, parentViewport) {
                var activeChildIndex;
                for (var c = 0; c < children.length; c++) {
                    var child = children[c];
                    var isActive = child.layoutArg;
                    if (isActive) {
                        activeChildIndex = c;
                    }
                }
                for (var c = 0; c < children.length; c++) {
                    if (c === activeChildIndex) {
                        children[c].viewport.setBounds(parentViewport);
                    } else {
                        children[c].viewport.setEdges(0, 0, 0, 0);
                    }
                }
            }
        };
    }
    Webglimpse.newCardLayout = newCardLayout;
})(Webglimpse || (Webglimpse = {}));

var Webglimpse;

(function(Webglimpse) {
    function newBorderPainter(color, options) {
        if (!Webglimpse.hasval(options)) options = {};
        if (!Webglimpse.hasval(options.drawTop)) options.drawTop = true;
        if (!Webglimpse.hasval(options.drawLeft)) options.drawLeft = true;
        if (!Webglimpse.hasval(options.drawRight)) options.drawRight = true;
        if (!Webglimpse.hasval(options.drawBottom)) options.drawBottom = true;
        if (!Webglimpse.hasval(options.thickness)) options.thickness = 1;
        var simple = options.thickness === 1 && color.a >= 1;
        return simple ? newSimpleBorderPainter(color, options) : newFullBorderPainter(color, options);
    }
    Webglimpse.newBorderPainter = newBorderPainter;
    function newFullBorderPainter(color, options) {
        var drawTop = options.drawTop;
        var drawLeft = options.drawLeft;
        var drawRight = options.drawRight;
        var drawBottom = options.drawBottom;
        var thickness = options.thickness;
        var program = new Webglimpse.Program(Webglimpse.xyNdc_VERTSHADER, Webglimpse.solid_FRAGSHADER);
        var u_Color = new Webglimpse.UniformColor(program, "u_Color");
        var a_XyNdc = new Webglimpse.Attribute(program, "a_XyNdc");
        var numVertices = (drawTop ? 6 : 0) + (drawLeft ? 6 : 0) + (drawRight ? 6 : 0) + (drawBottom ? 6 : 0);
        var xy_NDC = new Float32Array(2 * numVertices);
        var xyBuffer_NDC = Webglimpse.newDynamicBuffer();
        return function(gl, viewport) {
            if (color.a >= 1) {
                gl.disable(Webglimpse.GL.BLEND);
            } else {
                gl.blendFuncSeparate(Webglimpse.GL.SRC_ALPHA, Webglimpse.GL.ONE_MINUS_SRC_ALPHA, Webglimpse.GL.ONE, Webglimpse.GL.ONE_MINUS_SRC_ALPHA);
                gl.enable(Webglimpse.GL.BLEND);
            }
            program.use(gl);
            u_Color.setData(gl, color);
            var w_NDC = 2 * thickness / viewport.w;
            var h_NDC = 2 * thickness / viewport.h;
            var index = 0;
            if (drawTop) index = Webglimpse.putQuadXys(xy_NDC, index, -1, drawRight ? +1 - w_NDC : +1, +1, +1 - h_NDC);
            if (drawRight) index = Webglimpse.putQuadXys(xy_NDC, index, +1 - w_NDC, +1, +1, drawBottom ? -1 + h_NDC : -1);
            if (drawBottom) index = Webglimpse.putQuadXys(xy_NDC, index, drawLeft ? -1 + w_NDC : -1, +1, -1 + h_NDC, -1);
            if (drawLeft) index = Webglimpse.putQuadXys(xy_NDC, index, -1, -1 + w_NDC, drawTop ? +1 - h_NDC : +1, -1);
            xyBuffer_NDC.setData(xy_NDC);
            a_XyNdc.setDataAndEnable(gl, xyBuffer_NDC, 2, Webglimpse.GL.FLOAT);
            gl.drawArrays(Webglimpse.GL.TRIANGLES, 0, numVertices);
            a_XyNdc.disable(gl);
            program.endUse(gl);
        };
    }
    function newSimpleBorderPainter(color, options) {
        var drawTop = options.drawTop;
        var drawLeft = options.drawLeft;
        var drawRight = options.drawRight;
        var drawBottom = options.drawBottom;
        var program = new Webglimpse.Program(Webglimpse.xyNdc_VERTSHADER, Webglimpse.solid_FRAGSHADER);
        var u_Color = new Webglimpse.UniformColor(program, "u_Color");
        var a_XyNdc = new Webglimpse.Attribute(program, "a_XyNdc");
        var numVertices = (drawTop ? 2 : 0) + (drawLeft ? 2 : 0) + (drawRight ? 2 : 0) + (drawBottom ? 2 : 0);
        var xy_NDC = new Float32Array(2 * numVertices);
        var xyBuffer_NDC = Webglimpse.newDynamicBuffer();
        return function(gl, viewport) {
            gl.disable(Webglimpse.GL.BLEND);
            program.use(gl);
            u_Color.setData(gl, color);
            var left_NDC = Webglimpse.fracToNdc(.5 / viewport.w);
            var bottom_NDC = Webglimpse.fracToNdc(.5 / viewport.h);
            var right_NDC = Webglimpse.fracToNdc((viewport.w - .5) / viewport.w);
            var top_NDC = Webglimpse.fracToNdc((viewport.h - .5) / viewport.h);
            var n = 0;
            if (drawTop) {
                xy_NDC[n++] = -1;
                xy_NDC[n++] = top_NDC;
                xy_NDC[n++] = +1;
                xy_NDC[n++] = top_NDC;
            }
            if (drawRight) {
                xy_NDC[n++] = right_NDC;
                xy_NDC[n++] = +1;
                xy_NDC[n++] = right_NDC;
                xy_NDC[n++] = -1;
            }
            if (drawBottom) {
                xy_NDC[n++] = +1;
                xy_NDC[n++] = bottom_NDC;
                xy_NDC[n++] = -1;
                xy_NDC[n++] = bottom_NDC;
            }
            if (drawLeft) {
                xy_NDC[n++] = left_NDC;
                xy_NDC[n++] = -1;
                xy_NDC[n++] = left_NDC;
                xy_NDC[n++] = +1;
            }
            xyBuffer_NDC.setData(xy_NDC);
            a_XyNdc.setDataAndEnable(gl, xyBuffer_NDC, 2, Webglimpse.GL.FLOAT);
            // IE does not support lineWidths other than 1, so make sure all browsers use lineWidth of 1
            gl.lineWidth(1);
            gl.drawArrays(Webglimpse.GL.LINES, 0, numVertices);
            a_XyNdc.disable(gl);
            program.endUse(gl);
        };
    }
})(Webglimpse || (Webglimpse = {}));

var Webglimpse;

(function(Webglimpse) {
    var Axis1D = function() {
        function Axis1D(vMin, vMax) {
            this._limitsChanged = new Webglimpse.Notification();
            this._vMin = vMin;
            this._vMax = vMax;
        }
        Object.defineProperty(Axis1D.prototype, "vMin", {
            get: function() {
                return this._vMin;
            },
            set: function(vMin) {
                this._vMin = vMin;
                this._limitsChanged.fire();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Axis1D.prototype, "vMax", {
            get: function() {
                return this._vMax;
            },
            set: function(vMax) {
                this._vMax = vMax;
                this._limitsChanged.fire();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Axis1D.prototype, "limitsChanged", {
            get: function() {
                return this._limitsChanged;
            },
            enumerable: true,
            configurable: true
        });
        Axis1D.prototype.setVRange = function(vMin, vMax) {
            this._vMin = vMin;
            this._vMax = vMax;
            this._limitsChanged.fire();
        };
        Object.defineProperty(Axis1D.prototype, "vSize", {
            get: function() {
                return this._vMax - this._vMin;
            },
            enumerable: true,
            configurable: true
        });
        Axis1D.prototype.vAtFrac = function(vFrac) {
            return this._vMin + vFrac * (this._vMax - this._vMin);
        };
        Axis1D.prototype.vFrac = function(v) {
            return (v - this._vMin) / (this._vMax - this._vMin);
        };
        Axis1D.prototype.pan = function(vAmount) {
            this._vMin += vAmount;
            this._vMax += vAmount;
            this._limitsChanged.fire();
        };
        Axis1D.prototype.zoom = function(factor, vAnchor) {
            this._vMin = vAnchor - factor * (vAnchor - this._vMin);
            this._vMax = vAnchor + factor * (this._vMax - vAnchor);
            this._limitsChanged.fire();
        };
        return Axis1D;
    }();
    Webglimpse.Axis1D = Axis1D;
    function getTickInterval(axis, approxNumTicks) {
        var vMin = Math.min(axis.vMin, axis.vMax);
        var vMax = Math.max(axis.vMin, axis.vMax);
        var approxTickInterval = (vMax - vMin) / approxNumTicks;
        var prelimTickInterval = Math.pow(10, Math.round(Webglimpse.log10(approxTickInterval)));
        var prelimNumTicks = (vMax - vMin) / prelimTickInterval;
        if (prelimNumTicks >= 5 * approxNumTicks) return prelimTickInterval * 5;
        if (prelimNumTicks >= 2 * approxNumTicks) return prelimTickInterval * 2;
        if (5 * prelimNumTicks <= approxNumTicks) return prelimTickInterval / 5;
        if (2 * prelimNumTicks <= approxNumTicks) return prelimTickInterval / 2;
        return prelimTickInterval;
    }
    Webglimpse.getTickInterval = getTickInterval;
    function getTickCount(axis, tickInterval) {
        return Math.ceil(Math.abs(axis.vSize) / tickInterval) + 1;
    }
    Webglimpse.getTickCount = getTickCount;
    function getTickPositions(axis, tickInterval, tickCount, result) {
        var vMin = Math.min(axis.vMin, axis.vMax);
        var vMax = Math.max(axis.vMin, axis.vMax);
        var minTickNumber = Math.floor(vMin / tickInterval);
        for (var i = 0; i < tickCount; i++) {
            result[i] = (minTickNumber + i) * tickInterval;
        }
        if (axis.vMin > axis.vMax) {
            for (var i = 0; i < tickCount / 2; i++) {
                var temp = result[i];
                result[i] = result[tickCount - 1 - i];
                result[tickCount - 1 - i] = temp;
            }
        }
    }
    Webglimpse.getTickPositions = getTickPositions;
    var Axis2D = function() {
        function Axis2D(xAxis, yAxis) {
            this._xAxis = xAxis;
            this._yAxis = yAxis;
        }
        Object.defineProperty(Axis2D.prototype, "xAxis", {
            get: function() {
                return this._xAxis;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Axis2D.prototype, "xMin", {
            get: function() {
                return this._xAxis.vMin;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Axis2D.prototype, "xMax", {
            get: function() {
                return this._xAxis.vMax;
            },
            enumerable: true,
            configurable: true
        });
        Axis2D.prototype.xAtFrac = function(xFrac) {
            return this._xAxis.vAtFrac(xFrac);
        };
        Object.defineProperty(Axis2D.prototype, "yAxis", {
            get: function() {
                return this._yAxis;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Axis2D.prototype, "yMin", {
            get: function() {
                return this._yAxis.vMin;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Axis2D.prototype, "yMax", {
            get: function() {
                return this._yAxis.vMax;
            },
            enumerable: true,
            configurable: true
        });
        Axis2D.prototype.yAtFrac = function(yFrac) {
            return this._yAxis.vAtFrac(yFrac);
        };
        Axis2D.prototype.onLimitsChanged = function(listener) {
            this._xAxis.limitsChanged.on(listener);
            this._yAxis.limitsChanged.on(listener);
        };
        Axis2D.prototype.pan = function(xAmount, yAmount) {
            this._xAxis.pan(xAmount);
            this._yAxis.pan(yAmount);
        };
        Axis2D.prototype.zoom = function(factor, xAnchor, yAnchor) {
            this._xAxis.zoom(factor, xAnchor);
            this._yAxis.zoom(factor, yAnchor);
        };
        return Axis2D;
    }();
    Webglimpse.Axis2D = Axis2D;
    function newAxis2D(xMin, xMax, yMin, yMax) {
        return new Axis2D(new Axis1D(xMin, xMax), new Axis1D(yMin, yMax));
    }
    Webglimpse.newAxis2D = newAxis2D;
    // XXX: Would be nice if this could be a const
    Webglimpse.axisZoomStep = 1.12;
    function attachAxisMouseListeners1D(pane, axis, isVertical) {
        var vGrab = null;
        pane.mouseDown.on(function(ev) {
            if (Webglimpse.isLeftMouseDown(ev.mouseEvent) && !Webglimpse.hasval(vGrab)) {
                vGrab = axis.vAtFrac(isVertical ? Webglimpse.yFrac(ev) : Webglimpse.xFrac(ev));
            }
        });
        pane.mouseMove.on(function(ev) {
            if (Webglimpse.isLeftMouseDown(ev.mouseEvent) && Webglimpse.hasval(vGrab)) {
                axis.pan(vGrab - axis.vAtFrac(isVertical ? Webglimpse.yFrac(ev) : Webglimpse.xFrac(ev)));
            }
        });
        pane.mouseUp.on(function(ev) {
            vGrab = null;
        });
        pane.mouseWheel.on(function(ev) {
            var zoomFactor = Math.pow(Webglimpse.axisZoomStep, ev.wheelSteps);
            axis.zoom(zoomFactor, axis.vAtFrac(isVertical ? Webglimpse.yFrac(ev) : Webglimpse.xFrac(ev)));
        });
    }
    Webglimpse.attachAxisMouseListeners1D = attachAxisMouseListeners1D;
    function attachAxisMouseListeners2D(pane, axis) {
        var xGrab = null;
        var yGrab = null;
        pane.mouseDown.on(function(ev) {
            if (Webglimpse.isLeftMouseDown(ev.mouseEvent) && !Webglimpse.hasval(xGrab)) {
                xGrab = axis.xAtFrac(Webglimpse.xFrac(ev));
                yGrab = axis.yAtFrac(Webglimpse.yFrac(ev));
            }
        });
        pane.mouseMove.on(function(ev) {
            if (Webglimpse.isLeftMouseDown(ev.mouseEvent) && Webglimpse.hasval(xGrab)) {
                axis.pan(xGrab - axis.xAtFrac(Webglimpse.xFrac(ev)), yGrab - axis.yAtFrac(Webglimpse.yFrac(ev)));
            }
        });
        pane.mouseUp.on(function(ev) {
            xGrab = null;
            yGrab = null;
        });
        pane.mouseWheel.on(function(ev) {
            var zoomFactor = Math.pow(Webglimpse.axisZoomStep, ev.wheelSteps);
            axis.zoom(zoomFactor, axis.xAtFrac(Webglimpse.xFrac(ev)), axis.yAtFrac(Webglimpse.yFrac(ev)));
        });
    }
    Webglimpse.attachAxisMouseListeners2D = attachAxisMouseListeners2D;
})(Webglimpse || (Webglimpse = {}));

var Webglimpse;

(function(Webglimpse) {
    function newPlotLayout(options) {
        var horizAxisHeight = Webglimpse.hasval(options) && Webglimpse.hasval(options.horizAxisHeight) ? options.horizAxisHeight : 60;
        var vertAxisWidth = Webglimpse.hasval(options) && Webglimpse.hasval(options.vertAxisWidth) ? options.vertAxisWidth : 70;
        return {
            updateChildViewports: function(children, parentViewport) {
                var topAxes = [];
                var leftAxes = [];
                var rightAxes = [];
                var bottomAxes = [];
                var centers = [];
                var others = [];
                for (var c = 0; c < children.length; c++) {
                    var child = children[c];
                    switch (child.layoutArg) {
                      case 0:
                        topAxes.push(child);
                        break;

                      case 3:
                        leftAxes.push(child);
                        break;

                      case 2:
                        rightAxes.push(child);
                        break;

                      case 1:
                        bottomAxes.push(child);
                        break;

                      case null:
                        centers.push(child);
                        break;

                      default:
                        others.push(child);
                        break;
                    }
                }
                var numVertAxes = leftAxes.length + rightAxes.length;
                var numHorizAxes = topAxes.length + bottomAxes.length;
                var centerWidth = Math.max(vertAxisWidth, parentViewport.w - numVertAxes * vertAxisWidth);
                var centerHeight = Math.max(horizAxisHeight, parentViewport.h - numHorizAxes * horizAxisHeight);
                var vertAxisWidth2 = numVertAxes === 0 ? 0 : (parentViewport.w - centerWidth) / numVertAxes;
                var horizAxisHeight2 = numHorizAxes === 0 ? 0 : (parentViewport.h - centerHeight) / numHorizAxes;
                var iCenterStart = parentViewport.iStart + leftAxes.length * vertAxisWidth2;
                var iCenterEnd = parentViewport.iEnd - rightAxes.length * vertAxisWidth2;
                var jCenterStart = parentViewport.jStart + bottomAxes.length * horizAxisHeight2;
                var jCenterEnd = parentViewport.jEnd - topAxes.length * horizAxisHeight2;
                for (var c = 0; c < topAxes.length; c++) {
                    var jStart = Math.round(jCenterEnd + c * horizAxisHeight2);
                    var jEnd = c === topAxes.length - 1 ? parentViewport.jEnd : Math.round(jCenterEnd + (c + 1) * horizAxisHeight2);
                    topAxes[c].viewport.setEdges(iCenterStart, iCenterEnd, jStart, jEnd);
                }
                for (var c = 0; c < bottomAxes.length; c++) {
                    var jStart = c === bottomAxes.length - 1 ? parentViewport.jStart : Math.round(jCenterStart - (c + 1) * horizAxisHeight2);
                    var jEnd = Math.round(jCenterStart - c * horizAxisHeight2);
                    bottomAxes[c].viewport.setEdges(iCenterStart, iCenterEnd, jStart, jEnd);
                }
                for (var c = 0; c < leftAxes.length; c++) {
                    var iStart = c === leftAxes.length - 1 ? parentViewport.iStart : Math.round(iCenterStart - (c + 1) * vertAxisWidth2);
                    var iEnd = Math.round(iCenterStart - c * vertAxisWidth2);
                    leftAxes[c].viewport.setEdges(iStart, iEnd, jCenterStart, jCenterEnd);
                }
                for (var c = 0; c < rightAxes.length; c++) {
                    var iStart = Math.round(iCenterEnd + c * vertAxisWidth2);
                    var iEnd = c === rightAxes.length - 1 ? parentViewport.iEnd : Math.round(iCenterEnd + (c + 1) * vertAxisWidth2);
                    rightAxes[c].viewport.setEdges(iStart, iEnd, jCenterStart, jCenterEnd);
                }
                for (var c = 0; c < centers.length; c++) {
                    centers[c].viewport.setEdges(iCenterStart, iCenterEnd, jCenterStart, jCenterEnd);
                }
                for (var c = 0; c < others.length; c++) {
                    others[c].viewport.setEdges(0, 0, 0, 0);
                }
            }
        };
    }
    Webglimpse.newPlotLayout = newPlotLayout;
})(Webglimpse || (Webglimpse = {}));

var Webglimpse;

(function(Webglimpse) {
    function edgeMarks_VERTSHADER(labelSide) {
        // The shader uses 'a' for the along-axis coord, and 'b' for the across-axis coord
        var horizontal = labelSide === 0 || labelSide === 1;
        var bFlip = labelSide === 3 || labelSide === 1;
        return Webglimpse.concatLines(Webglimpse.nearestPixelCenter_GLSLFUNC, "                                                                                               ", "  uniform float u_VMin;                                                                        ", "  uniform float u_VSize;                                                                       ", "  uniform vec2 u_ViewportSize;                                                                 ", "  uniform float u_MarkSize;                                                                    ", "                                                                                               ", "  attribute vec2 a_VCoord;                                                                     ", "                                                                                               ", "  void main( ) {                                                                               ", "      float aViewportSize = " + (horizontal ? "u_ViewportSize.x" : "u_ViewportSize.y") + ";  ", "      float aFrac = nearestPixelCenter( ( a_VCoord.x - u_VMin ) / u_VSize, aViewportSize );    ", "      float a = -1.0 + 2.0*( aFrac );                                                          ", "                                                                                               ", "      float bViewportSize = " + (horizontal ? "u_ViewportSize.y" : "u_ViewportSize.x") + ";  ", "      float bFrac = ( a_VCoord.y * u_MarkSize ) / bViewportSize;                               ", "      float b = " + (bFlip ? "-" : "") + "( -1.0 + 2.0*( bFrac ) );                         ", "                                                                                               ", "      gl_Position = vec4( " + (horizontal ? "a,b" : "b,a") + ", 0.0, 1.0 );                  ", "  }                                                                                            ", "                                                                                               ");
    }
    Webglimpse.edgeMarks_VERTSHADER = edgeMarks_VERTSHADER;
    Webglimpse.gradient_FRAGSHADER = Webglimpse.concatLines("                                 ", "  precision highp float;         ", "  uniform sampler2D u_colorTex;  ", "                                 ", "  varying vec2 v_texCoord;       ", "                                                                                   ", "  void main( ) {                                                                   ", "     vec4 color = texture2D( u_colorTex, v_texCoord );                             ", "     gl_FragColor = color;                                                         ", "     gl_FragColor.a = 1.0;                                                         ", "  }                                                                                ");
    function newEdgeAxisPainter(axis, labelSide, options) {
        var tickSpacing = Webglimpse.hasval(options) && Webglimpse.hasval(options.tickSpacing) ? options.tickSpacing : 100;
        var label = Webglimpse.hasval(options) && Webglimpse.hasval(options.label) ? options.label : "";
        var units = Webglimpse.hasval(options) && Webglimpse.hasval(options.units) ? options.units : "";
        var shortenLabels = Webglimpse.hasval(options) && Webglimpse.hasval(options.shortenLabels) ? options.shortenLabels : true;
        var font = Webglimpse.hasval(options) && Webglimpse.hasval(options.font) ? options.font : "11px verdana,sans-serif";
        var textColor = Webglimpse.hasval(options) && Webglimpse.hasval(options.textColor) ? options.textColor : Webglimpse.black;
        var tickColor = Webglimpse.hasval(options) && Webglimpse.hasval(options.tickColor) ? options.tickColor : Webglimpse.black;
        var tickSize = Webglimpse.hasval(options) && Webglimpse.hasval(options.tickSize) ? options.tickSize : 6;
        var showLabel = Webglimpse.hasval(options) && Webglimpse.hasval(options.showLabel) ? options.showLabel : true;
        var showBorder = Webglimpse.hasval(options) && Webglimpse.hasval(options.showBorder) ? options.showBorder : false;
        var gradientFill = Webglimpse.hasval(options) && Webglimpse.hasval(options.gradientFill) ? options.gradientFill : undefined;
        var tickLabeler = Webglimpse.hasval(options) && Webglimpse.hasval(options.tickLabeler) ? options.tickLabeler : undefined;
        var tickPositions = new Float32Array(0);
        var gradientProgram = new Webglimpse.Program(Webglimpse.heatmap_VERTSHADER, Webglimpse.gradient_FRAGSHADER);
        var gradientProgram_u_modelViewMatrix = new Webglimpse.UniformMatrix4f(gradientProgram, "u_modelViewMatrix");
        var gradientProgram_u_colorTexture = new Webglimpse.UniformSampler2D(gradientProgram, "u_colorTex");
        var gradientProgram_a_vertCoord = new Webglimpse.Attribute(gradientProgram, "a_vertCoord");
        var gradientProgram_a_texCoord = new Webglimpse.Attribute(gradientProgram, "a_texCoord");
        if (gradientFill) var gradientColorTexture = Webglimpse.getGradientTexture(gradientFill);
        var gradientVertCoords = new Float32Array(0);
        var gradientVertCoordsBuffer = Webglimpse.newDynamicBuffer();
        var gradientTexCoords = new Float32Array(0);
        var gradientTexCoordsBuffer = Webglimpse.newDynamicBuffer();
        var borderProgram = new Webglimpse.Program(Webglimpse.modelview_VERTSHADER, Webglimpse.solid_FRAGSHADER);
        var borderProgram_a_Position = new Webglimpse.Attribute(borderProgram, "a_Position");
        var borderProgram_u_modelViewMatrix = new Webglimpse.UniformMatrix4f(borderProgram, "u_modelViewMatrix");
        var borderProgram_u_Color = new Webglimpse.UniformColor(borderProgram, "u_Color");
        var borderCoords = new Float32Array(0);
        var borderCoordsBuffer = Webglimpse.newDynamicBuffer();
        var marksProgram = new Webglimpse.Program(edgeMarks_VERTSHADER(labelSide), Webglimpse.solid_FRAGSHADER);
        var marksProgram_u_VMin = new Webglimpse.Uniform1f(marksProgram, "u_VMin");
        var marksProgram_u_VSize = new Webglimpse.Uniform1f(marksProgram, "u_VSize");
        var marksProgram_u_ViewportSize = new Webglimpse.Uniform2f(marksProgram, "u_ViewportSize");
        var marksProgram_u_MarkSize = new Webglimpse.Uniform1f(marksProgram, "u_MarkSize");
        var marksProgram_u_Color = new Webglimpse.UniformColor(marksProgram, "u_Color");
        var marksProgram_a_VCoord = new Webglimpse.Attribute(marksProgram, "a_VCoord");
        var markCoords = new Float32Array(0);
        var markCoordsBuffer = Webglimpse.newDynamicBuffer();
        var textTextures = Webglimpse.newTextTextureCache(font, textColor);
        var textureRenderer = new Webglimpse.TextureRenderer();
        var hTickLabels = textTextures.value("-0.123456789").h;
        var isVerticalAxis = labelSide === 3 || labelSide === 2;
        return function(gl, viewport) {
            var sizePixels = isVerticalAxis ? viewport.h : viewport.w;
            if (sizePixels === 0) return;
            var approxNumTicks = sizePixels / tickSpacing;
            var tickInterval = Webglimpse.getTickInterval(axis, approxNumTicks);
            var tickCount = Webglimpse.getTickCount(axis, tickInterval);
            tickPositions = Webglimpse.ensureCapacityFloat32(tickPositions, tickCount);
            Webglimpse.getTickPositions(axis, tickInterval, tickCount, tickPositions);
            // Border Box and Gradient Fill
            //
            //XXX border vertices are fixed in normalized 0-1 viewport coordinates
            //XXX they could be calculated ahead of time -- however I had trouble with 'fuzzy' lines when using 0-1 coordinates
            if (showBorder || gradientFill) {
                borderCoords = Webglimpse.ensureCapacityFloat32(borderCoords, 10);
                var horizontal = labelSide === 0 || labelSide === 1;
                var bFlip = labelSide === 3 || labelSide === 1;
                var width = viewport.w - 1;
                var height = viewport.h - 1;
                borderCoords[0] = horizontal ? 0 : bFlip ? width - tickSize : 0;
                borderCoords[1] = !horizontal ? 0 : bFlip ? height - tickSize : 0;
                borderCoords[2] = horizontal ? 0 : bFlip ? width : tickSize;
                borderCoords[3] = !horizontal ? 0 : bFlip ? height : tickSize;
                borderCoords[4] = horizontal ? width : bFlip ? width : tickSize;
                borderCoords[5] = !horizontal ? height : bFlip ? height : tickSize;
                borderCoords[6] = horizontal ? width : bFlip ? width - tickSize : 0;
                borderCoords[7] = !horizontal ? height : bFlip ? height - tickSize : 0;
                // finish off the box (same as 0, 1 coordinates)
                borderCoords[8] = horizontal ? 0 : bFlip ? width - tickSize : 0;
                borderCoords[9] = !horizontal ? 0 : bFlip ? height - tickSize : 0;
            }
            if (gradientFill) {
                gradientProgram.use(gl);
                gradientProgram_u_modelViewMatrix.setData(gl, Webglimpse.glOrthoViewport(viewport));
                gradientProgram_u_colorTexture.setDataAndBind(gl, 0, gradientColorTexture);
                gradientVertCoords = Webglimpse.ensureCapacityFloat32(gradientVertCoords, 8);
                gradientVertCoords[0] = borderCoords[2];
                gradientVertCoords[1] = borderCoords[3];
                gradientVertCoords[2] = borderCoords[0];
                gradientVertCoords[3] = borderCoords[1];
                gradientVertCoords[4] = borderCoords[4];
                gradientVertCoords[5] = borderCoords[5];
                gradientVertCoords[6] = borderCoords[6];
                gradientVertCoords[7] = borderCoords[7];
                gradientVertCoordsBuffer.setData(gradientVertCoords);
                gradientProgram_a_vertCoord.setDataAndEnable(gl, gradientVertCoordsBuffer, 2, Webglimpse.GL.FLOAT);
                // y texture coordinates don't really matter ( we're simulating a 1d texture )
                // using a 1-by-n 2d texture because 1d textures aren't available
                gradientTexCoords = Webglimpse.ensureCapacityFloat32(gradientTexCoords, 8);
                gradientTexCoords[0] = 0;
                gradientTexCoords[1] = 0;
                gradientTexCoords[2] = 0;
                gradientTexCoords[3] = 0;
                gradientTexCoords[4] = 1;
                gradientTexCoords[5] = 1;
                gradientTexCoords[6] = 1;
                gradientTexCoords[7] = 1;
                gradientTexCoordsBuffer.setData(gradientTexCoords);
                gradientProgram_a_texCoord.setDataAndEnable(gl, gradientTexCoordsBuffer, 2, Webglimpse.GL.FLOAT);
                gl.drawArrays(Webglimpse.GL.TRIANGLE_STRIP, 0, 4);
                gradientProgram_u_colorTexture.unbind(gl);
                gradientProgram_a_vertCoord.disable(gl);
                gradientProgram_a_texCoord.disable(gl);
                gradientProgram.endUse(gl);
            }
            if (showBorder) {
                borderProgram.use(gl);
                borderProgram_u_Color.setData(gl, tickColor);
                borderProgram_u_modelViewMatrix.setData(gl, Webglimpse.glOrthoViewport(viewport));
                borderCoordsBuffer.setData(borderCoords.subarray(0, 10));
                borderProgram_a_Position.setDataAndEnable(gl, borderCoordsBuffer, 2, Webglimpse.GL.FLOAT);
                // IE does not support lineWidths other than 1, so make sure all browsers use lineWidth of 1
                gl.lineWidth(1);
                gl.drawArrays(Webglimpse.GL.LINE_STRIP, 0, 5);
                borderProgram_a_Position.disable(gl);
                borderProgram.endUse(gl);
            }
            // Tick marks
            //
            marksProgram.use(gl);
            marksProgram_u_VMin.setData(gl, axis.vMin);
            marksProgram_u_VSize.setData(gl, axis.vSize);
            marksProgram_u_ViewportSize.setData(gl, viewport.w, viewport.h);
            marksProgram_u_MarkSize.setData(gl, tickSize);
            marksProgram_u_Color.setData(gl, tickColor);
            markCoords = Webglimpse.ensureCapacityFloat32(markCoords, 4 * tickCount);
            for (var n = 0; n < tickCount; n++) {
                var v = tickPositions[n];
                markCoords[4 * n + 0] = v;
                markCoords[4 * n + 1] = 0;
                markCoords[4 * n + 2] = v;
                markCoords[4 * n + 3] = 1;
            }
            markCoordsBuffer.setData(markCoords.subarray(0, 4 * tickCount));
            marksProgram_a_VCoord.setDataAndEnable(gl, markCoordsBuffer, 2, Webglimpse.GL.FLOAT);
            // IE does not support lineWidths other than 1, so make sure all browsers use lineWidth of 1
            gl.lineWidth(1);
            gl.drawArrays(Webglimpse.GL.LINES, 0, 2 * tickCount);
            marksProgram_a_VCoord.disable(gl);
            marksProgram.endUse(gl);
            // Tick labels
            //
            gl.blendFuncSeparate(Webglimpse.GL.SRC_ALPHA, Webglimpse.GL.ONE_MINUS_SRC_ALPHA, Webglimpse.GL.ONE, Webglimpse.GL.ONE_MINUS_SRC_ALPHA);
            gl.enable(Webglimpse.GL.BLEND);
            var orderAxisRaw = Webglimpse.order(Math.abs(axis.vSize));
            var orderAxis = 0;
            if (orderAxisRaw > 0) {
                orderAxis = Math.floor((orderAxisRaw - 1) / 3) * 3;
            } else if (orderAxisRaw < 0) {
                orderAxis = (Math.ceil(orderAxisRaw / 3) - 1) * 3;
            }
            var orderFactor = Math.pow(10, -orderAxis);
            var orderTick = Webglimpse.order(tickInterval);
            var precision = Math.max(0, orderAxis - orderTick);
            textTextures.resetTouches();
            textureRenderer.begin(gl, viewport);
            for (var n = 0; n < tickCount; n++) {
                var v = tickPositions[n];
                var vFrac = axis.vFrac(v);
                if (vFrac < 0 || vFrac >= 1) continue;
                var tickLabel;
                if (tickLabeler) {
                    // show custom tick value
                    tickLabel = tickLabeler(v, axis, tickInterval);
                } else if (shortenLabels && showLabel) {
                    // show shortened tick value
                    tickLabel = Number(v * orderFactor).toFixed(precision);
                } else if (!shortenLabels) {
                    // show actual tick value
                    if (orderAxisRaw >= 0) {
                        tickLabel = Number(v).toFixed(0);
                    } else {
                        tickLabel = Number(v).toFixed(-orderAxisRaw);
                    }
                } else {
                    // show magnitude inline for each tick
                    tickLabel = Number(v * orderFactor).toFixed(precision) + (orderAxis === 0 ? "" : "e" + orderAxis);
                }
                var textTexture = textTextures.value(tickLabel);
                var xFrac;
                var yFrac;
                if (labelSide === 3 || labelSide === 2) {
                    var yAnchor = textTexture.yAnchor(.43);
                    var j0 = vFrac * viewport.h - yAnchor * textTexture.h;
                    var j = Webglimpse.clamp(0, viewport.h - textTexture.h, j0);
                    yFrac = j / viewport.h;
                    if (labelSide === 3) {
                        xFrac = (viewport.w - tickSize - 2 - textTexture.w) / viewport.w;
                    } else {
                        xFrac = (tickSize + 2) / viewport.w;
                    }
                } else {
                    var wMinus = 0;
                    if (v < 0) {
                        var absTickLabel = Number(Math.abs(v) * orderFactor).toFixed(precision);
                        wMinus = textTexture.w - textTextures.value(absTickLabel).w;
                    }
                    var xAnchor = .45;
                    var i0 = vFrac * viewport.w - xAnchor * (textTexture.w - wMinus) - wMinus;
                    var i = Webglimpse.clamp(0, viewport.w - textTexture.w, i0);
                    xFrac = i / viewport.w;
                    if (labelSide === 1) {
                        yFrac = (viewport.h - tickSize - 2 - hTickLabels) / viewport.h;
                    } else {
                        yFrac = (tickSize + 2) / viewport.h;
                    }
                }
                textureRenderer.draw(gl, textTexture, xFrac, yFrac, {
                    xAnchor: 0,
                    yAnchor: 0
                });
            }
            // Axis label
            //
            if (showLabel) {
                var unitsString = units + (!shortenLabels || orderAxis === 0 ? "" : " x 10^" + orderAxis.toFixed(0));
                var axisLabel = label + (unitsString ? " (" + unitsString + ")" : "");
                if (axisLabel !== "") {
                    var textTexture = textTextures.value(axisLabel);
                    var xFrac;
                    var yFrac;
                    var textOpts;
                    if (labelSide === 3 || labelSide === 2) {
                        // Using hTickLabels here works out about right, even though the tick-label text is horizontal
                        var xFrac0 = .5 * (viewport.w - tickSize - 2 - hTickLabels) / viewport.w;
                        xFrac = labelSide === 3 ? xFrac0 : 1 - xFrac0;
                        yFrac = .5;
                        textOpts = {
                            xAnchor: textTexture.yAnchor(.5),
                            yAnchor: .5,
                            rotation_CCWRAD: .5 * Math.PI
                        };
                    } else {
                        var yFrac0 = .5 * (viewport.h - tickSize - 2 - hTickLabels) / viewport.h;
                        yFrac = labelSide === 1 ? yFrac0 : 1 - yFrac0;
                        xFrac = .5;
                        textOpts = {
                            xAnchor: .5,
                            yAnchor: textTexture.yAnchor(.5),
                            rotation_CCWRAD: 0
                        };
                    }
                    textureRenderer.draw(gl, textTexture, xFrac, yFrac, textOpts);
                }
            }
            // Finish up
            //
            textureRenderer.end(gl);
            textTextures.retainTouched();
        };
    }
    Webglimpse.newEdgeAxisPainter = newEdgeAxisPainter;
})(Webglimpse || (Webglimpse = {}));

var Webglimpse;

(function(Webglimpse) {
    /**
    * Simple xy line painter which displays static data
    */
    function newXyLinePainter(axis, xCoords, yCoords, options) {
        var thickness = Webglimpse.hasval(options) && Webglimpse.hasval(options.thickness) ? options.thickness : 4;
        var color = Webglimpse.hasval(options) && Webglimpse.hasval(options.color) ? options.color : Webglimpse.black;
        var blend = Webglimpse.hasval(options) && Webglimpse.hasval(options.blend) ? options.blend : false;
        var program = new Webglimpse.Program(Webglimpse.modelview_VERTSHADER, Webglimpse.solid_FRAGSHADER);
        var u_Color = new Webglimpse.UniformColor(program, "u_Color");
        var u_modelViewMatrix = new Webglimpse.UniformMatrix4f(program, "u_modelViewMatrix");
        var coordArray = [];
        for (var i = 0; i < xCoords.length; i++) {
            coordArray[2 * i] = xCoords[i];
            coordArray[2 * i + 1] = yCoords[i];
        }
        var coordFloatArray = new Float32Array(coordArray);
        var coordBuffer = Webglimpse.newStaticBuffer(coordFloatArray);
        var dim = 2;
        var count = coordFloatArray.length / dim;
        return function(gl, viewport) {
            if (blend) {
                gl.blendFuncSeparate(Webglimpse.GL.SRC_ALPHA, Webglimpse.GL.ONE_MINUS_SRC_ALPHA, Webglimpse.GL.ONE, Webglimpse.GL.ONE_MINUS_SRC_ALPHA);
                gl.enable(Webglimpse.GL.BLEND);
            }
            // enable the shader
            program.use(gl);
            // set color and projection matrix variables
            u_Color.setData(gl, color);
            // set the projection matrix based on the axis bounds
            u_modelViewMatrix.setData(gl, Webglimpse.glOrthoAxis(axis));
            // XXX: IE doesn't support lineWidth
            gl.lineWidth(thickness);
            // enable vertex attribute array corresponding to vPosition variable in shader
            gl.enableVertexAttribArray(0);
            // bind buffer data to vertex attribute array
            coordBuffer.bind(gl, Webglimpse.GL.ARRAY_BUFFER);
            // first argument corresponds to the 0 attrib array set above
            // second argument indicates two coordinates per vertex
            gl.vertexAttribPointer(0, dim, Webglimpse.GL.FLOAT, false, 0, 0);
            // draw the lines
            gl.drawArrays(Webglimpse.GL.LINE_STRIP, 0, count);
            coordBuffer.unbind(gl, Webglimpse.GL.ARRAY_BUFFER);
            program.endUse(gl);
        };
    }
    Webglimpse.newXyLinePainter = newXyLinePainter;
})(Webglimpse || (Webglimpse = {}));

var Webglimpse;

(function(Webglimpse) {
    // fills an array with jet colorscale values
    // webgl does not support 1D textures, so a 2D texture must be used
    function jet(value) {
        var x = 4 * value;
        var r = clamp(1.5 - Math.abs(x - 3), 0, 1);
        var g = clamp(1.5 - Math.abs(x - 2), 0, 1);
        var b = clamp(1.5 - Math.abs(x - 1), 0, 1);
        return [ r, g, b, 1 ];
    }
    Webglimpse.jet = jet;
    function reverseBone(value) {
        var x = 1 - .875 * value;
        if (value < .375) {
            return [ x, x, x - value / 3, 1 ];
        } else if (value < .75) {
            return [ x, x + .125 - value / 3, x - .125, 1 ];
        } else {
            return [ x + .375 - value * .5, x - .125, x - .125, 1 ];
        }
    }
    Webglimpse.reverseBone = reverseBone;
    function getGradientTexture(gradient, size) {
        if (typeof size === "undefined") {
            size = 1024;
        }
        var array = new Float32Array(size * 4);
        for (var v = 0; v < size; v++) {
            var color = gradient(v / size);
            array[4 * v + 0] = color[0];
            array[4 * v + 1] = color[1];
            array[4 * v + 2] = color[2];
            array[4 * v + 3] = color[3];
        }
        return new Webglimpse.FloatDataTexture2D(size, 1, array);
    }
    Webglimpse.getGradientTexture = getGradientTexture;
    function clamp(n, min, max) {
        if (n < min) {
            return min;
        } else if (n > max) {
            return max;
        } else {
            return n;
        }
    }
})(Webglimpse || (Webglimpse = {}));

var Webglimpse;

(function(Webglimpse) {
    Webglimpse.heatmap_VERTSHADER = Webglimpse.concatLines("                                                          ", "    uniform mat4 u_modelViewMatrix;                       ", "    attribute vec4 a_vertCoord;                           ", "    attribute vec2 a_texCoord;                            ", "    varying vec2 v_texCoord;                              ", "                                                          ", "    void main( ) {                                        ", "        gl_Position = u_modelViewMatrix * a_vertCoord;    ", "        v_texCoord = a_texCoord;                          ", "    }                                                     ", "                                                          ");
    Webglimpse.heatmap_FRAGSHADER = Webglimpse.concatLines("                                 ", "  precision highp float;         ", "  uniform sampler2D u_dataTex;   ", "  uniform sampler2D u_colorTex;  ", "  uniform float u_dataMin;       ", "  uniform float u_dataMax;       ", "                                 ", "  varying vec2 v_texCoord;       ", "                                                                                   ", "  void main()                                                                      ", "  {                                                                                ", "     float dataVal = texture2D( u_dataTex, v_texCoord ).r;                         ", "     float normalizedVal = ( dataVal - u_dataMin ) / ( u_dataMax - u_dataMin );    ", "     clamp( normalizedVal, 0.0, 1.0 );                                             ", "                                                                                   ", "     vec4 color = texture2D( u_colorTex, vec2( normalizedVal, 0 ) );               ", "     gl_FragColor = color;                                                         ", "     gl_FragColor.a = 1.0;                                                         ", "  }                                                                                ");
    /**
    * Simple heatmap painter which displays a 2d matrix of static data
    */
    function newHeatmapPainter(axis, colorAxis, data, colorTexture, options) {
        var blend = Webglimpse.hasval(options) && Webglimpse.hasval(options.blend) ? options.blend : false;
        // only GL_RGBA is supported with GL_FLOAT texture type in webgl (see texture.ts)
        // we we currently need an array 4 times bigger than necessary in order to use FLOATS
        // to store the matrix data in a texture
        var array = new Float32Array(data.xSize * data.ySize * 4);
        for (var x = 0; x < data.xSize; x++) {
            for (var y = 0; y < data.ySize; y++) {
                var index = x * data.ySize + y;
                var value = data.array[index];
                array[4 * index] = value;
                array[4 * index + 1] = value;
                array[4 * index + 2] = value;
                array[4 * index + 3] = value;
            }
        }
        data.array = array;
        var program = new Webglimpse.Program(Webglimpse.heatmap_VERTSHADER, Webglimpse.heatmap_FRAGSHADER);
        var u_modelViewMatrix = new Webglimpse.UniformMatrix4f(program, "u_modelViewMatrix");
        var u_dataTexture = new Webglimpse.UniformSampler2D(program, "u_dataTex");
        var u_colorTexture = new Webglimpse.UniformSampler2D(program, "u_colorTex");
        var u_dataMin = new Webglimpse.Uniform1f(program, "u_dataMin");
        var u_dataMax = new Webglimpse.Uniform1f(program, "u_dataMax");
        var a_vertCoord = new Webglimpse.Attribute(program, "a_vertCoord");
        var a_texCoord = new Webglimpse.Attribute(program, "a_texCoord");
        var texture = new Webglimpse.FloatDataTexture2D(data.xSize, data.ySize, data.array);
        // points in triangle strip
        var vertCoordArray = [ data.xMin, data.yMax, data.xMax, data.yMax, data.xMin, data.yMin, data.xMax, data.yMin ];
        var vertCoordFloatArray = new Float32Array(vertCoordArray);
        var vertCoordBuffer = Webglimpse.newStaticBuffer(vertCoordFloatArray);
        // texture coordinates
        var texCoordArray = [ 0, 1, 1, 1, 0, 0, 1, 0 ];
        var texCoordFloatArray = new Float32Array(texCoordArray);
        var texCoordBuffer = Webglimpse.newStaticBuffer(texCoordFloatArray);
        var dim = 2;
        var vertexCount = 4;
        return function(gl, viewport) {
            if (blend) {
                gl.blendFuncSeparate(Webglimpse.GL.SRC_ALPHA, Webglimpse.GL.ONE_MINUS_SRC_ALPHA, Webglimpse.GL.ONE, Webglimpse.GL.ONE_MINUS_SRC_ALPHA);
                gl.enable(Webglimpse.GL.BLEND);
            }
            program.use(gl);
            u_dataTexture.setDataAndBind(gl, 0, texture);
            u_colorTexture.setDataAndBind(gl, 1, colorTexture);
            u_modelViewMatrix.setData(gl, Webglimpse.glOrthoAxis(axis));
            u_dataMin.setData(gl, colorAxis.vMin);
            u_dataMax.setData(gl, colorAxis.vMax);
            a_vertCoord.setDataAndEnable(gl, vertCoordBuffer, dim, Webglimpse.GL.FLOAT);
            a_texCoord.setDataAndEnable(gl, texCoordBuffer, dim, Webglimpse.GL.FLOAT);
            gl.drawArrays(Webglimpse.GL.TRIANGLE_STRIP, 0, vertexCount);
            a_vertCoord.disable(gl);
            a_texCoord.disable(gl);
            u_dataTexture.unbind(gl);
            u_colorTexture.unbind(gl);
            program.endUse(gl);
        };
    }
    Webglimpse.newHeatmapPainter = newHeatmapPainter;
})(Webglimpse || (Webglimpse = {}));

var Webglimpse;

(function(Webglimpse) {
    function secondsToMillis(value_SECONDS) {
        return value_SECONDS * 1e3;
    }
    Webglimpse.secondsToMillis = secondsToMillis;
    function millisToSeconds(value_MILLIS) {
        return value_MILLIS / 1e3;
    }
    Webglimpse.millisToSeconds = millisToSeconds;
    function minutesToMillis(value_MINUTES) {
        return value_MINUTES * 6e4;
    }
    Webglimpse.minutesToMillis = minutesToMillis;
    function millisToMinutes(value_MILLIS) {
        return value_MILLIS / 6e4;
    }
    Webglimpse.millisToMinutes = millisToMinutes;
    function hoursToMillis(value_HOURS) {
        return value_HOURS * 36e5;
    }
    Webglimpse.hoursToMillis = hoursToMillis;
    function millisToHours(value_MILLIS) {
        return value_MILLIS / 36e5;
    }
    Webglimpse.millisToHours = millisToHours;
    function daysToMillis(value_DAYS) {
        return value_DAYS * 864e5;
    }
    Webglimpse.daysToMillis = daysToMillis;
    function millisToDays(value_MILLIS) {
        return value_MILLIS / 864e5;
    }
    Webglimpse.millisToDays = millisToDays;
})(Webglimpse || (Webglimpse = {}));

var Webglimpse;

(function(Webglimpse) {
    var TimeAxis1D = function(_super) {
        __extends(TimeAxis1D, _super);
        function TimeAxis1D(tMin_PMILLIS, tMax_PMILLIS) {
            this._epoch_PMILLIS = .5 * (tMin_PMILLIS + tMax_PMILLIS);
            _super.call(this, tMin_PMILLIS - this._epoch_PMILLIS, tMax_PMILLIS - this._epoch_PMILLIS);
        }
        Object.defineProperty(TimeAxis1D.prototype, "tMin_PMILLIS", {
            get: function() {
                return this._epoch_PMILLIS + this.vMin;
            },
            set: function(tMin_PMILLIS) {
                this.vMin = tMin_PMILLIS - this._epoch_PMILLIS;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimeAxis1D.prototype, "tMax_PMILLIS", {
            get: function() {
                return this._epoch_PMILLIS + this.vMax;
            },
            set: function(tMax_PMILLIS) {
                this.vMax = tMax_PMILLIS - this._epoch_PMILLIS;
            },
            enumerable: true,
            configurable: true
        });
        TimeAxis1D.prototype.setTRange_PMILLIS = function(tMin_PMILLIS, tMax_PMILLIS) {
            this.setVRange(tMin_PMILLIS - this._epoch_PMILLIS, tMax_PMILLIS - this._epoch_PMILLIS);
        };
        Object.defineProperty(TimeAxis1D.prototype, "tSize_MILLIS", {
            get: function() {
                return this.vSize;
            },
            enumerable: true,
            configurable: true
        });
        TimeAxis1D.prototype.vAtTime = function(t_PMILLIS) {
            return t_PMILLIS - this._epoch_PMILLIS;
        };
        TimeAxis1D.prototype.tAtFrac_PMILLIS = function(tFrac) {
            return this._epoch_PMILLIS + this.vAtFrac(tFrac);
        };
        TimeAxis1D.prototype.tFrac = function(t_PMILLIS) {
            return this.vFrac(t_PMILLIS - this._epoch_PMILLIS);
        };
        TimeAxis1D.prototype.tPan = function(tAmount_MILLIS) {
            this.pan(tAmount_MILLIS);
        };
        TimeAxis1D.prototype.tZoom = function(factor, tAnchor_PMILLIS) {
            this.zoom(factor, tAnchor_PMILLIS - this._epoch_PMILLIS);
        };
        return TimeAxis1D;
    }(Webglimpse.Axis1D);
    Webglimpse.TimeAxis1D = TimeAxis1D;
})(Webglimpse || (Webglimpse = {}));

var Webglimpse;

(function(Webglimpse) {
    function newTimeAxisPainter(timeAxis, labelSide, displayTimeZone, tickTimeZone, options) {
        var tickSpacing = Webglimpse.hasval(options) && Webglimpse.hasval(options.tickSpacing) ? options.tickSpacing : 60;
        var font = Webglimpse.hasval(options) && Webglimpse.hasval(options.font) ? options.font : "11px verdana,sans-serif";
        var textColor = Webglimpse.hasval(options) && Webglimpse.hasval(options.textColor) ? options.textColor : Webglimpse.black;
        var tickColor = Webglimpse.hasval(options) && Webglimpse.hasval(options.tickColor) ? options.tickColor : Webglimpse.black;
        var tickSize = Webglimpse.hasval(options) && Webglimpse.hasval(options.tickSize) ? options.tickSize : 6;
        var labelAlign = Webglimpse.hasval(options) && Webglimpse.hasval(options.labelAlign) ? options.labelAlign : .5;
        var referenceDate_PMILLIS = Webglimpse.hasval(options) && Webglimpse.hasval(options.referenceDate) ? Webglimpse.parseTime_PMILLIS(options.referenceDate) : undefined;
        var isFuturePositive = Webglimpse.hasval(options) && Webglimpse.hasval(options.isFuturePositive) ? options.isFuturePositive : true;
        var marksProgram = new Webglimpse.Program(Webglimpse.edgeMarks_VERTSHADER(labelSide), Webglimpse.solid_FRAGSHADER);
        var marksProgram_u_VMin = new Webglimpse.Uniform1f(marksProgram, "u_VMin");
        var marksProgram_u_VSize = new Webglimpse.Uniform1f(marksProgram, "u_VSize");
        var marksProgram_u_ViewportSize = new Webglimpse.Uniform2f(marksProgram, "u_ViewportSize");
        var marksProgram_u_MarkSize = new Webglimpse.Uniform1f(marksProgram, "u_MarkSize");
        var marksProgram_u_Color = new Webglimpse.UniformColor(marksProgram, "u_Color");
        var marksProgram_a_VCoord = new Webglimpse.Attribute(marksProgram, "a_VCoord");
        var markCoords = new Float32Array(0);
        var markCoordsBuffer = Webglimpse.newDynamicBuffer();
        var textTextures = Webglimpse.newTextTextureCache(font, textColor);
        var textureRenderer = new Webglimpse.TextureRenderer();
        var hTickLabels = textTextures.value("-0123456789:.").h;
        var isVerticalAxis = labelSide === 3 || labelSide === 2;
        return function(gl, viewport) {
            var sizePixels = isVerticalAxis ? viewport.h : viewport.w;
            if (sizePixels === 0) return;
            var tickTimes_PMILLIS = getTickTimes_PMILLIS(timeAxis, sizePixels, tickSpacing, tickTimeZone, referenceDate_PMILLIS);
            var tickInterval_MILLIS = getTickInterval_MILLIS(tickTimes_PMILLIS);
            var tickCount = tickTimes_PMILLIS.length;
            // Tick marks
            //
            marksProgram.use(gl);
            marksProgram_u_VMin.setData(gl, timeAxis.vMin);
            marksProgram_u_VSize.setData(gl, timeAxis.vSize);
            marksProgram_u_ViewportSize.setData(gl, viewport.w, viewport.h);
            marksProgram_u_MarkSize.setData(gl, tickSize);
            marksProgram_u_Color.setData(gl, tickColor);
            markCoords = Webglimpse.ensureCapacityFloat32(markCoords, 4 * tickCount);
            for (var n = 0; n < tickCount; n++) {
                var v = timeAxis.vAtTime(tickTimes_PMILLIS[n]);
                markCoords[4 * n + 0] = v;
                markCoords[4 * n + 1] = 0;
                markCoords[4 * n + 2] = v;
                markCoords[4 * n + 3] = 1;
            }
            markCoordsBuffer.setData(markCoords.subarray(0, 4 * tickCount));
            marksProgram_a_VCoord.setDataAndEnable(gl, markCoordsBuffer, 2, Webglimpse.GL.FLOAT);
            // IE does not support lineWidths other than 1, so make sure all browsers use lineWidth of 1
            gl.lineWidth(1);
            gl.drawArrays(Webglimpse.GL.LINES, 0, 2 * tickCount);
            marksProgram_a_VCoord.disable(gl);
            marksProgram.endUse(gl);
            gl.blendFuncSeparate(Webglimpse.GL.SRC_ALPHA, Webglimpse.GL.ONE_MINUS_SRC_ALPHA, Webglimpse.GL.ONE, Webglimpse.GL.ONE_MINUS_SRC_ALPHA);
            gl.enable(Webglimpse.GL.BLEND);
            // Tick labels
            //
            var ticks = getTickDisplayData(tickInterval_MILLIS, referenceDate_PMILLIS, displayTimeZone, isFuturePositive);
            textTextures.resetTouches();
            textureRenderer.begin(gl, viewport);
            for (var n = 0; n < tickCount; n++) {
                var tickTime_PMILLIS = tickTimes_PMILLIS[n];
                var tFrac = timeAxis.tFrac(tickTime_PMILLIS);
                if (tFrac < 0 || tFrac >= 1) continue;
                var tickLabel = ticks.tickFormat(tickTime_PMILLIS);
                var textTexture = textTextures.value(tickLabel);
                var xFrac;
                var yFrac;
                if (labelSide === 3 || labelSide === 2) {
                    var yAnchor = textTexture.yAnchor(.43);
                    var j0 = tFrac * viewport.h - yAnchor * textTexture.h;
                    var j = Webglimpse.clamp(0, viewport.h - textTexture.h, j0);
                    yFrac = j / viewport.h;
                    if (labelSide === 3) {
                        xFrac = (viewport.w - tickSize - 2 - textTexture.w) / viewport.w;
                    } else {
                        xFrac = (tickSize + 2) / viewport.w;
                    }
                } else {
                    var xAnchor = .45;
                    var i0 = tFrac * viewport.w - xAnchor * textTexture.w;
                    var i = Webglimpse.clamp(0, viewport.w - textTexture.w, i0);
                    xFrac = i / viewport.w;
                    if (labelSide === 1) {
                        yFrac = (viewport.h - tickSize - 2 - hTickLabels) / viewport.h;
                    } else {
                        yFrac = (tickSize + 2) / viewport.h;
                    }
                }
                textureRenderer.draw(gl, textTexture, xFrac, yFrac, {
                    xAnchor: 0,
                    yAnchor: 0
                });
            }
            // Axis label
            //
            if (ticks.timeStructFactory) {
                var timeStructs = createTimeStructs(timeAxis, ticks.timeStructFactory, tickTimeZone, referenceDate_PMILLIS, isFuturePositive, tickTimes_PMILLIS, labelAlign);
                for (var n = 0; n < timeStructs.length; n++) {
                    var timeStruct = timeStructs[n];
                    var text = ticks.prefixFormat(timeStruct);
                    var textTexture = textTextures.value(text);
                    var halfTextFrac = .5 * textTexture.w / viewport.w;
                    var minFrac = timeAxis.tFrac(timeStruct.start_PMILLIS) - halfTextFrac;
                    var maxFrac = timeAxis.tFrac(timeStruct.end_PMILLIS) + halfTextFrac;
                    var tFrac = Webglimpse.clamp(minFrac, maxFrac, timeAxis.tFrac(timeStruct.textCenter_PMILLIS));
                    if (tFrac - halfTextFrac < 0 || tFrac + halfTextFrac > 1) continue;
                    var xFrac;
                    var yFrac;
                    var textOpts;
                    if (labelSide === 3 || labelSide === 2) {
                        // Using hTickLabels here works out about right, even though the tick-label text is horizontal
                        var xFrac0 = .5 * (viewport.w - tickSize - 2 - hTickLabels) / viewport.w;
                        xFrac = labelSide === 3 ? xFrac0 : 1 - xFrac0;
                        yFrac = tFrac;
                        textOpts = {
                            xAnchor: textTexture.yAnchor(.5),
                            yAnchor: .5,
                            rotation_CCWRAD: .5 * Math.PI
                        };
                    } else {
                        var yFrac0 = .5 * (viewport.h - tickSize - 2 - hTickLabels) / viewport.h;
                        yFrac = labelSide === 1 ? yFrac0 : 1 - yFrac0;
                        xFrac = tFrac;
                        textOpts = {
                            xAnchor: .5,
                            yAnchor: textTexture.yAnchor(.5),
                            rotation_CCWRAD: 0
                        };
                    }
                    textureRenderer.draw(gl, textTexture, xFrac, yFrac, textOpts);
                }
            }
            // Finish up
            //
            textureRenderer.end(gl);
            textTextures.retainTouched();
        };
    }
    Webglimpse.newTimeAxisPainter = newTimeAxisPainter;
    function getTickDisplayData(tickInterval_MILLIS, referenceDate_PMILLIS, displayTimeZone, isFuturePositive) {
        if (Webglimpse.hasval(referenceDate_PMILLIS)) {
            return getTickDisplayDataRelative(tickInterval_MILLIS, referenceDate_PMILLIS, isFuturePositive);
        } else {
            return getTickDisplayDataAbsolute(tickInterval_MILLIS, displayTimeZone);
        }
    }
    function getTickDisplayDataRelative(tickInterval_MILLIS, referenceDate_PMILLIS, isFuturePositive) {
        if (tickInterval_MILLIS <= Webglimpse.minutesToMillis(1)) {
            var tickFormat = function(tickTime_PMILLIS) {
                var elapsedTime_MILLIS = Math.abs(tickTime_PMILLIS - referenceDate_PMILLIS);
                var elapsedTime_DAYS = Webglimpse.millisToDays(elapsedTime_MILLIS);
                var elapsedTime_DAYS_WHOLE = Math.floor(elapsedTime_DAYS);
                var elapsedTime_HOURS = (elapsedTime_DAYS - elapsedTime_DAYS_WHOLE) * 24;
                var elapsedTime_HOURS_WHOLE = Math.floor(elapsedTime_HOURS);
                var elapsedTime_MIN = (elapsedTime_HOURS - elapsedTime_HOURS_WHOLE) * 60;
                var elapsedTime_MIN_WHOLE = Math.floor(elapsedTime_MIN);
                var elapsedTime_SEC = (elapsedTime_MIN - elapsedTime_MIN_WHOLE) * 60;
                // use round() here instead of floor() because we always expect ticks to be on even second
                // boundaries but rounding error will cause us to be somewhat unpredictably above or below
                // the nearest even second boundary
                var elapsedTime_SEC_WHOLE = Math.round(elapsedTime_SEC);
                // however the above fails when we round up to a whole minute, so special case that
                if (elapsedTime_SEC_WHOLE >= 60) {
                    elapsedTime_SEC_WHOLE -= 60;
                    elapsedTime_MIN_WHOLE += 1;
                }
                if (elapsedTime_MIN_WHOLE >= 60) {
                    elapsedTime_MIN_WHOLE = 0;
                }
                var min = elapsedTime_MIN_WHOLE < 10 ? "0" + elapsedTime_MIN_WHOLE : "" + elapsedTime_MIN_WHOLE;
                var sec = elapsedTime_SEC_WHOLE < 10 ? "0" + elapsedTime_SEC_WHOLE : "" + elapsedTime_SEC_WHOLE;
                return min + ":" + sec;
            };
            var prefixFormat = function(timeStruct) {
                var center_PMILLIS = (timeStruct.end_PMILLIS - timeStruct.start_PMILLIS) / 2 + timeStruct.start_PMILLIS;
                var elapsedTime_MILLIS = center_PMILLIS - referenceDate_PMILLIS;
                var negative = elapsedTime_MILLIS < 0;
                var signString = negative && isFuturePositive || !negative && !isFuturePositive ? "-" : "";
                elapsedTime_MILLIS = Math.abs(elapsedTime_MILLIS);
                var elapsedTime_DAYS = Webglimpse.millisToDays(elapsedTime_MILLIS);
                var elapsedTime_DAYS_WHOLE = Math.floor(elapsedTime_DAYS);
                var elapsedTime_HOURS = (elapsedTime_DAYS - elapsedTime_DAYS_WHOLE) * 24;
                var elapsedTime_HOURS_WHOLE = Math.floor(elapsedTime_HOURS);
                return "Day " + signString + elapsedTime_DAYS_WHOLE + " Hour " + signString + elapsedTime_HOURS_WHOLE;
            };
            var timeStructFactory = function() {
                return new TimeStruct();
            };
        } else if (tickInterval_MILLIS <= Webglimpse.hoursToMillis(12)) {
            var tickFormat = function(tickTime_PMILLIS) {
                var elapsedTime_MILLIS = Math.abs(tickTime_PMILLIS - referenceDate_PMILLIS);
                var elapsedTime_DAYS = Webglimpse.millisToDays(elapsedTime_MILLIS);
                var elapsedTime_DAYS_WHOLE = Math.floor(elapsedTime_DAYS);
                var elapsedTime_HOURS = (elapsedTime_DAYS - elapsedTime_DAYS_WHOLE) * 24;
                var elapsedTime_HOURS_WHOLE = Math.floor(elapsedTime_HOURS);
                var elapsedTime_MIN = (elapsedTime_HOURS - elapsedTime_HOURS_WHOLE) * 60;
                // use round() here instead of floor() because we always expect ticks to be on even minute
                // boundaries but rounding error will cause us to be somewhat unpredictably above or below
                // the nearest even minute boundary
                var elapsedTime_MIN_WHOLE = Math.round(elapsedTime_MIN);
                // however the above fails when we round up to a whole hour, so special case that
                if (elapsedTime_MIN_WHOLE >= 60) {
                    elapsedTime_MIN_WHOLE -= 60;
                    elapsedTime_HOURS_WHOLE += 1;
                }
                if (elapsedTime_HOURS_WHOLE >= 24) {
                    elapsedTime_HOURS_WHOLE = 0;
                }
                var hour = elapsedTime_HOURS_WHOLE < 10 ? "0" + elapsedTime_HOURS_WHOLE : "" + elapsedTime_HOURS_WHOLE;
                var min = elapsedTime_MIN_WHOLE < 10 ? "0" + elapsedTime_MIN_WHOLE : "" + elapsedTime_MIN_WHOLE;
                return hour + ":" + min;
            };
            var prefixFormat = function(timeStruct) {
                var center_PMILLIS = (timeStruct.end_PMILLIS - timeStruct.start_PMILLIS) / 2 + timeStruct.start_PMILLIS;
                var elapsedTime_MILLIS = center_PMILLIS - referenceDate_PMILLIS;
                var negative = elapsedTime_MILLIS < 0;
                var signString = negative && isFuturePositive || !negative && !isFuturePositive ? "-" : "";
                elapsedTime_MILLIS = Math.abs(elapsedTime_MILLIS);
                var elapsedTime_DAYS = Math.floor(Webglimpse.millisToDays(elapsedTime_MILLIS));
                return "Day " + signString + elapsedTime_DAYS;
            };
            var timeStructFactory = function() {
                return new TimeStruct();
            };
        } else {
            var tickFormat = function(tickTime_PMILLIS) {
                var elapsedTime_MILLIS = tickTime_PMILLIS - referenceDate_PMILLIS;
                var negative = elapsedTime_MILLIS < 0;
                var signString = negative && isFuturePositive || !negative && !isFuturePositive ? "-" : "";
                elapsedTime_MILLIS = Math.abs(elapsedTime_MILLIS);
                var elapsedTime_DAYS = Math.floor(Webglimpse.millisToDays(elapsedTime_MILLIS));
                return elapsedTime_DAYS === 0 ? "" + elapsedTime_DAYS : signString + elapsedTime_DAYS;
            };
        }
        return {
            prefixFormat: prefixFormat,
            tickFormat: tickFormat,
            timeStructFactory: timeStructFactory
        };
    }
    function getTickDisplayDataAbsolute(tickInterval_MILLIS, displayTimeZone) {
        var defaultTickFormat = function(format) {
            return function(tickTime_PMILLIS) {
                return moment(tickTime_PMILLIS).zone(displayTimeZone).format(format);
            };
        };
        var defaultPrefixFormat = function(format) {
            return function(timeStruct) {
                return moment(timeStruct.textCenter_PMILLIS).zone(displayTimeZone).format(format);
            };
        };
        if (tickInterval_MILLIS <= Webglimpse.minutesToMillis(1)) {
            var tickFormat = defaultTickFormat("mm:ss");
            var prefixFormat = defaultPrefixFormat("D MMM HH:00");
            var timeStructFactory = function() {
                return new HourStruct();
            };
        } else if (tickInterval_MILLIS <= Webglimpse.hoursToMillis(12)) {
            var tickFormat = defaultTickFormat("HH:mm");
            var prefixFormat = defaultPrefixFormat("D MMM YYYY");
            var timeStructFactory = function() {
                return new DayStruct();
            };
        } else if (tickInterval_MILLIS <= Webglimpse.daysToMillis(10)) {
            var tickFormat = defaultTickFormat("D");
            var prefixFormat = defaultPrefixFormat("MMM YYYY");
            var timeStructFactory = function() {
                return new MonthStruct();
            };
        } else if (tickInterval_MILLIS <= Webglimpse.daysToMillis(60)) {
            var tickFormat = defaultTickFormat("MMM");
            var prefixFormat = defaultPrefixFormat("YYYY");
            var timeStructFactory = function() {
                return new YearStruct();
            };
        } else {
            var tickFormat = defaultTickFormat("YYYY");
        }
        return {
            prefixFormat: prefixFormat,
            tickFormat: tickFormat,
            timeStructFactory: timeStructFactory
        };
    }
    var TimeStruct = function() {
        function TimeStruct() {}
        TimeStruct.prototype.setTime = function(time_PMILLIS, timeZone) {
            return moment(time_PMILLIS).zone(timeZone);
        };
        TimeStruct.prototype.incrementTime = function(m) {};
        return TimeStruct;
    }();
    var YearStruct = function(_super) {
        __extends(YearStruct, _super);
        function YearStruct() {
            _super.apply(this, arguments);
        }
        YearStruct.prototype.setTime = function(time_PMILLIS, timeZone) {
            var m = moment(time_PMILLIS).zone(timeZone);
            m.month(0);
            m.date(0);
            m.hours(0);
            m.minutes(0);
            m.seconds(0);
            return m;
        };
        YearStruct.prototype.incrementTime = function(m) {
            m.add("years", 1);
        };
        return YearStruct;
    }(TimeStruct);
    var MonthStruct = function(_super) {
        __extends(MonthStruct, _super);
        function MonthStruct() {
            _super.apply(this, arguments);
        }
        MonthStruct.prototype.setTime = function(time_PMILLIS, timeZone) {
            var m = moment(time_PMILLIS).zone(timeZone);
            m.date(0);
            m.hours(0);
            m.minutes(0);
            m.seconds(0);
            return m;
        };
        MonthStruct.prototype.incrementTime = function(m) {
            m.add("months", 1);
        };
        return MonthStruct;
    }(TimeStruct);
    var DayStruct = function(_super) {
        __extends(DayStruct, _super);
        function DayStruct() {
            _super.apply(this, arguments);
        }
        DayStruct.prototype.setTime = function(time_PMILLIS, timeZone) {
            var m = moment(time_PMILLIS).zone(timeZone);
            m.hours(0);
            m.minutes(0);
            m.seconds(0);
            return m;
        };
        DayStruct.prototype.incrementTime = function(m) {
            m.add("days", 1);
        };
        return DayStruct;
    }(TimeStruct);
    var HourStruct = function(_super) {
        __extends(HourStruct, _super);
        function HourStruct() {
            _super.apply(this, arguments);
        }
        HourStruct.prototype.setTime = function(time_PMILLIS, timeZone) {
            var m = moment(time_PMILLIS).zone(timeZone);
            m.minutes(0);
            m.seconds(0);
            return m;
        };
        HourStruct.prototype.incrementTime = function(m) {
            m.add("hours", 1);
        };
        return HourStruct;
    }(TimeStruct);
    function createTimeStructs(timeAxis, factory, timeZone, referenceDate_PMILLIS, isFuturePositive, tickTimes_PMILLIS, labelAlign) {
        if (Webglimpse.hasval(referenceDate_PMILLIS)) {
            var tickInterval_MILLIS = getTickInterval_MILLIS(tickTimes_PMILLIS);
            if (tickInterval_MILLIS <= Webglimpse.minutesToMillis(1)) {
                return createTimeStructsRelativeHours(timeAxis, referenceDate_PMILLIS, isFuturePositive, tickTimes_PMILLIS, labelAlign);
            } else {
                return createTimeStructsRelativeDays(timeAxis, referenceDate_PMILLIS, isFuturePositive, tickTimes_PMILLIS, labelAlign);
            }
        } else {
            return createTimeStructsAbsolute(timeAxis, factory, timeZone, tickTimes_PMILLIS, labelAlign);
        }
    }
    function createTimeStructsRelativeHours(timeAxis, referenceDate_PMILLIS, isFuturePositive, tickTimes_PMILLIS, labelAlign) {
        var dMin_PMILLIS = timeAxis.tMin_PMILLIS;
        var dMax_PMILLIS = timeAxis.tMax_PMILLIS;
        var timeStructs = [];
        var maxViewDuration_MILLIS = Number.NEGATIVE_INFINITY;
        var previous_HOURS = null;
        var previous_SIGN = null;
        for (var n = 0; n < tickTimes_PMILLIS.length; n++) {
            var elapsedTime_MILLIS = tickTimes_PMILLIS[n] - referenceDate_PMILLIS;
            var negative = elapsedTime_MILLIS < 0;
            var signString = negative && isFuturePositive || !negative && !isFuturePositive ? "-" : "";
            elapsedTime_MILLIS = Math.abs(elapsedTime_MILLIS);
            var elapsedTime_HOURS = Webglimpse.millisToHours(elapsedTime_MILLIS);
            var elapsedTime_HOURS_WHOLE = Math.floor(elapsedTime_HOURS);
            if (Webglimpse.hasval(previous_HOURS) && elapsedTime_HOURS_WHOLE === previous_HOURS && negative === previous_SIGN) continue;
            previous_HOURS = elapsedTime_HOURS_WHOLE;
            previous_SIGN = negative;
            var timeStruct = new TimeStruct();
            if (negative) {
                timeStruct.end_PMILLIS = Webglimpse.hoursToMillis(-elapsedTime_HOURS_WHOLE) + referenceDate_PMILLIS;
                timeStruct.start_PMILLIS = timeStruct.end_PMILLIS - Webglimpse.hoursToMillis(1);
            } else {
                timeStruct.start_PMILLIS = Webglimpse.hoursToMillis(elapsedTime_HOURS_WHOLE) + referenceDate_PMILLIS;
                timeStruct.end_PMILLIS = timeStruct.start_PMILLIS + Webglimpse.hoursToMillis(1);
            }
            timeStruct.viewStart_PMILLIS = Webglimpse.clamp(timeStruct.start_PMILLIS, timeStruct.end_PMILLIS, dMin_PMILLIS);
            timeStruct.viewEnd_PMILLIS = Webglimpse.clamp(timeStruct.start_PMILLIS, timeStruct.end_PMILLIS, dMax_PMILLIS);
            maxViewDuration_MILLIS = Math.max(maxViewDuration_MILLIS, timeStruct.viewEnd_PMILLIS - timeStruct.viewStart_PMILLIS);
            timeStructs.push(timeStruct);
        }
        setTimeStructTextCenter(timeStructs, labelAlign, maxViewDuration_MILLIS);
        return timeStructs;
    }
    function createTimeStructsRelativeDays(timeAxis, referenceDate_PMILLIS, isFuturePositive, tickTimes_PMILLIS, labelAlign) {
        var dMin_PMILLIS = timeAxis.tMin_PMILLIS;
        var dMax_PMILLIS = timeAxis.tMax_PMILLIS;
        var timeStructs = [];
        var maxViewDuration_MILLIS = Number.NEGATIVE_INFINITY;
        var previous_DAYS = null;
        var previous_SIGN = null;
        for (var n = 0; n < tickTimes_PMILLIS.length; n++) {
            var elapsedTime_MILLIS = tickTimes_PMILLIS[n] - referenceDate_PMILLIS;
            var negative = elapsedTime_MILLIS < 0;
            var signString = negative && isFuturePositive || !negative && !isFuturePositive ? "-" : "";
            elapsedTime_MILLIS = Math.abs(elapsedTime_MILLIS);
            var elapsedTime_DAYS = Webglimpse.millisToDays(elapsedTime_MILLIS);
            var elapsedTime_DAYS_WHOLE = Math.floor(elapsedTime_DAYS);
            if (Webglimpse.hasval(previous_DAYS) && elapsedTime_DAYS_WHOLE === previous_DAYS && negative === previous_SIGN) continue;
            previous_DAYS = elapsedTime_DAYS_WHOLE;
            previous_SIGN = negative;
            var timeStruct = new TimeStruct();
            if (negative) {
                timeStruct.end_PMILLIS = Webglimpse.daysToMillis(-elapsedTime_DAYS_WHOLE) + referenceDate_PMILLIS;
                timeStruct.start_PMILLIS = timeStruct.end_PMILLIS - Webglimpse.daysToMillis(1);
            } else {
                timeStruct.start_PMILLIS = Webglimpse.daysToMillis(elapsedTime_DAYS_WHOLE) + referenceDate_PMILLIS;
                timeStruct.end_PMILLIS = timeStruct.start_PMILLIS + Webglimpse.daysToMillis(1);
            }
            timeStruct.viewStart_PMILLIS = Webglimpse.clamp(timeStruct.start_PMILLIS, timeStruct.end_PMILLIS, dMin_PMILLIS);
            timeStruct.viewEnd_PMILLIS = Webglimpse.clamp(timeStruct.start_PMILLIS, timeStruct.end_PMILLIS, dMax_PMILLIS);
            maxViewDuration_MILLIS = Math.max(maxViewDuration_MILLIS, timeStruct.viewEnd_PMILLIS - timeStruct.viewStart_PMILLIS);
            timeStructs.push(timeStruct);
        }
        setTimeStructTextCenter(timeStructs, labelAlign, maxViewDuration_MILLIS);
        return timeStructs;
    }
    function createTimeStructsAbsolute(timeAxis, factory, timeZone, tickTimes_PMILLIS, labelAlign) {
        var dMin_PMILLIS = timeAxis.tMin_PMILLIS;
        var dMax_PMILLIS = timeAxis.tMax_PMILLIS;
        var timeStructs = [];
        var maxViewDuration_MILLIS = Number.NEGATIVE_INFINITY;
        var previous_PMILLIS = null;
        for (var n = 0; n < tickTimes_PMILLIS.length; n++) {
            var tickTime_PMILLIS = tickTimes_PMILLIS[n];
            var timeStruct = factory();
            var m = timeStruct.setTime(tickTime_PMILLIS, timeZone);
            var start_PMILLIS = m.valueOf();
            // XXX: Floating-point comparison can be unintuitive
            if (Webglimpse.hasval(previous_PMILLIS) && start_PMILLIS === previous_PMILLIS) continue;
            previous_PMILLIS = start_PMILLIS;
            timeStruct.start_PMILLIS = start_PMILLIS;
            timeStruct.incrementTime(m);
            timeStruct.end_PMILLIS = m.valueOf();
            timeStruct.viewStart_PMILLIS = Webglimpse.clamp(timeStruct.start_PMILLIS, timeStruct.end_PMILLIS, dMin_PMILLIS);
            timeStruct.viewEnd_PMILLIS = Webglimpse.clamp(timeStruct.start_PMILLIS, timeStruct.end_PMILLIS, dMax_PMILLIS);
            maxViewDuration_MILLIS = Math.max(maxViewDuration_MILLIS, timeStruct.viewEnd_PMILLIS - timeStruct.viewStart_PMILLIS);
            timeStructs.push(timeStruct);
        }
        setTimeStructTextCenter(timeStructs, labelAlign, maxViewDuration_MILLIS);
        return timeStructs;
    }
    function setTimeStructTextCenter(timeStructs, labelAlign, maxViewDuration_MILLIS) {
        for (var n = 0; n < timeStructs.length; n++) {
            var timeStruct = timeStructs[n];
            var duration_MILLIS = timeStruct.viewEnd_PMILLIS - timeStruct.viewStart_PMILLIS;
            var midpoint_PMILLIS = timeStruct.viewStart_PMILLIS + labelAlign * duration_MILLIS;
            var edge_PMILLIS = timeStruct.viewStart_PMILLIS === timeStruct.start_PMILLIS ? timeStruct.viewEnd_PMILLIS : timeStruct.viewStart_PMILLIS;
            var edginess = 1 - Webglimpse.clamp(0, 1, duration_MILLIS / maxViewDuration_MILLIS);
            timeStruct.textCenter_PMILLIS = midpoint_PMILLIS + edginess * (edge_PMILLIS - midpoint_PMILLIS);
        }
    }
    function getTickTimes_PMILLIS(timeAxis, sizePixels, tickSpacing, timeZone, referenceDate_PMILLIS) {
        if (Webglimpse.hasval(referenceDate_PMILLIS)) {
            return getTickTimesRelative_PMILLIS(timeAxis, sizePixels, tickSpacing, referenceDate_PMILLIS);
        } else {
            return getTickTimesAbsolute_PMILLIS(timeAxis, sizePixels, tickSpacing, timeZone);
        }
    }
    Webglimpse.getTickTimes_PMILLIS = getTickTimes_PMILLIS;
    function getTickTimesRelative_PMILLIS(timeAxis, sizePixels, tickSpacing, referenceDate_PMILLIS) {
        var dMin_PMILLIS = timeAxis.tMin_PMILLIS;
        var dMax_PMILLIS = timeAxis.tMax_PMILLIS;
        var approxTickInterval_MILLIS = tickSpacing * (dMax_PMILLIS - dMin_PMILLIS) / sizePixels;
        if (approxTickInterval_MILLIS < Webglimpse.daysToMillis(1)) {
            return getHourTickTimesRelative_PMILLIS(dMin_PMILLIS, dMax_PMILLIS, approxTickInterval_MILLIS, referenceDate_PMILLIS);
        } else {
            return getDayTickTimesRelative_PMILLIS(dMin_PMILLIS, dMax_PMILLIS, sizePixels, tickSpacing, referenceDate_PMILLIS);
        }
    }
    function getHourTickTimesRelative_PMILLIS(dMin_PMILLIS, dMax_PMILLIS, approxTickInterval_MILLIS, referenceDate_PMILLIS) {
        var tickTimes = getHourTickTimes_PMILLIS(dMin_PMILLIS - referenceDate_PMILLIS, dMax_PMILLIS - referenceDate_PMILLIS, approxTickInterval_MILLIS, 0);
        for (var n = 0; n < tickTimes.length; n++) {
            tickTimes[n] = tickTimes[n] + referenceDate_PMILLIS;
        }
        return tickTimes;
    }
    function getDayTickTimesRelative_PMILLIS(dMin_PMILLIS, dMax_PMILLIS, sizePixels, tickSpacing, referenceDate_PMILLIS) {
        var axis = new Webglimpse.Axis1D(Webglimpse.millisToDays(dMin_PMILLIS - referenceDate_PMILLIS), Webglimpse.millisToDays(dMax_PMILLIS - referenceDate_PMILLIS));
        var approxNumTicks = sizePixels / tickSpacing;
        var tickInterval = Webglimpse.getTickInterval(axis, approxNumTicks);
        var tickCount = Webglimpse.getTickCount(axis, tickInterval);
        var tickPositions = new Float32Array(tickCount);
        Webglimpse.getTickPositions(axis, tickInterval, tickCount, tickPositions);
        var tickTimes_PMILLIS = [];
        for (var n = 0; n < tickCount; n++) {
            tickTimes_PMILLIS.push(Webglimpse.daysToMillis(tickPositions[n]) + referenceDate_PMILLIS);
        }
        return tickTimes_PMILLIS;
    }
    function getTickTimesAbsolute_PMILLIS(timeAxis, sizePixels, tickSpacing, timeZone) {
        var dMin_PMILLIS = timeAxis.tMin_PMILLIS;
        var dMax_PMILLIS = timeAxis.tMax_PMILLIS;
        // NOTE: moment.js reports time zone offset reversed from Java Calendar, thus the negative sign
        var mMin = moment(dMin_PMILLIS).zone(timeZone);
        var zoneOffset_MILLIS = -Webglimpse.minutesToMillis(mMin.zone());
        var approxTickInterval_MILLIS = tickSpacing * (dMax_PMILLIS - dMin_PMILLIS) / sizePixels;
        if (approxTickInterval_MILLIS > Webglimpse.daysToMillis(60)) {
            return getYearTickTimes_PMILLIS(dMin_PMILLIS, dMax_PMILLIS, approxTickInterval_MILLIS, timeZone);
        } else if (approxTickInterval_MILLIS > Webglimpse.daysToMillis(10)) {
            return getMonthTickTimes_PMILLIS(dMin_PMILLIS, dMax_PMILLIS, approxTickInterval_MILLIS, timeZone);
        } else if (approxTickInterval_MILLIS > Webglimpse.daysToMillis(1)) {
            return getDayTickTimes_PMILLIS(dMin_PMILLIS, dMax_PMILLIS, approxTickInterval_MILLIS, timeZone);
        } else {
            return getHourTickTimes_PMILLIS(dMin_PMILLIS, dMax_PMILLIS, approxTickInterval_MILLIS, zoneOffset_MILLIS);
        }
    }
    function getYearTickTimes_PMILLIS(dMin_PMILLIS, dMax_PMILLIS, approxTickInterval_MILLIS, timeZone) {
        var m = moment(dMin_PMILLIS).zone(timeZone);
        var currentYear = m.year();
        var daysPerYear = 365.25;
        var approxTickInterval_YEARS = Webglimpse.millisToDays(approxTickInterval_MILLIS) / daysPerYear;
        var yearOrderFactor = 6;
        var stepYears = getYearStep(approxTickInterval_YEARS * yearOrderFactor);
        var startYear = getRoundedYear(currentYear, stepYears);
        m.year(startYear).month(0).date(1).hours(0).minutes(0).seconds(0).milliseconds(0);
        var tickTimes_PMILLIS = [];
        while (m.valueOf() <= dMax_PMILLIS) {
            tickTimes_PMILLIS.push(m.valueOf());
            m.add("years", stepYears);
        }
        return tickTimes_PMILLIS;
    }
    function getYearStep(spanYears) {
        var log10 = Math.log(spanYears) / Math.LN10;
        var order = Math.floor(log10);
        if (log10 - order > 1 - 1e-12) order++;
        return Math.max(1, Math.pow(10, order));
    }
    function getRoundedYear(currentYear, yearStep) {
        var numSteps = Math.floor(currentYear / yearStep);
        return numSteps * yearStep;
    }
    function getMonthTickTimes_PMILLIS(dMin_PMILLIS, dMax_PMILLIS, approxTickInterval_MILLIS, timeZone) {
        var m = moment(dMin_PMILLIS).zone(timeZone).date(1).hours(0).minutes(0).seconds(0).milliseconds(0);
        var tickTimes_PMILLIS = [];
        while (m.valueOf() <= dMax_PMILLIS) {
            tickTimes_PMILLIS.push(m.valueOf());
            m.add("months", 1);
        }
        return tickTimes_PMILLIS;
    }
    function getDayTickTimes_PMILLIS(dMin_PMILLIS, dMax_PMILLIS, approxTickInterval_MILLIS, timeZone) {
        var tickInterval_DAYS = calculateTickInterval_DAYS(approxTickInterval_MILLIS);
        // initialize calendar off start time and reset fields less than month
        var m = moment(dMin_PMILLIS).zone(timeZone).date(1).hours(0).minutes(0).seconds(0).milliseconds(0);
        var endTime_PMILLIS = dMax_PMILLIS + Webglimpse.daysToMillis(tickInterval_DAYS);
        var currentMonth = m.month();
        var tickTimes_PMILLIS = [];
        while (m.valueOf() <= endTime_PMILLIS) {
            // ensure ticks always fall on the first day of the month
            var newMonth = m.month();
            if (newMonth !== currentMonth) {
                m.date(1);
                currentMonth = newMonth;
            }
            // prevent display of ticks too close to the end of the month
            var maxDom = m.clone().endOf("month").date();
            var dom = m.date();
            if (maxDom - dom + 1 >= tickInterval_DAYS / 2) {
                tickTimes_PMILLIS.push(m.valueOf());
            }
            m.add("days", tickInterval_DAYS);
        }
        return tickTimes_PMILLIS;
    }
    function getHourTickTimes_PMILLIS(dMin_PMILLIS, dMax_PMILLIS, approxTickInterval_MILLIS, zoneOffset_MILLIS) {
        var tickInterval_MILLIS = calculateTickInterval_MILLIS(approxTickInterval_MILLIS);
        var ticksSince1970 = Math.floor((dMin_PMILLIS + zoneOffset_MILLIS) / tickInterval_MILLIS);
        var firstTick_PMILLIS = ticksSince1970 * tickInterval_MILLIS - zoneOffset_MILLIS;
        var numTicks = Math.ceil(1 + (dMax_PMILLIS - firstTick_PMILLIS) / tickInterval_MILLIS);
        var tickTimes_PMILLIS = [];
        for (var n = 0; n < numTicks; n++) {
            tickTimes_PMILLIS.push(firstTick_PMILLIS + n * tickInterval_MILLIS);
        }
        return tickTimes_PMILLIS;
    }
    var tickIntervalRungs_DAYS = [ 2, 3, 4, 5, 8, 10 ];
    function calculateTickInterval_DAYS(approxTickInterval_MILLIS) {
        var approxTickInterval_DAYS = Webglimpse.millisToDays(approxTickInterval_MILLIS);
        for (var n = 0; n < tickIntervalRungs_DAYS.length; n++) {
            if (approxTickInterval_DAYS <= tickIntervalRungs_DAYS[n]) {
                return tickIntervalRungs_DAYS[n];
            }
        }
        return 10;
    }
    var tickIntervalRungs_MILLIS = [ Webglimpse.secondsToMillis(1), Webglimpse.secondsToMillis(2), Webglimpse.secondsToMillis(5), Webglimpse.secondsToMillis(10), Webglimpse.secondsToMillis(15), Webglimpse.secondsToMillis(20), Webglimpse.secondsToMillis(30), Webglimpse.minutesToMillis(1), Webglimpse.minutesToMillis(2), Webglimpse.minutesToMillis(5), Webglimpse.minutesToMillis(10), Webglimpse.minutesToMillis(15), Webglimpse.minutesToMillis(20), Webglimpse.minutesToMillis(30), Webglimpse.hoursToMillis(1), Webglimpse.hoursToMillis(2), Webglimpse.hoursToMillis(3), Webglimpse.hoursToMillis(6), Webglimpse.hoursToMillis(12), Webglimpse.daysToMillis(1) ];
    function calculateTickInterval_MILLIS(approxTickInterval_MILLIS) {
        for (var n = 0; n < tickIntervalRungs_MILLIS.length; n++) {
            if (approxTickInterval_MILLIS <= tickIntervalRungs_MILLIS[n]) {
                return tickIntervalRungs_MILLIS[n];
            }
        }
        return Webglimpse.daysToMillis(1);
    }
    function getTickInterval_MILLIS(tickTimes_PMILLIS) {
        if (Webglimpse.hasval(tickTimes_PMILLIS) && tickTimes_PMILLIS.length > 1) {
            return tickTimes_PMILLIS[1] - tickTimes_PMILLIS[0];
        } else {
            return Webglimpse.secondsToMillis(1);
        }
    }
})(Webglimpse || (Webglimpse = {}));

var Webglimpse;

(function(Webglimpse) {
    function newTimeGridPainter(timeAxis, isVerticalAxis, timeZone, options) {
        var tickSpacing = Webglimpse.hasval(options) && Webglimpse.hasval(options.tickSpacing) ? options.tickSpacing : 60;
        var gridColor = Webglimpse.hasval(options) && Webglimpse.hasval(options.gridColor) ? options.gridColor : Webglimpse.black;
        var referenceDate_PMILLIS = Webglimpse.hasval(options) && Webglimpse.hasval(options.referenceDate) ? Webglimpse.parseTime_PMILLIS(options.referenceDate) : undefined;
        var program = new Webglimpse.Program(Webglimpse.xyFrac_VERTSHADER, Webglimpse.solid_FRAGSHADER);
        var u_Color = new Webglimpse.UniformColor(program, "u_Color");
        var a_XyFrac = new Webglimpse.Attribute(program, "a_XyFrac");
        var xyFrac = new Float32Array(0);
        var xyFracBuffer = Webglimpse.newDynamicBuffer();
        return function(gl, viewport) {
            var tickTimes_PMILLIS = Webglimpse.getTickTimes_PMILLIS(timeAxis, isVerticalAxis ? viewport.h : viewport.w, tickSpacing, timeZone, referenceDate_PMILLIS);
            var tickCount = tickTimes_PMILLIS.length;
            program.use(gl);
            u_Color.setData(gl, gridColor);
            xyFrac = Webglimpse.ensureCapacityFloat32(xyFrac, 4 * tickCount);
            for (var n = 0; n < tickCount; n++) {
                var tFrac = timeAxis.tFrac(tickTimes_PMILLIS[n]);
                if (isVerticalAxis) {
                    tFrac = (Math.floor(tFrac * viewport.h) + .5) / viewport.h;
                    xyFrac[4 * n + 0] = 0;
                    xyFrac[4 * n + 1] = tFrac;
                    xyFrac[4 * n + 2] = 1;
                    xyFrac[4 * n + 3] = tFrac;
                } else {
                    // Adding epsilon is a crude way to compensate for floating-point error (which is probably introduced up where we compute tFrac)
                    tFrac = (Math.floor(tFrac * viewport.w + 1e-4) + .5) / viewport.w;
                    xyFrac[4 * n + 0] = tFrac;
                    xyFrac[4 * n + 1] = 0;
                    xyFrac[4 * n + 2] = tFrac;
                    xyFrac[4 * n + 3] = 1;
                }
            }
            xyFracBuffer.setData(xyFrac.subarray(0, 4 * tickCount));
            a_XyFrac.setDataAndEnable(gl, xyFracBuffer, 2, Webglimpse.GL.FLOAT);
            // IE does not support lineWidths other than 1, so make sure all browsers use lineWidth of 1
            gl.lineWidth(1);
            gl.drawArrays(Webglimpse.GL.LINES, 0, 2 * tickCount);
            a_XyFrac.disable(gl);
            program.endUse(gl);
        };
    }
    Webglimpse.newTimeGridPainter = newTimeGridPainter;
})(Webglimpse || (Webglimpse = {}));

var Webglimpse;

(function(Webglimpse) {
    var TimelineCursorModel = function() {
        function TimelineCursorModel(cursor) {
            this._cursorGuid = cursor.cursorGuid;
            this._attrsChanged = new Webglimpse.Notification();
            this.setAttrs(cursor);
        }
        Object.defineProperty(TimelineCursorModel.prototype, "labeledTimeseriesGuids", {
            get: function() {
                return this._labeledTimeseriesGuids;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineCursorModel.prototype, "cursorGuid", {
            get: function() {
                return this._cursorGuid;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineCursorModel.prototype, "attrsChanged", {
            get: function() {
                return this._attrsChanged;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineCursorModel.prototype, "lineColor", {
            get: function() {
                return this._lineColor;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineCursorModel.prototype, "textColor", {
            get: function() {
                return this._textColor;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineCursorModel.prototype, "showVerticalLine", {
            get: function() {
                return this._showVerticalLine;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineCursorModel.prototype, "showHorizontalLine", {
            get: function() {
                return this._showHorizontalLine;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineCursorModel.prototype, "showCursorText", {
            get: function() {
                return this._showCursorText;
            },
            enumerable: true,
            configurable: true
        });
        TimelineCursorModel.prototype.setAttrs = function(cursor) {
            this._labeledTimeseriesGuids = new Webglimpse.OrderedStringSet(cursor.labeledTimeseriesGuids || []);
            this._lineColor = Webglimpse.hasval(cursor.lineColor) ? Webglimpse.parseCssColor(cursor.lineColor) : null;
            this._textColor = Webglimpse.hasval(cursor.textColor) ? Webglimpse.parseCssColor(cursor.textColor) : null;
            this._showVerticalLine = cursor.showVerticalLine;
            this._showHorizontalLine = cursor.showHorizontalLine;
            this._showCursorText = cursor.showCursorText;
            this._attrsChanged.fire();
        };
        TimelineCursorModel.prototype.snapshot = function() {
            return {
                cursorGuid: this._cursorGuid,
                labeledTimeseriesGuids: this._labeledTimeseriesGuids.toArray(),
                lineColor: Webglimpse.hasval(this._lineColor) ? this._lineColor.cssString : null,
                textColor: Webglimpse.hasval(this._textColor) ? this._textColor.cssString : null,
                showVerticalLine: this._showVerticalLine,
                showHorizontalLine: this._showHorizontalLine,
                showCursorText: this._showCursorText
            };
        };
        return TimelineCursorModel;
    }();
    Webglimpse.TimelineCursorModel = TimelineCursorModel;
    var TimelineAnnotationModel = function() {
        function TimelineAnnotationModel(annotation) {
            this._annotationGuid = annotation.annotationGuid;
            this._attrsChanged = new Webglimpse.Notification();
            this.setAttrs(annotation);
        }
        Object.defineProperty(TimelineAnnotationModel.prototype, "annotationGuid", {
            get: function() {
                return this._annotationGuid;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineAnnotationModel.prototype, "attrsChanged", {
            get: function() {
                return this._attrsChanged;
            },
            enumerable: true,
            configurable: true
        });
        TimelineAnnotationModel.prototype.setLocation = function(time_PMILLIS, y) {
            if (time_PMILLIS !== this._time_PMILLIS || y !== this.y) {
                this._y = y;
                this._time_PMILLIS = time_PMILLIS;
                this._attrsChanged.fire();
            }
        };
        Object.defineProperty(TimelineAnnotationModel.prototype, "time_PMILLIS", {
            get: function() {
                return this._time_PMILLIS;
            },
            set: function(time_PMILLIS) {
                if (time_PMILLIS !== this._time_PMILLIS) {
                    this._time_PMILLIS = time_PMILLIS;
                    this._attrsChanged.fire();
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineAnnotationModel.prototype, "y", {
            get: function() {
                return this._y;
            },
            set: function(y) {
                if (y !== this.y) {
                    this._y = y;
                    this._attrsChanged.fire();
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineAnnotationModel.prototype, "label", {
            get: function() {
                return this._label;
            },
            set: function(label) {
                if (label !== this.label) {
                    this._label = label;
                    this._attrsChanged.fire();
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineAnnotationModel.prototype, "styleGuid", {
            get: function() {
                return this._styleGuid;
            },
            set: function(styleGuid) {
                if (styleGuid !== this.styleGuid) {
                    this._styleGuid = styleGuid;
                    this._attrsChanged.fire();
                }
            },
            enumerable: true,
            configurable: true
        });
        TimelineAnnotationModel.prototype.setAttrs = function(annotation) {
            // Don't both checking whether values are going to change -- it's not that important, and it would be obnoxious here
            this._time_PMILLIS = Webglimpse.hasval(annotation.time_ISO8601) ? Webglimpse.parseTime_PMILLIS(annotation.time_ISO8601) : undefined;
            this._y = annotation.y;
            this._label = annotation.label;
            this._styleGuid = annotation.styleGuid;
            this._attrsChanged.fire();
        };
        TimelineAnnotationModel.prototype.snapshot = function() {
            return {
                annotationGuid: this._annotationGuid,
                label: this._label,
                styleGuid: this._styleGuid,
                time_ISO8601: Webglimpse.formatTime_ISO8601(this._time_PMILLIS),
                y: this._y
            };
        };
        return TimelineAnnotationModel;
    }();
    Webglimpse.TimelineAnnotationModel = TimelineAnnotationModel;
    var TimelineTimeseriesModel = function() {
        function TimelineTimeseriesModel(timeseries) {
            this._timeseriesGuid = timeseries.timeseriesGuid;
            this._attrsChanged = new Webglimpse.Notification();
            this.setAttrs(timeseries);
            this._fragmentGuids = new Webglimpse.OrderedStringSet(timeseries.fragmentGuids || []);
        }
        Object.defineProperty(TimelineTimeseriesModel.prototype, "timeseriesGuid", {
            get: function() {
                return this._timeseriesGuid;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineTimeseriesModel.prototype, "attrsChanged", {
            get: function() {
                return this._attrsChanged;
            },
            enumerable: true,
            configurable: true
        });
        TimelineTimeseriesModel.prototype.setAttrs = function(timeseries) {
            // Don't both checking whether values are going to change -- it's not that important, and it would be obnoxious here
            this._uiHint = timeseries.uiHint;
            this._baseline = timeseries.baseline;
            this._lineColor = Webglimpse.hasval(timeseries.lineColor) ? Webglimpse.parseCssColor(timeseries.lineColor) : null;
            this._pointColor = Webglimpse.hasval(timeseries.pointColor) ? Webglimpse.parseCssColor(timeseries.pointColor) : null;
            this._lineThickness = timeseries.lineThickness;
            this._pointSize = timeseries.pointSize;
            this._fragmentGuids = new Webglimpse.OrderedStringSet(timeseries.fragmentGuids || []);
            this._attrsChanged.fire();
        };
        Object.defineProperty(TimelineTimeseriesModel.prototype, "baseline", {
            get: function() {
                return this._baseline;
            },
            set: function(baseline) {
                if (baseline !== this._baseline) {
                    this._baseline = baseline;
                    this._attrsChanged.fire();
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineTimeseriesModel.prototype, "lineColor", {
            get: function() {
                return this._lineColor;
            },
            set: function(lineColor) {
                if (lineColor !== this._lineColor) {
                    this._lineColor = lineColor;
                    this._attrsChanged.fire();
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineTimeseriesModel.prototype, "pointColor", {
            get: function() {
                return this._pointColor;
            },
            set: function(pointColor) {
                if (pointColor !== this._pointColor) {
                    this._pointColor = pointColor;
                    this._attrsChanged.fire();
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineTimeseriesModel.prototype, "lineThickness", {
            get: function() {
                return this._lineThickness;
            },
            set: function(lineThickness) {
                if (lineThickness !== this._lineThickness) {
                    this._lineThickness = lineThickness;
                    this._attrsChanged.fire();
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineTimeseriesModel.prototype, "pointSize", {
            get: function() {
                return this._pointSize;
            },
            set: function(pointSize) {
                if (pointSize !== this._pointSize) {
                    this._pointSize = pointSize;
                    this._attrsChanged.fire();
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineTimeseriesModel.prototype, "uiHint", {
            get: function() {
                return this._uiHint;
            },
            set: function(uiHint) {
                if (uiHint !== this._uiHint) {
                    this._uiHint = uiHint;
                    this._attrsChanged.fire();
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineTimeseriesModel.prototype, "fragmentGuids", {
            get: function() {
                return this._fragmentGuids;
            },
            set: function(fragmentGuids) {
                if (fragmentGuids !== this._fragmentGuids) {
                    this._fragmentGuids = fragmentGuids;
                    this._attrsChanged.fire();
                }
            },
            enumerable: true,
            configurable: true
        });
        TimelineTimeseriesModel.prototype.snapshot = function() {
            return {
                timeseriesGuid: this._timeseriesGuid,
                uiHint: this._uiHint,
                baseline: this._baseline,
                lineColor: Webglimpse.hasval(this._lineColor) ? this._lineColor.cssString : null,
                pointColor: Webglimpse.hasval(this._pointColor) ? this._pointColor.cssString : null,
                lineThickness: this._lineThickness,
                pointSize: this._pointSize,
                fragmentGuids: this._fragmentGuids.toArray()
            };
        };
        return TimelineTimeseriesModel;
    }();
    Webglimpse.TimelineTimeseriesModel = TimelineTimeseriesModel;
    var TimelineTimeseriesFragmentModel = function() {
        function TimelineTimeseriesFragmentModel(fragment) {
            this._fragmentGuid = fragment.fragmentGuid;
            this._attrsChanged = new Webglimpse.Notification();
            this._dataChanged = new Webglimpse.Notification2();
            this.setAttrs(fragment);
        }
        Object.defineProperty(TimelineTimeseriesFragmentModel.prototype, "fragmentGuid", {
            get: function() {
                return this._fragmentGuid;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineTimeseriesFragmentModel.prototype, "dataChanged", {
            get: function() {
                return this._dataChanged;
            },
            enumerable: true,
            configurable: true
        });
        TimelineTimeseriesFragmentModel.prototype.setAttrs = function(fragment) {
            this._userEditMode = fragment.userEditMode;
            this._times_PMILLIS = Webglimpse.hasval(fragment.times_ISO8601) ? fragment.times_ISO8601.map(Webglimpse.parseTime_PMILLIS) : [];
            this._data = Webglimpse.hasval(fragment.data) ? fragment.data.slice() : [];
            this._dataChanged.fire(0, this._data.length);
            this._attrsChanged.fire();
        };
        Object.defineProperty(TimelineTimeseriesFragmentModel.prototype, "data", {
            get: function() {
                return this._data;
            },
            set: function(data) {
                if (data !== this._data) {
                    this._data = data;
                    this._dataChanged.fire(0, this._data.length);
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineTimeseriesFragmentModel.prototype, "times_PMILLIS", {
            get: function() {
                return this._times_PMILLIS;
            },
            // Time should only be modified in a way which keeps the _times_PMILLIS
            // array sorted. This is currently not enforced by the model.
            set: function(times_PMILLIS) {
                if (times_PMILLIS !== this._times_PMILLIS) {
                    this._times_PMILLIS = times_PMILLIS;
                    this._dataChanged.fire(0, this._data.length);
                }
            },
            enumerable: true,
            configurable: true
        });
        // Time should only be modified in a way which keeps the _times_PMILLIS
        // array sorted. This is currently not enforced by the model.
        TimelineTimeseriesFragmentModel.prototype.setAllData = function(data, times_PMILLIS) {
            if (data !== this._data || times_PMILLIS !== this._times_PMILLIS) {
                this._data = data;
                this._times_PMILLIS = times_PMILLIS;
                this._dataChanged.fire(0, this._data.length);
            }
        };
        // Handles adjusting the _times_PMILLIS and _data arrays if the new time
        // requires them to be rearranged to stay in time order. Returns the new
        // index assigned to the data point.
        TimelineTimeseriesFragmentModel.prototype.setData = function(index, value, time) {
            if (this._data[index] !== value || Webglimpse.hasval(time) && this._times_PMILLIS[index] !== time) {
                if (Webglimpse.hasval(time)) {
                    // the new time value would maintain the sorted order of the array
                    if ((index === 0 || time > this._times_PMILLIS[index - 1]) && (index === this._times_PMILLIS.length - 1 || time < this._times_PMILLIS[index + 1])) {
                        this._times_PMILLIS[index] = time;
                        this._data[index] = value;
                        this._dataChanged.fire(index, index + 1);
                    } else {
                        // remove the current point at index
                        this._times_PMILLIS.splice(index, 1);
                        this._data.splice(index, 1);
                        // find the index to reinsert new data at
                        index = Webglimpse.indexOf(this._times_PMILLIS, time);
                        if (index < 0) index = -index - 1;
                        this._times_PMILLIS.splice(index, 0, time);
                        this._data.splice(index, 0, value);
                        this._dataChanged.fire(index, index + 1);
                    }
                } else {
                    this._data[index] = value;
                    this._dataChanged.fire(index, index + 1);
                }
            }
            return index;
        };
        Object.defineProperty(TimelineTimeseriesFragmentModel.prototype, "start_PMILLIS", {
            get: function() {
                return this._times_PMILLIS[0];
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineTimeseriesFragmentModel.prototype, "end_PMILLIS", {
            get: function() {
                return this._times_PMILLIS.slice(-1)[0];
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineTimeseriesFragmentModel.prototype, "userEditMode", {
            get: function() {
                return this._userEditMode;
            },
            set: function(userEditMode) {
                if (userEditMode !== this._userEditMode) {
                    this._userEditMode = userEditMode;
                    this._attrsChanged.fire();
                }
            },
            enumerable: true,
            configurable: true
        });
        TimelineTimeseriesFragmentModel.prototype.snapshot = function() {
            return {
                userEditMode: this._userEditMode,
                fragmentGuid: this._fragmentGuid,
                data: this._data.slice(),
                times_ISO8601: this._times_PMILLIS.map(Webglimpse.formatTime_ISO8601)
            };
        };
        return TimelineTimeseriesFragmentModel;
    }();
    Webglimpse.TimelineTimeseriesFragmentModel = TimelineTimeseriesFragmentModel;
    var TimelineEventModel = function() {
        function TimelineEventModel(event) {
            this._eventGuid = event.eventGuid;
            this._attrsChanged = new Webglimpse.Notification();
            this.setAttrs(event);
        }
        Object.defineProperty(TimelineEventModel.prototype, "eventGuid", {
            get: function() {
                return this._eventGuid;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineEventModel.prototype, "attrsChanged", {
            get: function() {
                return this._attrsChanged;
            },
            enumerable: true,
            configurable: true
        });
        TimelineEventModel.prototype.setAttrs = function(event) {
            // Don't both checking whether values are going to change -- it's not that important, and it would be obnoxious here
            this._startLimit_PMILLIS = Webglimpse.hasval(event.startLimit_ISO8601) ? Webglimpse.parseTime_PMILLIS(event.startLimit_ISO8601) : null;
            this._endLimit_PMILLIS = Webglimpse.hasval(event.endLimit_ISO8601) ? Webglimpse.parseTime_PMILLIS(event.endLimit_ISO8601) : null;
            this._start_PMILLIS = Webglimpse.parseTime_PMILLIS(event.start_ISO8601);
            this._end_PMILLIS = Webglimpse.parseTime_PMILLIS(event.end_ISO8601);
            this._label = event.label;
            this._labelIcon = event.labelIcon;
            this._userEditable = Webglimpse.hasval(event.userEditable) ? event.userEditable : false;
            this._styleGuid = event.styleGuid;
            this._order = event.order;
            this._topMargin = event.topMargin;
            this._bottomMargin = event.bottomMargin;
            this._fgColor = Webglimpse.hasval(event.fgColor) ? Webglimpse.parseCssColor(event.fgColor) : null;
            this._bgColor = Webglimpse.hasval(event.bgColor) ? Webglimpse.parseCssColor(event.bgColor) : null;
            this._bgSecondaryColor = Webglimpse.hasval(event.bgSecondaryColor) ? Webglimpse.parseCssColor(event.bgSecondaryColor) : null;
            this._borderColor = Webglimpse.hasval(event.borderColor) ? Webglimpse.parseCssColor(event.borderColor) : null;
            this._borderSecondaryColor = Webglimpse.hasval(event.borderSecondaryColor) ? Webglimpse.parseCssColor(event.borderSecondaryColor) : null;
            this._labelTopMargin = event.labelTopMargin;
            this._labelBottomMargin = event.labelBottomMargin;
            this._labelVAlign = event.labelVAlign;
            this._labelVPos = event.labelVPos;
            this._labelHAlign = event.labelHAlign;
            this._labelHPos = event.labelHPos;
            this._isBorderDashed = Webglimpse.hasval(event.isBorderDashed) ? event.isBorderDashed : false;
            this._fillPattern = Webglimpse.hasval(event.fillPattern) ? Webglimpse.FillPattern[event.fillPattern] : 0;
            this._attrsChanged.fire();
        };
        TimelineEventModel.prototype.setInterval = function(start_PMILLIS, end_PMILLIS) {
            if (start_PMILLIS !== this._start_PMILLIS || end_PMILLIS !== this._end_PMILLIS) {
                var initial_start_PMILLIS = this._start_PMILLIS;
                var initial_end_PMILLIS = this._end_PMILLIS;
                var underStartLimit = Webglimpse.hasval(this._startLimit_PMILLIS) && start_PMILLIS < this._startLimit_PMILLIS;
                var overEndLimit = Webglimpse.hasval(this._endLimit_PMILLIS) && end_PMILLIS > this._endLimit_PMILLIS;
                var duration_PMILLIS = end_PMILLIS - start_PMILLIS;
                var durationLimit_PMILLIS = this._endLimit_PMILLIS - this._startLimit_PMILLIS;
                // If both limits are present and the event is larger than the total distance between them
                // then shrink the event to fit between the limits.
                if (Webglimpse.hasval(this._startLimit_PMILLIS) && Webglimpse.hasval(this._endLimit_PMILLIS) && durationLimit_PMILLIS < duration_PMILLIS) {
                    this._start_PMILLIS = this._startLimit_PMILLIS;
                    this._end_PMILLIS = this._endLimit_PMILLIS;
                } else if (underStartLimit) {
                    this._start_PMILLIS = this._startLimit_PMILLIS;
                    this._end_PMILLIS = this._start_PMILLIS + duration_PMILLIS;
                } else if (overEndLimit) {
                    this._end_PMILLIS = this._endLimit_PMILLIS;
                    this._start_PMILLIS = this._end_PMILLIS - duration_PMILLIS;
                } else {
                    this._end_PMILLIS = end_PMILLIS;
                    this._start_PMILLIS = start_PMILLIS;
                }
                // its possible due to the limits that the values didn't actually change
                // only fire attrsChanged if one of the values did actually change
                if (initial_start_PMILLIS !== this._start_PMILLIS || initial_end_PMILLIS !== this._end_PMILLIS) {
                    this._attrsChanged.fire();
                }
            }
        };
        TimelineEventModel.prototype.limit_start_PMILLIS = function(start_PMILLIS) {
            return Webglimpse.hasval(this._startLimit_PMILLIS) ? Math.max(start_PMILLIS, this._startLimit_PMILLIS) : start_PMILLIS;
        };
        TimelineEventModel.prototype.limit_end_PMILLIS = function(end_PMILLIS) {
            return Webglimpse.hasval(this._endLimit_PMILLIS) ? Math.min(end_PMILLIS, this._endLimit_PMILLIS) : end_PMILLIS;
        };
        Object.defineProperty(TimelineEventModel.prototype, "start_PMILLIS", {
            get: function() {
                return this._start_PMILLIS;
            },
            set: function(start_PMILLIS) {
                if (start_PMILLIS !== this._start_PMILLIS) {
                    this._start_PMILLIS = this.limit_start_PMILLIS(start_PMILLIS);
                    this._attrsChanged.fire();
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineEventModel.prototype, "end_PMILLIS", {
            get: function() {
                return this._end_PMILLIS;
            },
            set: function(end_PMILLIS) {
                if (end_PMILLIS !== this._end_PMILLIS) {
                    this._end_PMILLIS = this.limit_end_PMILLIS(end_PMILLIS);
                    this._attrsChanged.fire();
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineEventModel.prototype, "startLimit_PMILLIS", {
            get: function() {
                return this._startLimit_PMILLIS;
            },
            set: function(startLimit_PMILLIS) {
                if (startLimit_PMILLIS !== this._startLimit_PMILLIS) {
                    this._startLimit_PMILLIS = startLimit_PMILLIS;
                    this._start_PMILLIS = this.limit_start_PMILLIS(this._start_PMILLIS);
                    this._attrsChanged.fire();
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineEventModel.prototype, "endLimit_PMILLIS", {
            get: function() {
                return this._endLimit_PMILLIS;
            },
            set: function(endLimit_PMILLIS) {
                if (endLimit_PMILLIS !== this._endLimit_PMILLIS) {
                    this._endLimit_PMILLIS = endLimit_PMILLIS;
                    this._end_PMILLIS = this.limit_end_PMILLIS(this._end_PMILLIS);
                    this._attrsChanged.fire();
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineEventModel.prototype, "label", {
            get: function() {
                return this._label;
            },
            set: function(label) {
                if (label !== this._label) {
                    this._label = label;
                    this._attrsChanged.fire();
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineEventModel.prototype, "labelIcon", {
            get: function() {
                return this._labelIcon;
            },
            set: function(labelIcon) {
                if (labelIcon !== this._labelIcon) {
                    this._labelIcon = labelIcon;
                    this._attrsChanged.fire();
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineEventModel.prototype, "userEditable", {
            get: function() {
                return this._userEditable;
            },
            set: function(userEditable) {
                if (userEditable !== this._userEditable) {
                    this._userEditable = userEditable;
                    this._attrsChanged.fire();
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineEventModel.prototype, "styleGuid", {
            get: function() {
                return this._styleGuid;
            },
            set: function(styleGuid) {
                if (styleGuid !== this._styleGuid) {
                    this._styleGuid = styleGuid;
                    this._attrsChanged.fire();
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineEventModel.prototype, "order", {
            get: function() {
                return this._order;
            },
            set: function(order) {
                if (order !== this._order) {
                    this._order = order;
                    this._attrsChanged.fire();
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineEventModel.prototype, "topMargin", {
            get: function() {
                return this._topMargin;
            },
            set: function(topMargin) {
                if (topMargin !== this._topMargin) {
                    this._topMargin = topMargin;
                    this._attrsChanged.fire();
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineEventModel.prototype, "bottomMargin", {
            get: function() {
                return this._bottomMargin;
            },
            set: function(bottomMargin) {
                if (bottomMargin !== this._bottomMargin) {
                    this._bottomMargin = bottomMargin;
                    this._attrsChanged.fire();
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineEventModel.prototype, "fgColor", {
            get: function() {
                return this._fgColor;
            },
            set: function(fgColor) {
                if (fgColor !== this._fgColor) {
                    this._fgColor = fgColor;
                    this._attrsChanged.fire();
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineEventModel.prototype, "bgColor", {
            get: function() {
                return this._bgColor;
            },
            set: function(bgColor) {
                if (bgColor !== this._bgColor) {
                    this._bgColor = bgColor;
                    this._attrsChanged.fire();
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineEventModel.prototype, "bgSecondaryColor", {
            get: function() {
                return this._bgSecondaryColor;
            },
            set: function(bgSecondaryColor) {
                if (bgSecondaryColor !== this._bgSecondaryColor) {
                    this._bgSecondaryColor = bgSecondaryColor;
                    this._attrsChanged.fire();
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineEventModel.prototype, "borderColor", {
            get: function() {
                return this._borderColor;
            },
            set: function(borderColor) {
                if (borderColor !== this._borderColor) {
                    this._borderColor = borderColor;
                    this._attrsChanged.fire();
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineEventModel.prototype, "borderSecondaryColor", {
            get: function() {
                return this._borderSecondaryColor;
            },
            set: function(borderSecondaryColor) {
                if (borderSecondaryColor !== this._borderSecondaryColor) {
                    this._borderSecondaryColor = borderSecondaryColor;
                    this._attrsChanged.fire();
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineEventModel.prototype, "labelTopMargin", {
            get: function() {
                return this._labelTopMargin;
            },
            set: function(labelTopMargin) {
                if (labelTopMargin !== this._labelTopMargin) {
                    this._labelTopMargin = labelTopMargin;
                    this._attrsChanged.fire();
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineEventModel.prototype, "labelBottomMargin", {
            get: function() {
                return this._labelBottomMargin;
            },
            set: function(labelBottomMargin) {
                if (labelBottomMargin !== this._labelBottomMargin) {
                    this._labelBottomMargin = labelBottomMargin;
                    this._attrsChanged.fire();
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineEventModel.prototype, "labelVAlign", {
            get: function() {
                return this._labelVAlign;
            },
            set: function(labelVAlign) {
                if (labelVAlign !== this._labelVAlign) {
                    this._labelVAlign = labelVAlign;
                    this._attrsChanged.fire();
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineEventModel.prototype, "labelVPos", {
            get: function() {
                return this._labelVPos;
            },
            set: function(labelVPos) {
                if (labelVPos !== this._labelVPos) {
                    this._labelVPos = labelVPos;
                    this._attrsChanged.fire();
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineEventModel.prototype, "labelHAlign", {
            get: function() {
                return this._labelHAlign;
            },
            set: function(labelHAlign) {
                if (labelHAlign !== this._labelHAlign) {
                    this._labelHAlign = labelHAlign;
                    this._attrsChanged.fire();
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineEventModel.prototype, "labelHPos", {
            get: function() {
                return this._labelHPos;
            },
            set: function(labelHPos) {
                if (labelHPos !== this._labelHPos) {
                    this._labelHPos = labelHPos;
                    this._attrsChanged.fire();
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineEventModel.prototype, "isBorderDashed", {
            get: function() {
                return this._isBorderDashed;
            },
            set: function(isBorderDashed) {
                if (isBorderDashed !== this._isBorderDashed) {
                    this._isBorderDashed = isBorderDashed;
                    this._attrsChanged.fire();
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineEventModel.prototype, "fillPattern", {
            get: function() {
                return this._fillPattern;
            },
            set: function(fillPattern) {
                if (fillPattern !== this._fillPattern) {
                    this._fillPattern = fillPattern;
                    this._attrsChanged.fire();
                }
            },
            enumerable: true,
            configurable: true
        });
        TimelineEventModel.prototype.snapshot = function() {
            return {
                eventGuid: this._eventGuid,
                startLimit_ISO8601: Webglimpse.hasval(this._startLimit_PMILLIS) ? Webglimpse.formatTime_ISO8601(this._startLimit_PMILLIS) : null,
                endLimit_ISO8601: Webglimpse.hasval(this._endLimit_PMILLIS) ? Webglimpse.formatTime_ISO8601(this._endLimit_PMILLIS) : null,
                start_ISO8601: Webglimpse.formatTime_ISO8601(this._start_PMILLIS),
                end_ISO8601: Webglimpse.formatTime_ISO8601(this._end_PMILLIS),
                label: this._label,
                labelIcon: this._labelIcon,
                userEditable: this._userEditable,
                styleGuid: this._styleGuid,
                order: this._order,
                topMargin: this._topMargin,
                bottomMargin: this._bottomMargin,
                bgColor: Webglimpse.hasval(this._bgColor) ? this._bgColor.cssString : null,
                bgSecondaryColor: Webglimpse.hasval(this._bgSecondaryColor) ? this._bgSecondaryColor.cssString : null,
                fgColor: Webglimpse.hasval(this._fgColor) ? this._fgColor.cssString : null,
                borderColor: Webglimpse.hasval(this._borderColor) ? this._borderColor.cssString : null,
                borderSecondaryColor: Webglimpse.hasval(this._borderSecondaryColor) ? this.borderSecondaryColor.cssString : null,
                labelTopMargin: this._labelTopMargin,
                labelBottomMargin: this._labelBottomMargin,
                labelVAlign: this._labelVAlign,
                labelVPos: this._labelVPos,
                labelHAlign: this._labelHAlign,
                labelHPos: this._labelHPos,
                isBorderDashed: this._isBorderDashed,
                fillPattern: Webglimpse.FillPattern[this._fillPattern]
            };
        };
        return TimelineEventModel;
    }();
    Webglimpse.TimelineEventModel = TimelineEventModel;
    var TimelineRowModel = function() {
        function TimelineRowModel(row) {
            this._rowGuid = row.rowGuid;
            this._attrsChanged = new Webglimpse.Notification();
            var min = Webglimpse.hasval(row.yMin) ? row.yMin : 0;
            var max = Webglimpse.hasval(row.yMax) ? row.yMax : 1;
            this._dataAxis = new Webglimpse.Axis1D(min, max);
            this.setAttrs(row);
            this._eventGuids = new Webglimpse.OrderedStringSet(row.eventGuids || []);
            this._timeseriesGuids = new Webglimpse.OrderedStringSet(row.timeseriesGuids || []);
            this._annotationGuids = new Webglimpse.OrderedStringSet(row.annotationGuids || []);
        }
        Object.defineProperty(TimelineRowModel.prototype, "rowGuid", {
            get: function() {
                return this._rowGuid;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineRowModel.prototype, "attrsChanged", {
            get: function() {
                return this._attrsChanged;
            },
            enumerable: true,
            configurable: true
        });
        TimelineRowModel.prototype.setAttrs = function(row) {
            // Don't both checking whether values are going to change -- it's not that important, and it would be obnoxious here
            this._label = row.label;
            this._uiHint = row.uiHint;
            this._hidden = row.hidden;
            this._rowHeight = row.rowHeight;
            this._cursorGuid = row.cursorGuid;
            this._bgColor = Webglimpse.hasval(row.bgColor) ? Webglimpse.parseCssColor(row.bgColor) : null;
            this._fgLabelColor = Webglimpse.hasval(row.fgLabelColor) ? Webglimpse.parseCssColor(row.fgLabelColor) : null;
            this._bgLabelColor = Webglimpse.hasval(row.bgLabelColor) ? Webglimpse.parseCssColor(row.bgLabelColor) : null;
            this._labelFont = row.labelFont;
            this._attrsChanged.fire();
        };
        Object.defineProperty(TimelineRowModel.prototype, "cursorGuid", {
            get: function() {
                return this._cursorGuid;
            },
            set: function(cursorGuid) {
                this._cursorGuid = cursorGuid;
                this._attrsChanged.fire();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineRowModel.prototype, "rowHeight", {
            get: function() {
                return this._rowHeight;
            },
            set: function(rowHeight) {
                this._rowHeight = rowHeight;
                this._attrsChanged.fire();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineRowModel.prototype, "hidden", {
            get: function() {
                return this._hidden;
            },
            set: function(hidden) {
                this._hidden = hidden;
                this._attrsChanged.fire();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineRowModel.prototype, "dataAxis", {
            get: function() {
                return this._dataAxis;
            },
            set: function(dataAxis) {
                this._dataAxis = dataAxis;
                this._attrsChanged.fire();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineRowModel.prototype, "label", {
            get: function() {
                return this._label;
            },
            set: function(label) {
                if (label !== this._label) {
                    this._label = label;
                    this._attrsChanged.fire();
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineRowModel.prototype, "uiHint", {
            get: function() {
                return this._uiHint;
            },
            set: function(uiHint) {
                if (uiHint !== this._uiHint) {
                    this._uiHint = uiHint;
                    this._attrsChanged.fire();
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineRowModel.prototype, "bgColor", {
            get: function() {
                return this._bgColor;
            },
            set: function(bgColor) {
                if (bgColor !== this._bgColor) {
                    this._bgColor = bgColor;
                    this._attrsChanged.fire();
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineRowModel.prototype, "bgLabelColor", {
            get: function() {
                return this._bgLabelColor;
            },
            set: function(bgLabelColor) {
                if (bgLabelColor !== this._bgLabelColor) {
                    this._bgLabelColor = bgLabelColor;
                    this._attrsChanged.fire();
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineRowModel.prototype, "fgLabelColor", {
            get: function() {
                return this._fgLabelColor;
            },
            set: function(fgLabelColor) {
                if (fgLabelColor !== this._fgLabelColor) {
                    this._fgLabelColor = fgLabelColor;
                    this._attrsChanged.fire();
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineRowModel.prototype, "labelFont", {
            get: function() {
                return this._labelFont;
            },
            set: function(labelFont) {
                if (labelFont !== this._labelFont) {
                    this._labelFont = labelFont;
                    this._attrsChanged.fire();
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineRowModel.prototype, "eventGuids", {
            get: function() {
                return this._eventGuids;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineRowModel.prototype, "timeseriesGuids", {
            get: function() {
                return this._timeseriesGuids;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineRowModel.prototype, "annotationGuids", {
            get: function() {
                return this._annotationGuids;
            },
            enumerable: true,
            configurable: true
        });
        TimelineRowModel.prototype.snapshot = function() {
            return {
                rowGuid: this._rowGuid,
                label: this._label,
                rowHeight: this._rowHeight,
                hidden: this._hidden,
                uiHint: this._uiHint,
                eventGuids: this._eventGuids.toArray(),
                timeseriesGuids: this._timeseriesGuids.toArray(),
                annotationGuids: this._annotationGuids.toArray(),
                cursorGuid: this._cursorGuid,
                bgColor: Webglimpse.hasval(this._bgColor) ? this._bgColor.cssString : null,
                bgLabelColor: Webglimpse.hasval(this._bgLabelColor) ? this._bgLabelColor.cssString : null,
                fgLabelColor: Webglimpse.hasval(this._fgLabelColor) ? this._fgLabelColor.cssString : null,
                labelFont: this._labelFont
            };
        };
        return TimelineRowModel;
    }();
    Webglimpse.TimelineRowModel = TimelineRowModel;
    var TimelineGroupModel = function() {
        function TimelineGroupModel(group) {
            this._groupGuid = group.groupGuid;
            this._attrsChanged = new Webglimpse.Notification();
            this.setAttrs(group);
            this._rowGuids = new Webglimpse.OrderedStringSet(group.rowGuids);
        }
        Object.defineProperty(TimelineGroupModel.prototype, "groupGuid", {
            get: function() {
                return this._groupGuid;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineGroupModel.prototype, "rollupGuid", {
            get: function() {
                return this._rollupGuid;
            },
            set: function(rollupGuid) {
                this._rollupGuid = rollupGuid;
                this._attrsChanged.fire();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineGroupModel.prototype, "attrsChanged", {
            get: function() {
                return this._attrsChanged;
            },
            enumerable: true,
            configurable: true
        });
        TimelineGroupModel.prototype.setAttrs = function(group) {
            // Don't both checking whether values are going to change -- it's not that important, and it would be obnoxious here
            this._rollupGuid = group.rollupGuid;
            this._hidden = group.hidden;
            this._label = group.label;
            this._collapsed = group.collapsed;
            this._attrsChanged.fire();
        };
        Object.defineProperty(TimelineGroupModel.prototype, "hidden", {
            get: function() {
                return this._hidden;
            },
            set: function(hidden) {
                this._hidden = hidden;
                this._attrsChanged.fire();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineGroupModel.prototype, "label", {
            get: function() {
                return this._label;
            },
            set: function(label) {
                if (label !== this._label) {
                    this._label = label;
                    this._attrsChanged.fire();
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineGroupModel.prototype, "collapsed", {
            get: function() {
                return this._collapsed;
            },
            set: function(collapsed) {
                if (collapsed !== this._collapsed) {
                    this._collapsed = collapsed;
                    this._attrsChanged.fire();
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineGroupModel.prototype, "rowGuids", {
            get: function() {
                return this._rowGuids;
            },
            enumerable: true,
            configurable: true
        });
        TimelineGroupModel.prototype.snapshot = function() {
            return {
                groupGuid: this._groupGuid,
                rollupGuid: this._rollupGuid,
                label: this._label,
                hidden: this._hidden,
                collapsed: Webglimpse.hasval(this._collapsed) ? this._collapsed : false,
                rowGuids: this._rowGuids.toArray()
            };
        };
        return TimelineGroupModel;
    }();
    Webglimpse.TimelineGroupModel = TimelineGroupModel;
    var TimelineRootModel = function() {
        function TimelineRootModel(root) {
            this._attrsChanged = new Webglimpse.Notification();
            this.setAttrs(root);
            this._groupGuids = new Webglimpse.OrderedStringSet(root.groupGuids);
            this._topPinnedRowGuids = new Webglimpse.OrderedStringSet(root.topPinnedRowGuids || []);
            this._bottomPinnedRowGuids = new Webglimpse.OrderedStringSet(root.bottomPinnedRowGuids || []);
            this._maximizedRowGuids = new Webglimpse.OrderedStringSet(root.maximizedRowGuids || []);
        }
        Object.defineProperty(TimelineRootModel.prototype, "attrsChanged", {
            get: function() {
                return this._attrsChanged;
            },
            enumerable: true,
            configurable: true
        });
        TimelineRootModel.prototype.setAttrs = function(root) {
            // Don't both checking whether values are going to change -- it's not that important, and it would be obnoxious here
            // No attrs yet
            this._attrsChanged.fire();
        };
        Object.defineProperty(TimelineRootModel.prototype, "groupGuids", {
            get: function() {
                return this._groupGuids;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineRootModel.prototype, "topPinnedRowGuids", {
            get: function() {
                return this._topPinnedRowGuids;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineRootModel.prototype, "bottomPinnedRowGuids", {
            get: function() {
                return this._bottomPinnedRowGuids;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineRootModel.prototype, "maximizedRowGuids", {
            get: function() {
                return this._maximizedRowGuids;
            },
            enumerable: true,
            configurable: true
        });
        TimelineRootModel.prototype.snapshot = function() {
            return {
                groupGuids: this._groupGuids.toArray(),
                topPinnedRowGuids: this._topPinnedRowGuids.toArray(),
                bottomPinnedRowGuids: this._bottomPinnedRowGuids.toArray(),
                maximizedRowGuids: this._maximizedRowGuids.toArray()
            };
        };
        return TimelineRootModel;
    }();
    Webglimpse.TimelineRootModel = TimelineRootModel;
    var TimelineModel = function() {
        function TimelineModel(timeline) {
            var cursors = Webglimpse.hasval(timeline) && Webglimpse.hasval(timeline.cursors) ? timeline.cursors : [];
            this._cursors = new Webglimpse.OrderedSet([], function(g) {
                return g.cursorGuid;
            });
            for (var n = 0; n < cursors.length; n++) {
                this._cursors.add(new TimelineCursorModel(cursors[n]));
            }
            var annotations = Webglimpse.hasval(timeline) && Webglimpse.hasval(timeline.annotations) ? timeline.annotations : [];
            this._annotations = new Webglimpse.OrderedSet([], function(g) {
                return g.annotationGuid;
            });
            for (var n = 0; n < annotations.length; n++) {
                this._annotations.add(new TimelineAnnotationModel(annotations[n]));
            }
            var timeseriesFragments = Webglimpse.hasval(timeline) && Webglimpse.hasval(timeline.timeseriesFragments) ? timeline.timeseriesFragments : [];
            this._timeseriesFragments = new Webglimpse.OrderedSet([], function(e) {
                return e.fragmentGuid;
            });
            for (var n = 0; n < timeseriesFragments.length; n++) {
                this._timeseriesFragments.add(new TimelineTimeseriesFragmentModel(timeseriesFragments[n]));
            }
            var timeseries = Webglimpse.hasval(timeline) && Webglimpse.hasval(timeline.timeseries) ? timeline.timeseries : [];
            this._timeseries = new Webglimpse.OrderedSet([], function(e) {
                return e.timeseriesGuid;
            });
            for (var n = 0; n < timeseries.length; n++) {
                this._timeseries.add(new TimelineTimeseriesModel(timeseries[n]));
            }
            var events = Webglimpse.hasval(timeline) && Webglimpse.hasval(timeline.events) ? timeline.events : [];
            this._events = new Webglimpse.OrderedSet([], function(e) {
                return e.eventGuid;
            });
            for (var n = 0; n < events.length; n++) {
                this._events.add(new TimelineEventModel(events[n]));
            }
            var rows = Webglimpse.hasval(timeline) && Webglimpse.hasval(timeline.rows) ? timeline.rows : [];
            this._rows = new Webglimpse.OrderedSet([], function(r) {
                return r.rowGuid;
            });
            for (var n = 0; n < rows.length; n++) {
                this._rows.add(new TimelineRowModel(rows[n]));
            }
            var groups = Webglimpse.hasval(timeline) && Webglimpse.hasval(timeline.groups) ? timeline.groups : [];
            this._groups = new Webglimpse.OrderedSet([], function(g) {
                return g.groupGuid;
            });
            for (var n = 0; n < groups.length; n++) {
                this._groups.add(new TimelineGroupModel(groups[n]));
            }
            var root = Webglimpse.hasval(timeline) && Webglimpse.hasval(timeline.root) ? timeline.root : newEmptyTimelineRoot();
            this._root = new TimelineRootModel(root);
        }
        Object.defineProperty(TimelineModel.prototype, "cursors", {
            get: function() {
                return this._cursors;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineModel.prototype, "annotations", {
            get: function() {
                return this._annotations;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineModel.prototype, "timeseriesFragments", {
            get: function() {
                return this._timeseriesFragments;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineModel.prototype, "timeseriesSets", {
            get: function() {
                return this._timeseries;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineModel.prototype, "events", {
            get: function() {
                return this._events;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineModel.prototype, "rows", {
            get: function() {
                return this._rows;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineModel.prototype, "groups", {
            get: function() {
                return this._groups;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineModel.prototype, "root", {
            get: function() {
                return this._root;
            },
            enumerable: true,
            configurable: true
        });
        TimelineModel.prototype.cursor = function(cursorGuid) {
            return this._cursors.valueFor(cursorGuid);
        };
        TimelineModel.prototype.annotation = function(annotationGuid) {
            return this._annotations.valueFor(annotationGuid);
        };
        TimelineModel.prototype.timeseriesFragment = function(fragmentGuid) {
            return this._timeseriesFragments.valueFor(fragmentGuid);
        };
        TimelineModel.prototype.timeseries = function(timeseriesGuid) {
            return this._timeseries.valueFor(timeseriesGuid);
        };
        TimelineModel.prototype.event = function(eventGuid) {
            return this._events.valueFor(eventGuid);
        };
        TimelineModel.prototype.row = function(rowGuid) {
            return this._rows.valueFor(rowGuid);
        };
        TimelineModel.prototype.group = function(groupGuid) {
            return this._groups.valueFor(groupGuid);
        };
        TimelineModel.prototype.replace = function(newTimeline) {
            // Purge removed items
            //
            var freshRoot = newTimeline.root;
            this._root.groupGuids.retainValues(freshRoot.groupGuids);
            this._root.topPinnedRowGuids.retainValues(freshRoot.topPinnedRowGuids);
            this._root.bottomPinnedRowGuids.retainValues(freshRoot.bottomPinnedRowGuids);
            this._root.maximizedRowGuids.retainValues(freshRoot.maximizedRowGuids);
            var freshGroups = newTimeline.groups;
            var retainedGroupGuids = [];
            for (var n = 0; n < freshGroups.length; n++) {
                var freshGroup = freshGroups[n];
                var groupGuid = freshGroup.groupGuid;
                var oldGroup = this._groups.valueFor(groupGuid);
                if (Webglimpse.hasval(oldGroup)) {
                    oldGroup.rowGuids.retainValues(freshGroup.rowGuids);
                    retainedGroupGuids.push(groupGuid);
                }
            }
            this._groups.retainIds(retainedGroupGuids);
            var freshRows = newTimeline.rows;
            var retainedRowGuids = [];
            for (var n = 0; n < freshRows.length; n++) {
                var freshRow = freshRows[n];
                var rowGuid = freshRow.rowGuid;
                var oldRow = this._rows.valueFor(rowGuid);
                if (Webglimpse.hasval(oldRow)) {
                    oldRow.eventGuids.retainValues(freshRow.eventGuids || []);
                    retainedRowGuids.push(rowGuid);
                }
            }
            this._rows.retainIds(retainedRowGuids);
            var freshEvents = newTimeline.events;
            var retainedEventGuids = [];
            for (var n = 0; n < freshEvents.length; n++) {
                var freshEvent = freshEvents[n];
                var eventGuid = freshEvent.eventGuid;
                var oldEvent = this._events.valueFor(eventGuid);
                if (Webglimpse.hasval(oldEvent)) {
                    retainedEventGuids.push(eventGuid);
                }
            }
            this._events.retainIds(retainedEventGuids);
            var freshTimeseriesSet = newTimeline.timeseries;
            var retainedTimeseriesGuids = [];
            for (var n = 0; n < freshTimeseriesSet.length; n++) {
                var freshTimeseries = freshTimeseriesSet[n];
                var timeseriesGuid = freshTimeseries.timeseriesGuid;
                var oldTimeseries = this._timeseries.valueFor(timeseriesGuid);
                if (Webglimpse.hasval(oldTimeseries)) {
                    retainedTimeseriesGuids.push(timeseriesGuid);
                }
            }
            this._timeseries.retainIds(retainedTimeseriesGuids);
            var freshTimeseriesFragments = newTimeline.timeseriesFragments;
            var retainedTimeseriesFragmentGuids = [];
            for (var n = 0; n < freshTimeseriesFragments.length; n++) {
                var freshTimeseriesFragment = freshTimeseriesFragments[n];
                var fragmentGuid = freshTimeseriesFragment.fragmentGuid;
                var oldTimeseriesFragment = this._timeseriesFragments.valueFor(fragmentGuid);
                if (Webglimpse.hasval(oldTimeseriesFragment)) {
                    retainedTimeseriesFragmentGuids.push(fragmentGuid);
                }
            }
            this._timeseriesFragments.retainIds(retainedTimeseriesFragmentGuids);
            var freshAnnotations = newTimeline.annotations;
            var retainedAnnotationGuids = [];
            for (var n = 0; n < freshAnnotations.length; n++) {
                var freshAnnotation = freshAnnotations[n];
                var annotationGuid = freshAnnotation.annotationGuid;
                var oldAnnotation = this._annotations.valueFor(annotationGuid);
                if (Webglimpse.hasval(oldAnnotation)) {
                    retainedAnnotationGuids.push(annotationGuid);
                }
            }
            this._annotations.retainIds(retainedAnnotationGuids);
            var freshCursors = newTimeline.cursors;
            var retainedCursorGuids = [];
            for (var n = 0; n < freshCursors.length; n++) {
                var freshCursor = freshCursors[n];
                var cursorGuid = freshCursor.cursorGuid;
                var oldCursor = this._cursors.valueFor(cursorGuid);
                if (Webglimpse.hasval(oldCursor)) {
                    retainedCursorGuids.push(cursorGuid);
                }
            }
            this._cursors.retainIds(retainedCursorGuids);
            for (var n = 0; n < freshCursors.length; n++) {
                var freshCursor = freshCursors[n];
                var oldCursor = this._cursors.valueFor(freshCursor.cursorGuid);
                if (Webglimpse.hasval(oldCursor)) {
                    oldCursor.setAttrs(freshCursor);
                } else {
                    this._cursors.add(new TimelineCursorModel(freshCursor));
                }
            }
            for (var n = 0; n < freshAnnotations.length; n++) {
                var freshAnnotation = freshAnnotations[n];
                var oldAnnotation = this._annotations.valueFor(freshAnnotation.annotationGuid);
                if (Webglimpse.hasval(oldAnnotation)) {
                    oldAnnotation.setAttrs(freshAnnotation);
                } else {
                    this._annotations.add(new TimelineAnnotationModel(freshAnnotation));
                }
            }
            for (var n = 0; n < freshTimeseriesFragments.length; n++) {
                var freshTimeseriesFragment = freshTimeseriesFragments[n];
                var oldTimeseriesFragment = this._timeseriesFragments.valueFor(freshTimeseriesFragment.fragmentGuid);
                if (Webglimpse.hasval(oldTimeseriesFragment)) {
                    oldTimeseriesFragment.setAttrs(freshTimeseriesFragment);
                } else {
                    this._timeseriesFragments.add(new TimelineTimeseriesFragmentModel(freshTimeseriesFragment));
                }
            }
            for (var n = 0; n < freshTimeseriesSet.length; n++) {
                var freshTimeseries = freshTimeseriesSet[n];
                var oldTimeseries = this._timeseries.valueFor(freshTimeseries.timeseriesGuid);
                if (Webglimpse.hasval(oldTimeseries)) {
                    oldTimeseries.setAttrs(freshTimeseries);
                } else {
                    this._timeseries.add(new TimelineTimeseriesModel(freshTimeseries));
                }
            }
            for (var n = 0; n < freshEvents.length; n++) {
                var freshEvent = freshEvents[n];
                var oldEvent = this._events.valueFor(freshEvent.eventGuid);
                if (Webglimpse.hasval(oldEvent)) {
                    oldEvent.setAttrs(freshEvent);
                } else {
                    this._events.add(new TimelineEventModel(freshEvent));
                }
            }
            for (var n = 0; n < freshRows.length; n++) {
                var freshRow = freshRows[n];
                var oldRow = this._rows.valueFor(freshRow.rowGuid);
                if (Webglimpse.hasval(oldRow)) {
                    oldRow.setAttrs(freshRow);
                    oldRow.eventGuids.addAll(freshRow.eventGuids || [], 0, true);
                } else {
                    this._rows.add(new TimelineRowModel(freshRow));
                }
            }
            for (var n = 0; n < freshGroups.length; n++) {
                var freshGroup = freshGroups[n];
                var oldGroup = this._groups.valueFor(freshGroup.groupGuid);
                if (Webglimpse.hasval(oldGroup)) {
                    oldGroup.setAttrs(freshGroup);
                    oldGroup.rowGuids.addAll(freshGroup.rowGuids, 0, true);
                } else {
                    this._groups.add(new TimelineGroupModel(freshGroup));
                }
            }
            this._root.groupGuids.addAll(freshRoot.groupGuids, 0, true);
            this._root.topPinnedRowGuids.addAll(freshRoot.topPinnedRowGuids, 0, true);
            this._root.bottomPinnedRowGuids.addAll(freshRoot.bottomPinnedRowGuids, 0, true);
            this._root.maximizedRowGuids.addAll(freshRoot.maximizedRowGuids, 0, true);
        };
        TimelineModel.prototype.merge = function(newData, strategy) {
            var newCursors = Webglimpse.hasval(newData.cursors) ? newData.cursors : [];
            for (var n = 0; n < newCursors.length; n++) {
                var newCursor = newCursors[n];
                var cursorModel = this._cursors.valueFor(newCursor.cursorGuid);
                if (Webglimpse.hasval(cursorModel)) {
                    strategy.updateCursorModel(cursorModel, newCursor);
                } else {
                    this._cursors.add(new TimelineCursorModel(newCursor));
                }
            }
            var newAnnotations = Webglimpse.hasval(newData.annotations) ? newData.annotations : [];
            for (var n = 0; n < newAnnotations.length; n++) {
                var newAnnotation = newAnnotations[n];
                var annotationModel = this._annotations.valueFor(newAnnotation.annotationGuid);
                if (Webglimpse.hasval(annotationModel)) {
                    strategy.updateAnnotationModel(annotationModel, newAnnotation);
                } else {
                    this._annotations.add(new TimelineAnnotationModel(newAnnotation));
                }
            }
            var newTimeseriesFragments = Webglimpse.hasval(newData.timeseriesFragments) ? newData.timeseriesFragments : [];
            for (var n = 0; n < newTimeseriesFragments.length; n++) {
                var newTimeseriesFragment = newTimeseriesFragments[n];
                var timeseriesFragmentModel = this._timeseriesFragments.valueFor(newTimeseriesFragment.fragmentGuid);
                if (Webglimpse.hasval(timeseriesFragmentModel)) {
                    strategy.updateTimeseriesFragmentModel(timeseriesFragmentModel, newTimeseriesFragment);
                } else {
                    this._timeseriesFragments.add(new TimelineTimeseriesFragmentModel(newTimeseriesFragment));
                }
            }
            var newTimeseriesSet = Webglimpse.hasval(newData.timeseries) ? newData.timeseries : [];
            for (var n = 0; n < newTimeseriesSet.length; n++) {
                var newTimeseries = newTimeseriesSet[n];
                var timeseriesModel = this._timeseries.valueFor(newTimeseries.timeseriesGuid);
                if (Webglimpse.hasval(timeseriesModel)) {
                    strategy.updateTimeseriesModel(timeseriesModel, newTimeseries);
                } else {
                    this._timeseries.add(new TimelineTimeseriesModel(newTimeseries));
                }
            }
            var newEvents = Webglimpse.hasval(newData.events) ? newData.events : [];
            for (var n = 0; n < newEvents.length; n++) {
                var newEvent = newEvents[n];
                var eventModel = this._events.valueFor(newEvent.eventGuid);
                if (Webglimpse.hasval(eventModel)) {
                    strategy.updateEventModel(eventModel, newEvent);
                } else {
                    this._events.add(new TimelineEventModel(newEvent));
                }
            }
            var newRows = Webglimpse.hasval(newData.rows) ? newData.rows : [];
            for (var n = 0; n < newRows.length; n++) {
                var newRow = newRows[n];
                var rowModel = this._rows.valueFor(newRow.rowGuid);
                if (Webglimpse.hasval(rowModel)) {
                    strategy.updateRowModel(rowModel, newRow);
                } else {
                    this._rows.add(new TimelineRowModel(newRow));
                }
            }
            var newGroups = Webglimpse.hasval(newData.groups) ? newData.groups : [];
            for (var n = 0; n < newGroups.length; n++) {
                var newGroup = newGroups[n];
                var groupModel = this._groups.valueFor(newGroup.groupGuid);
                if (Webglimpse.hasval(groupModel)) {
                    strategy.updateGroupModel(groupModel, newGroup);
                } else {
                    this._groups.add(new TimelineGroupModel(newGroup));
                }
            }
            var newRoot = newData.root;
            strategy.updateRootModel(this._root, newRoot);
        };
        TimelineModel.prototype.snapshot = function() {
            return {
                cursors: this._cursors.map(function(e) {
                    return e.snapshot();
                }),
                annotations: this._annotations.map(function(e) {
                    return e.snapshot();
                }),
                timeseriesFragments: this._timeseriesFragments.map(function(e) {
                    return e.snapshot();
                }),
                timeseries: this._timeseries.map(function(e) {
                    return e.snapshot();
                }),
                events: this._events.map(function(e) {
                    return e.snapshot();
                }),
                rows: this._rows.map(function(r) {
                    return r.snapshot();
                }),
                groups: this._groups.map(function(g) {
                    return g.snapshot();
                }),
                root: this._root.snapshot()
            };
        };
        return TimelineModel;
    }();
    Webglimpse.TimelineModel = TimelineModel;
    function newEmptyTimelineRoot() {
        return {
            groupGuids: [],
            bottomPinnedRowGuids: [],
            topPinnedRowGuids: [],
            maximizedRowGuids: []
        };
    }
    Webglimpse.newEmptyTimelineRoot = newEmptyTimelineRoot;
    Webglimpse.timelineMergeNewBeforeOld = {
        updateCursorModel: function(cursorModel, newCursor) {
            cursorModel.setAttrs(newCursor);
        },
        updateAnnotationModel: function(annotationModel, newAnnotation) {
            annotationModel.setAttrs(newAnnotation);
        },
        updateTimeseriesFragmentModel: function(timeseriesFragmentModel, newTimeseriesFragment) {
            timeseriesFragmentModel.setAttrs(newTimeseriesFragment);
        },
        updateTimeseriesModel: function(timeseriesModel, newTimeseries) {
            timeseriesModel.setAttrs(newTimeseries);
            timeseriesModel.fragmentGuids.addAll(newTimeseries.fragmentGuids || [], 0, true);
        },
        updateEventModel: function(eventModel, newEvent) {
            eventModel.setAttrs(newEvent);
        },
        updateRowModel: function(rowModel, newRow) {
            rowModel.setAttrs(newRow);
            rowModel.eventGuids.addAll(newRow.eventGuids || [], 0, true);
        },
        updateGroupModel: function(groupModel, newGroup) {
            groupModel.setAttrs(newGroup);
            groupModel.rowGuids.addAll(newGroup.rowGuids, 0, true);
        },
        updateRootModel: function(rootModel, newRoot) {
            rootModel.setAttrs(newRoot);
            rootModel.groupGuids.addAll(newRoot.groupGuids, 0, true);
            rootModel.topPinnedRowGuids.addAll(newRoot.topPinnedRowGuids || [], 0, true);
            rootModel.bottomPinnedRowGuids.addAll(newRoot.bottomPinnedRowGuids || [], 0, true);
            rootModel.maximizedRowGuids.addAll(newRoot.maximizedRowGuids || [], 0, true);
        }
    };
    Webglimpse.timelineMergeNewAfterOld = {
        updateCursorModel: function(cursorModel, newCursor) {
            cursorModel.setAttrs(newCursor);
        },
        updateAnnotationModel: function(annotationModel, newAnnotation) {
            annotationModel.setAttrs(newAnnotation);
        },
        updateTimeseriesFragmentModel: function(timeseriesFragmentModel, newTimeseriesFragment) {
            timeseriesFragmentModel.setAttrs(newTimeseriesFragment);
        },
        updateTimeseriesModel: function(timeseriesModel, newTimeseries) {
            timeseriesModel.setAttrs(newTimeseries);
            timeseriesModel.fragmentGuids.addAll(newTimeseries.fragmentGuids || []);
        },
        updateEventModel: function(eventModel, newEvent) {
            eventModel.setAttrs(newEvent);
        },
        updateRowModel: function(rowModel, newRow) {
            rowModel.setAttrs(newRow);
            rowModel.eventGuids.addAll(newRow.eventGuids || []);
            rowModel.timeseriesGuids.addAll(newRow.timeseriesGuids || []);
            rowModel.annotationGuids.addAll(newRow.annotationGuids || []);
        },
        updateGroupModel: function(groupModel, newGroup) {
            groupModel.setAttrs(newGroup);
            groupModel.rowGuids.addAll(newGroup.rowGuids);
        },
        updateRootModel: function(rootModel, newRoot) {
            rootModel.setAttrs(newRoot);
            rootModel.groupGuids.addAll(newRoot.groupGuids);
            rootModel.topPinnedRowGuids.addAll(newRoot.topPinnedRowGuids || []);
            rootModel.bottomPinnedRowGuids.addAll(newRoot.bottomPinnedRowGuids || []);
            rootModel.maximizedRowGuids.addAll(newRoot.maximizedRowGuids || []);
        }
    };
})(Webglimpse || (Webglimpse = {}));

var Webglimpse;

(function(Webglimpse) {
    function newTimelineLayout(axisHeight) {
        return {
            updatePrefSize: function(parentPrefSize, children) {
                var topAxis = null;
                var bottomAxis = null;
                var center = null;
                for (var c = 0; c < children.length; c++) {
                    var child = children[c];
                    switch (child.layoutArg) {
                      case 0:
                        if (Webglimpse.hasval(topAxis)) throw new Error("Timeline-layout can have at most one top-axis pane");
                        topAxis = child;
                        break;

                      case 1:
                        if (Webglimpse.hasval(bottomAxis)) throw new Error("Timeline-layout can have at most one bottom-axis pane");
                        bottomAxis = child;
                        break;

                      default:
                        if (Webglimpse.hasval(center)) throw new Error("Timeline-layout can have at most one center pane");
                        center = child;
                        break;
                    }
                }
                var hSum = 0;
                if (Webglimpse.hasval(topAxis)) {
                    hSum += axisHeight;
                }
                if (Webglimpse.hasval(bottomAxis)) {
                    hSum += axisHeight;
                }
                if (Webglimpse.hasval(center)) {
                    if (Webglimpse.hasval(center.prefSize.h)) {
                        hSum += center.prefSize.h;
                    } else {
                        hSum = null;
                    }
                }
                parentPrefSize.w = null;
                parentPrefSize.h = hSum;
            },
            updateChildViewports: function(children, parentViewport) {
                var topAxis = null;
                var bottomAxis = null;
                var center = null;
                for (var c = 0; c < children.length; c++) {
                    var child = children[c];
                    switch (child.layoutArg) {
                      case 0:
                        if (Webglimpse.hasval(topAxis)) throw new Error("Timeline-layout can have at most one top-axis pane");
                        topAxis = child;
                        break;

                      case 1:
                        if (Webglimpse.hasval(bottomAxis)) throw new Error("Timeline-layout can have at most one bottom-axis pane");
                        bottomAxis = child;
                        break;

                      default:
                        if (Webglimpse.hasval(center)) throw new Error("Timeline-layout can have at most one center pane");
                        center = child;
                        break;
                    }
                }
                if (Webglimpse.hasval(topAxis)) {
                    topAxis.viewport.setRect(parentViewport.i, parentViewport.jEnd - axisHeight, parentViewport.w, axisHeight);
                }
                if (Webglimpse.hasval(bottomAxis)) {
                    var jBottomMax = (Webglimpse.hasval(topAxis) ? topAxis.viewport.j : parentViewport.jEnd) - axisHeight;
                    bottomAxis.viewport.setRect(parentViewport.i, Math.min(jBottomMax, parentViewport.j), parentViewport.w, axisHeight);
                }
                if (Webglimpse.hasval(center)) {
                    var jCenterEnd = Webglimpse.hasval(topAxis) ? topAxis.viewport.jStart : parentViewport.jEnd;
                    var jCenterStart = Webglimpse.hasval(bottomAxis) ? bottomAxis.viewport.jEnd : parentViewport.jStart;
                    center.viewport.setEdges(parentViewport.iStart, parentViewport.iEnd, jCenterStart, jCenterEnd);
                }
            }
        };
    }
    Webglimpse.newTimelineLayout = newTimelineLayout;
})(Webglimpse || (Webglimpse = {}));

var Webglimpse;

(function(Webglimpse) {
    function newTimeseriesCursorPainterFactory(cursorOptions) {
        // Painter Factory
        return function(drawable, timeAxis, dataAxis, model, rowModel, ui, options) {
            var textColor = Webglimpse.hasval(cursorOptions) && Webglimpse.hasval(cursorOptions.textColor) ? cursorOptions.textColor : Webglimpse.white;
            var lineColor = Webglimpse.hasval(cursorOptions) && Webglimpse.hasval(cursorOptions.lineColor) ? cursorOptions.lineColor : Webglimpse.white;
            var font = Webglimpse.hasval(cursorOptions) && Webglimpse.hasval(cursorOptions.font) ? cursorOptions.font : options.timelineFont;
            var buffer_px = Webglimpse.hasval(cursorOptions) && Webglimpse.hasval(cursorOptions.buffer_px) ? cursorOptions.buffer_px : 4;
            var textDecimals = Webglimpse.hasval(cursorOptions) && Webglimpse.hasval(cursorOptions.textDecimals) ? cursorOptions.textDecimals : 2;
            var boxSize_px = Webglimpse.hasval(cursorOptions) && Webglimpse.hasval(cursorOptions.boxSize_px) ? cursorOptions.boxSize_px : 8;
            var crosshairThickness_px = Webglimpse.hasval(cursorOptions) && Webglimpse.hasval(cursorOptions.crosshairThickness_px) ? cursorOptions.boxSize_px : 2;
            var boxThickness_px = Webglimpse.hasval(cursorOptions) && Webglimpse.hasval(cursorOptions.boxThickness_px) ? cursorOptions.boxSize_px : 2;
            var program = new Webglimpse.Program(Webglimpse.xyFrac_VERTSHADER, Webglimpse.solid_FRAGSHADER);
            var u_Color = new Webglimpse.UniformColor(program, "u_Color");
            var a_Position = new Webglimpse.Attribute(program, "a_XyFrac");
            var xys = new Float32Array(0);
            xys = Webglimpse.ensureCapacityFloat32(xys, 4);
            var xysBuffer = Webglimpse.newDynamicBuffer();
            var textTextures = Webglimpse.newTextTextureCache2(font);
            var textureRenderer = new Webglimpse.TextureRenderer();
            // Painter
            return function(gl, viewport) {
                // only draw a cursor if we are the current hovered row
                var hoveredRow = ui.selection.hoveredRow.value;
                if (!Webglimpse.hasval(hoveredRow) || hoveredRow.rowGuid !== rowModel.rowGuid) return;
                gl.blendFuncSeparate(Webglimpse.GL.SRC_ALPHA, Webglimpse.GL.ONE_MINUS_SRC_ALPHA, Webglimpse.GL.ONE, Webglimpse.GL.ONE_MINUS_SRC_ALPHA);
                gl.enable(Webglimpse.GL.BLEND);
                var indexXys = 0;
                textTextures.resetTouches();
                var time = ui.selection.hoveredTime_PMILLIS.value;
                var y = ui.selection.hoveredY.value;
                if (!Webglimpse.hasval(time) || !Webglimpse.hasval(y)) return;
                var wLine = crosshairThickness_px / viewport.w;
                var hLine = crosshairThickness_px / viewport.h;
                var wBoxLine = boxThickness_px / viewport.w;
                var hBoxLine = boxThickness_px / viewport.h;
                var wBox = boxSize_px / viewport.w;
                var hBox = boxSize_px / viewport.h;
                if (Webglimpse.hasval(time)) {
                    var cursorModel = model.cursor(rowModel.cursorGuid);
                    if (Webglimpse.hasval(cursorModel)) {
                        if (Webglimpse.hasval(cursorModel.lineColor)) {
                            lineColor = cursorModel.lineColor;
                        }
                        if (Webglimpse.hasval(cursorModel.textColor)) {
                            textColor = cursorModel.textColor;
                        }
                        textureRenderer.begin(gl, viewport);
                        var timeseriesCount = cursorModel.labeledTimeseriesGuids.length;
                        // 36 vertices for crosshairs, 48 vertices per timeseries intersection marker
                        xys = Webglimpse.ensureCapacityFloat32(xys, 2 * (36 + timeseriesCount * 48));
                        for (var i = 0; i < cursorModel.labeledTimeseriesGuids.length; i++) {
                            var timeseriesGuid = cursorModel.labeledTimeseriesGuids.valueAt(i);
                            var timeseries = model.timeseries(timeseriesGuid);
                            // if the row doesn't contain the timeseries, don't show cursor intersections
                            if (!rowModel.timeseriesGuids.hasValue(timeseriesGuid)) continue;
                            for (var j = 0; j < timeseries.fragmentGuids.length; j++) {
                                var fragmentGuid = timeseries.fragmentGuids.valueAt(j);
                                var fragment = model.timeseriesFragment(fragmentGuid);
                                // fragments should not overlap
                                if (fragment.start_PMILLIS < time && fragment.end_PMILLIS > time) {
                                    var value;
                                    // bars are drawn starting at the point and continuing to the next point, so we don't interpolate them
                                    if (timeseries.uiHint == "bars") {
                                        var index = Webglimpse.indexAtOrBefore(fragment.times_PMILLIS, time);
                                        value = fragment.data[index];
                                    } else {
                                        var index0 = Webglimpse.indexAtOrBefore(fragment.times_PMILLIS, time);
                                        var index1 = Webglimpse.indexAtOrAfter(fragment.times_PMILLIS, time);
                                        var value0 = fragment.data[index0];
                                        var time0 = fragment.times_PMILLIS[index0];
                                        var value1 = fragment.data[index1];
                                        var time1 = fragment.times_PMILLIS[index1];
                                        var diff = time1 - time0;
                                        var diff0 = (time - time0) / diff;
                                        var diff1 = 1 - diff0;
                                        value = value0 * diff1 + value1 * diff0;
                                    }
                                    var textTexture = textTextures.value(textColor.rgbaString, value.toFixed(textDecimals));
                                    var valueFracY = dataAxis.vFrac(value);
                                    var valueFracX = timeAxis.tFrac(time);
                                    var boxLeft = valueFracX - wBox / 2;
                                    var boxRight = valueFracX + wBox / 2;
                                    var boxTop = valueFracY + hBox / 2;
                                    var boxBottom = valueFracY - hBox / 2;
                                    // draw box at value location
                                    // left edge
                                    indexXys = Webglimpse.putQuadXys(xys, indexXys, boxLeft - wBoxLine / 2, boxLeft + wBoxLine / 2, boxTop + hBoxLine / 2, boxBottom - hBoxLine / 2);
                                    // right edge
                                    indexXys = Webglimpse.putQuadXys(xys, indexXys, boxRight - wBoxLine / 2, boxRight + wBoxLine / 2, boxTop + hBoxLine / 2, boxBottom - hBoxLine / 2);
                                    // top edge
                                    indexXys = Webglimpse.putQuadXys(xys, indexXys, boxLeft + wBoxLine / 2, boxRight - wBoxLine / 2, boxTop - hBoxLine / 2, boxTop + hBoxLine / 2);
                                    // bottom edge
                                    indexXys = Webglimpse.putQuadXys(xys, indexXys, boxLeft + wBoxLine / 2, boxRight - wBoxLine / 2, boxBottom - hBoxLine / 2, boxBottom + hBoxLine / 2);
                                    // draw text
                                    //XXX 0.6 looks more centered to the eye than 0.5 for numeric text
                                    textureRenderer.draw(gl, textTexture, boxRight + wBoxLine / 2 + buffer_px / viewport.w, valueFracY, {
                                        xAnchor: 0,
                                        yAnchor: .6
                                    });
                                }
                            }
                        }
                        if (Webglimpse.hasval(cursorModel.showCursorText) ? cursorModel.showCursorText : true) {
                            var textTexture = textTextures.value(textColor.rgbaString, y.toFixed(textDecimals));
                            textureRenderer.draw(gl, textTexture, 1, dataAxis.vFrac(y) + buffer_px / viewport.h, {
                                xAnchor: 1,
                                yAnchor: 0
                            });
                        }
                        textureRenderer.end(gl);
                        textTextures.retainTouched();
                        var xLeft = 0;
                        var xRight = 1;
                        var yMid = dataAxis.vFrac(y);
                        var xMid = timeAxis.tFrac(time);
                        // draw horizontal line
                        if (Webglimpse.hasval(cursorModel.showHorizontalLine) ? cursorModel.showHorizontalLine : true) {
                            indexXys = Webglimpse.putQuadXys(xys, indexXys, xLeft, xRight, yMid - hLine / 2, yMid + hLine / 2);
                        }
                        // draw vertical lines (split in two to avoid overlap with horizontal)
                        if (Webglimpse.hasval(cursorModel.showVerticalLine) ? cursorModel.showVerticalLine : true) {
                            indexXys = Webglimpse.putQuadXys(xys, indexXys, xMid - wLine / 2, xMid + wLine / 2, 0, yMid - hLine / 2);
                            indexXys = Webglimpse.putQuadXys(xys, indexXys, xMid - wLine / 2, xMid + wLine / 2, yMid + hLine / 2, 1);
                        }
                        // draw lines
                        program.use(gl);
                        xysBuffer.setData(xys.subarray(0, indexXys));
                        a_Position.setDataAndEnable(gl, xysBuffer, 2, Webglimpse.GL.FLOAT);
                        u_Color.setData(gl, lineColor);
                        gl.drawArrays(Webglimpse.GL.TRIANGLES, 0, Math.floor(indexXys / 2));
                        a_Position.disable(gl);
                        program.endUse(gl);
                    }
                }
            };
        };
    }
    Webglimpse.newTimeseriesCursorPainterFactory = newTimeseriesCursorPainterFactory;
})(Webglimpse || (Webglimpse = {}));

var Webglimpse;

(function(Webglimpse) {
    function newTimeseriesAnnotationPainterFactory() {
        // Painter Factory
        return function(drawable, timeAxis, dataAxis, model, rowModel, ui) {
            var textTextures = Webglimpse.newTextTextureCache3();
            var textureRenderer = new Webglimpse.TextureRenderer();
            var program = new Webglimpse.Program(Webglimpse.xyFrac_VERTSHADER, Webglimpse.solid_FRAGSHADER);
            var u_Color = new Webglimpse.UniformColor(program, "u_Color");
            var a_Position = new Webglimpse.Attribute(program, "a_XyFrac");
            var xys = new Float32Array(0);
            xys = Webglimpse.ensureCapacityFloat32(xys, 4);
            var xysBuffer = Webglimpse.newDynamicBuffer();
            // Painter
            return function(gl, viewport) {
                gl.blendFuncSeparate(Webglimpse.GL.SRC_ALPHA, Webglimpse.GL.ONE_MINUS_SRC_ALPHA, Webglimpse.GL.ONE, Webglimpse.GL.ONE_MINUS_SRC_ALPHA);
                gl.enable(Webglimpse.GL.BLEND);
                textTextures.resetTouches();
                for (var i = 0; i < rowModel.annotationGuids.length; i++) {
                    var annotationGuid = rowModel.annotationGuids.valueAt(i);
                    var annotation = model.annotation(annotationGuid);
                    var annotationStyle = ui.annotationStyle(annotation.styleGuid);
                    var font = Webglimpse.hasval(annotationStyle.font) ? annotationStyle.font : "11px verdana,sans-serif";
                    var color = Webglimpse.hasval(annotationStyle.color) ? annotationStyle.color : Webglimpse.white;
                    var hTextOffset = Webglimpse.hasval(annotationStyle.hTextOffset) ? annotationStyle.hTextOffset : 0;
                    var vTextOffset = Webglimpse.hasval(annotationStyle.vTextOffset) ? annotationStyle.vTextOffset : 0;
                    // draw line
                    if (annotationStyle.uiHint === "horizontal-line" || annotationStyle.uiHint === "vertical-line") {
                        if (annotationStyle.uiHint === "horizontal-line") {
                            var xFrac = Webglimpse.hasval(annotationStyle.align) ? annotationStyle.align : 1;
                            var yFrac = dataAxis.vFrac(annotation.y);
                            xys[0] = 0;
                            xys[1] = yFrac;
                            xys[2] = 1;
                            xys[3] = yFrac;
                        } else if (annotationStyle.uiHint === "vertical-line") {
                            var xFrac = timeAxis.tFrac(annotation.time_PMILLIS);
                            var yFrac = Webglimpse.hasval(annotationStyle.align) ? annotationStyle.align : 1;
                            xys[0] = xFrac;
                            xys[1] = 0;
                            xys[2] = xFrac;
                            xys[3] = 1;
                        }
                        program.use(gl);
                        u_Color.setData(gl, color);
                        xysBuffer.setData(xys.subarray(0, 4));
                        a_Position.setDataAndEnable(gl, xysBuffer, 2, Webglimpse.GL.FLOAT);
                        gl.drawArrays(Webglimpse.GL.LINES, 0, 2);
                        program.endUse(gl);
                    } else {
                        var xFrac = timeAxis.tFrac(annotation.time_PMILLIS);
                        var yFrac = dataAxis.vFrac(annotation.y);
                    }
                    textureRenderer.begin(gl, viewport);
                    for (var n = 0; n < annotationStyle.numIcons; n++) {
                        var icon = annotationStyle.icon(n);
                        var xFracOffset = xFrac + (Webglimpse.hasval(icon.hOffset) ? icon.hOffset : 0) / viewport.w;
                        var yFracOffset = yFrac + (Webglimpse.hasval(icon.vOffset) ? icon.vOffset : 0) / viewport.h;
                        var iconTexture = ui.loadImage(icon.url, function() {
                            drawable.redraw();
                        });
                        if (iconTexture) {
                            var options = {
                                xAnchor: Webglimpse.hasval(icon.hAlign) ? icon.hAlign : .5,
                                yAnchor: Webglimpse.hasval(icon.hAlign) ? icon.hAlign : .5,
                                width: icon.displayWidth,
                                height: icon.displayHeight,
                                rotation_CCWRAD: 0
                            };
                            textureRenderer.draw(gl, iconTexture, xFracOffset, yFracOffset, options);
                        }
                    }
                    // draw text label
                    if (Webglimpse.hasval(annotation.label)) {
                        var textTexture = textTextures.value(font, color.rgbaString, annotation.label);
                        var xFracOffset = xFrac + hTextOffset / viewport.w;
                        var yFracOffset = yFrac + vTextOffset / viewport.h;
                        var xAnchor = Webglimpse.hasval(annotationStyle.hTextAlign) ? annotationStyle.hTextAlign : 0;
                        var yAnchor = textTexture.yAnchor(Webglimpse.hasval(annotationStyle.vTextAlign) ? annotationStyle.vTextAlign : .5);
                        textureRenderer.draw(gl, textTexture, xFracOffset, yFracOffset, {
                            xAnchor: xAnchor,
                            yAnchor: yAnchor
                        });
                    }
                    textureRenderer.end(gl);
                }
                textTextures.retainTouched();
            };
        };
    }
    Webglimpse.newTimeseriesAnnotationPainterFactory = newTimeseriesAnnotationPainterFactory;
})(Webglimpse || (Webglimpse = {}));

var Webglimpse;

(function(Webglimpse) {
    var TimelineAnnotationIconUi = function() {
        function TimelineAnnotationIconUi(icon) {
            this._setAttrs(icon);
        }
        TimelineAnnotationIconUi.prototype._setAttrs = function(icon) {
            this._url = icon.url;
            this._displayWidth = icon.displayWidth;
            this._displayHeight = icon.displayHeight;
            this._hAlign = icon.hAlign;
            this._vAlign = icon.vAlign;
            this._hOffset = icon.hOffset;
            this._vOffset = icon.vOffset;
        };
        Object.defineProperty(TimelineAnnotationIconUi.prototype, "url", {
            get: function() {
                return this._url;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineAnnotationIconUi.prototype, "displayWidth", {
            get: function() {
                return this._displayWidth;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineAnnotationIconUi.prototype, "displayHeight", {
            get: function() {
                return this._displayHeight;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineAnnotationIconUi.prototype, "hAlign", {
            get: function() {
                return this._hAlign;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineAnnotationIconUi.prototype, "vAlign", {
            get: function() {
                return this._vAlign;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineAnnotationIconUi.prototype, "hOffset", {
            get: function() {
                return this._hOffset;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineAnnotationIconUi.prototype, "vOffset", {
            get: function() {
                return this._vOffset;
            },
            enumerable: true,
            configurable: true
        });
        TimelineAnnotationIconUi.prototype.snapshot = function() {
            return {
                url: this._url,
                displayWidth: this._displayWidth,
                displayHeight: this._displayHeight,
                hAlign: this._hAlign,
                vAlign: this._vAlign,
                hOffset: this._hOffset,
                vOffset: this._vOffset
            };
        };
        return TimelineAnnotationIconUi;
    }();
    Webglimpse.TimelineAnnotationIconUi = TimelineAnnotationIconUi;
    var TimelineAnnotationStyleUi = function() {
        function TimelineAnnotationStyleUi(style) {
            this._styleGuid = style.styleGuid;
            this._setAttrs(style);
        }
        Object.defineProperty(TimelineAnnotationStyleUi.prototype, "styleGuid", {
            get: function() {
                return this._styleGuid;
            },
            enumerable: true,
            configurable: true
        });
        TimelineAnnotationStyleUi.prototype._setAttrs = function(style) {
            this._color = Webglimpse.hasval(style.color) ? Webglimpse.parseCssColor(style.color) : undefined;
            this._font = style.font;
            this._hTextOffset = style.hTextOffset;
            this._vTextOffset = style.vTextOffset;
            this._hTextAlign = style.hTextAlign;
            this._vTextAlign = style.vTextAlign;
            this._align = style.align;
            this._uiHint = style.uiHint;
            this._icons = Webglimpse.hasval(style.color) ? style.icons.map(function(icon) {
                return new TimelineAnnotationIconUi(icon);
            }) : [];
        };
        Object.defineProperty(TimelineAnnotationStyleUi.prototype, "numIcons", {
            get: function() {
                return this._icons.length;
            },
            enumerable: true,
            configurable: true
        });
        TimelineAnnotationStyleUi.prototype.icon = function(index) {
            return this._icons[index];
        };
        Object.defineProperty(TimelineAnnotationStyleUi.prototype, "color", {
            get: function() {
                return this._color;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineAnnotationStyleUi.prototype, "font", {
            get: function() {
                return this._font;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineAnnotationStyleUi.prototype, "hTextOffset", {
            get: function() {
                return this._hTextOffset;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineAnnotationStyleUi.prototype, "vTextOffset", {
            get: function() {
                return this._vTextOffset;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineAnnotationStyleUi.prototype, "hTextAlign", {
            get: function() {
                return this._hTextAlign;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineAnnotationStyleUi.prototype, "vTextAlign", {
            get: function() {
                return this._vTextAlign;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineAnnotationStyleUi.prototype, "align", {
            get: function() {
                return this._align;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineAnnotationStyleUi.prototype, "uiHint", {
            get: function() {
                return this._uiHint;
            },
            enumerable: true,
            configurable: true
        });
        TimelineAnnotationStyleUi.prototype.snapshot = function() {
            return {
                styleGuid: this._styleGuid,
                color: this._color.cssString,
                font: this._font,
                vTextOffset: this._hTextOffset,
                hTextOffset: this._vTextOffset,
                vTextAlign: this._hTextAlign,
                hTextAlign: this._vTextAlign,
                align: this._align,
                uiHint: this._uiHint,
                icons: this._icons.map(function(ui) {
                    return ui.snapshot();
                })
            };
        };
        return TimelineAnnotationStyleUi;
    }();
    Webglimpse.TimelineAnnotationStyleUi = TimelineAnnotationStyleUi;
})(Webglimpse || (Webglimpse = {}));

var Webglimpse;

(function(Webglimpse) {
    var TimelineEventIconUi = function() {
        function TimelineEventIconUi(icon) {
            this._setAttrs(icon);
        }
        TimelineEventIconUi.prototype._setAttrs = function(icon) {
            this._url = icon.url;
            this._displayWidth = icon.displayWidth;
            this._displayHeight = icon.displayHeight;
            this._hAlign = icon.hAlign;
            this._hPos = icon.hPos;
        };
        Object.defineProperty(TimelineEventIconUi.prototype, "url", {
            get: function() {
                return this._url;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineEventIconUi.prototype, "displayWidth", {
            get: function() {
                return this._displayWidth;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineEventIconUi.prototype, "displayHeight", {
            get: function() {
                return this._displayHeight;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineEventIconUi.prototype, "hAlign", {
            get: function() {
                return this._hAlign;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineEventIconUi.prototype, "hPos", {
            get: function() {
                return this._hPos;
            },
            enumerable: true,
            configurable: true
        });
        TimelineEventIconUi.prototype.snapshot = function() {
            return {
                url: this._url,
                displayWidth: this._displayWidth,
                displayHeight: this._displayHeight,
                hAlign: this._hAlign,
                hPos: this._hPos
            };
        };
        return TimelineEventIconUi;
    }();
    Webglimpse.TimelineEventIconUi = TimelineEventIconUi;
    var TimelineEventStyleUi = function() {
        function TimelineEventStyleUi(style) {
            this._styleGuid = style.styleGuid;
            this._setAttrs(style);
        }
        Object.defineProperty(TimelineEventStyleUi.prototype, "styleGuid", {
            get: function() {
                return this._styleGuid;
            },
            enumerable: true,
            configurable: true
        });
        TimelineEventStyleUi.prototype._setAttrs = function(style) {
            this._icons = style.icons.map(function(icon) {
                return new TimelineEventIconUi(icon);
            });
        };
        Object.defineProperty(TimelineEventStyleUi.prototype, "numIcons", {
            get: function() {
                return this._icons.length;
            },
            enumerable: true,
            configurable: true
        });
        TimelineEventStyleUi.prototype.icon = function(index) {
            return this._icons[index];
        };
        TimelineEventStyleUi.prototype.snapshot = function() {
            return {
                styleGuid: this._styleGuid,
                icons: this._icons.map(function(ui) {
                    return ui.snapshot();
                })
            };
        };
        return TimelineEventStyleUi;
    }();
    Webglimpse.TimelineEventStyleUi = TimelineEventStyleUi;
})(Webglimpse || (Webglimpse = {}));

var Webglimpse;

(function(Webglimpse) {
    var TimelineUi = function() {
        function TimelineUi(model, options) {
            if (typeof options === "undefined") {
                options = {};
            }
            this._dispose = new Webglimpse.Notification();
            this._input = new TimelineInput();
            var getPaneId = function(pane) {
                var paneId = pane["webglimpse_PaneId"];
                return Webglimpse.hasval(paneId) ? paneId : Webglimpse.getObjectId(pane);
            };
            this._panes = new Webglimpse.OrderedSet([], getPaneId);
            this._selection = new TimelineSelectionModel();
            attachTimelineInputToSelection(this._input, this._selection, options);
            this._groupUis = new Webglimpse.OrderedSet([], function(g) {
                return g.groupGuid;
            });
            var groupUis = this._groupUis;
            var addGroupUi = function(group) {
                groupUis.add(new TimelineGroupUi(group.groupGuid));
            };
            var removeGroupUi = function(group) {
                groupUis.removeId(group.groupGuid);
            };
            model.groups.forEach(addGroupUi);
            model.groups.valueAdded.on(addGroupUi);
            model.groups.valueRemoved.on(removeGroupUi);
            this._rowUis = new Webglimpse.OrderedSet([], function(r) {
                return r.rowGuid;
            });
            var rowUis = this._rowUis;
            var addRowUi = function(row) {
                rowUis.add(new TimelineRowUi(row.rowGuid));
            };
            var removeRowUi = function(row) {
                rowUis.removeId(row.rowGuid);
            };
            model.rows.forEach(addRowUi);
            model.rows.valueAdded.on(addRowUi);
            model.rows.valueRemoved.on(removeRowUi);
            this._eventStyles = new Webglimpse.OrderedSet([], function(s) {
                return s.styleGuid;
            });
            this._annotationStyles = new Webglimpse.OrderedSet([], function(s) {
                return s.styleGuid;
            });
            this._millisPerPx = new Webglimpse.SimpleModel(1e3);
            this._imageStatus = {};
            this._imageCache = {};
            this._dispose.on(function() {
                model.groups.valueAdded.off(addGroupUi);
                model.groups.valueRemoved.off(removeGroupUi);
                model.rows.valueAdded.off(addRowUi);
                model.rows.valueRemoved.off(removeRowUi);
            });
        }
        Object.defineProperty(TimelineUi.prototype, "input", {
            get: function() {
                return this._input;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineUi.prototype, "selection", {
            get: function() {
                return this._selection;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineUi.prototype, "groupUis", {
            get: function() {
                return this._groupUis;
            },
            enumerable: true,
            configurable: true
        });
        TimelineUi.prototype.groupUi = function(groupGuid) {
            return this._groupUis.valueFor(groupGuid);
        };
        Object.defineProperty(TimelineUi.prototype, "rowUis", {
            get: function() {
                return this._rowUis;
            },
            enumerable: true,
            configurable: true
        });
        TimelineUi.prototype.rowUi = function(rowGuid) {
            return this._rowUis.valueFor(rowGuid);
        };
        Object.defineProperty(TimelineUi.prototype, "eventStyles", {
            get: function() {
                return this._eventStyles;
            },
            enumerable: true,
            configurable: true
        });
        TimelineUi.prototype.eventStyle = function(styleGuid) {
            return Webglimpse.hasval(styleGuid) && this._eventStyles.valueFor(styleGuid) || timelineEventStyle_DEFAULT;
        };
        Object.defineProperty(TimelineUi.prototype, "annotationStyles", {
            get: function() {
                return this._annotationStyles;
            },
            enumerable: true,
            configurable: true
        });
        TimelineUi.prototype.annotationStyle = function(styleGuid) {
            return Webglimpse.hasval(styleGuid) && this._annotationStyles.valueFor(styleGuid) || timelineAnnotationStyle_DEFAULT;
        };
        Object.defineProperty(TimelineUi.prototype, "millisPerPx", {
            get: function() {
                return this._millisPerPx;
            },
            enumerable: true,
            configurable: true
        });
        TimelineUi.prototype.loadImage = function(url, onLoaded) {
            if (!Webglimpse.hasval(this._imageStatus[url])) {
                this._imageStatus[url] = true;
                var imageCache = this._imageCache;
                var image = new Image();
                image.onload = function() {
                    var w = image.naturalWidth;
                    var h = image.naturalHeight;
                    imageCache[url] = new Webglimpse.Texture2D(w, h, Webglimpse.GL.LINEAR, Webglimpse.GL.LINEAR, function(g) {
                        g.drawImage(image, 0, 0);
                    });
                    if (onLoaded) onLoaded();
                };
                image.src = url;
            }
            return this._imageCache[url];
        };
        Object.defineProperty(TimelineUi.prototype, "panes", {
            get: function() {
                return this._panes;
            },
            enumerable: true,
            configurable: true
        });
        TimelineUi.prototype.addPane = function(paneId, pane) {
            pane["webglimpse_PaneId"] = paneId;
            this._panes.removeId(paneId);
            this._panes.add(pane);
        };
        TimelineUi.prototype.removePane = function(paneId) {
            this._panes.removeId(paneId);
        };
        TimelineUi.prototype.getPane = function(paneId) {
            return this._panes.valueFor(paneId);
        };
        Object.defineProperty(TimelineUi.prototype, "dispose", {
            get: function() {
                return this._dispose;
            },
            enumerable: true,
            configurable: true
        });
        return TimelineUi;
    }();
    Webglimpse.TimelineUi = TimelineUi;
    var TimelineGroupUi = function() {
        function TimelineGroupUi(groupGuid) {
            this._groupGuid = groupGuid;
        }
        Object.defineProperty(TimelineGroupUi.prototype, "groupGuid", {
            get: function() {
                return this._groupGuid;
            },
            enumerable: true,
            configurable: true
        });
        return TimelineGroupUi;
    }();
    Webglimpse.TimelineGroupUi = TimelineGroupUi;
    var TimelineRowUi = function() {
        function TimelineRowUi(rowGuid) {
            this._rowGuid = rowGuid;
            this._paneFactoryChanged = new Webglimpse.Notification();
            this._paneFactory = null;
            var getPaneId = function(pane) {
                var paneId = pane["webglimpse_PaneId"];
                return Webglimpse.hasval(paneId) ? paneId : Webglimpse.getObjectId(pane);
            };
            this._panes = new Webglimpse.OrderedSet([], getPaneId);
        }
        Object.defineProperty(TimelineRowUi.prototype, "rowGuid", {
            get: function() {
                return this._rowGuid;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineRowUi.prototype, "paneFactoryChanged", {
            get: function() {
                return this._paneFactoryChanged;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineRowUi.prototype, "paneFactory", {
            get: function() {
                return this._paneFactory;
            },
            set: function(paneFactory) {
                if (paneFactory !== this._paneFactory) {
                    this._paneFactory = paneFactory;
                    this._paneFactoryChanged.fire();
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineRowUi.prototype, "panes", {
            get: function() {
                return this._panes;
            },
            enumerable: true,
            configurable: true
        });
        TimelineRowUi.prototype.addPane = function(paneId, pane) {
            pane["webglimpse_PaneId"] = paneId;
            this._panes.removeId(paneId);
            this._panes.add(pane);
        };
        TimelineRowUi.prototype.removePane = function(paneId) {
            this._panes.removeId(paneId);
        };
        TimelineRowUi.prototype.getPane = function(paneId) {
            return this._panes.valueFor(paneId);
        };
        return TimelineRowUi;
    }();
    Webglimpse.TimelineRowUi = TimelineRowUi;
    var timelineAnnotationStyle_DEFAULT = new Webglimpse.TimelineAnnotationStyleUi({
        styleGuid: "DEFAULT",
        color: "white",
        icons: []
    });
    var timelineEventStyle_DEFAULT = new Webglimpse.TimelineEventStyleUi({
        styleGuid: "DEFAULT",
        icons: []
    });
    var TimelineInput = function() {
        function TimelineInput() {
            this._mouseMove = new Webglimpse.Notification1();
            this._mouseExit = new Webglimpse.Notification1();
            this._timeHover = new Webglimpse.Notification2();
            this._rowHover = new Webglimpse.Notification2();
            this._eventHover = new Webglimpse.Notification2();
            this._mouseDown = new Webglimpse.Notification1();
            this._mouseUp = new Webglimpse.Notification1();
            this._contextMenu = new Webglimpse.Notification1();
        }
        Object.defineProperty(TimelineInput.prototype, "mouseMove", {
            get: function() {
                return this._mouseMove;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineInput.prototype, "mouseExit", {
            get: function() {
                return this._mouseExit;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineInput.prototype, "timeHover", {
            get: function() {
                return this._timeHover;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineInput.prototype, "rowHover", {
            get: function() {
                return this._rowHover;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineInput.prototype, "eventHover", {
            get: function() {
                return this._eventHover;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineInput.prototype, "mouseDown", {
            get: function() {
                return this._mouseDown;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineInput.prototype, "mouseUp", {
            get: function() {
                return this._mouseUp;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineInput.prototype, "contextMenu", {
            get: function() {
                return this._contextMenu;
            },
            enumerable: true,
            configurable: true
        });
        return TimelineInput;
    }();
    Webglimpse.TimelineInput = TimelineInput;
    var TimelineSelectionModel = function() {
        function TimelineSelectionModel() {
            this._mousePos = new Webglimpse.XyModel();
            this._hoveredY = new Webglimpse.SimpleModel();
            this._hoveredTime_PMILLIS = new Webglimpse.SimpleModel();
            this._selectedInterval = new TimeIntervalModel(0, 0);
            this._hoveredRow = new Webglimpse.SimpleModel();
            this._hoveredEvent = new Webglimpse.SimpleModel();
            this._selectedEvents = new Webglimpse.OrderedSet([], function(e) {
                return e.eventGuid;
            });
            this._hoveredTimeseries = new TimelineTimeseriesFragmentSelectionModel();
            this._hoveredAnnotation = new Webglimpse.SimpleModel();
        }
        Object.defineProperty(TimelineSelectionModel.prototype, "mousePos", {
            get: function() {
                return this._mousePos;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineSelectionModel.prototype, "hoveredY", {
            get: function() {
                return this._hoveredY;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineSelectionModel.prototype, "hoveredTime_PMILLIS", {
            get: function() {
                return this._hoveredTime_PMILLIS;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineSelectionModel.prototype, "selectedInterval", {
            get: function() {
                return this._selectedInterval;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineSelectionModel.prototype, "hoveredRow", {
            get: function() {
                return this._hoveredRow;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineSelectionModel.prototype, "hoveredEvent", {
            get: function() {
                return this._hoveredEvent;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineSelectionModel.prototype, "selectedEvents", {
            get: function() {
                return this._selectedEvents;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineSelectionModel.prototype, "hoveredTimeseries", {
            get: function() {
                return this._hoveredTimeseries;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineSelectionModel.prototype, "hoveredAnnotation", {
            get: function() {
                return this._hoveredAnnotation;
            },
            enumerable: true,
            configurable: true
        });
        return TimelineSelectionModel;
    }();
    Webglimpse.TimelineSelectionModel = TimelineSelectionModel;
    var TimelineTimeseriesFragmentSelectionModel = function() {
        function TimelineTimeseriesFragmentSelectionModel(fragment, index) {
            if (typeof fragment === "undefined") {
                fragment = null;
            }
            if (typeof index === "undefined") {
                index = -1;
            }
            this._fragment = fragment;
            this._index = index;
            this._changed = new Webglimpse.Notification();
        }
        TimelineTimeseriesFragmentSelectionModel.prototype.setValue = function(fragment, index) {
            if (fragment !== this._fragment || index !== this._index) {
                this._fragment = fragment;
                this._index = index;
                this._changed.fire();
            }
        };
        TimelineTimeseriesFragmentSelectionModel.prototype.clearValue = function() {
            this.setValue(null, -1);
        };
        Object.defineProperty(TimelineTimeseriesFragmentSelectionModel.prototype, "fragment", {
            get: function() {
                return this._fragment;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineTimeseriesFragmentSelectionModel.prototype, "index", {
            get: function() {
                return this._index;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineTimeseriesFragmentSelectionModel.prototype, "changed", {
            get: function() {
                return this._changed;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineTimeseriesFragmentSelectionModel.prototype, "times_PMILLIS", {
            get: function() {
                if (this._fragment) {
                    return this._fragment.times_PMILLIS[this._index];
                } else {
                    return undefined;
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelineTimeseriesFragmentSelectionModel.prototype, "data", {
            get: function() {
                if (this._fragment) {
                    return this._fragment.data[this._index];
                } else {
                    return undefined;
                }
            },
            enumerable: true,
            configurable: true
        });
        return TimelineTimeseriesFragmentSelectionModel;
    }();
    Webglimpse.TimelineTimeseriesFragmentSelectionModel = TimelineTimeseriesFragmentSelectionModel;
    var TimeIntervalModel = function() {
        function TimeIntervalModel(start_PMILLIS, end_PMILLIS, cursor_PMILLIS) {
            this._start_PMILLIS = start_PMILLIS;
            this._end_PMILLIS = end_PMILLIS;
            this._cursor_PMILLIS = cursor_PMILLIS ? cursor_PMILLIS : end_PMILLIS;
            this._changed = new Webglimpse.Notification();
        }
        Object.defineProperty(TimeIntervalModel.prototype, "start_PMILLIS", {
            get: function() {
                return this._start_PMILLIS;
            },
            set: function(start_PMILLIS) {
                if (start_PMILLIS !== this._start_PMILLIS) {
                    this._start_PMILLIS = start_PMILLIS;
                    this._changed.fire();
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimeIntervalModel.prototype, "end_PMILLIS", {
            get: function() {
                return this._end_PMILLIS;
            },
            set: function(end_PMILLIS) {
                if (end_PMILLIS !== this._end_PMILLIS) {
                    this._end_PMILLIS = end_PMILLIS;
                    this._changed.fire();
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimeIntervalModel.prototype, "cursor_PMILLIS", {
            get: function() {
                return this._cursor_PMILLIS;
            },
            set: function(cursor_PMILLIS) {
                if (cursor_PMILLIS !== this._cursor_PMILLIS) {
                    this._cursor_PMILLIS = cursor_PMILLIS;
                    this._changed.fire();
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimeIntervalModel.prototype, "duration_MILLIS", {
            get: function() {
                return this._end_PMILLIS - this._start_PMILLIS;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimeIntervalModel.prototype, "changed", {
            get: function() {
                return this._changed;
            },
            enumerable: true,
            configurable: true
        });
        TimeIntervalModel.prototype.setInterval = function(start_PMILLIS, end_PMILLIS, cursor_PMILLIS) {
            if (start_PMILLIS !== this._start_PMILLIS || end_PMILLIS !== this._end_PMILLIS || cursor_PMILLIS && cursor_PMILLIS != this._cursor_PMILLIS) {
                this._start_PMILLIS = start_PMILLIS;
                this._end_PMILLIS = end_PMILLIS;
                this._cursor_PMILLIS = cursor_PMILLIS ? cursor_PMILLIS : end_PMILLIS;
                this._changed.fire();
            }
        };
        TimeIntervalModel.prototype.overlaps = function(start_PMILLIS, end_PMILLIS) {
            return this._start_PMILLIS <= end_PMILLIS && start_PMILLIS <= this._end_PMILLIS;
        };
        TimeIntervalModel.prototype.contains = function(time_PMILLIS) {
            return this._start_PMILLIS <= time_PMILLIS && time_PMILLIS <= this._end_PMILLIS;
        };
        TimeIntervalModel.prototype.pan = function(amount_MILLIS) {
            if (amount_MILLIS !== 0) {
                this._start_PMILLIS += amount_MILLIS;
                this._end_PMILLIS += amount_MILLIS;
                this._cursor_PMILLIS += amount_MILLIS;
                this._changed.fire();
            }
        };
        TimeIntervalModel.prototype.scale = function(factor, anchor_PMILLIS) {
            if (anchor_PMILLIS !== 1) {
                this._start_PMILLIS = anchor_PMILLIS + factor * (this._start_PMILLIS - anchor_PMILLIS);
                this._end_PMILLIS = anchor_PMILLIS + factor * (this._end_PMILLIS - anchor_PMILLIS);
                this._cursor_PMILLIS = anchor_PMILLIS + factor * (this._cursor_PMILLIS - anchor_PMILLIS);
                this._changed.fire();
            }
        };
        return TimeIntervalModel;
    }();
    Webglimpse.TimeIntervalModel = TimeIntervalModel;
    function attachTimelineInputToSelection(input, selection, options) {
        var allowEventMultiSelection = Webglimpse.hasval(options) && Webglimpse.hasval(options.allowEventMultiSelection) ? options.allowEventMultiSelection : true;
        // Mouse-pos & Time
        //
        input.mouseMove.on(function(ev) {
            selection.mousePos.setXy(ev.i, ev.j);
        });
        input.mouseExit.on(function(ev) {
            selection.mousePos.setXy(null, null);
        });
        input.rowHover.on(function(row, ev) {
            selection.hoveredRow.value = row;
        });
        input.timeHover.on(function(time_PMILLIS, ev) {
            selection.hoveredTime_PMILLIS.value = time_PMILLIS;
        });
        // Events
        //
        input.eventHover.on(function(event) {
            selection.hoveredEvent.value = event;
        });
        if (options.allowEventMultiSelection) {
            input.mouseDown.on(function(ev) {
                if (Webglimpse.isLeftMouseDown(ev.mouseEvent)) {
                    var event = selection.hoveredEvent.value;
                    if (Webglimpse.hasval(event)) {
                        var multiSelectMode = ev.mouseEvent && (ev.mouseEvent.ctrlKey || ev.mouseEvent.shiftKey);
                        var unselectedEventClicked = !selection.selectedEvents.hasValue(event);
                        if (multiSelectMode) {
                            if (selection.selectedEvents.hasValue(event)) {
                                selection.selectedEvents.removeValue(event);
                            } else {
                                selection.selectedEvents.add(event);
                            }
                        } else if (unselectedEventClicked) {
                            selection.selectedEvents.retainValues([ event ]);
                            selection.selectedEvents.add(event);
                        } else {}
                    }
                }
            });
        } else {
            input.mouseDown.on(function(ev) {
                if (Webglimpse.isLeftMouseDown(ev.mouseEvent)) {
                    var event = selection.hoveredEvent.value;
                    if (Webglimpse.hasval(event)) {
                        selection.selectedEvents.retainValues([ event ]);
                        selection.selectedEvents.add(event);
                    }
                }
            });
        }
    }
})(Webglimpse || (Webglimpse = {}));

var Webglimpse;

(function(Webglimpse) {
    var TimelineLaneArray = function() {
        function TimelineLaneArray(model, row, ui, allowMultipleLanes) {
            this._model = model;
            this._row = row;
            this._ui = ui;
            this._lanes = [];
            this._laneNums = {};
            this._eventAttrsListeners = {};
            var self = this;
            function findAvailableLaneNum(event, startLaneNum, endLaneNum) {
                for (var n = startLaneNum; n < endLaneNum; n++) {
                    if (self._lanes[n].couldFitEvent(event)) {
                        return n;
                    }
                }
                return null;
            }
            function firstAvailableLaneNum(event) {
                var laneNum = findAvailableLaneNum(event, 0, self._lanes.length);
                return Webglimpse.hasval(laneNum) ? laneNum : self._lanes.length;
            }
            function addEventToLane(event, laneNum) {
                if (!self._lanes[laneNum]) {
                    self._lanes[laneNum] = allowMultipleLanes ? new TimelineLaneStack(ui) : new TimelineLaneSimple(ui);
                }
                self._lanes[laneNum].add(event);
                self._laneNums[event.eventGuid] = laneNum;
            }
            function fillVacancy(vacancyLaneNum, vacancyEdges_PMILLIS) {
                var vacancyLane = self._lanes[vacancyLaneNum];
                for (var n = vacancyLaneNum + 1; n < self._lanes.length; n++) {
                    var lane = self._lanes[n];
                    var possibleTenants = lane.collisionsWithInterval(vacancyEdges_PMILLIS[0], vacancyEdges_PMILLIS[1]);
                    for (var p = 0; p < possibleTenants.length; p++) {
                        var event = possibleTenants[p];
                        if (vacancyLane.couldFitEvent(event)) {
                            lane.remove(event);
                            addEventToLane(event, vacancyLaneNum);
                            fillVacancy(n, effectiveEdges_PMILLIS(ui, event));
                        }
                    }
                }
            }
            function trimEmptyLanes() {
                for (var n = self._lanes.length - 1; n >= 0; n--) {
                    if (self._lanes[n].isEmpty()) {
                        self._lanes.splice(n, 1);
                    } else {
                        break;
                    }
                }
            }
            // adds event to lane, may be called multiple times
            this._addEvent = function(eventGuid) {
                if (Webglimpse.hasval(self._laneNums[eventGuid])) {
                    throw new Error("Lanes-array already contains this event: row-guid = " + row.rowGuid + ", lane = " + self._laneNums[eventGuid] + ", event-guid = " + eventGuid);
                }
                var event = model.event(eventGuid);
                var laneNum = firstAvailableLaneNum(event);
                addEventToLane(event, laneNum);
            };
            row.eventGuids.forEach(this._addEvent);
            row.eventGuids.valueAdded.on(this._addEvent);
            // attaches listeners to event, should be called only once
            // when an event is first added to the row model
            this._newEvent = function(eventGuid) {
                var event = model.event(eventGuid);
                var oldEdges_PMILLIS = effectiveEdges_PMILLIS(ui, event);
                var updateLaneAssignment = function() {
                    var newEdges_PMILLIS = effectiveEdges_PMILLIS(ui, event);
                    if (newEdges_PMILLIS[0] !== oldEdges_PMILLIS[0] || newEdges_PMILLIS[1] !== oldEdges_PMILLIS[1]) {
                        var oldLaneNum = self._laneNums[event.eventGuid];
                        var oldLane = self._lanes[oldLaneNum];
                        var betterLaneNum = findAvailableLaneNum(event, 0, oldLaneNum);
                        if (Webglimpse.hasval(betterLaneNum)) {
                            // Move to a better lane
                            oldLane.remove(event);
                            addEventToLane(event, betterLaneNum);
                        } else if (oldLane.eventStillFits(event)) {
                            // Stay in the current lane
                            oldLane.update(event);
                        } else {
                            // Take whatever lane we can get
                            var newLaneNum = findAvailableLaneNum(event, oldLaneNum + 1, self._lanes.length);
                            if (!Webglimpse.hasval(newLaneNum)) newLaneNum = self._lanes.length;
                            oldLane.remove(event);
                            addEventToLane(event, newLaneNum);
                        }
                        fillVacancy(oldLaneNum, oldEdges_PMILLIS);
                        trimEmptyLanes();
                        oldEdges_PMILLIS = newEdges_PMILLIS;
                    }
                };
                event.attrsChanged.on(updateLaneAssignment);
                self._eventAttrsListeners[eventGuid] = updateLaneAssignment;
            };
            row.eventGuids.forEach(this._newEvent);
            row.eventGuids.valueAdded.on(this._newEvent);
            this._removeEvent = function(eventGuid) {
                var event = model.event(eventGuid);
                var oldLaneNum = self._laneNums[eventGuid];
                delete self._laneNums[eventGuid];
                self._lanes[oldLaneNum].remove(event);
                fillVacancy(oldLaneNum, effectiveEdges_PMILLIS(ui, event));
                trimEmptyLanes();
                event.attrsChanged.off(self._eventAttrsListeners[eventGuid]);
                delete self._eventAttrsListeners[eventGuid];
            };
            row.eventGuids.valueRemoved.on(this._removeEvent);
            self._rebuildLanes = function() {
                var oldLanes = self._lanes;
                self._lanes = [];
                self._laneNums = {};
                for (var l = 0; l < oldLanes.length; l++) {
                    var lane = oldLanes[l];
                    for (var e = 0; e < lane.length; e++) {
                        var event = lane.event(e);
                        self._addEvent(event.eventGuid);
                    }
                }
            };
            var hasIcons = function() {
                var oldLanes = self._lanes;
                for (var l = 0; l < oldLanes.length; l++) {
                    var lane = oldLanes[l];
                    for (var e = 0; e < lane.length; e++) {
                        var event = lane.event(e);
                        var style = ui.eventStyle(event.styleGuid);
                        if (event.labelIcon || style.numIcons > 0) return true;
                    }
                }
                return false;
            };
            self._rebuildLanesMouseWheel = function() {
                if (hasIcons()) {
                    self._rebuildLanes();
                }
            };
            ui.millisPerPx.changed.on(self._rebuildLanesMouseWheel);
            ui.eventStyles.valueAdded.on(self._rebuildLanes);
            ui.eventStyles.valueRemoved.on(self._rebuildLanes);
        }
        Object.defineProperty(TimelineLaneArray.prototype, "length", {
            get: function() {
                return this._lanes.length;
            },
            enumerable: true,
            configurable: true
        });
        TimelineLaneArray.prototype.lane = function(index) {
            return this._lanes[index];
        };
        Object.defineProperty(TimelineLaneArray.prototype, "numEvents", {
            get: function() {
                return this._row.eventGuids.length;
            },
            enumerable: true,
            configurable: true
        });
        TimelineLaneArray.prototype.eventAt = function(laneNum, time_PMILLIS) {
            var lane = this._lanes[laneNum];
            return lane && lane.eventAtTime(time_PMILLIS);
        };
        TimelineLaneArray.prototype.dispose = function() {
            this._row.eventGuids.valueAdded.off(this._addEvent);
            this._row.eventGuids.valueRemoved.off(this._removeEvent);
            this._row.eventGuids.valueAdded.off(this._newEvent);
            this._ui.millisPerPx.changed.off(this._rebuildLanesMouseWheel);
            this._ui.eventStyles.valueAdded.off(this._rebuildLanes);
            this._ui.eventStyles.valueRemoved.off(this._rebuildLanes);
            for (var eventGuid in this._eventAttrsListeners) {
                if (this._eventAttrsListeners.hasOwnProperty(eventGuid)) {
                    var listener = this._eventAttrsListeners[eventGuid];
                    var event = this._model.event(eventGuid);
                    if (listener && event) event.attrsChanged.off(listener);
                }
            }
        };
        return TimelineLaneArray;
    }();
    Webglimpse.TimelineLaneArray = TimelineLaneArray;
    function effectiveEdges_PMILLIS(ui, event) {
        var start_PMILLIS = event.start_PMILLIS;
        var end_PMILLIS = event.end_PMILLIS;
        var millisPerPx = ui.millisPerPx.value;
        var eventStyle = ui.eventStyle(event.styleGuid);
        for (var n = 0; n < eventStyle.numIcons; n++) {
            var icon = eventStyle.icon(n);
            var iconTime_PMILLIS = event.start_PMILLIS + icon.hPos * (event.end_PMILLIS - event.start_PMILLIS);
            var iconStart_PMILLIS = iconTime_PMILLIS - millisPerPx * icon.hAlign * icon.displayWidth;
            var iconEnd_PMILLIS = iconTime_PMILLIS + millisPerPx * (1 - icon.hAlign) * icon.displayWidth;
            start_PMILLIS = Math.min(start_PMILLIS, iconStart_PMILLIS);
            end_PMILLIS = Math.max(end_PMILLIS, iconEnd_PMILLIS);
        }
        return [ start_PMILLIS, end_PMILLIS ];
    }
    Webglimpse.effectiveEdges_PMILLIS = effectiveEdges_PMILLIS;
    // a TimelineLane where no events start/end time overlap
    var TimelineLaneStack = function() {
        function TimelineLaneStack(ui) {
            this._events = [];
            this._starts_PMILLIS = [];
            this._ends_PMILLIS = [];
            this._indices = {};
            this._ui = ui;
        }
        Object.defineProperty(TimelineLaneStack.prototype, "length", {
            get: function() {
                return this._events.length;
            },
            enumerable: true,
            configurable: true
        });
        TimelineLaneStack.prototype.event = function(index) {
            return this._events[index];
        };
        TimelineLaneStack.prototype.isEmpty = function() {
            return this._events.length === 0;
        };
        TimelineLaneStack.prototype.eventAtTime = function(time_PMILLIS) {
            if (Webglimpse.hasval(time_PMILLIS)) {
                // Check the first event ending after time
                var iFirst = Webglimpse.indexAfter(this._ends_PMILLIS, time_PMILLIS);
                if (iFirst < this._events.length) {
                    var eventFirst = this._events[iFirst];
                    var startFirst_PMILLIS = effectiveEdges_PMILLIS(this._ui, eventFirst)[0];
                    if (time_PMILLIS >= startFirst_PMILLIS) {
                        return eventFirst;
                    }
                }
                // Check the previous event, in case we're in its icon-slop
                var iPrev = iFirst - 1;
                if (iPrev >= 0) {
                    var eventPrev = this._events[iPrev];
                    var endPrev_PMILLIS = effectiveEdges_PMILLIS(this._ui, eventPrev)[1];
                    if (time_PMILLIS < endPrev_PMILLIS) {
                        return eventPrev;
                    }
                }
            }
            return null;
        };
        TimelineLaneStack.prototype.add = function(event) {
            var eventGuid = event.eventGuid;
            if (Webglimpse.hasval(this._indices[eventGuid])) throw new Error("Lane already contains this event: event = " + formatEvent(event));
            var i = Webglimpse.indexAfter(this._starts_PMILLIS, event.start_PMILLIS);
            if (!this._eventFitsBetween(event, i - 1, i)) throw new Error("New event does not fit between existing events: new = " + formatEvent(event) + ", before = " + formatEvent(this._events[i - 1]) + ", after = " + formatEvent(this._events[i]));
            this._events.splice(i, 0, event);
            this._starts_PMILLIS.splice(i, 0, event.start_PMILLIS);
            this._ends_PMILLIS.splice(i, 0, event.end_PMILLIS);
            this._indices[eventGuid] = i;
            for (var n = i; n < this._events.length; n++) {
                this._indices[this._events[n].eventGuid] = n;
            }
        };
        TimelineLaneStack.prototype.remove = function(event) {
            var eventGuid = event.eventGuid;
            var i = this._indices[eventGuid];
            if (!Webglimpse.hasval(i)) throw new Error("Event not found in this lane: event = " + formatEvent(event));
            this._events.splice(i, 1);
            this._starts_PMILLIS.splice(i, 1);
            this._ends_PMILLIS.splice(i, 1);
            delete this._indices[eventGuid];
            for (var n = i; n < this._events.length; n++) {
                this._indices[this._events[n].eventGuid] = n;
            }
        };
        TimelineLaneStack.prototype.eventStillFits = function(event) {
            var i = this._indices[event.eventGuid];
            if (!Webglimpse.hasval(i)) throw new Error("Event not found in this lane: event = " + formatEvent(event));
            return this._eventFitsBetween(event, i - 1, i + 1);
        };
        TimelineLaneStack.prototype.update = function(event) {
            var i = this._indices[event.eventGuid];
            if (!Webglimpse.hasval(i)) throw new Error("Event not found in this lane: event = " + formatEvent(event));
            this._starts_PMILLIS[i] = event.start_PMILLIS;
            this._ends_PMILLIS[i] = event.end_PMILLIS;
        };
        TimelineLaneStack.prototype.collisionsWithInterval = function(start_PMILLIS, end_PMILLIS) {
            // Find the first event ending after start
            var iFirst = Webglimpse.indexAfter(this._ends_PMILLIS, start_PMILLIS);
            var iPrev = iFirst - 1;
            if (iPrev >= 0) {
                var endPrev_PMILLIS = effectiveEdges_PMILLIS(this._ui, this._events[iPrev])[1];
                if (start_PMILLIS < endPrev_PMILLIS) {
                    iFirst = iPrev;
                }
            }
            // Find the last event starting before end
            var iLast = Webglimpse.indexBefore(this._starts_PMILLIS, end_PMILLIS);
            var iPost = iLast + 1;
            if (iPost < this._events.length) {
                var startPost_PMILLIS = effectiveEdges_PMILLIS(this._ui, this._events[iPost])[0];
                if (end_PMILLIS > startPost_PMILLIS) {
                    iLast = iPost;
                }
            }
            // Return that section
            return this._events.slice(iFirst, iLast + 1);
        };
        TimelineLaneStack.prototype.couldFitEvent = function(event) {
            var iAfter = Webglimpse.indexAfter(this._starts_PMILLIS, event.start_PMILLIS);
            var iBefore = iAfter - 1;
            return this._eventFitsBetween(event, iBefore, iAfter);
        };
        TimelineLaneStack.prototype._eventFitsBetween = function(event, iBefore, iAfter) {
            var edges_PMILLIS = effectiveEdges_PMILLIS(this._ui, event);
            if (iBefore >= 0) {
                // Comparing one start-time (inclusive) and one end-time (exclusive), so equality means no collision
                var edgesBefore_PMILLIS = effectiveEdges_PMILLIS(this._ui, this._events[iBefore]);
                if (edges_PMILLIS[0] < edgesBefore_PMILLIS[1]) {
                    return false;
                }
            }
            if (iAfter < this._events.length) {
                // Comparing one start-time (inclusive) and one end-time (exclusive), so equality means no collision
                var edgesAfter_PMILLIS = effectiveEdges_PMILLIS(this._ui, this._events[iAfter]);
                if (edges_PMILLIS[1] > edgesAfter_PMILLIS[0]) {
                    return false;
                }
            }
            return true;
        };
        return TimelineLaneStack;
    }();
    Webglimpse.TimelineLaneStack = TimelineLaneStack;
    // a TimelineLane where events are allowed to overlap arbitrarily
    // because of this assumptions like the index for an event in the _starts_PMILLIS
    // and _ends_PMILLIS arrays being the same no longer hold
    //
    // does not make any assumptions about event overlapping and uses
    // an inefficient O(n) brute force search to find events (an interval tree
    // would be needed for efficient search in the general case)
    var TimelineLaneSimple = function() {
        function TimelineLaneSimple(ui) {
            this._events = [];
            this._orders = [];
            this._ids = {};
            this._ui = ui;
        }
        Object.defineProperty(TimelineLaneSimple.prototype, "length", {
            get: function() {
                return this._events.length;
            },
            enumerable: true,
            configurable: true
        });
        TimelineLaneSimple.prototype.event = function(index) {
            return this._events[index];
        };
        TimelineLaneSimple.prototype.isEmpty = function() {
            return this._events.length === 0;
        };
        TimelineLaneSimple.prototype.eventAtTime = function(time_PMILLIS) {
            var bestEvent;
            for (var n = this._events.length - 1; n >= 0; n--) {
                var event = this._events[n];
                var eventEdges_PMILLIS = effectiveEdges_PMILLIS(this._ui, event);
                if (time_PMILLIS > eventEdges_PMILLIS[0] && time_PMILLIS < eventEdges_PMILLIS[1] && (bestEvent === undefined || bestEvent.order < event.order)) {
                    bestEvent = event;
                }
            }
            return bestEvent;
        };
        TimelineLaneSimple.prototype.add = function(event) {
            var eventGuid = event.eventGuid;
            if (Webglimpse.hasval(this._ids[eventGuid])) throw new Error("Lane already contains this event: event = " + formatEvent(event));
            // for events with undefined order, replace with largest possible negative order so sort is correct
            var order = Webglimpse.hasval(event.order) ? event.order : Number.NEGATIVE_INFINITY;
            var i = Webglimpse.indexAtOrAfter(this._orders, order);
            this._ids[eventGuid] = eventGuid;
            this._orders.splice(i, 0, order);
            this._events.splice(i, 0, event);
        };
        TimelineLaneSimple.prototype.remove = function(event) {
            var eventGuid = event.eventGuid;
            if (!Webglimpse.hasval(this._ids[eventGuid])) throw new Error("Event not found in this lane: event = " + formatEvent(event));
            delete this._ids[eventGuid];
            var i = this._getIndex(event);
            this._orders.splice(i, 1);
            this._events.splice(i, 1);
        };
        TimelineLaneSimple.prototype.update = function(event) {
            this.remove(event);
            this.add(event);
        };
        TimelineLaneSimple.prototype.collisionsWithInterval = function(start_PMILLIS, end_PMILLIS) {
            var results = [];
            for (var n = 0; n < this._events.length; n++) {
                var event = this._events[n];
                if (!(start_PMILLIS > event.end_PMILLIS || end_PMILLIS < event.start_PMILLIS)) {
                    results.push(event);
                }
            }
            return results;
        };
        // we can always fit more events because overlaps are allowed
        TimelineLaneSimple.prototype.eventStillFits = function(event) {
            return true;
        };
        // we can always fit more events because overlaps are allowed
        TimelineLaneSimple.prototype.couldFitEvent = function(event) {
            return true;
        };
        TimelineLaneSimple.prototype._getIndex = function(queryEvent) {
            for (var n = 0; n < this._events.length; n++) {
                var event = this._events[n];
                if (queryEvent.eventGuid === event.eventGuid) {
                    return n;
                }
            }
            throw new Error("Event not found in this lane: event = " + formatEvent(queryEvent));
        };
        return TimelineLaneSimple;
    }();
    Webglimpse.TimelineLaneSimple = TimelineLaneSimple;
    function formatEvent(event) {
        if (!Webglimpse.hasval(event)) {
            return "" + event;
        } else {
            return event.label + " [ " + Webglimpse.formatTime_ISO8601(event.start_PMILLIS) + " ... " + Webglimpse.formatTime_ISO8601(event.end_PMILLIS) + " ]";
        }
    }
})(Webglimpse || (Webglimpse = {}));

var Webglimpse;

(function(Webglimpse) {
    function newEventsRowPaneFactory(eventsRowOpts) {
        // Pane Factory
        return function(drawable, timeAxis, dataAxis, model, row, ui, options) {
            var rowTopPadding = Webglimpse.hasval(eventsRowOpts) && Webglimpse.hasval(eventsRowOpts.rowTopPadding) ? eventsRowOpts.rowTopPadding : 6;
            var rowBottomPadding = Webglimpse.hasval(eventsRowOpts) && Webglimpse.hasval(eventsRowOpts.rowBottomPadding) ? eventsRowOpts.rowBottomPadding : 6;
            var laneHeight = Webglimpse.hasval(eventsRowOpts) && Webglimpse.hasval(eventsRowOpts.laneHeight) ? eventsRowOpts.laneHeight : 33;
            var painterFactories = Webglimpse.hasval(eventsRowOpts) && Webglimpse.hasval(eventsRowOpts.painterFactories) ? eventsRowOpts.painterFactories : [];
            var allowMultipleLanes = Webglimpse.hasval(eventsRowOpts) && Webglimpse.hasval(eventsRowOpts.allowMultipleLanes) ? eventsRowOpts.allowMultipleLanes : true;
            var timelineFont = options.timelineFont;
            var timelineFgColor = options.timelineFgColor;
            var draggableEdgeWidth = options.draggableEdgeWidth;
            var snapToDistance = options.snapToDistance;
            var rowUi = ui.rowUi(row.rowGuid);
            var input = ui.input;
            var selection = ui.selection;
            var lanes = new Webglimpse.TimelineLaneArray(model, row, ui, allowMultipleLanes);
            var timeAtCoords_PMILLIS = function(viewport, i) {
                return timeAxis.tAtFrac_PMILLIS(viewport.xFrac(i));
            };
            var timeAtPointer_PMILLIS = function(ev) {
                return timeAtCoords_PMILLIS(ev.paneViewport, ev.i);
            };
            var eventAtCoords = function(viewport, i, j) {
                var laneNum = Math.floor((viewport.jEnd - j - rowTopPadding) / laneHeight);
                var time_PMILLIS = timeAtCoords_PMILLIS(viewport, i);
                return lanes.eventAt(laneNum, time_PMILLIS);
            };
            var eventAtPointer = function(ev) {
                return eventAtCoords(ev.paneViewport, ev.i, ev.j);
            };
            var isInsideAnEvent = function(viewport, i, j) {
                return Webglimpse.hasval(eventAtCoords(viewport, i, j));
            };
            // Create pane
            //
            var layout = {
                updatePrefSize: function(parentPrefSize) {
                    parentPrefSize.h = rowTopPadding + rowBottomPadding + Math.max(1, lanes.length) * laneHeight;
                    parentPrefSize.w = null;
                }
            };
            var rowContentPane = new Webglimpse.Pane(layout, true, isInsideAnEvent);
            rowUi.addPane("content", rowContentPane);
            var painterOptions = {
                timelineFont: timelineFont,
                timelineFgColor: timelineFgColor,
                rowTopPadding: rowTopPadding,
                rowBottomPadding: rowBottomPadding,
                laneHeight: laneHeight
            };
            for (var n = 0; n < painterFactories.length; n++) {
                var createPainter = painterFactories[n];
                rowContentPane.addPainter(createPainter(drawable, timeAxis, lanes, ui, painterOptions));
            }
            var redraw = function() {
                drawable.redraw();
            };
            row.eventGuids.valueAdded.on(redraw);
            row.eventGuids.valueMoved.on(redraw);
            row.eventGuids.valueRemoved.on(redraw);
            var watchEventAttrs = function(eventGuid) {
                model.event(eventGuid).attrsChanged.on(redraw);
            };
            row.eventGuids.forEach(watchEventAttrs);
            row.eventGuids.valueAdded.on(watchEventAttrs);
            var removeRedraw = function(eventGuid) {
                model.event(eventGuid).attrsChanged.off(redraw);
            };
            row.eventGuids.valueRemoved.on(removeRedraw);
            // Used by both sets of listeners to know whether an event-drag is in progress
            var eventDragMode = null;
            // Hook up input notifications
            //
            var recentMouseMove = null;
            rowContentPane.mouseMove.on(function(ev) {
                input.mouseMove.fire(ev);
                if (!eventDragMode) {
                    input.timeHover.fire(timeAtPointer_PMILLIS(ev), ev);
                    input.rowHover.fire(row, ev);
                    input.eventHover.fire(eventAtPointer(ev), ev);
                }
                recentMouseMove = ev;
            });
            rowContentPane.mouseExit.on(function(ev) {
                input.mouseExit.fire(ev);
                if (!eventDragMode) {
                    input.timeHover.fire(null, ev);
                    input.rowHover.fire(null, ev);
                    input.eventHover.fire(null, ev);
                }
                recentMouseMove = null;
            });
            var uiMillisPerPxChanged = function() {
                if (!eventDragMode && recentMouseMove != null) {
                    var ev = recentMouseMove;
                    input.timeHover.fire(timeAtPointer_PMILLIS(ev), ev);
                    input.eventHover.fire(eventAtPointer(ev), ev);
                }
            };
            ui.millisPerPx.changed.on(uiMillisPerPxChanged);
            rowContentPane.mouseUp.on(function(ev) {
                input.mouseUp.fire(ev);
            });
            rowContentPane.mouseDown.on(function(ev) {
                input.mouseDown.fire(ev);
            });
            rowContentPane.mouseWheel.on(options.mouseWheelListener);
            rowContentPane.contextMenu.on(function(ev) {
                input.contextMenu.fire(ev);
            });
            // Begin event-drag
            //
            var eventDragEvents = [];
            var eventDragOffsets_MILLIS = {};
            var eventDragSnapTimes_PMILLIS = [];
            // Event-edges are draggable for events at least this wide
            var minEventWidthForEdgeDraggability = 3 * draggableEdgeWidth;
            // When dragging an event-edge, the event cannot be made narrower than this
            //
            // Needs to be greater than minEventWidthForEdgeDraggability -- by enough to
            // cover floating-point precision loss -- so a user can't accidentally make
            // an event so narrow that it can't easily be widened again.
            //
            var minEventWidthWhenDraggingEdge = minEventWidthForEdgeDraggability + 1;
            function allUserEditable(events) {
                for (var n = 0; n < events.length; n++) {
                    if (!events[n].userEditable) {
                        return false;
                    }
                }
                return true;
            }
            function chooseEventDragMode(ui, mouseTime_PMILLIS, eventDragEvents) {
                if (eventDragEvents.length === 0) {
                    // If no events are selected, then we don't have any to drag
                    return null;
                } else if (!allUserEditable(eventDragEvents)) {
                    // If any selected event is not user-editable, don't allow editing
                    return "undraggable";
                } else if (eventDragEvents.length > 1) {
                    // If more than one event is selected, don't allow edge dragging
                    return "center";
                } else if (eventDragEvents.length === 1) {
                    var event = eventDragEvents[0];
                    var pxPerMilli = 1 / ui.millisPerPx.value;
                    var eventWidth = (event.end_PMILLIS - event.start_PMILLIS) * pxPerMilli;
                    if (eventWidth < minEventWidthForEdgeDraggability) {
                        // If event isn't very wide, don't try to allow edge dragging
                        return "center";
                    } else {
                        var mouseOffset = (mouseTime_PMILLIS - event.start_PMILLIS) * pxPerMilli;
                        if (mouseOffset < draggableEdgeWidth) {
                            // If mouse is near the left edge, drag the event's start-time
                            return "start";
                        } else if (mouseOffset < eventWidth - draggableEdgeWidth) {
                            // If mouse is in the center, drag the whole event
                            return "center";
                        } else {
                            // If mouse is near the right edge, drag the event's end-time
                            return "end";
                        }
                    }
                } else {
                    // Should never get here, because we have clauses above for length === 0, length === 1, and length > 1
                    return null;
                }
            }
            var updateCursor = function() {
                if (!eventDragMode) {
                    var mouseCursors = {
                        center: "default",
                        start: "w-resize",
                        end: "e-resize",
                        undraggable: "default"
                    };
                    var hoveredTime_PMILLIS = selection.hoveredTime_PMILLIS.value;
                    // if a multi-selection has been made, update the cursor based on all the events in the multi-selection
                    if (selection.selectedEvents.length > 1) {
                        rowContentPane.mouseCursor = mouseCursors[chooseEventDragMode(ui, hoveredTime_PMILLIS, selection.selectedEvents.toArray())];
                    } else {
                        var hoveredEvent = selection.hoveredEvent.value;
                        var hoveredEvents = Webglimpse.hasval(hoveredEvent) ? [ hoveredEvent ] : [];
                        rowContentPane.mouseCursor = mouseCursors[chooseEventDragMode(ui, hoveredTime_PMILLIS, hoveredEvents)];
                    }
                }
            };
            ui.millisPerPx.changed.on(updateCursor);
            selection.hoveredTime_PMILLIS.changed.on(updateCursor);
            selection.hoveredEvent.changed.on(updateCursor);
            rowContentPane.mouseDown.on(function(ev) {
                if (Webglimpse.isLeftMouseDown(ev.mouseEvent)) {
                    var eventDragEventsSet = selection.selectedEvents;
                    eventDragEvents = eventDragEventsSet.toArray();
                    eventDragMode = chooseEventDragMode(ui, timeAtPointer_PMILLIS(ev), eventDragEvents);
                    eventDragSnapTimes_PMILLIS = new Array();
                    var numSnapTimes = 0;
                    var allEventGuids = row.eventGuids;
                    for (var n = 0; n < allEventGuids.length; n++) {
                        var eventGuid = allEventGuids.valueAt(n);
                        if (!eventDragEventsSet.hasId(eventGuid)) {
                            var event = model.event(eventGuid);
                            eventDragSnapTimes_PMILLIS.push(event.start_PMILLIS);
                            eventDragSnapTimes_PMILLIS.push(event.end_PMILLIS);
                        }
                    }
                    eventDragSnapTimes_PMILLIS.sort();
                }
            });
            function findSnapShift_MILLIS(t_PMILLIS, maxShift_MILLIS) {
                var i = Webglimpse.indexNearest(eventDragSnapTimes_PMILLIS, t_PMILLIS);
                if (i >= 0) {
                    var shift_MILLIS = eventDragSnapTimes_PMILLIS[i] - t_PMILLIS;
                    if (Math.abs(shift_MILLIS) <= maxShift_MILLIS) {
                        return shift_MILLIS;
                    }
                }
                return null;
            }
            // Compute (and remember) the pointer time, for use by the event-drag listeners below
            //
            var eventDragPointer_PMILLIS = null;
            var updateEventDragPointer = function(ev) {
                if (Webglimpse.isLeftMouseDown(ev.mouseEvent) && eventDragMode) {
                    eventDragPointer_PMILLIS = timeAtPointer_PMILLIS(ev);
                }
            };
            rowContentPane.mouseDown.on(updateEventDragPointer);
            rowContentPane.mouseMove.on(updateEventDragPointer);
            // Dragging event-center
            //
            var grabEventCenter = function() {
                if (eventDragMode === "center") {
                    for (var n = 0; n < eventDragEvents.length; n++) {
                        var event = eventDragEvents[n];
                        eventDragOffsets_MILLIS[event.eventGuid] = eventDragPointer_PMILLIS - event.start_PMILLIS;
                    }
                    // If this is a simple click-and-release, leave the mouse-cursor alone --
                    // but once we can tell that it's actually a drag, change to a drag cursor
                    //
                    var beginDrag = function() {
                        rowContentPane.mouseCursor = "move";
                    };
                    rowContentPane.mouseMove.on(beginDrag);
                    var pendingBeginDrag = setTimeout(beginDrag, 300);
                    var endDrag = function() {
                        clearTimeout(pendingBeginDrag);
                        rowContentPane.mouseMove.off(beginDrag);
                        rowContentPane.mouseUp.off(endDrag);
                    };
                    rowContentPane.mouseUp.on(endDrag);
                }
            };
            rowContentPane.mouseDown.on(grabEventCenter);
            var dragEventCenter = function() {
                if (eventDragMode === "center") {
                    var maxSnapShift_MILLIS = snapToDistance * (timeAxis.tSize_MILLIS / rowContentPane.viewport.w);
                    var snapShift_MILLIS = null;
                    for (var n = 0; n < eventDragEvents.length; n++) {
                        var event = eventDragEvents[n];
                        var newStart_PMILLIS = eventDragPointer_PMILLIS - eventDragOffsets_MILLIS[event.eventGuid];
                        var newEnd_PMILLIS = event.end_PMILLIS + (newStart_PMILLIS - event.start_PMILLIS);
                        var eventStartSnapShift_MILLIS = findSnapShift_MILLIS(newStart_PMILLIS, maxSnapShift_MILLIS);
                        if (Webglimpse.hasval(eventStartSnapShift_MILLIS)) {
                            if (!Webglimpse.hasval(snapShift_MILLIS) || Math.abs(eventStartSnapShift_MILLIS) < Math.abs(snapShift_MILLIS)) {
                                snapShift_MILLIS = eventStartSnapShift_MILLIS;
                            }
                        }
                        var eventEndSnapShift_MILLIS = findSnapShift_MILLIS(newEnd_PMILLIS, maxSnapShift_MILLIS);
                        if (Webglimpse.hasval(eventEndSnapShift_MILLIS)) {
                            if (!Webglimpse.hasval(snapShift_MILLIS) || Math.abs(eventEndSnapShift_MILLIS) < Math.abs(snapShift_MILLIS)) {
                                snapShift_MILLIS = eventEndSnapShift_MILLIS;
                            }
                        }
                    }
                    if (!Webglimpse.hasval(snapShift_MILLIS)) {
                        snapShift_MILLIS = 0;
                    }
                    for (var n = 0; n < eventDragEvents.length; n++) {
                        var event = eventDragEvents[n];
                        var newStart_PMILLIS = eventDragPointer_PMILLIS - eventDragOffsets_MILLIS[event.eventGuid] + snapShift_MILLIS;
                        var newEnd_PMILLIS = event.end_PMILLIS + (newStart_PMILLIS - event.start_PMILLIS);
                        event.setInterval(newStart_PMILLIS, newEnd_PMILLIS);
                    }
                }
            };
            rowContentPane.mouseMove.on(dragEventCenter);
            // Dragging event-start
            //
            var grabEventStart = function() {
                if (eventDragMode === "start") {
                    for (var n = 0; n < eventDragEvents.length; n++) {
                        var event = eventDragEvents[n];
                        eventDragOffsets_MILLIS[event.eventGuid] = eventDragPointer_PMILLIS - event.start_PMILLIS;
                    }
                }
            };
            rowContentPane.mouseDown.on(grabEventStart);
            var dragEventStart = function() {
                if (eventDragMode === "start") {
                    var wMin_MILLIS = minEventWidthWhenDraggingEdge * timeAxis.vSize / rowContentPane.viewport.w;
                    var maxSnapShift_MILLIS = snapToDistance * (timeAxis.tSize_MILLIS / rowContentPane.viewport.w);
                    var snapShift_MILLIS = null;
                    for (var n = 0; n < eventDragEvents.length; n++) {
                        var event = eventDragEvents[n];
                        var newStart_PMILLIS = eventDragPointer_PMILLIS - eventDragOffsets_MILLIS[event.eventGuid];
                        var eventSnapShift_MILLIS = findSnapShift_MILLIS(newStart_PMILLIS, maxSnapShift_MILLIS);
                        if (Webglimpse.hasval(eventSnapShift_MILLIS)) {
                            if (!Webglimpse.hasval(snapShift_MILLIS) || Math.abs(eventSnapShift_MILLIS) < Math.abs(snapShift_MILLIS)) {
                                snapShift_MILLIS = eventSnapShift_MILLIS;
                            }
                        }
                    }
                    if (!Webglimpse.hasval(snapShift_MILLIS)) {
                        snapShift_MILLIS = 0;
                    }
                    for (var n = 0; n < eventDragEvents.length; n++) {
                        var event = eventDragEvents[n];
                        var newStart_PMILLIS = eventDragPointer_PMILLIS - eventDragOffsets_MILLIS[event.eventGuid] + snapShift_MILLIS;
                        event.start_PMILLIS = Math.min(event.end_PMILLIS - wMin_MILLIS, newStart_PMILLIS);
                    }
                }
            };
            rowContentPane.mouseMove.on(dragEventStart);
            timeAxis.limitsChanged.on(dragEventStart);
            // Dragging event-end
            //
            var grabEventEnd = function() {
                if (eventDragMode === "end") {
                    for (var n = 0; n < eventDragEvents.length; n++) {
                        var event = eventDragEvents[n];
                        eventDragOffsets_MILLIS[event.eventGuid] = eventDragPointer_PMILLIS - event.end_PMILLIS;
                    }
                }
            };
            rowContentPane.mouseDown.on(grabEventEnd);
            var dragEventEnd = function() {
                if (eventDragMode === "end") {
                    var wMin_MILLIS = minEventWidthWhenDraggingEdge * timeAxis.vSize / rowContentPane.viewport.w;
                    var maxSnapShift_MILLIS = snapToDistance * (timeAxis.tSize_MILLIS / rowContentPane.viewport.w);
                    var snapShift_MILLIS = null;
                    for (var n = 0; n < eventDragEvents.length; n++) {
                        var event = eventDragEvents[n];
                        var newEnd_PMILLIS = eventDragPointer_PMILLIS - eventDragOffsets_MILLIS[event.eventGuid];
                        var eventSnapShift_MILLIS = findSnapShift_MILLIS(newEnd_PMILLIS, maxSnapShift_MILLIS);
                        if (Webglimpse.hasval(eventSnapShift_MILLIS)) {
                            if (!Webglimpse.hasval(snapShift_MILLIS) || Math.abs(eventSnapShift_MILLIS) < Math.abs(snapShift_MILLIS)) {
                                snapShift_MILLIS = eventSnapShift_MILLIS;
                            }
                        }
                    }
                    if (!Webglimpse.hasval(snapShift_MILLIS)) {
                        snapShift_MILLIS = 0;
                    }
                    for (var n = 0; n < eventDragEvents.length; n++) {
                        var event = eventDragEvents[n];
                        var newEnd_PMILLIS = eventDragPointer_PMILLIS - eventDragOffsets_MILLIS[event.eventGuid] + snapShift_MILLIS;
                        event.end_PMILLIS = Math.max(event.start_PMILLIS + wMin_MILLIS, newEnd_PMILLIS);
                    }
                }
            };
            rowContentPane.mouseMove.on(dragEventEnd);
            timeAxis.limitsChanged.on(dragEventEnd);
            // Finish event-drag
            //
            rowContentPane.mouseUp.on(function(ev) {
                eventDragEvents = [];
                eventDragOffsets_MILLIS = {};
                eventDragSnapTimes_PMILLIS = [];
                eventDragPointer_PMILLIS = null;
                eventDragMode = null;
            });
            rowContentPane.dispose.on(function() {
                lanes.dispose();
                timeAxis.limitsChanged.off(dragEventEnd);
                timeAxis.limitsChanged.off(dragEventStart);
                ui.millisPerPx.changed.off(uiMillisPerPxChanged);
                ui.millisPerPx.changed.off(updateCursor);
                selection.hoveredTime_PMILLIS.changed.off(updateCursor);
                selection.hoveredEvent.changed.off(updateCursor);
                row.eventGuids.valueAdded.off(redraw);
                row.eventGuids.valueMoved.off(redraw);
                row.eventGuids.valueRemoved.off(redraw);
                row.eventGuids.valueRemoved.off(removeRedraw);
                row.eventGuids.valueAdded.off(watchEventAttrs);
                row.eventGuids.forEach(function(eventGuid) {
                    model.event(eventGuid).attrsChanged.off(redraw);
                });
            });
            return rowContentPane;
        };
    }
    Webglimpse.newEventsRowPaneFactory = newEventsRowPaneFactory;
    function eventLimitsPainterHelper(limitsOpts, drawable, timeAxis, lanes, ui, options) {
        var rowTopPadding = options.rowTopPadding;
        var rowBottomPadding = options.rowBottomPadding;
        var laneHeight = options.laneHeight;
        var lineColor = Webglimpse.hasval(limitsOpts) && Webglimpse.hasval(limitsOpts.lineColor) ? limitsOpts.lineColor : new Webglimpse.Color(1, 0, 0, 1);
        var lineThickness = Webglimpse.hasval(limitsOpts) && Webglimpse.hasval(limitsOpts.lineThickness) ? limitsOpts.lineThickness : 2.5;
        var xyFrac_vColor_VERTSHADER = Webglimpse.concatLines("                                                                ", "  attribute vec2 a_XyFrac;                                      ", "  attribute vec4 a_Color;                                       ", "                                                                ", "  varying vec4 v_Color;                                         ", "                                                                ", "  void main( ) {                                                ", "      gl_Position = vec4( ( -1.0 + 2.0*a_XyFrac ), 0.0, 1.0 );  ", "      v_Color = a_Color;                                        ", "  }                                                             ", "                                                                ");
        var program = new Webglimpse.Program(xyFrac_vColor_VERTSHADER, Webglimpse.varyingColor_FRAGSHADER);
        var a_XyFrac = new Webglimpse.Attribute(program, "a_XyFrac");
        var a_Color = new Webglimpse.Attribute(program, "a_Color");
        var xys = new Float32Array(0);
        var xysBuffer = Webglimpse.newDynamicBuffer();
        var rgbas = new Float32Array(0);
        var rgbasBuffer = Webglimpse.newDynamicBuffer();
        return {
            paint: function(indexXys, indexRgbas, gl, viewport) {
                if (indexXys > 0) {
                    gl.blendFuncSeparate(Webglimpse.GL.SRC_ALPHA, Webglimpse.GL.ONE_MINUS_SRC_ALPHA, Webglimpse.GL.ONE, Webglimpse.GL.ONE_MINUS_SRC_ALPHA);
                    gl.enable(Webglimpse.GL.BLEND);
                    program.use(gl);
                    xysBuffer.setData(xys.subarray(0, indexXys));
                    a_XyFrac.setDataAndEnable(gl, xysBuffer, 2, Webglimpse.GL.FLOAT);
                    rgbasBuffer.setData(rgbas.subarray(0, indexRgbas));
                    a_Color.setDataAndEnable(gl, rgbasBuffer, 4, Webglimpse.GL.FLOAT);
                    gl.drawArrays(Webglimpse.GL.TRIANGLES, 0, Math.floor(indexXys / 2));
                    a_Color.disable(gl);
                    a_XyFrac.disable(gl);
                    program.endUse(gl);
                }
            },
            ensureCapacity: function(eventCount) {
                var numVertices = 6 * 3 * eventCount;
                xys = Webglimpse.ensureCapacityFloat32(xys, 2 * numVertices);
                rgbas = Webglimpse.ensureCapacityFloat32(rgbas, 4 * numVertices);
            },
            fillEvent: function(laneIndex, eventIndex, indexXys, indexRgbas, viewport) {
                var lane = lanes.lane(laneIndex);
                var event = lane.event(eventIndex);
                var wLine = lineThickness / viewport.w;
                var hLine = lineThickness / viewport.h;
                var jTop = rowTopPadding + laneIndex * laneHeight;
                var yTop = (viewport.h - jTop) / viewport.h;
                var jBottom = rowTopPadding + (laneIndex + 1) * laneHeight;
                var yBottom = (viewport.h - jBottom) / viewport.h;
                var yMid = (yTop + yBottom) / 2;
                var xLeft = Webglimpse.hasval(event.startLimit_PMILLIS) ? timeAxis.tFrac(event.startLimit_PMILLIS) : 0;
                var xRight = Webglimpse.hasval(event.endLimit_PMILLIS) ? timeAxis.tFrac(event.endLimit_PMILLIS) : 1;
                indexXys = Webglimpse.putQuadXys(xys, indexXys, xLeft, xRight, yMid - hLine / 2, yMid + hLine / 2);
                indexXys = Webglimpse.putQuadXys(xys, indexXys, xLeft, xLeft - wLine, yTop, yBottom);
                indexXys = Webglimpse.putQuadXys(xys, indexXys, xRight, xRight + wLine, yTop, yBottom);
                indexRgbas = Webglimpse.putRgbas(rgbas, indexRgbas, lineColor, 18);
                return {
                    indexXys: indexXys,
                    indexRgbas: indexRgbas
                };
            }
        };
    }
    function newEventLimitsPainterFactory(limitOpts) {
        // Painter Factory
        return function(drawable, timeAxis, lanes, ui, options) {
            var helper = eventLimitsPainterHelper(limitOpts, drawable, timeAxis, lanes, ui, options);
            // Painter
            return function(gl, viewport) {
                var selectedEvents = ui.selection.selectedEvents;
                //XXX Instead of estimating the number of events we will need to draw ahead of time
                //XXX (difficult because selected events may be present in multiple lanes, so
                //XXX selectedEvents.length might not be sufficient) just make enough space for all events.
                //XXX Potentially quite inefficient with lots of events (and few selected events).
                helper.ensureCapacity(lanes.numEvents);
                var indexXys = 0;
                var indexRgbas = 0;
                for (var l = 0; l < lanes.length; l++) {
                    var lane = lanes.lane(l);
                    for (var e = 0; e < lane.length; e++) {
                        var event = lane.event(e);
                        // check whether the event is selected and has limits defined
                        if (selectedEvents.hasId(event.eventGuid) && (Webglimpse.hasval(event.startLimit_PMILLIS) || Webglimpse.hasval(event.endLimit_PMILLIS))) {
                            var indexes = helper.fillEvent(l, e, indexXys, indexRgbas, viewport);
                            indexXys = indexes.indexXys;
                            indexRgbas = indexes.indexRgbas;
                        }
                    }
                }
                helper.paint(indexXys, indexRgbas, gl, viewport);
            };
        };
    }
    Webglimpse.newEventLimitsPainterFactory = newEventLimitsPainterFactory;
    (function(JointType) {
        JointType[JointType["BEVEL"] = 0] = "BEVEL";
        JointType[JointType["MITER"] = 1] = "MITER";
    })(Webglimpse.JointType || (Webglimpse.JointType = {}));
    var JointType = Webglimpse.JointType;
    (function(FillPattern) {
        FillPattern[FillPattern["solid"] = 0] = "solid";
        FillPattern[FillPattern["stripe"] = 1] = "stripe";
        FillPattern[FillPattern["gradient"] = 2] = "gradient";
    })(Webglimpse.FillPattern || (Webglimpse.FillPattern = {}));
    var FillPattern = Webglimpse.FillPattern;
    function eventStripedBarPainterHelper(barOpts, drawable, timeAxis, lanes, ui, options) {
        var rowTopPadding = options.rowTopPadding;
        var rowBottomPadding = options.rowBottomPadding;
        var laneHeight = options.laneHeight;
        var topMargin = Webglimpse.hasval(barOpts) && Webglimpse.hasval(barOpts.topMargin) ? barOpts.topMargin : 1.2;
        var bottomMargin = Webglimpse.hasval(barOpts) && Webglimpse.hasval(barOpts.bottomMargin) ? barOpts.bottomMargin : 1.2;
        var borderThickness = Webglimpse.hasval(barOpts) && Webglimpse.hasval(barOpts.borderThickness) ? barOpts.borderThickness : 2;
        var cornerType = Webglimpse.hasval(barOpts) && Webglimpse.hasval(barOpts.cornerType) ? barOpts.cornerType : 0;
        var defaultColor = Webglimpse.hasval(barOpts) && Webglimpse.hasval(barOpts.defaultColor) ? barOpts.defaultColor : options.timelineFgColor.withAlphaTimes(.4);
        var defaultColorSecondary = new Webglimpse.Color(1, 1, 1, 1);
        var minimumVisibleWidth = Webglimpse.hasval(barOpts) && Webglimpse.hasval(barOpts.minimumVisibleWidth) ? barOpts.minimumVisibleWidth : 0;
        var stripeWidth = Webglimpse.hasval(barOpts) && Webglimpse.hasval(barOpts.stripeWidth) ? barOpts.stripeWidth : 5;
        var stripeSecondaryWidth = Webglimpse.hasval(barOpts) && Webglimpse.hasval(barOpts.stripeSecondaryWidth) ? barOpts.stripeSecondaryWidth : 5;
        var stripeSlant = Webglimpse.hasval(barOpts) && Webglimpse.hasval(barOpts.stripeSlant) ? barOpts.stripeSlant : 1;
        var featherWidth = Webglimpse.hasval(barOpts) && Webglimpse.hasval(barOpts.featherWidth) ? barOpts.featherWidth : 2;
        var selection = ui.selection;
        var xyFrac_vColor_VERTSHADER = Webglimpse.concatLines("                                                                ", "  attribute vec2 a_XyFrac;                                      ", "  attribute vec4 a_Color;                                       ", "  attribute vec4 a_ColorSecondary;                              ", "  attribute vec2 a_relativeXy;                                  ", "  attribute float a_fillPattern;                                ", "                                                                ", "  varying vec4 v_Color;                                         ", "  varying vec4 v_ColorSecondary;                                ", "  varying vec2 v_relativeXy;                                    ", "  varying float v_fillPattern;                                  ", "                                                                ", "  void main( ) {                                                ", "      gl_Position = vec4( ( -1.0 + 2.0*a_XyFrac ), 0.0, 1.0 );  ", "      v_Color = a_Color;                                        ", "      v_ColorSecondary = a_ColorSecondary;                      ", "      v_relativeXy = a_relativeXy;                              ", "      v_fillPattern = a_fillPattern;                            ", "  }                                                             ", "                                                                ");
        var fillPattern_FRAGSHADER = Webglimpse.concatLines(" #define PI 3.1415926535897932384626433832795                                                  ", "                                                                                               ", " precision lowp float;                                                                         ", " // the width in pixels of the first color stripe                                              ", " uniform float u_stripeWidth;                                                                  ", " // the width in pixels of the second color stripe                                             ", " uniform float u_stripeSecondaryWidth;                                                         ", " // the slant of the stipes: 0 = horizontal, 1 = 45 degrees                                    ", " uniform float u_slant;                                                                        ", " // width in pixels of the antialiasing of the slant                                           ", " uniform float u_featherWidth;                                                                 ", "                                                                                               ", " varying vec4 v_Color;                                                                         ", " varying vec4 v_ColorSecondary;                                                                ", " varying vec2 v_relativeXy;                                                                    ", " varying float v_fillPattern;                                                                  ", "                                                                                               ", " void pattern_stripe( ) {                                                                      ", "     float stripeWidthTotal = u_stripeWidth + u_stripeSecondaryWidth;                          ", "                                                                                               ", "     // calculate the value indicating where we are in the stripe pattern                      ", "     float stripeCoord = mod( v_relativeXy.x + u_slant * v_relativeXy.y , stripeWidthTotal );  ", "                                                                                               ", "     // we are in the feather region beween the two stripes                                    ", "     if ( stripeCoord < u_featherWidth ) {                                                     ", "         float diff = stripeCoord / u_featherWidth;                                            ", "         gl_FragColor = vec4 ( v_Color.xyz * diff + (1.0-diff) * v_ColorSecondary.xyz, 1.0 );  ", "     }                                                                                         ", "     // we are in the color 1 stripe                                                           ", "     else if ( stripeCoord < u_stripeWidth ) {                                                 ", "         gl_FragColor = v_Color;                                                               ", "     }                                                                                         ", "     // we are the feather region between the two stripes                                      ", "     else if ( stripeCoord  < u_stripeWidth + u_featherWidth ) {                               ", "         float diff = ( stripeCoord - u_stripeWidth ) / u_featherWidth;                        ", "         gl_FragColor = vec4 ( v_Color.xyz * (1.0-diff) + diff * v_ColorSecondary.xyz, 1.0 );  ", "     }                                                                                         ", "     // we are in the color 2 stripe                                                           ", "     else {                                                                                    ", "         gl_FragColor = v_ColorSecondary;                                                      ", "     }                                                                                         ", " }                                                                                             ", "                                                                                               ", " void pattern_gradient( ) {                                                                    ", "     float stripeWidthTotal = u_stripeWidth + u_stripeSecondaryWidth;                          ", "                                                                                               ", "     // calculate the value indicating where we are in the stripe pattern                      ", "     float stripeCoord = mod( v_relativeXy.x + u_slant * v_relativeXy.y , stripeWidthTotal );  ", "                                                                                               ", "     float weightedCoord;                                                                      ", "     if ( stripeCoord < u_stripeWidth ) {                                                      ", "         float slope =  PI / u_stripeWidth;                                                    ", "         weightedCoord = slope * stripeCoord;                                                  ", "     }                                                                                         ", "     else {                                                                                    ", "         float slope = PI / u_stripeSecondaryWidth;                                            ", "         weightedCoord = PI + slope * ( stripeCoord - u_stripeWidth );                         ", "     }                                                                                         ", "                                                                                               ", "     // sin wave domain: [0, stripeWidthTotal ] range: [0, 1]                                  ", "     float frac = sin( weightedCoord ) * 2.0 - 1.0;                                            ", "                                                                                               ", "     // mix primary and secondary colors based on gradient fraction                            ", "     gl_FragColor = mix( v_Color, v_ColorSecondary, frac );                                    ", " }                                                                                             ", "                                                                                               ", " void pattern_solid( ) {                                                                       ", "     gl_FragColor = v_Color;                                                                   ", " }                                                                                             ", "                                                                                               ", " void main( ) {                                                                                ", "     if ( v_fillPattern == 1.0 ) {                                                             ", "         pattern_stripe( );                                                                    ", "     }                                                                                         ", "     else if ( v_fillPattern == 2.0 ) {                                                        ", "         pattern_gradient( );                                                                  ", "     }                                                                                         ", "     else {                                                                                    ", "         pattern_solid( );                                                                     ", "     }                                                                                         ", " }                                                                                             ", "                                                                                               ", "                                                                                               ", "                                                                                               ");
        var program = new Webglimpse.Program(xyFrac_vColor_VERTSHADER, fillPattern_FRAGSHADER);
        var a_XyFrac = new Webglimpse.Attribute(program, "a_XyFrac");
        var a_Color = new Webglimpse.Attribute(program, "a_Color");
        var a_ColorSecondary = new Webglimpse.Attribute(program, "a_ColorSecondary");
        var a_relativeXy = new Webglimpse.Attribute(program, "a_relativeXy");
        var a_fillPattern = new Webglimpse.Attribute(program, "a_fillPattern");
        var u_stripeWidth = new Webglimpse.Uniform1f(program, "u_stripeWidth");
        var u_stripeSecondaryWidth = new Webglimpse.Uniform1f(program, "u_stripeSecondaryWidth");
        var u_slant = new Webglimpse.Uniform1f(program, "u_slant");
        var u_featherWidth = new Webglimpse.Uniform1f(program, "u_featherWidth");
        var xys = new Float32Array(0);
        var xysBuffer = Webglimpse.newDynamicBuffer();
        var rgbas = new Float32Array(0);
        var rgbasBuffer = Webglimpse.newDynamicBuffer();
        var rgbasSecondary = new Float32Array(0);
        var rgbasSecondaryBuffer = Webglimpse.newDynamicBuffer();
        var relativeXys = new Float32Array(0);
        var relativeXysBuffer = Webglimpse.newDynamicBuffer();
        var fillPattern = new Float32Array(0);
        var fillPatternBuffer = Webglimpse.newDynamicBuffer();
        return {
            paint: function(indexXys, indexRgbas, gl, viewport, indexRelativeXys, indexFillPattern) {
                if (indexXys == 0 || indexRgbas == 0) return;
                gl.blendFuncSeparate(Webglimpse.GL.SRC_ALPHA, Webglimpse.GL.ONE_MINUS_SRC_ALPHA, Webglimpse.GL.ONE, Webglimpse.GL.ONE_MINUS_SRC_ALPHA);
                gl.enable(Webglimpse.GL.BLEND);
                program.use(gl);
                u_slant.setData(gl, stripeSlant);
                u_stripeWidth.setData(gl, stripeWidth);
                u_stripeSecondaryWidth.setData(gl, stripeSecondaryWidth);
                u_featherWidth.setData(gl, featherWidth);
                xysBuffer.setData(xys.subarray(0, indexXys));
                a_XyFrac.setDataAndEnable(gl, xysBuffer, 2, Webglimpse.GL.FLOAT);
                rgbasBuffer.setData(rgbas.subarray(0, indexRgbas));
                a_Color.setDataAndEnable(gl, rgbasBuffer, 4, Webglimpse.GL.FLOAT);
                rgbasSecondaryBuffer.setData(rgbasSecondary.subarray(0, indexRgbas));
                a_ColorSecondary.setDataAndEnable(gl, rgbasSecondaryBuffer, 4, Webglimpse.GL.FLOAT);
                relativeXysBuffer.setData(relativeXys.subarray(0, indexRelativeXys));
                a_relativeXy.setDataAndEnable(gl, relativeXysBuffer, 2, Webglimpse.GL.FLOAT);
                fillPatternBuffer.setData(fillPattern.subarray(0, indexFillPattern));
                a_fillPattern.setDataAndEnable(gl, fillPatternBuffer, 1, Webglimpse.GL.FLOAT);
                gl.drawArrays(Webglimpse.GL.TRIANGLES, 0, Math.floor(indexXys / 2));
                a_Color.disable(gl);
                a_XyFrac.disable(gl);
                a_ColorSecondary.disable(gl);
                a_fillPattern.disable(gl);
                a_relativeXy.disable(gl);
                program.endUse(gl);
            },
            ensureCapacity: function(eventCount) {
                var numVertices = 6 * 1 * eventCount;
                xys = Webglimpse.ensureCapacityFloat32(xys, 2 * numVertices);
                rgbas = Webglimpse.ensureCapacityFloat32(rgbas, 4 * numVertices);
                rgbasSecondary = Webglimpse.ensureCapacityFloat32(rgbasSecondary, 4 * numVertices);
                relativeXys = Webglimpse.ensureCapacityFloat32(relativeXys, 2 * numVertices);
                fillPattern = Webglimpse.ensureCapacityFloat32(fillPattern, numVertices);
            },
            fillEvent: function(laneIndex, eventIndex, indexXys, indexRgbas, viewport, indexRelativeXys, indexFillPattern) {
                var lane = lanes.lane(laneIndex);
                var event = lane.event(eventIndex);
                var wBorder = borderThickness / viewport.w;
                var hBorder = borderThickness / viewport.h;
                var _topMargin = Webglimpse.hasval(event.topMargin) ? event.topMargin : topMargin;
                var _bottomMargin = Webglimpse.hasval(event.bottomMargin) ? event.bottomMargin : bottomMargin;
                var jTop = rowTopPadding + laneIndex * laneHeight + _topMargin;
                var yTop = (viewport.h - jTop) / viewport.h;
                var jBottom = rowTopPadding + (laneIndex + 1) * laneHeight - _bottomMargin;
                var yBottom = (viewport.h - jBottom) / viewport.h;
                var xLeft = timeAxis.tFrac(event.start_PMILLIS);
                var xRight = timeAxis.tFrac(event.end_PMILLIS);
                var xWidthPixels = viewport.w * (xRight - xLeft);
                var yHeightPixels = jTop - jBottom;
                if (!(xRight < 0 || xLeft > 1) && xWidthPixels > minimumVisibleWidth) {
                    // Fill
                    var fillColor = event.bgColor || defaultColor;
                    var fillColorSecondary = event.bgSecondaryColor || defaultColorSecondary;
                    if (event === selection.hoveredEvent.value) {
                        fillColor = Webglimpse.darker(fillColor, .8);
                        fillColorSecondary = Webglimpse.darker(fillColorSecondary, .8);
                    }
                    indexXys = Webglimpse.putQuadXys(xys, indexXys, xLeft + wBorder, xRight - wBorder, yTop - hBorder, yBottom + hBorder);
                    var startIndex = indexRgbas;
                    Webglimpse.putQuadRgbas(rgbas, startIndex, fillColor);
                    indexRgbas = Webglimpse.putQuadRgbas(rgbasSecondary, startIndex, fillColorSecondary);
                    // create a quad with relative coordinates
                    indexRelativeXys = Webglimpse.putQuadXys(relativeXys, indexRelativeXys, 0, xWidthPixels, 0, yHeightPixels);
                    // Set the fillPatternValue per vertex of the quad
                    var fillPatternValue = event.fillPattern;
                    fillPattern[indexFillPattern++] = fillPatternValue;
                    fillPattern[indexFillPattern++] = fillPatternValue;
                    fillPattern[indexFillPattern++] = fillPatternValue;
                    fillPattern[indexFillPattern++] = fillPatternValue;
                    fillPattern[indexFillPattern++] = fillPatternValue;
                    fillPattern[indexFillPattern++] = fillPatternValue;
                }
                return {
                    indexXys: indexXys,
                    indexRgbas: indexRgbas,
                    indexRelativeXys: indexRelativeXys,
                    indexFillPattern: indexFillPattern
                };
            }
        };
    }
    function eventDashedBorderPainterHelper(barOpts, drawable, timeAxis, lanes, ui, options) {
        var rowTopPadding = options.rowTopPadding;
        var rowBottomPadding = options.rowBottomPadding;
        var laneHeight = options.laneHeight;
        var topMargin = Webglimpse.hasval(barOpts) && Webglimpse.hasval(barOpts.topMargin) ? barOpts.topMargin : 1.2;
        var bottomMargin = Webglimpse.hasval(barOpts) && Webglimpse.hasval(barOpts.bottomMargin) ? barOpts.bottomMargin : 1.2;
        var borderThickness = Webglimpse.hasval(barOpts) && Webglimpse.hasval(barOpts.borderThickness) ? barOpts.borderThickness : 2;
        var cornerType = Webglimpse.hasval(barOpts) && Webglimpse.hasval(barOpts.cornerType) ? barOpts.cornerType : 0;
        var defaultColor = Webglimpse.hasval(barOpts) && Webglimpse.hasval(barOpts.defaultColor) ? barOpts.defaultColor : options.timelineFgColor.withAlphaTimes(.4);
        var defaultBorderColor = Webglimpse.hasval(barOpts) && Webglimpse.hasval(barOpts.defaultBorderColor) ? barOpts.defaultBorderColor : null;
        var selectedBorderColor = Webglimpse.hasval(barOpts) && Webglimpse.hasval(barOpts.selectedBorderColor) ? barOpts.selectedBorderColor : options.timelineFgColor;
        var minimumVisibleWidth = Webglimpse.hasval(barOpts) && Webglimpse.hasval(barOpts.minimumVisibleWidth) ? barOpts.minimumVisibleWidth : 0;
        var dashLength = Webglimpse.hasval(barOpts) && Webglimpse.hasval(barOpts.dashLength) ? barOpts.dashLength : 5;
        var defaultSecondaryColor = new Webglimpse.Color(0, 0, 0, 0);
        var selection = ui.selection;
        var dashedBorder_VERTSHADER = Webglimpse.concatLines("                                                                ", "  attribute vec2 a_XyFrac;                                      ", "  attribute vec4 a_Color;                                       ", "  attribute vec4 a_SecondaryColor;                              ", "  attribute float a_LengthSoFar;                                ", "                                                                ", "  varying vec4 v_Color;                                         ", "  varying vec4 v_SecondaryColor;                                ", "  varying float f_LengthSoFar;                                  ", "                                                                ", "  void main( ) {                                                ", "      gl_Position = vec4( ( -1.0 + 2.0*a_XyFrac ), 0.0, 1.0 );  ", "      v_Color = a_Color;                                        ", "      v_SecondaryColor = a_SecondaryColor;                      ", "      f_LengthSoFar = a_LengthSoFar;                            ", "  }                                                             ", "                                                                ");
        var varyingBorder_FRAGSHADER = Webglimpse.concatLines("                                                                            ", "  precision lowp float;                                                     ", "  varying vec4 v_Color;                                                     ", "  varying vec4 v_SecondaryColor;                                            ", "  varying float f_LengthSoFar;                                              ", "  //dashes are u_DashLength_PX pixels long                                  ", "  uniform float u_DashLength_PX;                                            ", "                                                                            ", "  void main( ) {                                                            ", "      gl_FragColor = v_Color;                                               ", "                                                                            ", "      if (f_LengthSoFar > 0.0) {                                            ", "         float mod = mod(f_LengthSoFar, u_DashLength_PX * 2.0);             ", "         float alpha = 1.0;                                                 ", "         if ( mod < u_DashLength_PX ) {                                     ", "            gl_FragColor = v_SecondaryColor;                                ", "         }                                                                  ", "         else {                                                             ", "            gl_FragColor = v_Color;                                         ", "         }                                                                  ", "      }                                                                     ", "      else {                                                                ", "         gl_FragColor = v_Color;                                            ", "      }                                                                     ", "  }                                                                         ", "                                                                            ");
        var program = new Webglimpse.Program(dashedBorder_VERTSHADER, varyingBorder_FRAGSHADER);
        var a_XyFrac = new Webglimpse.Attribute(program, "a_XyFrac");
        var a_Color = new Webglimpse.Attribute(program, "a_Color");
        var a_SecondaryColor = new Webglimpse.Attribute(program, "a_SecondaryColor");
        var a_LengthSoFar = new Webglimpse.Attribute(program, "a_LengthSoFar");
        var u_DashLength_PX = new Webglimpse.Uniform1f(program, "u_DashLength_PX");
        var xys = new Float32Array(0);
        var xysBuffer = Webglimpse.newDynamicBuffer();
        var rgbas = new Float32Array(0);
        var rgbasBuffer = Webglimpse.newDynamicBuffer();
        var rgbasSecondary = new Float32Array(0);
        var rgbasSecondaryBuffer = Webglimpse.newDynamicBuffer();
        var lengths = new Float32Array(0);
        var lengthsBuffer = Webglimpse.newDynamicBuffer();
        return {
            paint: function(indexXys, indexRgbas, gl, viewport, indexLengthSoFar) {
                if (indexXys == 0 || indexRgbas == 0) return;
                gl.blendFuncSeparate(Webglimpse.GL.SRC_ALPHA, Webglimpse.GL.ONE_MINUS_SRC_ALPHA, Webglimpse.GL.ONE, Webglimpse.GL.ONE_MINUS_SRC_ALPHA);
                gl.enable(Webglimpse.GL.BLEND);
                program.use(gl);
                u_DashLength_PX.setData(gl, dashLength);
                xysBuffer.setData(xys.subarray(0, indexXys));
                a_XyFrac.setDataAndEnable(gl, xysBuffer, 2, Webglimpse.GL.FLOAT);
                rgbasBuffer.setData(rgbas.subarray(0, indexRgbas));
                a_Color.setDataAndEnable(gl, rgbasBuffer, 4, Webglimpse.GL.FLOAT);
                rgbasSecondaryBuffer.setData(rgbasSecondary.subarray(0, indexRgbas));
                a_SecondaryColor.setDataAndEnable(gl, rgbasSecondaryBuffer, 4, Webglimpse.GL.FLOAT);
                lengthsBuffer.setData(lengths.subarray(0, indexLengthSoFar));
                a_LengthSoFar.setDataAndEnable(gl, lengthsBuffer, 1, Webglimpse.GL.FLOAT);
                gl.drawArrays(Webglimpse.GL.TRIANGLES, 0, Math.floor(indexXys / 2));
                a_Color.disable(gl);
                a_SecondaryColor.disable(gl);
                a_XyFrac.disable(gl);
                a_LengthSoFar.disable(gl);
                program.endUse(gl);
            },
            ensureCapacity: function(eventCount) {
                var numVertices;
                switch (cornerType) {
                  case 0:
                    numVertices = (6 * 4 + 3 * 4) * eventCount;
                    break;

                  default:
                    numVertices = 6 * 4 * eventCount;
                    break;
                }
                xys = Webglimpse.ensureCapacityFloat32(xys, 2 * numVertices);
                rgbas = Webglimpse.ensureCapacityFloat32(rgbas, 4 * numVertices);
                rgbasSecondary = Webglimpse.ensureCapacityFloat32(rgbasSecondary, 4 * numVertices);
                lengths = Webglimpse.ensureCapacityFloat32(lengths, numVertices);
            },
            fillEvent: function(laneIndex, eventIndex, indexXys, indexRgbas, viewport, indexLengthSoFar) {
                var lane = lanes.lane(laneIndex);
                var event = lane.event(eventIndex);
                var wBorder = borderThickness / viewport.w;
                var hBorder = borderThickness / viewport.h;
                var _topMargin = Webglimpse.hasval(event.topMargin) ? event.topMargin : topMargin;
                var _bottomMargin = Webglimpse.hasval(event.bottomMargin) ? event.bottomMargin : bottomMargin;
                var jTop = rowTopPadding + laneIndex * laneHeight + _topMargin;
                var yTop = (viewport.h - jTop) / viewport.h;
                var jBottom = rowTopPadding + (laneIndex + 1) * laneHeight - _bottomMargin;
                var yBottom = (viewport.h - jBottom) / viewport.h;
                var xLeft = timeAxis.tFrac(event.start_PMILLIS);
                var xRight = timeAxis.tFrac(event.end_PMILLIS);
                var widthPixels = viewport.w * (xRight - xLeft);
                var heightPixels = jBottom - jTop;
                var setLengthsVertical = function(bottomEdge, topEdge) {
                    lengths[indexLengthSoFar++] = topEdge;
                    lengths[indexLengthSoFar++] = topEdge;
                    lengths[indexLengthSoFar++] = bottomEdge;
                    lengths[indexLengthSoFar++] = bottomEdge;
                    lengths[indexLengthSoFar++] = topEdge;
                    lengths[indexLengthSoFar++] = bottomEdge;
                    // for convenience, return the length of the edge
                    return Math.abs(bottomEdge - topEdge);
                };
                var setLengthsHorizontal = function(leftEdge, rightEdge) {
                    lengths[indexLengthSoFar++] = leftEdge;
                    lengths[indexLengthSoFar++] = rightEdge;
                    lengths[indexLengthSoFar++] = leftEdge;
                    lengths[indexLengthSoFar++] = leftEdge;
                    lengths[indexLengthSoFar++] = rightEdge;
                    lengths[indexLengthSoFar++] = rightEdge;
                    // for convenience, return the length of the edge
                    return Math.abs(leftEdge - rightEdge);
                };
                var setLengthsTriangle = function(length) {
                    lengths[indexLengthSoFar++] = length;
                    lengths[indexLengthSoFar++] = length;
                    lengths[indexLengthSoFar++] = length;
                };
                if (!(xRight < 0 || xLeft > 1) && widthPixels > minimumVisibleWidth) {
                    // Border
                    var borderColor = event.borderColor || event.bgColor || defaultBorderColor;
                    var borderSecondaryColor = event.borderSecondaryColor || defaultSecondaryColor;
                    if (selection.selectedEvents.hasValue(event)) {
                        borderColor = selectedBorderColor;
                    }
                    if (borderColor) {
                        switch (cornerType) {
                          case 0:
                            // Quads
                            // top edge
                            indexXys = Webglimpse.putQuadXys(xys, indexXys, xLeft + wBorder, xRight - wBorder, yTop, yTop - hBorder);
                            indexXys = Webglimpse.putUpperRightTriangleXys(xys, indexXys, xLeft, xLeft + wBorder, yBottom + hBorder, yBottom);
                            // right edge
                            indexXys = Webglimpse.putQuadXys(xys, indexXys, xRight - wBorder, xRight, yTop - hBorder, yBottom + hBorder);
                            indexXys = Webglimpse.putLowerRightTriangleXys(xys, indexXys, xLeft, xLeft + wBorder, yTop, yTop - hBorder);
                            // bottom edge
                            indexXys = Webglimpse.putQuadXys(xys, indexXys, xLeft + wBorder, xRight - wBorder, yBottom + hBorder, yBottom);
                            indexXys = Webglimpse.putLowerLeftTriangleXys(xys, indexXys, xRight - wBorder, xRight, yTop, yTop - hBorder);
                            // left edge
                            indexXys = Webglimpse.putQuadXys(xys, indexXys, xLeft, xLeft + wBorder, yTop - hBorder, yBottom + hBorder);
                            indexXys = Webglimpse.putUpperLeftTriangleXys(xys, indexXys, xRight - wBorder, xRight, yBottom + hBorder, yBottom);
                            // Colors
                            var startIndex = indexRgbas;
                            Webglimpse.putRgbas(rgbas, startIndex, borderColor, 24);
                            indexRgbas = Webglimpse.putRgbas(rgbasSecondary, startIndex, borderSecondaryColor, 24);
                            // Colors
                            startIndex = indexRgbas;
                            Webglimpse.putRgbas(rgbas, startIndex, borderColor, 12);
                            indexRgbas = Webglimpse.putRgbas(rgbasSecondary, startIndex, borderSecondaryColor, 12);
                            // Stipple
                            if (!event.isBorderDashed) {
                                setLengthsHorizontal(-1, -1);
                                setLengthsTriangle(-1);
                                setLengthsVertical(-1, -1);
                                setLengthsTriangle(-1);
                                setLengthsHorizontal(-1, -1);
                                setLengthsTriangle(-1);
                                setLengthsVertical(-1, -1);
                                setLengthsTriangle(-1);
                            } else {
                                var cumulativeLength = 0;
                                // top edge
                                cumulativeLength += setLengthsHorizontal(cumulativeLength, cumulativeLength + widthPixels);
                                setLengthsTriangle(cumulativeLength);
                                // right edge
                                cumulativeLength += setLengthsVertical(cumulativeLength + heightPixels, cumulativeLength);
                                setLengthsTriangle(cumulativeLength);
                                // bottom edge
                                cumulativeLength += setLengthsHorizontal(cumulativeLength, cumulativeLength + widthPixels);
                                setLengthsTriangle(cumulativeLength);
                                // left edge
                                cumulativeLength += setLengthsVertical(cumulativeLength + heightPixels, cumulativeLength);
                                setLengthsTriangle(cumulativeLength);
                            }
                            break;

                          default:
                            // top edge
                            indexXys = Webglimpse.putQuadXys(xys, indexXys, xLeft, xRight - wBorder, yTop, yTop - hBorder);
                            // right edge
                            indexXys = Webglimpse.putQuadXys(xys, indexXys, xRight - wBorder, xRight, yTop, yBottom + hBorder);
                            // bottom edge
                            indexXys = Webglimpse.putQuadXys(xys, indexXys, xLeft + wBorder, xRight, yBottom + hBorder, yBottom);
                            // left edge
                            indexXys = Webglimpse.putQuadXys(xys, indexXys, xLeft, xLeft + wBorder, yTop - hBorder, yBottom);
                            // color
                            var startIndex = indexRgbas;
                            Webglimpse.putRgbas(rgbas, startIndex, borderColor, 24);
                            indexRgbas = Webglimpse.putRgbas(rgbasSecondary, startIndex, borderSecondaryColor, 24);
                            // Stipple
                            if (!event.isBorderDashed) {
                                setLengthsHorizontal(-1, -1);
                                setLengthsVertical(-1, -1);
                                setLengthsHorizontal(-1, -1);
                                setLengthsVertical(-1, -1);
                            } else {
                                var cumulativeLength = 0;
                                // top edge
                                cumulativeLength += setLengthsHorizontal(cumulativeLength, cumulativeLength + widthPixels);
                                // right edge
                                cumulativeLength += setLengthsVertical(cumulativeLength + heightPixels, cumulativeLength);
                                // bottom edge
                                cumulativeLength += setLengthsHorizontal(cumulativeLength, cumulativeLength + widthPixels);
                                // left edge
                                cumulativeLength += setLengthsVertical(cumulativeLength + heightPixels, cumulativeLength);
                            }
                            break;
                        }
                    }
                }
                return {
                    indexXys: indexXys,
                    indexRgbas: indexRgbas,
                    indexLengthSoFar: indexLengthSoFar
                };
            }
        };
    }
    function newEventStripedBarsPainterFactory(barOpts) {
        // Painter Factory
        return function(drawable, timeAxis, lanes, ui, options) {
            var helper = eventStripedBarPainterHelper(barOpts, drawable, timeAxis, lanes, ui, options);
            // Painter
            return function(gl, viewport) {
                helper.ensureCapacity(lanes.numEvents);
                var indexXys = 0;
                var indexRgbas = 0;
                var indexRelativeXys = 0;
                var indexFillPattern = 0;
                for (var l = 0; l < lanes.length; l++) {
                    var lane = lanes.lane(l);
                    for (var e = 0; e < lane.length; e++) {
                        var event = lane.event(e);
                        var indexes = helper.fillEvent(l, e, indexXys, indexRgbas, viewport, indexRelativeXys, indexFillPattern);
                        indexXys = indexes.indexXys;
                        indexRgbas = indexes.indexRgbas;
                        indexRelativeXys = indexes.indexRelativeXys;
                        indexFillPattern = indexes.indexFillPattern;
                    }
                }
                helper.paint(indexXys, indexRgbas, gl, viewport, indexRelativeXys, indexFillPattern);
            };
        };
    }
    Webglimpse.newEventStripedBarsPainterFactory = newEventStripedBarsPainterFactory;
    function newEventDashedBordersPainterFactory(barOpts) {
        // Painter Factory
        return function(drawable, timeAxis, lanes, ui, options) {
            var helper = eventDashedBorderPainterHelper(barOpts, drawable, timeAxis, lanes, ui, options);
            // Painter
            return function(gl, viewport) {
                helper.ensureCapacity(lanes.numEvents);
                var indexXys = 0;
                var indexRgbas = 0;
                var indexLengthSoFar = 0;
                for (var l = 0; l < lanes.length; l++) {
                    var lane = lanes.lane(l);
                    for (var e = 0; e < lane.length; e++) {
                        var event = lane.event(e);
                        var indexes = helper.fillEvent(l, e, indexXys, indexRgbas, viewport, indexLengthSoFar);
                        indexXys = indexes.indexXys;
                        indexRgbas = indexes.indexRgbas;
                        indexLengthSoFar = indexes.indexLengthSoFar;
                    }
                }
                helper.paint(indexXys, indexRgbas, gl, viewport, indexLengthSoFar);
            };
        };
    }
    Webglimpse.newEventDashedBordersPainterFactory = newEventDashedBordersPainterFactory;
    function eventIconsPainterHelper(iconOpts, drawable, timeAxis, lanes, ui, options) {
        var rowTopPadding = options.rowTopPadding;
        var rowBottomPadding = options.rowBottomPadding;
        var laneHeight = options.laneHeight;
        var topMargin = Webglimpse.hasval(iconOpts) && Webglimpse.hasval(iconOpts.topMargin) ? iconOpts.topMargin : 1.2;
        var bottomMargin = Webglimpse.hasval(iconOpts) && Webglimpse.hasval(iconOpts.bottomMargin) ? iconOpts.bottomMargin : 1.2;
        var vAlign = Webglimpse.hasval(iconOpts) && Webglimpse.hasval(iconOpts.vAlign) ? iconOpts.vAlign : .5;
        var textureRenderer = new Webglimpse.TextureRenderer();
        return {
            textureRenderer: textureRenderer,
            paintEvent: function(laneIndex, eventIndex, gl, viewport) {
                var lane = lanes.lane(laneIndex);
                var event = lane.event(eventIndex);
                var eventStyle = ui.eventStyle(event.styleGuid);
                var jTop = rowTopPadding + laneIndex * laneHeight + topMargin;
                var yFrac = (viewport.h - jTop - (1 - vAlign) * (laneHeight - topMargin - bottomMargin)) / viewport.h;
                for (var n = 0; n < eventStyle.numIcons; n++) {
                    var icon = eventStyle.icon(n);
                    var iconTime_PMILLIS = event.start_PMILLIS + icon.hPos * (event.end_PMILLIS - event.start_PMILLIS);
                    var xFrac = timeAxis.tFrac(iconTime_PMILLIS);
                    var w = icon.displayWidth / viewport.w;
                    if (-w <= xFrac && xFrac <= 1 + w) {
                        var iconTexture = ui.loadImage(icon.url, function() {
                            drawable.redraw();
                        });
                        if (iconTexture) {
                            textureRenderer.draw(gl, iconTexture, xFrac, yFrac, {
                                xAnchor: icon.hAlign,
                                yAnchor: vAlign,
                                width: icon.displayWidth,
                                height: icon.displayHeight
                            });
                        }
                    }
                }
            }
        };
    }
    function newEventIconsPainterFactory(iconOpts) {
        // Painter Factory
        return function(drawable, timeAxis, lanes, ui, options) {
            var helper = eventIconsPainterHelper(iconOpts, drawable, timeAxis, lanes, ui, options);
            // Painter
            return function(gl, viewport) {
                gl.blendFuncSeparate(Webglimpse.GL.SRC_ALPHA, Webglimpse.GL.ONE_MINUS_SRC_ALPHA, Webglimpse.GL.ONE, Webglimpse.GL.ONE_MINUS_SRC_ALPHA);
                gl.enable(Webglimpse.GL.BLEND);
                helper.textureRenderer.begin(gl, viewport);
                for (var l = 0; l < lanes.length; l++) {
                    var lane = lanes.lane(l);
                    for (var e = 0; e < lane.length; e++) {
                        helper.paintEvent(l, e, gl, viewport);
                    }
                }
                helper.textureRenderer.end(gl);
            };
        };
    }
    Webglimpse.newEventIconsPainterFactory = newEventIconsPainterFactory;
    function calculateTextWidth(textEnabled, labelText, fgColor, textDefaultColor, textTextures, viewport) {
        var wText = 0;
        var textTexture;
        if (textEnabled && labelText) {
            var textColor = Webglimpse.hasval(fgColor) ? fgColor : textDefaultColor;
            textTexture = textTextures.value(textColor.rgbaString, labelText);
            wText = textTexture.w / viewport.w;
        }
        return {
            wText: wText,
            textTexture: textTexture
        };
    }
    function eventLabelsPainterHelper(labelOpts, drawable, timeAxis, lanes, ui, options) {
        var rowTopPadding = options.rowTopPadding;
        var rowBottomPadding = options.rowBottomPadding;
        var laneHeight = options.laneHeight;
        var topMargin = Webglimpse.hasval(labelOpts) && Webglimpse.hasval(labelOpts.topMargin) ? labelOpts.topMargin : 1.2;
        var bottomMargin = Webglimpse.hasval(labelOpts) && Webglimpse.hasval(labelOpts.bottomMargin) ? labelOpts.bottomMargin : 1.2;
        var leftMargin = Webglimpse.hasval(labelOpts) && Webglimpse.hasval(labelOpts.leftMargin) ? labelOpts.leftMargin : 4;
        var rightMargin = Webglimpse.hasval(labelOpts) && Webglimpse.hasval(labelOpts.rightMargin) ? labelOpts.rightMargin : 4;
        var vAlign = Webglimpse.hasval(labelOpts) && Webglimpse.hasval(labelOpts.vAlign) ? labelOpts.vAlign : .5;
        var spacing = Webglimpse.hasval(labelOpts) && Webglimpse.hasval(labelOpts.spacing) ? labelOpts.spacing : 3;
        var extendBeyondBar = Webglimpse.hasval(labelOpts) && Webglimpse.hasval(labelOpts.extendBeyondBar) ? labelOpts.extendBeyondBar : false;
        var textMode = Webglimpse.hasval(labelOpts) && Webglimpse.hasval(labelOpts.textMode) ? labelOpts.textMode : "force";
        // Icon options
        var iconsEnabled = Webglimpse.hasval(labelOpts) && Webglimpse.hasval(labelOpts.iconsEnabled) ? labelOpts.iconsEnabled : true;
        var iconsForceWidth = Webglimpse.hasval(labelOpts) && Webglimpse.hasval(labelOpts.iconsForceWidth) ? labelOpts.iconsForceWidth : "auto";
        var iconsForceHeight = Webglimpse.hasval(labelOpts) && Webglimpse.hasval(labelOpts.iconsForceHeight) ? labelOpts.iconsForceHeight : "auto";
        var iconsSizeFactor = Webglimpse.hasval(labelOpts) && Webglimpse.hasval(labelOpts.iconsSizeFactor) ? labelOpts.iconsSizeFactor : 1;
        // Text options
        var textEnabled = Webglimpse.hasval(labelOpts) && Webglimpse.hasval(labelOpts.textEnabled) ? labelOpts.textEnabled : true;
        var textDefaultColor = Webglimpse.hasval(labelOpts) && Webglimpse.hasval(labelOpts.textDefaultColor) ? labelOpts.textDefaultColor : options.timelineFgColor;
        var textFont = Webglimpse.hasval(labelOpts) && Webglimpse.hasval(labelOpts.textFont) ? labelOpts.textFont : options.timelineFont;
        // XXX: Old icon textures never get cleaned out
        var iconTextures = {};
        var textTextures = Webglimpse.newTextTextureCache2(textFont);
        var textureRenderer = new Webglimpse.TextureRenderer();
        return {
            textTextures: textTextures,
            textureRenderer: textureRenderer,
            paintEvent: function(laneIndex, eventIndex, gl, viewport) {
                var lane = lanes.lane(laneIndex);
                var event = lane.event(eventIndex);
                var labelTopMargin = Webglimpse.hasval(event.labelTopMargin) ? event.labelTopMargin : topMargin;
                var labelBottomMargin = Webglimpse.hasval(event.labelBottomMargin) ? event.labelBottomMargin : bottomMargin;
                var labelVAlign = Webglimpse.hasval(event.labelVAlign) ? event.labelVAlign : vAlign;
                var labelVPos = Webglimpse.hasval(event.labelVPos) ? event.labelVPos : labelVAlign;
                var labelHAlign = Webglimpse.hasval(event.labelHAlign) ? event.labelHAlign : 0;
                var labelHPos = Webglimpse.hasval(event.labelHPos) ? event.labelHPos : labelHAlign;
                var jTop = rowTopPadding + laneIndex * laneHeight + labelTopMargin;
                var yFrac = (viewport.h - jTop - (1 - labelVAlign) * (laneHeight - labelTopMargin - labelBottomMargin)) / viewport.h;
                var xLeftMin = 2 / viewport.w;
                var xRightMax = (viewport.w - 2) / viewport.w;
                var wLeftIndent = leftMargin / viewport.w;
                var wRightIndent = rightMargin / viewport.w;
                var xStart = timeAxis.tFrac(event.start_PMILLIS);
                var xEnd = timeAxis.tFrac(event.end_PMILLIS);
                var wTotal = xEnd - wRightIndent - (xStart + wLeftIndent);
                var wSpacing = spacing / viewport.w;
                if (!(xEnd <= 0 || xStart > 1)) {
                    var xLeft;
                    var xRight;
                    if (extendBeyondBar) {
                        if (eventIndex + 1 < lane.length) {
                            var nextEvent = lane.event(eventIndex + 1);
                            var nextStart_PMILLIS = Webglimpse.effectiveEdges_PMILLIS(ui, nextEvent)[0];
                            xRight = timeAxis.tFrac(nextStart_PMILLIS);
                        } else {
                            xRight = xRightMax;
                        }
                        if (eventIndex - 1 >= 0) {
                            var previousEvent = lane.event(eventIndex - 1);
                            var previousEnd_PMILLIS = Webglimpse.effectiveEdges_PMILLIS(ui, previousEvent)[1];
                            xLeft = timeAxis.tFrac(previousEnd_PMILLIS);
                        } else {
                            xLeft = xLeftMin;
                        }
                    } else {
                        xRight = xEnd;
                        xLeft = xStart;
                    }
                    // calculate Text width
                    var calculatedTextWidth = calculateTextWidth(textEnabled, event.label, event.fgColor, textDefaultColor, textTextures, viewport);
                    var wText = calculatedTextWidth.wText;
                    var textTexture = calculatedTextWidth.textTexture;
                    // calculate Icon width (and start load if necessary)
                    var wIcon = 0;
                    var wIconPlusSpacing = 0;
                    var iconWidth;
                    var iconHeight;
                    var iconTexture;
                    if (iconsEnabled && event.labelIcon) {
                        iconTexture = iconTextures[event.labelIcon];
                        if (Webglimpse.hasval(iconTexture)) {
                            iconWidth = Webglimpse.isNumber(iconsForceWidth) ? iconsForceWidth : iconsForceWidth === "imageSize" ? iconTexture.w : null;
                            iconHeight = Webglimpse.isNumber(iconsForceHeight) ? iconsForceHeight : iconsForceHeight === "imageSize" ? iconTexture.h : null;
                            var wIconKnown = Webglimpse.hasval(iconWidth);
                            var hIconKnown = Webglimpse.hasval(iconHeight);
                            if (!wIconKnown && !hIconKnown) {
                                iconHeight = Math.round(iconsSizeFactor * (laneHeight - labelTopMargin - labelBottomMargin));
                                iconWidth = iconTexture.w * iconHeight / iconTexture.h;
                            } else if (!wIconKnown) {
                                iconHeight = Math.round(iconsSizeFactor * iconHeight);
                                iconWidth = iconTexture.w * iconHeight / iconTexture.h;
                            } else if (!hIconKnown) {
                                iconWidth = Math.round(iconsSizeFactor * iconWidth);
                                iconHeight = iconTexture.h * iconWidth / iconTexture.w;
                            } else {
                                iconWidth = Math.round(iconsSizeFactor * iconWidth);
                                iconHeight = Math.round(iconsSizeFactor * iconHeight);
                            }
                            wIcon = iconWidth / viewport.w;
                            wIconPlusSpacing = wIcon + wSpacing;
                        } else if (iconTexture !== null) {
                            iconTextures[event.labelIcon] = null;
                            var image = new Image();
                            image.onload = function(url, img) {
                                return function() {
                                    var wImage = img.naturalWidth;
                                    var hImage = img.naturalHeight;
                                    iconTextures[url] = new Webglimpse.Texture2D(wImage, hImage, Webglimpse.GL.LINEAR, Webglimpse.GL.LINEAR, function(g) {
                                        g.drawImage(img, 0, 0);
                                    });
                                    drawable.redraw();
                                };
                            }(event.labelIcon, image);
                            image.src = event.labelIcon;
                        }
                    }
                    // NOTE: With extendBeyondBar=true, we detect when there is insufficient space between the current event
                    //       and those to either side to display the text + icon. However, if one event has right aligned text
                    //       and the other has left aligned text, so both text labels overlap into the same space between the
                    //       events, we don't currently try to detect that.
                    // Determine whether there is enough space to display both text and icon, or only icon, or neither
                    // coordinates of the start edge of the icon + label
                    var xStartLabel = xStart + wLeftIndent - (wSpacing + wIcon + wText) * labelHPos + wTotal * labelHAlign;
                    // coordinates of the end edge of the icon + label
                    var xEndLabel = xStartLabel + (wSpacing + wIcon + wText);
                    // adjust xStartLabel and xEndLabel if they fall off the screen
                    if (xStartLabel < xLeftMin) {
                        xStartLabel = xLeftMin;
                        xEndLabel = xStartLabel + (wSpacing + wIcon + wText);
                    } else if (xEndLabel > xRightMax) {
                        xEndLabel = xRightMax;
                        xStartLabel = xEndLabel - (wSpacing + wIcon + wText);
                    }
                    if (textMode === "truncate") {
                        var labelText = event.label;
                        while (!!labelText && labelText !== "...") {
                            if (xEndLabel > xRight || xStartLabel < xLeft) {
                                // there is not enough room for the text, begin truncating the text
                                labelText = labelText.substring(0, labelText.length - 4).concat("...");
                                var calculatedTextWidth = calculateTextWidth(textEnabled, labelText, event.fgColor, textDefaultColor, textTextures, viewport);
                                wText = calculatedTextWidth.wText;
                                textTexture = calculatedTextWidth.textTexture;
                                xStartLabel = xStart + wLeftIndent - (wSpacing + wIcon + wText) * labelHPos + wTotal * labelHAlign;
                                // coordinates of the end edge of the icon + label
                                xEndLabel = xStartLabel + (wSpacing + wIcon + wText);
                                // adjust xStartLabel and xEndLabel if they fall off the screen
                                if (xStartLabel < xLeftMin) {
                                    xStartLabel = xLeftMin;
                                    xEndLabel = xStartLabel + (wSpacing + wIcon + wText);
                                } else if (xEndLabel > xRightMax) {
                                    xEndLabel = xRightMax;
                                    xStartLabel = xEndLabel - (wSpacing + wIcon + wText);
                                }
                            } else {
                                break;
                            }
                        }
                        if (!labelText || labelText === "...") {
                            wText = 0;
                            textTexture = null;
                        }
                    } else if (textMode === "show") {
                        if (xEndLabel > xRight || xStartLabel < xLeft) {
                            // there is not enough room for the text, try with just the icon
                            wText = 0;
                            textTexture = null;
                            // coordinates of the start edge of the icon + label
                            var xStartLabel = xStart + wLeftIndent - wIcon * labelHPos + wTotal * labelHAlign;
                            // coordinates of the end edge of the icon + label
                            var xEndLabel = xStartLabel + wIcon;
                            // adjust xStartLabel and xEndLabel if they fall off the screen
                            if (xStartLabel < xLeftMin) {
                                xStartLabel = xLeftMin;
                                xEndLabel = xStartLabel + wIcon;
                            } else if (xEndLabel > xRightMax) {
                                xEndLabel = xRightMax;
                                xStartLabel = xEndLabel - wIcon;
                            }
                            // if there is still not enough room, don't show anything
                            if (xEndLabel > xRight || xStartLabel < xLeft) {
                                wIcon = 0;
                                iconTexture = null;
                            }
                        }
                    }
                    // Icons
                    if (Webglimpse.hasval(iconTexture)) {
                        // coordinates of the start edge of the icon + label
                        var xStartLabel = xStart + wLeftIndent - (wSpacing + wIcon + wText) * labelHPos + wTotal * labelHAlign;
                        // coordinates of the end edge of the icon + label
                        var xEndLabel = xStartLabel + (wSpacing + wIcon + wText);
                        if (xStartLabel < xLeftMin) {
                            textureRenderer.draw(gl, iconTexture, xLeftMin, yFrac, {
                                xAnchor: 0,
                                yAnchor: labelVPos,
                                width: iconWidth,
                                height: iconHeight
                            });
                        } else if (xEndLabel > xRightMax) {
                            textureRenderer.draw(gl, iconTexture, xRightMax - wSpacing - wText, yFrac, {
                                xAnchor: 1,
                                yAnchor: labelVPos,
                                width: iconWidth,
                                height: iconHeight
                            });
                        } else {
                            var xFrac = xStart + wLeftIndent - (wSpacing + wText) * labelHPos + wTotal * labelHAlign;
                            textureRenderer.draw(gl, iconTexture, xFrac, yFrac, {
                                xAnchor: labelHPos,
                                yAnchor: labelVPos,
                                width: iconWidth,
                                height: iconHeight
                            });
                        }
                    }
                    // Text
                    if (Webglimpse.hasval(textTexture)) {
                        // coordinates of the start edge of the icon + label
                        var xStartLabel = xStart + wLeftIndent - (wSpacing + wIcon + wText) * labelHPos + wTotal * labelHAlign;
                        // coordinates of the end edge of the icon + label
                        var xEndLabel = xStartLabel + (wSpacing + wIcon + wText);
                        if (xStartLabel < xLeftMin) {
                            textureRenderer.draw(gl, textTexture, xLeftMin + wSpacing + wIcon, yFrac, {
                                xAnchor: 0,
                                yAnchor: textTexture.yAnchor(labelVPos)
                            });
                        } else if (xEndLabel > xRightMax) {
                            textureRenderer.draw(gl, textTexture, xRightMax, yFrac, {
                                xAnchor: 1,
                                yAnchor: textTexture.yAnchor(labelVPos)
                            });
                        } else {
                            var xFrac = xStart + wLeftIndent + wIconPlusSpacing * (1 - labelHPos) + wTotal * labelHAlign;
                            textureRenderer.draw(gl, textTexture, xFrac, yFrac, {
                                xAnchor: labelHPos,
                                yAnchor: textTexture.yAnchor(labelVPos)
                            });
                        }
                    }
                }
            }
        };
    }
    function newEventLabelsPainterFactory(labelOpts) {
        // Painter Factory
        return function(drawable, timeAxis, lanes, ui, options) {
            var helper = eventLabelsPainterHelper(labelOpts, drawable, timeAxis, lanes, ui, options);
            // Painter
            return function(gl, viewport) {
                gl.blendFuncSeparate(Webglimpse.GL.SRC_ALPHA, Webglimpse.GL.ONE_MINUS_SRC_ALPHA, Webglimpse.GL.ONE, Webglimpse.GL.ONE_MINUS_SRC_ALPHA);
                gl.enable(Webglimpse.GL.BLEND);
                helper.textTextures.resetTouches();
                helper.textureRenderer.begin(gl, viewport);
                for (var l = 0; l < lanes.length; l++) {
                    var lane = lanes.lane(l);
                    for (var e = 0; e < lane.length; e++) {
                        helper.paintEvent(l, e, gl, viewport);
                    }
                }
                helper.textureRenderer.end(gl);
                helper.textTextures.retainTouched();
            };
        };
    }
    Webglimpse.newEventLabelsPainterFactory = newEventLabelsPainterFactory;
    function eventBarPainterHelper(barOpts, drawable, timeAxis, lanes, ui, options) {
        var rowTopPadding = options.rowTopPadding;
        var rowBottomPadding = options.rowBottomPadding;
        var laneHeight = options.laneHeight;
        var topMargin = Webglimpse.hasval(barOpts) && Webglimpse.hasval(barOpts.topMargin) ? barOpts.topMargin : 1.2;
        var bottomMargin = Webglimpse.hasval(barOpts) && Webglimpse.hasval(barOpts.bottomMargin) ? barOpts.bottomMargin : 1.2;
        var borderThickness = Webglimpse.hasval(barOpts) && Webglimpse.hasval(barOpts.borderThickness) ? barOpts.borderThickness : 2;
        var cornerType = Webglimpse.hasval(barOpts) && Webglimpse.hasval(barOpts.cornerType) ? barOpts.cornerType : 0;
        var defaultColor = Webglimpse.hasval(barOpts) && Webglimpse.hasval(barOpts.defaultColor) ? barOpts.defaultColor : options.timelineFgColor.withAlphaTimes(.4);
        var defaultBorderColor = Webglimpse.hasval(barOpts) && Webglimpse.hasval(barOpts.defaultBorderColor) ? barOpts.defaultBorderColor : null;
        var selectedBorderColor = Webglimpse.hasval(barOpts) && Webglimpse.hasval(barOpts.selectedBorderColor) ? barOpts.selectedBorderColor : options.timelineFgColor;
        var minimumVisibleWidth = Webglimpse.hasval(barOpts) && Webglimpse.hasval(barOpts.minimumVisibleWidth) ? barOpts.minimumVisibleWidth : 0;
        var selection = ui.selection;
        var xyFrac_vColor_VERTSHADER = Webglimpse.concatLines("                                                                ", "  attribute vec2 a_XyFrac;                                      ", "  attribute vec4 a_Color;                                       ", "                                                                ", "  varying vec4 v_Color;                                         ", "                                                                ", "  void main( ) {                                                ", "      gl_Position = vec4( ( -1.0 + 2.0*a_XyFrac ), 0.0, 1.0 );  ", "      v_Color = a_Color;                                        ", "  }                                                             ", "                                                                ");
        var program = new Webglimpse.Program(xyFrac_vColor_VERTSHADER, Webglimpse.varyingColor_FRAGSHADER);
        var a_XyFrac = new Webglimpse.Attribute(program, "a_XyFrac");
        var a_Color = new Webglimpse.Attribute(program, "a_Color");
        var xys = new Float32Array(0);
        var xysBuffer = Webglimpse.newDynamicBuffer();
        var rgbas = new Float32Array(0);
        var rgbasBuffer = Webglimpse.newDynamicBuffer();
        return {
            paint: function(indexXys, indexRgbas, gl, viewport) {
                if (indexXys == 0 || indexRgbas == 0) return;
                gl.blendFuncSeparate(Webglimpse.GL.SRC_ALPHA, Webglimpse.GL.ONE_MINUS_SRC_ALPHA, Webglimpse.GL.ONE, Webglimpse.GL.ONE_MINUS_SRC_ALPHA);
                gl.enable(Webglimpse.GL.BLEND);
                program.use(gl);
                xysBuffer.setData(xys.subarray(0, indexXys));
                a_XyFrac.setDataAndEnable(gl, xysBuffer, 2, Webglimpse.GL.FLOAT);
                rgbasBuffer.setData(rgbas.subarray(0, indexRgbas));
                a_Color.setDataAndEnable(gl, rgbasBuffer, 4, Webglimpse.GL.FLOAT);
                gl.drawArrays(Webglimpse.GL.TRIANGLES, 0, Math.floor(indexXys / 2));
                a_Color.disable(gl);
                a_XyFrac.disable(gl);
                program.endUse(gl);
            },
            ensureCapacity: function(eventCount) {
                var numVertices;
                switch (cornerType) {
                  case 0:
                    numVertices = (6 * 5 + 3 * 4) * eventCount;
                    break;

                  default:
                    numVertices = 6 * 5 * eventCount;
                    break;
                }
                xys = Webglimpse.ensureCapacityFloat32(xys, 2 * numVertices);
                rgbas = Webglimpse.ensureCapacityFloat32(rgbas, 4 * numVertices);
            },
            fillEvent: function(laneIndex, eventIndex, indexXys, indexRgbas, viewport) {
                var lane = lanes.lane(laneIndex);
                var event = lane.event(eventIndex);
                var wBorder = borderThickness / viewport.w;
                var hBorder = borderThickness / viewport.h;
                var _topMargin = Webglimpse.hasval(event.topMargin) ? event.topMargin : topMargin;
                var _bottomMargin = Webglimpse.hasval(event.bottomMargin) ? event.bottomMargin : bottomMargin;
                var jTop = rowTopPadding + laneIndex * laneHeight + _topMargin;
                var yTop = (viewport.h - jTop) / viewport.h;
                var jBottom = rowTopPadding + (laneIndex + 1) * laneHeight - _bottomMargin;
                var yBottom = (viewport.h - jBottom) / viewport.h;
                var xLeft = timeAxis.tFrac(event.start_PMILLIS);
                var xRight = timeAxis.tFrac(event.end_PMILLIS);
                var xWidthPixels = viewport.w * (xRight - xLeft);
                if (!(xRight < 0 || xLeft > 1) && xWidthPixels > minimumVisibleWidth) {
                    // Fill
                    var fillColor = event.bgColor || defaultColor;
                    if (event === selection.hoveredEvent.value) {
                        fillColor = Webglimpse.darker(fillColor, .8);
                    }
                    indexXys = Webglimpse.putQuadXys(xys, indexXys, xLeft + wBorder, xRight - wBorder, yTop - hBorder, yBottom + hBorder);
                    indexRgbas = Webglimpse.putQuadRgbas(rgbas, indexRgbas, fillColor);
                    // Border
                    var borderColor = event.borderColor || (event.bgColor ? fillColor : null) || defaultBorderColor || fillColor;
                    if (selection.selectedEvents.hasValue(event)) {
                        borderColor = selectedBorderColor;
                    }
                    if (borderColor) {
                        switch (cornerType) {
                          case 0:
                            // Quads
                            indexXys = Webglimpse.putQuadXys(xys, indexXys, xLeft, xLeft + wBorder, yTop - hBorder, yBottom + hBorder);
                            indexXys = Webglimpse.putQuadXys(xys, indexXys, xRight - wBorder, xRight, yTop - hBorder, yBottom + hBorder);
                            indexXys = Webglimpse.putQuadXys(xys, indexXys, xLeft + wBorder, xRight - wBorder, yTop, yTop - hBorder);
                            indexXys = Webglimpse.putQuadXys(xys, indexXys, xLeft + wBorder, xRight - wBorder, yBottom + hBorder, yBottom);
                            indexRgbas = Webglimpse.putRgbas(rgbas, indexRgbas, borderColor, 24);
                            // Triangles
                            indexXys = Webglimpse.putLowerLeftTriangleXys(xys, indexXys, xRight - wBorder, xRight, yTop, yTop - hBorder);
                            indexXys = Webglimpse.putUpperLeftTriangleXys(xys, indexXys, xRight - wBorder, xRight, yBottom + hBorder, yBottom);
                            indexXys = Webglimpse.putUpperRightTriangleXys(xys, indexXys, xLeft, xLeft + wBorder, yBottom + hBorder, yBottom);
                            indexXys = Webglimpse.putLowerRightTriangleXys(xys, indexXys, xLeft, xLeft + wBorder, yTop, yTop - hBorder);
                            indexRgbas = Webglimpse.putRgbas(rgbas, indexRgbas, borderColor, 12);
                            break;

                          default:
                            indexXys = Webglimpse.putQuadXys(xys, indexXys, xLeft, xRight - wBorder, yTop, yTop - hBorder);
                            indexXys = Webglimpse.putQuadXys(xys, indexXys, xRight - wBorder, xRight, yTop, yBottom + hBorder);
                            indexXys = Webglimpse.putQuadXys(xys, indexXys, xLeft + wBorder, xRight, yBottom + hBorder, yBottom);
                            indexXys = Webglimpse.putQuadXys(xys, indexXys, xLeft, xLeft + wBorder, yTop - hBorder, yBottom);
                            indexRgbas = Webglimpse.putRgbas(rgbas, indexRgbas, borderColor, 24);
                            break;
                        }
                    }
                }
                return {
                    indexXys: indexXys,
                    indexRgbas: indexRgbas
                };
            }
        };
    }
    function newEventBarsPainterFactory(barOpts) {
        // Painter Factory
        return function(drawable, timeAxis, lanes, ui, options) {
            var helper = eventBarPainterHelper(barOpts, drawable, timeAxis, lanes, ui, options);
            // Painter
            return function(gl, viewport) {
                helper.ensureCapacity(lanes.numEvents);
                var indexXys = 0;
                var indexRgbas = 0;
                for (var l = 0; l < lanes.length; l++) {
                    var lane = lanes.lane(l);
                    for (var e = 0; e < lane.length; e++) {
                        var event = lane.event(e);
                        var indexes = helper.fillEvent(l, e, indexXys, indexRgbas, viewport);
                        indexXys = indexes.indexXys;
                        indexRgbas = indexes.indexRgbas;
                    }
                }
                helper.paint(indexXys, indexRgbas, gl, viewport);
            };
        };
    }
    Webglimpse.newEventBarsPainterFactory = newEventBarsPainterFactory;
    function newCombinedEventPainterFactory(barOpts, labelOpts, iconOpts) {
        // Painter Factory
        return function(drawable, timeAxis, lanes, ui, options) {
            var labelHelper = eventLabelsPainterHelper(labelOpts, drawable, timeAxis, lanes, ui, options);
            var iconHelper = eventIconsPainterHelper(iconOpts, drawable, timeAxis, lanes, ui, options);
            var barHelper = eventStripedBarPainterHelper(barOpts, drawable, timeAxis, lanes, ui, options);
            var dashedHelper = eventDashedBorderPainterHelper(barOpts, drawable, timeAxis, lanes, ui, options);
            // Painter
            return function(gl, viewport) {
                gl.blendFuncSeparate(Webglimpse.GL.SRC_ALPHA, Webglimpse.GL.ONE_MINUS_SRC_ALPHA, Webglimpse.GL.ONE, Webglimpse.GL.ONE_MINUS_SRC_ALPHA);
                gl.enable(Webglimpse.GL.BLEND);
                for (var l = 0; l < lanes.length; l++) {
                    var lane = lanes.lane(l);
                    for (var e = 0; e < lane.length; e++) {
                        // draw bar
                        barHelper.ensureCapacity(1);
                        var indexes = barHelper.fillEvent(l, e, 0, 0, viewport, 0, 0);
                        var dashedIndexes = dashedHelper.fillEvent(l, e, 0, 0, viewport, 0);
                        barHelper.paint(indexes.indexXys, indexes.indexRgbas, gl, viewport, indexes.indexRelativeXys, indexes.indexFillPattern);
                        dashedHelper.paint(dashedIndexes.indexXys, dashedIndexes.indexRgbas, gl, viewport, dashedIndexes.indexLengthSoFar);
                        // draw label
                        labelHelper.textTextures.resetTouches();
                        labelHelper.textureRenderer.begin(gl, viewport);
                        labelHelper.paintEvent(l, e, gl, viewport);
                        labelHelper.textureRenderer.end(gl);
                        labelHelper.textTextures.retainTouched();
                        // draw icon
                        iconHelper.textureRenderer.begin(gl, viewport);
                        iconHelper.paintEvent(l, e, gl, viewport);
                        iconHelper.textureRenderer.end(gl);
                    }
                }
            };
        };
    }
    Webglimpse.newCombinedEventPainterFactory = newCombinedEventPainterFactory;
})(Webglimpse || (Webglimpse = {}));

var Webglimpse;

(function(Webglimpse) {
    function newTimeseriesRowPaneFactory(rowOptions) {
        return function(drawable, timeAxis, dataAxis, model, row, ui, options) {
            var rowTopPadding = Webglimpse.hasval(rowOptions) && Webglimpse.hasval(rowOptions.rowTopPadding) ? rowOptions.rowTopPadding : 6;
            var rowBottomPadding = Webglimpse.hasval(rowOptions) && Webglimpse.hasval(rowOptions.rowBottomPadding) ? rowOptions.rowBottomPadding : 6;
            var axisWidth = Webglimpse.hasval(rowOptions) && Webglimpse.hasval(rowOptions.axisWidth) ? rowOptions.axisWidth : 60;
            var painterFactories = Webglimpse.hasval(rowOptions) && Webglimpse.hasval(rowOptions.painterFactories) ? rowOptions.painterFactories : [];
            var axisOptions = Webglimpse.hasval(rowOptions) && Webglimpse.hasval(rowOptions.axisOptions) ? rowOptions.axisOptions : {};
            var keyPrefix = options.isMaximized ? "maximized-" : "";
            var getRowHeight = function() {
                // maximized rows do not specifiy a height (they should fill available space)
                if (options.isMaximized) {
                    return null;
                } else if (Webglimpse.hasval(row.rowHeight)) {
                    return row.rowHeight;
                } else if (Webglimpse.hasval(rowOptions) && Webglimpse.hasval(rowOptions.rowHeight)) {
                    return rowOptions.rowHeight;
                } else {
                    return 135;
                }
            };
            var rowHeight = getRowHeight();
            var timelineFont = options.timelineFont;
            var timelineFgColor = options.timelineFgColor;
            var draggableEdgeWidth = options.draggableEdgeWidth;
            var snapToDistance = options.snapToDistance;
            var rowUi = ui.rowUi(row.rowGuid);
            var input = ui.input;
            var selection = ui.selection;
            if (!Webglimpse.hasval(axisOptions.font)) axisOptions.font = timelineFont;
            if (!Webglimpse.hasval(axisOptions.tickColor)) axisOptions.tickColor = timelineFgColor;
            if (!Webglimpse.hasval(axisOptions.textColor)) axisOptions.textColor = timelineFgColor;
            if (!Webglimpse.hasval(axisOptions.showLabel)) axisOptions.showLabel = true;
            if (!Webglimpse.hasval(axisOptions.shortenLabels)) axisOptions.shortenLabels = false;
            var redraw = function() {
                drawable.redraw();
            };
            // setup pane for data (y) axis painter and mouse listener
            var yAxisPane = new Webglimpse.Pane({
                updatePrefSize: Webglimpse.fixedSize(axisWidth, rowHeight)
            });
            dataAxis.limitsChanged.on(redraw);
            Webglimpse.attachAxisMouseListeners1D(yAxisPane, dataAxis, true);
            // add listener to update the height of the row if the rowHeight attribute changes
            var updateRowHeight = function() {
                yAxisPane.layout = {
                    updatePrefSize: Webglimpse.fixedSize(axisWidth, getRowHeight())
                };
            };
            row.attrsChanged.on(updateRowHeight);
            var isDragMode = function(viewport, i, j) {
                var fragment = getNearestFragment(viewport, i, j).fragment;
                return Webglimpse.hasval(fragment);
            };
            var rowContentPane = new Webglimpse.Pane(Webglimpse.newColumnLayout(), true, isDragMode);
            var underlayPane = new Webglimpse.Pane(Webglimpse.newOverlayLayout(), false);
            var overlayPane = new Webglimpse.Pane(null, false);
            var painterOptions = {
                timelineFont: timelineFont,
                timelineFgColor: timelineFgColor,
                timelineThickness: 1,
                rowTopPadding: rowTopPadding,
                rowBottomPadding: rowBottomPadding
            };
            for (var n = 0; n < painterFactories.length; n++) {
                var createPainter = painterFactories[n];
                rowContentPane.addPainter(createPainter(drawable, timeAxis, dataAxis, model, row, ui, painterOptions));
            }
            yAxisPane.addPainter(Webglimpse.newEdgeAxisPainter(dataAxis, 2, axisOptions));
            rowContentPane.addPane(yAxisPane, 0);
            underlayPane.addPane(rowContentPane, true);
            underlayPane.addPane(overlayPane, false);
            rowUi.addPane(keyPrefix + "content", rowContentPane);
            rowUi.addPane(keyPrefix + "overlay", overlayPane);
            rowUi.addPane(keyPrefix + "underlay", underlayPane);
            rowUi.addPane(keyPrefix + "y-axis", yAxisPane);
            row.timeseriesGuids.valueAdded.on(redraw);
            row.timeseriesGuids.valueMoved.on(redraw);
            row.timeseriesGuids.valueRemoved.on(redraw);
            var addFragmentRedraw = function(fragmentGuid) {
                var fragment = model.timeseriesFragment(fragmentGuid);
                fragment.dataChanged.on(redraw);
            };
            var removeFragmentRedraw = function(fragmentGuid) {
                var fragment = model.timeseriesFragment(fragmentGuid);
                fragment.dataChanged.off(redraw);
            };
            var addRedraw = function(timeseriesGuid) {
                var timeseries = model.timeseries(timeseriesGuid);
                timeseries.attrsChanged.on(redraw);
                timeseries.fragmentGuids.valueAdded.on(redraw);
                timeseries.fragmentGuids.valueRemoved.on(redraw);
                timeseries.fragmentGuids.forEach(addFragmentRedraw);
                timeseries.fragmentGuids.valueAdded.on(addFragmentRedraw);
                timeseries.fragmentGuids.valueRemoved.on(removeFragmentRedraw);
            };
            row.timeseriesGuids.forEach(addRedraw);
            row.timeseriesGuids.valueAdded.on(addRedraw);
            var removeRedraw = function(timeseriesGuid) {
                var timeseries = model.timeseries(timeseriesGuid);
                timeseries.attrsChanged.off(redraw);
                timeseries.fragmentGuids.valueAdded.off(redraw);
                timeseries.fragmentGuids.valueRemoved.off(redraw);
                timeseries.fragmentGuids.forEach(removeFragmentRedraw);
            };
            row.timeseriesGuids.valueRemoved.on(removeRedraw);
            var timeAtCoords_PMILLIS = function(viewport, i) {
                return timeAxis.tAtFrac_PMILLIS(viewport.xFrac(i));
            };
            var timeAtPointer_PMILLIS = function(ev) {
                return timeAtCoords_PMILLIS(ev.paneViewport, ev.i);
            };
            // Used by both sets of listeners to know whether a timeseries-drag is in progress
            var timeseriesDragMode = null;
            // Hook up input notifications
            //
            var recentMouseMove = null;
            rowContentPane.mouseMove.on(function(ev) {
                input.mouseMove.fire(ev);
                if (!Webglimpse.hasval(timeseriesDragMode)) {
                    input.timeHover.fire(timeAtPointer_PMILLIS(ev), ev);
                    input.rowHover.fire(row, ev);
                }
                recentMouseMove = ev;
            });
            rowContentPane.mouseExit.on(function(ev) {
                input.mouseExit.fire(ev);
                if (!Webglimpse.hasval(timeseriesDragMode)) {
                    input.timeHover.fire(null, ev);
                    input.rowHover.fire(null, ev);
                    input.eventHover.fire(null, ev);
                }
                recentMouseMove = null;
            });
            var uiMillisPerPxChanged = function() {
                if (!Webglimpse.hasval(timeseriesDragMode) && recentMouseMove != null) {
                    var ev = recentMouseMove;
                    input.timeHover.fire(timeAtPointer_PMILLIS(ev), ev);
                }
            };
            ui.millisPerPx.changed.on(uiMillisPerPxChanged);
            rowContentPane.mouseUp.on(function(ev) {
                input.mouseUp.fire(ev);
            });
            rowContentPane.mouseDown.on(function(ev) {
                input.mouseDown.fire(ev);
            });
            rowContentPane.mouseWheel.on(options.mouseWheelListener);
            rowContentPane.contextMenu.on(function(ev) {
                input.contextMenu.fire(ev);
            });
            // Begin annotation selection
            //
            var getNearestAnnotation = function(viewport, i, j) {
                // maximum number of pixels away from a point the mouse can be to select it
                var pickBuffer_PIXEL = 10;
                // value per pixel in x and y directions
                var vppx = ui.millisPerPx.value;
                var vppy = dataAxis.vSize / rowContentPane.viewport.h;
                var pickBuffer_PMILLIS = pickBuffer_PIXEL * vppx;
                var ev_time = timeAtCoords_PMILLIS(viewport, i);
                var ev_value = dataAxis.vAtFrac(viewport.yFrac(j));
                var bestAnnotation = null;
                var best_PIXEL = null;
                if (ev_time) {
                    for (var i = 0; i < row.annotationGuids.length; i++) {
                        var annotationGuid = row.annotationGuids.valueAt(i);
                        var annotation = model.annotation(annotationGuid);
                        var styleGuid = annotation.styleGuid;
                        var style = ui.annotationStyle(styleGuid);
                        var dy_PIXEL = Math.abs(annotation.y - ev_value) / vppy;
                        var dx_PIXEL = Math.abs(annotation.time_PMILLIS - ev_time) / vppx;
                        if (style.uiHint == "point") {
                            var d_PIXEL = Math.sqrt(dx_PIXEL * dx_PIXEL + dy_PIXEL * dy_PIXEL);
                        } else if (style.uiHint == "horizontal-line") {
                            var d_PIXEL = dy_PIXEL;
                        } else if (style.uiHint == "vertical-line") {
                            var d_PIXEL = dx_PIXEL;
                        }
                        if (d_PIXEL < pickBuffer_PIXEL) {
                            if (!Webglimpse.hasval(best_PIXEL) || d_PIXEL < best_PIXEL) {
                                bestAnnotation = annotation;
                                best_PIXEL = d_PIXEL;
                            }
                        }
                    }
                }
                return bestAnnotation;
            };
            var getNearestAnnotationEvent = function(ev) {
                return getNearestAnnotation(ev.paneViewport, ev.i, ev.j);
            };
            overlayPane.mouseMove.on(function(ev) {
                // update selection.hoveredYValue
                var y = dataAxis.vAtFrac(Webglimpse.yFrac(ev));
                selection.hoveredY.value = y;
                // update selection.hoveredAnnotation
                var result = getNearestAnnotationEvent(ev);
                selection.hoveredAnnotation.value = result;
            });
            selection.hoveredAnnotation.changed.on(redraw);
            overlayPane.mouseExit.on(function() {
                selection.hoveredY.value = undefined;
                selection.hoveredAnnotation.value = null;
            });
            // Begin timeseries-drag
            //
            function chooseTimeseriesDragMode(ui, hoveredTimeseriesFragment) {
                if (!Webglimpse.hasval(hoveredTimeseriesFragment)) {
                    return null;
                } else {
                    return hoveredTimeseriesFragment.userEditMode;
                }
            }
            var updateCursor = function() {
                if (!timeseriesDragMode) {
                    var mouseCursors = {
                        xy: "move",
                        y: "ns-resize"
                    };
                    rowContentPane.mouseCursor = mouseCursors[chooseTimeseriesDragMode(ui, selection.hoveredTimeseries.fragment)];
                }
            };
            ui.millisPerPx.changed.on(updateCursor);
            selection.hoveredTimeseries.changed.on(updateCursor);
            var getNearestFragment = function(viewport, i, j) {
                // maximum number of pixels away from a point the mouse can be to select it
                var pickBuffer_PIXEL = 10;
                // value per pixel in x and y directions
                var vppx = ui.millisPerPx.value;
                var vppy = dataAxis.vSize / rowContentPane.viewport.h;
                var pickBuffer_PMILLIS = pickBuffer_PIXEL * vppx;
                var bestFragment;
                var bestIndex;
                var best_PIXEL;
                var ev_time = timeAtCoords_PMILLIS(viewport, i);
                var ev_value = dataAxis.vAtFrac(viewport.yFrac(j));
                if (ev_time) {
                    for (var i = 0; i < row.timeseriesGuids.length; i++) {
                        var timeseriesGuid = row.timeseriesGuids.valueAt(i);
                        var timeseries = model.timeseries(timeseriesGuid);
                        for (var j = 0; j < timeseries.fragmentGuids.length; j++) {
                            var fragmentGuid = timeseries.fragmentGuids.valueAt(j);
                            var fragment = model.timeseriesFragment(fragmentGuid);
                            // fragments should not overlap
                            if (fragment.start_PMILLIS - pickBuffer_PMILLIS < ev_time && fragment.end_PMILLIS + pickBuffer_PMILLIS > ev_time) {
                                // bars are drawn starting at the point and continuing to the next point, so we need to choose the closest index differently
                                var index = timeseries.uiHint == "bars" ? Webglimpse.indexAtOrBefore(fragment.times_PMILLIS, ev_time) : Webglimpse.indexNearest(fragment.times_PMILLIS, ev_time);
                                var value = fragment.data[index];
                                var time = fragment.times_PMILLIS[index];
                                var dy_PIXEL = (value - ev_value) / vppy;
                                var dx_PIXEL = (time - ev_time) / vppx;
                                var d_PIXEL = Math.sqrt(dx_PIXEL * dx_PIXEL + dy_PIXEL * dy_PIXEL);
                                var filter = function() {
                                    if (timeseries.uiHint == "bars") {
                                        return timeseries.baseline < ev_value && ev_value < value || timeseries.baseline > ev_value && ev_value > value;
                                    } else {
                                        return d_PIXEL < pickBuffer_PIXEL;
                                    }
                                };
                                if ((!best_PIXEL || d_PIXEL < best_PIXEL) && filter()) {
                                    best_PIXEL = d_PIXEL;
                                    bestFragment = fragment;
                                    bestIndex = index;
                                }
                            }
                        }
                    }
                }
                return {
                    fragment: bestFragment,
                    index: bestIndex
                };
            };
            var getNearestFragmentEvent = function(ev) {
                return getNearestFragment(ev.paneViewport, ev.i, ev.j);
            };
            // choose the closest data point to the mouse cursor position and fire an event when it changes
            rowContentPane.mouseMove.on(function(ev) {
                if (!Webglimpse.hasval(timeseriesDragMode)) {
                    var result = getNearestFragmentEvent(ev);
                    selection.hoveredTimeseries.setValue(result.fragment, result.index);
                }
            });
            selection.hoveredTimeseries.changed.on(redraw);
            rowContentPane.mouseExit.on(function() {
                selection.hoveredTimeseries.clearValue();
            });
            rowContentPane.mouseDown.on(function(ev) {
                if (Webglimpse.isLeftMouseDown(ev.mouseEvent)) {
                    timeseriesDragMode = chooseTimeseriesDragMode(ui, selection.hoveredTimeseries.fragment);
                }
            });
            rowContentPane.mouseMove.on(function(ev) {
                if (Webglimpse.hasval(timeseriesDragMode)) {
                    var x = timeAtPointer_PMILLIS(ev);
                    var y = dataAxis.vAtFrac(Webglimpse.yFrac(ev));
                    var fragment = selection.hoveredTimeseries.fragment;
                    var fragment_time = fragment.times_PMILLIS;
                    if (timeseriesDragMode === "y") {
                        fragment.setData(selection.hoveredTimeseries.index, y);
                    } else if (timeseriesDragMode === "xy") {
                        var index = fragment.setData(selection.hoveredTimeseries.index, y, x);
                        if (index !== selection.hoveredTimeseries.index) {
                            selection.hoveredTimeseries.setValue(fragment, index);
                        }
                    }
                }
            });
            // Finish event-drag
            //
            rowContentPane.mouseUp.on(function(ev) {
                timeseriesDragMode = null;
            });
            rowContentPane.dispose.on(function() {
                rowUi.removePane(keyPrefix + "content");
                rowUi.removePane(keyPrefix + "overlay");
                rowUi.removePane(keyPrefix + "underlay");
                rowUi.removePane(keyPrefix + "y-axis");
                dataAxis.limitsChanged.off(redraw);
                row.timeseriesGuids.valueAdded.off(redraw);
                row.timeseriesGuids.valueMoved.off(redraw);
                row.timeseriesGuids.valueRemoved.off(redraw);
                row.timeseriesGuids.valueAdded.off(addRedraw);
                row.timeseriesGuids.valueRemoved.off(removeRedraw);
                selection.hoveredTimeseries.changed.off(redraw);
                row.attrsChanged.off(updateRowHeight);
                row.timeseriesGuids.forEach(function(timeseriesGuid) {
                    var timeseries = model.timeseries(timeseriesGuid);
                    timeseries.attrsChanged.off(redraw);
                    timeseries.fragmentGuids.valueAdded.off(redraw);
                    timeseries.fragmentGuids.valueRemoved.off(redraw);
                });
            });
            return underlayPane;
        };
    }
    Webglimpse.newTimeseriesRowPaneFactory = newTimeseriesRowPaneFactory;
    function newTimeseriesPainterFactory(options) {
        // Painter Factory
        return function(drawable, timeAxis, dataAxis, model, rowModel, ui) {
            var selection = ui.selection;
            var defaultColor = Webglimpse.hasval(options) && Webglimpse.hasval(options.timelineFgColor) ? options.timelineFgColor : Webglimpse.white;
            var defaultThickness = Webglimpse.hasval(options) && Webglimpse.hasval(options.timelineThickness) ? options.timelineThickness : 1;
            var modelview_pointsize_VERTSHADER = Webglimpse.concatLines("    uniform mat4 u_modelViewMatrix;                       ", "    attribute vec4 a_Position;                            ", "    uniform float u_PointSize;                            ", "                                                          ", "    void main( ) {                                        ", "        gl_PointSize = u_PointSize ;                      ", "        gl_Position = u_modelViewMatrix * a_Position ;    ", "    }                                                     ", "                                                          ");
            var program = new Webglimpse.Program(modelview_pointsize_VERTSHADER, Webglimpse.solid_FRAGSHADER);
            var u_Color = new Webglimpse.UniformColor(program, "u_Color");
            var u_modelViewMatrix = new Webglimpse.UniformMatrix4f(program, "u_modelViewMatrix");
            var a_Position = new Webglimpse.Attribute(program, "a_Position");
            var u_PointSize = new Webglimpse.Uniform1f(program, "u_PointSize");
            var axis = new Webglimpse.Axis2D(timeAxis, dataAxis);
            var xys = new Float32Array(0);
            var xysBuffer = Webglimpse.newDynamicBuffer();
            // Painter
            return function(gl, viewport) {
                gl.blendFuncSeparate(Webglimpse.GL.SRC_ALPHA, Webglimpse.GL.ONE_MINUS_SRC_ALPHA, Webglimpse.GL.ONE, Webglimpse.GL.ONE_MINUS_SRC_ALPHA);
                gl.enable(Webglimpse.GL.BLEND);
                // enable the shader
                program.use(gl);
                u_modelViewMatrix.setData(gl, Webglimpse.glOrthoAxis(axis));
                for (var i = 0; i < rowModel.timeseriesGuids.length; i++) {
                    // collect fragments and sort them by time
                    var totalSize = 0;
                    var sortedFragments = new Array();
                    var timeseriesGuid = rowModel.timeseriesGuids.valueAt(i);
                    var timeseries = model.timeseries(timeseriesGuid);
                    for (var j = 0; j < timeseries.fragmentGuids.length; j++) {
                        var timeseriesFragmentGuid = timeseries.fragmentGuids.valueAt(j);
                        var fragment = model.timeseriesFragment(timeseriesFragmentGuid);
                        sortedFragments.push(fragment);
                        totalSize += fragment.times_PMILLIS.length;
                    }
                    sortedFragments.sort(function(a, b) {
                        return a.start_PMILLIS - b.start_PMILLIS;
                    });
                    if (timeseries.uiHint == "lines" || timeseries.uiHint == "points" || timeseries.uiHint == "lines-and-points" || timeseries.uiHint == undefined) {
                        var size = totalSize * 2;
                        xys = Webglimpse.ensureCapacityFloat32(xys, size);
                        var index = 0;
                        for (var j = 0; j < sortedFragments.length; j++) {
                            var fragment = sortedFragments[j];
                            var data = fragment.data;
                            var times_PMILLIS = fragment.times_PMILLIS;
                            for (var k = 0; k < data.length; k++, index += 2) {
                                xys[index] = timeAxis.vAtTime(times_PMILLIS[k]);
                                xys[index + 1] = data[k];
                            }
                        }
                        var lineColor = Webglimpse.hasval(timeseries.lineColor) ? timeseries.lineColor : defaultColor;
                        u_Color.setData(gl, lineColor);
                        var lineThickness = Webglimpse.hasval(timeseries.lineThickness) ? timeseries.lineThickness : defaultThickness;
                        gl.lineWidth(lineThickness);
                        xysBuffer.setData(xys.subarray(0, index));
                        a_Position.setDataAndEnable(gl, xysBuffer, 2, Webglimpse.GL.FLOAT);
                        if (timeseries.uiHint == "lines" || timeseries.uiHint == "lines-and-points" || timeseries.uiHint == undefined) {
                            // draw the lines
                            gl.drawArrays(Webglimpse.GL.LINE_STRIP, 0, size / 2);
                        }
                        // point size works in WebKit and actually works in Minefield as well even though
                        // VERTEX_PROGRAM_POINT_SIZE and POINT_SMOOTH aren't defined
                        if (timeseries.uiHint == "points" || timeseries.uiHint == "lines-and-points") {
                            var pointColor = Webglimpse.hasval(timeseries.pointColor) ? timeseries.pointColor : defaultColor;
                            u_Color.setData(gl, pointColor);
                            u_PointSize.setData(gl, timeseries.pointSize);
                            gl.drawArrays(Webglimpse.GL.POINTS, 0, size / 2);
                        }
                    } else if (timeseries.uiHint == "bars") {
                        // The last data point defines the right edge of the bar
                        // but it does not have its own bar drawn, so we need at
                        // least 2 data points to draw any bars
                        if (totalSize >= 2) {
                            var baseline = timeseries.baseline;
                            var size = (totalSize - 1) * 12;
                            xys = Webglimpse.ensureCapacityFloat32(xys, size);
                            var index = 0;
                            for (var j = 0; j < sortedFragments.length; j++) {
                                var fragment = sortedFragments[j];
                                var data = fragment.data;
                                var times_PMILLIS = fragment.times_PMILLIS;
                                for (var k = 0; k < data.length - 1; k++) {
                                    var x1 = timeAxis.vAtTime(times_PMILLIS[k]);
                                    var y1 = data[k];
                                    var x2 = timeAxis.vAtTime(times_PMILLIS[k + 1]);
                                    var y2 = data[k + 1];
                                    index = Webglimpse.putQuadXys(xys, index, x1, x2, y1, baseline);
                                }
                            }
                            var lineColor = Webglimpse.hasval(timeseries.lineColor) ? timeseries.lineColor : defaultColor;
                            u_Color.setData(gl, lineColor);
                            xysBuffer.setData(xys.subarray(0, index));
                            a_Position.setDataAndEnable(gl, xysBuffer, 2, Webglimpse.GL.FLOAT);
                            gl.drawArrays(Webglimpse.GL.TRIANGLES, 0, size / 2);
                        }
                    } else if (timeseries.uiHint == "area") {
                        var baseline = timeseries.baseline;
                        var size = totalSize * 4;
                        // the last data point defines the right edge of the bar
                        // but it does not have its own bar drawn
                        xys = Webglimpse.ensureCapacityFloat32(xys, size);
                        var index = 0;
                        for (var j = 0; j < sortedFragments.length; j++) {
                            var fragment = sortedFragments[j];
                            var data = fragment.data;
                            var times_PMILLIS = fragment.times_PMILLIS;
                            for (var k = 0; k < data.length; k++, index += 4) {
                                var x1 = timeAxis.vAtTime(times_PMILLIS[k]);
                                var y1 = data[k];
                                xys[index] = x1;
                                xys[index + 1] = baseline;
                                xys[index + 2] = x1;
                                xys[index + 3] = y1;
                            }
                        }
                        var lineColor = Webglimpse.hasval(timeseries.lineColor) ? timeseries.lineColor : defaultColor;
                        u_Color.setData(gl, lineColor);
                        xysBuffer.setData(xys.subarray(0, index));
                        a_Position.setDataAndEnable(gl, xysBuffer, 2, Webglimpse.GL.FLOAT);
                        gl.drawArrays(Webglimpse.GL.TRIANGLE_STRIP, 0, size / 2);
                    }
                    // highlight hovered point
                    if (selection.hoveredTimeseries.fragment && timeseries.fragmentGuids.hasValue(selection.hoveredTimeseries.fragment.fragmentGuid)) {
                        if (timeseries.uiHint == "area" || timeseries.uiHint == "lines" || timeseries.uiHint == "points" || timeseries.uiHint == "lines-and-points" || timeseries.uiHint == undefined) {
                            var size = 8;
                            xys = Webglimpse.ensureCapacityFloat32(xys, size);
                            var vppx = timeAxis.vSize / viewport.w;
                            var vppy = dataAxis.vSize / viewport.h;
                            var highlightSize = Webglimpse.hasval(timeseries.pointSize) ? timeseries.pointSize : 5;
                            var bufferx = highlightSize / 2 * vppx;
                            var buffery = highlightSize / 2 * vppy;
                            var fragment = selection.hoveredTimeseries.fragment;
                            var y = selection.hoveredTimeseries.data;
                            var x = timeAxis.vAtTime(selection.hoveredTimeseries.times_PMILLIS);
                            xys[0] = x - bufferx;
                            xys[1] = y - buffery;
                            xys[2] = x + bufferx;
                            xys[3] = y - buffery;
                            xys[4] = x + bufferx;
                            xys[5] = y + buffery;
                            xys[6] = x - bufferx;
                            xys[7] = y + buffery;
                            var color = Webglimpse.hasval(timeseries.pointColor) ? timeseries.pointColor : defaultColor;
                            u_Color.setData(gl, Webglimpse.darker(color, .8));
                            xysBuffer.setData(xys.subarray(0, size));
                            a_Position.setDataAndEnable(gl, xysBuffer, 2, Webglimpse.GL.FLOAT);
                            gl.drawArrays(Webglimpse.GL.LINE_LOOP, 0, size / 2);
                        } else if (timeseries.uiHint == "bars") {
                            var size = 8;
                            xys = Webglimpse.ensureCapacityFloat32(xys, size);
                            var fragment = selection.hoveredTimeseries.fragment;
                            var index = selection.hoveredTimeseries.index;
                            if (index < fragment.data.length) {
                                var x1 = timeAxis.vAtTime(fragment.times_PMILLIS[index]);
                                var y1 = fragment.data[index];
                                var x2 = timeAxis.vAtTime(fragment.times_PMILLIS[index + 1]);
                                var y2 = fragment.data[index + 1];
                                xys[0] = x1;
                                xys[1] = y1;
                                xys[2] = x2;
                                xys[3] = y1;
                                xys[4] = x2;
                                xys[5] = baseline;
                                xys[6] = x1;
                                xys[7] = baseline;
                                var color = Webglimpse.hasval(timeseries.lineColor) ? timeseries.lineColor : defaultColor;
                                u_Color.setData(gl, Webglimpse.darker(color, .8));
                                xysBuffer.setData(xys.subarray(0, size));
                                a_Position.setDataAndEnable(gl, xysBuffer, 2, Webglimpse.GL.FLOAT);
                                gl.drawArrays(Webglimpse.GL.LINE_LOOP, 0, size / 2);
                            }
                        }
                    }
                }
                // disable shader and attribute buffers
                a_Position.disable(gl);
                program.endUse(gl);
            };
        };
    }
    Webglimpse.newTimeseriesPainterFactory = newTimeseriesPainterFactory;
})(Webglimpse || (Webglimpse = {}));

var Webglimpse;

(function(Webglimpse) {
    // Default
    //
    Webglimpse.timeseriesRowPainterFactories_DEFAULT = [ Webglimpse.newTimeseriesPainterFactory(), Webglimpse.newTimeseriesAnnotationPainterFactory(), Webglimpse.newTimeseriesCursorPainterFactory({
        font: "16px verdana,sans-serif",
        buffer_px: 6
    }) ];
    Webglimpse.eventsRowPaneFactory_DEFAULT = Webglimpse.newEventsRowPaneFactory({
        laneHeight: 40,
        painterFactories: [ Webglimpse.newEventLimitsPainterFactory(), Webglimpse.newEventBarsPainterFactory(), Webglimpse.newEventIconsPainterFactory(), Webglimpse.newEventLabelsPainterFactory({
            iconsSizeFactor: .7
        }) ]
    });
    Webglimpse.timeseriesRowPaneFactory_DEFAULT = Webglimpse.newTimeseriesRowPaneFactory({
        painterFactories: Webglimpse.timeseriesRowPainterFactories_DEFAULT,
        axisOptions: {
            tickSpacing: 34
        }
    });
    function rowPaneFactoryChooser_DEFAULT(row) {
        if (!row.eventGuids.isEmpty) {
            return Webglimpse.eventsRowPaneFactory_DEFAULT;
        } else if (!row.timeseriesGuids.isEmpty) {
            return Webglimpse.timeseriesRowPaneFactory_DEFAULT;
        } else {
            return null;
        }
    }
    Webglimpse.rowPaneFactoryChooser_DEFAULT = rowPaneFactoryChooser_DEFAULT;
    // Thin
    //
    Webglimpse.eventsRowPaneFactory_THIN = Webglimpse.newEventsRowPaneFactory({
        rowTopPadding: 0,
        rowBottomPadding: 0,
        laneHeight: 23,
        allowMultipleLanes: true,
        painterFactories: [ Webglimpse.newEventLimitsPainterFactory({
            lineColor: new Webglimpse.Color(1, 0, 0, 1),
            lineThickness: 2
        }), Webglimpse.newEventStripedBarsPainterFactory({
            bottomMargin: 0,
            topMargin: 13,
            minimumVisibleWidth: 0,
            stripeSlant: -1,
            stripeSecondaryWidth: 10,
            stripeWidth: 10
        }), Webglimpse.newEventDashedBordersPainterFactory({
            bottomMargin: 0,
            topMargin: 13,
            minimumVisibleWidth: 0,
            cornerType: 1,
            dashLength: 5
        }), Webglimpse.newEventIconsPainterFactory({
            bottomMargin: 0,
            topMargin: 13,
            vAlign: 0
        }), Webglimpse.newEventLabelsPainterFactory({
            bottomMargin: 12,
            topMargin: 0,
            leftMargin: 2,
            rightMargin: 2,
            vAlign: 0,
            spacing: 2,
            extendBeyondBar: false,
            textMode: "truncate"
        }) ]
    });
    function rowPaneFactoryChooser_THIN(row) {
        if (!row.eventGuids.isEmpty) {
            return Webglimpse.eventsRowPaneFactory_THIN;
        } else if (!row.timeseriesGuids.isEmpty) {
            return Webglimpse.timeseriesRowPaneFactory_DEFAULT;
        } else {
            return null;
        }
    }
    Webglimpse.rowPaneFactoryChooser_THIN = rowPaneFactoryChooser_THIN;
    Webglimpse.eventsRowPaneFactory_SINGLE = Webglimpse.newEventsRowPaneFactory({
        rowTopPadding: 0,
        rowBottomPadding: 0,
        laneHeight: 23,
        allowMultipleLanes: false,
        painterFactories: [ Webglimpse.newEventLimitsPainterFactory({
            lineColor: new Webglimpse.Color(1, 0, 0, 1),
            lineThickness: 2
        }), Webglimpse.newCombinedEventPainterFactory({
            bottomMargin: 0,
            topMargin: 13,
            minimumVisibleWidth: 0,
            cornerType: 1
        }, {
            bottomMargin: 12,
            topMargin: 0,
            leftMargin: 2,
            rightMargin: 2,
            vAlign: 0,
            spacing: 2,
            extendBeyondBar: false,
            textMode: "show"
        }, {
            bottomMargin: 0,
            topMargin: 13,
            vAlign: 0
        }) ]
    });
    function rowPaneFactoryChooser_SINGLE(row) {
        if (!row.eventGuids.isEmpty) {
            return Webglimpse.eventsRowPaneFactory_SINGLE;
        } else if (!row.timeseriesGuids.isEmpty) {
            return Webglimpse.timeseriesRowPaneFactory_DEFAULT;
        } else {
            return null;
        }
    }
    Webglimpse.rowPaneFactoryChooser_SINGLE = rowPaneFactoryChooser_SINGLE;
})(Webglimpse || (Webglimpse = {}));

var Webglimpse;

(function(Webglimpse) {
    var TimelinePane = function(_super) {
        __extends(TimelinePane, _super);
        function TimelinePane(layout, model, ui) {
            _super.call(this, layout, true);
            this._model = model;
            this._ui = ui;
        }
        Object.defineProperty(TimelinePane.prototype, "model", {
            get: function() {
                return this._model;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimelinePane.prototype, "ui", {
            get: function() {
                return this._ui;
            },
            enumerable: true,
            configurable: true
        });
        return TimelinePane;
    }(Webglimpse.Pane);
    Webglimpse.TimelinePane = TimelinePane;
    function newTimelinePane(drawable, timeAxis, model, options, ui) {
        // Misc
        var font = Webglimpse.hasval(options) && Webglimpse.hasval(options.font) ? options.font : "11px verdana,sans-serif";
        var rowPaneFactoryChooser = Webglimpse.hasval(options) && Webglimpse.hasval(options.rowPaneFactoryChooser) ? options.rowPaneFactoryChooser : Webglimpse.rowPaneFactoryChooser_DEFAULT;
        // Scroll
        var showScrollbar = Webglimpse.hasval(options) && Webglimpse.hasval(options.showScrollbar) ? options.showScrollbar : true;
        var scrollbarOptions = Webglimpse.hasval(options) ? options.scrollbarOptions : null;
        // Colors
        var fgColor = Webglimpse.hasval(options) && Webglimpse.hasval(options.fgColor) ? options.fgColor : Webglimpse.white;
        var bgColor = Webglimpse.hasval(options) && Webglimpse.hasval(options.bgColor) ? options.bgColor : Webglimpse.rgb(.098, .165, .243);
        var rowLabelColor = Webglimpse.hasval(options) && Webglimpse.hasval(options.rowLabelColor) ? options.rowLabelColor : fgColor;
        var rowLabelBgColor = Webglimpse.hasval(options) && Webglimpse.hasval(options.rowLabelBgColor) ? options.rowLabelBgColor : bgColor;
        var groupLabelColor = Webglimpse.hasval(options) && Webglimpse.hasval(options.groupLabelColor) ? options.groupLabelColor : fgColor;
        var axisLabelColor = Webglimpse.hasval(options) && Webglimpse.hasval(options.axisLabelColor) ? options.axisLabelColor : fgColor;
        var rowBgColor = Webglimpse.hasval(options) && Webglimpse.hasval(options.rowBgColor) ? options.rowBgColor : Webglimpse.rgb(.02, .086, .165);
        var rowAltBgColor = Webglimpse.hasval(options) && Webglimpse.hasval(options.rowAltBgColor) ? options.rowAltBgColor : Webglimpse.rgb(.02, .086, .165);
        var gridColor = Webglimpse.hasval(options) && Webglimpse.hasval(options.gridColor) ? options.gridColor : Webglimpse.gray(.5);
        var selectedIntervalFillColor = Webglimpse.hasval(options) && Webglimpse.hasval(options.selectedIntervalFillColor) ? options.selectedIntervalFillColor : Webglimpse.rgba(0, .6, .8, .157);
        var selectedIntervalBorderColor = Webglimpse.hasval(options) && Webglimpse.hasval(options.selectedIntervalBorderColor) ? options.selectedIntervalBorderColor : Webglimpse.rgb(0, .2, 1);
        // Axes
        var showTopAxis = Webglimpse.hasval(options) && Webglimpse.hasval(options.showTopAxis) ? options.showTopAxis : true;
        var showBottomAxis = Webglimpse.hasval(options) && Webglimpse.hasval(options.showBottomAxis) ? options.showBottomAxis : true;
        var topTimeZone = Webglimpse.hasval(options) && Webglimpse.hasval(options.topTimeZone) ? options.topTimeZone : "+0000";
        var bottomTimeZone = Webglimpse.hasval(options) && Webglimpse.hasval(options.bottomTimeZone) ? options.bottomTimeZone : "+0000";
        var tickSpacing = Webglimpse.hasval(options) && Webglimpse.hasval(options.tickSpacing) ? options.tickSpacing : 60;
        var axisLabelAlign = Webglimpse.hasval(options) && Webglimpse.hasval(options.axisLabelAlign) ? options.axisLabelAlign : .5;
        // Sizing
        var groupLabelInsets = Webglimpse.hasval(options) && Webglimpse.hasval(options.groupLabelInsets) ? options.groupLabelInsets : Webglimpse.newInsets(6, 10);
        var rowLabelInsets = Webglimpse.hasval(options) && Webglimpse.hasval(options.rowLabelInsets) ? options.rowLabelInsets : Webglimpse.newInsets(0, 35);
        var rowLabelPaneWidth = Webglimpse.hasval(options) && Webglimpse.hasval(options.rowLabelPaneWidth) ? options.rowLabelPaneWidth : 140;
        var rowSeparatorHeight = Webglimpse.hasval(options) && Webglimpse.hasval(options.rowSeparatorHeight) ? options.rowSeparatorHeight : 2;
        var scrollbarWidth = Webglimpse.hasval(options) && Webglimpse.hasval(options.scrollbarWidth) ? options.scrollbarWidth : 16;
        scrollbarWidth = showScrollbar ? scrollbarWidth : 0;
        // if the scrollbar is not showing, set its width to 0
        var axisPaneHeight = Webglimpse.hasval(options) && Webglimpse.hasval(options.axisPaneHeight) ? options.axisPaneHeight : 40;
        var draggableEdgeWidth = Webglimpse.hasval(options) && Webglimpse.hasval(options.draggableEdgeWidth) ? options.draggableEdgeWidth : 6;
        var snapToDistance = Webglimpse.hasval(options) && Webglimpse.hasval(options.snapToDistance) ? options.snapToDistance : 10;
        // Event / Selection
        var allowEventMultiSelection = Webglimpse.hasval(options) && Webglimpse.hasval(options.allowEventMultiSelection) ? options.allowEventMultiSelection : true;
        var selectedIntervalMode = Webglimpse.hasval(options) && Webglimpse.hasval(options.selectedIntervalMode) ? options.selectedIntervalMode : "range";
        var centerSelectedIntervalOnDoubleClick = Webglimpse.hasval(options) && Webglimpse.hasval(options.centerSelectedIntervalOnDoubleClick) ? options.centerSelectedIntervalOnDoubleClick : true;
        var defaultMouseWheelListener = function(ev) {
            var zoomFactor = Math.pow(Webglimpse.axisZoomStep, ev.wheelSteps);
            timeAxis.zoom(zoomFactor, timeAxis.vAtFrac(Webglimpse.xFrac(ev)));
        };
        var mouseWheelListener = Webglimpse.hasval(options) && Webglimpse.hasval(options.mouseWheelListener) ? options.mouseWheelListener : defaultMouseWheelListener;
        if (!ui) {
            var outsideManagedUi = false;
            ui = new Webglimpse.TimelineUi(model, {
                allowEventMultiSelection: allowEventMultiSelection
            });
        } else {
            // remove old panes (if the ui is being reused)
            var outsideManagedUi = true;
            ui.panes.removeAll();
        }
        var selection = ui.selection;
        var redraw = function() {
            drawable.redraw();
        };
        selection.selectedInterval.changed.on(redraw);
        selection.hoveredEvent.changed.on(redraw);
        selection.selectedEvents.valueAdded.on(redraw);
        selection.selectedEvents.valueRemoved.on(redraw);
        // even if the model defines cursors, we may need to redraw when the mouse position changes
        // (we might not actually need to if: none of the rows actually use the cursor, or if the
        //  cursor doesn't show a vertical or horizontal line)
        // this check just avoids redrawing unncessarily in the easy-to-verify common case where
        // no cursors are defined
        var redrawCursor = function() {
            if (!model.cursors.isEmpty) {
                drawable.redraw();
            }
        };
        selection.hoveredY.changed.on(redrawCursor);
        selection.hoveredTime_PMILLIS.changed.on(redrawCursor);
        // Scroll Pane and Maximized Row Pane
        //
        // setup Pane which either shows timeline content, or only maximized rows
        // able to switch between the two depending on model.root.maximizedRowGuids.isEmpty
        // Scroll Pane
        var tickTimeZone = showTopAxis ? topTimeZone : bottomTimeZone;
        var contentPaneOpts = {
            selectedIntervalMode: selectedIntervalMode,
            rowPaneFactoryChooser: rowPaneFactoryChooser,
            font: font,
            fgColor: fgColor,
            rowLabelColor: rowLabelColor,
            rowLabelBgColor: rowLabelBgColor,
            groupLabelColor: groupLabelColor,
            axisLabelColor: axisLabelColor,
            bgColor: bgColor,
            rowBgColor: rowBgColor,
            rowAltBgColor: rowAltBgColor,
            gridColor: gridColor,
            gridTickSpacing: tickSpacing,
            gridTimeZone: tickTimeZone,
            referenceDate: options.referenceDate,
            groupLabelInsets: groupLabelInsets,
            rowLabelInsets: rowLabelInsets,
            rowLabelPaneWidth: rowLabelPaneWidth,
            rowSeparatorHeight: rowSeparatorHeight,
            draggableEdgeWidth: draggableEdgeWidth,
            snapToDistance: snapToDistance,
            mouseWheelListener: mouseWheelListener
        };
        var contentPaneArgs;
        if (showScrollbar) {
            var scrollLayout = Webglimpse.newVerticalScrollLayout();
            var scrollable = new Webglimpse.Pane(scrollLayout, false);
            ui.addPane("scroll-content-pane", scrollable);
            contentPaneArgs = {
                drawable: drawable,
                scrollLayout: scrollLayout,
                timeAxis: timeAxis,
                model: model,
                ui: ui,
                options: contentPaneOpts
            };
            var scrollContentPane = newTimelineContentPane(contentPaneArgs);
            ui.addPane("content-pane", scrollContentPane);
            scrollable.addPane(scrollContentPane, 0);
            var scrollbar = Webglimpse.newVerticalScrollbar(scrollLayout, drawable, scrollbarOptions);
            ui.addPane("scrollbar", scrollbar);
            var contentPane = new Webglimpse.Pane(Webglimpse.newColumnLayout(false), false);
            ui.addPane("scroll-outer-pane", contentPane);
            contentPane.addPane(scrollbar, 0, {
                width: scrollbarWidth,
                ignoreHeight: true
            });
            contentPane.addPane(scrollable, 1);
        } else {
            contentPaneArgs = {
                drawable: drawable,
                scrollLayout: null,
                timeAxis: timeAxis,
                model: model,
                ui: ui,
                options: contentPaneOpts
            };
            var contentPane = newTimelineContentPane(contentPaneArgs);
            ui.addPane("content-pane", contentPane);
        }
        // Card Pane Switching Logic
        var timelineCardPane = new Webglimpse.Pane(Webglimpse.newCardLayout());
        ui.addPane("switch-content-pane", timelineCardPane);
        var maximizedContentPane = new Webglimpse.Pane(Webglimpse.newRowLayout());
        ui.addPane("maximize-content-pane", maximizedContentPane);
        var insetMaximizedContentPane = Webglimpse.newInsetPane(maximizedContentPane, Webglimpse.newInsets(0, scrollbarWidth, 0, 0));
        ui.addPane("inset-maximize-content-pane", insetMaximizedContentPane);
        var contentActive = model.root.maximizedRowGuids.isEmpty;
        timelineCardPane.addPane(insetMaximizedContentPane, !contentActive);
        timelineCardPane.addPane(contentPane, contentActive);
        setupRowContainerPane(contentPaneArgs, maximizedContentPane, model.root.maximizedRowGuids, true, "maximized");
        var updateMaximizedRows = function(rowGuid, rowIndex) {
            var contentActive = model.root.maximizedRowGuids.isEmpty;
            timelineCardPane.setLayoutArg(insetMaximizedContentPane, !contentActive);
            timelineCardPane.setLayoutArg(contentPane, contentActive);
            drawable.redraw();
        };
        model.root.maximizedRowGuids.valueAdded.on(updateMaximizedRows);
        model.root.maximizedRowGuids.valueRemoved.on(updateMaximizedRows);
        // Overlay and Underlay Panes
        //
        var underlayPane = new Webglimpse.Pane(Webglimpse.newRowLayout());
        ui.addPane("underlay-pane", underlayPane);
        var axisInsets = Webglimpse.newInsets(0, scrollbarWidth, 0, rowLabelPaneWidth);
        // top time axis pane
        var axisOpts = {
            tickSpacing: tickSpacing,
            font: font,
            textColor: axisLabelColor,
            tickColor: axisLabelColor,
            labelAlign: axisLabelAlign,
            referenceDate: options.referenceDate,
            isFuturePositive: options.isFuturePositive
        };
        if (showTopAxis) {
            var topAxisPane = newTimeAxisPane(contentPaneArgs, null);
            ui.addPane("top-axis-pane", topAxisPane);
            topAxisPane.addPainter(Webglimpse.newTimeAxisPainter(timeAxis, 0, topTimeZone, tickTimeZone, axisOpts));
            underlayPane.addPane(Webglimpse.newInsetPane(topAxisPane, axisInsets), 0, {
                height: axisPaneHeight,
                width: null
            });
        }
        // pane containing pinned rows specified in TimelineRoot.topPinnedRowGuids
        var topPinnedPane = new Webglimpse.Pane(Webglimpse.newRowLayout());
        ui.addPane("top-pinned-pane", topPinnedPane);
        var insetTopPinnedPane = Webglimpse.newInsetPane(topPinnedPane, Webglimpse.newInsets(0, scrollbarWidth, 0, 0));
        ui.addPane("inset-top-pinned-pane", insetTopPinnedPane);
        setupRowContainerPane(contentPaneArgs, topPinnedPane, model.root.topPinnedRowGuids, false, "toppinned");
        underlayPane.addPane(insetTopPinnedPane, 1);
        // main pane containing timeline groups and rows
        underlayPane.addPane(timelineCardPane, 2, {
            height: "pref-max",
            width: null
        });
        // pane containing pinned rows specified in TimelineRoot.bottomPinnedRowGuids
        var bottomPinnedPane = new Webglimpse.Pane(Webglimpse.newRowLayout());
        ui.addPane("bottom-pinned-pane", bottomPinnedPane);
        var insetBottomPinnedPane = Webglimpse.newInsetPane(bottomPinnedPane, Webglimpse.newInsets(0, scrollbarWidth, 0, 0));
        ui.addPane("inset-bottom-pinned-pane", insetBottomPinnedPane);
        setupRowContainerPane(contentPaneArgs, bottomPinnedPane, model.root.bottomPinnedRowGuids, false, "bottompinned");
        underlayPane.addPane(insetBottomPinnedPane, 3);
        // bottom time axis pane
        if (showBottomAxis) {
            var bottomAxisPane = newTimeAxisPane(contentPaneArgs, null);
            ui.addPane("bottom-axis-pane", bottomAxisPane);
            bottomAxisPane.addPainter(Webglimpse.newTimeAxisPainter(timeAxis, 1, bottomTimeZone, tickTimeZone, axisOpts));
            underlayPane.addPane(Webglimpse.newInsetPane(bottomAxisPane, axisInsets), 4, {
                height: axisPaneHeight,
                width: null
            });
        }
        var updateMillisPerPx = function() {
            var w = underlayPane.viewport.w - axisInsets.left - axisInsets.right;
            ui.millisPerPx.value = timeAxis.tSize_MILLIS / w;
        };
        underlayPane.viewportChanged.on(updateMillisPerPx);
        timeAxis.limitsChanged.on(updateMillisPerPx);
        var timelinePane = new TimelinePane(Webglimpse.newOverlayLayout(), model, ui);
        ui.addPane("timeline-pane", timelinePane);
        timelinePane.addPainter(Webglimpse.newBackgroundPainter(bgColor));
        timelinePane.addPane(underlayPane, true);
        if (selectedIntervalMode === "single" || selectedIntervalMode === "single-unmodifiable") {
            var overlayPane = new Webglimpse.Pane(null, false, Webglimpse.alwaysTrue);
            ui.addPane("overlay-pane", overlayPane);
            overlayPane.addPainter(newTimelineSingleSelectionPainter(timeAxis, selection.selectedInterval, selectedIntervalBorderColor, selectedIntervalFillColor));
            timelinePane.addPane(Webglimpse.newInsetPane(overlayPane, axisInsets, null, false));
        } else if (selectedIntervalMode === "range" || selectedIntervalMode === "range-unmodifiable") {
            var overlayPane = new Webglimpse.Pane(null, false, Webglimpse.alwaysTrue);
            ui.addPane("overlay-pane", overlayPane);
            overlayPane.addPainter(newTimelineRangeSelectionPainter(timeAxis, selection.selectedInterval, selectedIntervalBorderColor, selectedIntervalFillColor));
            timelinePane.addPane(Webglimpse.newInsetPane(overlayPane, axisInsets, null, false));
        }
        // Enable double click to center selection on mouse
        if (centerSelectedIntervalOnDoubleClick) {
            var doubleClick = function(ev) {
                if (selectedIntervalMode === "single") {
                    if (ev.clickCount > 1) {
                        var time_PMILLIS = timeAtPointer_PMILLIS(timeAxis, ev);
                        selection.selectedInterval.setInterval(time_PMILLIS, time_PMILLIS);
                    }
                } else if (selectedIntervalMode === "range") {
                    if (ev.clickCount > 1) {
                        var time_PMILLIS = timeAtPointer_PMILLIS(timeAxis, ev);
                        var offset_PMILLIS = selection.selectedInterval.start_PMILLIS + .5 * selection.selectedInterval.duration_MILLIS;
                        selection.selectedInterval.pan(time_PMILLIS - offset_PMILLIS);
                    }
                }
            };
            ui.input.mouseDown.on(doubleClick);
        }
        timelinePane.dispose.on(function() {
            // only dispose the ui if we created it (and this manage its lifecycle)
            if (!outsideManagedUi) ui.dispose.fire();
            selection.selectedInterval.changed.off(redraw);
            selection.hoveredEvent.changed.off(redraw);
            selection.hoveredY.changed.off(redrawCursor);
            selection.hoveredTime_PMILLIS.changed.off(redrawCursor);
            selection.selectedEvents.valueAdded.off(redraw);
            selection.selectedEvents.valueRemoved.off(redraw);
            underlayPane.viewportChanged.off(updateMillisPerPx);
            timeAxis.limitsChanged.off(updateMillisPerPx);
            model.root.maximizedRowGuids.valueAdded.off(updateMaximizedRows);
            model.root.maximizedRowGuids.valueRemoved.off(updateMaximizedRows);
        });
        return timelinePane;
    }
    Webglimpse.newTimelinePane = newTimelinePane;
    function newTimeIntervalMask(timeAxis, interval, selectedIntervalMode) {
        if (selectedIntervalMode === "range") {
            return function(viewport, i, j) {
                var time_PMILLIS = timeAxis.tAtFrac_PMILLIS(viewport.xFrac(i));
                // allow a 10 pixel selection buffer to make it easier to grab ends of the selection
                var buffer_MILLIS = timeAxis.tSize_MILLIS / viewport.w * 10;
                return interval.overlaps(time_PMILLIS - buffer_MILLIS, time_PMILLIS + buffer_MILLIS);
            };
        } else if (selectedIntervalMode === "single") {
            return function(viewport, i, j) {
                var time_PMILLIS = timeAxis.tAtFrac_PMILLIS(viewport.xFrac(i));
                // allow a 10 pixel selection buffer to make it easier to grab the selection
                var buffer_MILLIS = timeAxis.tSize_MILLIS / viewport.w * 10;
                return time_PMILLIS < interval.cursor_PMILLIS + buffer_MILLIS && time_PMILLIS > interval.cursor_PMILLIS - buffer_MILLIS;
            };
        }
    }
    function attachTimeAxisMouseListeners(pane, axis, args) {
        var vGrab = null;
        pane.mouseDown.on(function(ev) {
            if (Webglimpse.isLeftMouseDown(ev.mouseEvent) && !Webglimpse.hasval(vGrab)) {
                vGrab = axis.vAtFrac(Webglimpse.xFrac(ev));
            }
        });
        pane.mouseMove.on(function(ev) {
            if (Webglimpse.isLeftMouseDown(ev.mouseEvent) && Webglimpse.hasval(vGrab)) {
                axis.pan(vGrab - axis.vAtFrac(Webglimpse.xFrac(ev)));
            }
        });
        pane.mouseUp.on(function(ev) {
            vGrab = null;
        });
        pane.mouseWheel.on(args.options.mouseWheelListener);
    }
    function newTimeAxisPane(args, row) {
        var timeAxis = args.timeAxis;
        var ui = args.ui;
        var draggableEdgeWidth = args.options.draggableEdgeWidth;
        var scrollLayout = args.scrollLayout;
        var drawable = args.drawable;
        var selectedIntervalMode = args.options.selectedIntervalMode;
        var input = ui.input;
        var axisPane = new Webglimpse.Pane(Webglimpse.newOverlayLayout());
        if (scrollLayout) Webglimpse.attachTimelineVerticalScrollMouseListeners(axisPane, scrollLayout, drawable);
        attachTimeAxisMouseListeners(axisPane, timeAxis, args);
        var onMouseMove = function(ev) {
            var time_PMILLIS = timeAxis.tAtFrac_PMILLIS(Webglimpse.xFrac(ev));
            input.mouseMove.fire(ev);
            input.timeHover.fire(time_PMILLIS, ev);
            if (row) input.rowHover.fire(row, ev);
        };
        axisPane.mouseMove.on(onMouseMove);
        var onMouseExit = function(ev) {
            input.mouseExit.fire(ev);
            input.timeHover.fire(null, ev);
            if (row) input.rowHover.fire(null, ev);
        };
        axisPane.mouseExit.on(onMouseExit);
        var onMouseDown = function(ev) {
            input.mouseDown.fire(ev);
        };
        axisPane.mouseDown.on(onMouseDown);
        var onMouseUp = function(ev) {
            input.mouseUp.fire(ev);
        };
        axisPane.mouseUp.on(onMouseUp);
        var onContextMenu = function(ev) {
            input.contextMenu.fire(ev);
        };
        axisPane.contextMenu.on(onContextMenu);
        if (selectedIntervalMode === "single" || selectedIntervalMode === "range") {
            var selection = ui.selection;
            var selectedIntervalPane = new Webglimpse.Pane(null, true, newTimeIntervalMask(timeAxis, selection.selectedInterval, selectedIntervalMode));
            attachTimeSelectionMouseListeners(selectedIntervalPane, timeAxis, selection.selectedInterval, input, draggableEdgeWidth, selectedIntervalMode);
            axisPane.addPane(selectedIntervalPane, false);
            selectedIntervalPane.mouseMove.on(onMouseMove);
            selectedIntervalPane.mouseExit.on(onMouseExit);
            selectedIntervalPane.mouseDown.on(onMouseDown);
            selectedIntervalPane.mouseUp.on(onMouseUp);
            selectedIntervalPane.contextMenu.on(onContextMenu);
        }
        // Dispose
        //
        // mouse listeners are disposed of automatically by Pane
        return axisPane;
    }
    function timeAtPointer_PMILLIS(timeAxis, ev) {
        return timeAxis.tAtFrac_PMILLIS(ev.paneViewport.xFrac(ev.i));
    }
    function attachTimeSelectionMouseListeners(pane, timeAxis, interval, input, draggableEdgeWidth, selectedIntervalMode) {
        if (selectedIntervalMode === "single") {
            var chooseDragMode = function chooseDragMode(ev) {
                return "center";
            };
            attachTimeIntervalSelectionMouseListeners(pane, timeAxis, interval, input, draggableEdgeWidth, selectedIntervalMode, chooseDragMode);
        } else if (selectedIntervalMode === "range") {
            // Edges are draggable when interval is at least this wide
            var minIntervalWidthForEdgeDraggability = 3 * draggableEdgeWidth;
            // When dragging an edge, the interval cannot be made narrower than this
            //
            // Needs to be greater than minIntervalWidthForEdgeDraggability -- by enough to
            // cover floating-point precision loss -- so a user can't accidentally make
            // the interval so narrow that it can't easily be widened again.
            //
            var minIntervalWidthWhenDraggingEdge = minIntervalWidthForEdgeDraggability + 1;
            var chooseDragMode = function chooseDragMode(ev) {
                var intervalWidth = interval.duration_MILLIS * ev.paneViewport.w / timeAxis.vSize;
                if (intervalWidth < minIntervalWidthForEdgeDraggability) {
                    // If interval isn't very wide, don't try to allow edge dragging
                    return "center";
                } else {
                    var time_PMILLIS = timeAtPointer_PMILLIS(timeAxis, ev);
                    var mouseOffset = (time_PMILLIS - interval.start_PMILLIS) * ev.paneViewport.w / timeAxis.vSize;
                    if (mouseOffset < draggableEdgeWidth) {
                        // If mouse is near the left edge, drag the interval's start-time
                        return "start";
                    } else if (mouseOffset < intervalWidth - draggableEdgeWidth) {
                        // If mouse is in the center, drag the whole interval
                        return "center";
                    } else {
                        // If mouse is near the right edge, drag the interval's end-time
                        return "end";
                    }
                }
            };
            attachTimeIntervalSelectionMouseListeners(pane, timeAxis, interval, input, draggableEdgeWidth, selectedIntervalMode, chooseDragMode);
        }
    }
    function attachTimeIntervalSelectionMouseListeners(pane, timeAxis, interval, input, draggableEdgeWidth, selectedIntervalMode, chooseDragMode) {
        // see comments in attachTimeSelectionMouseListeners( ... )
        var minIntervalWidthForEdgeDraggability = 3 * draggableEdgeWidth;
        var minIntervalWidthWhenDraggingEdge = minIntervalWidthForEdgeDraggability + 1;
        // Hook up input notifications
        //
        pane.mouseWheel.on(function(ev) {
            var zoomFactor = Math.pow(Webglimpse.axisZoomStep, ev.wheelSteps);
            timeAxis.zoom(zoomFactor, timeAxis.vAtFrac(Webglimpse.xFrac(ev)));
        });
        pane.contextMenu.on(function(ev) {
            input.contextMenu.fire(ev);
        });
        // Begin interval-drag
        //
        var dragMode = null;
        var dragOffset_MILLIS = null;
        pane.mouseMove.on(function(ev) {
            if (!dragMode) {
                var mouseCursors = {
                    center: "move",
                    start: "w-resize",
                    end: "e-resize"
                };
                pane.mouseCursor = mouseCursors[chooseDragMode(ev)];
            }
        });
        pane.mouseDown.on(function(ev) {
            dragMode = Webglimpse.isLeftMouseDown(ev.mouseEvent) ? chooseDragMode(ev) : null;
            if (!Webglimpse.hasval(dragMode)) {
                dragOffset_MILLIS = null;
            }
        });
        // Compute (and remember) the pointer time, for use by the drag listeners below
        //
        var dragPointer_PMILLIS = null;
        var updateDragPointer = function(ev) {
            if (Webglimpse.hasval(dragMode)) {
                dragPointer_PMILLIS = timeAtPointer_PMILLIS(timeAxis, ev);
            }
        };
        pane.mouseDown.on(updateDragPointer);
        pane.mouseMove.on(updateDragPointer);
        // Dragging interval-center
        //
        var grabCenter = function() {
            if (dragMode === "center") {
                dragOffset_MILLIS = dragPointer_PMILLIS - interval.start_PMILLIS;
            }
        };
        pane.mouseDown.on(grabCenter);
        var dragCenter = function() {
            if (dragMode === "center") {
                var newStart_PMILLIS = dragPointer_PMILLIS - dragOffset_MILLIS;
                var newEnd_PMILLIS = interval.end_PMILLIS + (newStart_PMILLIS - interval.start_PMILLIS);
                interval.setInterval(newStart_PMILLIS, newEnd_PMILLIS);
            }
        };
        pane.mouseMove.on(dragCenter);
        // Dragging interval-start
        //
        var grabStart = function() {
            if (dragMode === "start") {
                dragOffset_MILLIS = dragPointer_PMILLIS - interval.start_PMILLIS;
            }
        };
        pane.mouseDown.on(grabStart);
        var dragStart = function() {
            if (dragMode === "start") {
                var wMin_MILLIS = minIntervalWidthWhenDraggingEdge * timeAxis.vSize / pane.viewport.w;
                var newStart_PMILLIS = dragPointer_PMILLIS - dragOffset_MILLIS;
                interval.start_PMILLIS = Math.min(interval.end_PMILLIS - wMin_MILLIS, newStart_PMILLIS);
            }
        };
        pane.mouseMove.on(dragStart);
        // Dragging interval-end
        //
        var grabEnd = function() {
            if (dragMode === "end") {
                dragOffset_MILLIS = dragPointer_PMILLIS - interval.end_PMILLIS;
            }
        };
        pane.mouseDown.on(grabEnd);
        var dragEnd = function() {
            if (dragMode === "end") {
                var wMin_MILLIS = minIntervalWidthWhenDraggingEdge * timeAxis.vSize / pane.viewport.w;
                var newEnd_PMILLIS = dragPointer_PMILLIS - dragOffset_MILLIS;
                interval.end_PMILLIS = Math.max(interval.start_PMILLIS + wMin_MILLIS, newEnd_PMILLIS);
                interval.cursor_PMILLIS = interval.end_PMILLIS;
            }
        };
        pane.mouseMove.on(dragEnd);
        // Finish interval-drag
        //
        pane.mouseUp.on(function(ev) {
            dragOffset_MILLIS = null;
            dragPointer_PMILLIS = null;
            dragMode = null;
        });
    }
    function newTimelineSingleSelectionPainter(timeAxis, interval, borderColor, fillColor) {
        var program = new Webglimpse.Program(Webglimpse.xyFrac_VERTSHADER, Webglimpse.solid_FRAGSHADER);
        var a_XyFrac = new Webglimpse.Attribute(program, "a_XyFrac");
        var u_Color = new Webglimpse.UniformColor(program, "u_Color");
        // holds vertices for fill and border
        var coords = new Float32Array(12 + 8);
        var coordsBuffer = Webglimpse.newDynamicBuffer();
        return function(gl, viewport) {
            if (Webglimpse.hasval(interval.cursor_PMILLIS)) {
                var fracSelection = timeAxis.tFrac(interval.cursor_PMILLIS);
                var fracWidth = 1 / viewport.w;
                var fracHeight = 1 / viewport.h;
                var thickWidth = 3 / viewport.w;
                var highlightWidth = 7 / viewport.w;
                var index = 0;
                // fill vertices
                coords[index++] = fracSelection - highlightWidth;
                coords[index++] = 1;
                coords[index++] = fracSelection + highlightWidth;
                coords[index++] = 1;
                coords[index++] = fracSelection - highlightWidth;
                coords[index++] = 0;
                coords[index++] = fracSelection + highlightWidth;
                coords[index++] = 0;
                // selection vertices
                index = Webglimpse.putQuadXys(coords, index, fracSelection - thickWidth / 2, fracSelection + thickWidth / 2, 1, 0 + fracHeight);
                // selection
                gl.blendFuncSeparate(Webglimpse.GL.SRC_ALPHA, Webglimpse.GL.ONE_MINUS_SRC_ALPHA, Webglimpse.GL.ONE, Webglimpse.GL.ONE_MINUS_SRC_ALPHA);
                gl.enable(Webglimpse.GL.BLEND);
                program.use(gl);
                coordsBuffer.setData(coords);
                a_XyFrac.setDataAndEnable(gl, coordsBuffer, 2, Webglimpse.GL.FLOAT);
                u_Color.setData(gl, fillColor);
                gl.drawArrays(Webglimpse.GL.TRIANGLE_STRIP, 0, 4);
                u_Color.setData(gl, borderColor);
                gl.drawArrays(Webglimpse.GL.TRIANGLES, 4, 6);
                a_XyFrac.disable(gl);
                program.endUse(gl);
            }
        };
    }
    function newTimelineRangeSelectionPainter(timeAxis, interval, borderColor, fillColor) {
        var program = new Webglimpse.Program(Webglimpse.xyFrac_VERTSHADER, Webglimpse.solid_FRAGSHADER);
        var a_XyFrac = new Webglimpse.Attribute(program, "a_XyFrac");
        var u_Color = new Webglimpse.UniformColor(program, "u_Color");
        // holds vertices for fill and border
        var coords = new Float32Array(12 + 8 + 48);
        var coordsBuffer = Webglimpse.newDynamicBuffer();
        return function(gl, viewport) {
            if (Webglimpse.hasval(interval.start_PMILLIS) && Webglimpse.hasval(interval.end_PMILLIS)) {
                var fracStart = timeAxis.tFrac(interval.start_PMILLIS);
                var fracEnd = timeAxis.tFrac(interval.end_PMILLIS);
                var fracSelection = timeAxis.tFrac(interval.cursor_PMILLIS);
                var fracWidth = 1 / viewport.w;
                var fracHeight = 1 / viewport.h;
                var thickWidth = 3 / viewport.w;
                var index = 0;
                // fill vertices
                coords[index++] = fracStart;
                coords[index++] = 1;
                coords[index++] = fracEnd;
                coords[index++] = 1;
                coords[index++] = fracStart;
                coords[index++] = 0;
                coords[index++] = fracEnd;
                coords[index++] = 0;
                // border vertices
                index = Webglimpse.putQuadXys(coords, index, fracStart, fracEnd - fracWidth, +1, +1 - fracHeight);
                // top
                index = Webglimpse.putQuadXys(coords, index, fracStart + fracWidth, fracEnd, 0 + fracHeight, 0);
                // bottom
                index = Webglimpse.putQuadXys(coords, index, fracStart, fracStart + fracWidth, 1 - fracHeight, 0);
                // left
                index = Webglimpse.putQuadXys(coords, index, fracEnd - fracWidth, fracEnd, 1, 0 + fracHeight);
                // right
                // selection vertices
                index = Webglimpse.putQuadXys(coords, index, fracSelection - thickWidth, fracSelection, 1, 0 + fracHeight);
                // selection
                gl.blendFuncSeparate(Webglimpse.GL.SRC_ALPHA, Webglimpse.GL.ONE_MINUS_SRC_ALPHA, Webglimpse.GL.ONE, Webglimpse.GL.ONE_MINUS_SRC_ALPHA);
                gl.enable(Webglimpse.GL.BLEND);
                program.use(gl);
                coordsBuffer.setData(coords);
                a_XyFrac.setDataAndEnable(gl, coordsBuffer, 2, Webglimpse.GL.FLOAT);
                u_Color.setData(gl, fillColor);
                gl.drawArrays(Webglimpse.GL.TRIANGLE_STRIP, 0, 4);
                u_Color.setData(gl, borderColor);
                gl.drawArrays(Webglimpse.GL.TRIANGLES, 4, 30);
                a_XyFrac.disable(gl);
                program.endUse(gl);
            }
        };
    }
    function newGroupCollapseExpandArrowPainter(group) {
        var program = new Webglimpse.Program(Webglimpse.xyFrac_VERTSHADER, Webglimpse.solid_FRAGSHADER);
        var a_XyFrac = new Webglimpse.Attribute(program, "a_XyFrac");
        var u_Color = new Webglimpse.UniformColor(program, "u_Color");
        // holds vertices for triangle
        var coords = new Float32Array(6);
        var coordsBuffer = Webglimpse.newDynamicBuffer();
        return function(gl, viewport) {
            var sizeFracX = .5;
            var sizeX = sizeFracX * viewport.w;
            var sizeY = sizeX * Math.sqrt(3) / 2;
            var sizeFracY = sizeY / viewport.h;
            var bufferFracX = .05;
            var bufferSize = bufferFracX * viewport.w;
            var bufferFracY = bufferSize / viewport.h;
            var centerFracX = .5;
            var centerFracY = bufferFracY + sizeFracY / 2;
            if (group.collapsed) {
                sizeFracX = sizeY / viewport.w;
                sizeFracY = sizeX / viewport.h;
                var fracStartX = centerFracX - sizeFracX / 2;
                var fracEndX = centerFracX + sizeFracX / 2;
                var fracStartY = 1 - (centerFracY - sizeFracY / 2);
                var fracEndY = 1 - (centerFracY + sizeFracY / 2);
                var index = 0;
                coords[index++] = fracStartX;
                coords[index++] = fracStartY;
                coords[index++] = fracEndX;
                coords[index++] = (fracStartY + fracEndY) / 2;
                coords[index++] = fracStartX;
                coords[index++] = fracEndY;
            } else {
                var fracStartX = centerFracX - sizeFracX / 2;
                var fracEndX = centerFracX + sizeFracX / 2;
                var fracStartY = 1 - (centerFracY - sizeFracY / 2);
                var fracEndY = 1 - (centerFracY + sizeFracY / 2);
                var index = 0;
                coords[index++] = fracStartX;
                coords[index++] = fracStartY;
                coords[index++] = fracEndX;
                coords[index++] = fracStartY;
                coords[index++] = (fracStartX + fracEndX) / 2;
                coords[index++] = fracEndY;
            }
            program.use(gl);
            coordsBuffer.setData(coords);
            a_XyFrac.setDataAndEnable(gl, coordsBuffer, 2, Webglimpse.GL.FLOAT);
            u_Color.setData(gl, Webglimpse.white);
            gl.drawArrays(Webglimpse.GL.TRIANGLES, 0, 3);
            a_XyFrac.disable(gl);
            program.endUse(gl);
        };
    }
    function newTimelineContentPane(args) {
        var drawable = args.drawable;
        var scrollLayout = args.scrollLayout;
        var timeAxis = args.timeAxis;
        var model = args.model;
        var ui = args.ui;
        var options = args.options;
        var root = model.root;
        var selectedIntervalMode = options.selectedIntervalMode;
        var rowPaneFactoryChooser = options.rowPaneFactoryChooser;
        var font = options.font;
        var fgColor = options.fgColor;
        var rowLabelColor = options.rowLabelColor;
        var groupLabelColor = options.groupLabelColor;
        var axisLabelColor = options.axisLabelColor;
        var bgColor = options.bgColor;
        var rowBgColor = options.rowBgColor;
        var rowAltBgColor = options.rowAltBgColor;
        var gridColor = options.gridColor;
        var gridTimeZone = options.gridTimeZone;
        var gridTickSpacing = options.gridTickSpacing;
        var groupLabelInsets = options.groupLabelInsets;
        var rowLabelInsets = options.rowLabelInsets;
        var rowLabelPaneWidth = options.rowLabelPaneWidth;
        var rowSeparatorHeight = options.rowSeparatorHeight;
        var draggableEdgeWidth = options.draggableEdgeWidth;
        var snapToDistance = options.snapToDistance;
        var textureRenderer = new Webglimpse.TextureRenderer();
        var createGroupLabelTexture = Webglimpse.createTextTextureFactory(font);
        var createRowLabelTexture = Webglimpse.createTextTextureFactory(font);
        // Group panes
        //
        var timelineContentPane = new Webglimpse.Pane(Webglimpse.newRowLayout());
        var groupHeaderPanes = {};
        var groupContentPanes = {};
        var addGroup = function(groupGuid, groupIndex) {
            var group = model.group(groupGuid);
            var groupLabel = new Webglimpse.Label(group.label, font, groupLabelColor);
            var groupLabelPane = new Webglimpse.Pane({
                updatePrefSize: Webglimpse.fitToLabel(groupLabel)
            }, false);
            groupLabelPane.addPainter(Webglimpse.newLabelPainter(groupLabel, 0, 1, 0, 1));
            var groupArrowPane = new Webglimpse.Pane({
                updatePrefSize: function(parentPrefSize) {
                    parentPrefSize.w = 16;
                    parentPrefSize.h = 0;
                }
            }, false);
            groupArrowPane.addPainter(newGroupCollapseExpandArrowPainter(group));
            var groupPane = new Webglimpse.Pane(Webglimpse.newColumnLayout(), false);
            groupPane.addPane(groupArrowPane, 0);
            groupPane.addPane(groupLabelPane, 1);
            var groupButton = Webglimpse.newInsetPane(groupPane, groupLabelInsets, bgColor);
            var redrawLabel = function() {
                groupLabel.text = group.label;
                drawable.redraw();
            };
            group.attrsChanged.on(redrawLabel);
            /// handle rollup group row ///
            var groupHeaderStripe = new Webglimpse.Pane(Webglimpse.newRowLayout());
            groupHeaderStripe.addPane(new Webglimpse.Pane(null), 0, {
                height: null
            });
            groupHeaderStripe.addPane(Webglimpse.newSolidPane(groupLabelColor), 1, {
                height: 1
            });
            groupHeaderStripe.addPane(new Webglimpse.Pane(null), 2, {
                height: null
            });
            var rollupRow = model.row(group.rollupGuid);
            if (rollupRow) {
                var rowBackgroundPanes = newRowBackgroundPanes(args, group.rowGuids, rollupRow);
                var rowBackgroundPane = rowBackgroundPanes.rowBackgroundPane;
                var rowInsetPane = rowBackgroundPanes.rowInsetPane;
                var rollupUi = ui.rowUi(rollupRow.rowGuid);
                // expose panes in api via TimelineRowUi
                rollupUi.addPane("background", rowBackgroundPane);
                rollupUi.addPane("inset", rowInsetPane);
                var rollupDataAxis = rollupRow.dataAxis;
                var rollupContentPane = null;
                var rollupPaneFactory = null;
                var rollupContentOptions = {
                    timelineFont: font,
                    timelineFgColor: fgColor,
                    draggableEdgeWidth: draggableEdgeWidth,
                    snapToDistance: snapToDistance,
                    isMaximized: false,
                    mouseWheelListener: args.options.mouseWheelListener
                };
                var refreshRollupContentPane = function() {
                    var newRollupPaneFactory = rollupUi.paneFactory || rowPaneFactoryChooser(rollupRow);
                    if (newRollupPaneFactory !== rollupPaneFactory) {
                        if (rollupContentPane) {
                            rollupContentPane.dispose.fire();
                            rowInsetPane.removePane(rollupContentPane);
                        }
                        rollupPaneFactory = newRollupPaneFactory;
                        rollupContentPane = rollupPaneFactory && rollupPaneFactory(drawable, timeAxis, rollupDataAxis, model, rollupRow, ui, rollupContentOptions);
                        if (rollupContentPane) {
                            rowInsetPane.addPane(rollupContentPane);
                        }
                        drawable.redraw();
                    }
                };
                rollupUi.paneFactoryChanged.on(refreshRollupContentPane);
                rollupRow.attrsChanged.on(refreshRollupContentPane);
                rollupRow.eventGuids.valueAdded.on(refreshRollupContentPane);
                rollupRow.eventGuids.valueRemoved.on(refreshRollupContentPane);
                rollupRow.timeseriesGuids.valueAdded.on(refreshRollupContentPane);
                rollupRow.timeseriesGuids.valueRemoved.on(refreshRollupContentPane);
                refreshRollupContentPane();
                var groupButtonHeaderUnderlay = new Webglimpse.Pane(Webglimpse.newColumnLayout());
                groupButtonHeaderUnderlay.addPane(groupButton, 0);
                groupButtonHeaderUnderlay.addPane(groupHeaderStripe, 1, {
                    ignoreHeight: true
                });
                var groupHeaderUnderlay = new Webglimpse.Pane(Webglimpse.newColumnLayout());
                groupHeaderUnderlay.addPainter(Webglimpse.newBackgroundPainter(bgColor));
                groupHeaderUnderlay.addPane(groupButtonHeaderUnderlay, 0, {
                    width: rowLabelPaneWidth
                });
                groupHeaderUnderlay.addPane(rowBackgroundPane, 1, {
                    width: null
                });
                var groupHeaderPane = groupHeaderUnderlay;
            } else {
                var groupHeaderUnderlay = new Webglimpse.Pane(Webglimpse.newColumnLayout());
                groupHeaderUnderlay.addPainter(Webglimpse.newBackgroundPainter(bgColor));
                groupHeaderUnderlay.addPane(groupButton, 0);
                groupHeaderUnderlay.addPane(groupHeaderStripe, 1, {
                    ignoreHeight: true
                });
                var groupHeaderOverlay = newTimeAxisPane(args, null);
                var groupHeaderOverlayInsets = Webglimpse.newInsets(0, 0, 0, rowLabelPaneWidth);
                var groupHeaderPane = new Webglimpse.Pane(Webglimpse.newOverlayLayout());
                groupHeaderPane.addPane(groupHeaderUnderlay, true);
                groupHeaderPane.addPane(Webglimpse.newInsetPane(groupHeaderOverlay, groupHeaderOverlayInsets, null, false), false);
            }
            var groupContentPane = new Webglimpse.Pane(Webglimpse.newRowLayout());
            timelineContentPane.updateLayoutArgs(function(layoutArg) {
                var shift = Webglimpse.isNumber(layoutArg) && layoutArg >= 2 * groupIndex;
                return shift ? layoutArg + 2 : layoutArg;
            });
            timelineContentPane.addPane(groupHeaderPane, 2 * groupIndex);
            timelineContentPane.addPane(groupContentPane, 2 * groupIndex + 1, {
                hide: group.collapsed
            });
            groupHeaderPanes[groupGuid] = groupHeaderPane;
            groupContentPanes[groupGuid] = groupContentPane;
            var groupAttrsChanged = function() {
                var groupContentLayoutOpts = timelineContentPane.layoutOptions(groupContentPane);
                if (group.collapsed !== groupContentLayoutOpts.hide) {
                    groupContentLayoutOpts.hide = group.collapsed;
                    drawable.redraw();
                }
            };
            group.attrsChanged.on(groupAttrsChanged);
            groupButton.mouseDown.on(function(ev) {
                if (Webglimpse.isLeftMouseDown(ev.mouseEvent)) {
                    group.collapsed = !group.collapsed;
                }
            });
            // Handle hidden property
            //
            timelineContentPane.layoutOptions(groupContentPane).hide = group.hidden;
            timelineContentPane.layoutOptions(groupHeaderPane).hide = group.hidden;
            setupRowContainerPane(args, groupContentPane, group.rowGuids, false, group.groupGuid);
            groupContentPane.dispose.on(function() {
                group.attrsChanged.off(redrawLabel);
                group.attrsChanged.off(groupAttrsChanged);
            });
        };
        root.groupGuids.forEach(addGroup);
        root.groupGuids.valueAdded.on(addGroup);
        var moveGroup = function(groupGuid, groupOldIndex, groupNewIndex) {
            var nMin = Math.min(groupOldIndex, groupNewIndex);
            var nMax = Math.max(groupOldIndex, groupNewIndex);
            for (var n = nMin; n <= nMax; n++) {
                var groupGuid = root.groupGuids.valueAt(n);
                timelineContentPane.setLayoutArg(groupHeaderPanes[groupGuid], 2 * n);
                timelineContentPane.setLayoutArg(groupContentPanes[groupGuid], 2 * n + 1);
            }
            drawable.redraw();
        };
        root.groupGuids.valueMoved.on(moveGroup);
        var removeGroup = function(groupGuid, groupIndex) {
            var contentPane = groupContentPanes[groupGuid];
            var headerPane = groupHeaderPanes[groupGuid];
            contentPane.dispose.fire();
            headerPane.dispose.fire();
            timelineContentPane.removePane(contentPane);
            timelineContentPane.removePane(headerPane);
            timelineContentPane.updateLayoutArgs(function(layoutArg) {
                var shift = Webglimpse.isNumber(layoutArg) && layoutArg > 2 * groupIndex + 1;
                return shift ? layoutArg - 2 : layoutArg;
            });
            delete groupHeaderPanes[groupGuid];
            delete groupContentPanes[groupGuid];
            drawable.redraw();
        };
        root.groupGuids.valueRemoved.on(removeGroup);
        // Handle listing for hidden property
        //
        var groupAttrsChangedListeners = {};
        var attachGroupAttrsChangedListener = function(groupGuid, groupIndex) {
            var group = model.group(groupGuid);
            var groupAttrsChangedListener = function() {
                if (Webglimpse.hasval(group.hidden) && Webglimpse.hasval(groupContentPanes[groupGuid])) {
                    timelineContentPane.layoutOptions(groupContentPanes[groupGuid]).hide = group.hidden;
                    timelineContentPane.layoutOptions(groupHeaderPanes[groupGuid]).hide = group.hidden;
                    drawable.redraw();
                }
            };
            groupAttrsChangedListeners[groupGuid] = groupAttrsChangedListener;
            group.attrsChanged.on(groupAttrsChangedListener);
        };
        var unattachGroupAttrsChangedListener = function(groupGuid, groupIndex) {
            var group = model.group(groupGuid);
            group.attrsChanged.off(groupAttrsChangedListeners[groupGuid]);
        };
        root.groupGuids.forEach(attachGroupAttrsChangedListener);
        root.groupGuids.valueAdded.on(attachGroupAttrsChangedListener);
        root.groupGuids.valueRemoved.on(unattachGroupAttrsChangedListener);
        // Dispose
        //
        timelineContentPane.dispose.on(function() {
            root.groupGuids.valueAdded.off(addGroup);
            root.groupGuids.valueMoved.off(moveGroup);
            root.groupGuids.valueRemoved.off(removeGroup);
        });
        return timelineContentPane;
    }
    // Row panes and painters
    //
    function newRowBackgroundPainter(args, guidList, row) {
        return function(gl) {
            var color = Webglimpse.hasval(row.bgColor) ? row.bgColor : guidList.indexOf(row.rowGuid) % 2 ? args.options.rowBgColor : args.options.rowAltBgColor;
            gl.clearColor(color.r, color.g, color.b, color.a);
            gl.clear(Webglimpse.GL.COLOR_BUFFER_BIT);
        };
    }
    function newRowBackgroundPanes(args, guidList, row) {
        var rowBackgroundPane = newTimeAxisPane(args, row);
        rowBackgroundPane.addPainter(newRowBackgroundPainter(args, guidList, row));
        var timeGridOpts = {
            tickSpacing: args.options.gridTickSpacing,
            gridColor: args.options.gridColor,
            referenceDate: args.options.referenceDate
        };
        rowBackgroundPane.addPainter(Webglimpse.newTimeGridPainter(args.timeAxis, false, args.options.gridTimeZone, timeGridOpts));
        var rowInsetTop = args.options.rowSeparatorHeight / 2;
        var rowInsetBottom = args.options.rowSeparatorHeight - rowInsetTop;
        var rowInsetPane = new Webglimpse.Pane(Webglimpse.newInsetLayout(Webglimpse.newInsets(rowInsetTop, 0, rowInsetBottom, 0)), false);
        rowInsetPane.addPainter(Webglimpse.newBorderPainter(args.options.bgColor, {
            thickness: rowInsetTop,
            drawRight: false,
            drawLeft: false,
            drawBottom: false
        }));
        rowInsetPane.addPainter(Webglimpse.newBorderPainter(args.options.bgColor, {
            thickness: rowInsetBottom,
            drawRight: false,
            drawLeft: false,
            drawTop: false
        }));
        rowBackgroundPane.addPane(rowInsetPane, true);
        var rowOverlayPane = new Webglimpse.Pane(null, false);
        rowOverlayPane.addPainter(Webglimpse.newBorderPainter(args.options.rowLabelColor, {
            drawRight: false,
            drawTop: false,
            drawBottom: false
        }));
        rowBackgroundPane.addPane(rowOverlayPane, false);
        return {
            rowInsetPane: rowInsetPane,
            rowBackgroundPane: rowBackgroundPane
        };
    }
    function setupRowContainerPane(args, parentPane, guidList, isMaximized, keyPrefix) {
        var drawable = args.drawable;
        var scrollLayout = args.scrollLayout;
        var timeAxis = args.timeAxis;
        var model = args.model;
        var ui = args.ui;
        var options = args.options;
        var rowPanes = {};
        var addRow = function(rowGuid, rowIndex) {
            var row = model.row(rowGuid);
            var rowUi = ui.rowUi(rowGuid);
            var rowLabelColorBg = Webglimpse.hasval(row.bgLabelColor) ? row.bgLabelColor : options.rowLabelBgColor;
            var rowLabelColorFg = Webglimpse.hasval(row.fgLabelColor) ? row.fgLabelColor : options.rowLabelColor;
            var rowLabelFont = Webglimpse.hasval(row.labelFont) ? row.labelFont : options.font;
            var rowLabel = new Webglimpse.Label(row.label, rowLabelFont, rowLabelColorFg);
            var rowLabelPane = new Webglimpse.Pane({
                updatePrefSize: Webglimpse.fitToLabel(rowLabel)
            }, false);
            rowLabelPane.addPainter(Webglimpse.newLabelPainter(rowLabel, 0, .5, 0, .5));
            var rowLabelBackground = new Webglimpse.Background(rowLabelColorBg);
            var rowHeaderPane = new Webglimpse.Pane(Webglimpse.newInsetLayout(options.rowLabelInsets), true);
            rowHeaderPane.addPainter(rowLabelBackground.newPainter());
            rowHeaderPane.addPane(rowLabelPane);
            var rowAttrsChanged = function() {
                rowLabel.text = row.label;
                rowLabel.fgColor = Webglimpse.hasval(row.fgLabelColor) ? row.fgLabelColor : options.rowLabelColor;
                rowLabel.font = Webglimpse.hasval(row.labelFont) ? row.labelFont : options.font;
                rowLabelBackground.color = Webglimpse.hasval(row.bgLabelColor) ? row.bgLabelColor : options.bgColor;
                drawable.redraw();
            };
            row.attrsChanged.on(rowAttrsChanged);
            var rowBackgroundPanes = newRowBackgroundPanes(args, guidList, row);
            var rowBackgroundPane = rowBackgroundPanes.rowBackgroundPane;
            var rowInsetPane = rowBackgroundPanes.rowInsetPane;
            var rowPane = new Webglimpse.Pane(Webglimpse.newColumnLayout());
            rowPane.addPane(rowHeaderPane, 0, {
                width: options.rowLabelPaneWidth
            });
            rowPane.addPane(rowBackgroundPane, 1, {
                width: null
            });
            // expose panes in api via TimelineRowUi
            rowUi.addPane(keyPrefix + "-background", rowBackgroundPane);
            rowUi.addPane(keyPrefix + "-inset", rowInsetPane);
            rowUi.addPane(keyPrefix + "-label", rowLabelPane);
            rowUi.addPane(keyPrefix + "-header", rowHeaderPane);
            var rowDataAxis = row.dataAxis;
            var rowContentPane = null;
            var rowPaneFactory = null;
            var rowContentOptions = {
                timelineFont: options.font,
                timelineFgColor: options.fgColor,
                draggableEdgeWidth: options.draggableEdgeWidth,
                snapToDistance: options.snapToDistance,
                isMaximized: isMaximized,
                mouseWheelListener: options.mouseWheelListener
            };
            var refreshRowContentPane = function() {
                var newRowPaneFactory = rowUi.paneFactory || options.rowPaneFactoryChooser(row);
                if (newRowPaneFactory !== rowPaneFactory) {
                    if (rowContentPane) {
                        rowContentPane.dispose.fire();
                        rowInsetPane.removePane(rowContentPane);
                    }
                    rowPaneFactory = newRowPaneFactory;
                    rowContentPane = rowPaneFactory && rowPaneFactory(drawable, timeAxis, rowDataAxis, model, row, ui, rowContentOptions);
                    if (rowContentPane) {
                        rowInsetPane.addPane(rowContentPane);
                    }
                    drawable.redraw();
                }
            };
            rowUi.paneFactoryChanged.on(refreshRowContentPane);
            row.attrsChanged.on(refreshRowContentPane);
            row.eventGuids.valueAdded.on(refreshRowContentPane);
            row.eventGuids.valueRemoved.on(refreshRowContentPane);
            row.timeseriesGuids.valueAdded.on(refreshRowContentPane);
            row.timeseriesGuids.valueRemoved.on(refreshRowContentPane);
            refreshRowContentPane();
            parentPane.updateLayoutArgs(function(layoutArg) {
                var shift = Webglimpse.isNumber(layoutArg) && layoutArg >= rowIndex;
                return shift ? layoutArg + 1 : layoutArg;
            });
            parentPane.addPane(rowPane, rowIndex);
            rowPanes[rowGuid] = rowPane;
            // Handle hidden property
            //
            parentPane.layoutOptions(rowPane).hide = row.hidden;
            drawable.redraw();
            rowPane.dispose.on(function() {
                row.attrsChanged.off(rowAttrsChanged);
                rowUi.paneFactoryChanged.off(refreshRowContentPane);
                row.attrsChanged.off(refreshRowContentPane);
                row.eventGuids.valueAdded.off(refreshRowContentPane);
                row.eventGuids.valueRemoved.off(refreshRowContentPane);
                row.timeseriesGuids.valueAdded.off(refreshRowContentPane);
                row.timeseriesGuids.valueRemoved.off(refreshRowContentPane);
                rowUi.removePane(keyPrefix + "-background");
                rowUi.removePane(keyPrefix + "-inset");
                rowUi.removePane(keyPrefix + "-label");
                rowUi.removePane(keyPrefix + "-header");
            });
        };
        guidList.forEach(addRow);
        guidList.valueAdded.on(addRow);
        var valueMoved = function(rowGuid, rowOldIndex, rowNewIndex) {
            var nMin = Math.min(rowOldIndex, rowNewIndex);
            var nMax = Math.max(rowOldIndex, rowNewIndex);
            for (var n = nMin; n <= nMax; n++) {
                var rowGuid = guidList.valueAt(n);
                parentPane.setLayoutArg(rowPanes[rowGuid], n);
            }
            drawable.redraw();
        };
        guidList.valueMoved.on(valueMoved);
        var removeRow = function(rowGuid, rowIndex) {
            var pane = rowPanes[rowGuid];
            pane.dispose.fire();
            parentPane.removePane(pane);
            parentPane.updateLayoutArgs(function(layoutArg) {
                var shift = Webglimpse.isNumber(layoutArg) && layoutArg > rowIndex;
                return shift ? layoutArg - 1 : layoutArg;
            });
            delete rowPanes[rowGuid];
            drawable.redraw();
        };
        guidList.valueRemoved.on(removeRow);
        // Handle listing for hidden property
        //
        var attrsChangedListeners = {};
        var attachAttrsChangedListener = function(rowGuid, rowIndex) {
            var row = model.row(rowGuid);
            var attrsChangedListener = function() {
                if (Webglimpse.hasval(row.hidden && Webglimpse.hasval(rowPanes[rowGuid]))) {
                    parentPane.layoutOptions(rowPanes[rowGuid]).hide = row.hidden;
                    drawable.redraw();
                }
            };
            attrsChangedListeners[rowGuid] = attrsChangedListener;
            row.attrsChanged.on(attrsChangedListener);
        };
        var unattachAttrsChangedListener = function(rowGuid, rowIndex) {
            var row = model.row(rowGuid);
            row.attrsChanged.off(attrsChangedListeners[rowGuid]);
        };
        guidList.forEach(attachAttrsChangedListener);
        guidList.valueAdded.on(attachAttrsChangedListener);
        guidList.valueRemoved.on(unattachAttrsChangedListener);
        // Redraw
        //
        drawable.redraw();
        // Dispose
        parentPane.dispose.on(function() {
            guidList.valueAdded.off(addRow);
            guidList.valueMoved.off(valueMoved);
            guidList.valueRemoved.off(removeRow);
            guidList.valueAdded.off(attachAttrsChangedListener);
            guidList.valueRemoved.off(unattachAttrsChangedListener);
        });
    }
})(Webglimpse || (Webglimpse = {}));
//# sourceMappingURL=webglimpse.js.map