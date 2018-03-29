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
import { Pane, Layout, Drawable, PointerEvent, xFrac, Mask2D, Painter, isLeftMouseDown, LayoutPhase1 } from '../core';
import { TimelineModel, TimelineRowModel, TimelineGroupModel, TimelineGroup } from './timeline_model';
import { TimelineUi, TimeIntervalModel, TimelineInput } from './timeline_ui';
import { TimelineRowPaneFactoryChooser, TimelineRowPaneFactory } from './timeline_row';
import { ScrollbarOptions, newVerticalScrollLayout, newVerticalScrollbar, attachTimelineVerticalScrollMouseListeners, VerticalScrollLayout } from '../scroll';
import { Color, white, rgb, gray, rgba } from '../color';
import { TimeAxisFormatOptions, newTimeAxisPainter } from './time_axis_painter';
import { Insets, newInsets, newInsetPane, newInsetLayout } from '../layout/inset_layout';
import { TimeAxis1D } from './time_axis';
import { rowPaneFactoryChooser_DEFAULT } from './timeline_styles';
import { axisZoomStep, Axis1D } from '../plot/axis';
import { newColumnLayout } from '../layout/column_layout';
import { newCardLayout } from '../layout/card_layout';
import { newRowLayout } from '../layout/row_layout';
import { Side, newBackgroundPainter, xyFrac_VERTSHADER, solid_FRAGSHADER, putQuadXys, newSolidPane, Background } from '../misc';
import { newOverlayLayout } from '../layout/overlay_layout';
import { alwaysTrue, GL, StringMap, hasval, isNumber } from '../util/util';
import { BoundsUnmodifiable, Size } from '../bounds';
import { Program, Attribute, UniformColor } from '../shader';
import { newDynamicBuffer } from '../buffer';
import { TextureRenderer } from '../texture';
import { Label, fitToLabel, newLabelPainter } from '../label';
import { OrderedStringSet } from '../util/ordered_set';
import { newTimeGridPainter } from './time_grid_painter';
import { newBorderPainter } from '../painter/border_painter';
import { createTextTextureFactory } from '../text';

export class TimelinePane extends Pane {
    private _model: TimelineModel;
    private _ui: TimelineUi;

    constructor(layout: Layout, model: TimelineModel, ui: TimelineUi) {
        super(layout, true);
        this._model = model;
        this._ui = ui;
    }

    get model(): TimelineModel { return this._model; }
    get ui(): TimelineUi { return this._ui; }
}



export interface TimelinePaneOptions {

    // Misc
    font?: string;
    rowPaneFactoryChooser?: TimelineRowPaneFactoryChooser;

    // Scroll
    showScrollbar?: boolean;
    scrollbarOptions?: ScrollbarOptions;

    // Colors
    fgColor?: Color;
    rowLabelColor?: Color;
    rowLabelBgColor?: Color;
    groupLabelColor?: Color;
    groupHighlightColor?: Color;
    axisLabelColor?: Color;
    bgColor?: Color;
    rowBgColor?: Color;
    rowAltBgColor?: Color;
    gridColor?: Color;
    selectedIntervalFillColor?: Color;
    selectedIntervalBorderColor?: Color;

    // Axes
    showTopAxis?: boolean;
    showBottomAxis?: boolean;
    topTimeZone?: string;
    bottomTimeZone?: string;
    tickSpacing?: number;
    axisLabelAlign?: number;
    isFuturePositive?: boolean;
    timeAxisFormat?: TimeAxisFormatOptions;

    // date in time_ISO8601 format (see util.ts:parseTime_PMILLIS)
    // that time labels on the timeline should be referenced from
    // (i.e. Day 1, Day 2...)
    // (if not provided, timeline labels will be in absolute time)
    referenceDate?: string;

    // Sizing
    groupLabelInsets?: Insets;
    rowLabelInsets?: Insets;
    rowLabelPaneWidth?: number;
    rowSeparatorHeight?: number;
    scrollbarWidth?: number;
    axisPaneHeight?: number;
    draggableEdgeWidth?: number;
    snapToDistance?: number;

    // Event / Selection
    allowEventMultiSelection?: boolean;
    // Options:
    // 'none' or any falsy value : no time selection
    // 'single'                  : single selected time
    // 'range'                   : range of selected times
    // 'single-unmodifiable'     : single selected time (cannot be adjusted by user mouse clicks)
    // 'range-unmodifiable'      : range of selected times (cannot be adjusted by user mouse clicks)
    selectedIntervalMode?: string;
    // enable / disable centering of time selection interval on double click
    // (this has no effect for selectedIntervalMode 'none', 'single-unmodifiable', or 'range-unmodifiable'
    //  because mouse controls are off by default in those modes)
    centerSelectedIntervalOnDoubleClick?: boolean;
    // provide a custom listener callback function to modify the default behavior when the mouse
    // scroll wheel is rotate over the timeline (default behavior is to zoom in/out in time)
    mouseWheelListener?: (PointerEvent: PointerEvent) => void;
}

