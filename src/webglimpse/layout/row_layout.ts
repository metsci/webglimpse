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
import { LayoutEntry, Layout } from '../core';
import { BoundsUnmodifiable, Size } from '../bounds';
import { hasval, isNumber } from '../util/util';


// 'pref'     indicates the child's height should be its preferred height
// 'pref-max' indicates the child's height should be at most its preferred height, but should be made smaller
//            (treated as a flex with child.layoutOptions.height === null) if their is insufficient room in the
//            parentViewport to accommodate all children at their set size
//
// This layout is essentially a generalization of timeline_layout.ts. If you use a row_layout with the center element set to pref-max
// you get the same effect as timeline_layout).
function childHeight(child: LayoutEntry): number {
    const usePrefHeight = (!hasval(child.layoutOptions) || child.layoutOptions.height === undefined || child.layoutOptions.height === 'pref' || child.layoutOptions.height === 'pref-max');
    return (usePrefHeight ? child.prefSize.h : child.layoutOptions.height);
}

// see above, like childHeight( ) but don't count 'pref-max'
function childHeightOverfull(child: LayoutEntry): number {
    const usePrefHeight = (!hasval(child.layoutOptions) || child.layoutOptions.height === undefined || child.layoutOptions.height === 'pref');

    if (usePrefHeight) {
        return child.prefSize.h;
    }
    else if (child.layoutOptions.height === 'pref-max') {
        return null;
    }
    else {
        return child.layoutOptions.height;
    }
}

interface FlexData {
    numFlexible: number;
    totalHeight: number;
    totalFlexHeight: number;
    flexHeight: number;
    childHeight: (child: LayoutEntry) => number;
}

function calculateFlexData(childrenToPlace: LayoutEntry[], parentViewport: BoundsUnmodifiable, getChildHeight: (child: LayoutEntry) => number): FlexData {
    let numFlexible = 0;
    let totalHeight = 0;
    for (let c = 0; c < childrenToPlace.length; c++) {
        const h = getChildHeight(childrenToPlace[c]);
        if (hasval(h)) {
            totalHeight += h;
        }
        else {
            numFlexible++;
        }
    }
    const totalFlexHeight = parentViewport.h - totalHeight;
    const flexHeight = totalFlexHeight / numFlexible;
    return { numFlexible: numFlexible, totalHeight: totalHeight, flexHeight: flexHeight, totalFlexHeight: totalFlexHeight, childHeight: getChildHeight };
}

export function newRowLayout(topToBottom: boolean = true): Layout {

    return <Layout>{


        updatePrefSize: function (parentPrefSize: Size, children: LayoutEntry[]) {
            const childrenToPlace = <LayoutEntry[]>[];
            for (let c = 0; c < children.length; c++) {
                const child = children[c];
                if (isNumber(child.layoutArg) && !(child.layoutOptions && child.layoutOptions.hide)) {
                    childrenToPlace.push(child);
                }
            }

            let wMax = 0;
            let hSum = 0;
            for (let c = 0; c < childrenToPlace.length; c++) {
                const child = childrenToPlace[c];

                const honorChildWidth = !(child.layoutOptions && child.layoutOptions.ignoreWidth);
                if (honorChildWidth) {
                    const w = child.prefSize.w;
                    if (hasval(wMax) && hasval(w)) {
                        wMax = Math.max(wMax, w);
                    }
                    else {
                        wMax = null;
                    }
                }

                const h = childHeight(child);
                if (hasval(hSum) && hasval(h)) {
                    hSum += h;
                }
                else {
                    hSum = null;
                }
            }
            parentPrefSize.w = wMax;
            parentPrefSize.h = hSum;
        },


        updateChildViewports: function (children: LayoutEntry[], parentViewport: BoundsUnmodifiable) {
            const childrenToPlace = <LayoutEntry[]>[];
            const childrenToHide = <LayoutEntry[]>[];
            for (let c = 0; c < children.length; c++) {
                const child = children[c];
                if (isNumber(child.layoutArg) && !(child.layoutOptions && child.layoutOptions.hide)) {
                    childrenToPlace.push(child);
                }
                else {
                    childrenToHide.push(child);
                }
            }

            // Use the original index to make the sort stable
            const indexProp = 'webglimpse_rowLayout_index';
            for (let c = 0; c < childrenToPlace.length; c++) {
                const child = childrenToPlace[c];
                child[indexProp] = c;
            }

            childrenToPlace.sort(function (a: LayoutEntry, b: LayoutEntry) {
                const orderDiff = a.layoutArg - b.layoutArg;
                return (orderDiff !== 0 ? orderDiff : (a[indexProp] - b[indexProp]));
            });

            // calculate assuming sufficient space
            let flexData = calculateFlexData(children, parentViewport, childHeight);

            // recalculate allowing 'pref-max' children to shrink if insufficient space
            if (flexData.totalHeight > parentViewport.h) {
                flexData = calculateFlexData(children, parentViewport, childHeightOverfull);
            }

            if (topToBottom) {
                const iStart = parentViewport.iStart;
                const iEnd = parentViewport.iEnd;
                let jEnd = parentViewport.jEnd;
                let jRemainder = 0;
                for (let c = 0; c < childrenToPlace.length; c++) {
                    const child = childrenToPlace[c];

                    let jStart: number;
                    const h = flexData.childHeight(child);
                    if (hasval(h)) {
                        jStart = jEnd - h;
                    }
                    else {
                        const jStart0 = jEnd - flexData.flexHeight - jRemainder;
                        jStart = Math.round(jStart0);
                        jRemainder = jStart - jStart0;
                    }

                    child.viewport.setEdges(iStart, iEnd, jStart, jEnd);
                    jEnd = jStart;
                }
            }
            else {
                const iStart = parentViewport.iStart;
                const iEnd = parentViewport.iEnd;
                let jStart = parentViewport.jStart;
                let jRemainder = 0;
                for (let c = 0; c < childrenToPlace.length; c++) {
                    const child = childrenToPlace[c];

                    let jEnd: number;
                    const h = flexData.childHeight(child);
                    if (hasval(h)) {
                        jEnd = jStart + h;
                    }
                    else {
                        const jEnd0 = jStart + flexData.flexHeight + jRemainder;
                        jEnd = Math.round(jEnd0);
                        jRemainder = jEnd0 - jEnd;
                    }

                    child.viewport.setEdges(iStart, iEnd, jStart, jEnd);
                    jStart = jEnd;
                }
            }

            for (let c = 0; c < childrenToHide.length; c++) {
                childrenToHide[c].viewport.setEdges(0, 0, 0, 0);
            }
        }
    };
}
