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
import { Color, white, darker } from '../color';
import { Drawable, Painter, Pane, Mask2D, PointerEvent, yFrac, isLeftMouseDown, Layout } from '../core';
import { TimeAxis1D } from './time_axis';
import { Axis1D, attachAxisMouseListeners1D, Axis2D } from '../plot/axis';
import { TimelineModel, TimelineRowModel, TimelineAnnotationModel, TimelineTimeseriesFragmentModel, TimelineTimeseriesModel } from './timeline_model';
import { TimelineUi, TimelineSelectionModel } from './timeline_ui';
import { EdgeAxisPainterOptions, newEdgeAxisPainter } from '../plot/edge_axis_painter';
import { TimelineRowPaneFactory, TimelineRowPaneOptions } from './timeline_row';
import { fixedSize, Side, solid_FRAGSHADER, dash_FRAGSHADER, putQuadXys } from '../misc';
import { BoundsUnmodifiable } from '../bounds';
import { newColumnLayout } from '../layout/column_layout';
import { newOverlayLayout } from '../layout/overlay_layout';
import { TimelineAnnotationStyleUi } from './timeline_annotation_style';
import { indexAtOrBefore, indexNearest } from '../util/sorted_arrays';
import { concatLines, GL, ensureCapacityFloat32, hasval } from '../util/util';
import { Program, UniformColor, UniformMatrix4f, Attribute, Uniform1f } from '../shader';
import { newDynamicBuffer } from '../buffer';
import { glOrthoAxis } from '../matrix';

export interface TimelineTimeseriesPainterOptions {
    timelineFont: string;
    timelineFgColor: Color;
    timelineThickness: number;
    rowTopPadding: number;
    rowBottomPadding: number;
}

export type TimelineTimeseriesPainterFactory = (drawable: Drawable, timeAxis: TimeAxis1D, dataAxis: Axis1D, model: TimelineModel, rowModel: TimelineRowModel, ui: TimelineUi, options: TimelineTimeseriesPainterOptions) => Painter;

export interface TimelineTimeseriesRowPaneOptions {
    rowHeight?: number;
    rowTopPadding?: number;
    rowBottomPadding?: number;
    axisOptions?: EdgeAxisPainterOptions;
    axisWidth?: number;
    painterFactories?: TimelineTimeseriesPainterFactory[];
}

