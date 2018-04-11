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
import { IdFunction, StringMap, isString, getObjectId, copyArray, hasval } from './util';
import { Notification2, Notification3 } from './notification';
import { indexOf } from './sorted_arrays';

function requireString(s: string): string {
    if (isString(s)) {
        return s;
    }
    else {
        throw new Error('Expected a string, but value is ' + s);
    }
}


export class OrderedSet<V> {
    private _idOf: IdFunction<V>;
    private _ids: string[];
    private _indexes: StringMap<number>;
    private _valuesArray: V[];
    private _valuesMap: StringMap<V>;
    private _valueAdded: Notification2<V, number>;
    private _valueMoved: Notification3<V, number, number>;
    private _valueRemoved: Notification2<V, number>;

    constructor(values: V[] = [], idFn: IdFunction<V> = getObjectId, useNotifications: boolean = true) {
        this._idOf = idFn;
        this._valuesArray = copyArray(values);
        this._ids = [];
        this._indexes = {};
        this._valuesMap = {};
        for (let n = 0; n < this._valuesArray.length; n++) {
            const value = this._valuesArray[n];
            const id = requireString(this._idOf(value));
            this._ids[n] = id;
            this._indexes[id] = n;
            this._valuesMap[id] = value;
        }
        if (useNotifications) {
            this._valueAdded = new Notification2<V, number>();
            this._valueMoved = new Notification3<V, number, number>();
            this._valueRemoved = new Notification2<V, number>();
        }
    }

    get valueAdded(): Notification2<V, number> {
        return this._valueAdded;
    }

    get valueMoved(): Notification3<V, number, number> {
        return this._valueMoved;
    }

    get valueRemoved(): Notification2<V, number> {
        return this._valueRemoved;
    }

    get length(): number {
        return this._valuesArray.length;
    }

    get isEmpty(): boolean {
        return (this._valuesArray.length === 0);
    }

    toArray(): V[] {
        return copyArray(this._valuesArray);
    }

    /**
     * The callback should not modify its array arg; if it does, the subsequent behavior
     * of this OrderedSet is undefined.
     */
    every(callbackFn: (value: V, index: number, array: V[]) => boolean, thisArg?: any): boolean {
        return this._valuesArray.every(callbackFn, thisArg);
    }

    /**
     * The callback should not modify its array arg; if it does, the subsequent behavior
     * of this OrderedSet is undefined.
     */
    some(callbackFn: (value: V, index: number, array: V[]) => boolean, thisArg?: any): boolean {
        return this._valuesArray.some(callbackFn, thisArg);
    }

    /**
     * The callback should not modify its array arg; if it does, the subsequent behavior
     * of this OrderedSet is undefined.
     */
    forEach(callbackFn: (value: V, index: number, array: V[]) => void, thisArg?: any): void {
        this._valuesArray.forEach(callbackFn, thisArg);
    }

    /**
     * The callback should not modify its array arg; if it does, the subsequent behavior
     * of this OrderedSet is undefined.
     */
    map<U>(callbackFn: (value: V, index: number, array: V[]) => U, thisArg?: any): U[] {
        return this._valuesArray.map(callbackFn, thisArg);
    }

    /**
     * The callback should not modify its array arg; if it does, the subsequent behavior
     * of this OrderedSet is undefined.
     */
    filter(callbackFn: (value: V, index: number, array: V[]) => boolean, thisArg?: any): V[] {
        return this._valuesArray.filter(callbackFn, thisArg);
    }

    /**
     * The callback should not modify its array arg; if it does, the subsequent behavior
     * of this OrderedSet is undefined.
     */
    reduce<U>(callbackFn: (previousValue: U, currentValue: V, currentIndex: number, array: V[]) => U, initialValue: U): U {
        return this._valuesArray.reduce(callbackFn, initialValue);
    }

    /**
     * The callback should not modify its array arg; if it does, the subsequent behavior
     * of this OrderedSet is undefined.
     */
    reduceRight<U>(callbackFn: (previousValue: U, currentValue: V, currentIndex: number, array: V[]) => U, initialValue: U): U {
        return this._valuesArray.reduceRight(callbackFn, initialValue);
    }

    idAt(index: number): string {
        return this._ids[index];
    }

    valueAt(index: number): V {
        return this._valuesArray[index];
    }