export function newTimelinePane(drawable: Drawable, timeAxis: TimeAxis1D, model: TimelineModel, options?: TimelinePaneOptions, ui?: TimelineUi): TimelinePane {

    // Misc
    let font = (hasval(options) && hasval(options.font) ? options.font : '11px verdana,sans-serif');
    let rowPaneFactoryChooser = (hasval(options) && hasval(options.rowPaneFactoryChooser) ? options.rowPaneFactoryChooser : rowPaneFactoryChooser_DEFAULT);

    // Scroll
    let showScrollbar = (hasval(options) && hasval(options.showScrollbar) ? options.showScrollbar : true);
    let scrollbarOptions = (hasval(options) ? options.scrollbarOptions : null);

    // Colors
    let fgColor = (hasval(options) && hasval(options.fgColor) ? options.fgColor : white);
    let bgColor = (hasval(options) && hasval(options.bgColor) ? options.bgColor : rgb(0.098, 0.165, 0.243));
    let rowLabelColor = (hasval(options) && hasval(options.rowLabelColor) ? options.rowLabelColor : fgColor);
    let rowLabelBgColor = (hasval(options) && hasval(options.rowLabelBgColor) ? options.rowLabelBgColor : bgColor);
    let groupLabelColor = (hasval(options) && hasval(options.groupLabelColor) ? options.groupLabelColor : fgColor);
    let groupHighlightColor = (hasval(options) && hasval(options.groupHighlightColor) ? options.groupHighlightColor : rgb(0, 1, 1));
    let axisLabelColor = (hasval(options) && hasval(options.axisLabelColor) ? options.axisLabelColor : fgColor);
    let rowBgColor = (hasval(options) && hasval(options.rowBgColor) ? options.rowBgColor : rgb(0.020, 0.086, 0.165));
    let rowAltBgColor = (hasval(options) && hasval(options.rowAltBgColor) ? options.rowAltBgColor : rgb(0.020, 0.086, 0.165));
    let gridColor = (hasval(options) && hasval(options.gridColor) ? options.gridColor : gray(0.5));
    let selectedIntervalFillColor = (hasval(options) && hasval(options.selectedIntervalFillColor) ? options.selectedIntervalFillColor : rgba(0, 0.6, 0.8, 0.157));
    let selectedIntervalBorderColor = (hasval(options) && hasval(options.selectedIntervalBorderColor) ? options.selectedIntervalBorderColor : rgb(0, 0.2, 1.0));

    // Axes
    let showTopAxis = (hasval(options) && hasval(options.showTopAxis) ? options.showTopAxis : true);
    let showBottomAxis = (hasval(options) && hasval(options.showBottomAxis) ? options.showBottomAxis : true);
    let topTimeZone = (hasval(options) && hasval(options.topTimeZone) ? options.topTimeZone : '+0000');
    let bottomTimeZone = (hasval(options) && hasval(options.bottomTimeZone) ? options.bottomTimeZone : '+0000');
    let tickSpacing = (hasval(options) && hasval(options.tickSpacing) ? options.tickSpacing : 60);
    let axisLabelAlign = (hasval(options) && hasval(options.axisLabelAlign) ? options.axisLabelAlign : 0.5);

    // Sizing
    let groupLabelInsets = (hasval(options) && hasval(options.groupLabelInsets) ? options.groupLabelInsets : newInsets(6, 10));
    let rowLabelInsets = (hasval(options) && hasval(options.rowLabelInsets) ? options.rowLabelInsets : newInsets(0, 35));
    let rowLabelPaneWidth = (hasval(options) && hasval(options.rowLabelPaneWidth) ? options.rowLabelPaneWidth : 140);
    let rowSeparatorHeight = (hasval(options) && hasval(options.rowSeparatorHeight) ? options.rowSeparatorHeight : 2);
    let scrollbarWidth = (hasval(options) && hasval(options.scrollbarWidth) ? options.scrollbarWidth : 16);
    scrollbarWidth = showScrollbar ? scrollbarWidth : 0; // if the scrollbar is not showing, set its width to 0
    let axisPaneHeight = (hasval(options) && hasval(options.axisPaneHeight) ? options.axisPaneHeight : 40);
    let draggableEdgeWidth = (hasval(options) && hasval(options.draggableEdgeWidth) ? options.draggableEdgeWidth : 6);
    let snapToDistance = (hasval(options) && hasval(options.snapToDistance) ? options.snapToDistance : 10);

    // Event / Selection
    let allowEventMultiSelection = (hasval(options) && hasval(options.allowEventMultiSelection) ? options.allowEventMultiSelection : true);
    let selectedIntervalMode = (hasval(options) && hasval(options.selectedIntervalMode) ? options.selectedIntervalMode : 'range');
    let centerSelectedIntervalOnDoubleClick = (hasval(options) && hasval(options.centerSelectedIntervalOnDoubleClick) ? options.centerSelectedIntervalOnDoubleClick : true);
    let defaultMouseWheelListener = function (ev: PointerEvent) {
        let zoomFactor = Math.pow(axisZoomStep, ev.wheelSteps);
        timeAxis.zoom(zoomFactor, timeAxis.vAtFrac(xFrac(ev)));
    }
    let mouseWheelListener = (hasval(options) && hasval(options.mouseWheelListener) ? options.mouseWheelListener : defaultMouseWheelListener);

    let outsideManagedUi = false;
    if (!ui) {
        let outsideManagedUi = false;
        ui = new TimelineUi(model, { allowEventMultiSelection: allowEventMultiSelection });
    }
    else {
        // remove old panes (if the ui is being reused)
        let outsideManagedUi = true;
        ui.panes.removeAll();
    }

    let selection = ui.selection;

    let redraw = function () {
        drawable.redraw();
    };
    selection.selectedInterval.changed.on(redraw);
    selection.hoveredEvent.changed.on(redraw);
    selection.selectedEvents.valueAdded.on(redraw);
    selection.selectedEvents.valueRemoved.on(redraw);

    // even if the model defines cursors, we may need to redraw when the mouse position changes
    // (we might not actually need to if: none of the rows actually use the cursor, or if the
    //  cursor doesn't show a vertical or horizontal line)
    // this check just avoids redrawing unncessarily in the easy-to-verify common case where
    // no cursors are defined
    let redrawCursor = function () {
        if (!model.cursors.isEmpty) {
            drawable.redraw();
        }
    }

    selection.hoveredY.changed.on(redrawCursor);
    selection.hoveredTime_PMILLIS.changed.on(redrawCursor);

    // Scroll Pane and Maximized Row Pane
    //

    // setup Pane which either shows timeline content, or only maximized rows
    // able to switch between the two depending on model.root.maximizedRowGuids.isEmpty

    // Scroll Pane

    let tickTimeZone = (showTopAxis ? topTimeZone : bottomTimeZone);
    let contentPaneOpts = { selectedIntervalMode: selectedIntervalMode, rowPaneFactoryChooser: rowPaneFactoryChooser, font: font, fgColor: fgColor, rowLabelColor: rowLabelColor, rowLabelBgColor: rowLabelBgColor, groupLabelColor: groupLabelColor, groupHighlightColor: groupHighlightColor, axisLabelColor: axisLabelColor, bgColor: bgColor, rowBgColor: rowBgColor, rowAltBgColor: rowAltBgColor, gridColor: gridColor, gridTickSpacing: tickSpacing, gridTimeZone: tickTimeZone, referenceDate: options.referenceDate, groupLabelInsets: groupLabelInsets, rowLabelInsets: rowLabelInsets, rowLabelPaneWidth: rowLabelPaneWidth, rowSeparatorHeight: rowSeparatorHeight, draggableEdgeWidth: draggableEdgeWidth, snapToDistance: snapToDistance, mouseWheelListener: mouseWheelListener };
    let contentPaneArgs;
    let contentPane: Pane = null;

    if (showScrollbar) {

        let scrollLayout = newVerticalScrollLayout();
        let scrollable = new Pane(scrollLayout, false);
        ui.addPane('scroll-content-pane', scrollable);

        contentPaneArgs = { drawable: drawable, scrollLayout: scrollLayout, timeAxis: timeAxis, model: model, ui: ui, options: contentPaneOpts };

        let scrollContentPane = newTimelineContentPane(contentPaneArgs);
        ui.addPane('content-pane', scrollContentPane);

        scrollable.addPane(scrollContentPane, 0);

        let scrollbar = newVerticalScrollbar(scrollLayout, drawable, scrollbarOptions);
        ui.addPane('scrollbar', scrollbar);

        contentPane = new Pane(newColumnLayout(false), false);
        ui.addPane('scroll-outer-pane', contentPane);

        contentPane.addPane(scrollbar, 0, { width: scrollbarWidth, ignoreHeight: true });
        contentPane.addPane(scrollable, 1);

    }
    else {

        contentPaneArgs = { drawable: drawable, scrollLayout: null, timeAxis: timeAxis, model: model, ui: ui, options: contentPaneOpts };
        contentPane = newTimelineContentPane(contentPaneArgs);
        ui.addPane('content-pane', contentPane);

    }

    // Card Pane Switching Logic

    let timelineCardPane = new Pane(newCardLayout());
    ui.addPane('switch-content-pane', timelineCardPane);

    let maximizedContentPane = new Pane(newRowLayout());
    ui.addPane('maximize-content-pane', maximizedContentPane);

    let insetMaximizedContentPane = newInsetPane(maximizedContentPane, newInsets(0, scrollbarWidth, 0, 0));
    ui.addPane('inset-maximize-content-pane', insetMaximizedContentPane);

    let contentActive = model.root.maximizedRowGuids.isEmpty;
    timelineCardPane.addPane(insetMaximizedContentPane, !contentActive);
    timelineCardPane.addPane(contentPane, contentActive);

    setupRowContainerPane(contentPaneArgs, maximizedContentPane, model.root.maximizedRowGuids, true, 'maximized');

    let updateMaximizedRows = function (rowGuid: string, rowIndex: number) {
        let contentActive = model.root.maximizedRowGuids.isEmpty;
        timelineCardPane.setLayoutArg(insetMaximizedContentPane, !contentActive);
        timelineCardPane.setLayoutArg(contentPane, contentActive);
        drawable.redraw();
    }

    model.root.maximizedRowGuids.valueAdded.on(updateMaximizedRows);
    model.root.maximizedRowGuids.valueRemoved.on(updateMaximizedRows);

    // Overlay and Underlay Panes
    //

    let underlayPane = new Pane(newRowLayout());
    ui.addPane('underlay-pane', underlayPane);

    let axisInsets = newInsets(0, scrollbarWidth, 0, rowLabelPaneWidth);

    // top time axis pane
    let axisOpts = { tickSpacing: tickSpacing, font: font, textColor: axisLabelColor, tickColor: axisLabelColor, labelAlign: axisLabelAlign, referenceDate: options.referenceDate, isFuturePositive: options.isFuturePositive, timeAxisFormat: options.timeAxisFormat };
    if (showTopAxis) {
        let topAxisPane = newTimeAxisPane(contentPaneArgs, null);
        ui.addPane('top-axis-pane', topAxisPane);
        topAxisPane.addPainter(newTimeAxisPainter(timeAxis, Side.TOP, topTimeZone, tickTimeZone, axisOpts));
        underlayPane.addPane(newInsetPane(topAxisPane, axisInsets), 0, { height: axisPaneHeight, width: null });
    }

    // pane containing pinned rows specified in TimelineRoot.topPinnedRowGuids
    let topPinnedPane = new Pane(newRowLayout());
    ui.addPane('top-pinned-pane', topPinnedPane);

    let insetTopPinnedPane = newInsetPane(topPinnedPane, newInsets(0, scrollbarWidth, 0, 0));
    ui.addPane('inset-top-pinned-pane', insetTopPinnedPane);

    setupRowContainerPane(contentPaneArgs, topPinnedPane, model.root.topPinnedRowGuids, false, 'toppinned');
    underlayPane.addPane(insetTopPinnedPane, 1);

    // main pane containing timeline groups and rows
    underlayPane.addPane(timelineCardPane, 2, { height: 'pref-max', width: null });

    // pane containing pinned rows specified in TimelineRoot.bottomPinnedRowGuids
    let bottomPinnedPane = new Pane(newRowLayout());
    ui.addPane('bottom-pinned-pane', bottomPinnedPane);

    let insetBottomPinnedPane = newInsetPane(bottomPinnedPane, newInsets(0, scrollbarWidth, 0, 0));
    ui.addPane('inset-bottom-pinned-pane', insetBottomPinnedPane);

    setupRowContainerPane(contentPaneArgs, bottomPinnedPane, model.root.bottomPinnedRowGuids, false, 'bottompinned');
    underlayPane.addPane(insetBottomPinnedPane, 3);

    // bottom time axis pane
    if (showBottomAxis) {
        let bottomAxisPane = newTimeAxisPane(contentPaneArgs, null);
        ui.addPane('bottom-axis-pane', bottomAxisPane);
        bottomAxisPane.addPainter(newTimeAxisPainter(timeAxis, Side.BOTTOM, bottomTimeZone, tickTimeZone, axisOpts));
        underlayPane.addPane(newInsetPane(bottomAxisPane, axisInsets), 4, { height: axisPaneHeight, width: null });
    }

    let updateMillisPerPx = function () {
        let w = underlayPane.viewport.w - axisInsets.left - axisInsets.right;
        ui.millisPerPx.value = timeAxis.tSize_MILLIS / w;
    };
    underlayPane.viewportChanged.on(updateMillisPerPx);
    timeAxis.limitsChanged.on(updateMillisPerPx);

    let timelinePane = new TimelinePane(newOverlayLayout(), model, ui);
    ui.addPane('timeline-pane', timelinePane);
    timelinePane.addPainter(newBackgroundPainter(bgColor));
    timelinePane.addPane(underlayPane, true);

    if (selectedIntervalMode === 'single' || selectedIntervalMode === 'single-unmodifiable') {
        let overlayPane = new Pane(null, false, alwaysTrue);
        ui.addPane('overlay-pane', overlayPane);
        overlayPane.addPainter(newTimelineSingleSelectionPainter(timeAxis, selection.selectedInterval, selectedIntervalBorderColor, selectedIntervalFillColor));
        timelinePane.addPane(newInsetPane(overlayPane, axisInsets, null, false));
    }
    else if (selectedIntervalMode === 'range' || selectedIntervalMode === 'range-unmodifiable') {
        let overlayPane = new Pane(null, false, alwaysTrue);
        ui.addPane('overlay-pane', overlayPane);
        overlayPane.addPainter(newTimelineRangeSelectionPainter(timeAxis, selection.selectedInterval, selectedIntervalBorderColor, selectedIntervalFillColor));
        timelinePane.addPane(newInsetPane(overlayPane, axisInsets, null, false));
    }

    // Enable double click to center selection on mouse

    if (centerSelectedIntervalOnDoubleClick) {
        let doubleClick = function (ev: PointerEvent) {
            if (selectedIntervalMode === 'single') {
                if (ev.clickCount > 1) {
                    let time_PMILLIS = timeAtPointer_PMILLIS(timeAxis, ev);
                    selection.selectedInterval.setInterval(time_PMILLIS, time_PMILLIS);
                }
            }
            else if (selectedIntervalMode === 'range') {
                if (ev.clickCount > 1) {
                    let time_PMILLIS = timeAtPointer_PMILLIS(timeAxis, ev);
                    let offset_PMILLIS = selection.selectedInterval.start_PMILLIS + 0.5 * selection.selectedInterval.duration_MILLIS;
                    selection.selectedInterval.pan(time_PMILLIS - offset_PMILLIS);
                }
            }
        };
        ui.input.mouseDown.on(doubleClick);
    }

    timelinePane.dispose.on(function () {
        // only dispose the ui if we created it (and this manage its lifecycle)
        if (!outsideManagedUi) ui.dispose.fire();
        selection.selectedInterval.changed.off(redraw);
        selection.hoveredEvent.changed.off(redraw);
        selection.hoveredY.changed.off(redrawCursor);
        selection.hoveredTime_PMILLIS.changed.off(redrawCursor);
        selection.selectedEvents.valueAdded.off(redraw);
        selection.selectedEvents.valueRemoved.off(redraw);
        underlayPane.viewportChanged.off(updateMillisPerPx);
        timeAxis.limitsChanged.off(updateMillisPerPx);
        model.root.maximizedRowGuids.valueAdded.off(updateMaximizedRows);
        model.root.maximizedRowGuids.valueRemoved.off(updateMaximizedRows);
    });

    return timelinePane;
}



