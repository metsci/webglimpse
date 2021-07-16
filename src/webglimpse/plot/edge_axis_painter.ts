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
import { Side, nearestPixelCenter_GLSLFUNC, modelview_VERTSHADER, solid_FRAGSHADER } from '../misc';
import { concatLines, ensureCapacityFloat32, GL, order, hasval, clamp } from '../util/util';
import { Axis1D, getTickInterval, getTickCount, getTickPositions } from './axis';
import { Color, black } from '../color';
import { Gradient, getGradientTexture } from '../gradient';
import { Painter } from '../core';
import { Program, UniformMatrix4f, UniformSampler2D, Attribute, UniformColor, Uniform1f, Uniform2f } from '../shader';
import { heatmap_VERTSHADER } from './heatmap_painter';
import { newDynamicBuffer } from '../buffer';
import { Cache } from '../util/cache';
import { TextTexture2D, newTextTextureCache } from '../text';
import { TextureRenderer, TextureDrawOptions, Texture } from '../texture';
import { BoundsUnmodifiable } from '../bounds';
import { glOrthoViewport } from '../matrix';


export function edgeMarks_VERTSHADER(labelSide: Side) {
    // The shader uses 'a' for the along-axis coord, and 'b' for the across-axis coord
    const horizontal = (labelSide === Side.TOP || labelSide === Side.BOTTOM);
    const bFlip = (labelSide === Side.LEFT || labelSide === Side.BOTTOM);
    return concatLines(
        nearestPixelCenter_GLSLFUNC,
        '                                                                                               ',
        '  uniform float u_VMin;                                                                        ',
        '  uniform float u_VSize;                                                                       ',
        '  uniform vec2 u_ViewportSize;                                                                 ',
        '  uniform float u_MarkSize;                                                                    ',
        '                                                                                               ',
        '  attribute vec2 a_VCoord;                                                                     ',
        '                                                                                               ',
        '  void main( ) {                                                                               ',
        '      float aViewportSize = ' + (horizontal ? 'u_ViewportSize.x' : 'u_ViewportSize.y') + ';  ',
        '      float aFrac = nearestPixelCenter( ( a_VCoord.x - u_VMin ) / u_VSize, aViewportSize );    ',
        '      float a = -1.0 + 2.0*( aFrac );                                                          ',
        '                                                                                               ',
        '      float bViewportSize = ' + (horizontal ? 'u_ViewportSize.y' : 'u_ViewportSize.x') + ';  ',
        '      float bFrac = ( a_VCoord.y * u_MarkSize ) / bViewportSize;                               ',
        '      float b = ' + (bFlip ? '-' : '') + '( -1.0 + 2.0*( bFrac ) );                         ',
        '                                                                                               ',
        '      gl_Position = vec4( ' + (horizontal ? 'a,b' : 'b,a') + ', 0.0, 1.0 );                  ',
        '  }                                                                                            ',
        '                                                                                               '
    );
}

export let gradient_FRAGSHADER = concatLines(
    '                                 ',
    '  precision highp float;         ',
    '  uniform sampler2D u_colorTex;  ',
    '                                 ',
    '  varying vec2 v_texCoord;       ',
    '                                                                                   ',
    '  void main( ) {                                                                   ',
    '     vec4 color = texture2D( u_colorTex, v_texCoord );                             ',
    '     gl_FragColor = color;                                                         ',
    '     gl_FragColor.a = 1.0;                                                         ',
    '  }                                                                                '
);

// provides a custom labeler for axis tick marks
//
// value        : the tick value to create a label string for
// axis         : the axis associated with the tick value
// tickInterval : the requested spacing in pixels between ticks
// precision    : number of decimal points which should be used for tick labels
// orderAxis    : order( Math.abs( axis.vSize ) ) then rounded to nearest multiple of three (-3, 0, 3, 6...)
// orderFactor  : Math.pow( 10, -orderAxis )
export type TickLabeler = (value: number, axis: Axis1D, tickInterval: number) => string;