    indexFor(id: string): number {
        return (isString(id) ? this._indexes[id] : undefined);
    }

    valueFor(id: string): V {
        return (isString(id) ? this._valuesMap[id] : undefined);
    }

    idOf(value: V): string {
        return requireString(this._idOf(value));
    }

    indexOf(value: V): number {
        return this._indexes[requireString(this._idOf(value))];
    }

    hasValue(value: V): boolean {
        return this.hasId(requireString(this._idOf(value)));
    }

    hasValues(values: V[]): boolean {
        for (let n = 0; n < values.length; n++) {
            if (!this.hasValue(values[n])) {
                return false;
            }
        }
        return true;
    }

    hasId(id: string): boolean {
        return (isString(id) && hasval(this._valuesMap[id]));
    }

    hasIds(ids: string[]): boolean {
        for (let n = 0; n < ids.length; n++) {
            if (!this.hasId(ids[n])) {
                return false;
            }
        }
        return true;
    }

    add(value: V, index?: number, moveIfExists?: boolean) {
        index = (hasval(index) ? index : this._valuesArray.length);
        if (!hasval(moveIfExists)) {
            moveIfExists = false;
        }
        this._add(value, index, moveIfExists);
    }

    addAll(values: V[], index?: number, moveIfExists?: boolean) {
        index = (hasval(index) ? index : this._valuesArray.length);
        if (!hasval(moveIfExists)) {
            moveIfExists = false;
        }
        for (let n = 0; n < values.length; n++) {
            const actualIndex = this._add(values[n], index, moveIfExists);
            index = actualIndex + 1;
        }
    }

    private _add(value: V, newIndex: number, moveIfExists: boolean): number {
        const id = requireString(this._idOf(value));

        const oldIndex = this._indexes[id];
        if (!hasval(oldIndex)) {
            this._ids.splice(newIndex, 0, id);
            this._valuesArray.splice(newIndex, 0, value);
            this._valuesMap[id] = value;
            for (let n = newIndex; n < this._ids.length; n++) {
                this._indexes[this._ids[n]] = n;
            }
            if (this._valueAdded) {
                this._valueAdded.fire(value, newIndex);
            }
        }
        else if (newIndex !== oldIndex && moveIfExists) {
            this._ids.splice(oldIndex, 1);
            this._valuesArray.splice(oldIndex, 1);
            if (newIndex > oldIndex) {
                newIndex--;
                this._ids.splice(newIndex, 0, id);
                this._valuesArray.splice(newIndex, 0, value);
                for (let n = oldIndex; n <= newIndex; n++) {
                    this._indexes[this._ids[n]] = n;
                }
            }
            else {
                this._ids.splice(newIndex, 0, id);
                this._valuesArray.splice(newIndex, 0, value);
                for (let n = newIndex; n <= oldIndex; n++) {
                    this._indexes[this._ids[n]] = n;
                }
            }
            if (this._valueMoved) {
                this._valueMoved.fire(value, oldIndex, newIndex);
            }
        }
        else {
            newIndex = oldIndex;
        }

        // Return the actual insertion index -- may differ from the originally
        // requested index if an existing value had to be moved
        return newIndex;
    }

    removeValue(value: V) {
        this.removeId(requireString(this._idOf(value)));
    }

    removeId(id: string) {
        if (isString(id)) {
            const index = this._indexes[id];
            if (hasval(index)) {
                this._remove(id, index);
            }
        }
    }

    removeIndex(index: number) {
        const id = this._ids[index];
        if (isString(id)) {
            this._remove(id, index);
        }
    }

    removeAll() {
        // Remove from last to first, to minimize index shifting
        for (let n = this._valuesArray.length - 1; n >= 0; n--) {
            const id = this._ids[n];
            this._remove(id, n);
        }
    }

    retainValues(values: V[]) {
        const idsToRetain: StringMap<any> = {};
        for (let n = 0; n < values.length; n++) {
            const id = this._idOf(values[n]);
            if (isString(id)) {
                idsToRetain[id] = true;
            }
        }
        this._retain(idsToRetain);
    }

    retainIds(ids: string[]) {
        const idsToRetain: StringMap<any> = {};
        for (let n = 0; n < ids.length; n++) {
            const id = ids[n];
            if (isString(id)) {
                idsToRetain[id] = true;
            }
        }
        this._retain(idsToRetain);
    }

