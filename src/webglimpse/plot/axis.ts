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
import { Notification, Listener } from '../util/notification';
import { log10, hasval } from '../util/util';
import { xFrac, yFrac, Pane, PointerEvent, isLeftMouseDown } from '../core';


export class Axis1D {
    private _vMin: number;
    private _vMax: number;
    private _vMinLimit: number;
    private _vMaxLimit: number;
    private _limitsChanged = new Notification();

    constructor(vMin: number, vMax: number, vMinLimit = -Infinity, vMaxLimit = Infinity) {
        this._vMin = Math.max(vMin, vMinLimit);
        this._vMax = Math.min(vMax, vMaxLimit);
        this._vMinLimit = vMinLimit;
        this._vMaxLimit = vMaxLimit;
    }

    get vMin(): number {
        return this._vMin;
    }

    get vMax(): number {
        return this._vMax;
    }

    get vMinLimit(): number {
        return this._vMinLimit;
    }

    get vMaxLimit(): number {
        return this._vMaxLimit;
    }

    get limitsChanged(): Notification {
        return this._limitsChanged;
    }

    set vMin(vMin: number) {
        this._vMin = Math.max(vMin, this._vMinLimit);
        this._limitsChanged.fire();
    }

    set vMax(vMax: number) {
        this._vMax = Math.min(vMax, this._vMaxLimit);
        this._limitsChanged.fire();
    }

    set vMinLimit(vMinLimit: number) {
        this._vMinLimit = vMinLimit;
        this._vMin = Math.max(this._vMin, vMinLimit);
        this._vMax = Math.max(this._vMax, vMinLimit);
        this._limitsChanged.fire();
    }

    set vMaxLimit(vMaxLimit: number) {
        this._vMaxLimit = vMaxLimit;
        this._vMin = Math.min(this._vMin, vMaxLimit);
        this._vMax = Math.min(this._vMax, vMaxLimit);
        this._limitsChanged.fire();
    }

    setVRange(vMin: number, vMax: number) {
        this._vMin = Math.max(vMin, this._vMinLimit);
        this._vMax = Math.min(vMax, this._vMaxLimit);
        this._limitsChanged.fire();
    }

    get vSize(): number {
        return (this._vMax - this._vMin);
    }

    vAtFrac(vFrac: number): number {
        return (this._vMin + vFrac * (this._vMax - this._vMin));
    }

    vFrac(v: number): number {
        return (v - this._vMin) / (this._vMax - this._vMin);
    }

    pan(vAmount: number) {
        if (vAmount + this._vMin < this._vMinLimit) {
            this._vMax = this._vMinLimit + this.vSize;
            this._vMin = this._vMinLimit;
        } else if (vAmount + this._vMax > this._vMaxLimit) {
            this._vMin = this._vMaxLimit - this.vSize;
            this._vMax = this._vMaxLimit;
        } else {
            this._vMin += vAmount;
            this._vMax += vAmount;
        }
        this._limitsChanged.fire();
    }

    zoom(factor: number, vAnchor: number) {
        const newVMin = vAnchor - factor * (vAnchor - this._vMin);
        const newVMax = vAnchor + factor * (this._vMax - vAnchor);
        this._vMin = Math.max(newVMin, this._vMinLimit);
        this._vMax = Math.min(newVMax, this._vMaxLimit);
        this._limitsChanged.fire();
    }
}


export function getTickInterval(axis: Axis1D, approxNumTicks: number): number {
    const vMin = Math.min(axis.vMin, axis.vMax);
    const vMax = Math.max(axis.vMin, axis.vMax);
    const approxTickInterval = (vMax - vMin) / approxNumTicks;
    const prelimTickInterval = Math.pow(10, Math.round(log10(approxTickInterval)));
    const prelimNumTicks = (vMax - vMin) / prelimTickInterval;

    if (prelimNumTicks >= 5 * approxNumTicks) {
        return (prelimTickInterval * 5);
    }
    if (prelimNumTicks >= 2 * approxNumTicks) {
        return (prelimTickInterval * 2);
    }

    if (5 * prelimNumTicks <= approxNumTicks) {
        return (prelimTickInterval / 5);
    }
    if (2 * prelimNumTicks <= approxNumTicks) {
        return (prelimTickInterval / 2);
    }

    return prelimTickInterval;
}


export function getTickCount(axis: Axis1D, tickInterval: number): number {
    return Math.ceil(Math.abs(axis.vSize) / tickInterval) + 1;
}


