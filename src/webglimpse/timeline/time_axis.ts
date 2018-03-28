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
import { Axis1D } from '../plot/axis';


export class TimeAxis1D extends Axis1D {

    private _epoch_PMILLIS: number;

    constructor(tMin_PMILLIS: number, tMax_PMILLIS: number) {
        const epoch_PMILLIS = 0.5 * (tMin_PMILLIS + tMax_PMILLIS);
        super(tMin_PMILLIS - epoch_PMILLIS, tMax_PMILLIS - epoch_PMILLIS);
        this._epoch_PMILLIS = epoch_PMILLIS;
    }

    get tMin_PMILLIS(): number {
        return (this._epoch_PMILLIS + this.vMin);
    }

    get tMax_PMILLIS(): number {
        return (this._epoch_PMILLIS + this.vMax);
    }

    set tMin_PMILLIS(tMin_PMILLIS: number) {
        this.vMin = (tMin_PMILLIS - this._epoch_PMILLIS);
    }

    set tMax_PMILLIS(tMax_PMILLIS: number) {
        this.vMax = (tMax_PMILLIS - this._epoch_PMILLIS);
    }

    setTRange_PMILLIS(tMin_PMILLIS: number, tMax_PMILLIS: number) {
        this.setVRange(tMin_PMILLIS - this._epoch_PMILLIS, tMax_PMILLIS - this._epoch_PMILLIS);
    }

    get tSize_MILLIS(): number {
        return this.vSize;
    }

    vAtTime(t_PMILLIS: number): number {
        return (t_PMILLIS - this._epoch_PMILLIS);
    }

    tAtFrac_PMILLIS(tFrac: number): number {
        return (this._epoch_PMILLIS + this.vAtFrac(tFrac));
    }

    tFrac(t_PMILLIS: number): number {
        return this.vFrac(t_PMILLIS - this._epoch_PMILLIS);
    }

    tPan(tAmount_MILLIS: number) {
        this.pan(tAmount_MILLIS);
    }

    tZoom(factor: number, tAnchor_PMILLIS: number) {
        this.zoom(factor, tAnchor_PMILLIS - this._epoch_PMILLIS);
    }

}


