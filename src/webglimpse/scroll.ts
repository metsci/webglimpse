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
import {Layout, LayoutEntry, Drawable, Pane, Painter, PointerEvent, yFrac, isLeftMouseDown} from './core';
import {Size, BoundsUnmodifiable} from './bounds';
import {Color, gray} from './color';
import {newBackgroundPainter, xyFrac_VERTSHADER, solid_FRAGSHADER, putQuadXys} from './misc';
import {Program, UniformColor, Attribute} from './shader';
import {newDynamicBuffer} from './buffer';
import {GL, hasval} from './util/util';

export interface VerticalScrollLayout extends Layout {
    jOffset: number;
    hContent: number;
    hVisible: number;
}


export function newVerticalScrollLayout(): VerticalScrollLayout {
    const layout = <VerticalScrollLayout>{

        updatePrefSize: function (parentPrefSize: Size, children: LayoutEntry[]) {
            if (children.length === 1) {
                const childPrefSize = children[0].prefSize;

                // XXX: Need some way to override the child's pref-height
                if (!hasval(childPrefSize.h)) {
                    throw new Error('Vertical-scroll layout requires child to have a defined pref-height, but its pref-height is ' + childPrefSize.h);
                }

                parentPrefSize.w = childPrefSize.w;
                parentPrefSize.h = childPrefSize.h;
            }
            else if (children.length > 1) {
                throw new Error('Vertical-scroll layout only works with 1 child, but pane has ' + this.children.length + ' children');
            }
        },

        jOffset: 0,
        hContent: 0,
        hVisible: 0,

        updateChildViewports: function (children: LayoutEntry[], parentViewport: BoundsUnmodifiable) {
            if (children.length === 1) {
                const child = children[0];

                let j;
                const h = child.prefSize.h;
                if (h <= parentViewport.h) {
                    j = parentViewport.jEnd - h;
                }
                else {
                    j = Math.min(parentViewport.j, parentViewport.jEnd - h + Math.max(0, Math.round(layout.jOffset)));
                }

                child.viewport.setRect(parentViewport.i, j, parentViewport.w, h);

                layout.jOffset = (j + h) - parentViewport.jEnd;
                layout.hContent = h;
                layout.hVisible = parentViewport.h;
            }
            else if (children.length > 1) {
                throw new Error('Vertical-scroll layout only works with 1 child, but pane has ' + this.children.length + ' children');
            }
        }

    };
    return layout;
}


export interface ScrollbarOptions {
    fgColor?: Color;
    bgColor?: Color;
    borderColor?: Color;
    borderThickness?: number;
    borderTop?: boolean;
    borderLeft?: boolean;
    borderRight?: boolean;
    borderBottom?: boolean;
}


export function newVerticalScrollbar(scrollLayout: VerticalScrollLayout, drawable: Drawable, options?: ScrollbarOptions): Pane {
    const bgColor = (hasval(options) && hasval(options.bgColor) ? options.bgColor : gray(0.9));

    const scrollbar = new Pane(null);
    scrollbar.addPainter(newBackgroundPainter(bgColor));
    scrollbar.addPainter(newVerticalScrollbarPainter(scrollLayout, options));

    attachVerticalScrollMouseListeners(scrollbar, scrollLayout, drawable);

    return scrollbar;
}