export function newTimeseriesRowPaneFactory(rowOptions?: TimelineTimeseriesRowPaneOptions): TimelineRowPaneFactory {
    return function (drawable: Drawable, timeAxis: TimeAxis1D, dataAxis: Axis1D, model: TimelineModel, row: TimelineRowModel, ui: TimelineUi, options: TimelineRowPaneOptions): Pane {

        const rowTopPadding = (hasval(rowOptions) && hasval(rowOptions.rowTopPadding) ? rowOptions.rowTopPadding : 6);
        const rowBottomPadding = (hasval(rowOptions) && hasval(rowOptions.rowBottomPadding) ? rowOptions.rowBottomPadding : 6);
        const axisWidth = (hasval(rowOptions) && hasval(rowOptions.axisWidth) ? rowOptions.axisWidth : 60);
        const painterFactories = (hasval(rowOptions) && hasval(rowOptions.painterFactories) ? rowOptions.painterFactories : []);
        const axisOptions = (hasval(rowOptions) && hasval(rowOptions.axisOptions) ? rowOptions.axisOptions : {});

        const keyPrefix = options.isMaximized ? 'maximized-' : '';

        const getRowHeight = function () {
            // maximized rows do not specifiy a height (they should fill available space)
            if (options.isMaximized) {
                return null;
            }
            // if the row has a custom row specified, use it
            else if (hasval(row.rowHeight)) {
                return row.rowHeight;
            }
            // otherwise use the default for this RowPaneFactory
            else if (hasval(rowOptions) && hasval(rowOptions.rowHeight)) {
                return rowOptions.rowHeight;
            }
            // as a last resort use a hard coded default
            else {
                return 135;
            }
        };

        const rowHeight: number = getRowHeight();

        const timelineFont = options.timelineFont;
        const timelineFgColor = options.timelineFgColor;
        const draggableEdgeWidth = options.draggableEdgeWidth;
        const snapToDistance = options.snapToDistance;

        const rowUi = ui.rowUi(row.rowGuid);
        const input = ui.input;
        const selection = ui.selection;

        if (!hasval(axisOptions.font)) {
            axisOptions.font = timelineFont;
        }
        if (!hasval(axisOptions.tickColor)) {
            axisOptions.tickColor = timelineFgColor;
        }
        if (!hasval(axisOptions.textColor)) {
            axisOptions.textColor = timelineFgColor;
        }
        if (!hasval(axisOptions.showLabel)) {
            axisOptions.showLabel = true;
        }
        if (!hasval(axisOptions.shortenLabels)) {
            axisOptions.shortenLabels = false;
        }

        const redraw = function () {
            drawable.redraw();
        };

        // setup pane for data (y) axis painter and mouse listener
        const yAxisPane = new Pane(<Layout>{ updatePrefSize: fixedSize(axisWidth, rowHeight) });
        dataAxis.limitsChanged.on(redraw);
        attachAxisMouseListeners1D(yAxisPane, dataAxis, true);

        // add listener to update the height of the row if the rowHeight attribute changes
        const updateRowHeight = function () {
            yAxisPane.layout = <Layout>{ updatePrefSize: fixedSize(axisWidth, getRowHeight()) };
        };
        row.attrsChanged.on(updateRowHeight);

        const isDragMode: Mask2D = function (viewport: BoundsUnmodifiable, i: number, j: number): boolean {
            const fragment = getNearestFragment(viewport, i, j).fragment;
            return hasval(fragment);
        };

        const rowContentPane = new Pane(newColumnLayout(), true, isDragMode);
        const underlayPane = new Pane(newOverlayLayout(), false);
        const overlayPane = new Pane(null, false);

        const painterOptions = { timelineFont: timelineFont, timelineFgColor: timelineFgColor, timelineThickness: 1, rowTopPadding: rowTopPadding, rowBottomPadding: rowBottomPadding };
        for (let n = 0; n < painterFactories.length; n++) {
            const createPainter = painterFactories[n];
            rowContentPane.addPainter(createPainter(drawable, timeAxis, dataAxis, model, row, ui, painterOptions));
        }

        yAxisPane.addPainter(newEdgeAxisPainter(dataAxis, Side.RIGHT, axisOptions));
        rowContentPane.addPane(yAxisPane, 0);
        underlayPane.addPane(rowContentPane, true);
        underlayPane.addPane(overlayPane, false);

        rowUi.addPane(keyPrefix + 'content', rowContentPane);
        rowUi.addPane(keyPrefix + 'overlay', overlayPane);
        rowUi.addPane(keyPrefix + 'underlay', underlayPane);
        rowUi.addPane(keyPrefix + 'y-axis', yAxisPane);

        row.timeseriesGuids.valueAdded.on(redraw);
        row.timeseriesGuids.valueMoved.on(redraw);
        row.timeseriesGuids.valueRemoved.on(redraw);

        const addFragmentRedraw = function (fragmentGuid: string) {
            const fragment = model.timeseriesFragment(fragmentGuid);
            fragment.dataChanged.on(redraw);
        };

        const removeFragmentRedraw = function (fragmentGuid: string) {
            const fragment = model.timeseriesFragment(fragmentGuid);
            fragment.dataChanged.off(redraw);
        };

        const addRedraw = function (timeseriesGuid: string) {
            const timeseries = model.timeseries(timeseriesGuid);
            timeseries.attrsChanged.on(redraw);
            timeseries.fragmentGuids.valueAdded.on(redraw);
            timeseries.fragmentGuids.valueRemoved.on(redraw);

            timeseries.fragmentGuids.forEach(addFragmentRedraw);
            timeseries.fragmentGuids.valueAdded.on(addFragmentRedraw);
            timeseries.fragmentGuids.valueRemoved.on(removeFragmentRedraw);
        };
        row.timeseriesGuids.forEach(addRedraw);
        row.timeseriesGuids.valueAdded.on(addRedraw);

        const removeRedraw = function (timeseriesGuid: string) {
            const timeseries = model.timeseries(timeseriesGuid);
            timeseries.attrsChanged.off(redraw);
            timeseries.fragmentGuids.valueAdded.off(redraw);
            timeseries.fragmentGuids.valueRemoved.off(redraw);
            timeseries.fragmentGuids.forEach(removeFragmentRedraw);
        };
        row.timeseriesGuids.valueRemoved.on(removeRedraw);

        const timeAtCoords_PMILLIS = function (viewport: BoundsUnmodifiable, i: number): number {
            return timeAxis.tAtFrac_PMILLIS(viewport.xFrac(i));
        };

        const timeAtPointer_PMILLIS = function (ev: PointerEvent): number {
            return timeAtCoords_PMILLIS(ev.paneViewport, ev.i);
        };

        // Used by both sets of listeners to know whether a timeseries-drag is in progress
        let timeseriesDragMode: string = null;

        // Hook up input notifications
        //

        let recentMouseMove: PointerEvent = null;

        rowContentPane.mouseMove.on(function (ev: PointerEvent) {
            input.mouseMove.fire(ev);
            if (!hasval(timeseriesDragMode)) {
                input.timeHover.fire(timeAtPointer_PMILLIS(ev), ev);
                input.rowHover.fire(row, ev);
            }
            recentMouseMove = ev;
        });

        rowContentPane.mouseExit.on(function (ev: PointerEvent) {
            input.mouseExit.fire(ev);
            if (!hasval(timeseriesDragMode)) {
                input.timeHover.fire(null, ev);
                input.rowHover.fire(null, ev);
                input.eventHover.fire(null, ev);
            }
            recentMouseMove = null;
        });

        const uiMillisPerPxChanged = function () {
            if (!hasval(timeseriesDragMode) && recentMouseMove != null) {
                const ev = recentMouseMove;
                input.timeHover.fire(timeAtPointer_PMILLIS(ev), ev);
            }
        };
        ui.millisPerPx.changed.on(uiMillisPerPxChanged);

        rowContentPane.mouseUp.on(function (ev: PointerEvent) {
            input.mouseUp.fire(ev);
        });

        rowContentPane.mouseDown.on(function (ev: PointerEvent) {
            input.mouseDown.fire(ev);
        });

        rowContentPane.mouseWheel.on(options.mouseWheelListener);

        rowContentPane.contextMenu.on(function (ev: PointerEvent) {
            input.contextMenu.fire(ev);
        });


        // Begin annotation selection
        //

        const getNearestAnnotation = function (viewport: BoundsUnmodifiable, i: number, j: number) {
            // maximum number of pixels away from a point the mouse can be to select it
            const pickBuffer_PIXEL = 10;
            // value per pixel in x and y directions
            const vppx: number = ui.millisPerPx.value;
            const vppy: number = dataAxis.vSize / rowContentPane.viewport.h;
            const pickBuffer_PMILLIS: number = pickBuffer_PIXEL * vppx;

            const ev_time: number = timeAtCoords_PMILLIS(viewport, i);
            const ev_value: number = dataAxis.vAtFrac(viewport.yFrac(j));

            let bestAnnotation: TimelineAnnotationModel = null;
            let best_PIXEL: number = null;

            if (ev_time) {
                for (let annotationIdx = 0; annotationIdx < row.annotationGuids.length; annotationIdx++) {
                    const annotationGuid: string = row.annotationGuids.valueAt(annotationIdx);
                    const annotation: TimelineAnnotationModel = model.annotation(annotationGuid);
                    const styleGuid: string = annotation.styleGuid;
                    const style: TimelineAnnotationStyleUi = ui.annotationStyle(styleGuid);

                    const dy_PIXEL = Math.abs(annotation.y - ev_value) / vppy;
                    const dx_PIXEL = Math.abs(annotation.time_PMILLIS - ev_time) / vppx;

                    let d_PIXEL = 0;
                    if (style.uiHint === 'point') {
                        d_PIXEL = Math.sqrt(dx_PIXEL * dx_PIXEL + dy_PIXEL * dy_PIXEL);
                    }
                    else if (style.uiHint === 'horizontal-line') {
                        d_PIXEL = dy_PIXEL;
                    }
                    else if (style.uiHint === 'vertical-line') {
                        d_PIXEL = dx_PIXEL;
                    }

                    if (d_PIXEL < pickBuffer_PIXEL) {
                        if (!hasval(best_PIXEL) || d_PIXEL < best_PIXEL) {
                            bestAnnotation = annotation;
                            best_PIXEL = d_PIXEL;
                        }
                    }
                }
            }

            return bestAnnotation;
        };

        const getNearestAnnotationEvent = function (ev: PointerEvent) {
            return getNearestAnnotation(ev.paneViewport, ev.i, ev.j);
        };

        overlayPane.mouseMove.on(function (ev: PointerEvent) {
            // update selection.hoveredYValue
            const y: number = dataAxis.vAtFrac(yFrac(ev));
            selection.hoveredY.value = y;

            // update selection.hoveredAnnotation
            const result = getNearestAnnotationEvent(ev);
            selection.hoveredAnnotation.value = result;
        });
        selection.hoveredAnnotation.changed.on(redraw);

        overlayPane.mouseExit.on(function () {
            selection.hoveredY.value = undefined;
            selection.hoveredAnnotation.value = null;
        });

        // Begin timeseries-drag
        //

        function chooseTimeseriesDragMode(timelineUi: TimelineUi, hoveredTimeseriesFragment: TimelineTimeseriesFragmentModel): string {
            if (!hasval(hoveredTimeseriesFragment)) {
                return null;
            }
            // return the edit mode of the selected fragment
            else {
                return hoveredTimeseriesFragment.userEditMode;
            }
        }

        const updateCursor = function () {
            if (!timeseriesDragMode) {
                const mouseCursors = { 'xy': 'move', 'y': 'ns-resize' };
                rowContentPane.mouseCursor = mouseCursors[chooseTimeseriesDragMode(ui, selection.hoveredTimeseries.fragment)];
            }
        };
        ui.millisPerPx.changed.on(updateCursor);
        selection.hoveredTimeseries.changed.on(updateCursor);

        const getNearestFragment = function (viewport: BoundsUnmodifiable, i: number, j: number) {
            // maximum number of pixels away from a point the mouse can be to select it
            const pickBuffer_PIXEL = 10;
            // value per pixel in x and y directions
            const vppx: number = ui.millisPerPx.value;
            const vppy: number = dataAxis.vSize / rowContentPane.viewport.h;
            const pickBuffer_PMILLIS: number = pickBuffer_PIXEL * vppx;

            let bestFragment: TimelineTimeseriesFragmentModel;
            let bestIndex: number;
            let best_PIXEL: number;

            const ev_time: number = timeAtCoords_PMILLIS(viewport, i);
            const ev_value: number = dataAxis.vAtFrac(viewport.yFrac(j));

            if (ev_time) {
                for (let timeseriesIdx = 0; timeseriesIdx < row.timeseriesGuids.length; timeseriesIdx++) {
                    const timeseriesGuid: string = row.timeseriesGuids.valueAt(timeseriesIdx);
                    const timeseries: TimelineTimeseriesModel = model.timeseries(timeseriesGuid);

                    for (let fragmentIdx = 0; fragmentIdx < timeseries.fragmentGuids.length; fragmentIdx++) {
                        const fragmentGuid: string = timeseries.fragmentGuids.valueAt(fragmentIdx);
                        const fragment: TimelineTimeseriesFragmentModel = model.timeseriesFragment(fragmentGuid);

                        // fragments should not overlap
                        if (fragment.start_PMILLIS - pickBuffer_PMILLIS < ev_time && fragment.end_PMILLIS + pickBuffer_PMILLIS > ev_time) {
                            // bars are drawn starting at the point and continuing to the next point, so we need to choose the closest index differently
                            const index: number = timeseries.uiHint === 'bars' ? indexAtOrBefore(fragment.times_PMILLIS, ev_time) : indexNearest(fragment.times_PMILLIS, ev_time);
                            const value = fragment.data[index];
                            const time = fragment.times_PMILLIS[index];

                            const dy_PIXEL = (value - ev_value) / vppy;
                            const dx_PIXEL = (time - ev_time) / vppx;
                            const d_PIXEL = Math.sqrt(dx_PIXEL * dx_PIXEL + dy_PIXEL * dy_PIXEL);

                            const filter = function (): boolean {
                                if (timeseries.uiHint === 'bars') {
                                    return (timeseries.baseline < ev_value && ev_value < value) ||
                                        (timeseries.baseline > ev_value && ev_value > value);
                                }
                                else {
                                    return d_PIXEL < pickBuffer_PIXEL;
                                }
                            };

                            if ((!best_PIXEL || d_PIXEL < best_PIXEL) && filter()) {
                                best_PIXEL = d_PIXEL;
                                bestFragment = fragment;
                                bestIndex = index;
                            }
                        }
                    }
                }
            }

            return { fragment: bestFragment, index: bestIndex };
        };

        const getNearestFragmentEvent = function (ev: PointerEvent) {
            return getNearestFragment(ev.paneViewport, ev.i, ev.j);
        };

        // choose the closest data point to the mouse cursor position and fire an event when it changes
        rowContentPane.mouseMove.on(function (ev: PointerEvent) {
            if (!hasval(timeseriesDragMode)) {
                const result = getNearestFragmentEvent(ev);
                selection.hoveredTimeseries.setValue(result.fragment, result.index);
            }
        });
        selection.hoveredTimeseries.changed.on(redraw);

        rowContentPane.mouseExit.on(function () {
            selection.hoveredTimeseries.clearValue();
        });

        rowContentPane.mouseDown.on(function (ev: PointerEvent) {
            if (isLeftMouseDown(ev.mouseEvent)) {
                timeseriesDragMode = chooseTimeseriesDragMode(ui, selection.hoveredTimeseries.fragment);
            }
        });

        rowContentPane.mouseMove.on(function (ev: PointerEvent) {

            if (hasval(timeseriesDragMode)) {
                const x: number = timeAtPointer_PMILLIS(ev);
                const y: number = dataAxis.vAtFrac(yFrac(ev));

                const fragment = selection.hoveredTimeseries.fragment;
                const fragment_time = fragment.times_PMILLIS;

                if (timeseriesDragMode === 'y') {
                    fragment.setData(selection.hoveredTimeseries.index, y);
                }
                else if (timeseriesDragMode === 'xy') {
                    const index = fragment.setData(selection.hoveredTimeseries.index, y, x);
                    if (index !== selection.hoveredTimeseries.index) {
                        selection.hoveredTimeseries.setValue(fragment, index);
                    }
                }
            }
        });

        // Finish event-drag
        //

        rowContentPane.mouseUp.on(function (ev: PointerEvent) {
            timeseriesDragMode = null;
        });

        rowContentPane.dispose.on(function () {

            rowUi.removePane(keyPrefix + 'content');
            rowUi.removePane(keyPrefix + 'overlay');
            rowUi.removePane(keyPrefix + 'underlay');
            rowUi.removePane(keyPrefix + 'y-axis');

            dataAxis.limitsChanged.off(redraw);

            row.timeseriesGuids.valueAdded.off(redraw);
            row.timeseriesGuids.valueMoved.off(redraw);
            row.timeseriesGuids.valueRemoved.off(redraw);

            row.timeseriesGuids.valueAdded.off(addRedraw);
            row.timeseriesGuids.valueRemoved.off(removeRedraw);

            selection.hoveredTimeseries.changed.off(redraw);

            row.attrsChanged.off(updateRowHeight);

            row.timeseriesGuids.forEach(function (timeseriesGuid: string) {
                const timeseries = model.timeseries(timeseriesGuid);
                timeseries.attrsChanged.off(redraw);
                timeseries.fragmentGuids.valueAdded.off(redraw);
                timeseries.fragmentGuids.valueRemoved.off(redraw);
            });
        });

        return underlayPane;
    };
}

