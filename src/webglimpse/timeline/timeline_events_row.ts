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
import { Color, darker } from '../color';
import { Drawable, Painter, Pane, PointerEvent, Mask2D, yFrac, xFrac, isLeftMouseDown, Layout } from '../core';
import { TimeAxis1D } from './time_axis';
import { TimelineLaneArray, TimelineLane, effectiveEdges_PMILLIS } from './timeline_lanes';
import { TimelineUi } from './timeline_ui';
import { TimelineRowPaneFactory, TimelineRowPaneOptions } from './timeline_row';
import { Axis1D } from '../plot/axis';
import { TimelineModel, TimelineRowModel, TimelineEventModel } from './timeline_model';
import { BoundsUnmodifiable, Size } from '../bounds';
import { StringMap, concatLines, GL, ensureCapacityFloat32, hasval, isNumber } from '../util/util';
import { indexNearest } from '../util/sorted_arrays';
import { Program, Attribute, Uniform1f } from '../shader';
import { newDynamicBuffer } from '../buffer';
import { putQuadXys, putRgbas, putQuadRgbas, putUpperRightTriangleXys, putLowerRightTriangleXys, putLowerLeftTriangleXys, putUpperLeftTriangleXys, varyingColor_FRAGSHADER } from '../misc';
import { OrderedSet } from '../util/ordered_set';
import { TextureRenderer, Texture2D } from '../texture';
import { TwoKeyCache } from '../util/multikey_cache';
import { TextTexture2D, newTextTextureCache2 } from '../text';


export interface TimelineEventsPainterOptions {
    timelineFont: string;
    timelineFgColor: Color;
    rowTopPadding: number;
    rowBottomPadding: number;
    laneHeight: number;
}



export interface TimelineEventsPainterFactory {
    (drawable: Drawable, timeAxis: TimeAxis1D, lanes: TimelineLaneArray, ui: TimelineUi, options: TimelineEventsPainterOptions): Painter;
}



export interface TimelineEventsRowPaneOptions {
    rowTopPadding?: number;
    rowBottomPadding?: number;
    laneHeight?: number;
    allowMultipleLanes?: boolean;
    painterFactories?: TimelineEventsPainterFactory[];
}



