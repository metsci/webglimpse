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
import { Notification } from './notification';

export function initSplitContainer(container: HTMLElement): Notification {
    let tilesResized = new Notification();

    _initSplitContainer(container, tilesResized);

    window.addEventListener('resize', function () {
        tilesResized.fire();
    });
    tilesResized.fire();

    return tilesResized;
}




function _initSplitContainer(container: HTMLElement, tilesResized: Notification) {
    let tileA: HTMLElement = null;
    let tileB: HTMLElement = null;
    let sep: HTMLElement = null;
    let children = container.childNodes;
    for (let n = 0; n < children.length; n++) {
        let child = children[n];
        if (child.nodeType === 1 && (<any>child).classList) {
            let element = <HTMLElement>child;
            if (tileA == null) {
                if (element.classList.contains('splitContainerNS') || element.classList.contains('splitContainerEW') || element.classList.contains('splitTile')) {
                    tileA = element;
                }
            }
            else if (sep == null) {
                if (element.classList.contains('splitSep')) {
                    sep = element;
                }
            }
            else if (tileB == null) {
                if (element.classList.contains('splitContainerNS') || element.classList.contains('splitContainerEW') || element.classList.contains('splitTile')) {
                    tileB = element;
                }
            }
            else {
                break;
            }
        }
    }
    if (tileA == null) throw new Error('Failed to init split-container: could not find first tile');
    if (sep == null) throw new Error('Failed to init split-container: could not find separator');
    if (tileB == null) throw new Error('Failed to init split-container: could not find second tile');

    if (container.classList.contains('splitContainerNS')) {
        _initSplitNS(container, tileA, sep, tileB, tilesResized);
    }
    else if (container.classList.contains('splitContainerEW')) {
        _initSplitEW(container, tileA, sep, tileB, tilesResized);
    }

    if (tileA.classList.contains('splitContainerNS') || tileA.classList.contains('splitContainerEW')) {
        _initSplitContainer(tileA, tilesResized);
    }

    if (tileB.classList.contains('splitContainerNS') || tileB.classList.contains('splitContainerEW')) {
        _initSplitContainer(tileB, tilesResized);
    }
}




function _initSplitNS(container: HTMLElement, tileA: HTMLElement, sep: HTMLElement, tileB: HTMLElement, tilesResized: Notification): void {
    sep.classList.add('splitSepNS');
    sep.style.left = '0px';
    sep.style.right = '0px';
    tileA.style.left = '0px';
    tileA.style.right = '0px';
    tileB.style.left = '0px';
    tileB.style.right = '0px';

    let minHeightA = 1;
    let minHeightB = 1;
    let recentFracA: number = null;

    function layoutTiles(prelimHeightA?: number) {
        let heightSep = sep.getBoundingClientRect().height;
        let heightContainer = container.getBoundingClientRect().height;
        let heightContent = heightContainer - heightSep;
        if (recentFracA == null) {
            recentFracA = tileA.getBoundingClientRect().height / heightContent;
        }

        let keepFracA = (prelimHeightA == null);
        if (keepFracA) {
            prelimHeightA = Math.round(recentFracA * heightContent);
        }

        let maxHeightA = heightContainer - heightSep - minHeightB;

        let topA = 0;
        let heightA = Math.max(minHeightA, Math.min(maxHeightA, prelimHeightA));
        tileA.style.top = topA + 'px';
        tileA.style.height = heightA + 'px';

        let topSep = topA + heightA;
        sep.style.top = topSep + 'px';
        sep.style.height = heightSep + 'px';

        let topB = topSep + heightSep;
        let heightB = Math.max(minHeightB, heightContainer - topB);
        tileB.style.top = topB + 'px';
        tileB.style.height = heightB + 'px';

        if (!keepFracA && heightContent >= heightA && heightContent >= (minHeightA + minHeightB)) {
            recentFracA = heightA / heightContent;
        }
    }

    let sepGrab: number = null;

    sep.addEventListener('mousedown', function (ev: MouseEvent) {
        if (ev.button === 0) {
            sepGrab = ev.clientY - tileA.getBoundingClientRect().top - tileA.getBoundingClientRect().height;
            ev.preventDefault();
        }
    });

    // During a DRAG we want all move events, even ones that occur outside the canvas -- so subscribe to WINDOW's mousemove
    window.addEventListener('mousemove', function (ev: MouseEvent) {
        if (sepGrab != null) {
            layoutTiles(ev.clientY - tileA.getBoundingClientRect().top - sepGrab);
            tilesResized.fire();
        }
    });

    // The window always gets the mouse-up event at the end of a drag -- even if it occurs outside the browser window
    window.addEventListener('mouseup', function (ev: MouseEvent) {
        if (sepGrab != null && ev.button === 0) {
            layoutTiles(ev.clientY - tileA.getBoundingClientRect().top - sepGrab);
            tilesResized.fire();
            sepGrab = null;
        }
    });

    tilesResized.on(layoutTiles);
}