export function newVerticalScrollbarPainter(scrollLayout: VerticalScrollLayout, options?: ScrollbarOptions): Painter {
    const fgColor = (hasval(options) && hasval(options.fgColor) ? options.fgColor : gray(0.56));
    const borderColor = (hasval(options) && hasval(options.borderColor) ? options.borderColor : gray(0.42));
    const borderThickness = (hasval(options) && hasval(options.borderThickness) ? options.borderThickness : 1);
    const borderTop = (hasval(options) && hasval(options.borderTop) ? options.borderTop : true);
    const borderLeft = (hasval(options) && hasval(options.borderLeft) ? options.borderLeft : false);
    const borderRight = (hasval(options) && hasval(options.borderRight) ? options.borderRight : false);
    const borderBottom = (hasval(options) && hasval(options.borderBottom) ? options.borderBottom : true);

    const program = new Program(xyFrac_VERTSHADER, solid_FRAGSHADER);
    const u_Color = new UniformColor(program, 'u_Color');
    const a_XyFrac = new Attribute(program, 'a_XyFrac');

    const numFillVertices = 6;
    const numBorderVertices = (borderTop ? 6 : 0) + (borderLeft ? 6 : 0) + (borderRight ? 6 : 0) + (borderBottom ? 6 : 0);
    const xyFrac = new Float32Array(2 * Math.max(numFillVertices, numBorderVertices));
    const xyFracBuffer = newDynamicBuffer();

    return function (gl: WebGLRenderingContext, viewport: BoundsUnmodifiable) {
        const hFrac = scrollLayout.hVisible / scrollLayout.hContent;
        if (hFrac < 1) {
            const yTop = Math.round(((scrollLayout.hContent - (scrollLayout.jOffset)) / scrollLayout.hContent) * viewport.h + 1e-4);
            const yBottom = Math.round(((scrollLayout.hContent - (scrollLayout.jOffset + scrollLayout.hVisible)) / scrollLayout.hContent) * viewport.h + 1e-4);

            const yFracTop = yTop / viewport.h;
            const yFracBottom = yBottom / viewport.h;

            const wBorderFrac = borderThickness / viewport.w;
            const hBorderFrac = borderThickness / viewport.h;

            gl.disable(GL.BLEND);

            program.use(gl);


            // Fill
            //

            putQuadXys(xyFrac, 0, 0 + (borderLeft ? wBorderFrac : 0), 1 - (borderRight ? wBorderFrac : 0), yFracTop - (borderTop ? hBorderFrac : 0), yFracBottom + (borderBottom ? hBorderFrac : 0));
            xyFracBuffer.setData(xyFrac.subarray(0, 2 * numFillVertices));
            a_XyFrac.setDataAndEnable(gl, xyFracBuffer, 2, GL.FLOAT);
            u_Color.setData(gl, fgColor);
            gl.drawArrays(GL.TRIANGLES, 0, numFillVertices);


            // Border
            //

            let index = 0;
            if (borderTop) {
                index = putQuadXys(xyFrac, index, 0, 1 - (borderRight ? wBorderFrac : 0), yFracTop, yFracTop - hBorderFrac);
            }
            if (borderBottom) {
                index = putQuadXys(xyFrac, index, 0 + (borderLeft ? wBorderFrac : 0), 1, yFracBottom + hBorderFrac, yFracBottom);
            }
            if (borderRight) {
                index = putQuadXys(xyFrac, index, 1 - wBorderFrac, 1, yFracTop, yFracBottom + (borderBottom ? hBorderFrac : 0));
            }
            if (borderLeft) {
                index = putQuadXys(xyFrac, index, 0, 0 + wBorderFrac, yFracTop - (borderTop ? hBorderFrac : 0), yFracBottom);
            }

            xyFracBuffer.setData(xyFrac.subarray(0, 2 * numBorderVertices));
            a_XyFrac.setDataAndEnable(gl, xyFracBuffer, 2, GL.FLOAT);
            u_Color.setData(gl, borderColor);
            gl.drawArrays(GL.TRIANGLES, 0, numBorderVertices);


            a_XyFrac.disable(gl);
            program.endUse(gl);
        }
    };
}