export interface EdgeAxisPainterOptions {
    tickSpacing?: number;
    label?: string;
    units?: string;
    shortenLabels?: boolean;
    font?: string;
    textColor?: Color;
    tickColor?: Color;
    tickSize?: number;
    showLabel?: boolean;
    showBorder?: boolean;
    gradientFill?: Gradient;
    tickLabeler?: TickLabeler;
}


export function newEdgeAxisPainter(axis: Axis1D, labelSide: Side, options?: EdgeAxisPainterOptions): Painter {
    const tickSpacing = (hasval(options) && hasval(options.tickSpacing) ? options.tickSpacing : 100);
    const label = (hasval(options) && hasval(options.label) ? options.label : '');
    const units = (hasval(options) && hasval(options.units) ? options.units : '');
    const shortenLabels = (hasval(options) && hasval(options.shortenLabels) ? options.shortenLabels : true);
    const font = (hasval(options) && hasval(options.font) ? options.font : '11px verdana,sans-serif');
    const textColor = (hasval(options) && hasval(options.textColor) ? options.textColor : black);
    const tickColor = (hasval(options) && hasval(options.tickColor) ? options.tickColor : black);
    const tickSize = (hasval(options) && hasval(options.tickSize) ? options.tickSize : 6);
    const showLabel = (hasval(options) && hasval(options.showLabel) ? options.showLabel : true);
    const showBorder = (hasval(options) && hasval(options.showBorder) ? options.showBorder : false);
    const gradientFill = (hasval(options) && hasval(options.gradientFill) ? options.gradientFill : undefined);
    const tickLabeler = (hasval(options) && hasval(options.tickLabeler) ? options.tickLabeler : undefined);

    let tickPositions = new Float32Array(0);

    const gradientProgram = new Program(heatmap_VERTSHADER, gradient_FRAGSHADER);
    const gradientProgram_u_modelViewMatrix = new UniformMatrix4f(gradientProgram, 'u_modelViewMatrix');
    const gradientProgram_u_colorTexture = new UniformSampler2D(gradientProgram, 'u_colorTex');
    const gradientProgram_a_vertCoord = new Attribute(gradientProgram, 'a_vertCoord');
    const gradientProgram_a_texCoord = new Attribute(gradientProgram, 'a_texCoord');

    let gradientColorTexture: Texture = null;
    if (gradientFill) {
        gradientColorTexture = getGradientTexture(gradientFill);
    }

    let gradientVertCoords = new Float32Array(0);
    const gradientVertCoordsBuffer = newDynamicBuffer();

    let gradientTexCoords = new Float32Array(0);
    const gradientTexCoordsBuffer = newDynamicBuffer();

    const borderProgram = new Program(modelview_VERTSHADER, solid_FRAGSHADER);
    const borderProgram_a_Position = new Attribute(borderProgram, 'a_Position');
    const borderProgram_u_modelViewMatrix = new UniformMatrix4f(borderProgram, 'u_modelViewMatrix');
    const borderProgram_u_Color = new UniformColor(borderProgram, 'u_Color');

    let borderCoords = new Float32Array(0);
    const borderCoordsBuffer = newDynamicBuffer();

    const marksProgram = new Program(edgeMarks_VERTSHADER(labelSide), solid_FRAGSHADER);
    const marksProgram_u_VMin = new Uniform1f(marksProgram, 'u_VMin');
    const marksProgram_u_VSize = new Uniform1f(marksProgram, 'u_VSize');
    const marksProgram_u_ViewportSize = new Uniform2f(marksProgram, 'u_ViewportSize');
    const marksProgram_u_MarkSize = new Uniform1f(marksProgram, 'u_MarkSize');
    const marksProgram_u_Color = new UniformColor(marksProgram, 'u_Color');
    const marksProgram_a_VCoord = new Attribute(marksProgram, 'a_VCoord');

    let markCoords = new Float32Array(0);
    const markCoordsBuffer = newDynamicBuffer();

    const textTextures = <Cache<TextTexture2D>>newTextTextureCache(font, textColor);
    const textureRenderer = new TextureRenderer();
    const hTickLabels = textTextures.value('-0.123456789').h;
    const isVerticalAxis = (labelSide === Side.LEFT || labelSide === Side.RIGHT);

    return function (gl: WebGLRenderingContext, viewport: BoundsUnmodifiable) {

        const sizePixels = isVerticalAxis ? viewport.h : viewport.w;
        if (sizePixels === 0) {
            return;
        }
        const approxNumTicks = sizePixels / tickSpacing;
        const tickInterval = getTickInterval(axis, approxNumTicks);
        const tickCount = getTickCount(axis, tickInterval);
        tickPositions = ensureCapacityFloat32(tickPositions, tickCount);
        getTickPositions(axis, tickInterval, tickCount, tickPositions);


        // Border Box and Gradient Fill
        //

        // XXX border vertices are fixed in normalized 0-1 viewport coordinates
        // XXX they could be calculated ahead of time -- however I had trouble with 'fuzzy' lines when using 0-1 coordinates
        if (showBorder || gradientFill) {
            borderCoords = ensureCapacityFloat32(borderCoords, 10);

            const horizontal = (labelSide === Side.TOP || labelSide === Side.BOTTOM);
            const bFlip = (labelSide === Side.LEFT || labelSide === Side.BOTTOM);
            const width = viewport.w - 1;
            const height = viewport.h - 1;

            borderCoords[0] = horizontal ? 0 : (bFlip ? width - tickSize : 0);
            borderCoords[1] = !horizontal ? 0 : (bFlip ? height - tickSize : 0);

            borderCoords[2] = horizontal ? 0 : (bFlip ? width : tickSize);
            borderCoords[3] = !horizontal ? 0 : (bFlip ? height : tickSize);

            borderCoords[4] = horizontal ? width : (bFlip ? width : tickSize);
            borderCoords[5] = !horizontal ? height : (bFlip ? height : tickSize);

            borderCoords[6] = horizontal ? width : (bFlip ? width - tickSize : 0);
            borderCoords[7] = !horizontal ? height : (bFlip ? height - tickSize : 0);

            // finish off the box (same as 0, 1 coordinates)
            borderCoords[8] = horizontal ? 0 : (bFlip ? width - tickSize : 0);
            borderCoords[9] = !horizontal ? 0 : (bFlip ? height - tickSize : 0);
        }

        if (gradientFill) {
            gradientProgram.use(gl);
            gradientProgram_u_modelViewMatrix.setData(gl, glOrthoViewport(viewport));
            gradientProgram_u_colorTexture.setDataAndBind(gl, 0, gradientColorTexture);

            gradientVertCoords = ensureCapacityFloat32(gradientVertCoords, 8);
            gradientVertCoords[0] = borderCoords[2];
            gradientVertCoords[1] = borderCoords[3];
            gradientVertCoords[2] = borderCoords[0];
            gradientVertCoords[3] = borderCoords[1];
            gradientVertCoords[4] = borderCoords[4];
            gradientVertCoords[5] = borderCoords[5];
            gradientVertCoords[6] = borderCoords[6];
            gradientVertCoords[7] = borderCoords[7];
            gradientVertCoordsBuffer.setData(gradientVertCoords);
            gradientProgram_a_vertCoord.setDataAndEnable(gl, gradientVertCoordsBuffer, 2, GL.FLOAT);

            // y texture coordinates don't really matter ( we're simulating a 1d texture )
            // using a 1-by-n 2d texture because 1d textures aren't available
            gradientTexCoords = ensureCapacityFloat32(gradientTexCoords, 8);
            gradientTexCoords[0] = 0;
            gradientTexCoords[1] = 0;
            gradientTexCoords[2] = 0;
            gradientTexCoords[3] = 0;
            gradientTexCoords[4] = 1;
            gradientTexCoords[5] = 1;
            gradientTexCoords[6] = 1;
            gradientTexCoords[7] = 1;
            gradientTexCoordsBuffer.setData(gradientTexCoords);
            gradientProgram_a_texCoord.setDataAndEnable(gl, gradientTexCoordsBuffer, 2, GL.FLOAT);

            gl.drawArrays(GL.TRIANGLE_STRIP, 0, 4);

            gradientProgram_u_colorTexture.unbind(gl);
            gradientProgram_a_vertCoord.disable(gl);
            gradientProgram_a_texCoord.disable(gl);
            gradientProgram.endUse(gl);
        }

        if (showBorder) {
            borderProgram.use(gl);
            borderProgram_u_Color.setData(gl, tickColor);
            borderProgram_u_modelViewMatrix.setData(gl, glOrthoViewport(viewport));

            borderCoordsBuffer.setData(borderCoords.subarray(0, 10));
            borderProgram_a_Position.setDataAndEnable(gl, borderCoordsBuffer, 2, GL.FLOAT);

            // IE does not support lineWidths other than 1, so make sure all browsers use lineWidth of 1
            gl.lineWidth(1);
            gl.drawArrays(GL.LINE_STRIP, 0, 5);

            borderProgram_a_Position.disable(gl);
            borderProgram.endUse(gl);
        }

        // Tick marks
        //

        marksProgram.use(gl);
        marksProgram_u_VMin.setData(gl, axis.vMin);
        marksProgram_u_VSize.setData(gl, axis.vSize);
        marksProgram_u_ViewportSize.setData(gl, viewport.w, viewport.h);
        marksProgram_u_MarkSize.setData(gl, tickSize);
        marksProgram_u_Color.setData(gl, tickColor);

        markCoords = ensureCapacityFloat32(markCoords, 4 * tickCount);
        for (let n = 0; n < tickCount; n++) {
            const v = tickPositions[n];
            markCoords[(4 * n + 0)] = v;
            markCoords[(4 * n + 1)] = 0;
            markCoords[(4 * n + 2)] = v;
            markCoords[(4 * n + 3)] = 1;
        }
        markCoordsBuffer.setData(markCoords.subarray(0, 4 * tickCount));
        marksProgram_a_VCoord.setDataAndEnable(gl, markCoordsBuffer, 2, GL.FLOAT);

        // IE does not support lineWidths other than 1, so make sure all browsers use lineWidth of 1
        gl.lineWidth(1);
        gl.drawArrays(GL.LINES, 0, 2 * tickCount);

        marksProgram_a_VCoord.disable(gl);
        marksProgram.endUse(gl);


        // Tick labels
        //

        gl.blendFuncSeparate(GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA, GL.ONE, GL.ONE_MINUS_SRC_ALPHA);
        gl.enable(GL.BLEND);

        const orderAxisRaw = order(Math.abs(axis.vSize));
        let orderAxis = 0;
        if (orderAxisRaw > 0) {
            orderAxis = Math.floor((orderAxisRaw - 1) / 3) * 3;
        }
        else if (orderAxisRaw < 0) {
            orderAxis = (Math.ceil(orderAxisRaw / 3) - 1) * 3;
        }
        const orderFactor = Math.pow(10, -orderAxis);
        const orderTick = order(tickInterval);
        const precision = Math.max(0, orderAxis - orderTick);

        textTextures.resetTouches();
        textureRenderer.begin(gl, viewport);

        for (let n = 0; n < tickCount; n++) {
            const v = tickPositions[n];
            const vFrac = axis.vFrac(v);
            if (vFrac < 0 || vFrac >= 1) {
                continue;
            }

            let tickLabel;
            if (tickLabeler) {
                // show custom tick value
                tickLabel = tickLabeler(v, axis, tickInterval);
            }
            else if (shortenLabels && showLabel) {
                // show shortened tick value
                tickLabel = Number(v * orderFactor).toFixed(precision);
            }
            else if (!shortenLabels) {
                // show actual tick value
                if (orderAxisRaw >= 0) {
                    tickLabel = Number(v).toFixed(0);
                }
                else {
                    tickLabel = Number(v).toFixed(-orderAxisRaw);
                }
            }
            else {
                // show magnitude inline for each tick
                tickLabel = Number(v * orderFactor).toFixed(precision) + (orderAxis === 0 ? '' : 'e' + orderAxis);
            }
            const textTexture = textTextures.value(tickLabel);

            let xFrac: number;
            let yFrac: number;
            if (labelSide === Side.LEFT || labelSide === Side.RIGHT) {
                const yAnchor = textTexture.yAnchor(0.43);
                const j0 = (vFrac * viewport.h) - yAnchor * textTexture.h;
                const j = clamp(0, viewport.h - textTexture.h, j0);
                yFrac = j / viewport.h;

                if (labelSide === Side.LEFT) {
                    xFrac = (viewport.w - tickSize - 2 - textTexture.w) / viewport.w;
                }
                else {
                    xFrac = (tickSize + 2) / viewport.w;
                }
            }
            else {
                let wMinus = 0;
                if (v < 0) {
                    const absTickLabel = Number(Math.abs(v) * orderFactor).toFixed(precision);
                    wMinus = textTexture.w - textTextures.value(absTickLabel).w;
                }

                const xAnchor = 0.45;
                const i0 = (vFrac * viewport.w) - xAnchor * (textTexture.w - wMinus) - wMinus;
                const i = clamp(0, viewport.w - textTexture.w, i0);
                xFrac = i / viewport.w;

                if (labelSide === Side.BOTTOM) {
                    yFrac = (viewport.h - tickSize - 2 - hTickLabels) / viewport.h;
                }
                else {
                    yFrac = (tickSize + 2) / viewport.h;
                }
            }
            textureRenderer.draw(gl, textTexture, xFrac, yFrac, { xAnchor: 0, yAnchor: 0 });
        }


        // Axis label
        //

        if (showLabel) {
            const unitsString = units + (!shortenLabels || orderAxis === 0 ? '' : ' x 10^' + orderAxis.toFixed(0));
            const axisLabel = label + (unitsString ? ' (' + unitsString + ')' : '');

            if (axisLabel !== '') {
                const textTexture = textTextures.value(axisLabel);

                let xFrac: number;
                let yFrac: number;
                let textOpts: TextureDrawOptions;
                if (labelSide === Side.LEFT || labelSide === Side.RIGHT) {
                    // Using hTickLabels here works out about right, even though the tick-label text is horizontal
                    const xFrac0 = 0.5 * (viewport.w - tickSize - 2 - hTickLabels) / viewport.w;
                    xFrac = (labelSide === Side.LEFT ? xFrac0 : 1 - xFrac0);
                    yFrac = 0.5;
                    textOpts = {
                        xAnchor: textTexture.yAnchor(0.5),
                        yAnchor: 0.5,
                        rotation_CCWRAD: 0.5 * Math.PI
                    };
                }
                else {
                    const yFrac0 = 0.5 * (viewport.h - tickSize - 2 - hTickLabels) / viewport.h;
                    yFrac = (labelSide === Side.BOTTOM ? yFrac0 : 1 - yFrac0);
                    xFrac = 0.5;
                    textOpts = {
                        xAnchor: 0.5,
                        yAnchor: textTexture.yAnchor(0.5),
                        rotation_CCWRAD: 0
                    };
                }
                textureRenderer.draw(gl, textTexture, xFrac, yFrac, textOpts);
            }
        }


        // Finish up
        //

        textureRenderer.end(gl);
        textTextures.retainTouched();
    };
}


