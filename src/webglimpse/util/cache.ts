/*
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



export interface CacheHelper<V> {
    create(key: string): V;
    dispose(value: V, key: string): void;
}


class CacheEntry<V> {
    value: V;
    touched = false;

    constructor(value: V) {
        this.value = value;
    }
}


export class Cache<V> {
    private helper: CacheHelper<V>;
    private map: { [k: string]: CacheEntry<V>; };

    constructor(helper: CacheHelper<V>) {
        this.helper = helper;
        this.map = {};
    }

    value(key: string): V {
        if (!this.map.hasOwnProperty(key)) {
            this.map[key] = new CacheEntry<V>(this.helper.create(key));
        }
        const en = this.map[key];

        en.touched = true;
        return en.value;
    }

    clear() {
        for (const k in this.map) {
            if (this.map.hasOwnProperty(k)) {
                this.helper.dispose(this.map[k].value, k);
            }
        }
        this.map = {};
    }

    remove(key: string) {
        if (this.map.hasOwnProperty(key)) {
            this.helper.dispose(this.map[key].value, key);
            delete this.map[key];
        }
    }

    removeAll(keys: string[]) {
        for (let i = 0; i < keys.length; i++) {
            this.remove(keys[i]);
        }
    }

    retain(key: string) {
        const newMap: { [k: string]: CacheEntry<V>; } = {};
        if (this.map.hasOwnProperty(key)) {
            newMap[key] = this.map[key];
            delete this.map[key];
        }
        for (const k in this.map) {
            if (this.map.hasOwnProperty(k)) {
                this.helper.dispose(this.map[k].value, k);
            }
        }
        this.map = newMap;
    }

    retainAll(keys: string[]) {
        const newMap: { [key: string]: CacheEntry<V>; } = {};
        for (let i = 0; i < keys.length; i++) {
            const k = keys[i];
            if (this.map.hasOwnProperty(k)) {
                newMap[k] = this.map[k];
                delete this.map[k];
            }
        }
        for (const k2 in this.map) {
            if (this.map.hasOwnProperty(k2)) {
                this.helper.dispose(this.map[k2].value, k2);
            }
        }
        this.map = newMap;
    }

    resetTouches() {
        for (const k in this.map) {
            if (this.map.hasOwnProperty(k)) {
                this.map[k].touched = false;
            }
        }
    }

    retainTouched() {
        const newMap: { [k: string]: CacheEntry<V>; } = {};
        for (const k in this.map) {
            if (this.map.hasOwnProperty(k)) {
                const en = this.map[k];
                if (en.touched) {
                    newMap[k] = this.map[k];
                }
                else {
                    this.helper.dispose(en.value, k);
                }
            }
        }
        this.map = newMap;
    }
}