function newTimeIntervalMask(timeAxis: TimeAxis1D, interval: TimeIntervalModel, selectedIntervalMode: string): Mask2D {

    if (selectedIntervalMode === 'range') {
        return function (viewport: BoundsUnmodifiable, i: number, j: number): boolean {
            let time_PMILLIS = timeAxis.tAtFrac_PMILLIS(viewport.xFrac(i));

            // allow a 10 pixel selection buffer to make it easier to grab ends of the selection
            let buffer_MILLIS = timeAxis.tSize_MILLIS / viewport.w * 10;

            return interval.overlaps(time_PMILLIS - buffer_MILLIS, time_PMILLIS + buffer_MILLIS);
        };
    }
    else if (selectedIntervalMode === 'single') {
        return function (viewport: BoundsUnmodifiable, i: number, j: number): boolean {
            let time_PMILLIS = timeAxis.tAtFrac_PMILLIS(viewport.xFrac(i));

            // allow a 10 pixel selection buffer to make it easier to grab the selection
            let buffer_MILLIS = timeAxis.tSize_MILLIS / viewport.w * 10;

            return time_PMILLIS < interval.cursor_PMILLIS + buffer_MILLIS && time_PMILLIS > interval.cursor_PMILLIS - buffer_MILLIS;
        };
    }
}

function attachTimeAxisMouseListeners(pane: Pane, axis: Axis1D, args: TimelineContentPaneArguments) {
    let vGrab: number = null;

    pane.mouseDown.on(function (ev: PointerEvent) {
        if (isLeftMouseDown(ev.mouseEvent) && !hasval(vGrab)) {
            vGrab = axis.vAtFrac(xFrac(ev));
        }
    });

    pane.mouseMove.on(function (ev: PointerEvent) {
        if (isLeftMouseDown(ev.mouseEvent) && hasval(vGrab)) {
            axis.pan(vGrab - axis.vAtFrac(xFrac(ev)));
        }
    });

    pane.mouseUp.on(function (ev: PointerEvent) {
        vGrab = null;
    });

    pane.mouseWheel.on(args.options.mouseWheelListener);
}

