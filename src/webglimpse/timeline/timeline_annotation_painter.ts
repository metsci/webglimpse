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
import { TimelineTimeseriesPainterFactory } from './timeline_timeseries_row';
import { Drawable, Painter } from '../core';
import { TimeAxis1D } from './time_axis';
import { Axis1D } from '../plot/axis';
import { TimelineModel, TimelineRowModel, TimelineAnnotationModel } from './timeline_model';
import { TimelineUi } from './timeline_ui';
import { newTextTextureCache6 } from '../text';
import { TextureRenderer } from '../texture';
import { Program, UniformColor, Attribute } from '../shader';
import { xyFrac_VERTSHADER, solid_FRAGSHADER } from '../misc';
import { ensureCapacityFloat32, GL, hasval } from '../util/util';
import { newDynamicBuffer } from '../buffer';
import { BoundsUnmodifiable } from '../bounds';
import { TimelineAnnotationStyleUi, TimelineAnnotationIcon } from './timeline_annotation_style';
import { white } from '../color';

export function newTimeseriesAnnotationPainterFactory(): TimelineTimeseriesPainterFactory {
    // Painter Factory
    return function (drawable: Drawable, timeAxis: TimeAxis1D, dataAxis: Axis1D, model: TimelineModel, rowModel: TimelineRowModel, ui: TimelineUi): Painter {

        const textTextures = newTextTextureCache6();
        const textureRenderer = new TextureRenderer();

        const program = new Program(xyFrac_VERTSHADER, solid_FRAGSHADER);
        const u_Color = new UniformColor(program, 'u_Color');
        const a_Position = new Attribute(program, 'a_XyFrac');

        let xys = new Float32Array(0);
        xys = ensureCapacityFloat32(xys, 4);
        const xysBuffer = newDynamicBuffer();

        // Painter
        return function (gl: WebGLRenderingContext, viewport: BoundsUnmodifiable) {
            gl.blendFuncSeparate(GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA, GL.ONE, GL.ONE_MINUS_SRC_ALPHA);
            gl.enable(GL.BLEND);

            textTextures.resetTouches();

            let xFrac = 0;
            let yFrac = 0;

            for (let i = 0; i < rowModel.annotationGuids.length; i++) {
                const annotationGuid: string = rowModel.annotationGuids.valueAt(i);
                const annotation: TimelineAnnotationModel = model.annotation(annotationGuid);
                const annotationStyle: TimelineAnnotationStyleUi = ui.annotationStyle(annotation.styleGuid);

                const font = hasval(annotationStyle.font) ? annotationStyle.font : '11px verdana,sans-serif';
                const color = hasval(annotationStyle.color) ? annotationStyle.color : white;
                const bgColorString = hasval(annotationStyle.bgColor) ? annotationStyle.bgColor.rgbaString : '#ffffff00';
                const bgPadding = hasval(annotationStyle.bgPadding) ? annotationStyle.bgPadding : 0;
                const bgBorderRadius = hasval(annotationStyle.bgBorderRadius) ? annotationStyle.bgBorderRadius : 0;

                const hTextOffset = hasval(annotationStyle.hTextOffset) ? annotationStyle.hTextOffset : 0;
                const vTextOffset = hasval(annotationStyle.vTextOffset) ? annotationStyle.vTextOffset : 0;

                // draw line
                if (annotationStyle.uiHint === 'horizontal-line' || annotationStyle.uiHint === 'vertical-line') {

                    if (annotationStyle.uiHint === 'horizontal-line') {
                        xFrac = hasval(annotationStyle.align) ? annotationStyle.align : 1;
                        yFrac = dataAxis.vFrac(annotation.y);

                        xys[0] = 0;
                        xys[1] = yFrac;
                        xys[2] = 1;
                        xys[3] = yFrac;
                    }
                    else if (annotationStyle.uiHint === 'vertical-line') {
                        xFrac = timeAxis.tFrac(annotation.time_PMILLIS);
                        yFrac = hasval(annotationStyle.align) ? annotationStyle.align : 1;

                        xys[0] = xFrac;
                        xys[1] = 0;
                        xys[2] = xFrac;
                        xys[3] = 1;
                    }

                    program.use(gl);

                    u_Color.setData(gl, color);

                    xysBuffer.setData(xys.subarray(0, 4));
                    a_Position.setDataAndEnable(gl, xysBuffer, 2, GL.FLOAT);

                    gl.drawArrays(GL.LINES, 0, 2);

                    program.endUse(gl);
                }
                else {
                    xFrac = timeAxis.tFrac(annotation.time_PMILLIS);
                    yFrac = dataAxis.vFrac(annotation.y);
                }

                textureRenderer.begin(gl, viewport);

                // draw icons
                for (let n = 0; n < annotationStyle.numIcons; n++) {
                    const icon: TimelineAnnotationIcon = annotationStyle.icon(n);

                    const xFracOffset = xFrac + (hasval(icon.hOffset) ? icon.hOffset : 0) / viewport.w;
                    const yFracOffset = yFrac + (hasval(icon.vOffset) ? icon.vOffset : 0) / viewport.h;

                    const iconTexture = ui.loadImage(icon.url, function () { drawable.redraw(); });
                    if (iconTexture) {
                        const options = {
                            xAnchor: (hasval(icon.hAlign) ? icon.hAlign : 0.5),
                            yAnchor: (hasval(icon.hAlign) ? icon.hAlign : 0.5),
                            width: icon.displayWidth,
                            height: icon.displayHeight,
                            rotation_CCWRAD: 0
                        };

                        textureRenderer.draw(gl, iconTexture, xFracOffset, yFracOffset, options);
                    }
                }

                // draw text label
                if (hasval(annotation.label)) {
                    const textTexture = textTextures.value(
                        font,
                        color.rgbaString,
                        annotation.label,
                        bgColorString,
                        bgPadding.toString(),
                        bgBorderRadius.toString()
                    );

                    const xFracOffset = xFrac + hTextOffset / viewport.w;
                    const yFracOffset = yFrac + vTextOffset / viewport.h;

                    const xAnchor = hasval(annotationStyle.hTextAlign) ? annotationStyle.hTextAlign : 0;
                    const yAnchor = textTexture.yAnchor(hasval(annotationStyle.vTextAlign) ? annotationStyle.vTextAlign : 0.5);

                    textureRenderer.draw(gl, textTexture, xFracOffset, yFracOffset, { xAnchor: xAnchor, yAnchor: yAnchor });
                }

                textureRenderer.end(gl);
            }

            textTextures.retainTouched();
        };
    };
}
