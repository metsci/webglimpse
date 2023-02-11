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


// XXX: These probably belong in their own namespace


export function indexOf(vs: number[], x: number): number {
    let a = 0;
    let b = vs.length - 1;

    while (a <= b) {
        // Bitwise-or-zero truncates to integer
        // tslint:disable-next-line:no-bitwise
        const pivot = ((a + b) / 2) | 0;
        const vPivot = vs[pivot];

        if (vPivot < x) {
            a = pivot + 1;
        }
        else if (vPivot > x) {
            b = pivot - 1;
        }
        else {
            // This is a little sloppy if either value is NaN, or if one is +0.0 and the other is -0.0
            return pivot;
        }
    }

    return -(a + 1);
}



export function indexNearest(vs: number[], x: number): number {
    const i = indexOf(vs, x);

    // Exact value found
    if (i >= 0) {
        return i;
    }

    // Find the closer of the adjacent values
    const iAfter = -i - 1;
    const iBefore = iAfter - 1;

    if (iAfter >= vs.length) {
        return iBefore;
    }
    if (iBefore < 0) {
        return iAfter;
    }

    const diffAfter = vs[iAfter] - x;
    const diffBefore = x - vs[iBefore];

    return (diffAfter <= diffBefore ? iAfter : iBefore);
}



export function indexAfter(vs: number[], x: number): number {
    const i = indexOf(vs, x);

    // Exact value not found
    if (i < 0) {
        return (-i - 1);
    }

    // If the exact value was found, find the value's last occurrence
    const n = vs.length;
    for (let j = i + 1; j < n; j++) {
        if (vs[j] > x) {
            return j;
        }
    }
    return n;
}



export function indexAtOrAfter(vs: number[], x: number): number {
    const i = indexOf(vs, x);

    // Exact value not found
    if (i < 0) {
        return (-i - 1);
    }

    // If the exact value was found, find the value's first occurrence
    const n = vs.length;
    for (let j = i; j > 0; j--) {
        if (vs[j - 1] < x) {
            return j;
        }
    }
    return 0;
}



export function indexBefore(vs: number[], x: number): number {
    return indexAtOrAfter(vs, x) - 1;
}



export function indexAtOrBefore(vs: number[], x: number): number {
    return indexAfter(vs, x) - 1;
}