function newTimeAxisPane(args: TimelineContentPaneArguments, row: TimelineRowModel): Pane {
    let timeAxis = args.timeAxis;
    let ui = args.ui;
    let draggableEdgeWidth = args.options.draggableEdgeWidth;
    let scrollLayout = args.scrollLayout;
    let drawable = args.drawable;
    let selectedIntervalMode = args.options.selectedIntervalMode;

    let input = ui.input;

    let axisPane = new Pane(newOverlayLayout());
    if (scrollLayout) attachTimelineVerticalScrollMouseListeners(axisPane, scrollLayout, drawable);
    attachTimeAxisMouseListeners(axisPane, timeAxis, args);

    let onMouseMove = function (ev: PointerEvent) {
        let time_PMILLIS = timeAxis.tAtFrac_PMILLIS(xFrac(ev));
        input.mouseMove.fire(ev);
        input.timeHover.fire(time_PMILLIS, ev);
        if (row) input.rowHover.fire(row, ev);
    };
    axisPane.mouseMove.on(onMouseMove);

    let onMouseExit = function (ev: PointerEvent) {
        input.mouseExit.fire(ev);
        input.timeHover.fire(null, ev);
        if (row) input.rowHover.fire(null, ev);
    };
    axisPane.mouseExit.on(onMouseExit);

    let onMouseDown = function (ev: PointerEvent) {
        input.mouseDown.fire(ev);
    };
    axisPane.mouseDown.on(onMouseDown);

    let onMouseUp = function (ev: PointerEvent) {
        input.mouseUp.fire(ev);
    };
    axisPane.mouseUp.on(onMouseUp);

    let onContextMenu = function (ev: PointerEvent) {
        input.contextMenu.fire(ev);
    };
    axisPane.contextMenu.on(onContextMenu);

    if (selectedIntervalMode === 'single' || selectedIntervalMode === 'range') {
        let selection = ui.selection;
        let selectedIntervalPane = new Pane(null, true, newTimeIntervalMask(timeAxis, selection.selectedInterval, selectedIntervalMode));
        attachTimeSelectionMouseListeners(selectedIntervalPane, timeAxis, selection.selectedInterval, input, draggableEdgeWidth, selectedIntervalMode);
        axisPane.addPane(selectedIntervalPane, false);

        selectedIntervalPane.mouseMove.on(onMouseMove);
        selectedIntervalPane.mouseExit.on(onMouseExit);
        selectedIntervalPane.mouseDown.on(onMouseDown);
        selectedIntervalPane.mouseUp.on(onMouseUp);
        selectedIntervalPane.contextMenu.on(onContextMenu);
    }

    // Dispose
    //

    // mouse listeners are disposed of automatically by Pane

    return axisPane;
}

function timeAtPointer_PMILLIS(timeAxis: TimeAxis1D, ev: PointerEvent): number {
    return timeAxis.tAtFrac_PMILLIS(ev.paneViewport.xFrac(ev.i));
}


function attachTimeSelectionMouseListeners(pane: Pane,
    timeAxis: TimeAxis1D,
    interval: TimeIntervalModel,
    input: TimelineInput,
    draggableEdgeWidth: number,
    selectedIntervalMode: string) {

    if (selectedIntervalMode === 'single') {

        let chooseDragMode = function chooseDragMode(ev: PointerEvent): string {
            return 'center';
        }

        attachTimeIntervalSelectionMouseListeners(pane, timeAxis, interval, input, draggableEdgeWidth, selectedIntervalMode, chooseDragMode);

    }
    else if (selectedIntervalMode === 'range') {

        // Edges are draggable when interval is at least this wide
        let minIntervalWidthForEdgeDraggability = 3 * draggableEdgeWidth;

        // When dragging an edge, the interval cannot be made narrower than this
        //
        // Needs to be greater than minIntervalWidthForEdgeDraggability -- by enough to
        // cover floating-point precision loss -- so a user can't accidentally make
        // the interval so narrow that it can't easily be widened again.
        //
        let minIntervalWidthWhenDraggingEdge = minIntervalWidthForEdgeDraggability + 1;

        let chooseDragMode = function chooseDragMode(ev: PointerEvent): string {
            let intervalWidth = (interval.duration_MILLIS) * ev.paneViewport.w / timeAxis.vSize;
            if (intervalWidth < minIntervalWidthForEdgeDraggability) {
                // If interval isn't very wide, don't try to allow edge dragging
                return 'center';
            }
            else {
                let time_PMILLIS = timeAtPointer_PMILLIS(timeAxis, ev);
                let mouseOffset = (time_PMILLIS - interval.start_PMILLIS) * ev.paneViewport.w / timeAxis.vSize;
                if (mouseOffset < draggableEdgeWidth) {
                    // If mouse is near the left edge, drag the interval's start-time
                    return 'start';
                }
                else if (mouseOffset < intervalWidth - draggableEdgeWidth) {
                    // If mouse is in the center, drag the whole interval
                    return 'center';
                }
                else {
                    // If mouse is near the right edge, drag the interval's end-time
                    return 'end';
                }
            }
        };

        attachTimeIntervalSelectionMouseListeners(pane, timeAxis, interval, input, draggableEdgeWidth, selectedIntervalMode, chooseDragMode);
    }
}

function attachTimeIntervalSelectionMouseListeners(pane: Pane,
    timeAxis: TimeAxis1D,
    interval: TimeIntervalModel,
    input: TimelineInput,
    draggableEdgeWidth: number,
    selectedIntervalMode: string,
    chooseDragMode: (ev: PointerEvent) => string) {

    // see comments in attachTimeSelectionMouseListeners( ... )
    let minIntervalWidthForEdgeDraggability = 3 * draggableEdgeWidth;
    let minIntervalWidthWhenDraggingEdge = minIntervalWidthForEdgeDraggability + 1;

    // Hook up input notifications
    //

    pane.mouseWheel.on(function (ev: PointerEvent) {
        let zoomFactor = Math.pow(axisZoomStep, ev.wheelSteps);
        timeAxis.zoom(zoomFactor, timeAxis.vAtFrac(xFrac(ev)));
    });

    pane.contextMenu.on(function (ev: PointerEvent) {
        input.contextMenu.fire(ev);
    });


    // Begin interval-drag
    //

    let dragMode: string = null;
    let dragOffset_MILLIS: number = null;

    pane.mouseMove.on(function (ev: PointerEvent) {
        if (!dragMode) {
            let mouseCursors = { 'center': 'move', 'start': 'w-resize', 'end': 'e-resize' };
            pane.mouseCursor = mouseCursors[chooseDragMode(ev)];
        }
    });

    pane.mouseDown.on(function (ev: PointerEvent) {
        dragMode = isLeftMouseDown(ev.mouseEvent) ? chooseDragMode(ev) : null;
        if (!hasval(dragMode)) {
            dragOffset_MILLIS = null;
        }
    });


    // Compute (and remember) the pointer time, for use by the drag listeners below
    //

    let dragPointer_PMILLIS: number = null;

    let updateDragPointer = function (ev: PointerEvent) {
        if (hasval(dragMode)) {
            dragPointer_PMILLIS = timeAtPointer_PMILLIS(timeAxis, ev);
        }
    };
    pane.mouseDown.on(updateDragPointer);
    pane.mouseMove.on(updateDragPointer);


    // Dragging interval-center
    //

    let grabCenter = function () {
        if (dragMode === 'center') {
            dragOffset_MILLIS = dragPointer_PMILLIS - interval.start_PMILLIS;
        }
    };
    pane.mouseDown.on(grabCenter);

    let dragCenter = function () {
        if (dragMode === 'center') {
            let newStart_PMILLIS = (dragPointer_PMILLIS - dragOffset_MILLIS);
            let newEnd_PMILLIS = interval.end_PMILLIS + (newStart_PMILLIS - interval.start_PMILLIS);
            interval.setInterval(newStart_PMILLIS, newEnd_PMILLIS);
        }
    };
    pane.mouseMove.on(dragCenter);


    // Dragging interval-start
    //

    let grabStart = function () {
        if (dragMode === 'start') {
            dragOffset_MILLIS = dragPointer_PMILLIS - interval.start_PMILLIS;
        }
    };
    pane.mouseDown.on(grabStart);

    let dragStart = function () {
        if (dragMode === 'start') {
            let wMin_MILLIS = minIntervalWidthWhenDraggingEdge * timeAxis.vSize / pane.viewport.w;
            let newStart_PMILLIS = dragPointer_PMILLIS - dragOffset_MILLIS;
            interval.start_PMILLIS = Math.min(interval.end_PMILLIS - wMin_MILLIS, newStart_PMILLIS);
        }
    };
    pane.mouseMove.on(dragStart);


    // Dragging interval-end
    //

    let grabEnd = function () {
        if (dragMode === 'end') {
            dragOffset_MILLIS = dragPointer_PMILLIS - interval.end_PMILLIS;
        }
    };
    pane.mouseDown.on(grabEnd);

    let dragEnd = function () {
        if (dragMode === 'end') {
            let wMin_MILLIS = minIntervalWidthWhenDraggingEdge * timeAxis.vSize / pane.viewport.w;
            let newEnd_PMILLIS = dragPointer_PMILLIS - dragOffset_MILLIS;
            interval.end_PMILLIS = Math.max(interval.start_PMILLIS + wMin_MILLIS, newEnd_PMILLIS);
            interval.cursor_PMILLIS = interval.end_PMILLIS;
        }
    };
    pane.mouseMove.on(dragEnd);


    // Finish interval-drag
    //

    pane.mouseUp.on(function (ev: PointerEvent) {
        dragOffset_MILLIS = null;
        dragPointer_PMILLIS = null;
        dragMode = null;
    });
}