// mouse listener for scrolling while panning on the timeline itself
export function attachTimelineVerticalScrollMouseListeners(pane: Pane, scrollLayout: VerticalScrollLayout, drawable: Drawable) {

    // Used when dragging inside pane
    let grab: number = null;
    let jOffset: number = null;

    pane.mouseDown.on(function (ev: PointerEvent) {
        if (isLeftMouseDown(ev.mouseEvent)) {
            grab = ev.j;
            jOffset = scrollLayout.jOffset;
        }
    });

    pane.mouseMove.on(function (ev: PointerEvent) {
        if (hasval(grab)) {
            scrollLayout.jOffset = jOffset - (grab - ev.j);
            drawable.redraw();
        }
    });

    pane.mouseUp.on(function (ev: PointerEvent) {
        grab = null;
    });
}

// mouse listener for scrolling while interacting with the scrollbar
export function attachVerticalScrollMouseListeners(scrollbar: Pane, scrollLayout: VerticalScrollLayout, drawable: Drawable) {

    // Used when dragging the handle
    let grab: number = null;

    // Used when scrollbar is pressed-and-held outside the handle
    let pageScrollTimer: any = null;
    let recentPointerFrac: number = null;

    scrollbar.mouseDown.on(function (ev: PointerEvent) {
        if (isLeftMouseDown(ev.mouseEvent) && !hasval(grab)) {
            const topFrac = (scrollLayout.hContent - scrollLayout.jOffset) / scrollLayout.hContent;
            const fracExtent = scrollLayout.hVisible / scrollLayout.hContent;
            const pointerFrac = yFrac(ev);
            if (topFrac - fracExtent <= pointerFrac && pointerFrac <= topFrac) {
                grab = (topFrac - pointerFrac) / fracExtent;
            }
            else {
                // If the mouse is pressed on the scrollbar but outside the handle:
                //
                //  1. Immediately scroll one page toward the mouse
                //  2. Wait 500ms
                //  3. If the mouse-button is still down, scroll one page toward the mouse
                //  4. Wait 50ms
                //  5. Go to Step 3
                //
                // (A "page" is 7/8 of the viewport extent.)
                //

                let direction = 0;
                if (pointerFrac < topFrac - fracExtent) {
                    direction = +1;
                }
                else if (pointerFrac > topFrac) {
                    direction = -1;
                }
                scrollLayout.jOffset += direction * Math.max(1, 0.875 * scrollLayout.hVisible);
                drawable.redraw();

                recentPointerFrac = pointerFrac;
                const pageScroll = function () {
                    const pageTopFrac = (scrollLayout.hContent - scrollLayout.jOffset) / scrollLayout.hContent;
                    const pageFracExtent = scrollLayout.hVisible / scrollLayout.hContent;
                    const pagePointerFrac = recentPointerFrac;

                    let pageDirection = 0;
                    if (pagePointerFrac < pageTopFrac - pageFracExtent) {
                        pageDirection = +1;
                    }
                    else if (pagePointerFrac > pageTopFrac) {
                        pageDirection = -1;
                    }
                    scrollLayout.jOffset += pageDirection * Math.max(1, 0.875 * scrollLayout.hVisible);
                    drawable.redraw();

                    pageScrollTimer = setTimeout(pageScroll, 50);
                };
                pageScrollTimer = setTimeout(pageScroll, 500);
            }
        }
    });

    scrollbar.mouseMove.on(function (ev: PointerEvent) {
        const pointerFrac = yFrac(ev);
        if (hasval(grab)) {
            const fracExtent = scrollLayout.hVisible / scrollLayout.hContent;
            const topFrac = pointerFrac + grab * fracExtent;
            scrollLayout.jOffset = scrollLayout.hContent - topFrac * scrollLayout.hContent;
            drawable.redraw();
        }
        if (hasval(pageScrollTimer)) {
            recentPointerFrac = pointerFrac;
        }
    });

    scrollbar.mouseUp.on(function (ev: PointerEvent) {
        grab = null;
        if (hasval(pageScrollTimer)) {
            clearTimeout(pageScrollTimer);
            pageScrollTimer = null;
            recentPointerFrac = null;
        }
    });

}


