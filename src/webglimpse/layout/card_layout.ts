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
import { hasval } from '../util/util';


/**
 * A layout similar to overlay_layout except only one child pane is visible at a time.
 * That child pane has its size set to the size of the parent pane. The other children panes
 * are made invisible until they are the active pane.
 *
 * The layoutArg for each child is a boolean, true if it should be the active pane. One is chosen
 * arbitrarily if multiple panes have true layoutArg.
 */
export function newCardLayout(): Layout {

    return <Layout>{

        updatePrefSize: function (parentPrefSize: Size, children: LayoutEntry[]) {
            let activeChild: LayoutEntry;

            for (let c = 0; c < children.length; c++) {
                let child = children[c];
                let isActive = child.layoutArg;
                if (isActive) {
                    activeChild = child;
                }
            }

            if (hasval(activeChild)) {

                let childPrefSize = activeChild.prefSize;

                let childPrefWidth = childPrefSize.w;
                if (hasval(childPrefWidth)) {
                    parentPrefSize.w = childPrefWidth;
                }
                else {
                    parentPrefSize.w = null;
                }

                let childPrefHeight = childPrefSize.h;
                if (hasval(childPrefHeight)) {
                    parentPrefSize.h = childPrefHeight;
                }
                else {
                    parentPrefSize.h = null;
                }
            }
            else {
                parentPrefSize.w = 0;
                parentPrefSize.h = 0;
            }
        },

        updateChildViewports: function (children: LayoutEntry[], parentViewport: BoundsUnmodifiable) {
            let activeChildIndex: number;

            for (let c = 0; c < children.length; c++) {
                let child = children[c];
                let isActive = child.layoutArg;
                if (isActive) {
                    activeChildIndex = c;
                }
            }

            for (let c = 0; c < children.length; c++) {
                if (c === activeChildIndex) {
                    children[c].viewport.setBounds(parentViewport);
                }
                else {
                    children[c].viewport.setEdges(0, 0, 0, 0);
                }
            }
        }

    };
}