export function newTimelineSingleSelectionPainter(timeAxis: TimeAxis1D, interval: TimeIntervalModel, borderColor: Color, fillColor: Color): Painter {

    let program = new Program(xyFrac_VERTSHADER, solid_FRAGSHADER);
    let a_XyFrac = new Attribute(program, 'a_XyFrac');
    let u_Color = new UniformColor(program, 'u_Color');

    // holds vertices for fill and border
    let coords = new Float32Array(12 + 8);
    let coordsBuffer = newDynamicBuffer();

    return function (gl: WebGLRenderingContext, viewport: BoundsUnmodifiable) {
        if (hasval(interval.cursor_PMILLIS)) {

            let fracSelection = timeAxis.tFrac(interval.cursor_PMILLIS);
            let fracWidth = 1 / viewport.w;
            let fracHeight = 1 / viewport.h;
            let thickWidth = 3 / viewport.w;
            let highlightWidth = 7 / viewport.w;
            let index = 0;

            // fill vertices
            coords[index++] = fracSelection - highlightWidth;
            coords[index++] = 1;
            coords[index++] = fracSelection + highlightWidth;
            coords[index++] = 1;
            coords[index++] = fracSelection - highlightWidth;
            coords[index++] = 0;
            coords[index++] = fracSelection + highlightWidth;
            coords[index++] = 0;

            // selection vertices
            index = putQuadXys(coords, index, fracSelection - thickWidth / 2, fracSelection + thickWidth / 2, 1, 0 + fracHeight); // selection

            gl.blendFuncSeparate(GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA, GL.ONE, GL.ONE_MINUS_SRC_ALPHA);
            gl.enable(GL.BLEND);

            program.use(gl);
            coordsBuffer.setData(coords);
            a_XyFrac.setDataAndEnable(gl, coordsBuffer, 2, GL.FLOAT);

            u_Color.setData(gl, fillColor);
            gl.drawArrays(GL.TRIANGLE_STRIP, 0, 4);

            u_Color.setData(gl, borderColor);
            gl.drawArrays(GL.TRIANGLES, 4, 6);

            a_XyFrac.disable(gl);
            program.endUse(gl);


        }
    };
}

function newTimelineRangeSelectionPainter(timeAxis: TimeAxis1D, interval: TimeIntervalModel, borderColor: Color, fillColor: Color): Painter {

    let program = new Program(xyFrac_VERTSHADER, solid_FRAGSHADER);
    let a_XyFrac = new Attribute(program, 'a_XyFrac');
    let u_Color = new UniformColor(program, 'u_Color');

    // holds vertices for fill and border
    let coords = new Float32Array(12 + 8 + 48);
    let coordsBuffer = newDynamicBuffer();

    return function (gl: WebGLRenderingContext, viewport: BoundsUnmodifiable) {
        if (hasval(interval.start_PMILLIS) && hasval(interval.end_PMILLIS)) {

            let fracStart = timeAxis.tFrac(interval.start_PMILLIS);
            let fracEnd = timeAxis.tFrac(interval.end_PMILLIS);
            let fracSelection = timeAxis.tFrac(interval.cursor_PMILLIS);
            let fracWidth = 1 / viewport.w;
            let fracHeight = 1 / viewport.h;
            let thickWidth = 3 / viewport.w;
            let index = 0;

            // fill vertices
            coords[index++] = fracStart;
            coords[index++] = 1;
            coords[index++] = fracEnd;
            coords[index++] = 1;
            coords[index++] = fracStart;
            coords[index++] = 0;
            coords[index++] = fracEnd;
            coords[index++] = 0;

            // border vertices
            index = putQuadXys(coords, index, fracStart, fracEnd - fracWidth, +1, +1 - fracHeight); // top
            index = putQuadXys(coords, index, fracStart + fracWidth, fracEnd, 0 + fracHeight, 0); // bottom
            index = putQuadXys(coords, index, fracStart, fracStart + fracWidth, 1 - fracHeight, 0); // left
            index = putQuadXys(coords, index, fracEnd - fracWidth, fracEnd, 1, 0 + fracHeight); // right

            // selection vertices
            index = putQuadXys(coords, index, fracSelection - thickWidth, fracSelection, 1, 0 + fracHeight); // selection

            gl.blendFuncSeparate(GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA, GL.ONE, GL.ONE_MINUS_SRC_ALPHA);
            gl.enable(GL.BLEND);

            program.use(gl);
            coordsBuffer.setData(coords);
            a_XyFrac.setDataAndEnable(gl, coordsBuffer, 2, GL.FLOAT);

            u_Color.setData(gl, fillColor);
            gl.drawArrays(GL.TRIANGLE_STRIP, 0, 4);

            u_Color.setData(gl, borderColor);
            gl.drawArrays(GL.TRIANGLES, 4, 30);

            a_XyFrac.disable(gl);
            program.endUse(gl);


        }
    };
}

function newGroupCollapseExpandArrowPainter(group: TimelineGroupModel) {

    let program = new Program(xyFrac_VERTSHADER, solid_FRAGSHADER);
    let a_XyFrac = new Attribute(program, 'a_XyFrac');
    let u_Color = new UniformColor(program, 'u_Color');

    // holds vertices for triangle
    let coords = new Float32Array(6);
    let coordsBuffer = newDynamicBuffer();

    return function (gl: WebGLRenderingContext, viewport: BoundsUnmodifiable) {

        let sizeFracX = 0.5;
        let sizeX = sizeFracX * viewport.w;
        let sizeY = sizeX * Math.sqrt(3) / 2;
        let sizeFracY = sizeY / viewport.h;

        let bufferFracX = 0.05;
        let bufferSize = bufferFracX * viewport.w;
        let bufferFracY = bufferSize / viewport.h;

        let centerFracX = 0.5;
        let centerFracY = bufferFracY + sizeFracY / 2;

        if (group.collapsed) {

            sizeFracX = sizeY / viewport.w;
            sizeFracY = sizeX / viewport.h;

            let fracStartX = centerFracX - sizeFracX / 2;
            let fracEndX = centerFracX + sizeFracX / 2;

            let fracStartY = 1 - (centerFracY - sizeFracY / 2);
            let fracEndY = 1 - (centerFracY + sizeFracY / 2);

            let index = 0;
            coords[index++] = fracStartX;
            coords[index++] = fracStartY;
            coords[index++] = fracEndX;
            coords[index++] = (fracStartY + fracEndY) / 2;
            coords[index++] = fracStartX;
            coords[index++] = fracEndY;
        } else {
            let fracStartX = centerFracX - sizeFracX / 2;
            let fracEndX = centerFracX + sizeFracX / 2;

            let fracStartY = 1 - (centerFracY - sizeFracY / 2);
            let fracEndY = 1 - (centerFracY + sizeFracY / 2);

            let index = 0;
            coords[index++] = fracStartX;
            coords[index++] = fracStartY;
            coords[index++] = fracEndX;
            coords[index++] = fracStartY;
            coords[index++] = (fracStartX + fracEndX) / 2;
            coords[index++] = fracEndY;
        }

        program.use(gl);
        coordsBuffer.setData(coords);
        a_XyFrac.setDataAndEnable(gl, coordsBuffer, 2, GL.FLOAT);

        u_Color.setData(gl, white);
        gl.drawArrays(GL.TRIANGLES, 0, 3);

        a_XyFrac.disable(gl);
        program.endUse(gl);
    }
}