export function getTickPositions(axis: Axis1D, tickInterval: number, tickCount: number, result: Float32Array) {
    const vMin = Math.min(axis.vMin, axis.vMax);
    const vMax = Math.max(axis.vMin, axis.vMax);

    const minTickNumber = Math.floor(vMin / tickInterval);

    for (let i = 0; i < tickCount; i++) {
        result[i] = (minTickNumber + i) * tickInterval;
    }

    if (axis.vMin > axis.vMax) {
        // XXX: Need floor() on tickCount/2?
        for (let i = 0; i < tickCount / 2; i++) {
            const temp = result[i];
            result[i] = result[tickCount - 1 - i];
            result[tickCount - 1 - i] = temp;
        }
    }
}


export class Axis2D {
    private _xAxis: Axis1D;
    private _yAxis: Axis1D;

    get xAxis(): Axis1D { return this._xAxis; }
    get xMin(): number { return this._xAxis.vMin; }
    get xMax(): number { return this._xAxis.vMax; }
    xAtFrac(xFrac: number): number { return this._xAxis.vAtFrac(xFrac); }

    get yAxis(): Axis1D { return this._yAxis; }
    get yMin(): number { return this._yAxis.vMin; }
    get yMax(): number { return this._yAxis.vMax; }
    yAtFrac(yFrac: number): number { return this._yAxis.vAtFrac(yFrac); }

    constructor(xAxis: Axis1D, yAxis: Axis1D) {
        this._xAxis = xAxis;
        this._yAxis = yAxis;
    }

    onLimitsChanged(listener: Listener) {
        this._xAxis.limitsChanged.on(listener);
        this._yAxis.limitsChanged.on(listener);
    }

    pan(xAmount: number, yAmount: number) {
        this._xAxis.pan(xAmount);
        this._yAxis.pan(yAmount);
    }

    zoom(factor: number, xAnchor: number, yAnchor: number) {
        this._xAxis.zoom(factor, xAnchor);
        this._yAxis.zoom(factor, yAnchor);
    }
}


export function newAxis2D(xMin: number, xMax: number, yMin: number, yMax: number): Axis2D {
    return new Axis2D(new Axis1D(xMin, xMax), new Axis1D(yMin, yMax));
}


// XXX: Would be nice if this could be a const
export let axisZoomStep = 1.12;


export function attachAxisMouseListeners1D(pane: Pane, axis: Axis1D, isVertical: boolean) {
    let vGrab: number = null;

    pane.mouseDown.on(function (ev: PointerEvent) {
        if (isLeftMouseDown(ev.mouseEvent) && !hasval(vGrab)) {
            vGrab = axis.vAtFrac(isVertical ? yFrac(ev) : xFrac(ev));
        }
    });

    pane.mouseMove.on(function (ev: PointerEvent) {
        if (isLeftMouseDown(ev.mouseEvent) && hasval(vGrab)) {
            axis.pan(vGrab - axis.vAtFrac(isVertical ? yFrac(ev) : xFrac(ev)));
        }
    });

    pane.mouseUp.on(function (ev: PointerEvent) {
        vGrab = null;
    });

    pane.mouseWheel.on(function (ev: PointerEvent) {
        const zoomFactor = Math.pow(axisZoomStep, ev.wheelSteps);
        axis.zoom(zoomFactor, axis.vAtFrac(isVertical ? yFrac(ev) : xFrac(ev)));
    });
}


export function attachAxisMouseListeners2D(pane: Pane, axis: Axis2D) {
    let xGrab: number = null;
    let yGrab: number = null;

    pane.mouseDown.on(function (ev: PointerEvent) {
        if (isLeftMouseDown(ev.mouseEvent) && !hasval(xGrab)) {
            xGrab = axis.xAtFrac(xFrac(ev));
            yGrab = axis.yAtFrac(yFrac(ev));
        }
    });

    pane.mouseMove.on(function (ev: PointerEvent) {
        if (isLeftMouseDown(ev.mouseEvent) && hasval(xGrab)) {
            axis.pan(xGrab - axis.xAtFrac(xFrac(ev)), yGrab - axis.yAtFrac(yFrac(ev)));
        }
    });

    pane.mouseUp.on(function (ev: PointerEvent) {
        xGrab = null;
        yGrab = null;
    });

    pane.mouseWheel.on(function (ev: PointerEvent) {
        const zoomFactor = Math.pow(axisZoomStep, ev.wheelSteps);
        axis.zoom(zoomFactor, axis.xAtFrac(xFrac(ev)), axis.yAtFrac(yFrac(ev)));
    });
}

