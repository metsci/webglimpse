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
import { Drawable, Painter, Pane, PointerEvent, Mask2D, isLeftMouseDown, Layout } from '../core';
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



export type TimelineEventsPainterFactory = (drawable: Drawable, timeAxis: TimeAxis1D, lanes: TimelineLaneArray, ui: TimelineUi, options: TimelineEventsPainterOptions) => Painter;



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
        const rowTopPadding = (hasval(eventsRowOpts) && hasval(eventsRowOpts.rowTopPadding) ? eventsRowOpts.rowTopPadding : 6);
        const rowBottomPadding = (hasval(eventsRowOpts) && hasval(eventsRowOpts.rowBottomPadding) ? eventsRowOpts.rowBottomPadding : 6);
        const laneHeight = (hasval(eventsRowOpts) && hasval(eventsRowOpts.laneHeight) ? eventsRowOpts.laneHeight : 33);
        const painterFactories = (hasval(eventsRowOpts) && hasval(eventsRowOpts.painterFactories) ? eventsRowOpts.painterFactories : []);
        const allowMultipleLanes = (hasval(eventsRowOpts) && hasval(eventsRowOpts.allowMultipleLanes) ? eventsRowOpts.allowMultipleLanes : true);

        const timelineFont = options.timelineFont;
        const timelineFgColor = options.timelineFgColor;
        const draggableEdgeWidth = options.draggableEdgeWidth;
        const snapToDistance = options.snapToDistance;

        const rowUi = ui.rowUi(row.rowGuid);
        const input = ui.input;
        const selection = ui.selection;

        const lanes = new TimelineLaneArray(model, row, ui, allowMultipleLanes);

        const timeAtCoords_PMILLIS = function (viewport: BoundsUnmodifiable, i: number): number {
            return timeAxis.tAtFrac_PMILLIS(viewport.xFrac(i));
        };

        const timeAtPointer_PMILLIS = function (ev: PointerEvent): number {
            return timeAtCoords_PMILLIS(ev.paneViewport, ev.i);
        };

        const eventAtCoords = function (viewport: BoundsUnmodifiable, i: number, j: number): TimelineEventModel {
            const laneNum = Math.floor((viewport.jEnd - j - rowTopPadding) / laneHeight);
            const time_PMILLIS = timeAtCoords_PMILLIS(viewport, i);
            return lanes.eventAt(laneNum, time_PMILLIS);
        };

        const eventAtPointer = function (ev: PointerEvent): TimelineEventModel {
            return eventAtCoords(ev.paneViewport, ev.i, ev.j);
        };

        const isInsideAnEvent: Mask2D = function (viewport: BoundsUnmodifiable, i: number, j: number): boolean {
            return hasval(eventAtCoords(viewport, i, j));
        };


        // Create pane
        //

        const layout = <Layout>{
            updatePrefSize: <Layout>function (parentPrefSize: Size): void {
                parentPrefSize.h = rowTopPadding + rowBottomPadding + Math.max(1, lanes.length) * laneHeight;
                parentPrefSize.w = null;
            }
        };
        const rowContentPane = new Pane(layout, true, isInsideAnEvent);

        rowUi.addPane('content', rowContentPane);

        const painterOptions = { timelineFont: timelineFont, timelineFgColor: timelineFgColor, rowTopPadding: rowTopPadding, rowBottomPadding: rowBottomPadding, laneHeight: laneHeight };
        for (let n = 0; n < painterFactories.length; n++) {
            const createPainter = painterFactories[n];
            rowContentPane.addPainter(createPainter(drawable, timeAxis, lanes, ui, painterOptions));
        }


        const redraw = function () {
            drawable.redraw();
        };

        row.eventGuids.valueAdded.on(redraw);
        row.eventGuids.valueMoved.on(redraw);
        row.eventGuids.valueRemoved.on(redraw);

        const watchEventAttrs = function (eventGuid: string) {
            model.event(eventGuid).attrsChanged.on(redraw);
        };
        row.eventGuids.forEach(watchEventAttrs);
        row.eventGuids.valueAdded.on(watchEventAttrs);

        const removeRedraw = function (eventGuid: string) {
            model.event(eventGuid).attrsChanged.off(redraw);
        };
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

        const uiMillisPerPxChanged = function () {
            if (!eventDragMode && recentMouseMove != null) {
                const ev = recentMouseMove;
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
        const minEventWidthForEdgeDraggability = 3 * draggableEdgeWidth;

        // When dragging an event-edge, the event cannot be made narrower than this
        //
        // Needs to be greater than minEventWidthForEdgeDraggability -- by enough to
        // cover floating-point precision loss -- so a user can't accidentally make
        // an event so narrow that it can't easily be widened again.
        //
        const minEventWidthWhenDraggingEdge = minEventWidthForEdgeDraggability + 1;


        function allUserEditable(events: TimelineEventModel[]): boolean {
            for (let n = 0; n < events.length; n++) {
                if (!events[n].userEditable) {
                    return false;
                }
            }
            return true;
        }

        function chooseEventDragMode(timelineUi: TimelineUi, mouseTime_PMILLIS: number, timelineEventDragEvents: TimelineEventModel[]): string {
            if (timelineEventDragEvents.length === 0) {
                // If no events are selected, then we don't have any to drag
                return null;
            }
            else if (!allUserEditable(timelineEventDragEvents)) {
                // If any selected event is not user-editable, don't allow editing
                return 'undraggable';
            }
            else if (timelineEventDragEvents.length > 1) {
                // If more than one event is selected, don't allow edge dragging
                return 'center';
            }
            else if (timelineEventDragEvents.length === 1) {
                const event = timelineEventDragEvents[0];
                const pxPerMilli = 1 / timelineUi.millisPerPx.value;
                const eventWidth = (event.end_PMILLIS - event.start_PMILLIS) * pxPerMilli;
                if (eventWidth < minEventWidthForEdgeDraggability) {
                    // If event isn't very wide, don't try to allow edge dragging
                    return 'center';
                }
                else {
                    const mouseOffset = (mouseTime_PMILLIS - event.start_PMILLIS) * pxPerMilli;
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

        const updateCursor = function () {
            if (!eventDragMode) {

                const mouseCursors = { 'center': 'default', 'start': 'w-resize', 'end': 'e-resize', 'undraggable': 'default' };
                const hoveredTime_PMILLIS = selection.hoveredTime_PMILLIS.value;

                // if a multi-selection has been made, update the cursor based on all the events in the multi-selection
                if (selection.selectedEvents.length > 1) {
                    rowContentPane.mouseCursor = mouseCursors[chooseEventDragMode(ui, hoveredTime_PMILLIS, selection.selectedEvents.toArray())];
                }
                else {
                    const hoveredEvent = selection.hoveredEvent.value;
                    const hoveredEvents = (hasval(hoveredEvent) ? [hoveredEvent] : []);
                    rowContentPane.mouseCursor = mouseCursors[chooseEventDragMode(ui, hoveredTime_PMILLIS, hoveredEvents)];
                }
            }
        };
        ui.millisPerPx.changed.on(updateCursor);
        selection.hoveredTime_PMILLIS.changed.on(updateCursor);
        selection.hoveredEvent.changed.on(updateCursor);

        rowContentPane.mouseDown.on(function (ev: PointerEvent) {
            if (isLeftMouseDown(ev.mouseEvent)) {
                const eventDragEventsSet = selection.selectedEvents;
                eventDragEvents = eventDragEventsSet.toArray();
                eventDragMode = chooseEventDragMode(ui, timeAtPointer_PMILLIS(ev), eventDragEvents);

                eventDragSnapTimes_PMILLIS = new Array();
                const numSnapTimes = 0;
                const allEventGuids = row.eventGuids;
                for (let n = 0; n < allEventGuids.length; n++) {
                    const eventGuid = allEventGuids.valueAt(n);
                    if (!eventDragEventsSet.hasId(eventGuid)) {
                        const event = model.event(eventGuid);
                        eventDragSnapTimes_PMILLIS.push(event.start_PMILLIS);
                        eventDragSnapTimes_PMILLIS.push(event.end_PMILLIS);
                    }
                }
                eventDragSnapTimes_PMILLIS.sort();
            }
        });

        function findSnapShift_MILLIS(t_PMILLIS: number, maxShift_MILLIS: number): number {
            const i = indexNearest(eventDragSnapTimes_PMILLIS, t_PMILLIS);
            if (i >= 0) {
                const shift_MILLIS = eventDragSnapTimes_PMILLIS[i] - t_PMILLIS;
                if (Math.abs(shift_MILLIS) <= maxShift_MILLIS) {
                    return shift_MILLIS;
                }
            }
            return null;
        }


        // Compute (and remember) the pointer time, for use by the event-drag listeners below
        //

        let eventDragPointer_PMILLIS: number = null;

        const updateEventDragPointer = function (ev: PointerEvent) {
            if (isLeftMouseDown(ev.mouseEvent) && eventDragMode) {
                eventDragPointer_PMILLIS = timeAtPointer_PMILLIS(ev);
            }
        };
        rowContentPane.mouseDown.on(updateEventDragPointer);
        rowContentPane.mouseMove.on(updateEventDragPointer);


        // Dragging event-center
        //

        const grabEventCenter = function () {
            if (eventDragMode === 'center') {
                for (let n = 0; n < eventDragEvents.length; n++) {
                    const event = eventDragEvents[n];
                    eventDragOffsets_MILLIS[event.eventGuid] = eventDragPointer_PMILLIS - event.start_PMILLIS;
                }

                // If this is a simple click-and-release, leave the mouse-cursor alone --
                // but once we can tell that it's actually a drag, change to a drag cursor
                //

                const beginDrag = function () {
                    rowContentPane.mouseCursor = 'move';
                };
                rowContentPane.mouseMove.on(beginDrag);
                const pendingBeginDrag = setTimeout(beginDrag, 300);

                const endDrag = function () {
                    clearTimeout(pendingBeginDrag);
                    rowContentPane.mouseMove.off(beginDrag);
                    rowContentPane.mouseUp.off(endDrag);
                };
                rowContentPane.mouseUp.on(endDrag);
            }
        };
        rowContentPane.mouseDown.on(grabEventCenter);

        const dragEventCenter = function () {
            if (eventDragMode === 'center') {
                const maxSnapShift_MILLIS = snapToDistance * (timeAxis.tSize_MILLIS / rowContentPane.viewport.w);

                let snapShift_MILLIS: number = null;
                for (let n = 0; n < eventDragEvents.length; n++) {
                    const event = eventDragEvents[n];
                    const newStart_PMILLIS = (eventDragPointer_PMILLIS - eventDragOffsets_MILLIS[event.eventGuid]);
                    const newEnd_PMILLIS = event.end_PMILLIS + (newStart_PMILLIS - event.start_PMILLIS);

                    const eventStartSnapShift_MILLIS = findSnapShift_MILLIS(newStart_PMILLIS, maxSnapShift_MILLIS);
                    if (hasval(eventStartSnapShift_MILLIS)) {
                        if (!hasval(snapShift_MILLIS) || Math.abs(eventStartSnapShift_MILLIS) < Math.abs(snapShift_MILLIS)) {
                            snapShift_MILLIS = eventStartSnapShift_MILLIS;
                        }
                    }

                    const eventEndSnapShift_MILLIS = findSnapShift_MILLIS(newEnd_PMILLIS, maxSnapShift_MILLIS);
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
                    const event = eventDragEvents[n];
                    const newStart_PMILLIS = eventDragPointer_PMILLIS - eventDragOffsets_MILLIS[event.eventGuid] + snapShift_MILLIS;
                    const newEnd_PMILLIS = event.end_PMILLIS + (newStart_PMILLIS - event.start_PMILLIS);
                    event.setInterval(newStart_PMILLIS, newEnd_PMILLIS);
                }
            }
        };
        rowContentPane.mouseMove.on(dragEventCenter);


        // Dragging event-start
        //

        const grabEventStart = function () {
            if (eventDragMode === 'start') {
                for (let n = 0; n < eventDragEvents.length; n++) {
                    const event = eventDragEvents[n];
                    eventDragOffsets_MILLIS[event.eventGuid] = eventDragPointer_PMILLIS - event.start_PMILLIS;
                }
            }
        };
        rowContentPane.mouseDown.on(grabEventStart);

        const dragEventStart = function () {
            if (eventDragMode === 'start') {
                const wMin_MILLIS = minEventWidthWhenDraggingEdge * timeAxis.vSize / rowContentPane.viewport.w;
                const maxSnapShift_MILLIS = snapToDistance * (timeAxis.tSize_MILLIS / rowContentPane.viewport.w);

                let snapShift_MILLIS: number = null;
                for (let n = 0; n < eventDragEvents.length; n++) {
                    const event = eventDragEvents[n];
                    const newStart_PMILLIS = eventDragPointer_PMILLIS - eventDragOffsets_MILLIS[event.eventGuid];

                    const eventSnapShift_MILLIS = findSnapShift_MILLIS(newStart_PMILLIS, maxSnapShift_MILLIS);
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
                    const event = eventDragEvents[n];
                    const newStart_PMILLIS = eventDragPointer_PMILLIS - eventDragOffsets_MILLIS[event.eventGuid] + snapShift_MILLIS;
                    event.start_PMILLIS = Math.trunc(Math.min(event.end_PMILLIS - wMin_MILLIS, newStart_PMILLIS));
                }
            }
        };
        rowContentPane.mouseMove.on(dragEventStart);
        timeAxis.limitsChanged.on(dragEventStart);


        // Dragging event-end
        //

        const grabEventEnd = function () {
            if (eventDragMode === 'end') {
                for (let n = 0; n < eventDragEvents.length; n++) {
                    const event = eventDragEvents[n];
                    eventDragOffsets_MILLIS[event.eventGuid] = eventDragPointer_PMILLIS - event.end_PMILLIS;
                }
            }
        };
        rowContentPane.mouseDown.on(grabEventEnd);

        const dragEventEnd = function () {
            if (eventDragMode === 'end') {
                const wMin_MILLIS = minEventWidthWhenDraggingEdge * timeAxis.vSize / rowContentPane.viewport.w;
                const maxSnapShift_MILLIS = snapToDistance * (timeAxis.tSize_MILLIS / rowContentPane.viewport.w);

                let snapShift_MILLIS: number = null;
                for (let n = 0; n < eventDragEvents.length; n++) {
                    const event = eventDragEvents[n];
                    const newEnd_PMILLIS = eventDragPointer_PMILLIS - eventDragOffsets_MILLIS[event.eventGuid];

                    const eventSnapShift_MILLIS = findSnapShift_MILLIS(newEnd_PMILLIS, maxSnapShift_MILLIS);
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
                    const event = eventDragEvents[n];
                    const newEnd_PMILLIS = eventDragPointer_PMILLIS - eventDragOffsets_MILLIS[event.eventGuid] + snapShift_MILLIS;
                    event.end_PMILLIS = Math.trunc(Math.max(event.start_PMILLIS + wMin_MILLIS, newEnd_PMILLIS));
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

    const rowTopPadding = options.rowTopPadding;
    const rowBottomPadding = options.rowBottomPadding;
    const laneHeight = options.laneHeight;

    const lineColor = (hasval(limitsOpts) && hasval(limitsOpts.lineColor) ? limitsOpts.lineColor : new Color(1, 0, 0, 1));
    const lineThickness = (hasval(limitsOpts) && hasval(limitsOpts.lineThickness) ? limitsOpts.lineThickness : 2.5);

    const xyFrac_vColor_VERTSHADER = concatLines(
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

    const program = new Program(xyFrac_vColor_VERTSHADER, varyingColor_FRAGSHADER);
    const a_XyFrac = new Attribute(program, 'a_XyFrac');
    const a_Color = new Attribute(program, 'a_Color');

    let xys = new Float32Array(0);
    const xysBuffer = newDynamicBuffer();

    let rgbas = new Float32Array(0);
    const rgbasBuffer = newDynamicBuffer();

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
            const numVertices = (6 * 3 /* triangles */ * eventCount);
            xys = ensureCapacityFloat32(xys, 2 * numVertices);
            rgbas = ensureCapacityFloat32(rgbas, 4 * numVertices);
        },
        fillEvent: function (laneIndex: number, eventIndex: number, indexXys: number, indexRgbas: number, viewport: BoundsUnmodifiable): { indexXys: number; indexRgbas: number } {

            const lane: TimelineLane = lanes.lane(laneIndex);
            const event: TimelineEventModel = lane.event(eventIndex);

            const wLine = lineThickness / viewport.w;
            const hLine = lineThickness / viewport.h;

            const jTop = rowTopPadding + (laneIndex) * laneHeight;
            const yTop = (viewport.h - jTop) / viewport.h;
            const jBottom = rowTopPadding + (laneIndex + 1) * laneHeight;
            const yBottom = (viewport.h - jBottom) / viewport.h;
            const yMid = (yTop + yBottom) / 2;

            const xLeft = hasval(event.startLimit_PMILLIS) ? timeAxis.tFrac(event.startLimit_PMILLIS) : 0;
            const xRight = hasval(event.endLimit_PMILLIS) ? timeAxis.tFrac(event.endLimit_PMILLIS) : 1;

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

        const helper = eventLimitsPainterHelper(limitOpts, drawable, timeAxis, lanes, ui, options);

        // Painter
        return function (gl: WebGLRenderingContext, viewport: BoundsUnmodifiable) {

            const selectedEvents: OrderedSet<TimelineEventModel> = ui.selection.selectedEvents;

            // XXX Instead of estimating the number of events we will need to draw ahead of time
            // XXX (difficult because selected events may be present in multiple lanes, so
            // XXX selectedEvents.length might not be sufficient) just make enough space for all events.
            // XXX Potentially quite inefficient with lots of events (and few selected events).
            helper.ensureCapacity(lanes.numEvents);

            let indexXys = 0;
            let indexRgbas = 0;

            for (let l = 0; l < lanes.length; l++) {
                const lane = lanes.lane(l);
                for (let e = 0; e < lane.length; e++) {
                    const event = lane.event(e);

                    // check whether the event is selected and has limits defined
                    if (selectedEvents.hasId(event.eventGuid) && (hasval(event.startLimit_PMILLIS) || hasval(event.endLimit_PMILLIS))) {
                        const indexes = helper.fillEvent(l, e, indexXys, indexRgbas, viewport);
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
    const rowTopPadding = options.rowTopPadding;
    const rowBottomPadding = options.rowBottomPadding;
    const laneHeight = options.laneHeight;

    const topMargin = (hasval(barOpts) && hasval(barOpts.topMargin) ? barOpts.topMargin : 1.2);
    const bottomMargin = (hasval(barOpts) && hasval(barOpts.bottomMargin) ? barOpts.bottomMargin : 1.2);
    const borderThickness = (hasval(barOpts) && hasval(barOpts.borderThickness) ? barOpts.borderThickness : 2);
    const cornerType = (hasval(barOpts) && hasval(barOpts.cornerType) ? barOpts.cornerType : JointType.BEVEL);
    const defaultColor = (hasval(barOpts) && hasval(barOpts.defaultColor) ? barOpts.defaultColor : options.timelineFgColor.withAlphaTimes(0.4));
    const defaultColorSecondary = new Color(1, 1, 1, 1);
    const minimumVisibleWidth = (hasval(barOpts) && hasval(barOpts.minimumVisibleWidth) ? barOpts.minimumVisibleWidth : 0);

    const stripeWidth = (hasval(barOpts) && hasval(barOpts.stripeWidth) ? barOpts.stripeWidth : 5);
    const stripeSecondaryWidth = (hasval(barOpts) && hasval(barOpts.stripeSecondaryWidth) ? barOpts.stripeSecondaryWidth : 5);
    const stripeSlant = (hasval(barOpts) && hasval(barOpts.stripeSlant) ? barOpts.stripeSlant : 1);
    const featherWidth = (hasval(barOpts) && hasval(barOpts.featherWidth) ? barOpts.featherWidth : 2);

    const selection = ui.selection;

    const xyFrac_vColor_VERTSHADER = concatLines(
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

    const fillPattern_FRAGSHADER = concatLines(
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

    const program = new Program(xyFrac_vColor_VERTSHADER, fillPattern_FRAGSHADER);
    const a_XyFrac = new Attribute(program, 'a_XyFrac');
    const a_Color = new Attribute(program, 'a_Color');
    const a_ColorSecondary = new Attribute(program, 'a_ColorSecondary');
    const a_relativeXy = new Attribute(program, 'a_relativeXy');
    const a_fillPattern = new Attribute(program, 'a_fillPattern');

    const u_stripeWidth = new Uniform1f(program, 'u_stripeWidth');
    const u_stripeSecondaryWidth = new Uniform1f(program, 'u_stripeSecondaryWidth');
    const u_slant = new Uniform1f(program, 'u_slant');
    const u_featherWidth = new Uniform1f(program, 'u_featherWidth');

    let xys = new Float32Array(0);
    const xysBuffer = newDynamicBuffer();

    let rgbas = new Float32Array(0);
    const rgbasBuffer = newDynamicBuffer();

    let rgbasSecondary = new Float32Array(0);
    const rgbasSecondaryBuffer = newDynamicBuffer();

    let relativeXys = new Float32Array(0);
    const relativeXysBuffer = newDynamicBuffer();

    let fillPattern = new Float32Array(0);
    const fillPatternBuffer = newDynamicBuffer();

    return {
        paint(indexXys: number, indexRgbas: number, gl: WebGLRenderingContext, viewport: BoundsUnmodifiable, indexRelativeXys: number, indexFillPattern: number) {
            if (indexXys === 0 || indexRgbas === 0) {
                return;
            }

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
            const numVertices = (6 * (1 /*quads*/)) * eventCount;
            xys = ensureCapacityFloat32(xys, 2 * numVertices);
            rgbas = ensureCapacityFloat32(rgbas, 4 * numVertices);
            rgbasSecondary = ensureCapacityFloat32(rgbasSecondary, 4 * numVertices);
            relativeXys = ensureCapacityFloat32(relativeXys, 2 * numVertices);
            fillPattern = ensureCapacityFloat32(fillPattern, numVertices);
        },
        fillEvent: function (laneIndex: number, eventIndex: number, indexXys: number, indexRgbas: number, viewport: BoundsUnmodifiable, indexRelativeXys: number, indexFillPattern: number): { indexXys: number; indexRgbas: number; indexRelativeXys: number; indexFillPattern: number; } {
            const lane: TimelineLane = lanes.lane(laneIndex);
            const event: TimelineEventModel = lane.event(eventIndex);

            const wBorder = borderThickness / viewport.w;
            const hBorder = borderThickness / viewport.h;

            const _topMargin = hasval(event.topMargin) ? event.topMargin : topMargin;
            const _bottomMargin = hasval(event.bottomMargin) ? event.bottomMargin : bottomMargin;

            const jTop = rowTopPadding + (laneIndex) * laneHeight + _topMargin;
            const yTop = (viewport.h - jTop) / viewport.h;
            const jBottom = rowTopPadding + (laneIndex + 1) * laneHeight - _bottomMargin;
            const yBottom = (viewport.h - jBottom) / viewport.h;

            const xLeft = timeAxis.tFrac(event.start_PMILLIS);
            const xRight = timeAxis.tFrac(event.end_PMILLIS);

            const xWidthPixels = viewport.w * (xRight - xLeft);
            const yHeightPixels = jTop - jBottom;

            if (!(xRight < 0 || xLeft > 1) && xWidthPixels > minimumVisibleWidth) {

                // Fill
                let fillColor = (event.bgColor || defaultColor);
                let fillColorSecondary = (event.bgSecondaryColor || defaultColorSecondary);
                if (event === selection.hoveredEvent.value) {
                    fillColor = darker(fillColor, 0.8);
                    fillColorSecondary = darker(fillColorSecondary, 0.8);
                }
                indexXys = putQuadXys(xys, indexXys, xLeft + wBorder, xRight - wBorder, yTop - hBorder, yBottom + hBorder);

                const startIndex = indexRgbas;
                putQuadRgbas(rgbas, startIndex, fillColor);
                indexRgbas = putQuadRgbas(rgbasSecondary, startIndex, fillColorSecondary);

                // create a quad with relative coordinates
                indexRelativeXys = putQuadXys(relativeXys, indexRelativeXys, 0.0, xWidthPixels, 0.0, yHeightPixels);

                // Set the fillPatternValue per vertex of the quad
                const fillPatternValue: number = event.fillPattern;

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
    const rowTopPadding = options.rowTopPadding;
    const rowBottomPadding = options.rowBottomPadding;
    const laneHeight = options.laneHeight;

    const topMargin = (hasval(barOpts) && hasval(barOpts.topMargin) ? barOpts.topMargin : 1.2);
    const bottomMargin = (hasval(barOpts) && hasval(barOpts.bottomMargin) ? barOpts.bottomMargin : 1.2);
    const borderThickness = (hasval(barOpts) && hasval(barOpts.borderThickness) ? barOpts.borderThickness : 2);
    const cornerType = (hasval(barOpts) && hasval(barOpts.cornerType) ? barOpts.cornerType : JointType.BEVEL);
    const defaultColor = (hasval(barOpts) && hasval(barOpts.defaultColor) ? barOpts.defaultColor : options.timelineFgColor.withAlphaTimes(0.4));
    const defaultBorderColor = (hasval(barOpts) && hasval(barOpts.defaultBorderColor) ? barOpts.defaultBorderColor : null);
    const selectedBorderColor = (hasval(barOpts) && hasval(barOpts.selectedBorderColor) ? barOpts.selectedBorderColor : null);
    const minimumVisibleWidth = (hasval(barOpts) && hasval(barOpts.minimumVisibleWidth) ? barOpts.minimumVisibleWidth : 0);
    const dashLength = (hasval(barOpts) && hasval(barOpts.dashLength) ? barOpts.dashLength : 5);
    const defaultSecondaryColor = new Color(0, 0, 0, 0);

    const selection = ui.selection;

    const dashedBorder_VERTSHADER = concatLines(
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

    const varyingBorder_FRAGSHADER = concatLines(
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

    const program = new Program(dashedBorder_VERTSHADER, varyingBorder_FRAGSHADER);
    const a_XyFrac = new Attribute(program, 'a_XyFrac');
    const a_Color = new Attribute(program, 'a_Color');
    const a_SecondaryColor = new Attribute(program, 'a_SecondaryColor');
    const a_LengthSoFar = new Attribute(program, 'a_LengthSoFar');
    const u_DashLength_PX = new Uniform1f(program, 'u_DashLength_PX');

    let xys = new Float32Array(0);
    const xysBuffer = newDynamicBuffer();

    let rgbas = new Float32Array(0);
    const rgbasBuffer = newDynamicBuffer();

    let rgbasSecondary = new Float32Array(0);
    const rgbasSecondaryBuffer = newDynamicBuffer();

    let lengths = new Float32Array(0);
    const lengthsBuffer = newDynamicBuffer();

    return {
        paint(indexXys: number, indexRgbas: number, gl: WebGLRenderingContext, viewport: BoundsUnmodifiable, indexLengthSoFar: number) {
            if (indexXys === 0 || indexRgbas === 0) {
                return;
            }

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
            const lane: TimelineLane = lanes.lane(laneIndex);
            const event: TimelineEventModel = lane.event(eventIndex);

            const wBorder = borderThickness / viewport.w;
            const hBorder = borderThickness / viewport.h;

            const _topMargin = hasval(event.topMargin) ? event.topMargin : topMargin;
            const _bottomMargin = hasval(event.bottomMargin) ? event.bottomMargin : bottomMargin;

            const jTop = rowTopPadding + (laneIndex) * laneHeight + _topMargin;
            const yTop = (viewport.h - jTop) / viewport.h;
            const jBottom = rowTopPadding + (laneIndex + 1) * laneHeight - _bottomMargin;
            const yBottom = (viewport.h - jBottom) / viewport.h;

            const xLeft = timeAxis.tFrac(event.start_PMILLIS);
            const xRight = timeAxis.tFrac(event.end_PMILLIS);

            const widthPixels = viewport.w * (xRight - xLeft);
            const heightPixels = jBottom - jTop;  // confirmed jBottom > jTop

            const setLengthsVertical = function (bottomEdge: number, topEdge: number) {
                lengths[indexLengthSoFar++] = topEdge;
                lengths[indexLengthSoFar++] = topEdge;
                lengths[indexLengthSoFar++] = bottomEdge;
                lengths[indexLengthSoFar++] = bottomEdge;
                lengths[indexLengthSoFar++] = topEdge;
                lengths[indexLengthSoFar++] = bottomEdge;

                // for convenience, return the length of the edge
                return Math.abs(bottomEdge - topEdge);
            };

            const setLengthsHorizontal = function (leftEdge: number, rightEdge: number) {
                lengths[indexLengthSoFar++] = leftEdge;
                lengths[indexLengthSoFar++] = rightEdge;
                lengths[indexLengthSoFar++] = leftEdge;
                lengths[indexLengthSoFar++] = leftEdge;
                lengths[indexLengthSoFar++] = rightEdge;
                lengths[indexLengthSoFar++] = rightEdge;

                // for convenience, return the length of the edge
                return Math.abs(leftEdge - rightEdge);
            };

            const setLengthsTriangle = function (length: number) {
                lengths[indexLengthSoFar++] = length;
                lengths[indexLengthSoFar++] = length;
                lengths[indexLengthSoFar++] = length;
            };

            if (!(xRight < 0 || xLeft > 1) && widthPixels > minimumVisibleWidth) {

                // Border
                let borderColor = (event.borderColor || event.bgColor || defaultBorderColor);
                const borderSecondaryColor = (event.borderSecondaryColor || defaultSecondaryColor);
                if (selection.selectedEvents.hasValue(event)) {
                    borderColor = (selectedBorderColor || borderColor);
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

        const helper = eventStripedBarPainterHelper(barOpts, drawable, timeAxis, lanes, ui, options);

        // Painter
        return function (gl: WebGLRenderingContext, viewport: BoundsUnmodifiable) {
            helper.ensureCapacity(lanes.numEvents);

            let indexXys = 0;
            let indexRgbas = 0;
            let indexRelativeXys = 0;
            let indexFillPattern = 0;

            for (let l = 0; l < lanes.length; l++) {
                const lane = lanes.lane(l);
                for (let e = 0; e < lane.length; e++) {
                    const event = lane.event(e);
                    const indexes = helper.fillEvent(l, e, indexXys, indexRgbas, viewport, indexRelativeXys, indexFillPattern);
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

        const helper = eventDashedBorderPainterHelper(barOpts, drawable, timeAxis, lanes, ui, options);

        // Painter
        return function (gl: WebGLRenderingContext, viewport: BoundsUnmodifiable) {
            helper.ensureCapacity(lanes.numEvents);

            let indexXys = 0;
            let indexRgbas = 0;
            let indexLengthSoFar = 0;

            for (let l = 0; l < lanes.length; l++) {
                const lane = lanes.lane(l);
                for (let e = 0; e < lane.length; e++) {
                    const event = lane.event(e);
                    const indexes = helper.fillEvent(l, e, indexXys, indexRgbas, viewport, indexLengthSoFar);
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

    const rowTopPadding = options.rowTopPadding;
    const rowBottomPadding = options.rowBottomPadding;
    const laneHeight = options.laneHeight;

    const topMargin = (hasval(iconOpts) && hasval(iconOpts.topMargin) ? iconOpts.topMargin : 1.2);
    const bottomMargin = (hasval(iconOpts) && hasval(iconOpts.bottomMargin) ? iconOpts.bottomMargin : 1.2);
    const vAlign = (hasval(iconOpts) && hasval(iconOpts.vAlign) ? iconOpts.vAlign : 0.5);

    const textureRenderer = new TextureRenderer();

    return {
        textureRenderer: textureRenderer,
        paintEvent: function (laneIndex: number, eventIndex: number, gl: WebGLRenderingContext, viewport: BoundsUnmodifiable) {
            const lane: TimelineLane = lanes.lane(laneIndex);
            const event: TimelineEventModel = lane.event(eventIndex);
            const eventStyle = ui.eventStyle(event.styleGuid);

            const jTop = rowTopPadding + (laneIndex) * laneHeight + topMargin;
            const yFrac = (viewport.h - jTop - (1.0 - vAlign) * (laneHeight - topMargin - bottomMargin)) / viewport.h;

            for (let n = 0; n < eventStyle.numIcons; n++) {
                const icon = eventStyle.icon(n);
                const iconTime_PMILLIS = event.start_PMILLIS + icon.hPos * (event.end_PMILLIS - event.start_PMILLIS);
                const xFrac = timeAxis.tFrac(iconTime_PMILLIS);
                const w = icon.displayWidth / viewport.w;
                if (-w <= xFrac && xFrac <= 1 + w) {
                    const iconTexture = ui.loadImage(icon.url, function () { drawable.redraw(); });
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

        const helper = eventIconsPainterHelper(iconOpts, drawable, timeAxis, lanes, ui, options);

        // Painter
        return function (gl: WebGLRenderingContext, viewport: BoundsUnmodifiable) {
            gl.blendFuncSeparate(GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA, GL.ONE, GL.ONE_MINUS_SRC_ALPHA);
            gl.enable(GL.BLEND);

            helper.textureRenderer.begin(gl, viewport);
            for (let l = 0; l < lanes.length; l++) {
                const lane = lanes.lane(l);
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
        const textColor = hasval(fgColor) ? fgColor : textDefaultColor;
        textTexture = textTextures.value(textColor.rgbaString, labelText);
        wText = textTexture.w / viewport.w;
    }
    return {
        wText: wText,
        textTexture: textTexture
    };
}

function eventLabelsPainterHelper(labelOpts: TimelineEventLabelOptions, drawable: Drawable, timeAxis: TimeAxis1D, lanes: TimelineLaneArray, ui: TimelineUi, options: TimelineEventsPainterOptions) {
    const rowTopPadding = options.rowTopPadding;
    const rowBottomPadding = options.rowBottomPadding;
    const laneHeight = options.laneHeight;

    const topMargin = (hasval(labelOpts) && hasval(labelOpts.topMargin) ? labelOpts.topMargin : 1.2);
    const bottomMargin = (hasval(labelOpts) && hasval(labelOpts.bottomMargin) ? labelOpts.bottomMargin : 1.2);
    const leftMargin = (hasval(labelOpts) && hasval(labelOpts.leftMargin) ? labelOpts.leftMargin : 4);
    const rightMargin = (hasval(labelOpts) && hasval(labelOpts.rightMargin) ? labelOpts.rightMargin : 4);
    const vAlign = (hasval(labelOpts) && hasval(labelOpts.vAlign) ? labelOpts.vAlign : 0.5);
    const spacing = (hasval(labelOpts) && hasval(labelOpts.spacing) ? labelOpts.spacing : 3);
    const extendBeyondBar = (hasval(labelOpts) && hasval(labelOpts.extendBeyondBar) ? labelOpts.extendBeyondBar : false);
    const textMode = (hasval(labelOpts) && hasval(labelOpts.textMode) ? labelOpts.textMode : 'force');

    // Icon options
    const iconsEnabled = (hasval(labelOpts) && hasval(labelOpts.iconsEnabled) ? labelOpts.iconsEnabled : true);
    const iconsForceWidth = (hasval(labelOpts) && hasval(labelOpts.iconsForceWidth) ? labelOpts.iconsForceWidth : 'auto');
    const iconsForceHeight = (hasval(labelOpts) && hasval(labelOpts.iconsForceHeight) ? labelOpts.iconsForceHeight : 'auto');
    const iconsSizeFactor = (hasval(labelOpts) && hasval(labelOpts.iconsSizeFactor) ? labelOpts.iconsSizeFactor : 1);

    // Text options
    const textEnabled = (hasval(labelOpts) && hasval(labelOpts.textEnabled) ? labelOpts.textEnabled : true);
    const textDefaultColor = (hasval(labelOpts) && hasval(labelOpts.textDefaultColor) ? labelOpts.textDefaultColor : options.timelineFgColor);
    const textFont = (hasval(labelOpts) && hasval(labelOpts.textFont) ? labelOpts.textFont : options.timelineFont);

    // XXX: Old icon textures never get cleaned out
    const iconTextures: StringMap<Texture2D> = {};
    const textTextures = newTextTextureCache2(textFont);
    const textureRenderer = new TextureRenderer();

    return {
        textTextures: textTextures,
        textureRenderer: textureRenderer,
        paintEvent: function (laneIndex: number, eventIndex: number, gl: WebGLRenderingContext, viewport: BoundsUnmodifiable) {

            const lane: TimelineLane = lanes.lane(laneIndex);
            const event: TimelineEventModel = lane.event(eventIndex);

            const labelTopMargin = hasval(event.labelTopMargin) ? event.labelTopMargin : topMargin;
            const labelBottomMargin = hasval(event.labelBottomMargin) ? event.labelBottomMargin : bottomMargin;

            const labelVAlign = hasval(event.labelVAlign) ? event.labelVAlign : vAlign;
            const labelVPos = hasval(event.labelVPos) ? event.labelVPos : labelVAlign;

            const labelHAlign = hasval(event.labelHAlign) ? event.labelHAlign : 0;
            const labelHPos = hasval(event.labelHPos) ? event.labelHPos : labelHAlign;

            const jTop = rowTopPadding + (laneIndex) * laneHeight + labelTopMargin;
            const yFrac = (viewport.h - jTop - (1.0 - labelVAlign) * (laneHeight - labelTopMargin - labelBottomMargin)) / viewport.h;

            const xLeftMin = 2 / viewport.w;
            const xRightMax = (viewport.w - 2) / viewport.w;
            const wLeftIndent = leftMargin / viewport.w;
            const wRightIndent = rightMargin / viewport.w;

            const xStart = timeAxis.tFrac(event.start_PMILLIS);
            const xEnd = timeAxis.tFrac(event.end_PMILLIS);

            const wTotal = (xEnd - wRightIndent) - (xStart + wLeftIndent);
            const wSpacing = (spacing / viewport.w);

            if (!(xEnd <= 0 || xStart > 1)) {

                let xLeft;
                let xRight;
                if (extendBeyondBar) {
                    if (eventIndex + 1 < lane.length) {
                        const nextEvent = lane.event(eventIndex + 1);
                        const nextStart_PMILLIS = effectiveEdges_PMILLIS(ui, nextEvent)[0];
                        xRight = timeAxis.tFrac(nextStart_PMILLIS);
                    }
                    else {
                        xRight = xRightMax;
                    }

                    if (eventIndex - 1 >= 0) {
                        const previousEvent = lane.event(eventIndex - 1);
                        const previousEnd_PMILLIS = effectiveEdges_PMILLIS(ui, previousEvent)[1];
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

                        const wIconKnown = hasval(iconWidth);
                        const hIconKnown = hasval(iconHeight);
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

                        const image = new Image();
                        image.onload = (function (url, img) {
                            return function () {
                                const wImage = img.naturalWidth;
                                const hImage = img.naturalHeight;
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
                    while (!!labelText && labelText !== '...') {
                        if (xEndLabel > xRight || xStartLabel < xLeft) {
                            // there is not enough room for the text, begin truncating the text
                            labelText = labelText.substring(0, labelText.length - 4).concat('...');
                            calculatedTextWidth = calculateTextWidth(textEnabled, labelText, event.fgColor, textDefaultColor, textTextures, viewport);
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
                    if (!labelText || labelText === '...') {
                        wText = 0;
                        textTexture = null;
                    }
                } else if (textMode === 'show') {
                    if (xEndLabel > xRight || xStartLabel < xLeft) {
                        // there is not enough room for the text, try with just the icon
                        wText = 0;
                        textTexture = null;

                        // coordinates of the start edge of the icon + label
                        xStartLabel = xStart + wLeftIndent - (wIcon) * labelHPos + (wTotal) * labelHAlign;
                        // coordinates of the end edge of the icon + label
                        xEndLabel = xStartLabel + (wIcon);

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
                    xStartLabel = xStart + wLeftIndent - (wSpacing + wIcon + wText) * labelHPos + (wTotal) * labelHAlign;

                    // coordinates of the end edge of the icon + label
                    xEndLabel = xStartLabel + (wSpacing + wIcon + wText);

                    if (xStartLabel < xLeftMin) {
                        textureRenderer.draw(gl, iconTexture, xLeftMin, yFrac, { xAnchor: 0, yAnchor: labelVPos, width: iconWidth, height: iconHeight });
                    }
                    else if (xEndLabel > xRightMax) {
                        textureRenderer.draw(gl, iconTexture, xRightMax - wSpacing - wText, yFrac, { xAnchor: 1, yAnchor: labelVPos, width: iconWidth, height: iconHeight });
                    }
                    else {
                        const xFrac = xStart + wLeftIndent - (wSpacing + wText) * labelHPos + (wTotal) * labelHAlign;
                        textureRenderer.draw(gl, iconTexture, xFrac, yFrac, { xAnchor: labelHPos, yAnchor: labelVPos, width: iconWidth, height: iconHeight });
                    }
                }

                // Text
                if (hasval(textTexture)) {
                    // coordinates of the start edge of the icon + label
                    xStartLabel = xStart + wLeftIndent - (wSpacing + wIcon + wText) * labelHPos + (wTotal) * labelHAlign;

                    // coordinates of the end edge of the icon + label
                    xEndLabel = xStartLabel + (wSpacing + wIcon + wText);

                    if (xStartLabel < xLeftMin) {
                        textureRenderer.draw(gl, textTexture, xLeftMin + wSpacing + wIcon, yFrac, { xAnchor: 0, yAnchor: textTexture.yAnchor(labelVPos) });
                    }
                    else if (xEndLabel > xRightMax) {
                        textureRenderer.draw(gl, textTexture, xRightMax, yFrac, { xAnchor: 1, yAnchor: textTexture.yAnchor(labelVPos) });
                    }
                    else {
                        const xFrac = xStart + wLeftIndent + (wIconPlusSpacing) * (1 - labelHPos) + (wTotal) * labelHAlign;
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

        const helper = eventLabelsPainterHelper(labelOpts, drawable, timeAxis, lanes, ui, options);

        // Painter
        return function (gl: WebGLRenderingContext, viewport: BoundsUnmodifiable) {
            gl.blendFuncSeparate(GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA, GL.ONE, GL.ONE_MINUS_SRC_ALPHA);
            gl.enable(GL.BLEND);

            helper.textTextures.resetTouches();
            helper.textureRenderer.begin(gl, viewport);
            for (let l = 0; l < lanes.length; l++) {
                const lane: TimelineLane = lanes.lane(l);
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
    const rowTopPadding = options.rowTopPadding;
    const rowBottomPadding = options.rowBottomPadding;
    const laneHeight = options.laneHeight;

    const topMargin = (hasval(barOpts) && hasval(barOpts.topMargin) ? barOpts.topMargin : 1.2);
    const bottomMargin = (hasval(barOpts) && hasval(barOpts.bottomMargin) ? barOpts.bottomMargin : 1.2);
    const borderThickness = (hasval(barOpts) && hasval(barOpts.borderThickness) ? barOpts.borderThickness : 2);
    const cornerType = (hasval(barOpts) && hasval(barOpts.cornerType) ? barOpts.cornerType : JointType.BEVEL);
    const defaultColor = (hasval(barOpts) && hasval(barOpts.defaultColor) ? barOpts.defaultColor : options.timelineFgColor.withAlphaTimes(0.4));
    const defaultBorderColor = (hasval(barOpts) && hasval(barOpts.defaultBorderColor) ? barOpts.defaultBorderColor : null);
    const selectedBorderColor = (hasval(barOpts) && hasval(barOpts.selectedBorderColor) ? barOpts.selectedBorderColor : null);
    const minimumVisibleWidth = (hasval(barOpts) && hasval(barOpts.minimumVisibleWidth) ? barOpts.minimumVisibleWidth : 0);

    const selection = ui.selection;

    const xyFrac_vColor_VERTSHADER = concatLines(
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

    const program = new Program(xyFrac_vColor_VERTSHADER, varyingColor_FRAGSHADER);
    const a_XyFrac = new Attribute(program, 'a_XyFrac');
    const a_Color = new Attribute(program, 'a_Color');

    let xys = new Float32Array(0);
    const xysBuffer = newDynamicBuffer();

    let rgbas = new Float32Array(0);
    const rgbasBuffer = newDynamicBuffer();

    return {
        paint(indexXys: number, indexRgbas: number, gl: WebGLRenderingContext, viewport: BoundsUnmodifiable) {
            if (indexXys === 0 || indexRgbas === 0) {
                return;
            }

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
            const lane: TimelineLane = lanes.lane(laneIndex);
            const event: TimelineEventModel = lane.event(eventIndex);

            const wBorder = borderThickness / viewport.w;
            const hBorder = borderThickness / viewport.h;

            const _topMargin = hasval(event.topMargin) ? event.topMargin : topMargin;
            const _bottomMargin = hasval(event.bottomMargin) ? event.bottomMargin : bottomMargin;

            const jTop = rowTopPadding + (laneIndex) * laneHeight + _topMargin;
            const yTop = (viewport.h - jTop) / viewport.h;
            const jBottom = rowTopPadding + (laneIndex + 1) * laneHeight - _bottomMargin;
            const yBottom = (viewport.h - jBottom) / viewport.h;

            const xLeft = timeAxis.tFrac(event.start_PMILLIS);
            const xRight = timeAxis.tFrac(event.end_PMILLIS);

            const xWidthPixels = viewport.w * (xRight - xLeft);

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
                    borderColor = (selectedBorderColor || borderColor);
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

        const helper = eventBarPainterHelper(barOpts, drawable, timeAxis, lanes, ui, options);

        // Painter
        return function (gl: WebGLRenderingContext, viewport: BoundsUnmodifiable) {
            helper.ensureCapacity(lanes.numEvents);

            let indexXys = 0;
            let indexRgbas = 0;

            for (let l = 0; l < lanes.length; l++) {
                const lane = lanes.lane(l);
                for (let e = 0; e < lane.length; e++) {
                    const event = lane.event(e);
                    const indexes = helper.fillEvent(l, e, indexXys, indexRgbas, viewport);
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

        const labelHelper = eventLabelsPainterHelper(labelOpts, drawable, timeAxis, lanes, ui, options);
        const iconHelper = eventIconsPainterHelper(iconOpts, drawable, timeAxis, lanes, ui, options);
        const barHelper = eventStripedBarPainterHelper(barOpts, drawable, timeAxis, lanes, ui, options);
        const dashedHelper = eventDashedBorderPainterHelper(barOpts, drawable, timeAxis, lanes, ui, options);

        // Painter
        return function (gl: WebGLRenderingContext, viewport: BoundsUnmodifiable) {
            gl.blendFuncSeparate(GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA, GL.ONE, GL.ONE_MINUS_SRC_ALPHA);
            gl.enable(GL.BLEND);

            for (let l = 0; l < lanes.length; l++) {
                const lane: TimelineLane = lanes.lane(l);
                for (let e = 0; e < lane.length; e++) {

                    // draw bar
                    barHelper.ensureCapacity(1);
                    const indexes = barHelper.fillEvent(l, e, 0, 0, viewport, 0, 0);
                    const dashedIndexes = dashedHelper.fillEvent(l, e, 0, 0, viewport, 0);
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

        };
    };
}