export function newEventsRowPaneFactory(eventsRowOpts?: TimelineEventsRowPaneOptions): TimelineRowPaneFactory {

    // Pane Factory
    return function (drawable: Drawable, timeAxis: TimeAxis1D, dataAxis: Axis1D, model: TimelineModel, row: TimelineRowModel, ui: TimelineUi, options: TimelineRowPaneOptions): Pane {
        let rowTopPadding = (hasval(eventsRowOpts) && hasval(eventsRowOpts.rowTopPadding) ? eventsRowOpts.rowTopPadding : 6);
        let rowBottomPadding = (hasval(eventsRowOpts) && hasval(eventsRowOpts.rowBottomPadding) ? eventsRowOpts.rowBottomPadding : 6);
        let laneHeight = (hasval(eventsRowOpts) && hasval(eventsRowOpts.laneHeight) ? eventsRowOpts.laneHeight : 33);
        let painterFactories = (hasval(eventsRowOpts) && hasval(eventsRowOpts.painterFactories) ? eventsRowOpts.painterFactories : []);
        let allowMultipleLanes = (hasval(eventsRowOpts) && hasval(eventsRowOpts.allowMultipleLanes) ? eventsRowOpts.allowMultipleLanes : true);

        let timelineFont = options.timelineFont;
        let timelineFgColor = options.timelineFgColor;
        let draggableEdgeWidth = options.draggableEdgeWidth;
        let snapToDistance = options.snapToDistance;

        let rowUi = ui.rowUi(row.rowGuid);
        let input = ui.input;
        let selection = ui.selection;

        let lanes = new TimelineLaneArray(model, row, ui, allowMultipleLanes);

        let timeAtCoords_PMILLIS = function (viewport: BoundsUnmodifiable, i: number): number {
            return timeAxis.tAtFrac_PMILLIS(viewport.xFrac(i));
        };

        let timeAtPointer_PMILLIS = function (ev: PointerEvent): number {
            return timeAtCoords_PMILLIS(ev.paneViewport, ev.i);
        };

        let eventAtCoords = function (viewport: BoundsUnmodifiable, i: number, j: number): TimelineEventModel {
            let laneNum = Math.floor((viewport.jEnd - j - rowTopPadding) / laneHeight);
            let time_PMILLIS = timeAtCoords_PMILLIS(viewport, i);
            return lanes.eventAt(laneNum, time_PMILLIS);
        };

        let eventAtPointer = function (ev: PointerEvent): TimelineEventModel {
            return eventAtCoords(ev.paneViewport, ev.i, ev.j);
        };

        let isInsideAnEvent: Mask2D = function (viewport: BoundsUnmodifiable, i: number, j: number): boolean {
            return hasval(eventAtCoords(viewport, i, j));
        };


        // Create pane
        //

        let layout = <Layout>{
            updatePrefSize: <Layout>function (parentPrefSize: Size): void {
                parentPrefSize.h = rowTopPadding + rowBottomPadding + Math.max(1, lanes.length) * laneHeight;
                parentPrefSize.w = null;
            }
        };
        let rowContentPane = new Pane(layout, true, isInsideAnEvent);

        rowUi.addPane('content', rowContentPane);

        let painterOptions = { timelineFont: timelineFont, timelineFgColor: timelineFgColor, rowTopPadding: rowTopPadding, rowBottomPadding: rowBottomPadding, laneHeight: laneHeight };
        for (let n = 0; n < painterFactories.length; n++) {
            let createPainter = painterFactories[n];
            rowContentPane.addPainter(createPainter(drawable, timeAxis, lanes, ui, painterOptions));
        }


        let redraw = function () {
            drawable.redraw();
        };

        row.eventGuids.valueAdded.on(redraw);
        row.eventGuids.valueMoved.on(redraw);
        row.eventGuids.valueRemoved.on(redraw);

        let watchEventAttrs = function (eventGuid: string) {
            model.event(eventGuid).attrsChanged.on(redraw);
        };
        row.eventGuids.forEach(watchEventAttrs);
        row.eventGuids.valueAdded.on(watchEventAttrs);

        let removeRedraw = function (eventGuid: string) {
            model.event(eventGuid).attrsChanged.off(redraw);
        }
        row.eventGuids.valueRemoved.on(removeRedraw);



        // Used by both sets of listeners to know whether an event-drag is in progress
        let eventDragMode: string = null;



        // Hook up input notifications
        //

        let recentMouseMove: PointerEvent = null;

        rowContentPane.mouseMove.on(function (ev: PointerEvent) {
            input.mouseMove.fire(ev);
            if (!eventDragMode) {
                input.timeHover.fire(timeAtPointer_PMILLIS(ev), ev);
                input.rowHover.fire(row, ev);
                input.eventHover.fire(eventAtPointer(ev), ev);
            }
            recentMouseMove = ev;
        });

        rowContentPane.mouseExit.on(function (ev: PointerEvent) {
            input.mouseExit.fire(ev);
            if (!eventDragMode) {
                input.timeHover.fire(null, ev);
                input.rowHover.fire(null, ev);
                input.eventHover.fire(null, ev);
            }
            recentMouseMove = null;
        });

        let uiMillisPerPxChanged = function () {
            if (!eventDragMode && recentMouseMove != null) {
                let ev = recentMouseMove;
                input.timeHover.fire(timeAtPointer_PMILLIS(ev), ev);
                input.eventHover.fire(eventAtPointer(ev), ev);
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



        // Begin event-drag
        //

        let eventDragEvents: TimelineEventModel[] = [];
        let eventDragOffsets_MILLIS: StringMap<number> = {};
        let eventDragSnapTimes_PMILLIS: number[] = [];


        // Event-edges are draggable for events at least this wide
        let minEventWidthForEdgeDraggability = 3 * draggableEdgeWidth;

        // When dragging an event-edge, the event cannot be made narrower than this
        //
        // Needs to be greater than minEventWidthForEdgeDraggability -- by enough to
        // cover floating-point precision loss -- so a user can't accidentally make
        // an event so narrow that it can't easily be widened again.
        //
        let minEventWidthWhenDraggingEdge = minEventWidthForEdgeDraggability + 1;


        function allUserEditable(events: TimelineEventModel[]): boolean {
            for (let n = 0; n < events.length; n++) {
                if (!events[n].userEditable) {
                    return false;
                }
            }
            return true;
        }

        function chooseEventDragMode(ui: TimelineUi, mouseTime_PMILLIS: number, eventDragEvents: TimelineEventModel[]): string {
            if (eventDragEvents.length === 0) {
                // If no events are selected, then we don't have any to drag
                return null;
            }
            else if (!allUserEditable(eventDragEvents)) {
                // If any selected event is not user-editable, don't allow editing
                return 'undraggable';
            }
            else if (eventDragEvents.length > 1) {
                // If more than one event is selected, don't allow edge dragging
                return 'center';
            }
            else if (eventDragEvents.length === 1) {
                let event = eventDragEvents[0];
                let pxPerMilli = 1 / ui.millisPerPx.value;
                let eventWidth = (event.end_PMILLIS - event.start_PMILLIS) * pxPerMilli;
                if (eventWidth < minEventWidthForEdgeDraggability) {
                    // If event isn't very wide, don't try to allow edge dragging
                    return 'center';
                }
                else {
                    let mouseOffset = (mouseTime_PMILLIS - event.start_PMILLIS) * pxPerMilli;
                    if (mouseOffset < draggableEdgeWidth) {
                        // If mouse is near the left edge, drag the event's start-time
                        return 'start';
                    }
                    else if (mouseOffset < eventWidth - draggableEdgeWidth) {
                        // If mouse is in the center, drag the whole event
                        return 'center';
                    }
                    else {
                        // If mouse is near the right edge, drag the event's end-time
                        return 'end';
                    }
                }
            }
            else {
                // Should never get here, because we have clauses above for length === 0, length === 1, and length > 1
                return null;
            }
        }

        let updateCursor = function () {
            if (!eventDragMode) {

                let mouseCursors = { 'center': 'default', 'start': 'w-resize', 'end': 'e-resize', 'undraggable': 'default' };
                let hoveredTime_PMILLIS = selection.hoveredTime_PMILLIS.value;

                // if a multi-selection has been made, update the cursor based on all the events in the multi-selection
                if (selection.selectedEvents.length > 1) {
                    rowContentPane.mouseCursor = mouseCursors[chooseEventDragMode(ui, hoveredTime_PMILLIS, selection.selectedEvents.toArray())];
                }
                else {
                    let hoveredEvent = selection.hoveredEvent.value;
                    let hoveredEvents = (hasval(hoveredEvent) ? [hoveredEvent] : []);
                    rowContentPane.mouseCursor = mouseCursors[chooseEventDragMode(ui, hoveredTime_PMILLIS, hoveredEvents)];
                }
            }
        };
        ui.millisPerPx.changed.on(updateCursor);
        selection.hoveredTime_PMILLIS.changed.on(updateCursor);
        selection.hoveredEvent.changed.on(updateCursor);

        rowContentPane.mouseDown.on(function (ev: PointerEvent) {
            if (isLeftMouseDown(ev.mouseEvent)) {
                let eventDragEventsSet = selection.selectedEvents;
                eventDragEvents = eventDragEventsSet.toArray();
                eventDragMode = chooseEventDragMode(ui, timeAtPointer_PMILLIS(ev), eventDragEvents);

                eventDragSnapTimes_PMILLIS = new Array();
                let numSnapTimes = 0;
                let allEventGuids = row.eventGuids;
                for (let n = 0; n < allEventGuids.length; n++) {
                    let eventGuid = allEventGuids.valueAt(n);
                    if (!eventDragEventsSet.hasId(eventGuid)) {
                        let event = model.event(eventGuid);
                        eventDragSnapTimes_PMILLIS.push(event.start_PMILLIS);
                        eventDragSnapTimes_PMILLIS.push(event.end_PMILLIS);
                    }
                }
                eventDragSnapTimes_PMILLIS.sort();
            }
        });

        function findSnapShift_MILLIS(t_PMILLIS: number, maxShift_MILLIS: number): number {
            let i = indexNearest(eventDragSnapTimes_PMILLIS, t_PMILLIS);
            if (i >= 0) {
                let shift_MILLIS = eventDragSnapTimes_PMILLIS[i] - t_PMILLIS;
                if (Math.abs(shift_MILLIS) <= maxShift_MILLIS) {
                    return shift_MILLIS;
                }
            }
            return null;
        }


        // Compute (and remember) the pointer time, for use by the event-drag listeners below
        //

        let eventDragPointer_PMILLIS: number = null;

        let updateEventDragPointer = function (ev: PointerEvent) {
            if (isLeftMouseDown(ev.mouseEvent) && eventDragMode) {
                eventDragPointer_PMILLIS = timeAtPointer_PMILLIS(ev);
            }
        };
        rowContentPane.mouseDown.on(updateEventDragPointer);
        rowContentPane.mouseMove.on(updateEventDragPointer);


        // Dragging event-center
        //

        let grabEventCenter = function () {
            if (eventDragMode === 'center') {
                for (let n = 0; n < eventDragEvents.length; n++) {
                    let event = eventDragEvents[n];
                    eventDragOffsets_MILLIS[event.eventGuid] = eventDragPointer_PMILLIS - event.start_PMILLIS;
                }

                // If this is a simple click-and-release, leave the mouse-cursor alone --
                // but once we can tell that it's actually a drag, change to a drag cursor
                //

                let beginDrag = function () {
                    rowContentPane.mouseCursor = 'move';
                };
                rowContentPane.mouseMove.on(beginDrag);
                let pendingBeginDrag = setTimeout(beginDrag, 300);

                let endDrag = function () {
                    clearTimeout(pendingBeginDrag);
                    rowContentPane.mouseMove.off(beginDrag);
                    rowContentPane.mouseUp.off(endDrag);
                };
                rowContentPane.mouseUp.on(endDrag);
            }
        };
        rowContentPane.mouseDown.on(grabEventCenter);

        let dragEventCenter = function () {
            if (eventDragMode === 'center') {
                let maxSnapShift_MILLIS = snapToDistance * (timeAxis.tSize_MILLIS / rowContentPane.viewport.w);

                let snapShift_MILLIS: number = null;
                for (let n = 0; n < eventDragEvents.length; n++) {
                    let event = eventDragEvents[n];
                    let newStart_PMILLIS = (eventDragPointer_PMILLIS - eventDragOffsets_MILLIS[event.eventGuid]);
                    let newEnd_PMILLIS = event.end_PMILLIS + (newStart_PMILLIS - event.start_PMILLIS);

                    let eventStartSnapShift_MILLIS = findSnapShift_MILLIS(newStart_PMILLIS, maxSnapShift_MILLIS);
                    if (hasval(eventStartSnapShift_MILLIS)) {
                        if (!hasval(snapShift_MILLIS) || Math.abs(eventStartSnapShift_MILLIS) < Math.abs(snapShift_MILLIS)) {
                            snapShift_MILLIS = eventStartSnapShift_MILLIS;
                        }
                    }

                    let eventEndSnapShift_MILLIS = findSnapShift_MILLIS(newEnd_PMILLIS, maxSnapShift_MILLIS);
                    if (hasval(eventEndSnapShift_MILLIS)) {
                        if (!hasval(snapShift_MILLIS) || Math.abs(eventEndSnapShift_MILLIS) < Math.abs(snapShift_MILLIS)) {
                            snapShift_MILLIS = eventEndSnapShift_MILLIS;
                        }
                    }
                }
                if (!hasval(snapShift_MILLIS)) {
                    snapShift_MILLIS = 0;
                }

                for (let n = 0; n < eventDragEvents.length; n++) {
                    let event = eventDragEvents[n];
                    let newStart_PMILLIS = eventDragPointer_PMILLIS - eventDragOffsets_MILLIS[event.eventGuid] + snapShift_MILLIS;
                    let newEnd_PMILLIS = event.end_PMILLIS + (newStart_PMILLIS - event.start_PMILLIS);
                    event.setInterval(newStart_PMILLIS, newEnd_PMILLIS);
                }
            }
        };
        rowContentPane.mouseMove.on(dragEventCenter);


        // Dragging event-start
        //

        let grabEventStart = function () {
            if (eventDragMode === 'start') {
                for (let n = 0; n < eventDragEvents.length; n++) {
                    let event = eventDragEvents[n];
                    eventDragOffsets_MILLIS[event.eventGuid] = eventDragPointer_PMILLIS - event.start_PMILLIS;
                }
            }
        };
        rowContentPane.mouseDown.on(grabEventStart);

        let dragEventStart = function () {
            if (eventDragMode === 'start') {
                let wMin_MILLIS = minEventWidthWhenDraggingEdge * timeAxis.vSize / rowContentPane.viewport.w;
                let maxSnapShift_MILLIS = snapToDistance * (timeAxis.tSize_MILLIS / rowContentPane.viewport.w);

                let snapShift_MILLIS: number = null;
                for (let n = 0; n < eventDragEvents.length; n++) {
                    let event = eventDragEvents[n];
                    let newStart_PMILLIS = eventDragPointer_PMILLIS - eventDragOffsets_MILLIS[event.eventGuid];

                    let eventSnapShift_MILLIS = findSnapShift_MILLIS(newStart_PMILLIS, maxSnapShift_MILLIS);
                    if (hasval(eventSnapShift_MILLIS)) {
                        if (!hasval(snapShift_MILLIS) || Math.abs(eventSnapShift_MILLIS) < Math.abs(snapShift_MILLIS)) {
                            snapShift_MILLIS = eventSnapShift_MILLIS;
                        }
                    }
                }
                if (!hasval(snapShift_MILLIS)) {
                    snapShift_MILLIS = 0;
                }

                for (let n = 0; n < eventDragEvents.length; n++) {
                    let event = eventDragEvents[n];
                    let newStart_PMILLIS = eventDragPointer_PMILLIS - eventDragOffsets_MILLIS[event.eventGuid] + snapShift_MILLIS;
                    event.start_PMILLIS = Math.min(event.end_PMILLIS - wMin_MILLIS, newStart_PMILLIS);
                }
            }
        };
        rowContentPane.mouseMove.on(dragEventStart);
        timeAxis.limitsChanged.on(dragEventStart);


        // Dragging event-end
        //

        let grabEventEnd = function () {
            if (eventDragMode === 'end') {
                for (let n = 0; n < eventDragEvents.length; n++) {
                    let event = eventDragEvents[n];
                    eventDragOffsets_MILLIS[event.eventGuid] = eventDragPointer_PMILLIS - event.end_PMILLIS;
                }
            }
        };
        rowContentPane.mouseDown.on(grabEventEnd);

        let dragEventEnd = function () {
            if (eventDragMode === 'end') {
                let wMin_MILLIS = minEventWidthWhenDraggingEdge * timeAxis.vSize / rowContentPane.viewport.w;
                let maxSnapShift_MILLIS = snapToDistance * (timeAxis.tSize_MILLIS / rowContentPane.viewport.w);

                let snapShift_MILLIS: number = null;
                for (let n = 0; n < eventDragEvents.length; n++) {
                    let event = eventDragEvents[n];
                    let newEnd_PMILLIS = eventDragPointer_PMILLIS - eventDragOffsets_MILLIS[event.eventGuid];

                    let eventSnapShift_MILLIS = findSnapShift_MILLIS(newEnd_PMILLIS, maxSnapShift_MILLIS);
                    if (hasval(eventSnapShift_MILLIS)) {
                        if (!hasval(snapShift_MILLIS) || Math.abs(eventSnapShift_MILLIS) < Math.abs(snapShift_MILLIS)) {
                            snapShift_MILLIS = eventSnapShift_MILLIS;
                        }
                    }
                }
                if (!hasval(snapShift_MILLIS)) {
                    snapShift_MILLIS = 0;
                }

                for (let n = 0; n < eventDragEvents.length; n++) {
                    let event = eventDragEvents[n];
                    let newEnd_PMILLIS = eventDragPointer_PMILLIS - eventDragOffsets_MILLIS[event.eventGuid] + snapShift_MILLIS;
                    event.end_PMILLIS = Math.max(event.start_PMILLIS + wMin_MILLIS, newEnd_PMILLIS);
                }
            }
        };
        rowContentPane.mouseMove.on(dragEventEnd);
        timeAxis.limitsChanged.on(dragEventEnd);


        // Finish event-drag
        //

        rowContentPane.mouseUp.on(function (ev: PointerEvent) {
            eventDragEvents = [];
            eventDragOffsets_MILLIS = {};
            eventDragSnapTimes_PMILLIS = [];
            eventDragPointer_PMILLIS = null;
            eventDragMode = null;
        });


        rowContentPane.dispose.on(function () {
            lanes.dispose();

            timeAxis.limitsChanged.off(dragEventEnd);
            timeAxis.limitsChanged.off(dragEventStart);

            ui.millisPerPx.changed.off(uiMillisPerPxChanged);

            ui.millisPerPx.changed.off(updateCursor);
            selection.hoveredTime_PMILLIS.changed.off(updateCursor);
            selection.hoveredEvent.changed.off(updateCursor);

            row.eventGuids.valueAdded.off(redraw);
            row.eventGuids.valueMoved.off(redraw);
            row.eventGuids.valueRemoved.off(redraw);
            row.eventGuids.valueRemoved.off(removeRedraw);

            row.eventGuids.valueAdded.off(watchEventAttrs);

            row.eventGuids.forEach(function (eventGuid: string) {
                model.event(eventGuid).attrsChanged.off(redraw);
            });
        });

        return rowContentPane;
    };
}

export interface TimelineEventLimitsPainterOptions {
    lineColor?: Color;
    lineThickness?: number;
}

function eventLimitsPainterHelper(limitsOpts: TimelineEventLimitsPainterOptions, drawable: Drawable, timeAxis: TimeAxis1D, lanes: TimelineLaneArray, ui: TimelineUi, options: TimelineEventsPainterOptions) {

    let rowTopPadding = options.rowTopPadding;
    let rowBottomPadding = options.rowBottomPadding;
    let laneHeight = options.laneHeight;

    let lineColor = (hasval(limitsOpts) && hasval(limitsOpts.lineColor) ? limitsOpts.lineColor : new Color(1, 0, 0, 1));
    let lineThickness = (hasval(limitsOpts) && hasval(limitsOpts.lineThickness) ? limitsOpts.lineThickness : 2.5);

    let xyFrac_vColor_VERTSHADER = concatLines(
        '                                                                ',
        '  attribute vec2 a_XyFrac;                                      ',
        '  attribute vec4 a_Color;                                       ',
        '                                                                ',
        '  varying vec4 v_Color;                                         ',
        '                                                                ',
        '  void main( ) {                                                ',
        '      gl_Position = vec4( ( -1.0 + 2.0*a_XyFrac ), 0.0, 1.0 );  ',
        '      v_Color = a_Color;                                        ',
        '  }                                                             ',
        '                                                                '
    );

    let program = new Program(xyFrac_vColor_VERTSHADER, varyingColor_FRAGSHADER);
    let a_XyFrac = new Attribute(program, 'a_XyFrac');
    let a_Color = new Attribute(program, 'a_Color');

    let xys = new Float32Array(0);
    let xysBuffer = newDynamicBuffer();

    let rgbas = new Float32Array(0);
    let rgbasBuffer = newDynamicBuffer();

    return {
        paint(indexXys: number, indexRgbas: number, gl: WebGLRenderingContext, viewport: BoundsUnmodifiable) {
            if (indexXys > 0) {
                gl.blendFuncSeparate(GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA, GL.ONE, GL.ONE_MINUS_SRC_ALPHA);
                gl.enable(GL.BLEND);

                program.use(gl);
                xysBuffer.setData(xys.subarray(0, indexXys));
                a_XyFrac.setDataAndEnable(gl, xysBuffer, 2, GL.FLOAT);
                rgbasBuffer.setData(rgbas.subarray(0, indexRgbas));
                a_Color.setDataAndEnable(gl, rgbasBuffer, 4, GL.FLOAT);

                gl.drawArrays(GL.TRIANGLES, 0, Math.floor(indexXys / 2));

                a_Color.disable(gl);
                a_XyFrac.disable(gl);
                program.endUse(gl);
            }
        },
        ensureCapacity: function (eventCount: number) {
            let numVertices = (6 * 3 /* triangles */ * eventCount);
            xys = ensureCapacityFloat32(xys, 2 * numVertices);
            rgbas = ensureCapacityFloat32(rgbas, 4 * numVertices);
        },
        fillEvent: function (laneIndex: number, eventIndex: number, indexXys: number, indexRgbas: number, viewport: BoundsUnmodifiable): { indexXys: number; indexRgbas: number } {

            let lane: TimelineLane = lanes.lane(laneIndex);
            let event: TimelineEventModel = lane.event(eventIndex);

            let wLine = lineThickness / viewport.w;
            let hLine = lineThickness / viewport.h;

            let jTop = rowTopPadding + (laneIndex) * laneHeight;
            let yTop = (viewport.h - jTop) / viewport.h;
            let jBottom = rowTopPadding + (laneIndex + 1) * laneHeight;
            let yBottom = (viewport.h - jBottom) / viewport.h;
            let yMid = (yTop + yBottom) / 2;

            let xLeft = hasval(event.startLimit_PMILLIS) ? timeAxis.tFrac(event.startLimit_PMILLIS) : 0;
            let xRight = hasval(event.endLimit_PMILLIS) ? timeAxis.tFrac(event.endLimit_PMILLIS) : 1;

            indexXys = putQuadXys(xys, indexXys, xLeft, xRight, yMid - hLine / 2, yMid + hLine / 2);
            indexXys = putQuadXys(xys, indexXys, xLeft, xLeft - wLine, yTop, yBottom);
            indexXys = putQuadXys(xys, indexXys, xRight, xRight + wLine, yTop, yBottom);
            indexRgbas = putRgbas(rgbas, indexRgbas, lineColor, 18);

            return { indexXys: indexXys, indexRgbas: indexRgbas };
        }
    };
}

export function newEventLimitsPainterFactory(limitOpts?: TimelineEventLimitsPainterOptions): TimelineEventsPainterFactory {

    // Painter Factory
    return function (drawable: Drawable, timeAxis: TimeAxis1D, lanes: TimelineLaneArray, ui: TimelineUi, options: TimelineEventsPainterOptions): Painter {

        let helper = eventLimitsPainterHelper(limitOpts, drawable, timeAxis, lanes, ui, options);

        // Painter
        return function (gl: WebGLRenderingContext, viewport: BoundsUnmodifiable) {

            let selectedEvents: OrderedSet<TimelineEventModel> = ui.selection.selectedEvents;

            // XXX Instead of estimating the number of events we will need to draw ahead of time
            // XXX (difficult because selected events may be present in multiple lanes, so
            // XXX selectedEvents.length might not be sufficient) just make enough space for all events.
            // XXX Potentially quite inefficient with lots of events (and few selected events).
            helper.ensureCapacity(lanes.numEvents);

            let indexXys = 0;
            let indexRgbas = 0;

            for (let l = 0; l < lanes.length; l++) {
                let lane = lanes.lane(l);
                for (let e = 0; e < lane.length; e++) {
                    let event = lane.event(e);

                    // check whether the event is selected and has limits defined
                    if (selectedEvents.hasId(event.eventGuid) && (hasval(event.startLimit_PMILLIS) || hasval(event.endLimit_PMILLIS))) {
                        let indexes = helper.fillEvent(l, e, indexXys, indexRgbas, viewport);
                        indexXys = indexes.indexXys;
                        indexRgbas = indexes.indexRgbas;
                    }
                }
            }

            helper.paint(indexXys, indexRgbas, gl, viewport);
        };
    };
}


export enum JointType {
    BEVEL, MITER
}

export interface TimelineEventBarsPainterOptions {
    topMargin?: number;
    bottomMargin?: number;
    borderThickness?: number;
    cornerType?: JointType;
    defaultColor?: Color;
    defaultBorderColor?: Color;
    selectedBorderColor?: Color;

    // the size of the dashes when painting stippled event borders
    dashLength?: number;
    // the width of stripes in the painter fill
    stripeWidth?: number;
    // the width of secondary color stripes in the painter fill
    stripeSecondaryWidth?: number;
    // the slant of the stipes: 0 = horizontal, 1 = 45 degrees, -1 = 45 degrees backward
    stripeSlant?: number;
    // width in pixels of the antialiasing of the slant
    featherWidth?: number;

    // minimum pixel width of the event bar
    // when the timeline is zoomed out so that the event bar
    // is smaller than this visible width, the event bar is hidden
    minimumVisibleWidth?: number;
}

export enum FillPattern {
    solid = 0,
    stripe = 1,
    gradient = 2
}

function eventStripedBarPainterHelper(barOpts: TimelineEventBarsPainterOptions, drawable: Drawable, timeAxis: TimeAxis1D, lanes: TimelineLaneArray, ui: TimelineUi, options: TimelineEventsPainterOptions) {
    let rowTopPadding = options.rowTopPadding;
    let rowBottomPadding = options.rowBottomPadding;
    let laneHeight = options.laneHeight;

    let topMargin = (hasval(barOpts) && hasval(barOpts.topMargin) ? barOpts.topMargin : 1.2);
    let bottomMargin = (hasval(barOpts) && hasval(barOpts.bottomMargin) ? barOpts.bottomMargin : 1.2);
    let borderThickness = (hasval(barOpts) && hasval(barOpts.borderThickness) ? barOpts.borderThickness : 2);
    let cornerType = (hasval(barOpts) && hasval(barOpts.cornerType) ? barOpts.cornerType : JointType.BEVEL);
    let defaultColor = (hasval(barOpts) && hasval(barOpts.defaultColor) ? barOpts.defaultColor : options.timelineFgColor.withAlphaTimes(0.4));
    let defaultColorSecondary = new Color(1, 1, 1, 1);
    let minimumVisibleWidth = (hasval(barOpts) && hasval(barOpts.minimumVisibleWidth) ? barOpts.minimumVisibleWidth : 0);

    let stripeWidth = (hasval(barOpts) && hasval(barOpts.stripeWidth) ? barOpts.stripeWidth : 5);
    let stripeSecondaryWidth = (hasval(barOpts) && hasval(barOpts.stripeSecondaryWidth) ? barOpts.stripeSecondaryWidth : 5);
    let stripeSlant = (hasval(barOpts) && hasval(barOpts.stripeSlant) ? barOpts.stripeSlant : 1);
    let featherWidth = (hasval(barOpts) && hasval(barOpts.featherWidth) ? barOpts.featherWidth : 2);

    let selection = ui.selection;

    let xyFrac_vColor_VERTSHADER = concatLines(
        '                                                                ',
        '  attribute vec2 a_XyFrac;                                      ',
        '  attribute vec4 a_Color;                                       ',
        '  attribute vec4 a_ColorSecondary;                              ',
        '  attribute vec2 a_relativeXy;                                  ',
        '  attribute float a_fillPattern;                                ',
        '                                                                ',
        '  varying vec4 v_Color;                                         ',
        '  varying vec4 v_ColorSecondary;                                ',
        '  varying vec2 v_relativeXy;                                    ',
        '  varying float v_fillPattern;                                  ',
        '                                                                ',
        '  void main( ) {                                                ',
        '      gl_Position = vec4( ( -1.0 + 2.0*a_XyFrac ), 0.0, 1.0 );  ',
        '      v_Color = a_Color;                                        ',
        '      v_ColorSecondary = a_ColorSecondary;                      ',
        '      v_relativeXy = a_relativeXy;                              ',
        '      v_fillPattern = a_fillPattern;                            ',
        '  }                                                             ',
        '                                                                '
    );

    let fillPattern_FRAGSHADER = concatLines(
        ' #define PI 3.1415926535897932384626433832795                                                  ',
        '                                                                                               ',
        ' precision lowp float;                                                                         ',
        ' // the width in pixels of the first color stripe                                              ',
        ' uniform float u_stripeWidth;                                                                  ',
        ' // the width in pixels of the second color stripe                                             ',
        ' uniform float u_stripeSecondaryWidth;                                                         ',
        ' // the slant of the stipes: 0 = horizontal, 1 = 45 degrees                                    ',
        ' uniform float u_slant;                                                                        ',
        ' // width in pixels of the antialiasing of the slant                                           ',
        ' uniform float u_featherWidth;                                                                 ',
        '                                                                                               ',
        ' varying vec4 v_Color;                                                                         ',
        ' varying vec4 v_ColorSecondary;                                                                ',
        ' varying vec2 v_relativeXy;                                                                    ',
        ' varying float v_fillPattern;                                                                  ',
        '                                                                                               ',
        ' void pattern_stripe( ) {                                                                      ',
        '     float stripeWidthTotal = u_stripeWidth + u_stripeSecondaryWidth;                          ',
        '                                                                                               ',
        '     // calculate the value indicating where we are in the stripe pattern                      ',
        '     float stripeCoord = mod( v_relativeXy.x + u_slant * v_relativeXy.y , stripeWidthTotal );  ',
        '                                                                                               ',
        '     // we are in the feather region beween the two stripes                                    ',
        '     if ( stripeCoord < u_featherWidth ) {                                                     ',
        '         float diff = stripeCoord / u_featherWidth;                                            ',
        '         gl_FragColor = vec4 ( v_Color.xyz * diff + (1.0-diff) * v_ColorSecondary.xyz, 1.0 );  ',
        '     }                                                                                         ',
        '     // we are in the color 1 stripe                                                           ',
        '     else if ( stripeCoord < u_stripeWidth ) {                                                 ',
        '         gl_FragColor = v_Color;                                                               ',
        '     }                                                                                         ',
        '     // we are the feather region between the two stripes                                      ',
        '     else if ( stripeCoord  < u_stripeWidth + u_featherWidth ) {                               ',
        '         float diff = ( stripeCoord - u_stripeWidth ) / u_featherWidth;                        ',
        '         gl_FragColor = vec4 ( v_Color.xyz * (1.0-diff) + diff * v_ColorSecondary.xyz, 1.0 );  ',
        '     }                                                                                         ',
        '     // we are in the color 2 stripe                                                           ',
        '     else {                                                                                    ',
        '         gl_FragColor = v_ColorSecondary;                                                      ',
        '     }                                                                                         ',
        ' }                                                                                             ',
        '                                                                                               ',
        ' void pattern_gradient( ) {                                                                    ',
        '     float stripeWidthTotal = u_stripeWidth + u_stripeSecondaryWidth;                          ',
        '                                                                                               ',
        '     // calculate the value indicating where we are in the stripe pattern                      ',
        '     float stripeCoord = mod( v_relativeXy.x + u_slant * v_relativeXy.y , stripeWidthTotal );  ',
        '                                                                                               ',
        '     float weightedCoord;                                                                      ',
        '     if ( stripeCoord < u_stripeWidth ) {                                                      ',
        '         float slope =  PI / u_stripeWidth;                                                    ',
        '         weightedCoord = slope * stripeCoord;                                                  ',
        '     }                                                                                         ',
        '     else {                                                                                    ',
        '         float slope = PI / u_stripeSecondaryWidth;                                            ',
        '         weightedCoord = PI + slope * ( stripeCoord - u_stripeWidth );                         ',
        '     }                                                                                         ',
        '                                                                                               ',
        '     // sin wave domain: [0, stripeWidthTotal ] range: [0, 1]                                  ',
        '     float frac = sin( weightedCoord ) * 2.0 - 1.0;                                            ',
        '                                                                                               ',
        '     // mix primary and secondary colors based on gradient fraction                            ',
        '     gl_FragColor = mix( v_Color, v_ColorSecondary, frac );                                    ',
        ' }                                                                                             ',
        '                                                                                               ',
        ' void pattern_solid( ) {                                                                       ',
        '     gl_FragColor = v_Color;                                                                   ',
        ' }                                                                                             ',
        '                                                                                               ',
        ' void main( ) {                                                                                ',
        '     if ( v_fillPattern == 1.0 ) {                                                             ',
        '         pattern_stripe( );                                                                    ',
        '     }                                                                                         ',
        '     else if ( v_fillPattern == 2.0 ) {                                                        ',
        '         pattern_gradient( );                                                                  ',
        '     }                                                                                         ',
        '     else {                                                                                    ',
        '         pattern_solid( );                                                                     ',
        '     }                                                                                         ',
        ' }                                                                                             ',
        '                                                                                               ',
        '                                                                                               ',
        '                                                                                               '
    );

    let program = new Program(xyFrac_vColor_VERTSHADER, fillPattern_FRAGSHADER);
    let a_XyFrac = new Attribute(program, 'a_XyFrac');
    let a_Color = new Attribute(program, 'a_Color');
    let a_ColorSecondary = new Attribute(program, 'a_ColorSecondary');
    let a_relativeXy = new Attribute(program, 'a_relativeXy');
    let a_fillPattern = new Attribute(program, 'a_fillPattern');

    let u_stripeWidth = new Uniform1f(program, 'u_stripeWidth');
    let u_stripeSecondaryWidth = new Uniform1f(program, 'u_stripeSecondaryWidth');
    let u_slant = new Uniform1f(program, 'u_slant');
    let u_featherWidth = new Uniform1f(program, 'u_featherWidth');

    let xys = new Float32Array(0);
    let xysBuffer = newDynamicBuffer();

    let rgbas = new Float32Array(0);
    let rgbasBuffer = newDynamicBuffer();

    let rgbasSecondary = new Float32Array(0);
    let rgbasSecondaryBuffer = newDynamicBuffer();

    let relativeXys = new Float32Array(0);
    let relativeXysBuffer = newDynamicBuffer();

    let fillPattern = new Float32Array(0);
    let fillPatternBuffer = newDynamicBuffer();

    return {
        paint(indexXys: number, indexRgbas: number, gl: WebGLRenderingContext, viewport: BoundsUnmodifiable, indexRelativeXys: number, indexFillPattern: number) {
            if (indexXys === 0 || indexRgbas === 0) return;

            gl.blendFuncSeparate(GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA, GL.ONE, GL.ONE_MINUS_SRC_ALPHA);
            gl.enable(GL.BLEND);

            program.use(gl);

            u_slant.setData(gl, stripeSlant);
            u_stripeWidth.setData(gl, stripeWidth);
            u_stripeSecondaryWidth.setData(gl, stripeSecondaryWidth);
            u_featherWidth.setData(gl, featherWidth);

            xysBuffer.setData(xys.subarray(0, indexXys));
            a_XyFrac.setDataAndEnable(gl, xysBuffer, 2, GL.FLOAT);

            rgbasBuffer.setData(rgbas.subarray(0, indexRgbas));
            a_Color.setDataAndEnable(gl, rgbasBuffer, 4, GL.FLOAT);

            rgbasSecondaryBuffer.setData(rgbasSecondary.subarray(0, indexRgbas));
            a_ColorSecondary.setDataAndEnable(gl, rgbasSecondaryBuffer, 4, GL.FLOAT);

            relativeXysBuffer.setData(relativeXys.subarray(0, indexRelativeXys));
            a_relativeXy.setDataAndEnable(gl, relativeXysBuffer, 2, GL.FLOAT);

            fillPatternBuffer.setData(fillPattern.subarray(0, indexFillPattern));
            a_fillPattern.setDataAndEnable(gl, fillPatternBuffer, 1, GL.FLOAT);

            gl.drawArrays(GL.TRIANGLES, 0, Math.floor(indexXys / 2));

            a_Color.disable(gl);
            a_XyFrac.disable(gl);
            a_ColorSecondary.disable(gl);
            a_fillPattern.disable(gl);
            a_relativeXy.disable(gl);

            program.endUse(gl);
        },
        ensureCapacity: function (eventCount: number) {
            let numVertices = (6 * (1 /*quads*/)) * eventCount;
            xys = ensureCapacityFloat32(xys, 2 * numVertices);
            rgbas = ensureCapacityFloat32(rgbas, 4 * numVertices);
            rgbasSecondary = ensureCapacityFloat32(rgbasSecondary, 4 * numVertices);
            relativeXys = ensureCapacityFloat32(relativeXys, 2 * numVertices);
            fillPattern = ensureCapacityFloat32(fillPattern, numVertices);
        },
        fillEvent: function (laneIndex: number, eventIndex: number, indexXys: number, indexRgbas: number, viewport: BoundsUnmodifiable, indexRelativeXys: number, indexFillPattern: number): { indexXys: number; indexRgbas: number; indexRelativeXys: number; indexFillPattern: number; } {
            let lane: TimelineLane = lanes.lane(laneIndex);
            let event: TimelineEventModel = lane.event(eventIndex);

            let wBorder = borderThickness / viewport.w;
            let hBorder = borderThickness / viewport.h;

            let _topMargin = hasval(event.topMargin) ? event.topMargin : topMargin;
            let _bottomMargin = hasval(event.bottomMargin) ? event.bottomMargin : bottomMargin;

            let jTop = rowTopPadding + (laneIndex) * laneHeight + _topMargin;
            let yTop = (viewport.h - jTop) / viewport.h;
            let jBottom = rowTopPadding + (laneIndex + 1) * laneHeight - _bottomMargin;
            let yBottom = (viewport.h - jBottom) / viewport.h;

            let xLeft = timeAxis.tFrac(event.start_PMILLIS);
            let xRight = timeAxis.tFrac(event.end_PMILLIS);

            let xWidthPixels = viewport.w * (xRight - xLeft);
            let yHeightPixels = jTop - jBottom;

            if (!(xRight < 0 || xLeft > 1) && xWidthPixels > minimumVisibleWidth) {

                // Fill
                let fillColor = (event.bgColor || defaultColor);
                let fillColorSecondary = (event.bgSecondaryColor || defaultColorSecondary);
                if (event === selection.hoveredEvent.value) {
                    fillColor = darker(fillColor, 0.8);
                    fillColorSecondary = darker(fillColorSecondary, 0.8);
                }
                indexXys = putQuadXys(xys, indexXys, xLeft + wBorder, xRight - wBorder, yTop - hBorder, yBottom + hBorder);

                let startIndex = indexRgbas;
                putQuadRgbas(rgbas, startIndex, fillColor);
                indexRgbas = putQuadRgbas(rgbasSecondary, startIndex, fillColorSecondary);

                // create a quad with relative coordinates
                indexRelativeXys = putQuadXys(relativeXys, indexRelativeXys, 0.0, xWidthPixels, 0.0, yHeightPixels);

                // Set the fillPatternValue per vertex of the quad
                let fillPatternValue: number = event.fillPattern;

                fillPattern[indexFillPattern++] = fillPatternValue;
                fillPattern[indexFillPattern++] = fillPatternValue;
                fillPattern[indexFillPattern++] = fillPatternValue;
                fillPattern[indexFillPattern++] = fillPatternValue;
                fillPattern[indexFillPattern++] = fillPatternValue;
                fillPattern[indexFillPattern++] = fillPatternValue;
            }

            return { indexXys: indexXys, indexRgbas: indexRgbas, indexRelativeXys: indexRelativeXys, indexFillPattern: indexFillPattern };
        }
    };
}

function eventDashedBorderPainterHelper(barOpts: TimelineEventBarsPainterOptions, drawable: Drawable, timeAxis: TimeAxis1D, lanes: TimelineLaneArray, ui: TimelineUi, options: TimelineEventsPainterOptions) {
    let rowTopPadding = options.rowTopPadding;
    let rowBottomPadding = options.rowBottomPadding;
    let laneHeight = options.laneHeight;

    let topMargin = (hasval(barOpts) && hasval(barOpts.topMargin) ? barOpts.topMargin : 1.2);
    let bottomMargin = (hasval(barOpts) && hasval(barOpts.bottomMargin) ? barOpts.bottomMargin : 1.2);
    let borderThickness = (hasval(barOpts) && hasval(barOpts.borderThickness) ? barOpts.borderThickness : 2);
    let cornerType = (hasval(barOpts) && hasval(barOpts.cornerType) ? barOpts.cornerType : JointType.BEVEL);
    let defaultColor = (hasval(barOpts) && hasval(barOpts.defaultColor) ? barOpts.defaultColor : options.timelineFgColor.withAlphaTimes(0.4));
    let defaultBorderColor = (hasval(barOpts) && hasval(barOpts.defaultBorderColor) ? barOpts.defaultBorderColor : null);
    let selectedBorderColor = (hasval(barOpts) && hasval(barOpts.selectedBorderColor) ? barOpts.selectedBorderColor : options.timelineFgColor);
    let minimumVisibleWidth = (hasval(barOpts) && hasval(barOpts.minimumVisibleWidth) ? barOpts.minimumVisibleWidth : 0);
    let dashLength = (hasval(barOpts) && hasval(barOpts.dashLength) ? barOpts.dashLength : 5);
    let defaultSecondaryColor = new Color(0, 0, 0, 0);

    let selection = ui.selection;

    let dashedBorder_VERTSHADER = concatLines(
        '                                                                ',
        '  attribute vec2 a_XyFrac;                                      ',
        '  attribute vec4 a_Color;                                       ',
        '  attribute vec4 a_SecondaryColor;                              ',
        '  attribute float a_LengthSoFar;                                ',
        '                                                                ',
        '  varying vec4 v_Color;                                         ',
        '  varying vec4 v_SecondaryColor;                                ',
        '  varying float f_LengthSoFar;                                  ',
        '                                                                ',
        '  void main( ) {                                                ',
        '      gl_Position = vec4( ( -1.0 + 2.0*a_XyFrac ), 0.0, 1.0 );  ',
        '      v_Color = a_Color;                                        ',
        '      v_SecondaryColor = a_SecondaryColor;                      ',
        '      f_LengthSoFar = a_LengthSoFar;                            ',
        '  }                                                             ',
        '                                                                '
    );

    let varyingBorder_FRAGSHADER = concatLines(
        '                                                                            ',
        '  precision lowp float;                                                     ',
        '  varying vec4 v_Color;                                                     ',
        '  varying vec4 v_SecondaryColor;                                            ',
        '  varying float f_LengthSoFar;                                              ',
        '  //dashes are u_DashLength_PX pixels long                                  ',
        '  uniform float u_DashLength_PX;                                            ',
        '                                                                            ',
        '  void main( ) {                                                            ',
        '      gl_FragColor = v_Color;                                               ',
        '                                                                            ',
        '      if (f_LengthSoFar > 0.0) {                                            ',
        '         float mod = mod(f_LengthSoFar, u_DashLength_PX * 2.0);             ',
        '         float alpha = 1.0;                                                 ',
        '         if ( mod < u_DashLength_PX ) {                                     ',
        '            gl_FragColor = v_SecondaryColor;                                ',
        '         }                                                                  ',
        '         else {                                                             ',
        '            gl_FragColor = v_Color;                                         ',
        '         }                                                                  ',
        '      }                                                                     ',
        '      else {                                                                ',
        '         gl_FragColor = v_Color;                                            ',
        '      }                                                                     ',
        '  }                                                                         ',
        '                                                                            '
    );

    let program = new Program(dashedBorder_VERTSHADER, varyingBorder_FRAGSHADER);
    let a_XyFrac = new Attribute(program, 'a_XyFrac');
    let a_Color = new Attribute(program, 'a_Color');
    let a_SecondaryColor = new Attribute(program, 'a_SecondaryColor');
    let a_LengthSoFar = new Attribute(program, 'a_LengthSoFar');
    let u_DashLength_PX = new Uniform1f(program, 'u_DashLength_PX');

    let xys = new Float32Array(0);
    let xysBuffer = newDynamicBuffer();

    let rgbas = new Float32Array(0);
    let rgbasBuffer = newDynamicBuffer();

    let rgbasSecondary = new Float32Array(0);
    let rgbasSecondaryBuffer = newDynamicBuffer();

    let lengths = new Float32Array(0);
    let lengthsBuffer = newDynamicBuffer();

    return {
        paint(indexXys: number, indexRgbas: number, gl: WebGLRenderingContext, viewport: BoundsUnmodifiable, indexLengthSoFar: number) {
            if (indexXys === 0 || indexRgbas === 0) return;

            gl.blendFuncSeparate(GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA, GL.ONE, GL.ONE_MINUS_SRC_ALPHA);
            gl.enable(GL.BLEND);

            program.use(gl);
            u_DashLength_PX.setData(gl, dashLength);
            xysBuffer.setData(xys.subarray(0, indexXys));
            a_XyFrac.setDataAndEnable(gl, xysBuffer, 2, GL.FLOAT);
            rgbasBuffer.setData(rgbas.subarray(0, indexRgbas));
            a_Color.setDataAndEnable(gl, rgbasBuffer, 4, GL.FLOAT);
            rgbasSecondaryBuffer.setData(rgbasSecondary.subarray(0, indexRgbas));
            a_SecondaryColor.setDataAndEnable(gl, rgbasSecondaryBuffer, 4, GL.FLOAT);
            lengthsBuffer.setData(lengths.subarray(0, indexLengthSoFar));
            a_LengthSoFar.setDataAndEnable(gl, lengthsBuffer, 1, GL.FLOAT);

            gl.drawArrays(GL.TRIANGLES, 0, Math.floor(indexXys / 2));

            a_Color.disable(gl);
            a_SecondaryColor.disable(gl);
            a_XyFrac.disable(gl);
            a_LengthSoFar.disable(gl);
            program.endUse(gl);
        },
        ensureCapacity: function (eventCount: number) {
            let numVertices;
            switch (cornerType) {
                case JointType.BEVEL:
                    numVertices = (6 * (4 /*quads*/) + 3 * (4 /*triangles*/)) * eventCount;
                    break;

                default:
                    numVertices = (6 * (4 /*quads*/)) * eventCount;
                    break;
            }

            xys = ensureCapacityFloat32(xys, 2 * numVertices);
            rgbas = ensureCapacityFloat32(rgbas, 4 * numVertices);
            rgbasSecondary = ensureCapacityFloat32(rgbasSecondary, 4 * numVertices);
            lengths = ensureCapacityFloat32(lengths, numVertices);
        },
        fillEvent: function (laneIndex: number, eventIndex: number, indexXys: number, indexRgbas: number, viewport: BoundsUnmodifiable, indexLengthSoFar: number): { indexXys: number; indexRgbas: number; indexLengthSoFar: number } {
            let lane: TimelineLane = lanes.lane(laneIndex);
            let event: TimelineEventModel = lane.event(eventIndex);

            let wBorder = borderThickness / viewport.w;
            let hBorder = borderThickness / viewport.h;

            let _topMargin = hasval(event.topMargin) ? event.topMargin : topMargin;
            let _bottomMargin = hasval(event.bottomMargin) ? event.bottomMargin : bottomMargin;

            let jTop = rowTopPadding + (laneIndex) * laneHeight + _topMargin;
            let yTop = (viewport.h - jTop) / viewport.h;
            let jBottom = rowTopPadding + (laneIndex + 1) * laneHeight - _bottomMargin;
            let yBottom = (viewport.h - jBottom) / viewport.h;

            let xLeft = timeAxis.tFrac(event.start_PMILLIS);
            let xRight = timeAxis.tFrac(event.end_PMILLIS);

            let widthPixels = viewport.w * (xRight - xLeft);
            let heightPixels = jBottom - jTop;  // confirmed jBottom > jTop

            let setLengthsVertical = function (bottomEdge: number, topEdge: number) {
                lengths[indexLengthSoFar++] = topEdge;
                lengths[indexLengthSoFar++] = topEdge;
                lengths[indexLengthSoFar++] = bottomEdge;
                lengths[indexLengthSoFar++] = bottomEdge;
                lengths[indexLengthSoFar++] = topEdge;
                lengths[indexLengthSoFar++] = bottomEdge;

                // for convenience, return the length of the edge
                return Math.abs(bottomEdge - topEdge);
            };

            let setLengthsHorizontal = function (leftEdge: number, rightEdge: number) {
                lengths[indexLengthSoFar++] = leftEdge;
                lengths[indexLengthSoFar++] = rightEdge;
                lengths[indexLengthSoFar++] = leftEdge;
                lengths[indexLengthSoFar++] = leftEdge;
                lengths[indexLengthSoFar++] = rightEdge;
                lengths[indexLengthSoFar++] = rightEdge;

                // for convenience, return the length of the edge
                return Math.abs(leftEdge - rightEdge);
            };

            let setLengthsTriangle = function (length: number) {
                lengths[indexLengthSoFar++] = length;
                lengths[indexLengthSoFar++] = length;
                lengths[indexLengthSoFar++] = length;
            }

            if (!(xRight < 0 || xLeft > 1) && widthPixels > minimumVisibleWidth) {

                // Border
                let borderColor = (event.borderColor || event.bgColor || defaultBorderColor);
                let borderSecondaryColor = (event.borderSecondaryColor || defaultSecondaryColor);
                if (selection.selectedEvents.hasValue(event)) {
                    borderColor = selectedBorderColor;
                }
                if (borderColor) {
                    let startIndex = 0;
                    switch (cornerType) {
                        case JointType.BEVEL:
                            // Quads

                            // top edge
                            indexXys = putQuadXys(xys, indexXys, xLeft + wBorder, xRight - wBorder, yTop, yTop - hBorder);
                            indexXys = putUpperRightTriangleXys(xys, indexXys, xLeft, xLeft + wBorder, yBottom + hBorder, yBottom);
                            // right edge
                            indexXys = putQuadXys(xys, indexXys, xRight - wBorder, xRight, yTop - hBorder, yBottom + hBorder);
                            indexXys = putLowerRightTriangleXys(xys, indexXys, xLeft, xLeft + wBorder, yTop, yTop - hBorder);
                            // bottom edge
                            indexXys = putQuadXys(xys, indexXys, xLeft + wBorder, xRight - wBorder, yBottom + hBorder, yBottom);
                            indexXys = putLowerLeftTriangleXys(xys, indexXys, xRight - wBorder, xRight, yTop, yTop - hBorder);
                            // left edge
                            indexXys = putQuadXys(xys, indexXys, xLeft, xLeft + wBorder, yTop - hBorder, yBottom + hBorder);
                            indexXys = putUpperLeftTriangleXys(xys, indexXys, xRight - wBorder, xRight, yBottom + hBorder, yBottom);

                            // Colors
                            startIndex = indexRgbas;
                            putRgbas(rgbas, startIndex, borderColor, 24);
                            indexRgbas = putRgbas(rgbasSecondary, startIndex, borderSecondaryColor, 24);

                            // Colors
                            startIndex = indexRgbas;
                            putRgbas(rgbas, startIndex, borderColor, 12);
                            indexRgbas = putRgbas(rgbasSecondary, startIndex, borderSecondaryColor, 12);

                            // Stipple
                            if (!event.isBorderDashed) {
                                setLengthsHorizontal(-1, -1);
                                setLengthsTriangle(-1);
                                setLengthsVertical(-1, -1);
                                setLengthsTriangle(-1);
                                setLengthsHorizontal(-1, -1);
                                setLengthsTriangle(-1);
                                setLengthsVertical(-1, -1);
                                setLengthsTriangle(-1);
                            }
                            else {
                                let cumulativeLength = 0;
                                // top edge
                                cumulativeLength += setLengthsHorizontal(cumulativeLength, cumulativeLength + widthPixels);
                                setLengthsTriangle(cumulativeLength);
                                // right edge
                                cumulativeLength += setLengthsVertical(cumulativeLength + heightPixels, cumulativeLength);
                                setLengthsTriangle(cumulativeLength);
                                // bottom edge
                                cumulativeLength += setLengthsHorizontal(cumulativeLength, cumulativeLength + widthPixels);
                                setLengthsTriangle(cumulativeLength);
                                // left edge
                                cumulativeLength += setLengthsVertical(cumulativeLength + heightPixels, cumulativeLength);
                                setLengthsTriangle(cumulativeLength);
                            }

                            break;

                        default:

                            // top edge
                            indexXys = putQuadXys(xys, indexXys, xLeft, xRight - wBorder, yTop, yTop - hBorder);
                            // right edge
                            indexXys = putQuadXys(xys, indexXys, xRight - wBorder, xRight, yTop, yBottom + hBorder);
                            // bottom edge
                            indexXys = putQuadXys(xys, indexXys, xLeft + wBorder, xRight, yBottom + hBorder, yBottom);
                            // left edge
                            indexXys = putQuadXys(xys, indexXys, xLeft, xLeft + wBorder, yTop - hBorder, yBottom);
                            // color
                            startIndex = indexRgbas;
                            putRgbas(rgbas, startIndex, borderColor, 24);
                            indexRgbas = putRgbas(rgbasSecondary, startIndex, borderSecondaryColor, 24);

                            // Stipple
                            if (!event.isBorderDashed) {
                                setLengthsHorizontal(-1, -1);
                                setLengthsVertical(-1, -1);
                                setLengthsHorizontal(-1, -1);
                                setLengthsVertical(-1, -1);
                            }
                            else {
                                let cumulativeLength = 0;
                                // top edge
                                cumulativeLength += setLengthsHorizontal(cumulativeLength, cumulativeLength + widthPixels);
                                // right edge
                                cumulativeLength += setLengthsVertical(cumulativeLength + heightPixels, cumulativeLength);
                                // bottom edge
                                cumulativeLength += setLengthsHorizontal(cumulativeLength, cumulativeLength + widthPixels);
                                // left edge
                                cumulativeLength += setLengthsVertical(cumulativeLength + heightPixels, cumulativeLength);
                            }

                            break;
                    }
                }
            }

            return { indexXys: indexXys, indexRgbas: indexRgbas, indexLengthSoFar: indexLengthSoFar };
        }
    };
}

export function newEventStripedBarsPainterFactory(barOpts?: TimelineEventBarsPainterOptions): TimelineEventsPainterFactory {

    // Painter Factory
    return function (drawable: Drawable, timeAxis: TimeAxis1D, lanes: TimelineLaneArray, ui: TimelineUi, options: TimelineEventsPainterOptions): Painter {

        let helper = eventStripedBarPainterHelper(barOpts, drawable, timeAxis, lanes, ui, options);

        // Painter
        return function (gl: WebGLRenderingContext, viewport: BoundsUnmodifiable) {
            helper.ensureCapacity(lanes.numEvents);

            let indexXys = 0;
            let indexRgbas = 0;
            let indexRelativeXys = 0;
            let indexFillPattern = 0;

            for (let l = 0; l < lanes.length; l++) {
                let lane = lanes.lane(l);
                for (let e = 0; e < lane.length; e++) {
                    let event = lane.event(e);
                    let indexes = helper.fillEvent(l, e, indexXys, indexRgbas, viewport, indexRelativeXys, indexFillPattern);
                    indexXys = indexes.indexXys;
                    indexRgbas = indexes.indexRgbas;
                    indexRelativeXys = indexes.indexRelativeXys;
                    indexFillPattern = indexes.indexFillPattern;
                }
            }

            helper.paint(indexXys, indexRgbas, gl, viewport, indexRelativeXys, indexFillPattern);
        };
    };
}

export function newEventDashedBordersPainterFactory(barOpts?: TimelineEventBarsPainterOptions): TimelineEventsPainterFactory {

    // Painter Factory
    return function (drawable: Drawable, timeAxis: TimeAxis1D, lanes: TimelineLaneArray, ui: TimelineUi, options: TimelineEventsPainterOptions): Painter {

        let helper = eventDashedBorderPainterHelper(barOpts, drawable, timeAxis, lanes, ui, options);

        // Painter
        return function (gl: WebGLRenderingContext, viewport: BoundsUnmodifiable) {
            helper.ensureCapacity(lanes.numEvents);

            let indexXys = 0;
            let indexRgbas = 0;
            let indexLengthSoFar = 0;

            for (let l = 0; l < lanes.length; l++) {
                let lane = lanes.lane(l);
                for (let e = 0; e < lane.length; e++) {
                    let event = lane.event(e);
                    let indexes = helper.fillEvent(l, e, indexXys, indexRgbas, viewport, indexLengthSoFar);
                    indexXys = indexes.indexXys;
                    indexRgbas = indexes.indexRgbas;
                    indexLengthSoFar = indexes.indexLengthSoFar;
                }
            }

            helper.paint(indexXys, indexRgbas, gl, viewport, indexLengthSoFar);
        };
    };
}


export interface TimelineEventIconsPainterOptions {
    topMargin?: number;
    bottomMargin?: number;
    vAlign?: number;
}


function eventIconsPainterHelper(iconOpts: TimelineEventIconsPainterOptions, drawable: Drawable, timeAxis: TimeAxis1D, lanes: TimelineLaneArray, ui: TimelineUi, options: TimelineEventsPainterOptions) {

    let rowTopPadding = options.rowTopPadding;
    let rowBottomPadding = options.rowBottomPadding;
    let laneHeight = options.laneHeight;

    let topMargin = (hasval(iconOpts) && hasval(iconOpts.topMargin) ? iconOpts.topMargin : 1.2);
    let bottomMargin = (hasval(iconOpts) && hasval(iconOpts.bottomMargin) ? iconOpts.bottomMargin : 1.2);
    let vAlign = (hasval(iconOpts) && hasval(iconOpts.vAlign) ? iconOpts.vAlign : 0.5);

    let textureRenderer = new TextureRenderer();

    return {
        textureRenderer: textureRenderer,
        paintEvent: function (laneIndex: number, eventIndex: number, gl: WebGLRenderingContext, viewport: BoundsUnmodifiable) {
            let lane: TimelineLane = lanes.lane(laneIndex);
            let event: TimelineEventModel = lane.event(eventIndex);
            let eventStyle = ui.eventStyle(event.styleGuid);

            let jTop = rowTopPadding + (laneIndex) * laneHeight + topMargin;
            let yFrac = (viewport.h - jTop - (1.0 - vAlign) * (laneHeight - topMargin - bottomMargin)) / viewport.h;

            for (let n = 0; n < eventStyle.numIcons; n++) {
                let icon = eventStyle.icon(n);
                let iconTime_PMILLIS = event.start_PMILLIS + icon.hPos * (event.end_PMILLIS - event.start_PMILLIS);
                let xFrac = timeAxis.tFrac(iconTime_PMILLIS);
                let w = icon.displayWidth / viewport.w;
                if (-w <= xFrac && xFrac <= 1 + w) {
                    let iconTexture = ui.loadImage(icon.url, function () { drawable.redraw(); });
                    if (iconTexture) {
                        textureRenderer.draw(gl, iconTexture, xFrac, yFrac, { xAnchor: icon.hAlign, yAnchor: vAlign, width: icon.displayWidth, height: icon.displayHeight });
                    }
                }
            }
        }
    };
}

export function newEventIconsPainterFactory(iconOpts?: TimelineEventIconsPainterOptions): TimelineEventsPainterFactory {

    // Painter Factory
    return function (drawable: Drawable, timeAxis: TimeAxis1D, lanes: TimelineLaneArray, ui: TimelineUi, options: TimelineEventsPainterOptions): Painter {

        let helper = eventIconsPainterHelper(iconOpts, drawable, timeAxis, lanes, ui, options);

        // Painter
        return function (gl: WebGLRenderingContext, viewport: BoundsUnmodifiable) {
            gl.blendFuncSeparate(GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA, GL.ONE, GL.ONE_MINUS_SRC_ALPHA);
            gl.enable(GL.BLEND);

            helper.textureRenderer.begin(gl, viewport);
            for (let l = 0; l < lanes.length; l++) {
                let lane = lanes.lane(l);
                for (let e = 0; e < lane.length; e++) {
                    helper.paintEvent(l, e, gl, viewport);
                }
            }
            helper.textureRenderer.end(gl);
        };
    };
}



export interface TimelineEventLabelOptions {
    topMargin?: number;
    bottomMargin?: number;
    leftMargin?: number;
    rightMargin?: number;
    vAlign?: number;
    spacing?: number;
    extendBeyondBar?: boolean;

    // Options:
    // 'force'        always show text regardless of available space
    // 'truncate'     truncate text with '...' when space is insufficient
    // 'show'         show text if space exits, hide all the text if it cannot be displayed in its entirity
    textMode?: string;

    iconsEnabled?: boolean;
    // Can be a number, or 'imageSize', or 'auto'
    iconsForceWidth?: any;
    // Can be a number, or 'imageSize', or 'auto'
    iconsForceHeight?: any;
    iconsSizeFactor?: number;

    textEnabled?: boolean;
    textDefaultColor?: Color;
    textFont?: string;
}

function calculateTextWidth(textEnabled: boolean, labelText: string, fgColor: Color, textDefaultColor: Color,
    textTextures: TwoKeyCache<TextTexture2D>, viewport: BoundsUnmodifiable) {
    let wText = 0;
    let textTexture;
    if (textEnabled && labelText) {
        let textColor = hasval(fgColor) ? fgColor : textDefaultColor;
        textTexture = textTextures.value(textColor.rgbaString, labelText);
        wText = textTexture.w / viewport.w;
    }
    return {
        wText: wText,
        textTexture: textTexture
    };
}

function eventLabelsPainterHelper(labelOpts: TimelineEventLabelOptions, drawable: Drawable, timeAxis: TimeAxis1D, lanes: TimelineLaneArray, ui: TimelineUi, options: TimelineEventsPainterOptions) {
    let rowTopPadding = options.rowTopPadding;
    let rowBottomPadding = options.rowBottomPadding;
    let laneHeight = options.laneHeight;

    let topMargin = (hasval(labelOpts) && hasval(labelOpts.topMargin) ? labelOpts.topMargin : 1.2);
    let bottomMargin = (hasval(labelOpts) && hasval(labelOpts.bottomMargin) ? labelOpts.bottomMargin : 1.2);
    let leftMargin = (hasval(labelOpts) && hasval(labelOpts.leftMargin) ? labelOpts.leftMargin : 4);
    let rightMargin = (hasval(labelOpts) && hasval(labelOpts.rightMargin) ? labelOpts.rightMargin : 4);
    let vAlign = (hasval(labelOpts) && hasval(labelOpts.vAlign) ? labelOpts.vAlign : 0.5);
    let spacing = (hasval(labelOpts) && hasval(labelOpts.spacing) ? labelOpts.spacing : 3);
    let extendBeyondBar = (hasval(labelOpts) && hasval(labelOpts.extendBeyondBar) ? labelOpts.extendBeyondBar : false);
    let textMode = (hasval(labelOpts) && hasval(labelOpts.textMode) ? labelOpts.textMode : 'force');

    // Icon options
    let iconsEnabled = (hasval(labelOpts) && hasval(labelOpts.iconsEnabled) ? labelOpts.iconsEnabled : true);
    let iconsForceWidth = (hasval(labelOpts) && hasval(labelOpts.iconsForceWidth) ? labelOpts.iconsForceWidth : 'auto');
    let iconsForceHeight = (hasval(labelOpts) && hasval(labelOpts.iconsForceHeight) ? labelOpts.iconsForceHeight : 'auto');
    let iconsSizeFactor = (hasval(labelOpts) && hasval(labelOpts.iconsSizeFactor) ? labelOpts.iconsSizeFactor : 1);

    // Text options
    let textEnabled = (hasval(labelOpts) && hasval(labelOpts.textEnabled) ? labelOpts.textEnabled : true);
    let textDefaultColor = (hasval(labelOpts) && hasval(labelOpts.textDefaultColor) ? labelOpts.textDefaultColor : options.timelineFgColor);
    let textFont = (hasval(labelOpts) && hasval(labelOpts.textFont) ? labelOpts.textFont : options.timelineFont);

    // XXX: Old icon textures never get cleaned out
    let iconTextures: StringMap<Texture2D> = {};
    let textTextures = newTextTextureCache2(textFont);
    let textureRenderer = new TextureRenderer();

    return {
        textTextures: textTextures,
        textureRenderer: textureRenderer,
        paintEvent: function (laneIndex: number, eventIndex: number, gl: WebGLRenderingContext, viewport: BoundsUnmodifiable) {

            let lane: TimelineLane = lanes.lane(laneIndex);
            let event: TimelineEventModel = lane.event(eventIndex);

            let labelTopMargin = hasval(event.labelTopMargin) ? event.labelTopMargin : topMargin;
            let labelBottomMargin = hasval(event.labelBottomMargin) ? event.labelBottomMargin : bottomMargin;

            let labelVAlign = hasval(event.labelVAlign) ? event.labelVAlign : vAlign;
            let labelVPos = hasval(event.labelVPos) ? event.labelVPos : labelVAlign;

            let labelHAlign = hasval(event.labelHAlign) ? event.labelHAlign : 0;
            let labelHPos = hasval(event.labelHPos) ? event.labelHPos : labelHAlign;

            let jTop = rowTopPadding + (laneIndex) * laneHeight + labelTopMargin;
            let yFrac = (viewport.h - jTop - (1.0 - labelVAlign) * (laneHeight - labelTopMargin - labelBottomMargin)) / viewport.h;

            let xLeftMin = 2 / viewport.w;
            let xRightMax = (viewport.w - 2) / viewport.w;
            let wLeftIndent = leftMargin / viewport.w;
            let wRightIndent = rightMargin / viewport.w;

            let xStart = timeAxis.tFrac(event.start_PMILLIS);
            let xEnd = timeAxis.tFrac(event.end_PMILLIS);

            let wTotal = (xEnd - wRightIndent) - (xStart + wLeftIndent)
            let wSpacing = (spacing / viewport.w);

            if (!(xEnd <= 0 || xStart > 1)) {

                let xLeft;
                let xRight;
                if (extendBeyondBar) {
                    if (eventIndex + 1 < lane.length) {
                        let nextEvent = lane.event(eventIndex + 1);
                        let nextStart_PMILLIS = effectiveEdges_PMILLIS(ui, nextEvent)[0];
                        xRight = timeAxis.tFrac(nextStart_PMILLIS);
                    }
                    else {
                        xRight = xRightMax;
                    }

                    if (eventIndex - 1 >= 0) {
                        let previousEvent = lane.event(eventIndex - 1);
                        let previousEnd_PMILLIS = effectiveEdges_PMILLIS(ui, previousEvent)[1];
                        xLeft = timeAxis.tFrac(previousEnd_PMILLIS);
                    }
                    else {
                        xLeft = xLeftMin;
                    }
                }
                else {
                    xRight = xEnd;
                    xLeft = xStart;
                }

                // calculate Text width
                let calculatedTextWidth = calculateTextWidth(textEnabled, event.label, event.fgColor, textDefaultColor, textTextures, viewport);
                let wText = calculatedTextWidth.wText;
                let textTexture = calculatedTextWidth.textTexture;

                // calculate Icon width (and start load if necessary)
                let wIcon = 0;
                let wIconPlusSpacing = 0;
                let iconWidth;
                let iconHeight;
                let iconTexture;
                if (iconsEnabled && event.labelIcon) {
                    iconTexture = iconTextures[event.labelIcon];
                    if (hasval(iconTexture)) {
                        iconWidth = (isNumber(iconsForceWidth) ? iconsForceWidth : (iconsForceWidth === 'imageSize' ? iconTexture.w : null));
                        iconHeight = (isNumber(iconsForceHeight) ? iconsForceHeight : (iconsForceHeight === 'imageSize' ? iconTexture.h : null));

                        let wIconKnown = hasval(iconWidth);
                        let hIconKnown = hasval(iconHeight);
                        if (!wIconKnown && !hIconKnown) {
                            iconHeight = Math.round(iconsSizeFactor * (laneHeight - labelTopMargin - labelBottomMargin));
                            iconWidth = iconTexture.w * iconHeight / iconTexture.h;
                        }
                        else if (!wIconKnown) {
                            iconHeight = Math.round(iconsSizeFactor * iconHeight);
                            iconWidth = iconTexture.w * iconHeight / iconTexture.h;
                        }
                        else if (!hIconKnown) {
                            iconWidth = Math.round(iconsSizeFactor * iconWidth);
                            iconHeight = iconTexture.h * iconWidth / iconTexture.w;
                        }
                        else {
                            iconWidth = Math.round(iconsSizeFactor * iconWidth);
                            iconHeight = Math.round(iconsSizeFactor * iconHeight);
                        }

                        wIcon = (iconWidth / viewport.w);

                        wIconPlusSpacing = wIcon + wSpacing;
                    }
                    // A null in the map means a fetch has already been initiated
                    // ... either it is still in progress, or it has already failed
                    else if (iconTexture !== null) {
                        iconTextures[event.labelIcon] = null;

                        let image = new Image();
                        image.onload = (function (url, img) {
                            return function () {
                                let wImage = img.naturalWidth;
                                let hImage = img.naturalHeight;
                                iconTextures[url] = new Texture2D(wImage, hImage, GL.LINEAR, GL.LINEAR, function (g) {
                                    g.drawImage(img, 0, 0);
                                });
                                drawable.redraw();
                            };
                        })(event.labelIcon, image);
                        image.src = event.labelIcon;
                    }
                }

                // NOTE: With extendBeyondBar=true, we detect when there is insufficient space between the current event
                //       and those to either side to display the text + icon. However, if one event has right aligned text
                //       and the other has left aligned text, so both text labels overlap into the same space between the
                //       events, we don't currently try to detect that.

                // Determine whether there is enough space to display both text and icon, or only icon, or neither

                // coordinates of the start edge of the icon + label
                let xStartLabel = xStart + wLeftIndent - (wSpacing + wIcon + wText) * labelHPos + (wTotal) * labelHAlign;
                // coordinates of the end edge of the icon + label
                let xEndLabel = xStartLabel + (wSpacing + wIcon + wText);

                // adjust xStartLabel and xEndLabel if they fall off the screen
                if (xStartLabel < xLeftMin) {
                    xStartLabel = xLeftMin;
                    xEndLabel = xStartLabel + (wSpacing + wIcon + wText);
                }
                else if (xEndLabel > xRightMax) {
                    xEndLabel = xRightMax;
                    xStartLabel = xEndLabel - (wSpacing + wIcon + wText);
                }

                if (textMode === 'truncate') {
                    let labelText = event.label;
                    while (!!labelText && labelText !== "...") {
                        if (xEndLabel > xRight || xStartLabel < xLeft) {
                            // there is not enough room for the text, begin truncating the text
                            labelText = labelText.substring(0, labelText.length - 4).concat("...");
                            let calculatedTextWidth = calculateTextWidth(textEnabled, labelText, event.fgColor, textDefaultColor, textTextures, viewport);
                            wText = calculatedTextWidth.wText;
                            textTexture = calculatedTextWidth.textTexture;

                            xStartLabel = xStart + wLeftIndent - (wSpacing + wIcon + wText) * labelHPos + wTotal * labelHAlign;
                            // coordinates of the end edge of the icon + label
                            xEndLabel = xStartLabel + (wSpacing + wIcon + wText);
                            // adjust xStartLabel and xEndLabel if they fall off the screen
                            if (xStartLabel < xLeftMin) {
                                xStartLabel = xLeftMin;
                                xEndLabel = xStartLabel + (wSpacing + wIcon + wText);
                            } else if (xEndLabel > xRightMax) {
                                xEndLabel = xRightMax;
                                xStartLabel = xEndLabel - (wSpacing + wIcon + wText);
                            }
                        } else {
                            break;
                        }
                    }
                    if (!labelText || labelText === "...") {
                        wText = 0;
                        textTexture = null;
                    }
                } else if (textMode === 'show') {
                    if (xEndLabel > xRight || xStartLabel < xLeft) {
                        // there is not enough room for the text, try with just the icon
                        wText = 0;
                        textTexture = null;

                        // coordinates of the start edge of the icon + label
                        let xStartLabel = xStart + wLeftIndent - (wIcon) * labelHPos + (wTotal) * labelHAlign;
                        // coordinates of the end edge of the icon + label
                        let xEndLabel = xStartLabel + (wIcon);

                        // adjust xStartLabel and xEndLabel if they fall off the screen
                        if (xStartLabel < xLeftMin) {
                            xStartLabel = xLeftMin;
                            xEndLabel = xStartLabel + (wIcon);
                        }
                        else if (xEndLabel > xRightMax) {
                            xEndLabel = xRightMax;
                            xStartLabel = xEndLabel - (wIcon);
                        }

                        // if there is still not enough room, don't show anything
                        if (xEndLabel > xRight || xStartLabel < xLeft) {
                            wIcon = 0;
                            iconTexture = null;
                        }
                    }
                }

                // Icons
                if (hasval(iconTexture)) {
                    // coordinates of the start edge of the icon + label
                    let xStartLabel = xStart + wLeftIndent - (wSpacing + wIcon + wText) * labelHPos + (wTotal) * labelHAlign;

                    // coordinates of the end edge of the icon + label
                    let xEndLabel = xStartLabel + (wSpacing + wIcon + wText);

                    if (xStartLabel < xLeftMin) {
                        textureRenderer.draw(gl, iconTexture, xLeftMin, yFrac, { xAnchor: 0, yAnchor: labelVPos, width: iconWidth, height: iconHeight });
                    }
                    else if (xEndLabel > xRightMax) {
                        textureRenderer.draw(gl, iconTexture, xRightMax - wSpacing - wText, yFrac, { xAnchor: 1, yAnchor: labelVPos, width: iconWidth, height: iconHeight });
                    }
                    else {
                        let xFrac = xStart + wLeftIndent - (wSpacing + wText) * labelHPos + (wTotal) * labelHAlign;
                        textureRenderer.draw(gl, iconTexture, xFrac, yFrac, { xAnchor: labelHPos, yAnchor: labelVPos, width: iconWidth, height: iconHeight });
                    }
                }

                // Text
                if (hasval(textTexture)) {
                    // coordinates of the start edge of the icon + label
                    let xStartLabel = xStart + wLeftIndent - (wSpacing + wIcon + wText) * labelHPos + (wTotal) * labelHAlign;

                    // coordinates of the end edge of the icon + label
                    let xEndLabel = xStartLabel + (wSpacing + wIcon + wText);

                    if (xStartLabel < xLeftMin) {
                        textureRenderer.draw(gl, textTexture, xLeftMin + wSpacing + wIcon, yFrac, { xAnchor: 0, yAnchor: textTexture.yAnchor(labelVPos) });
                    }
                    else if (xEndLabel > xRightMax) {
                        textureRenderer.draw(gl, textTexture, xRightMax, yFrac, { xAnchor: 1, yAnchor: textTexture.yAnchor(labelVPos) });
                    }
                    else {
                        let xFrac = xStart + wLeftIndent + (wIconPlusSpacing) * (1 - labelHPos) + (wTotal) * labelHAlign;
                        textureRenderer.draw(gl, textTexture, xFrac, yFrac, { xAnchor: labelHPos, yAnchor: textTexture.yAnchor(labelVPos) });
                    }
                }
            }
        }
    };
}

export function newEventLabelsPainterFactory(labelOpts?: TimelineEventLabelOptions): TimelineEventsPainterFactory {

    // Painter Factory
    return function (drawable: Drawable, timeAxis: TimeAxis1D, lanes: TimelineLaneArray, ui: TimelineUi, options: TimelineEventsPainterOptions): Painter {

        let helper = eventLabelsPainterHelper(labelOpts, drawable, timeAxis, lanes, ui, options);

        // Painter
        return function (gl: WebGLRenderingContext, viewport: BoundsUnmodifiable) {
            gl.blendFuncSeparate(GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA, GL.ONE, GL.ONE_MINUS_SRC_ALPHA);
            gl.enable(GL.BLEND);

            helper.textTextures.resetTouches();
            helper.textureRenderer.begin(gl, viewport);
            for (let l = 0; l < lanes.length; l++) {
                let lane: TimelineLane = lanes.lane(l);
                for (let e = 0; e < lane.length; e++) {
                    helper.paintEvent(l, e, gl, viewport);
                }
            }
            helper.textureRenderer.end(gl);
            helper.textTextures.retainTouched();
        };
    };
}


function eventBarPainterHelper(barOpts: TimelineEventBarsPainterOptions, drawable: Drawable, timeAxis: TimeAxis1D, lanes: TimelineLaneArray, ui: TimelineUi, options: TimelineEventsPainterOptions) {
    let rowTopPadding = options.rowTopPadding;
    let rowBottomPadding = options.rowBottomPadding;
    let laneHeight = options.laneHeight;

    let topMargin = (hasval(barOpts) && hasval(barOpts.topMargin) ? barOpts.topMargin : 1.2);
    let bottomMargin = (hasval(barOpts) && hasval(barOpts.bottomMargin) ? barOpts.bottomMargin : 1.2);
    let borderThickness = (hasval(barOpts) && hasval(barOpts.borderThickness) ? barOpts.borderThickness : 2);
    let cornerType = (hasval(barOpts) && hasval(barOpts.cornerType) ? barOpts.cornerType : JointType.BEVEL);
    let defaultColor = (hasval(barOpts) && hasval(barOpts.defaultColor) ? barOpts.defaultColor : options.timelineFgColor.withAlphaTimes(0.4));
    let defaultBorderColor = (hasval(barOpts) && hasval(barOpts.defaultBorderColor) ? barOpts.defaultBorderColor : null);
    let selectedBorderColor = (hasval(barOpts) && hasval(barOpts.selectedBorderColor) ? barOpts.selectedBorderColor : options.timelineFgColor);
    let minimumVisibleWidth = (hasval(barOpts) && hasval(barOpts.minimumVisibleWidth) ? barOpts.minimumVisibleWidth : 0);

    let selection = ui.selection;

    let xyFrac_vColor_VERTSHADER = concatLines(
        '                                                                ',
        '  attribute vec2 a_XyFrac;                                      ',
        '  attribute vec4 a_Color;                                       ',
        '                                                                ',
        '  varying vec4 v_Color;                                         ',
        '                                                                ',
        '  void main( ) {                                                ',
        '      gl_Position = vec4( ( -1.0 + 2.0*a_XyFrac ), 0.0, 1.0 );  ',
        '      v_Color = a_Color;                                        ',
        '  }                                                             ',
        '                                                                '
    );

    let program = new Program(xyFrac_vColor_VERTSHADER, varyingColor_FRAGSHADER);
    let a_XyFrac = new Attribute(program, 'a_XyFrac');
    let a_Color = new Attribute(program, 'a_Color');

    let xys = new Float32Array(0);
    let xysBuffer = newDynamicBuffer();

    let rgbas = new Float32Array(0);
    let rgbasBuffer = newDynamicBuffer();

    return {
        paint(indexXys: number, indexRgbas: number, gl: WebGLRenderingContext, viewport: BoundsUnmodifiable) {
            if (indexXys === 0 || indexRgbas === 0) return;

            gl.blendFuncSeparate(GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA, GL.ONE, GL.ONE_MINUS_SRC_ALPHA);
            gl.enable(GL.BLEND);

            program.use(gl);
            xysBuffer.setData(xys.subarray(0, indexXys));
            a_XyFrac.setDataAndEnable(gl, xysBuffer, 2, GL.FLOAT);
            rgbasBuffer.setData(rgbas.subarray(0, indexRgbas));
            a_Color.setDataAndEnable(gl, rgbasBuffer, 4, GL.FLOAT);

            gl.drawArrays(GL.TRIANGLES, 0, Math.floor(indexXys / 2));

            a_Color.disable(gl);
            a_XyFrac.disable(gl);
            program.endUse(gl);
        },
        ensureCapacity: function (eventCount: number) {
            let numVertices;
            switch (cornerType) {
                case JointType.BEVEL:
                    numVertices = (6 * (5 /*quads*/) + 3 * (4 /*triangles*/)) * eventCount;
                    break;

                default:
                    numVertices = (6 * (5 /*quads*/)) * eventCount;
                    break;
            }

            xys = ensureCapacityFloat32(xys, 2 * numVertices);
            rgbas = ensureCapacityFloat32(rgbas, 4 * numVertices);
        },
        fillEvent: function (laneIndex: number, eventIndex: number, indexXys: number, indexRgbas: number, viewport: BoundsUnmodifiable): { indexXys: number; indexRgbas: number } {
            let lane: TimelineLane = lanes.lane(laneIndex);
            let event: TimelineEventModel = lane.event(eventIndex);

            let wBorder = borderThickness / viewport.w;
            let hBorder = borderThickness / viewport.h;

            let _topMargin = hasval(event.topMargin) ? event.topMargin : topMargin;
            let _bottomMargin = hasval(event.bottomMargin) ? event.bottomMargin : bottomMargin;

            let jTop = rowTopPadding + (laneIndex) * laneHeight + _topMargin;
            let yTop = (viewport.h - jTop) / viewport.h;
            let jBottom = rowTopPadding + (laneIndex + 1) * laneHeight - _bottomMargin;
            let yBottom = (viewport.h - jBottom) / viewport.h;

            let xLeft = timeAxis.tFrac(event.start_PMILLIS);
            let xRight = timeAxis.tFrac(event.end_PMILLIS);

            let xWidthPixels = viewport.w * (xRight - xLeft);

            if (!(xRight < 0 || xLeft > 1) && xWidthPixels > minimumVisibleWidth) {

                // Fill
                let fillColor = (event.bgColor || defaultColor);
                if (event === selection.hoveredEvent.value) {
                    fillColor = darker(fillColor, 0.8);
                }
                indexXys = putQuadXys(xys, indexXys, xLeft + wBorder, xRight - wBorder, yTop - hBorder, yBottom + hBorder);
                indexRgbas = putQuadRgbas(rgbas, indexRgbas, fillColor);

                // Border
                let borderColor = (event.borderColor || (event.bgColor ? fillColor : null) || defaultBorderColor || fillColor);
                if (selection.selectedEvents.hasValue(event)) {
                    borderColor = selectedBorderColor;
                }
                if (borderColor) {
                    switch (cornerType) {
                        case JointType.BEVEL:
                            // Quads
                            indexXys = putQuadXys(xys, indexXys, xLeft, xLeft + wBorder, yTop - hBorder, yBottom + hBorder);
                            indexXys = putQuadXys(xys, indexXys, xRight - wBorder, xRight, yTop - hBorder, yBottom + hBorder);
                            indexXys = putQuadXys(xys, indexXys, xLeft + wBorder, xRight - wBorder, yTop, yTop - hBorder);
                            indexXys = putQuadXys(xys, indexXys, xLeft + wBorder, xRight - wBorder, yBottom + hBorder, yBottom);
                            indexRgbas = putRgbas(rgbas, indexRgbas, borderColor, 24);
                            // Triangles
                            indexXys = putLowerLeftTriangleXys(xys, indexXys, xRight - wBorder, xRight, yTop, yTop - hBorder);
                            indexXys = putUpperLeftTriangleXys(xys, indexXys, xRight - wBorder, xRight, yBottom + hBorder, yBottom);
                            indexXys = putUpperRightTriangleXys(xys, indexXys, xLeft, xLeft + wBorder, yBottom + hBorder, yBottom);
                            indexXys = putLowerRightTriangleXys(xys, indexXys, xLeft, xLeft + wBorder, yTop, yTop - hBorder);
                            indexRgbas = putRgbas(rgbas, indexRgbas, borderColor, 12);
                            break;

                        default:
                            indexXys = putQuadXys(xys, indexXys, xLeft, xRight - wBorder, yTop, yTop - hBorder);
                            indexXys = putQuadXys(xys, indexXys, xRight - wBorder, xRight, yTop, yBottom + hBorder);
                            indexXys = putQuadXys(xys, indexXys, xLeft + wBorder, xRight, yBottom + hBorder, yBottom);
                            indexXys = putQuadXys(xys, indexXys, xLeft, xLeft + wBorder, yTop - hBorder, yBottom);
                            indexRgbas = putRgbas(rgbas, indexRgbas, borderColor, 24);
                            break;
                    }
                }
            }

            return { indexXys: indexXys, indexRgbas: indexRgbas };
        }
    };
}


export function newEventBarsPainterFactory(barOpts?: TimelineEventBarsPainterOptions): TimelineEventsPainterFactory {

    // Painter Factory
    return function (drawable: Drawable, timeAxis: TimeAxis1D, lanes: TimelineLaneArray, ui: TimelineUi, options: TimelineEventsPainterOptions): Painter {

        let helper = eventBarPainterHelper(barOpts, drawable, timeAxis, lanes, ui, options);

        // Painter
        return function (gl: WebGLRenderingContext, viewport: BoundsUnmodifiable) {
            helper.ensureCapacity(lanes.numEvents);

            let indexXys = 0;
            let indexRgbas = 0;

            for (let l = 0; l < lanes.length; l++) {
                let lane = lanes.lane(l);
                for (let e = 0; e < lane.length; e++) {
                    let event = lane.event(e);
                    let indexes = helper.fillEvent(l, e, indexXys, indexRgbas, viewport);
                    indexXys = indexes.indexXys;
                    indexRgbas = indexes.indexRgbas;
                }
            }

            helper.paint(indexXys, indexRgbas, gl, viewport);
        };
    };
}


export function newCombinedEventPainterFactory(barOpts?: TimelineEventBarsPainterOptions, labelOpts?: TimelineEventLabelOptions, iconOpts?: TimelineEventIconsPainterOptions): TimelineEventsPainterFactory {

    // Painter Factory
    return function (drawable: Drawable, timeAxis: TimeAxis1D, lanes: TimelineLaneArray, ui: TimelineUi, options: TimelineEventsPainterOptions): Painter {

        let labelHelper = eventLabelsPainterHelper(labelOpts, drawable, timeAxis, lanes, ui, options);
        let iconHelper = eventIconsPainterHelper(iconOpts, drawable, timeAxis, lanes, ui, options);
        let barHelper = eventStripedBarPainterHelper(barOpts, drawable, timeAxis, lanes, ui, options);
        let dashedHelper = eventDashedBorderPainterHelper(barOpts, drawable, timeAxis, lanes, ui, options);

        // Painter
        return function (gl: WebGLRenderingContext, viewport: BoundsUnmodifiable) {
            gl.blendFuncSeparate(GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA, GL.ONE, GL.ONE_MINUS_SRC_ALPHA);
            gl.enable(GL.BLEND);

            for (let l = 0; l < lanes.length; l++) {
                let lane: TimelineLane = lanes.lane(l);
                for (let e = 0; e < lane.length; e++) {

                    // draw bar
                    barHelper.ensureCapacity(1);
                    let indexes = barHelper.fillEvent(l, e, 0, 0, viewport, 0, 0);
                    let dashedIndexes = dashedHelper.fillEvent(l, e, 0, 0, viewport, 0);
                    barHelper.paint(indexes.indexXys, indexes.indexRgbas, gl, viewport, indexes.indexRelativeXys, indexes.indexFillPattern);
                    dashedHelper.paint(dashedIndexes.indexXys, dashedIndexes.indexRgbas, gl, viewport, dashedIndexes.indexLengthSoFar);

                    // draw label
                    labelHelper.textTextures.resetTouches();
                    labelHelper.textureRenderer.begin(gl, viewport);
                    labelHelper.paintEvent(l, e, gl, viewport);
                    labelHelper.textureRenderer.end(gl);
                    labelHelper.textTextures.retainTouched();

                    // draw icon
                    iconHelper.textureRenderer.begin(gl, viewport);
                    iconHelper.paintEvent(l, e, gl, viewport);
                    iconHelper.textureRenderer.end(gl);
                }
            }

        }
    }
}

