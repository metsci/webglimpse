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
import { xFrac, yFrac } from './core';
import { clamp } from './util/util';

export class BoundsUnmodifiable {
    private bounds: Bounds;

    constructor(bounds: Bounds) { this.bounds = bounds; }

    get iStart(): number { return this.bounds.iStart; }
    get jStart(): number { return this.bounds.jStart; }
    get iEnd(): number { return this.bounds.iEnd; }
    get jEnd(): number { return this.bounds.jEnd; }

    get i(): number { return this.bounds.i; }
    get j(): number { return this.bounds.j; }
    get w(): number { return this.bounds.w; }
    get h(): number { return this.bounds.h; }

    xFrac(i: number): number { return this.bounds.xFrac(i); }
    yFrac(j: number): number { return this.bounds.yFrac(j); }
    contains(i: number, j: number): boolean { return this.bounds.contains(i, j); }
}


export class Bounds {
    private _iStart: number;
    private _jStart: number;
    private _iEnd: number;
    private _jEnd: number;
    private _unmod: BoundsUnmodifiable;

    constructor() {
        this._iStart = 0;
        this._jStart = 0;
        this._iEnd = 0;
        this._jEnd = 0;
        this._unmod = new BoundsUnmodifiable(this);
    }

    get iStart(): number { return this._iStart; }
    get jStart(): number { return this._jStart; }
    get iEnd(): number { return this._iEnd; }
    get jEnd(): number { return this._jEnd; }

    get i(): number { return this._iStart; }
    get j(): number { return this._jStart; }
    get w(): number { return this._iEnd - this._iStart; }
    get h(): number { return this._jEnd - this._jStart; }

    get unmod(): BoundsUnmodifiable { return this._unmod; }

    xFrac(i: number): number {
        return (i - this._iStart) / (this._iEnd - this._iStart);
    }

    yFrac(j: number): number {
        return (j - this._jStart) / (this._jEnd - this._jStart);
    }

    contains(i: number, j: number): boolean {
        return (this._iStart <= i && i < this._iEnd && this._jStart <= j && j < this._jEnd);
    }

    setEdges(iStart: number, iEnd: number, jStart: number, jEnd: number) {
        this._iStart = iStart;
        this._jStart = jStart;
        this._iEnd = iEnd;
        this._jEnd = jEnd;
    }

    setRect(i: number, j: number, w: number, h: number) {
        this.setEdges(i, i + w, j, j + h);
    }

    setBounds(bounds: BoundsUnmodifiable) {
        this.setEdges(bounds.iStart, bounds.iEnd, bounds.jStart, bounds.jEnd);
    }

    cropToEdges(iCropStart: number, iCropEnd: number, jCropStart: number, jCropEnd: number) {
        this._iStart = clamp(iCropStart, iCropEnd, this._iStart);
        this._jStart = clamp(jCropStart, jCropEnd, this._jStart);
        this._iEnd = clamp(iCropStart, iCropEnd, this._iEnd);
        this._jEnd = clamp(jCropStart, jCropEnd, this._jEnd);
    }

    cropToRect(iCrop: number, jCrop: number, wCrop: number, hCrop: number) {
        this.cropToEdges(iCrop, iCrop + wCrop, jCrop, jCrop + hCrop);
    }

    cropToBounds(cropBounds: BoundsUnmodifiable) {
        this.cropToEdges(cropBounds.iStart, cropBounds.iEnd, cropBounds.jStart, cropBounds.jEnd);
    }
}


export function newBoundsFromRect(i: number, j: number, w: number, h: number): Bounds {
    const b = new Bounds();
    b.setRect(i, j, w, h);
    return b;
}


export function newBoundsFromEdges(iStart: number, iEnd: number, jStart: number, jEnd: number): Bounds {
    const b = new Bounds();
    b.setEdges(iStart, iEnd, jStart, jEnd);
    return b;
}


export interface Size {
    w: number;
    h: number;
}