    retainIndices(indices: number[]) {
        const idsToRetain: StringMap<any> = {};
        for (let n = 0; n < indices.length; n++) {
            const id = this._ids[indices[n]];
            idsToRetain[id] = true;
        }
        this._retain(idsToRetain);
    }

    private _retain(ids: StringMap<any>) {
        // Remove from last to first, to minimize index shifting
        for (let n = this._valuesArray.length - 1; n >= 0; n--) {
            const id = this._ids[n];
            if (!ids.hasOwnProperty(id)) {
                this._remove(id, n);
            }
        }
    }

    private _remove(id: string, index: number) {
        const value = this._valuesArray[index];
        this._ids.splice(index, 1);
        this._valuesArray.splice(index, 1);
        delete this._indexes[id];
        delete this._valuesMap[id];
        for (let n = index; n < this._ids.length; n++) {
            this._indexes[this._ids[n]] = n;
        }
        if (this._valueRemoved) {
            this._valueRemoved.fire(value, index);
        }
    }
}



export class OrderedStringSet {
    private _indexes: StringMap<number>;
    private _valuesArray: string[];
    private _valueAdded: Notification2<string, number>;
    private _valueMoved: Notification3<string, number, number>;
    private _valueRemoved: Notification2<string, number>;

    constructor(values: string[] = [], useNotifications: boolean = true) {
        this._valuesArray = [];
        this._indexes = {};
        for (let n = 0; n < values.length; n++) {
            const value = requireString(values[n]);
            this._valuesArray[n] = value;
            this._indexes[value] = n;
        }
        if (useNotifications) {
            this._valueAdded = new Notification2<string, number>();
            this._valueMoved = new Notification3<string, number, number>();
            this._valueRemoved = new Notification2<string, number>();
        }
    }

    get valueAdded(): Notification2<string, number> {
        return this._valueAdded;
    }

    get valueMoved(): Notification3<string, number, number> {
        return this._valueMoved;
    }

    get valueRemoved(): Notification2<string, number> {
        return this._valueRemoved;
    }

    get length(): number {
        return this._valuesArray.length;
    }

    get isEmpty(): boolean {
        return (this._valuesArray.length === 0);
    }

    toArray(): string[] {
        return copyArray(this._valuesArray);
    }

    /**
     * The callback should not modify its array arg; if it does, the subsequent behavior
     * of this OrderedStringSet is undefined.
     */
    every(callbackFn: (value: string, index: number, array: string[]) => boolean, thisArg?: any): boolean {
        return this._valuesArray.every(callbackFn, thisArg);
    }

    /**
     * The callback should not modify its array arg; if it does, the subsequent behavior
     * of this OrderedStringSet is undefined.
     */
    some(callbackFn: (value: string, index: number, array: string[]) => boolean, thisArg?: any): boolean {
        return this._valuesArray.some(callbackFn, thisArg);
    }

    /**
     * The callback should not modify its array arg; if it does, the subsequent behavior
     * of this OrderedStringSet is undefined.
     */
    forEach(callbackFn: (value: string, index: number, array: string[]) => void, thisArg?: any): void {
        this._valuesArray.forEach(callbackFn, thisArg);
    }

    /**
     * The callback should not modify its array arg; if it does, the subsequent behavior
     * of this OrderedStringSet is undefined.
     */
    map<U>(callbackFn: (value: string, index: number, array: string[]) => U, thisArg?: any): U[] {
        return this._valuesArray.map(callbackFn, thisArg);
    }

    /**
     * The callback should not modify its array arg; if it does, the subsequent behavior
     * of this OrderedStringSet is undefined.
     */
    filter(callbackFn: (value: string, index: number, array: string[]) => boolean, thisArg?: any): string[] {
        return this._valuesArray.filter(callbackFn, thisArg);
    }

    /**
     * The callback should not modify its array arg; if it does, the subsequent behavior
     * of this OrderedStringSet is undefined.
     */
    reduce<U>(callbackFn: (previousValue: U, currentValue: string, currentIndex: number, array: string[]) => U, initialValue: U): U {
        return this._valuesArray.reduce(callbackFn, initialValue);
    }

    /**
     * The callback should not modify its array arg; if it does, the subsequent behavior
     * of this OrderedStringSet is undefined.
     */
    reduceRight<U>(callbackFn: (previousValue: U, currentValue: string, currentIndex: number, array: string[]) => U, initialValue: U): U {
        return this._valuesArray.reduceRight(callbackFn, initialValue);
    }

