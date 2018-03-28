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
import { Color, black } from '../color';
import { TimeAxis1D } from './time_axis';
import { Painter } from '../core';
import { Program, UniformColor, Attribute } from '../shader';
import { xyFrac_VERTSHADER, solid_FRAGSHADER } from '../misc';
import { newDynamicBuffer } from '../buffer';
import { BoundsUnmodifiable } from '../bounds';
import { ensureCapacityFloat32, GL, hasval, parseTime_PMILLIS } from '../util/util';
import { getTickTimes_PMILLIS } from './time_axis_painter';


export interface TimeGridPainterOptions {
    tickSpacing?: number;
    gridColor?: Color;
    referenceDate?: string;
}


export function newTimeGridPainter(timeAxis: TimeAxis1D, isVerticalAxis: boolean, timeZone: string, options?: TimeGridPainterOptions): Painter {
    let tickSpacing = (hasval(options) && hasval(options.tickSpacing) ? options.tickSpacing : 60);
    let gridColor = (hasval(options) && hasval(options.gridColor) ? options.gridColor : black);
    let referenceDate_PMILLIS = (hasval(options) && hasval(options.referenceDate) ? parseTime_PMILLIS(options.referenceDate) : undefined);

    let program = new Program(xyFrac_VERTSHADER, solid_FRAGSHADER);
    let u_Color = new UniformColor(program, 'u_Color');
    let a_XyFrac = new Attribute(program, 'a_XyFrac');

    let xyFrac = new Float32Array(0);
    let xyFracBuffer = newDynamicBuffer();

    return function (gl: WebGLRenderingContext, viewport: BoundsUnmodifiable) {
        let tickTimes_PMILLIS = getTickTimes_PMILLIS(timeAxis, (isVerticalAxis ? viewport.h : viewport.w), tickSpacing, timeZone, referenceDate_PMILLIS);
        let tickCount = tickTimes_PMILLIS.length;

        program.use(gl);
        u_Color.setData(gl, gridColor);

        xyFrac = ensureCapacityFloat32(xyFrac, 4 * tickCount);
        for (let n = 0; n < tickCount; n++) {
            let tFrac = timeAxis.tFrac(tickTimes_PMILLIS[n]);
            if (isVerticalAxis) {
                tFrac = (Math.floor(tFrac * viewport.h) + 0.5) / viewport.h;
                xyFrac[(4 * n + 0)] = 0;
                xyFrac[(4 * n + 1)] = tFrac;
                xyFrac[(4 * n + 2)] = 1;
                xyFrac[(4 * n + 3)] = tFrac;
            }
            else {
                // Adding epsilon is a crude way to compensate for floating-point error (which is probably introduced up where we compute tFrac)
                tFrac = (Math.floor(tFrac * viewport.w + 1e-4) + 0.5) / viewport.w;
                xyFrac[(4 * n + 0)] = tFrac;
                xyFrac[(4 * n + 1)] = 0;
                xyFrac[(4 * n + 2)] = tFrac;
                xyFrac[(4 * n + 3)] = 1;
            }
        }
        xyFracBuffer.setData(xyFrac.subarray(0, 4 * tickCount));
        a_XyFrac.setDataAndEnable(gl, xyFracBuffer, 2, GL.FLOAT);

        // IE does not support lineWidths other than 1, so make sure all browsers use lineWidth of 1
        gl.lineWidth(1);
        gl.drawArrays(GL.LINES, 0, 2 * tickCount);

        a_XyFrac.disable(gl);
        program.endUse(gl);
    }
}


