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
import { isEmpty, hasval } from '../util/util';


/**
 * Simple layout which sets the sizes of all child panes to the size of the parent pane
 * (causing all the children to 'overlay' each other and the parent).
 */
export function newOverlayLayout(): Layout {

    return <Layout>{

        updatePrefSize: function (parentPrefSize: Size, children: LayoutEntry[]) {
            const underlays: LayoutEntry[] = [];
            for (let c = 0; c < children.length; c++) {
                const child = children[c];
                const isUnderlay = child.layoutArg;
                if (isUnderlay) {
                    underlays.push(child);
                }
            }

            if (!isEmpty(underlays)) {
                let maxChildPrefWidth = 0;
                let maxChildPrefHeight = 0;
                for (let c = 0; c < underlays.length; c++) {
                    const childPrefSize = underlays[c].prefSize;

                    const childPrefWidth = childPrefSize.w;
                    if (hasval(maxChildPrefWidth) && hasval(childPrefWidth)) {
                        maxChildPrefWidth = Math.max(maxChildPrefWidth, childPrefWidth);
                    }
                    else {
                        maxChildPrefWidth = null;
                    }

                    const childPrefHeight = childPrefSize.h;
                    if (hasval(maxChildPrefHeight) && hasval(childPrefHeight)) {
                        maxChildPrefHeight = Math.max(maxChildPrefHeight, childPrefHeight);
                    }
                    else {
                        maxChildPrefHeight = null;
                    }
                }
                parentPrefSize.w = maxChildPrefWidth;
                parentPrefSize.h = maxChildPrefHeight;
            }
            else {
                parentPrefSize.w = 0;
                parentPrefSize.h = 0;
            }
        },

        updateChildViewports: function (children: LayoutEntry[], parentViewport: BoundsUnmodifiable) {
            for (let c = 0; c < children.length; c++) {
                children[c].viewport.setBounds(parentViewport);
            }
        }

    };
}