function _initSplitEW(container: HTMLElement, tileA: HTMLElement, sep: HTMLElement, tileB: HTMLElement, tilesResized: Notification): void {
    sep.classList.add('splitSepEW');
    sep.style.top = '0px';
    sep.style.bottom = '0px';
    tileA.style.top = '0px';
    tileA.style.bottom = '0px';
    tileB.style.top = '0px';
    tileB.style.bottom = '0px';

    let minWidthA = 1;
    let minWidthB = 1;
    let recentFracA: number = null;

    function layoutTiles(prelimWidthA?: number) {
        let widthSep = sep.getBoundingClientRect().width;
        let widthContainer = container.getBoundingClientRect().width;
        let widthContent = widthContainer - widthSep;
        if (recentFracA == null) {
            recentFracA = tileA.getBoundingClientRect().width / widthContent;
        }

        let keepFracA = (prelimWidthA == null);
        if (keepFracA) {
            prelimWidthA = Math.round(recentFracA * widthContent);
        }

        let maxWidthA = widthContainer - widthSep - minWidthB;

        let leftA = 0;
        let widthA = Math.max(minWidthA, Math.min(maxWidthA, prelimWidthA));
        tileA.style.left = leftA + 'px';
        tileA.style.width = widthA + 'px';

        let leftSep = leftA + widthA;
        sep.style.left = leftSep + 'px';
        sep.style.width = widthSep + 'px';

        let leftB = leftSep + widthSep;
        let widthB = Math.max(minWidthB, widthContainer - leftB);
        tileB.style.left = leftB + 'px';
        tileB.style.width = widthB + 'px';

        if (!keepFracA && widthContent >= widthA && widthContent >= (minWidthA + minWidthB)) {
            recentFracA = widthA / widthContent;
        }
    }

    let sepGrab: number = null;

    sep.addEventListener('mousedown', function (ev: MouseEvent) {
        if (ev.button === 0) {
            sepGrab = ev.clientX - tileA.getBoundingClientRect().left - tileA.getBoundingClientRect().width;
            ev.preventDefault();
        }
    });

    // During a DRAG we want all move events, even ones that occur outside the canvas -- so subscribe to WINDOW's mousemove
    window.addEventListener('mousemove', function (ev: MouseEvent) {
        if (sepGrab != null) {
            layoutTiles(ev.clientX - tileA.getBoundingClientRect().left - sepGrab);
            tilesResized.fire();
        }
    });

    // The window always gets the mouse-up event at the end of a drag -- even if it occurs outside the browser window
    window.addEventListener('mouseup', function (ev: MouseEvent) {
        if (sepGrab != null && ev.button === 0) {
            layoutTiles(ev.clientX - tileA.getBoundingClientRect().left - sepGrab);
            tilesResized.fire();
            sepGrab = null;
        }
    });

    tilesResized.on(layoutTiles);
}



