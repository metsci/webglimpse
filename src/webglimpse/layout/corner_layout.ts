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
import { Side } from '../misc';
import { Layout, LayoutEntry } from '../core';
import { Size, BoundsUnmodifiable } from '../bounds';
import { hasval } from '../util/util';


export function newCornerLayout(hSide: Side, vSide: Side): Layout {
    return <Layout>{
        updatePrefSize: function (parentPrefSize: Size, children: LayoutEntry[]) {
            if (children.length === 1) {
                let childPrefSize = children[0].prefSize;
                parentPrefSize.w = childPrefSize.w;
                parentPrefSize.h = childPrefSize.h;
            }
            else if (children.length > 1) {
                throw new Error('Corner layout only works with 1 child, but pane has ' + this.children.length + ' children');
            }
        },
        updateChildViewports: function (children: LayoutEntry[], parentViewport: BoundsUnmodifiable) {
            if (children.length === 1) {
                let child = children[0];

                let iStart;
                let iEnd;
                let w = child.prefSize.w;
                if (hSide === Side.RIGHT) {
                    iEnd = parentViewport.iEnd;
                    iStart = (hasval(w) ? Math.max(iEnd - w, parentViewport.iStart) : parentViewport.iStart);
                }
                else {
                    iStart = parentViewport.iStart;
                    iEnd = (hasval(w) ? Math.min(iStart + w, parentViewport.iEnd) : parentViewport.iEnd);
                }

                let jStart;
                let jEnd;
                let h = child.prefSize.h;
                if (vSide === Side.BOTTOM) {
                    jStart = parentViewport.jStart;
                    jEnd = (hasval(h) ? Math.min(jStart + h, parentViewport.jEnd) : parentViewport.jEnd);
                }
                else {
                    jEnd = parentViewport.jEnd;
                    jStart = (hasval(h) ? Math.max(jEnd - h, parentViewport.jStart) : parentViewport.jStart);
                }

                child.viewport.setEdges(iStart, iEnd, jStart, jEnd);
            }
            else if (children.length > 1) {
                throw new Error('Corner layout only works with 1 child, but pane has ' + this.children.length + ' children');
            }
        }
    };
}