interface TimelineContentPaneOptions {
    selectedIntervalMode: string;
    rowPaneFactoryChooser: TimelineRowPaneFactoryChooser;

    font: string;
    fgColor: Color;
    rowLabelColor: Color;
    rowLabelBgColor: Color;
    groupLabelColor: Color;
    groupHighlightColor: Color;
    axisLabelColor: Color;
    bgColor: Color;
    rowBgColor: Color;
    rowAltBgColor: Color;
    gridColor: Color;

    gridTimeZone: string;
    gridTickSpacing: number;
    referenceDate: string;

    groupLabelInsets: Insets;
    rowLabelInsets: Insets;
    rowLabelPaneWidth: number;
    rowSeparatorHeight: number;

    draggableEdgeWidth: number;
    snapToDistance: number;

    mouseWheelListener: (PointerEvent: PointerEvent) => void;
}

interface TimelineContentPaneArguments {
    drawable: Drawable;
    scrollLayout: VerticalScrollLayout;
    timeAxis: TimeAxis1D;
    model: TimelineModel;
    ui: TimelineUi;
    options: TimelineContentPaneOptions;
}

function newTimelineContentPane(args: TimelineContentPaneArguments): Pane {
    let drawable = args.drawable;
    let scrollLayout = args.scrollLayout;
    let timeAxis = args.timeAxis;
    let model = args.model;
    let ui = args.ui;
    let options = args.options;

    let root = model.root;

    let selectedIntervalMode = options.selectedIntervalMode;
    let rowPaneFactoryChooser = options.rowPaneFactoryChooser;

    let font = options.font;
    let fgColor = options.fgColor;
    let rowLabelColor = options.rowLabelColor;
    let groupLabelColor = options.groupLabelColor;
    let groupHighlightColor = options.groupHighlightColor;
    let axisLabelColor = options.axisLabelColor;
    let bgColor = options.bgColor;
    let rowBgColor = options.rowBgColor;
    let rowAltBgColor = options.rowAltBgColor;
    let gridColor = options.gridColor;

    let gridTimeZone = options.gridTimeZone;
    let gridTickSpacing = options.gridTickSpacing;

    let groupLabelInsets = options.groupLabelInsets;
    let rowLabelInsets = options.rowLabelInsets;
    let rowLabelPaneWidth = options.rowLabelPaneWidth;
    let rowSeparatorHeight = options.rowSeparatorHeight;

    let draggableEdgeWidth = options.draggableEdgeWidth;
    let snapToDistance = options.snapToDistance;

    let textureRenderer = new TextureRenderer();
    let createGroupLabelTexture = createTextTextureFactory(font);
    let createRowLabelTexture = createTextTextureFactory(font);

    // Group panes
    //

    let timelineContentPane = new Pane(newRowLayout());

    let groupHeaderPanes: StringMap<Pane> = {};
    let groupContentPanes: StringMap<Pane> = {};

    let addGroup = function (groupGuid: string, groupIndex: number) {
        let group = model.group(groupGuid);

        let groupLabel = new Label(group.label, font, groupLabelColor);
        let groupLabelPane = new Pane(<Layout>{ updatePrefSize: fitToLabel(groupLabel) }, false);
        groupLabelPane.addPainter(newLabelPainter(groupLabel, 0, 1, 0, 1));

        let groupArrowPane = new Pane({
            updatePrefSize: <LayoutPhase1>function (parentPrefSize: Size) {
                parentPrefSize.w = 16;
                parentPrefSize.h = 0;
            }
        }, false);
        groupArrowPane.addPainter(newGroupCollapseExpandArrowPainter(group));

        let groupPane = new Pane(newColumnLayout(), false);
        groupPane.addPane(groupArrowPane, 0);
        groupPane.addPane(groupLabelPane, 1);

        let groupButton = newInsetPane(groupPane, groupLabelInsets, bgColor);


        let redrawLabel = function () {
            groupLabel.text = group.label;
            drawable.redraw();
        }
        group.attrsChanged.on(redrawLabel);
        /// handle rollup group row ///

        let groupHeaderHighlight = new Pane(newColumnLayout());
        groupHeaderHighlight.addPane(newSolidPane(groupHighlightColor), 1, { width: 6, height: null });

        let groupHeaderStripe = new Pane(newRowLayout());
        groupHeaderStripe.addPane(new Pane(null), 0, { height: null });
        groupHeaderStripe.addPane(newSolidPane(groupLabelColor), 1, { height: 1 });
        groupHeaderStripe.addPane(new Pane(null), 2, { height: null });

        let rollupRow = model.row(group.rollupGuid);
        let groupHeaderPane: Pane = null;
        let groupHeaderUnderlay: Pane = null;
        if (rollupRow) {

            let rowBackgroundPanes = newRowBackgroundPanes(args, group.rowGuids, rollupRow);
            let rowBackgroundPane = rowBackgroundPanes.rowBackgroundPane;
            let rowInsetPane = rowBackgroundPanes.rowInsetPane;

            let rollupUi = ui.rowUi(rollupRow.rowGuid);

            // expose panes in api via TimelineRowUi
            rollupUi.addPane('background', rowBackgroundPane);
            rollupUi.addPane('inset', rowInsetPane);

            let rollupDataAxis = rollupRow.dataAxis;

            let rollupContentPane: Pane = null;
            let rollupPaneFactory: TimelineRowPaneFactory = null;
            let rollupContentOptions = { timelineFont: font, timelineFgColor: fgColor, draggableEdgeWidth: draggableEdgeWidth, snapToDistance: snapToDistance, isMaximized: false, mouseWheelListener: args.options.mouseWheelListener };
            let refreshRollupContentPane = function () {
                let newRollupPaneFactory = (rollupUi.paneFactory || rowPaneFactoryChooser(rollupRow));
                if (newRollupPaneFactory !== rollupPaneFactory) {
                    if (rollupContentPane) {
                        rollupContentPane.dispose.fire();
                        rowInsetPane.removePane(rollupContentPane);
                    }
                    rollupPaneFactory = newRollupPaneFactory;
                    rollupContentPane = (rollupPaneFactory && rollupPaneFactory(drawable, timeAxis, rollupDataAxis, model, rollupRow, ui, rollupContentOptions));
                    if (rollupContentPane) {
                        rowInsetPane.addPane(rollupContentPane);
                    }
                    drawable.redraw();
                }
            };

            rollupUi.paneFactoryChanged.on(refreshRollupContentPane);
            rollupRow.attrsChanged.on(refreshRollupContentPane);
            rollupRow.eventGuids.valueAdded.on(refreshRollupContentPane);
            rollupRow.eventGuids.valueRemoved.on(refreshRollupContentPane);
            rollupRow.timeseriesGuids.valueAdded.on(refreshRollupContentPane);
            rollupRow.timeseriesGuids.valueRemoved.on(refreshRollupContentPane);
            refreshRollupContentPane();

            let groupButtonHeaderUnderlay = new Pane(newColumnLayout());
            groupButtonHeaderUnderlay.addPane(groupHeaderHighlight, 0, { ignoreHeight: true });
            groupButtonHeaderUnderlay.addPane(groupButton, 1);
            groupButtonHeaderUnderlay.addPane(groupHeaderStripe, 2, { ignoreHeight: true });

            groupHeaderUnderlay = new Pane(newColumnLayout());
            groupHeaderUnderlay.addPainter(newBackgroundPainter(bgColor));
            groupHeaderUnderlay.addPane(groupButtonHeaderUnderlay, 0, { width: rowLabelPaneWidth });
            groupHeaderUnderlay.addPane(rowBackgroundPane, 1, { width: null });

            groupHeaderPane = groupHeaderUnderlay;
        }
        else {

            groupHeaderUnderlay = new Pane(newColumnLayout());
            groupHeaderUnderlay.addPainter(newBackgroundPainter(bgColor));
            groupHeaderUnderlay.addPane(groupHeaderHighlight, 0, { ignoreHeight: true });
            groupHeaderUnderlay.addPane(groupButton, 1);
            groupHeaderUnderlay.addPane(groupHeaderStripe, 2, { ignoreHeight: true });
            groupHeaderUnderlay
            let groupHeaderOverlay = newTimeAxisPane(args, null);
            let groupHeaderOverlayInsets = newInsets(0, 0, 0, rowLabelPaneWidth);

            groupHeaderPane = new Pane(newOverlayLayout());
            groupHeaderPane.addPane(groupHeaderUnderlay, true);
            groupHeaderPane.addPane(newInsetPane(groupHeaderOverlay, groupHeaderOverlayInsets, null, false), false);

        }

        let groupContentPane = new Pane(newRowLayout());

        timelineContentPane.updateLayoutArgs(function (layoutArg: any): any {
            let shift = (isNumber(layoutArg) && layoutArg >= 2 * groupIndex);
            return (shift ? layoutArg + 2 : layoutArg);
        });
        timelineContentPane.addPane(groupHeaderPane, 2 * groupIndex);
        timelineContentPane.addPane(groupContentPane, 2 * groupIndex + 1, { hide: group.collapsed });
        groupHeaderPanes[groupGuid] = groupHeaderPane;
        groupContentPanes[groupGuid] = groupContentPane;

        let groupAttrsChanged = function (group: TimelineGroup) {
            let groupContentLayoutOpts = timelineContentPane.layoutOptions(groupContentPane);
            let groupHighlightLayoutOpts = groupHeaderUnderlay.layoutOptions(groupHeaderHighlight);
            let redraw = false;
            if (group.highlighted !== (!groupHighlightLayoutOpts.hide)) {
                groupHighlightLayoutOpts.hide = !group.highlighted;
                redraw = true;
            }
            if (group.collapsed !== groupContentLayoutOpts.hide) {
                groupContentLayoutOpts.hide = group.collapsed;
                redraw = true;
            }
            if (redraw) {
                drawable.redraw();
            }
        }.bind(this, group);
        group.attrsChanged.on(groupAttrsChanged);
        groupAttrsChanged();

        groupButton.mouseDown.on(function (ev: PointerEvent) {
            if (isLeftMouseDown(ev.mouseEvent)) {
                group.collapsed = !group.collapsed;
            }
        });

        // Handle hidden property
        //

        timelineContentPane.layoutOptions(groupContentPane).hide = group.hidden;
        timelineContentPane.layoutOptions(groupHeaderPane).hide = group.hidden;

        setupRowContainerPane(args, groupContentPane, group.rowGuids, false, group.groupGuid);

        groupContentPane.dispose.on(function () {
            group.attrsChanged.off(redrawLabel);
            group.attrsChanged.off(groupAttrsChanged);
        });

    };
    root.groupGuids.forEach(addGroup);
    root.groupGuids.valueAdded.on(addGroup);

    let moveGroup = function (groupGuid: string, groupOldIndex: number, groupNewIndex: number) {
        let nMin = Math.min(groupOldIndex, groupNewIndex);
        let nMax = Math.max(groupOldIndex, groupNewIndex);
        for (let n = nMin; n <= nMax; n++) {
            let groupGuid = root.groupGuids.valueAt(n);
            timelineContentPane.setLayoutArg(groupHeaderPanes[groupGuid], 2 * n);
            timelineContentPane.setLayoutArg(groupContentPanes[groupGuid], 2 * n + 1);
        }

        drawable.redraw();
    };
    root.groupGuids.valueMoved.on(moveGroup);

    let removeGroup = function (groupGuid: string, groupIndex: number) {
        let contentPane: Pane = groupContentPanes[groupGuid];
        let headerPane: Pane = groupHeaderPanes[groupGuid];
        contentPane.dispose.fire();
        headerPane.dispose.fire();
        timelineContentPane.removePane(contentPane);
        timelineContentPane.removePane(headerPane);
        timelineContentPane.updateLayoutArgs(function (layoutArg: any): any {
            let shift = (isNumber(layoutArg) && layoutArg > 2 * groupIndex + 1);
            return (shift ? layoutArg - 2 : layoutArg);
        });
        delete groupHeaderPanes[groupGuid];
        delete groupContentPanes[groupGuid];

        drawable.redraw();
    };
    root.groupGuids.valueRemoved.on(removeGroup);

    // Handle listing for hidden property
    //

    let groupAttrsChangedListeners = {};

    let attachGroupAttrsChangedListener = function (groupGuid: string, groupIndex: number) {
        let group = model.group(groupGuid);
        let groupAttrsChangedListener = function () {
            if (hasval(group.hidden) && hasval(groupContentPanes[groupGuid])) {

                timelineContentPane.layoutOptions(groupContentPanes[groupGuid]).hide = group.hidden;
                timelineContentPane.layoutOptions(groupHeaderPanes[groupGuid]).hide = group.hidden;
                drawable.redraw();
            }
        };
        groupAttrsChangedListeners[groupGuid] = groupAttrsChangedListener;
        group.attrsChanged.on(groupAttrsChangedListener);
    };

    let unattachGroupAttrsChangedListener = function (groupGuid: string, groupIndex: number) {
        let group = model.group(groupGuid);
        group.attrsChanged.off(groupAttrsChangedListeners[groupGuid]);
    }

    root.groupGuids.forEach(attachGroupAttrsChangedListener);
    root.groupGuids.valueAdded.on(attachGroupAttrsChangedListener);
    root.groupGuids.valueRemoved.on(unattachGroupAttrsChangedListener);

    // Dispose
    //

    timelineContentPane.dispose.on(function () {
        root.groupGuids.valueAdded.off(addGroup);
        root.groupGuids.valueMoved.off(moveGroup);
        root.groupGuids.valueRemoved.off(removeGroup);
    });

    return timelineContentPane;
}