export function newTimeseriesPainterFactory(options?: TimelineTimeseriesPainterOptions): TimelineTimeseriesPainterFactory {
    // Painter Factory
    return function (drawable: Drawable, timeAxis: TimeAxis1D, dataAxis: Axis1D, model: TimelineModel, rowModel: TimelineRowModel, ui: TimelineUi): Painter {

        const selection: TimelineSelectionModel = ui.selection;
        const defaultColor = hasval(options) && hasval(options.timelineFgColor) ? options.timelineFgColor : white;
        const defaultThickness = hasval(options) && hasval(options.timelineThickness) ? options.timelineThickness : 1;

        const modelview_line_VERTSHADER = concatLines(
            '    uniform mat4 u_modelViewMatrix;                       ',
            '    attribute vec4 a_Position;                            ',
            '    attribute float a_Distance;                           ',
            '    varying float v_Distance;                             ',
            '    uniform float u_PointSize;                            ',
            '                                                          ',
            '    void main( ) {                                        ',
            '        gl_PointSize = u_PointSize ;                      ',
            '        gl_Position = u_modelViewMatrix * a_Position ;    ',
            '        v_Distance = a_Distance;                          ',
            '    }                                                     ',
            '                                                          '
        );

        const modelview_pointsize_VERTSHADER = concatLines(
            '    uniform mat4 u_modelViewMatrix;                       ',
            '    attribute vec4 a_Position;                            ',
            '    uniform float u_PointSize;                            ',
            '                                                          ',
            '    void main( ) {                                        ',
            '        gl_PointSize = u_PointSize ;                      ',
            '        gl_Position = u_modelViewMatrix * a_Position ;    ',
            '    }                                                     ',
            '                                                          '
        );

        const program = new Program(modelview_pointsize_VERTSHADER, solid_FRAGSHADER);

        const u_Color = new UniformColor(program, 'u_Color');
        const u_modelViewMatrix = new UniformMatrix4f(program, 'u_modelViewMatrix');
        const a_Position = new Attribute(program, 'a_Position');
        const u_PointSize = new Uniform1f(program, 'u_PointSize');

        const lineProgram = new Program(modelview_line_VERTSHADER, dash_FRAGSHADER);
        const u_lpColor = new UniformColor(lineProgram, 'u_Color');
        const u_lpmodelViewMatrix = new UniformMatrix4f(lineProgram, 'u_modelViewMatrix');
        const a_lpPosition = new Attribute(lineProgram, 'a_Position');
        const u_lpPointSize = new Uniform1f(lineProgram, 'u_PointSize');
        const a_lpDistance = new Attribute(lineProgram, 'a_Distance');
        const u_lpDash = new Uniform1f(lineProgram, 'u_Dash');

        const axis = new Axis2D(timeAxis, dataAxis);

        let xys = new Float32Array(0);
        let dists = new Float32Array(0);
        const xysBuffer = newDynamicBuffer();
        const distBuffer = newDynamicBuffer();

        // Painter
        return function (gl: WebGLRenderingContext, viewport: BoundsUnmodifiable) {

            gl.blendFuncSeparate(GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA, GL.ONE, GL.ONE_MINUS_SRC_ALPHA);
            gl.enable(GL.BLEND);

            let baseline = 0;

            for (let i = 0; i < rowModel.timeseriesGuids.length; i++) {
                // collect fragments and sort them by time
                let totalSize = 0;
                const sortedFragments = new Array<TimelineTimeseriesFragmentModel>();
                const timeseriesGuid = rowModel.timeseriesGuids.valueAt(i);
                const timeseries = model.timeseries(timeseriesGuid);
                for (let j = 0; j < timeseries.fragmentGuids.length; j++) {
                    const timeseriesFragmentGuid = timeseries.fragmentGuids.valueAt(j);
                    const fragment = model.timeseriesFragment(timeseriesFragmentGuid);

                    sortedFragments.push(fragment);
                    totalSize += fragment.times_PMILLIS.length;
                }
                sortedFragments.sort((a, b) => a.start_PMILLIS - b.start_PMILLIS);

                if (timeseries.uiHint === 'lines' || timeseries.uiHint === 'points' || timeseries.uiHint === 'lines-and-points' || timeseries.uiHint === undefined) {

                    // enable the shader
                    lineProgram.use(gl);

                    u_lpmodelViewMatrix.setData(gl, glOrthoAxis(axis));
                    const size = totalSize * 2;

                    xys = ensureCapacityFloat32(xys, size);
                    dists = ensureCapacityFloat32(dists, totalSize);

                    let index = 0;
                    for (let j = 0; j < sortedFragments.length; j++) {
                        const fragment = sortedFragments[j];
                        const data: number[] = fragment.data;
                        const times_PMILLIS: number[] = fragment.times_PMILLIS;

                        for (let k = 0; k < data.length; k++ , index += 2) {
                            xys[index] = timeAxis.vAtTime(times_PMILLIS[k]);
                            xys[index + 1] = data[k];
                            if (k !== 0) {
                                const x = (timeAxis.vAtTime(times_PMILLIS[k]) - timeAxis.vAtTime(times_PMILLIS[k - 1]));
                                const y = data[k] - data[k - 1];
                                dists[k] = dists[k - 1] + Math.sqrt(x * x + y * y);
                            }
                            else {
                                dists[k] = 0;
                            }
                        }
                    }

                    const lineColor = hasval(timeseries.lineColor) ? timeseries.lineColor : defaultColor;
                    u_lpColor.setData(gl, lineColor);

                    const dash = hasval(timeseries.dash) ? timeseries.dash : 0;
                    u_lpDash.setData(gl, dash);

                    const lineThickness = hasval(timeseries.lineThickness) ? timeseries.lineThickness : defaultThickness;
                    gl.lineWidth(lineThickness);

                    xysBuffer.setData(xys.subarray(0, index));
                    a_lpPosition.setDataAndEnable(gl, xysBuffer, 2, GL.FLOAT);

                    distBuffer.setData(dists.subarray(0, totalSize));
                    a_lpDistance.setDataAndEnable(gl, distBuffer, 1, GL.FLOAT);

                    if (timeseries.uiHint === 'lines' || timeseries.uiHint === 'lines-and-points' || timeseries.uiHint === undefined) {
                        // draw the lines
                        gl.drawArrays(GL.LINE_STRIP, 0, size / 2);
                    }

                    // point size works in WebKit and actually works in Minefield as well even though
                    // VERTEX_PROGRAM_POINT_SIZE and POINT_SMOOTH aren't defined
                    if (timeseries.uiHint === 'points' || timeseries.uiHint === 'lines-and-points') {

                        const pointColor = hasval(timeseries.pointColor) ? timeseries.pointColor : defaultColor;
                        u_Color.setData(gl, pointColor);

                        u_PointSize.setData(gl, timeseries.pointSize);

                        gl.drawArrays(GL.POINTS, 0, size / 2);
                    }
                    lineProgram.endUse(gl);
                }
                else if (timeseries.uiHint === 'bars') {
                    // enable the shader
                    program.use(gl);
                    u_modelViewMatrix.setData(gl, glOrthoAxis(axis));
                    // The last data point defines the right edge of the bar
                    // but it does not have its own bar drawn, so we need at
                    // least 2 data points to draw any bars
                    if (totalSize >= 2) {
                        baseline = timeseries.baseline;

                        const size = (totalSize - 1) * 12;
                        xys = ensureCapacityFloat32(xys, size);

                        let index = 0;
                        for (let j = 0; j < sortedFragments.length; j++) {
                            const fragment = sortedFragments[j];
                            const data: number[] = fragment.data;
                            const times_PMILLIS: number[] = fragment.times_PMILLIS;

                            for (let k = 0; k < data.length - 1; k++) {
                                const x1 = timeAxis.vAtTime(times_PMILLIS[k]);
                                const y1 = data[k];

                                const x2 = timeAxis.vAtTime(times_PMILLIS[k + 1]);
                                const y2 = data[k + 1];

                                index = putQuadXys(xys, index, x1, x2, y1, baseline);
                            }
                        }

                        const lineColor = hasval(timeseries.lineColor) ? timeseries.lineColor : defaultColor;
                        u_Color.setData(gl, lineColor);

                        xysBuffer.setData(xys.subarray(0, index));
                        a_Position.setDataAndEnable(gl, xysBuffer, 2, GL.FLOAT);

                        gl.drawArrays(GL.TRIANGLES, 0, size / 2);
                    }
                    program.endUse(gl);
                }
                else if (timeseries.uiHint === 'area') {
                    // enable the shader
                    program.use(gl);
                    u_modelViewMatrix.setData(gl, glOrthoAxis(axis));

                    baseline = timeseries.baseline;

                    const size = totalSize * 4;

                    // the last data point defines the right edge of the bar
                    // but it does not have its own bar drawn
                    xys = ensureCapacityFloat32(xys, size);

                    let index = 0;
                    for (let j = 0; j < sortedFragments.length; j++) {
                        const fragment = sortedFragments[j];
                        const data: number[] = fragment.data;
                        const times_PMILLIS: number[] = fragment.times_PMILLIS;

                        for (let k = 0; k < data.length; k++ , index += 4) {
                            const x1 = timeAxis.vAtTime(times_PMILLIS[k]);
                            const y1 = data[k];

                            xys[index] = x1;
                            xys[index + 1] = baseline;

                            xys[index + 2] = x1;
                            xys[index + 3] = y1;
                        }
                    }

                    const lineColor = hasval(timeseries.lineColor) ? timeseries.lineColor : defaultColor;
                    u_Color.setData(gl, lineColor);

                    xysBuffer.setData(xys.subarray(0, index));
                    a_Position.setDataAndEnable(gl, xysBuffer, 2, GL.FLOAT);

                    gl.drawArrays(GL.TRIANGLE_STRIP, 0, size / 2);

                    program.endUse(gl);
                }

                // highlight hovered point
                if (selection.hoveredTimeseries.fragment && timeseries.fragmentGuids.hasValue(selection.hoveredTimeseries.fragment.fragmentGuid)) {
                    // enable the shader
                    program.use(gl);
                    u_modelViewMatrix.setData(gl, glOrthoAxis(axis));

                    if (timeseries.uiHint === 'area' || timeseries.uiHint === 'lines' || timeseries.uiHint === 'points' || timeseries.uiHint === 'lines-and-points' || timeseries.uiHint === undefined) {
                        const size = 8;
                        xys = ensureCapacityFloat32(xys, size);

                        const vppx: number = timeAxis.vSize / viewport.w;
                        const vppy: number = dataAxis.vSize / viewport.h;

                        const highlightSize = hasval(timeseries.pointSize) ? timeseries.pointSize : 5;

                        const bufferx = (highlightSize / 2) * vppx;
                        const buffery = (highlightSize / 2) * vppy;

                        const fragment = selection.hoveredTimeseries.fragment;
                        const y = selection.hoveredTimeseries.data;
                        const x = timeAxis.vAtTime(selection.hoveredTimeseries.times_PMILLIS);

                        xys[0] = x - bufferx; xys[1] = y - buffery;
                        xys[2] = x + bufferx; xys[3] = y - buffery;
                        xys[4] = x + bufferx; xys[5] = y + buffery;
                        xys[6] = x - bufferx; xys[7] = y + buffery;

                        const color = hasval(timeseries.pointColor) ? timeseries.pointColor : defaultColor;
                        u_Color.setData(gl, darker(color, 0.8));

                        xysBuffer.setData(xys.subarray(0, size));
                        a_Position.setDataAndEnable(gl, xysBuffer, 2, GL.FLOAT);

                        gl.drawArrays(GL.LINE_LOOP, 0, size / 2);
                    }
                    else if (timeseries.uiHint === 'bars') {
                        const size = 8;
                        xys = ensureCapacityFloat32(xys, size);

                        const fragment = selection.hoveredTimeseries.fragment;
                        const index = selection.hoveredTimeseries.index;

                        if (index < fragment.data.length) {
                            const x1 = timeAxis.vAtTime(fragment.times_PMILLIS[index]);
                            const y1 = fragment.data[index];

                            const x2 = timeAxis.vAtTime(fragment.times_PMILLIS[index + 1]);
                            const y2 = fragment.data[index + 1];

                            xys[0] = x1; xys[1] = y1;
                            xys[2] = x2; xys[3] = y1;
                            xys[4] = x2; xys[5] = baseline;
                            xys[6] = x1; xys[7] = baseline;

                            const color = hasval(timeseries.lineColor) ? timeseries.lineColor : defaultColor;
                            u_Color.setData(gl, darker(color, 0.8));

                            xysBuffer.setData(xys.subarray(0, size));
                            a_Position.setDataAndEnable(gl, xysBuffer, 2, GL.FLOAT);

                            gl.drawArrays(GL.LINE_LOOP, 0, size / 2);
                        }
                    }
                    program.endUse(gl);
                }
            }

            // disable shader and attribute buffers
            a_Position.disable(gl);
            a_lpDistance.disable(gl);
        };
    };
}

