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
import { Layout, LayoutEntry } from '../core';
import { Size, BoundsUnmodifiable } from '../bounds';
import { Side } from '../misc';
import { hasval } from '../util/util';

export function newTimelineLayout(axisHeight: number): Layout {

    return <Layout>{

        updatePrefSize: <Layout>function (parentPrefSize: Size, children: LayoutEntry[]) {
            let topAxis: LayoutEntry = null;
            let bottomAxis: LayoutEntry = null;
            let center: LayoutEntry = null;
            for (let c = 0; c < children.length; c++) {
                const child = children[c];
                switch (child.layoutArg) {
                    case Side.TOP:
                        if (hasval(topAxis)) {
                            throw new Error('Timeline-layout can have at most one top-axis pane');
                        }
                        topAxis = child;
                        break;

                    case Side.BOTTOM:
                        if (hasval(bottomAxis)) {
                            throw new Error('Timeline-layout can have at most one bottom-axis pane');
                        }
                        bottomAxis = child;
                        break;

                    default:
                        if (hasval(center)) {
                            throw new Error('Timeline-layout can have at most one center pane');
                        }
                        center = child;
                        break;
                }
            }

            let hSum = 0;

            if (hasval(topAxis)) {
                hSum += axisHeight;
            }

            if (hasval(bottomAxis)) {
                hSum += axisHeight;
            }

            if (hasval(center)) {
                if (hasval(center.prefSize.h)) {
                    hSum += center.prefSize.h;
                }
                else {
                    hSum = null;
                }
            }

            parentPrefSize.w = null;
            parentPrefSize.h = hSum;
        },

        updateChildViewports: function (children: LayoutEntry[], parentViewport: BoundsUnmodifiable) {
            let topAxis: LayoutEntry = null;
            let bottomAxis: LayoutEntry = null;
            let center: LayoutEntry = null;
            for (let c = 0; c < children.length; c++) {
                const child = children[c];
                switch (child.layoutArg) {
                    case Side.TOP:
                        if (hasval(topAxis)) {
                            throw new Error('Timeline-layout can have at most one top-axis pane');
                        }
                        topAxis = child;
                        break;

                    case Side.BOTTOM:
                        if (hasval(bottomAxis)) {
                            throw new Error('Timeline-layout can have at most one bottom-axis pane');
                        }
                        bottomAxis = child;
                        break;

                    default:
                        if (hasval(center)) {
                            throw new Error('Timeline-layout can have at most one center pane');
                        }
                        center = child;
                        break;
                }
            }

            if (hasval(topAxis)) {
                topAxis.viewport.setRect(parentViewport.i, parentViewport.jEnd - axisHeight, parentViewport.w, axisHeight);
            }

            if (hasval(bottomAxis)) {
                const jBottomMax = (hasval(topAxis) ? topAxis.viewport.j : parentViewport.jEnd) - axisHeight;
                bottomAxis.viewport.setRect(parentViewport.i, Math.min(jBottomMax, parentViewport.j), parentViewport.w, axisHeight);
            }

            if (hasval(center)) {
                const jCenterEnd = (hasval(topAxis) ? topAxis.viewport.jStart : parentViewport.jEnd);
                const jCenterStart = (hasval(bottomAxis) ? bottomAxis.viewport.jEnd : parentViewport.jStart);
                center.viewport.setEdges(parentViewport.iStart, parentViewport.iEnd, jCenterStart, jCenterEnd);
            }
        }

    };
}


