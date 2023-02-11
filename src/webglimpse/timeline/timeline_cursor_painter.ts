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
import { Color, white } from '../color';
import { TimelineTimeseriesPainterFactory, TimelineTimeseriesPainterOptions } from './timeline_timeseries_row';
import { Drawable, Painter } from '../core';
import { TimeAxis1D } from './time_axis';
import { Axis1D } from '../plot/axis';
import { TimelineModel, TimelineRowModel, TimelineTimeseriesFragmentModel } from './timeline_model';
import { TimelineUi } from './timeline_ui';
import { Program, UniformColor, Attribute } from '../shader';
import { xyFrac_VERTSHADER, solid_FRAGSHADER, putQuadXys } from '../misc';
import { ensureCapacityFloat32, GL, hasval } from '../util/util';
import { newDynamicBuffer } from '../buffer';
import { newTextTextureCache2 } from '../text';
import { TextureRenderer } from '../texture';
import { BoundsUnmodifiable } from '../bounds';
import { indexAtOrBefore, indexAtOrAfter } from '../util/sorted_arrays';

export interface TimeseriesCursorPainterOptions {
    font?: string;
    textColor?: Color;
    // number of pixels between box and label text
    buffer_px?: number;
    // number of significant digits in text labels
    textDecimals?: number;

    // color of selection box and crosshair lines
    lineColor?: Color;

    // thickness of cursor crosshair lines in pixels
    crosshairThickness_px?: number;

    // width/height of selection box (shown at intersection beween crosshairs and timeseries) in pixels
    boxSize_px?: number;
    // thickness of selection box lines in pixels
    boxThickness_px?: number;
}

