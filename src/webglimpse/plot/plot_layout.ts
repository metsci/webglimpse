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
import { BoundsUnmodifiable } from '../bounds';
import { Side } from '../misc';
import { hasval } from '../util/util';

export function newPlotLayout(options?: { horizAxisHeight?: number; vertAxisWidth?: number }): Layout {
    const horizAxisHeight = (hasval(options) && hasval(options.horizAxisHeight) ? options.horizAxisHeight : 60);
    const vertAxisWidth = (hasval(options) && hasval(options.vertAxisWidth) ? options.vertAxisWidth : 70);

    return <Layout>{

        updateChildViewports: function (children: LayoutEntry[], parentViewport: BoundsUnmodifiable) {
            const topAxes = <LayoutEntry[]>[];
            const leftAxes = <LayoutEntry[]>[];
            const rightAxes = <LayoutEntry[]>[];
            const bottomAxes = <LayoutEntry[]>[];
            const centers = <LayoutEntry[]>[];
            const others = <LayoutEntry[]>[];
            for (let c = 0; c < children.length; c++) {
                const child = children[c];
                switch (child.layoutArg) {
                    case Side.TOP: topAxes.push(child); break;
                    case Side.LEFT: leftAxes.push(child); break;
                    case Side.RIGHT: rightAxes.push(child); break;
                    case Side.BOTTOM: bottomAxes.push(child); break;
                    case null: centers.push(child); break;
                    default: others.push(child); break;
                }
            }

            const numVertAxes = leftAxes.length + rightAxes.length;
            const numHorizAxes = topAxes.length + bottomAxes.length;
            const centerWidth = Math.max(vertAxisWidth, parentViewport.w - numVertAxes * vertAxisWidth);
            const centerHeight = Math.max(horizAxisHeight, parentViewport.h - numHorizAxes * horizAxisHeight);
            const vertAxisWidth2 = (numVertAxes === 0 ? 0 : (parentViewport.w - centerWidth) / numVertAxes);
            const horizAxisHeight2 = (numHorizAxes === 0 ? 0 : (parentViewport.h - centerHeight) / numHorizAxes);

            const iCenterStart = parentViewport.iStart + leftAxes.length * vertAxisWidth2;
            const iCenterEnd = parentViewport.iEnd - rightAxes.length * vertAxisWidth2;
            const jCenterStart = parentViewport.jStart + bottomAxes.length * horizAxisHeight2;
            const jCenterEnd = parentViewport.jEnd - topAxes.length * horizAxisHeight2;

            for (let c = 0; c < topAxes.length; c++) {
                const jStart = Math.round(jCenterEnd + c * horizAxisHeight2);
                const jEnd = (c === topAxes.length - 1 ? parentViewport.jEnd : Math.round(jCenterEnd + (c + 1) * horizAxisHeight2));
                topAxes[c].viewport.setEdges(iCenterStart, iCenterEnd, jStart, jEnd);
            }

            for (let c = 0; c < bottomAxes.length; c++) {
                const jStart = (c === bottomAxes.length - 1 ? parentViewport.jStart : Math.round(jCenterStart - (c + 1) * horizAxisHeight2));
                const jEnd = Math.round(jCenterStart - c * horizAxisHeight2);
                bottomAxes[c].viewport.setEdges(iCenterStart, iCenterEnd, jStart, jEnd);
            }

            for (let c = 0; c < leftAxes.length; c++) {
                const iStart = (c === leftAxes.length - 1 ? parentViewport.iStart : Math.round(iCenterStart - (c + 1) * vertAxisWidth2));
                const iEnd = Math.round(iCenterStart - c * vertAxisWidth2);
                leftAxes[c].viewport.setEdges(iStart, iEnd, jCenterStart, jCenterEnd);
            }

            for (let c = 0; c < rightAxes.length; c++) {
                const iStart = Math.round(iCenterEnd + c * vertAxisWidth2);
                const iEnd = (c === rightAxes.length - 1 ? parentViewport.iEnd : Math.round(iCenterEnd + (c + 1) * vertAxisWidth2));
                rightAxes[c].viewport.setEdges(iStart, iEnd, jCenterStart, jCenterEnd);
            }

            for (let c = 0; c < centers.length; c++) {
                centers[c].viewport.setEdges(iCenterStart, iCenterEnd, jCenterStart, jCenterEnd);
            }

            for (let c = 0; c < others.length; c++) {
                others[c].viewport.setEdges(0, 0, 0, 0);
            }
        }

    };
}