// Row panes and painters
//

function newRowBackgroundPainter(args: TimelineContentPaneArguments, guidList: OrderedStringSet, row: TimelineRowModel) {
    return function (gl: WebGLRenderingContext) {
        let color = hasval(row.bgColor) ? row.bgColor : (guidList.indexOf(row.rowGuid) % 2 ? args.options.rowBgColor : args.options.rowAltBgColor);
        gl.clearColor(color.r, color.g, color.b, color.a);
        gl.clear(GL.COLOR_BUFFER_BIT);
    };
}

function newRowBackgroundPanes(args: TimelineContentPaneArguments, guidList: OrderedStringSet, row: TimelineRowModel) {
    let rowBackgroundPane = newTimeAxisPane(args, row);
    rowBackgroundPane.addPainter(newRowBackgroundPainter(args, guidList, row));

    let timeGridOpts = { tickSpacing: args.options.gridTickSpacing, gridColor: args.options.gridColor, referenceDate: args.options.referenceDate };
    rowBackgroundPane.addPainter(newTimeGridPainter(args.timeAxis, false, args.options.gridTimeZone, timeGridOpts));

    let rowInsetTop = args.options.rowSeparatorHeight / 2;
    let rowInsetBottom = args.options.rowSeparatorHeight - rowInsetTop;
    let rowInsetPane = new Pane(newInsetLayout(newInsets(rowInsetTop, 0, rowInsetBottom, 0)), false);
    rowInsetPane.addPainter(newBorderPainter(args.options.bgColor, { thickness: rowInsetTop, drawRight: false, drawLeft: false, drawBottom: false }));
    rowInsetPane.addPainter(newBorderPainter(args.options.bgColor, { thickness: rowInsetBottom, drawRight: false, drawLeft: false, drawTop: false }));
    rowBackgroundPane.addPane(rowInsetPane, true);

    let rowOverlayPane = new Pane(null, false);
    rowOverlayPane.addPainter(newBorderPainter(args.options.rowLabelColor, { drawRight: false, drawTop: false, drawBottom: false }));
    rowBackgroundPane.addPane(rowOverlayPane, false);

    return { rowInsetPane: rowInsetPane, rowBackgroundPane: rowBackgroundPane };
}