    valueAt(index: number): string {
        return this._valuesArray[index];
    }

    indexOf(value: string): number {
        return (isString(value) ? this._indexes[value] : undefined);
    }

    hasValue(value: string): boolean {
        return (isString(value) && hasval(this._indexes[value]));
    }

    hasValues(values: string[]): boolean {
        for (let n = 0; n < values.length; n++) {
            if (!this.hasValue(values[n])) {
                return false;
            }
        }
        return true;
    }

    add(value: string, index?: number, moveIfExists?: boolean) {
        index = (hasval(index) ? index : this._valuesArray.length);
        if (!hasval(moveIfExists)) {
            moveIfExists = false;
        }
        this._add(value, index, moveIfExists);
    }

    addAll(values: string[], index?: number, moveIfExists?: boolean) {
        index = (hasval(index) ? index : this._valuesArray.length);
        if (!hasval(moveIfExists)) {
            moveIfExists = false;
        }
        for (let n = 0; n < values.length; n++) {
            const actualIndex = this._add(values[n], index, moveIfExists);
            index = actualIndex + 1;
        }
    }

    private _add(value: string, newIndex: number, moveIfExists: boolean): number {
        requireString(value);

        const oldIndex = this._indexes[value];
        if (!hasval(oldIndex)) {
            this._valuesArray.splice(newIndex, 0, value);
            for (let n = newIndex; n < this._valuesArray.length; n++) {
                this._indexes[this._valuesArray[n]] = n;
            }
            if (this._valueAdded) {
                this._valueAdded.fire(value, newIndex);
            }
        }
        else if (newIndex !== oldIndex && moveIfExists) {
            this._valuesArray.splice(oldIndex, 1);
            if (newIndex > oldIndex) {
                newIndex--;
                this._valuesArray.splice(newIndex, 0, value);
                for (let n = oldIndex; n <= newIndex; n++) {
                    this._indexes[this._valuesArray[n]] = n;
                }
            }
            else {
                this._valuesArray.splice(newIndex, 0, value);
                for (let n = newIndex; n <= oldIndex; n++) {
                    this._indexes[this._valuesArray[n]] = n;
                }
            }
            if (this._valueMoved) {
                this._valueMoved.fire(value, oldIndex, newIndex);
            }
        }
        else {
            newIndex = oldIndex;
        }

        // Return the actual insertion index -- may differ from the originally
        // requested index if an existing value had to be moved
        return newIndex;
    }

    removeValue(value: string) {
        if (isString(value)) {
            const index = this._indexes[value];
            if (hasval(index)) {
                this._remove(value, index);
            }
        }
    }

    removeIndex(index: number) {
        const value = this._valuesArray[index];
        if (isString(value)) {
            this._remove(value, index);
        }
    }

    removeAll() {
        // Remove from last to first, to minimize index shifting
        for (let n = this._valuesArray.length - 1; n >= 0; n--) {
            const value = this._valuesArray[n];
            this._remove(value, n);
        }
    }

    retainValues(values: string[]) {
        const valuesToRetain: StringMap<any> = {};
        for (let n = 0; n < values.length; n++) {
            const value = values[n];
            if (isString(value)) {
                valuesToRetain[value] = true;
            }
        }
        this._retain(valuesToRetain);
    }

    retainIndices(indices: number[]) {
        const valuesToRetain: StringMap<any> = {};
        for (let n = 0; n < indices.length; n++) {
            const value = this._valuesArray[indices[n]];
            valuesToRetain[value] = true;
        }
        this._retain(valuesToRetain);
    }

    private _retain(values: StringMap<any>) {
        // Remove from last to first, to minimize index shifting
        for (let n = this._valuesArray.length - 1; n >= 0; n--) {
            const value = this._valuesArray[n];
            if (!values.hasOwnProperty(value)) {
                this._remove(value, n);
            }
        }
    }

    private _remove(value: string, index: number) {
        this._valuesArray.splice(index, 1);
        delete this._indexes[value];
        for (let n = index; n < this._valuesArray.length; n++) {
            this._indexes[this._valuesArray[n]] = n;
        }
        if (this._valueRemoved) {
            this._valueRemoved.fire(value, index);
        }
    }
}


