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
import { Color } from '../color';
import { Painter } from '../core';
import { Program, UniformColor, Attribute } from '../shader';
import { xyNdc_VERTSHADER, solid_FRAGSHADER, putQuadXys, fracToNdc } from '../misc';
import { newDynamicBuffer } from '../buffer';
import { BoundsUnmodifiable } from '../bounds';
import { GL, hasval } from '../util/util';


export interface BorderOptions {
    drawTop?: boolean;
    drawLeft?: boolean;
    drawRight?: boolean;
    drawBottom?: boolean;
    thickness?: number;
}


export function newBorderPainter(color: Color, options?: BorderOptions): Painter {
    if (!hasval(options)) options = {};
    if (!hasval(options.drawTop)) options.drawTop = true;
    if (!hasval(options.drawLeft)) options.drawLeft = true;
    if (!hasval(options.drawRight)) options.drawRight = true;
    if (!hasval(options.drawBottom)) options.drawBottom = true;
    if (!hasval(options.thickness)) options.thickness = 1;

    let simple = (options.thickness === 1 && color.a >= 1);
    return (simple ? newSimpleBorderPainter(color, options) : newFullBorderPainter(color, options));
}


function newFullBorderPainter(color: Color, options: BorderOptions): Painter {
    let drawTop = options.drawTop;
    let drawLeft = options.drawLeft;
    let drawRight = options.drawRight;
    let drawBottom = options.drawBottom;
    let thickness = options.thickness;

    let program = new Program(xyNdc_VERTSHADER, solid_FRAGSHADER);
    let u_Color = new UniformColor(program, 'u_Color');
    let a_XyNdc = new Attribute(program, 'a_XyNdc');

    let numVertices = (drawTop ? 6 : 0) + (drawLeft ? 6 : 0) + (drawRight ? 6 : 0) + (drawBottom ? 6 : 0);
    let xy_NDC = new Float32Array(2 * numVertices);
    let xyBuffer_NDC = newDynamicBuffer();

    return function (gl: WebGLRenderingContext, viewport: BoundsUnmodifiable) {
        if (color.a >= 1) {
            gl.disable(GL.BLEND);
        }
        else {
            gl.blendFuncSeparate(GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA, GL.ONE, GL.ONE_MINUS_SRC_ALPHA);
            gl.enable(GL.BLEND);
        }

        program.use(gl);
        u_Color.setData(gl, color);

        let w_NDC = 2 * thickness / viewport.w;
        let h_NDC = 2 * thickness / viewport.h;
        let index = 0;
        if (drawTop) index = putQuadXys(xy_NDC, index, -1, (drawRight ? +1 - w_NDC : +1), +1, +1 - h_NDC);
        if (drawRight) index = putQuadXys(xy_NDC, index, +1 - w_NDC, +1, +1, (drawBottom ? -1 + h_NDC : -1));
        if (drawBottom) index = putQuadXys(xy_NDC, index, (drawLeft ? -1 + w_NDC : -1), +1, -1 + h_NDC, -1);
        if (drawLeft) index = putQuadXys(xy_NDC, index, -1, -1 + w_NDC, (drawTop ? +1 - h_NDC : +1), -1);

        xyBuffer_NDC.setData(xy_NDC);
        a_XyNdc.setDataAndEnable(gl, xyBuffer_NDC, 2, GL.FLOAT);

        gl.drawArrays(GL.TRIANGLES, 0, numVertices);

        a_XyNdc.disable(gl);
        program.endUse(gl);
    };
}


function newSimpleBorderPainter(color: Color, options: BorderOptions): Painter {
    let drawTop = options.drawTop;
    let drawLeft = options.drawLeft;
    let drawRight = options.drawRight;
    let drawBottom = options.drawBottom;

    let program = new Program(xyNdc_VERTSHADER, solid_FRAGSHADER);
    let u_Color = new UniformColor(program, 'u_Color');
    let a_XyNdc = new Attribute(program, 'a_XyNdc');

    let numVertices = (drawTop ? 2 : 0) + (drawLeft ? 2 : 0) + (drawRight ? 2 : 0) + (drawBottom ? 2 : 0);
    let xy_NDC = new Float32Array(2 * numVertices);
    let xyBuffer_NDC = newDynamicBuffer();

    return function (gl: WebGLRenderingContext, viewport: BoundsUnmodifiable) {
        gl.disable(GL.BLEND);

        program.use(gl);
        u_Color.setData(gl, color);

        let left_NDC = fracToNdc(0.5 / viewport.w);
        let bottom_NDC = fracToNdc(0.5 / viewport.h);
        let right_NDC = fracToNdc((viewport.w - 0.5) / viewport.w);
        let top_NDC = fracToNdc((viewport.h - 0.5) / viewport.h);

        let n = 0;
        if (drawTop) {
            xy_NDC[n++] = -1; xy_NDC[n++] = top_NDC;
            xy_NDC[n++] = +1; xy_NDC[n++] = top_NDC;
        }
        if (drawRight) {
            xy_NDC[n++] = right_NDC; xy_NDC[n++] = +1;
            xy_NDC[n++] = right_NDC; xy_NDC[n++] = -1;
        }
        if (drawBottom) {
            xy_NDC[n++] = +1; xy_NDC[n++] = bottom_NDC;
            xy_NDC[n++] = -1; xy_NDC[n++] = bottom_NDC;
        }
        if (drawLeft) {
            xy_NDC[n++] = left_NDC; xy_NDC[n++] = -1;
            xy_NDC[n++] = left_NDC; xy_NDC[n++] = +1;
        }

        xyBuffer_NDC.setData(xy_NDC);
        a_XyNdc.setDataAndEnable(gl, xyBuffer_NDC, 2, GL.FLOAT);

        // IE does not support lineWidths other than 1, so make sure all browsers use lineWidth of 1
        gl.lineWidth(1);
        gl.drawArrays(GL.LINES, 0, numVertices);

        a_XyNdc.disable(gl);
        program.endUse(gl);
    };
}