function setupRowContainerPane(args: TimelineContentPaneArguments, parentPane: Pane, guidList: OrderedStringSet, isMaximized: boolean, keyPrefix: string) {

    let drawable = args.drawable;
    let scrollLayout = args.scrollLayout;
    let timeAxis = args.timeAxis;
    let model = args.model;
    let ui = args.ui;
    let options = args.options;

    let rowPanes: StringMap<Pane> = {};

    let addRow = function (rowGuid: string, rowIndex: number) {
        let row = model.row(rowGuid);
        let rowUi = ui.rowUi(rowGuid);

        let rowLabelColorBg: Color = hasval(row.bgLabelColor) ? row.bgLabelColor : options.rowLabelBgColor;
        let rowLabelColorFg: Color = hasval(row.fgLabelColor) ? row.fgLabelColor : options.rowLabelColor;
        let rowLabelFont: string = hasval(row.labelFont) ? row.labelFont : options.font;

        let rowLabel = new Label(row.label, rowLabelFont, rowLabelColorFg);
        let rowLabelPane = new Pane({ updatePrefSize: fitToLabel(rowLabel) }, false);
        rowLabelPane.addPainter(newLabelPainter(rowLabel, 0, 0.5, 0, 0.5));

        let rowLabelBackground = new Background(rowLabelColorBg);
        let rowHeaderPane = new Pane(newInsetLayout(options.rowLabelInsets), true);
        rowHeaderPane.addPainter(rowLabelBackground.newPainter());
        rowHeaderPane.addPane(rowLabelPane);

        let rowAttrsChanged = function () {
            rowLabel.text = row.label;
            rowLabel.fgColor = hasval(row.fgLabelColor) ? row.fgLabelColor : options.rowLabelColor;
            rowLabel.font = hasval(row.labelFont) ? row.labelFont : options.font;
            rowLabelBackground.color = hasval(row.bgLabelColor) ? row.bgLabelColor : options.bgColor;
            drawable.redraw();
        }
        row.attrsChanged.on(rowAttrsChanged);

        let rowBackgroundPanes = newRowBackgroundPanes(args, guidList, row);
        let rowBackgroundPane = rowBackgroundPanes.rowBackgroundPane;
        let rowInsetPane = rowBackgroundPanes.rowInsetPane;

        let rowPane = new Pane(newColumnLayout());
        rowPane.addPane(rowHeaderPane, 0, { width: options.rowLabelPaneWidth });
        rowPane.addPane(rowBackgroundPane, 1, { width: null });

        // expose panes in api via TimelineRowUi
        rowUi.addPane(keyPrefix + '-background', rowBackgroundPane);
        rowUi.addPane(keyPrefix + '-inset', rowInsetPane);
        rowUi.addPane(keyPrefix + '-label', rowLabelPane);
        rowUi.addPane(keyPrefix + '-header', rowHeaderPane);

        let rowDataAxis = row.dataAxis;

        let rowContentPane: Pane = null;
        let rowPaneFactory: TimelineRowPaneFactory = null;
        let rowContentOptions = { timelineFont: options.font, timelineFgColor: options.fgColor, draggableEdgeWidth: options.draggableEdgeWidth, snapToDistance: options.snapToDistance, isMaximized: isMaximized, mouseWheelListener: options.mouseWheelListener };
        let refreshRowContentPane = function () {
            let newRowPaneFactory = (rowUi.paneFactory || options.rowPaneFactoryChooser(row));
            if (newRowPaneFactory !== rowPaneFactory) {
                if (rowContentPane) {
                    rowContentPane.dispose.fire();
                    rowInsetPane.removePane(rowContentPane);
                }
                rowPaneFactory = newRowPaneFactory;
                rowContentPane = (rowPaneFactory && rowPaneFactory(drawable, timeAxis, rowDataAxis, model, row, ui, rowContentOptions));
                if (rowContentPane) {
                    rowInsetPane.addPane(rowContentPane);
                }
                drawable.redraw();
            }
        };

        rowUi.paneFactoryChanged.on(refreshRowContentPane);
        row.attrsChanged.on(refreshRowContentPane);
        row.eventGuids.valueAdded.on(refreshRowContentPane);
        row.eventGuids.valueRemoved.on(refreshRowContentPane);
        row.timeseriesGuids.valueAdded.on(refreshRowContentPane);
        row.timeseriesGuids.valueRemoved.on(refreshRowContentPane);
        refreshRowContentPane();

        parentPane.updateLayoutArgs(function (layoutArg: any): any {
            let shift = (isNumber(layoutArg) && layoutArg >= rowIndex);
            return (shift ? layoutArg + 1 : layoutArg);
        });
        parentPane.addPane(rowPane, rowIndex);
        rowPanes[rowGuid] = rowPane;


        // Handle hidden property
        //
        parentPane.layoutOptions(rowPane).hide = row.hidden;

        drawable.redraw();

        rowPane.dispose.on(function () {
            row.attrsChanged.off(rowAttrsChanged);
            rowUi.paneFactoryChanged.off(refreshRowContentPane);
            row.attrsChanged.off(refreshRowContentPane);
            row.eventGuids.valueAdded.off(refreshRowContentPane);
            row.eventGuids.valueRemoved.off(refreshRowContentPane);
            row.timeseriesGuids.valueAdded.off(refreshRowContentPane);
            row.timeseriesGuids.valueRemoved.off(refreshRowContentPane);

            rowUi.removePane(keyPrefix + '-background');
            rowUi.removePane(keyPrefix + '-inset');
            rowUi.removePane(keyPrefix + '-label');
            rowUi.removePane(keyPrefix + '-header');
        });
    };
    guidList.forEach(addRow);
    guidList.valueAdded.on(addRow);

    let valueMoved = function (rowGuid: string, rowOldIndex: number, rowNewIndex: number) {
        let nMin = Math.min(rowOldIndex, rowNewIndex);
        let nMax = Math.max(rowOldIndex, rowNewIndex);
        for (let n = nMin; n <= nMax; n++) {
            let rowGuid = guidList.valueAt(n);
            parentPane.setLayoutArg(rowPanes[rowGuid], n);
        }

        drawable.redraw();
    };
    guidList.valueMoved.on(valueMoved);

    let removeRow = function (rowGuid: string, rowIndex: number) {
        let pane: Pane = rowPanes[rowGuid];
        pane.dispose.fire();
        parentPane.removePane(pane);
        parentPane.updateLayoutArgs(function (layoutArg: any): any {
            let shift = (isNumber(layoutArg) && layoutArg > rowIndex);
            return (shift ? layoutArg - 1 : layoutArg);
        });
        delete rowPanes[rowGuid];

        drawable.redraw();
    };
    guidList.valueRemoved.on(removeRow);

    // Handle listing for hidden property
    //

    let attrsChangedListeners = {};

    let attachAttrsChangedListener = function (rowGuid: string, rowIndex: number) {
        let row = model.row(rowGuid);
        let attrsChangedListener = function () {
            if (hasval(row.hidden && hasval(rowPanes[rowGuid]))) {
                parentPane.layoutOptions(rowPanes[rowGuid]).hide = row.hidden;
                drawable.redraw();
            }
        };
        attrsChangedListeners[rowGuid] = attrsChangedListener;
        row.attrsChanged.on(attrsChangedListener);
    };

    let unattachAttrsChangedListener = function (rowGuid: string, rowIndex: number) {
        let row = model.row(rowGuid);
        row.attrsChanged.off(attrsChangedListeners[rowGuid]);
    }

    guidList.forEach(attachAttrsChangedListener);
    guidList.valueAdded.on(attachAttrsChangedListener);
    guidList.valueRemoved.on(unattachAttrsChangedListener);

    // Redraw
    //

    drawable.redraw();

    // Dispose

    parentPane.dispose.on(function () {
        guidList.valueAdded.off(addRow);
        guidList.valueMoved.off(valueMoved);
        guidList.valueRemoved.off(removeRow);

        guidList.valueAdded.off(attachAttrsChangedListener);
        guidList.valueRemoved.off(unattachAttrsChangedListener);
    });
}