export function newTimeseriesCursorPainterFactory(cursorOptions?: TimeseriesCursorPainterOptions): TimelineTimeseriesPainterFactory {

    // Painter Factory
    return function (drawable: Drawable, timeAxis: TimeAxis1D, dataAxis: Axis1D, model: TimelineModel, rowModel: TimelineRowModel, ui: TimelineUi, options: TimelineTimeseriesPainterOptions): Painter {

        let textColor = (hasval(cursorOptions) && hasval(cursorOptions.textColor) ? cursorOptions.textColor : white);
        let lineColor = (hasval(cursorOptions) && hasval(cursorOptions.lineColor) ? cursorOptions.lineColor : white);
        const font = (hasval(cursorOptions) && hasval(cursorOptions.font) ? cursorOptions.font : options.timelineFont);
        const buffer_px = (hasval(cursorOptions) && hasval(cursorOptions.buffer_px) ? cursorOptions.buffer_px : 4);
        const textDecimals = (hasval(cursorOptions) && hasval(cursorOptions.textDecimals) ? cursorOptions.textDecimals : 2);
        const boxSize_px = (hasval(cursorOptions) && hasval(cursorOptions.boxSize_px) ? cursorOptions.boxSize_px : 8);
        const crosshairThickness_px = (hasval(cursorOptions) && hasval(cursorOptions.crosshairThickness_px) ? cursorOptions.boxSize_px : 2);
        const boxThickness_px = (hasval(cursorOptions) && hasval(cursorOptions.boxThickness_px) ? cursorOptions.boxSize_px : 2);

        const program = new Program(xyFrac_VERTSHADER, solid_FRAGSHADER);
        const u_Color = new UniformColor(program, 'u_Color');
        const a_Position = new Attribute(program, 'a_XyFrac');

        let xys = new Float32Array(0);
        xys = ensureCapacityFloat32(xys, 4);
        const xysBuffer = newDynamicBuffer();

        const textTextures = newTextTextureCache2(font);
        const textureRenderer = new TextureRenderer();

        // Painter
        return function (gl: WebGLRenderingContext, viewport: BoundsUnmodifiable) {

            // only draw a cursor if we are the current hovered row
            const hoveredRow: TimelineRowModel = ui.selection.hoveredRow.value;
            if (!hasval(hoveredRow) || hoveredRow.rowGuid !== rowModel.rowGuid) {
                return;
            }

            gl.blendFuncSeparate(GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA, GL.ONE, GL.ONE_MINUS_SRC_ALPHA);
            gl.enable(GL.BLEND);

            let indexXys = 0;
            textTextures.resetTouches();

            const time = ui.selection.hoveredTime_PMILLIS.value;
            const y = ui.selection.hoveredY.value;

            if (!hasval(time) || !hasval(y)) {
                return;
            }

            const wLine = crosshairThickness_px / viewport.w;
            const hLine = crosshairThickness_px / viewport.h;

            const wBoxLine = boxThickness_px / viewport.w;
            const hBoxLine = boxThickness_px / viewport.h;

            const wBox = boxSize_px / viewport.w;
            const hBox = boxSize_px / viewport.h;

            if (hasval(time)) {

                const cursorModel = model.cursor(rowModel.cursorGuid);

                if (hasval(cursorModel)) {
                    if (hasval(cursorModel.lineColor)) {
                        lineColor = cursorModel.lineColor;
                    }

                    if (hasval(cursorModel.textColor)) {
                        textColor = cursorModel.textColor;
                    }

                    textureRenderer.begin(gl, viewport);

                    const timeseriesCount = cursorModel.labeledTimeseriesGuids.length;

                    // 36 vertices for crosshairs, 48 vertices per timeseries intersection marker
                    xys = ensureCapacityFloat32(xys, 2 * (36 + timeseriesCount * 48));

                    for (let i = 0; i < cursorModel.labeledTimeseriesGuids.length; i++) {

                        const timeseriesGuid = cursorModel.labeledTimeseriesGuids.valueAt(i);
                        const timeseries = model.timeseries(timeseriesGuid);

                        // if the row doesn't contain the timeseries, don't show cursor intersections
                        if (!rowModel.timeseriesGuids.hasValue(timeseriesGuid)) {
                            continue;
                        }

                        for (let j = 0; j < timeseries.fragmentGuids.length; j++) {
                            const fragmentGuid: string = timeseries.fragmentGuids.valueAt(j);
                            const fragment: TimelineTimeseriesFragmentModel = model.timeseriesFragment(fragmentGuid);

                            // fragments should not overlap
                            if (fragment.start_PMILLIS < time && fragment.end_PMILLIS > time) {

                                let value: number;

                                // bars are drawn starting at the point and continuing to the next point, so we don't interpolate them
                                if (timeseries.uiHint === 'bars') {
                                    const index: number = indexAtOrBefore(fragment.times_PMILLIS, time);
                                    value = fragment.data[index];
                                }
                                else {
                                    const index0: number = indexAtOrBefore(fragment.times_PMILLIS, time);
                                    const index1: number = indexAtOrAfter(fragment.times_PMILLIS, time);

                                    const value0 = fragment.data[index0];
                                    const time0 = fragment.times_PMILLIS[index0];

                                    const value1 = fragment.data[index1];
                                    const time1 = fragment.times_PMILLIS[index1];

                                    const diff = time1 - time0;
                                    const diff0 = (time - time0) / diff;
                                    const diff1 = 1 - diff0;

                                    value = value0 * diff1 + value1 * diff0;
                                }

                                const textTexture = textTextures.value(textColor.rgbaString, value.toFixed(textDecimals));

                                const valueFracY = dataAxis.vFrac(value);
                                const valueFracX = timeAxis.tFrac(time);

                                const boxLeft = valueFracX - wBox / 2;
                                const boxRight = valueFracX + wBox / 2;
                                const boxTop = valueFracY + hBox / 2;
                                const boxBottom = valueFracY - hBox / 2;

                                // draw box at value location

                                // left edge
                                indexXys = putQuadXys(xys, indexXys, boxLeft - wBoxLine / 2, boxLeft + wBoxLine / 2, boxTop + hBoxLine / 2, boxBottom - hBoxLine / 2);
                                // right edge
                                indexXys = putQuadXys(xys, indexXys, boxRight - wBoxLine / 2, boxRight + wBoxLine / 2, boxTop + hBoxLine / 2, boxBottom - hBoxLine / 2);
                                // top edge
                                indexXys = putQuadXys(xys, indexXys, boxLeft + wBoxLine / 2, boxRight - wBoxLine / 2, boxTop - hBoxLine / 2, boxTop + hBoxLine / 2);
                                // bottom edge
                                indexXys = putQuadXys(xys, indexXys, boxLeft + wBoxLine / 2, boxRight - wBoxLine / 2, boxBottom - hBoxLine / 2, boxBottom + hBoxLine / 2);

                                // draw text
                                // XXX 0.6 looks more centered to the eye than 0.5 for numeric text
                                textureRenderer.draw(gl, textTexture, boxRight + wBoxLine / 2 + buffer_px / viewport.w, valueFracY, { xAnchor: 0, yAnchor: .6 });

                            }
                        }
                    }

                    if (hasval(cursorModel.showCursorText) ? cursorModel.showCursorText : true) {
                        const textTexture = textTextures.value(textColor.rgbaString, y.toFixed(textDecimals));
                        textureRenderer.draw(gl, textTexture, 1, dataAxis.vFrac(y) + buffer_px / viewport.h, { xAnchor: 1, yAnchor: 0 });
                    }

                    textureRenderer.end(gl);
                    textTextures.retainTouched();

                    const xLeft = 0;
                    const xRight = 1;
                    const yMid = dataAxis.vFrac(y);
                    const xMid = timeAxis.tFrac(time);

                    // draw horizontal line
                    if (hasval(cursorModel.showHorizontalLine) ? cursorModel.showHorizontalLine : true) {
                        indexXys = putQuadXys(xys, indexXys, xLeft, xRight, yMid - hLine / 2, yMid + hLine / 2);
                    }

                    // draw vertical lines (split in two to avoid overlap with horizontal)
                    if (hasval(cursorModel.showVerticalLine) ? cursorModel.showVerticalLine : true) {
                        indexXys = putQuadXys(xys, indexXys, xMid - wLine / 2, xMid + wLine / 2, 0, yMid - hLine / 2);
                        indexXys = putQuadXys(xys, indexXys, xMid - wLine / 2, xMid + wLine / 2, yMid + hLine / 2, 1);
                    }

                    // draw lines
                    program.use(gl);

                    xysBuffer.setData(xys.subarray(0, indexXys));
                    a_Position.setDataAndEnable(gl, xysBuffer, 2, GL.FLOAT);
                    u_Color.setData(gl, lineColor);
                    gl.drawArrays(GL.TRIANGLES, 0, Math.floor(indexXys / 2));

                    a_Position.disable(gl);
                    program.endUse(gl);
                }
            }
        };
    };
}
