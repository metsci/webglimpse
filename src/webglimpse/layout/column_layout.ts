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
import { Size, BoundsUnmodifiable } from '../bounds';
import { hasval, isNumber } from '../util/util';


function childWidth(child: LayoutEntry): number {
    let usePrefWidth = (!hasval(child.layoutOptions) || child.layoutOptions.width === undefined || child.layoutOptions.width === 'pref');
    return (usePrefWidth ? child.prefSize.w : child.layoutOptions.width);
}


export function newColumnLayout(leftToRight: boolean = true): Layout {

    return <Layout>{


        updatePrefSize: function (parentPrefSize: Size, children: LayoutEntry[]) {
            let childrenToPlace = <LayoutEntry[]>[];
            for (let c = 0; c < children.length; c++) {
                let child = children[c];
                if (isNumber(child.layoutArg) && !(child.layoutOptions && child.layoutOptions.hide)) {
                    childrenToPlace.push(child);
                }
            }

            let hMax = 0;
            let wSum = 0;
            for (let c = 0; c < childrenToPlace.length; c++) {
                let child = childrenToPlace[c];

                let honorChildHeight = !(child.layoutOptions && child.layoutOptions.ignoreHeight);
                if (honorChildHeight) {
                    let h = child.prefSize.h;
                    if (hasval(hMax) && hasval(h)) {
                        hMax = Math.max(hMax, h);
                    }
                    else {
                        hMax = null;
                    }
                }

                let w = childWidth(child);
                if (hasval(wSum) && hasval(w)) {
                    wSum += w;
                }
                else {
                    wSum = null;
                }
            }
            parentPrefSize.w = wSum;
            parentPrefSize.h = hMax;
        },


        updateChildViewports: function (children: LayoutEntry[], parentViewport: BoundsUnmodifiable) {
            let childrenToPlace = <LayoutEntry[]>[];
            let childrenToHide = <LayoutEntry[]>[];
            for (let c = 0; c < children.length; c++) {
                let child = children[c];
                if (isNumber(child.layoutArg) && !(child.layoutOptions && child.layoutOptions.hide)) {
                    childrenToPlace.push(child);
                }
                else {
                    childrenToHide.push(child);
                }
            }

            // Use the original index to make the sort stable
            let indexProp = 'webglimpse_columnLayout_index';
            for (let c = 0; c < childrenToPlace.length; c++) {
                let child = childrenToPlace[c];
                child[indexProp] = c;
            }

            childrenToPlace.sort(function (a: LayoutEntry, b: LayoutEntry) {
                let orderDiff = a.layoutArg - b.layoutArg;
                return (orderDiff !== 0 ? orderDiff : (a[indexProp] - b[indexProp]));
            });

            let numFlexible = 0;
            let totalFlexWidth = parentViewport.w;
            for (let c = 0; c < childrenToPlace.length; c++) {
                let w = childWidth(childrenToPlace[c]);
                if (hasval(w)) {
                    totalFlexWidth -= w;
                }
                else {
                    numFlexible++;
                }
            }
            let flexWidth = totalFlexWidth / numFlexible;

            if (leftToRight) {
                let jStart = parentViewport.jStart;
                let jEnd = parentViewport.jEnd;
                let iStart = parentViewport.iStart;
                let iRemainder = 0;
                for (let c = 0; c < childrenToPlace.length; c++) {
                    let child = childrenToPlace[c];

                    let iEnd: number;
                    let w = childWidth(child);
                    if (hasval(w)) {
                        iEnd = iStart + w;
                    }
                    else {
                        let iEnd0 = iStart + flexWidth + iRemainder;
                        iEnd = Math.round(iEnd0);
                        iRemainder = iEnd0 - iEnd;
                    }

                    child.viewport.setEdges(iStart, iEnd, jStart, jEnd);
                    iStart = iEnd;
                }
            }
            else {
                let jStart = parentViewport.jStart;
                let jEnd = parentViewport.jEnd;
                let iEnd = parentViewport.iEnd;
                let iRemainder = 0;
                for (let c = 0; c < childrenToPlace.length; c++) {
                    let child = childrenToPlace[c];

                    let iStart: number;
                    let w = childWidth(child);
                    if (hasval(w)) {
                        iStart = iEnd - w;
                    }
                    else {
                        let iStart0 = iEnd - flexWidth - iRemainder;
                        iStart = Math.round(iStart0);
                        iRemainder = iStart - iStart0;
                    }

                    child.viewport.setEdges(iStart, iEnd, jStart, jEnd);
                    iEnd = iStart;
                }
            }

            for (let c = 0; c < childrenToHide.length; c++) {
                childrenToHide[c].viewport.setEdges(0, 0, 0, 0);
            }
        }


    };
}
