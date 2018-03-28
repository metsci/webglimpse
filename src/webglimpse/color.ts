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
import { hasval } from './util/util';

export class Color {
    private _r: number;
    private _g: number;
    private _b: number;
    private _a: number;

    get r(): number { return this._r; }
    get g(): number { return this._g; }
    get b(): number { return this._b; }
    get a(): number { return this._a; }

    get cssString(): string {
        return 'rgba(' + Math.round(255 * this._r) + ',' + Math.round(255 * this._g) + ',' + Math.round(255 * this._b) + ',' + this._a + ')';
    }

    get rgbaString(): string {
        return '' + Math.round(255 * this._r) + ',' + Math.round(255 * this._g) + ',' + Math.round(255 * this._b) + ',' + Math.round(255 * this._a);
    }

    constructor(r: number, g: number, b: number, a: number = 1) {
        this._r = r;
        this._g = g;
        this._b = b;
        this._a = a;
    }

    withAlphaTimes(aFactor: number): Color {
        return new Color(this._r, this._g, this._b, aFactor * this._a);
    }
}


export function darker(color: Color, factor: number): Color {
    return new Color(color.r * factor, color.g * factor, color.b * factor, color.a);
}


export function rgba(r: number, g: number, b: number, a: number): Color {
    return new Color(r, g, b, a);
}


export function rgb(r: number, g: number, b: number): Color {
    return new Color(r, g, b, 1);
}


export function sameColor(c1: Color, c2: Color): boolean {
    if (c1 === c2) return true;
    if (!hasval(c1) || !hasval(c2)) return false;
    return (c1.r === c2.r && c1.g === c2.g && c1.b === c2.b && c1.a === c2.a);
}


export function parseRgba(rgbaString: string): Color {
    let tokens = rgbaString.split(',', 4);
    return new Color(parseInt(tokens[0]) / 255, parseInt(tokens[1]) / 255, parseInt(tokens[2]) / 255, parseInt(tokens[3]) / 255);
}


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
export let parseCssColor = (function () {
    let canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    let g = canvas.getContext('2d');
    return function (cssColorString: string): Color {
        g.clearRect(0, 0, 1, 1);
        g.fillStyle = cssColorString;
        g.fillRect(0, 0, 1, 1);

        let rgbaData = g.getImageData(0, 0, 1, 1).data;
        let R = rgbaData[0] / 255;
        let G = rgbaData[1] / 255;
        let B = rgbaData[2] / 255;
        let A = rgbaData[3] / 255;
        return rgba(R, G, B, A);
    }
})();


export function gray(brightness: number): Color {
    return new Color(brightness, brightness, brightness, 1);
}


// XXX: Make final

export let black = rgb(0, 0, 0);
export let white = rgb(1, 1, 1);

export let red = rgb(1, 0, 0);
export let green = rgb(0, 1, 0);
export let blue = rgb(0, 0, 1);

export let cyan = rgb(0, 1, 1);
export let magenta = rgb(1, 0, 1);
export let yellow = rgb(1, 1, 0);

export let periwinkle = rgb(0.561, 0.561, 0.961);


