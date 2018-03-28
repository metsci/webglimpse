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

export interface TimelineTimeseriesPainterFactory {
    (drawable: Drawable, timeAxis: TimeAxis1D, dataAxis: Axis1D, model: TimelineModel, rowModel: TimelineRowModel, ui: TimelineUi, options: TimelineTimeseriesPainterOptions): Painter;
}

export interface TimelineTimeseriesRowPaneOptions {
    rowHeight?: number;
    rowTopPadding?: number;
    rowBottomPadding?: number;
    axisOptions?: EdgeAxisPainterOptions;
    axisWidth?: number
    painterFactories?: TimelineTimeseriesPainterFactory[];
}

export function newTimeseriesRowPaneFactory(rowOptions?: TimelineTimeseriesRowPaneOptions): TimelineRowPaneFactory {
    return function (drawable: Drawable, timeAxis: TimeAxis1D, dataAxis: Axis1D, model: TimelineModel, row: TimelineRowModel, ui: TimelineUi, options: TimelineRowPaneOptions): Pane {

        let rowTopPadding = (hasval(rowOptions) && hasval(rowOptions.rowTopPadding) ? rowOptions.rowTopPadding : 6);
        let rowBottomPadding = (hasval(rowOptions) && hasval(rowOptions.rowBottomPadding) ? rowOptions.rowBottomPadding : 6);
        let axisWidth = (hasval(rowOptions) && hasval(rowOptions.axisWidth) ? rowOptions.axisWidth : 60);
        let painterFactories = (hasval(rowOptions) && hasval(rowOptions.painterFactories) ? rowOptions.painterFactories : []);
        let axisOptions = (hasval(rowOptions) && hasval(rowOptions.axisOptions) ? rowOptions.axisOptions : {});

        let keyPrefix = options.isMaximized ? 'maximized-' : '';

        let getRowHeight = function () {
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
        }

        let rowHeight: number = getRowHeight();

        let timelineFont = options.timelineFont;
        let timelineFgColor = options.timelineFgColor;
        let draggableEdgeWidth = options.draggableEdgeWidth;
        let snapToDistance = options.snapToDistance;

        let rowUi = ui.rowUi(row.rowGuid);
        let input = ui.input;
        let selection = ui.selection;

        if (!hasval(axisOptions.font)) axisOptions.font = timelineFont;
        if (!hasval(axisOptions.tickColor)) axisOptions.tickColor = timelineFgColor;
        if (!hasval(axisOptions.textColor)) axisOptions.textColor = timelineFgColor;
        if (!hasval(axisOptions.showLabel)) axisOptions.showLabel = true;
        if (!hasval(axisOptions.shortenLabels)) axisOptions.shortenLabels = false;

        let redraw = function () {
            drawable.redraw();
        };

        // setup pane for data (y) axis painter and mouse listener
        let yAxisPane = new Pane(<Layout>{ updatePrefSize: fixedSize(axisWidth, rowHeight) });
        dataAxis.limitsChanged.on(redraw);
        attachAxisMouseListeners1D(yAxisPane, dataAxis, true);

        // add listener to update the height of the row if the rowHeight attribute changes
        let updateRowHeight = function () {
            yAxisPane.layout = <Layout>{ updatePrefSize: fixedSize(axisWidth, getRowHeight()) };
        };
        row.attrsChanged.on(updateRowHeight);

        let isDragMode: Mask2D = function (viewport: BoundsUnmodifiable, i: number, j: number): boolean {
            let fragment = getNearestFragment(viewport, i, j).fragment;
            return hasval(fragment);
        };

        let rowContentPane = new Pane(newColumnLayout(), true, isDragMode);
        let underlayPane = new Pane(newOverlayLayout(), false);
        let overlayPane = new Pane(null, false);

        let painterOptions = { timelineFont: timelineFont, timelineFgColor: timelineFgColor, timelineThickness: 1, rowTopPadding: rowTopPadding, rowBottomPadding: rowBottomPadding };
        for (let n = 0; n < painterFactories.length; n++) {
            let createPainter = painterFactories[n];
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

        let addFragmentRedraw = function (fragmentGuid: string) {
            let fragment = model.timeseriesFragment(fragmentGuid);
            fragment.dataChanged.on(redraw);
        }

        let removeFragmentRedraw = function (fragmentGuid: string) {
            let fragment = model.timeseriesFragment(fragmentGuid);
            fragment.dataChanged.off(redraw);
        }

        let addRedraw = function (timeseriesGuid: string) {
            let timeseries = model.timeseries(timeseriesGuid);
            timeseries.attrsChanged.on(redraw);
            timeseries.fragmentGuids.valueAdded.on(redraw);
            timeseries.fragmentGuids.valueRemoved.on(redraw);

            timeseries.fragmentGuids.forEach(addFragmentRedraw);
            timeseries.fragmentGuids.valueAdded.on(addFragmentRedraw);
            timeseries.fragmentGuids.valueRemoved.on(removeFragmentRedraw);
        };
        row.timeseriesGuids.forEach(addRedraw);
        row.timeseriesGuids.valueAdded.on(addRedraw);

        let removeRedraw = function (timeseriesGuid: string) {
            let timeseries = model.timeseries(timeseriesGuid);
            timeseries.attrsChanged.off(redraw);
            timeseries.fragmentGuids.valueAdded.off(redraw);
            timeseries.fragmentGuids.valueRemoved.off(redraw);
            timeseries.fragmentGuids.forEach(removeFragmentRedraw);
        };
        row.timeseriesGuids.valueRemoved.on(removeRedraw);

        let timeAtCoords_PMILLIS = function (viewport: BoundsUnmodifiable, i: number): number {
            return timeAxis.tAtFrac_PMILLIS(viewport.xFrac(i));
        };

        let timeAtPointer_PMILLIS = function (ev: PointerEvent): number {
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

        let uiMillisPerPxChanged = function () {
            if (!hasval(timeseriesDragMode) && recentMouseMove != null) {
                let ev = recentMouseMove;
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

        let getNearestAnnotation = function (viewport: BoundsUnmodifiable, i: number, j: number) {
            // maximum number of pixels away from a point the mouse can be to select it
            let pickBuffer_PIXEL: number = 10;
            // value per pixel in x and y directions
            let vppx: number = ui.millisPerPx.value;
            let vppy: number = dataAxis.vSize / rowContentPane.viewport.h;
            let pickBuffer_PMILLIS: number = pickBuffer_PIXEL * vppx;

            let ev_time: number = timeAtCoords_PMILLIS(viewport, i);
            let ev_value: number = dataAxis.vAtFrac(viewport.yFrac(j));

            let bestAnnotation: TimelineAnnotationModel = null;
            let best_PIXEL: number = null;

            if (ev_time) {
                for (let i = 0; i < row.annotationGuids.length; i++) {
                    let annotationGuid: string = row.annotationGuids.valueAt(i);
                    let annotation: TimelineAnnotationModel = model.annotation(annotationGuid);
                    let styleGuid: string = annotation.styleGuid;
                    let style: TimelineAnnotationStyleUi = ui.annotationStyle(styleGuid);

                    let dy_PIXEL = Math.abs(annotation.y - ev_value) / vppy;
                    let dx_PIXEL = Math.abs(annotation.time_PMILLIS - ev_time) / vppx;

                    let d_PIXEL: number = 0;
                    if (style.uiHint === 'point') {
                        let d_PIXEL = Math.sqrt(dx_PIXEL * dx_PIXEL + dy_PIXEL * dy_PIXEL);
                    }
                    else if (style.uiHint === 'horizontal-line') {
                        let d_PIXEL = dy_PIXEL;
                    }
                    else if (style.uiHint === 'vertical-line') {
                        let d_PIXEL = dx_PIXEL;
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
        }

        let getNearestAnnotationEvent = function (ev: PointerEvent) {
            return getNearestAnnotation(ev.paneViewport, ev.i, ev.j);
        }

        overlayPane.mouseMove.on(function (ev: PointerEvent) {
            // update selection.hoveredYValue
            let y: number = dataAxis.vAtFrac(yFrac(ev));
            selection.hoveredY.value = y;

            // update selection.hoveredAnnotation
            let result = getNearestAnnotationEvent(ev);
            selection.hoveredAnnotation.value = result;
        });
        selection.hoveredAnnotation.changed.on(redraw);

        overlayPane.mouseExit.on(function () {
            selection.hoveredY.value = undefined;
            selection.hoveredAnnotation.value = null;
        });

        // Begin timeseries-drag
        //

        function chooseTimeseriesDragMode(ui: TimelineUi, hoveredTimeseriesFragment: TimelineTimeseriesFragmentModel): string {
            if (!hasval(hoveredTimeseriesFragment)) {
                return null;
            }
            // return the edit mode of the selected fragment
            else {
                return hoveredTimeseriesFragment.userEditMode;
            }
        }

        let updateCursor = function () {
            if (!timeseriesDragMode) {
                let mouseCursors = { 'xy': 'move', 'y': 'ns-resize' };
                rowContentPane.mouseCursor = mouseCursors[chooseTimeseriesDragMode(ui, selection.hoveredTimeseries.fragment)];
            }
        };
        ui.millisPerPx.changed.on(updateCursor);
        selection.hoveredTimeseries.changed.on(updateCursor);

        let getNearestFragment = function (viewport: BoundsUnmodifiable, i: number, j: number) {
            // maximum number of pixels away from a point the mouse can be to select it
            let pickBuffer_PIXEL: number = 10;
            // value per pixel in x and y directions
            let vppx: number = ui.millisPerPx.value;
            let vppy: number = dataAxis.vSize / rowContentPane.viewport.h;
            let pickBuffer_PMILLIS: number = pickBuffer_PIXEL * vppx;

            let bestFragment: TimelineTimeseriesFragmentModel;
            let bestIndex: number;
            let best_PIXEL: number;

            let ev_time: number = timeAtCoords_PMILLIS(viewport, i);
            let ev_value: number = dataAxis.vAtFrac(viewport.yFrac(j));

            if (ev_time) {
                for (let i = 0; i < row.timeseriesGuids.length; i++) {
                    let timeseriesGuid: string = row.timeseriesGuids.valueAt(i);
                    let timeseries: TimelineTimeseriesModel = model.timeseries(timeseriesGuid);

                    for (let j = 0; j < timeseries.fragmentGuids.length; j++) {
                        let fragmentGuid: string = timeseries.fragmentGuids.valueAt(j);
                        let fragment: TimelineTimeseriesFragmentModel = model.timeseriesFragment(fragmentGuid);

                        // fragments should not overlap
                        if (fragment.start_PMILLIS - pickBuffer_PMILLIS < ev_time && fragment.end_PMILLIS + pickBuffer_PMILLIS > ev_time) {
                            // bars are drawn starting at the point and continuing to the next point, so we need to choose the closest index differently
                            let index: number = timeseries.uiHint === 'bars' ? indexAtOrBefore(fragment.times_PMILLIS, ev_time) : indexNearest(fragment.times_PMILLIS, ev_time);
                            let value = fragment.data[index];
                            let time = fragment.times_PMILLIS[index];

                            let dy_PIXEL = (value - ev_value) / vppy;
                            let dx_PIXEL = (time - ev_time) / vppx;
                            let d_PIXEL = Math.sqrt(dx_PIXEL * dx_PIXEL + dy_PIXEL * dy_PIXEL);

                            let filter = function (): boolean {
                                if (timeseries.uiHint === 'bars') {
                                    return (timeseries.baseline < ev_value && ev_value < value) ||
                                        (timeseries.baseline > ev_value && ev_value > value);
                                }
                                else {
                                    return d_PIXEL < pickBuffer_PIXEL;
                                }
                            }

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

        let getNearestFragmentEvent = function (ev: PointerEvent) {
            return getNearestFragment(ev.paneViewport, ev.i, ev.j);
        }

        // choose the closest data point to the mouse cursor position and fire an event when it changes
        rowContentPane.mouseMove.on(function (ev: PointerEvent) {
            if (!hasval(timeseriesDragMode)) {
                let result = getNearestFragmentEvent(ev);
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
                let x: number = timeAtPointer_PMILLIS(ev);
                let y: number = dataAxis.vAtFrac(yFrac(ev));

                let fragment = selection.hoveredTimeseries.fragment;
                let fragment_time = fragment.times_PMILLIS;

                if (timeseriesDragMode === 'y') {
                    fragment.setData(selection.hoveredTimeseries.index, y);
                }
                else if (timeseriesDragMode === 'xy') {
                    let index = fragment.setData(selection.hoveredTimeseries.index, y, x);
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
                let timeseries = model.timeseries(timeseriesGuid);
                timeseries.attrsChanged.off(redraw);
                timeseries.fragmentGuids.valueAdded.off(redraw);
                timeseries.fragmentGuids.valueRemoved.off(redraw);
            });
        });

        return underlayPane;
    }
}

export function newTimeseriesPainterFactory(options?: TimelineTimeseriesPainterOptions): TimelineTimeseriesPainterFactory {
    // Painter Factory
    return function (drawable: Drawable, timeAxis: TimeAxis1D, dataAxis: Axis1D, model: TimelineModel, rowModel: TimelineRowModel, ui: TimelineUi): Painter {

        let selection: TimelineSelectionModel = ui.selection;
        let defaultColor = hasval(options) && hasval(options.timelineFgColor) ? options.timelineFgColor : white;
        let defaultThickness = hasval(options) && hasval(options.timelineThickness) ? options.timelineThickness : 1;

        let modelview_line_VERTSHADER = concatLines(
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

        let modelview_pointsize_VERTSHADER = concatLines(
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

        let program = new Program(modelview_pointsize_VERTSHADER, solid_FRAGSHADER);

        let u_Color = new UniformColor(program, 'u_Color');
        let u_modelViewMatrix = new UniformMatrix4f(program, 'u_modelViewMatrix');
        let a_Position = new Attribute(program, 'a_Position');
        let u_PointSize = new Uniform1f(program, 'u_PointSize');

        let lineProgram = new Program(modelview_line_VERTSHADER, dash_FRAGSHADER);
        let u_lpColor = new UniformColor(lineProgram, 'u_Color');
        let u_lpmodelViewMatrix = new UniformMatrix4f(lineProgram, 'u_modelViewMatrix');
        let a_lpPosition = new Attribute(lineProgram, 'a_Position');
        let u_lpPointSize = new Uniform1f(lineProgram, 'u_PointSize');
        let a_lpDistance = new Attribute(lineProgram, 'a_Distance');
        let u_lpDash = new Uniform1f(lineProgram, 'u_Dash');

        let axis = new Axis2D(timeAxis, dataAxis);

        let xys = new Float32Array(0);
        let dists = new Float32Array(0);
        let xysBuffer = newDynamicBuffer();
        let distBuffer = newDynamicBuffer();

        // Painter
        return function (gl: WebGLRenderingContext, viewport: BoundsUnmodifiable) {

            gl.blendFuncSeparate(GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA, GL.ONE, GL.ONE_MINUS_SRC_ALPHA);
            gl.enable(GL.BLEND);

            let baseline: number = 0;

            for (let i = 0; i < rowModel.timeseriesGuids.length; i++) {
                // collect fragments and sort them by time
                let totalSize = 0;
                let sortedFragments = new Array<TimelineTimeseriesFragmentModel>();
                let timeseriesGuid = rowModel.timeseriesGuids.valueAt(i);
                let timeseries = model.timeseries(timeseriesGuid);
                for (let j = 0; j < timeseries.fragmentGuids.length; j++) {
                    let timeseriesFragmentGuid = timeseries.fragmentGuids.valueAt(j);
                    let fragment = model.timeseriesFragment(timeseriesFragmentGuid);

                    sortedFragments.push(fragment);
                    totalSize += fragment.times_PMILLIS.length;
                }
                sortedFragments.sort((a, b) => { return a.start_PMILLIS - b.start_PMILLIS; });

                if (timeseries.uiHint === 'lines' || timeseries.uiHint === 'points' || timeseries.uiHint === 'lines-and-points' || timeseries.uiHint === undefined) {

                    // enable the shader
                    lineProgram.use(gl);

                    u_lpmodelViewMatrix.setData(gl, glOrthoAxis(axis));
                    let size = totalSize * 2;

                    xys = ensureCapacityFloat32(xys, size);
                    dists = ensureCapacityFloat32(dists, totalSize);

                    let index = 0;
                    for (let j = 0; j < sortedFragments.length; j++) {
                        let fragment = sortedFragments[j];
                        let data: number[] = fragment.data;
                        let times_PMILLIS: number[] = fragment.times_PMILLIS;

                        for (let k = 0; k < data.length; k++ , index += 2) {
                            xys[index] = timeAxis.vAtTime(times_PMILLIS[k]);
                            xys[index + 1] = data[k];
                            if (k !== 0) {
                                let x = (timeAxis.vAtTime(times_PMILLIS[k]) - timeAxis.vAtTime(times_PMILLIS[k - 1]));
                                let y = data[k] - data[k - 1];
                                dists[k] = dists[k - 1] + Math.sqrt(x * x + y * y);
                            }
                            else {
                                dists[k] = 0;
                            }
                        }
                    }

                    let lineColor = hasval(timeseries.lineColor) ? timeseries.lineColor : defaultColor;
                    u_lpColor.setData(gl, lineColor);

                    let dash = hasval(timeseries.dash) ? timeseries.dash : 0;
                    u_lpDash.setData(gl, dash);

                    let lineThickness = hasval(timeseries.lineThickness) ? timeseries.lineThickness : defaultThickness;
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

                        let pointColor = hasval(timeseries.pointColor) ? timeseries.pointColor : defaultColor;
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
                        let baseline: number = timeseries.baseline;

                        let size = (totalSize - 1) * 12;
                        xys = ensureCapacityFloat32(xys, size);

                        let index = 0;
                        for (let j = 0; j < sortedFragments.length; j++) {
                            let fragment = sortedFragments[j];
                            let data: number[] = fragment.data;
                            let times_PMILLIS: number[] = fragment.times_PMILLIS;

                            for (let k = 0; k < data.length - 1; k++) {
                                let x1 = timeAxis.vAtTime(times_PMILLIS[k]);
                                let y1 = data[k];

                                let x2 = timeAxis.vAtTime(times_PMILLIS[k + 1]);
                                let y2 = data[k + 1];

                                index = putQuadXys(xys, index, x1, x2, y1, baseline);
                            }
                        }

                        let lineColor = hasval(timeseries.lineColor) ? timeseries.lineColor : defaultColor;
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

                    let baseline: number = timeseries.baseline;

                    let size = totalSize * 4;

                    // the last data point defines the right edge of the bar
                    // but it does not have its own bar drawn
                    xys = ensureCapacityFloat32(xys, size);

                    let index = 0;
                    for (let j = 0; j < sortedFragments.length; j++) {
                        let fragment = sortedFragments[j];
                        let data: number[] = fragment.data;
                        let times_PMILLIS: number[] = fragment.times_PMILLIS;

                        for (let k = 0; k < data.length; k++ , index += 4) {
                            let x1 = timeAxis.vAtTime(times_PMILLIS[k]);
                            let y1 = data[k];

                            xys[index] = x1;
                            xys[index + 1] = baseline;

                            xys[index + 2] = x1;
                            xys[index + 3] = y1;
                        }
                    }

                    let lineColor = hasval(timeseries.lineColor) ? timeseries.lineColor : defaultColor;
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
                        let size = 8;
                        xys = ensureCapacityFloat32(xys, size);

                        let vppx: number = timeAxis.vSize / viewport.w;
                        let vppy: number = dataAxis.vSize / viewport.h;

                        let highlightSize = hasval(timeseries.pointSize) ? timeseries.pointSize : 5;

                        let bufferx = (highlightSize / 2) * vppx;
                        let buffery = (highlightSize / 2) * vppy;

                        let fragment = selection.hoveredTimeseries.fragment;
                        let y = selection.hoveredTimeseries.data;
                        let x = timeAxis.vAtTime(selection.hoveredTimeseries.times_PMILLIS);

                        xys[0] = x - bufferx; xys[1] = y - buffery;
                        xys[2] = x + bufferx; xys[3] = y - buffery;
                        xys[4] = x + bufferx; xys[5] = y + buffery;
                        xys[6] = x - bufferx; xys[7] = y + buffery;

                        let color = hasval(timeseries.pointColor) ? timeseries.pointColor : defaultColor;
                        u_Color.setData(gl, darker(color, 0.8));

                        xysBuffer.setData(xys.subarray(0, size));
                        a_Position.setDataAndEnable(gl, xysBuffer, 2, GL.FLOAT);

                        gl.drawArrays(GL.LINE_LOOP, 0, size / 2);
                    }
                    else if (timeseries.uiHint === 'bars') {
                        let size = 8;
                        xys = ensureCapacityFloat32(xys, size);

                        let fragment = selection.hoveredTimeseries.fragment;
                        let index = selection.hoveredTimeseries.index;

                        if (index < fragment.data.length) {
                            let x1 = timeAxis.vAtTime(fragment.times_PMILLIS[index]);
                            let y1 = fragment.data[index];

                            let x2 = timeAxis.vAtTime(fragment.times_PMILLIS[index + 1]);
                            let y2 = fragment.data[index + 1];

                            xys[0] = x1; xys[1] = y1;
                            xys[2] = x2; xys[3] = y1;
                            xys[4] = x2; xys[5] = baseline;
                            xys[6] = x1; xys[7] = baseline;

                            let color = hasval(timeseries.lineColor) ? timeseries.lineColor : defaultColor;
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
        }
    }
}

