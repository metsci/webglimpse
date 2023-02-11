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
import { concatLines, GL, hasval } from '../util/util';
import { Axis2D, Axis1D } from './axis';
import { Texture, FloatDataTexture2D } from '../texture';
import { Painter } from '../core';
import { Program, UniformMatrix4f, UniformSampler2D, Uniform1f, Attribute } from '../shader';
import { newStaticBuffer } from '../buffer';
import { BoundsUnmodifiable } from '../bounds';
import { glOrthoAxis } from '../matrix';


export interface HeatmapPainterOptions {
    blend?: boolean;
}

export interface HeatMapData {
    // matrix data stored x-major
    array: Float32Array;

    // size of the matrix
    xSize: number;
    ySize: number;

    // bounds of the matrix in axis coordinates
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
}


export let heatmap_VERTSHADER = concatLines(
    '                                                          ',
    '    uniform mat4 u_modelViewMatrix;                       ',
    '    attribute vec4 a_vertCoord;                           ',
    '    attribute vec2 a_texCoord;                            ',
    '    varying vec2 v_texCoord;                              ',
    '                                                          ',
    '    void main( ) {                                        ',
    '        gl_Position = u_modelViewMatrix * a_vertCoord;    ',
    '        v_texCoord = a_texCoord;                          ',
    '    }                                                     ',
    '                                                          '
);


export let heatmap_FRAGSHADER = concatLines(
    '                                 ',
    '  precision highp float;         ',
    '  uniform sampler2D u_dataTex;   ',
    '  uniform sampler2D u_colorTex;  ',
    '  uniform float u_dataMin;       ',
    '  uniform float u_dataMax;       ',
    '                                 ',
    '  varying vec2 v_texCoord;       ',
    '                                                                                   ',
    '  void main()                                                                      ',
    '  {                                                                                ',
    '     float dataVal = texture2D( u_dataTex, v_texCoord ).r;                         ',
    '     float normalizedVal = ( dataVal - u_dataMin ) / ( u_dataMax - u_dataMin );    ',
    '     clamp( normalizedVal, 0.0, 1.0 );                                             ',
    '                                                                                   ',
    '     vec4 color = texture2D( u_colorTex, vec2( normalizedVal, 0 ) );               ',
    '     gl_FragColor = color;                                                         ',
    '     gl_FragColor.a = 1.0;                                                         ',
    '  }                                                                                '
);

/**
 * Simple heatmap painter which displays a 2d matrix of static data
 */
export function newHeatmapPainter(axis: Axis2D, colorAxis: Axis1D, data: HeatMapData, colorTexture: Texture, options?: HeatmapPainterOptions): Painter {

    const blend = (hasval(options) && hasval(options.blend) ? options.blend : false);

    // only GL_RGBA is supported with GL_FLOAT texture type in webgl (see texture.ts)
    // we we currently need an array 4 times bigger than necessary in order to use FLOATS
    // to store the matrix data in a texture
    const array = new Float32Array(data.xSize * data.ySize * 4);
    for (let x = 0; x < data.xSize; x++) {
        for (let y = 0; y < data.ySize; y++) {
            const index = x * data.ySize + y;
            const value = data.array[index];

            array[4 * index] = value;
            array[4 * index + 1] = value;
            array[4 * index + 2] = value;
            array[4 * index + 3] = value;
        }
    }
    data.array = array;

    const program = new Program(heatmap_VERTSHADER, heatmap_FRAGSHADER);
    const u_modelViewMatrix = new UniformMatrix4f(program, 'u_modelViewMatrix');
    const u_dataTexture = new UniformSampler2D(program, 'u_dataTex');
    const u_colorTexture = new UniformSampler2D(program, 'u_colorTex');
    const u_dataMin = new Uniform1f(program, 'u_dataMin');
    const u_dataMax = new Uniform1f(program, 'u_dataMax');
    const a_vertCoord = new Attribute(program, 'a_vertCoord');
    const a_texCoord = new Attribute(program, 'a_texCoord');

    const texture = new FloatDataTexture2D(data.xSize, data.ySize, data.array);

    // points in triangle strip
    const vertCoordArray = [data.xMin, data.yMax, data.xMax, data.yMax, data.xMin, data.yMin, data.xMax, data.yMin];
    const vertCoordFloatArray = new Float32Array(vertCoordArray);
    const vertCoordBuffer = newStaticBuffer(vertCoordFloatArray);

    // texture coordinates
    const texCoordArray = [0, 1, 1, 1, 0, 0, 1, 0];
    const texCoordFloatArray = new Float32Array(texCoordArray);
    const texCoordBuffer = newStaticBuffer(texCoordFloatArray);

    const dim = 2;
    const vertexCount = 4;

    return function (gl: WebGLRenderingContext, viewport: BoundsUnmodifiable) {

        if (blend) {
            gl.blendFuncSeparate(GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA, GL.ONE, GL.ONE_MINUS_SRC_ALPHA);
            gl.enable(GL.BLEND);
        }

        program.use(gl);
        u_dataTexture.setDataAndBind(gl, 0, texture);
        u_colorTexture.setDataAndBind(gl, 1, colorTexture);
        u_modelViewMatrix.setData(gl, glOrthoAxis(axis));

        u_dataMin.setData(gl, colorAxis.vMin);
        u_dataMax.setData(gl, colorAxis.vMax);

        a_vertCoord.setDataAndEnable(gl, vertCoordBuffer, dim, GL.FLOAT);
        a_texCoord.setDataAndEnable(gl, texCoordBuffer, dim, GL.FLOAT);

        gl.drawArrays(GL.TRIANGLE_STRIP, 0, vertexCount);

        a_vertCoord.disable(gl);
        a_texCoord.disable(gl);
        u_dataTexture.unbind(gl);
        u_colorTexture.unbind(gl);
        program.endUse(gl);
    };
}
