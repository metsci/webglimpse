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
module Webglimpse {


    export class TimelinePane extends Pane {
        private _model : TimelineModel;
        private _ui : TimelineUi;

        constructor( layout : Layout, model : TimelineModel, ui : TimelineUi ) {
            super( layout, true );
            this._model = model;
            this._ui = ui;
        }

        get model( ) : TimelineModel { return this._model; }
        get ui( ) : TimelineUi { return this._ui; }
    }



    export interface TimelinePaneOptions {

        // Misc
        font? : string;
        // Options:
        // 'none' or any falsy value : no time selection
        // 'single'                  : single selected time
        // 'range'                   : range of selected times
        selectedIntervalMode? : string;
        scrollbarOptions? : ScrollbarOptions;
        rowPaneFactoryChooser? : TimelineRowPaneFactoryChooser;

        // Colors
        fgColor? : Color;
        rowLabelColor? : Color;
        groupLabelColor? : Color;
        axisLabelColor? : Color;
        bgColor? : Color;
        rowBgColor? : Color;
        rowAltBgColor? : Color;
        gridColor? : Color;
        selectedIntervalFillColor? : Color;
        selectedIntervalBorderColor? : Color;

        // Axes
        showTopAxis? : boolean;
        showBottomAxis? : boolean;
        topTimeZone? : string;
        bottomTimeZone? : string;
        tickSpacing? : number;

        // Sizing
        groupLabelInsets? : Insets;
        rowLabelInsets? : Insets;
        rowLabelPaneWidth? : number;
        rowSeparatorHeight? : number;
        scrollbarWidth? : number;
        axisPaneHeight? : number;
        draggableEdgeWidth? : number;
        snapToDistance? : number;
    }

    export function newTimelinePane( drawable : Drawable, timeAxis : TimeAxis1D, model : TimelineModel, options? : TimelinePaneOptions, ui? : TimelineUi ) : TimelinePane {

        // Misc
        var font                   = ( hasval( options ) && hasval( options.font ) ? options.font : '11px verdana,sans-serif' );
        var selectedIntervalMode = ( hasval( options ) && hasval( options.selectedIntervalMode ) ? options.selectedIntervalMode : 'range' );
        var scrollbarOptions       = ( hasval( options ) ? options.scrollbarOptions : null );
        var rowPaneFactoryChooser  = ( hasval( options ) && hasval( options.rowPaneFactoryChooser ) ? options.rowPaneFactoryChooser : rowPaneFactoryChooser_DEFAULT );

        // Colors
        var fgColor                     = ( hasval( options ) && hasval( options.fgColor                     ) ? options.fgColor                     : white                      );
        var rowLabelColor               = ( hasval( options ) && hasval( options.rowLabelColor               ) ? options.rowLabelColor               : fgColor                    );
        var groupLabelColor             = ( hasval( options ) && hasval( options.groupLabelColor             ) ? options.groupLabelColor             : fgColor                    );
        var axisLabelColor              = ( hasval( options ) && hasval( options.axisLabelColor              ) ? options.axisLabelColor              : fgColor                    );
        var bgColor                     = ( hasval( options ) && hasval( options.bgColor                     ) ? options.bgColor                     : rgb( 0.098, 0.165, 0.243 ) );
        var rowBgColor                  = ( hasval( options ) && hasval( options.rowBgColor                  ) ? options.rowBgColor                  : rgb( 0.020, 0.086, 0.165 ) );
        var rowAltBgColor               = ( hasval( options ) && hasval( options.rowAltBgColor               ) ? options.rowAltBgColor               : rgb( 0.020, 0.086, 0.165 ) );
        var gridColor                   = ( hasval( options ) && hasval( options.gridColor                   ) ? options.gridColor                   : gray( 0.5 )                );
        var selectedIntervalFillColor   = ( hasval( options ) && hasval( options.selectedIntervalFillColor   ) ? options.selectedIntervalFillColor   : rgba( 0, 0.6, 0.8, 0.157 ) );
        var selectedIntervalBorderColor = ( hasval( options ) && hasval( options.selectedIntervalBorderColor ) ? options.selectedIntervalBorderColor : rgb( 0, 0.2, 1.0 )         );

        // Axes
        var showTopAxis      = ( hasval( options ) && hasval( options.showTopAxis    ) ? options.showTopAxis    : true    );
        var showBottomAxis   = ( hasval( options ) && hasval( options.showBottomAxis ) ? options.showBottomAxis : true    );
        var topTimeZone      = ( hasval( options ) && hasval( options.topTimeZone    ) ? options.topTimeZone    : '+0000' );
        var bottomTimeZone   = ( hasval( options ) && hasval( options.bottomTimeZone ) ? options.bottomTimeZone : '+0000' );
        var tickSpacing      = ( hasval( options ) && hasval( options.tickSpacing    ) ? options.tickSpacing    : 60      );

        // Sizing
        var groupLabelInsets   = ( hasval( options ) && hasval( options.groupLabelInsets   ) ? options.groupLabelInsets   : newInsets( 6, 10 ) );
        var rowLabelInsets     = ( hasval( options ) && hasval( options.rowLabelInsets     ) ? options.rowLabelInsets     : newInsets( 0, 20 ) );
        var rowLabelPaneWidth  = ( hasval( options ) && hasval( options.rowLabelPaneWidth  ) ? options.rowLabelPaneWidth  : 120 );
        var rowSeparatorHeight = ( hasval( options ) && hasval( options.rowSeparatorHeight ) ? options.rowSeparatorHeight : 2   );
        var scrollbarWidth     = ( hasval( options ) && hasval( options.scrollbarWidth     ) ? options.scrollbarWidth     : 16  );
        var axisPaneHeight     = ( hasval( options ) && hasval( options.axisPaneHeight     ) ? options.axisPaneHeight     : 40  );
        var draggableEdgeWidth = ( hasval( options ) && hasval( options.draggableEdgeWidth ) ? options.draggableEdgeWidth : 6   );
        var snapToDistance     = ( hasval( options ) && hasval( options.snapToDistance     ) ? options.snapToDistance     : 10  );

        if ( !ui ) {
            ui = new TimelineUi( model );
        }
        var selection = ui.selection;

        var redraw = function( ) {
            drawable.redraw( );
        };
        selection.selectedInterval.changed.on( redraw );
        selection.hoveredEvent.changed.on( redraw );
        selection.selectedEvents.valueAdded.on( redraw );
        selection.selectedEvents.valueRemoved.on( redraw );

        var tickTimeZone = ( showTopAxis ? topTimeZone : bottomTimeZone );
        var contentPaneOpts = { selectedIntervalMode: selectedIntervalMode, rowPaneFactoryChooser: rowPaneFactoryChooser, font: font, fgColor: fgColor, rowLabelColor: rowLabelColor, groupLabelColor: groupLabelColor, axisLabelColor: axisLabelColor, bgColor: bgColor, rowBgColor: rowBgColor, rowAltBgColor: rowAltBgColor, gridColor: gridColor, gridTickSpacing: tickSpacing, gridTimeZone: tickTimeZone, groupLabelInsets: groupLabelInsets, rowLabelInsets: rowLabelInsets, rowLabelPaneWidth: rowLabelPaneWidth, rowSeparatorHeight: rowSeparatorHeight, draggableEdgeWidth: draggableEdgeWidth, snapToDistance: snapToDistance };
        var contentPane = newTimelineContentPane( drawable, timeAxis, model, ui, contentPaneOpts );

        var scrollLayout = newVerticalScrollLayout( );
        var scrollable = new Pane( scrollLayout, false );
        scrollable.addPane( contentPane, 0 );

        var scrollbar = newVerticalScrollbar( scrollLayout, drawable, scrollbarOptions );

        var scrollPane = new Pane( newColumnLayout( false ), false );
        scrollPane.addPane( scrollbar, 0, { width: scrollbarWidth, ignoreHeight: true } );
        scrollPane.addPane( scrollable, 1 );

        var underlayPane = new Pane( newTimelineLayout( axisPaneHeight ) );
        var axisInsets = newInsets( 0, scrollbarWidth, 0, rowLabelPaneWidth );

        var axisOpts = { tickSpacing: tickSpacing, font: font, textColor: axisLabelColor, tickColor: axisLabelColor };
        if ( showTopAxis ) {
            var topAxisPane = newTimeAxisPane( timeAxis, ui, draggableEdgeWidth, null, selectedIntervalMode );
            topAxisPane.addPainter( newTimeAxisPainter( timeAxis, Side.TOP, topTimeZone, tickTimeZone, axisOpts ) );
            underlayPane.addPane( newInsetPane( topAxisPane, axisInsets ), Side.TOP );
        }
        underlayPane.addPane( scrollPane );
        if ( showBottomAxis ) {
            var bottomAxisPane = newTimeAxisPane( timeAxis, ui, draggableEdgeWidth, null, selectedIntervalMode );
            bottomAxisPane.addPainter( newTimeAxisPainter( timeAxis, Side.BOTTOM, bottomTimeZone, tickTimeZone, axisOpts ) );
            underlayPane.addPane( newInsetPane( bottomAxisPane, axisInsets ), Side.BOTTOM );
        }

        var updateMillisPerPx = function( ) {
            var w = underlayPane.viewport.w - axisInsets.left - axisInsets.right;
            ui.millisPerPx.value = timeAxis.tSize_MILLIS / w;
        };
        underlayPane.viewportChanged.on( updateMillisPerPx );
        timeAxis.limitsChanged.on( updateMillisPerPx );

        var timelinePane = new TimelinePane( newOverlayLayout( ), model, ui );
        timelinePane.addPainter( newBackgroundPainter( bgColor ) );
        timelinePane.addPane( underlayPane, true );
        
        if ( selectedIntervalMode === 'single' ) {
            var overlayPane = new Pane( null, false, alwaysFalse );
            overlayPane.addPainter( newTimelineSingleSelectionPainter( timeAxis, selection.selectedInterval, selectedIntervalBorderColor, selectedIntervalFillColor ) );
            timelinePane.addPane( newInsetPane( overlayPane, axisInsets, null, false ) );
        }
        else if ( selectedIntervalMode === 'range' ) {
            var overlayPane = new Pane( null, false, alwaysFalse );
            overlayPane.addPainter( newTimelineRangeSelectionPainter( timeAxis, selection.selectedInterval, selectedIntervalBorderColor, selectedIntervalFillColor ) );
            timelinePane.addPane( newInsetPane( overlayPane, axisInsets, null, false ) );
        }
        
        timelinePane.dispose.on( function( ) {
            ui.dispose.fire( );
            selection.selectedInterval.changed.off( redraw );
            selection.hoveredEvent.changed.off( redraw );
            selection.selectedEvents.valueAdded.off( redraw );
            selection.selectedEvents.valueRemoved.off( redraw );
            underlayPane.viewportChanged.off( updateMillisPerPx );
            timeAxis.limitsChanged.off( updateMillisPerPx );
        } );

        return timelinePane;
    }



    function newTimeIntervalMask( timeAxis : TimeAxis1D, interval : TimeIntervalModel ) : Mask2D {
        return function( viewport : BoundsUnmodifiable, i : number, j : number ) : boolean {
            var time_PMILLIS = timeAxis.tAtFrac_PMILLIS( viewport.xFrac( i ) );
            return interval.contains( time_PMILLIS );
        };
    }



    function newTimeAxisPane( timeAxis : TimeAxis1D, ui : TimelineUi, draggableEdgeWidth : number, row : TimelineRowModel, selectedIntervalMode : string ) : Pane {
        var input = ui.input;

        var axisPane = new Pane( newOverlayLayout( ) );
        attachAxisMouseListeners1D( axisPane, timeAxis, false );

        var onMouseMove = function( ev : PointerEvent ) {
            var time_PMILLIS = timeAxis.tAtFrac_PMILLIS( xFrac( ev ) );
            input.mouseMove.fire( ev );
            input.timeHover.fire( time_PMILLIS, ev );
            if ( row ) input.rowHover.fire( row, ev );
        };
        axisPane.mouseMove.on( onMouseMove );

        var onMouseExit = function( ev : PointerEvent ) {
            input.mouseExit.fire( ev );
            input.timeHover.fire( null, ev );
            if ( row ) input.rowHover.fire( null, ev );
        };
        axisPane.mouseExit.on( onMouseExit );

        var onMouseDown = function( ev : PointerEvent ) {
            input.mouseDown.fire( ev );
        };
        axisPane.mouseDown.on( onMouseDown );

        var onMouseUp = function( ev : PointerEvent ) {
            input.mouseUp.fire( ev );
        };
        axisPane.mouseUp.on( onMouseUp );
        
        var onContextMenu = function( ev : PointerEvent ) {
            input.contextMenu.fire( ev );
        };
        axisPane.contextMenu.on( onContextMenu );

        if ( selectedIntervalMode && selectedIntervalMode !== 'none' ) {
            var selection = ui.selection;
            var selectedIntervalPane = new Pane( null, true, newTimeIntervalMask( timeAxis, selection.selectedInterval ) );
            attachTimeSelectionMouseListeners( selectedIntervalPane, timeAxis, selection.selectedInterval, input, draggableEdgeWidth, selectedIntervalMode );
            axisPane.addPane( selectedIntervalPane, false );

            selectedIntervalPane.mouseMove.on( onMouseMove );
            selectedIntervalPane.mouseExit.on( onMouseExit );
            selectedIntervalPane.mouseDown.on( onMouseDown );
            selectedIntervalPane.mouseUp.on( onMouseUp );
            selectedIntervalPane.contextMenu.on( onContextMenu );
        }
        
        // Dispose
        //
        
        // mouse listeners are disposed of automatically by Pane

        return axisPane;
    }

    function timeAtPointer_PMILLIS( timeAxis : TimeAxis1D, ev : PointerEvent ) : number {
        return timeAxis.tAtFrac_PMILLIS( ev.paneViewport.xFrac( ev.i ) );
    }
    

    function attachTimeSelectionMouseListeners( pane : Pane,
                                                timeAxis : TimeAxis1D,
                                                interval : TimeIntervalModel,
                                                input : TimelineInput,
                                                draggableEdgeWidth : number,
                                                selectedIntervalMode : string ) {
        
        if ( selectedIntervalMode === 'single' ) {
            
            var chooseDragMode = function chooseDragMode( ev : PointerEvent ) : string {
                return 'center';
            }
            
            attachTimeIntervalSelectionMouseListeners( pane, timeAxis, interval, input, draggableEdgeWidth, chooseDragMode );

        }
        else if ( selectedIntervalMode === 'range' ) {
            
            // Edges are draggable when interval is at least this wide
            var minIntervalWidthForEdgeDraggability = 3 * draggableEdgeWidth;
    
            // When dragging an edge, the interval cannot be made narrower than this
            //
            // Needs to be greater than minIntervalWidthForEdgeDraggability -- by enough to
            // cover floating-point precision loss -- so a user can't accidentally make
            // the interval so narrow that it can't easily be widened again.
            //
            var minIntervalWidthWhenDraggingEdge = minIntervalWidthForEdgeDraggability + 1;
            
            var chooseDragMode = function chooseDragMode( ev : PointerEvent ) : string {
                var intervalWidth = ( interval.duration_MILLIS ) * ev.paneViewport.w / timeAxis.vSize;
                if ( intervalWidth < minIntervalWidthForEdgeDraggability ) {
                    // If interval isn't very wide, don't try to allow edge dragging
                    return 'center';
                }
                else {
                    var time_PMILLIS = timeAtPointer_PMILLIS( timeAxis, ev );
                    var mouseOffset = ( time_PMILLIS - interval.start_PMILLIS ) * ev.paneViewport.w / timeAxis.vSize;
                    if ( mouseOffset < draggableEdgeWidth ) {
                        // If mouse is near the left edge, drag the interval's start-time
                        return 'start';
                    }
                    else if ( mouseOffset < intervalWidth - draggableEdgeWidth ) {
                        // If mouse is in the center, drag the whole interval
                        return 'center';
                    }
                    else {
                        // If mouse is near the right edge, drag the interval's end-time
                        return 'end';
                    }
                }
            };
            
            attachTimeIntervalSelectionMouseListeners( pane, timeAxis, interval, input, draggableEdgeWidth, chooseDragMode );
        }
    }
        
    function attachTimeIntervalSelectionMouseListeners( pane : Pane,
                                                        timeAxis : TimeAxis1D,
                                                        interval : TimeIntervalModel,
                                                        input : TimelineInput,
                                                        draggableEdgeWidth : number,
                                                        chooseDragMode : ( ev : PointerEvent ) => string ) {
        
        // see comments in attachTimeSelectionMouseListeners( ... )
        var minIntervalWidthForEdgeDraggability = 3 * draggableEdgeWidth;
        var minIntervalWidthWhenDraggingEdge = minIntervalWidthForEdgeDraggability + 1;
        
        // Enable double click to center selection on mouse
        
        input.mouseDown.on( function( ev : PointerEvent ) {
            if ( ev.clickCount > 1 ) {
                var time_PMILLIS = timeAtPointer_PMILLIS( timeAxis, ev );
                interval.pan( time_PMILLIS - ( interval.start_PMILLIS + 0.5*interval.duration_MILLIS ) );
            }
        } );


        // Hook up input notifications
        //

        pane.mouseWheel.on( function( ev : PointerEvent ) {
            var zoomFactor = Math.pow( axisZoomStep, ev.wheelSteps );
            timeAxis.zoom( zoomFactor, timeAxis.vAtFrac( xFrac( ev ) ) );
        } );

        pane.contextMenu.on( function( ev : PointerEvent ) {
            input.contextMenu.fire( ev );
        } );


        // Begin interval-drag
        //

        var dragMode : string = null;
        var dragOffset_MILLIS : number = null;

        pane.mouseMove.on( function( ev : PointerEvent ) {
            if ( !dragMode ) {
                var mouseCursors = { 'center': 'move', 'start': 'w-resize', 'end': 'e-resize' };
                pane.mouseCursor = mouseCursors[ chooseDragMode( ev ) ];
            }
        } );

        pane.mouseDown.on( function( ev : PointerEvent ) {
            dragMode = chooseDragMode( ev );
            if ( !hasval( dragMode ) ) {
                dragOffset_MILLIS = null;
            }
        } );


        // Compute (and remember) the pointer time, for use by the drag listeners below
        //

        var dragPointer_PMILLIS : number = null;

        var updateDragPointer = function( ev : PointerEvent ) {
            if ( dragMode ) {
                dragPointer_PMILLIS = timeAtPointer_PMILLIS( timeAxis, ev );
            }
        };
        pane.mouseDown.on( updateDragPointer );
        pane.mouseMove.on( updateDragPointer );


        // Dragging interval-center
        //

        var grabCenter = function( ) {
            if ( dragMode === 'center' ) {
                dragOffset_MILLIS = dragPointer_PMILLIS - interval.start_PMILLIS;
            }
        };
        pane.mouseDown.on( grabCenter );

        var dragCenter = function( ) {
            if ( dragMode === 'center' ) {
                var newStart_PMILLIS = ( dragPointer_PMILLIS - dragOffset_MILLIS );
                var newEnd_PMILLIS = interval.end_PMILLIS + ( newStart_PMILLIS - interval.start_PMILLIS );
                interval.setInterval( newStart_PMILLIS, newEnd_PMILLIS );
            }
        };
        pane.mouseMove.on( dragCenter );


        // Dragging interval-start
        //

        var grabStart = function( ) {
            if ( dragMode === 'start' ) {
                dragOffset_MILLIS = dragPointer_PMILLIS - interval.start_PMILLIS;
            }
        };
        pane.mouseDown.on( grabStart );

        var dragStart = function( ) {
            if ( dragMode === 'start' ) {
                var wMin_MILLIS = minIntervalWidthWhenDraggingEdge * timeAxis.vSize / pane.viewport.w;
                var newStart_PMILLIS = dragPointer_PMILLIS - dragOffset_MILLIS;
                interval.start_PMILLIS = Math.min( interval.end_PMILLIS - wMin_MILLIS, newStart_PMILLIS );
            }
        };
        pane.mouseMove.on( dragStart );
        timeAxis.limitsChanged.on( dragStart );


        // Dragging interval-end
        //

        var grabEnd = function( ) {
            if ( dragMode === 'end' ) {
                dragOffset_MILLIS = dragPointer_PMILLIS - interval.end_PMILLIS;
            }
        };
        pane.mouseDown.on( grabEnd );

        var dragEnd = function( ) {
            if ( dragMode === 'end' ) {
                var wMin_MILLIS = minIntervalWidthWhenDraggingEdge * timeAxis.vSize / pane.viewport.w;
                var newEnd_PMILLIS = dragPointer_PMILLIS - dragOffset_MILLIS;
                interval.end_PMILLIS = Math.max( interval.start_PMILLIS + wMin_MILLIS, newEnd_PMILLIS );
                interval.cursor_PMILLIS = interval.end_PMILLIS;
            }
        };
        pane.mouseMove.on( dragEnd );
        timeAxis.limitsChanged.on( dragEnd );


        // Finish interval-drag
        //

        pane.mouseUp.on( function( ev : PointerEvent ) {
            dragOffset_MILLIS = null;
            dragPointer_PMILLIS = null;
            dragMode = null;
        } );
        
        // Dispose
        //
        
        pane.dispose.on( function( ) {
            // mouse listeners are disposed of automatically by Pane
            timeAxis.limitsChanged.off( dragStart );
            timeAxis.limitsChanged.off( dragEnd );
        } );

    }
    
    function newTimelineSingleSelectionPainter( timeAxis : TimeAxis1D, interval : TimeIntervalModel, borderColor : Color, fillColor : Color ) : Painter {

        var program = new Program( xyFrac_VERTSHADER, solid_FRAGSHADER );
        var a_XyFrac = new Attribute( program, 'a_XyFrac' );
        var u_Color = new UniformColor( program, 'u_Color' );

        // holds vertices for fill and border
        var coords = new Float32Array( 12 + 8 );
        var coordsBuffer = newDynamicBuffer( );

        return function( gl : WebGLRenderingContext, viewport : BoundsUnmodifiable ) {
            if ( hasval( interval.cursor_PMILLIS  ) ) {

                var fracSelection = timeAxis.tFrac( interval.cursor_PMILLIS );
                var fracWidth = 1 / viewport.w;
                var fracHeight = 1 / viewport.h;
                var thickWidth = 3 / viewport.w;
                var highlightWidth = 7 / viewport.w;
                var index = 0;
                
                console.log( interval.cursor_PMILLIS );
                
                // fill vertices
                coords[ index++ ] = fracSelection - highlightWidth;
                coords[ index++ ] = 1;
                coords[ index++ ] = fracSelection + highlightWidth;
                coords[ index++ ] = 1;
                coords[ index++ ] = fracSelection - highlightWidth;
                coords[ index++ ] = 0;
                coords[ index++ ] = fracSelection + highlightWidth;
                coords[ index++ ] = 0;
                
                // selection vertices
                index = putQuadXys( coords, index, fracSelection-thickWidth/2, fracSelection+thickWidth/2, 1, 0+fracHeight ); // selection
                
                gl.blendFuncSeparate( GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA, GL.ONE, GL.ONE_MINUS_SRC_ALPHA );
                gl.enable( GL.BLEND );

                program.use( gl );
                coordsBuffer.setData( coords );
                a_XyFrac.setDataAndEnable( gl, coordsBuffer, 2, GL.FLOAT );
                
                u_Color.setData( gl, fillColor );
                gl.drawArrays( GL.TRIANGLE_STRIP, 0, 4 );

                u_Color.setData( gl, borderColor );
                gl.drawArrays( GL.TRIANGLES, 4, 6 );
                
                a_XyFrac.disable( gl );
                program.endUse( gl );
                
                
            }
        };
    }

    function newTimelineRangeSelectionPainter( timeAxis : TimeAxis1D, interval : TimeIntervalModel, borderColor : Color, fillColor : Color ) : Painter {

        var program = new Program( xyFrac_VERTSHADER, solid_FRAGSHADER );
        var a_XyFrac = new Attribute( program, 'a_XyFrac' );
        var u_Color = new UniformColor( program, 'u_Color' );

        // holds vertices for fill and border
        var coords = new Float32Array( 12 + 8 + 48 );
        var coordsBuffer = newDynamicBuffer( );

        return function( gl : WebGLRenderingContext, viewport : BoundsUnmodifiable ) {
            if ( hasval( interval.start_PMILLIS ) && hasval( interval.end_PMILLIS ) ) {

                var fracStart = timeAxis.tFrac( interval.start_PMILLIS );
                var fracEnd = timeAxis.tFrac( interval.end_PMILLIS );
                var fracSelection = timeAxis.tFrac( interval.cursor_PMILLIS );
                var fracWidth = 1 / viewport.w;
                var fracHeight = 1 / viewport.h;
                var thickWidth = 3 / viewport.w;
                var index = 0;
                
                // fill vertices
                coords[ index++ ] = fracStart;
                coords[ index++ ] = 1;
                coords[ index++ ] = fracEnd;
                coords[ index++ ] = 1;
                coords[ index++ ] = fracStart;
                coords[ index++ ] = 0;
                coords[ index++ ] = fracEnd;
                coords[ index++ ] = 0;
                
                // border vertices
                index = putQuadXys( coords, index, fracStart, fracEnd-fracWidth, +1, +1-fracHeight ); // top
                index = putQuadXys( coords, index, fracStart+fracWidth, fracEnd, 0+fracHeight, 0 ); // bottom
                index = putQuadXys( coords, index, fracStart, fracStart+fracWidth, 1-fracHeight, 0 ); // left
                index = putQuadXys( coords, index, fracEnd-fracWidth, fracEnd, 1, 0+fracHeight ); // right

                // selection vertices
                index = putQuadXys( coords, index, fracSelection-thickWidth, fracSelection, 1, 0+fracHeight ); // selection
                
                gl.blendFuncSeparate( GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA, GL.ONE, GL.ONE_MINUS_SRC_ALPHA );
                gl.enable( GL.BLEND );

                program.use( gl );
                coordsBuffer.setData( coords );
                a_XyFrac.setDataAndEnable( gl, coordsBuffer, 2, GL.FLOAT );
                
                u_Color.setData( gl, fillColor );
                gl.drawArrays( GL.TRIANGLE_STRIP, 0, 4 );

                u_Color.setData( gl, borderColor );
                gl.drawArrays( GL.TRIANGLES, 4, 30 );
                
                a_XyFrac.disable( gl );
                program.endUse( gl );
                
                
            }
        };
    }



    interface TimelineContentPaneOptions {
        selectedIntervalMode : string;
        rowPaneFactoryChooser : TimelineRowPaneFactoryChooser;

        font : string;
        fgColor : Color;
        rowLabelColor : Color;
        groupLabelColor : Color;
        axisLabelColor : Color;
        bgColor : Color;
        rowBgColor : Color;
        rowAltBgColor : Color;
        gridColor : Color;

        gridTimeZone : string;
        gridTickSpacing : number;

        groupLabelInsets : Insets;
        rowLabelInsets : Insets;
        rowLabelPaneWidth : number;
        rowSeparatorHeight : number;

        draggableEdgeWidth : number;
        snapToDistance : number;
    }



    function newTimelineContentPane( drawable : Drawable, timeAxis : TimeAxis1D, model : TimelineModel, ui : TimelineUi, options : TimelineContentPaneOptions ) : Pane {
        var root = model.root;

        var selectedIntervalMode = options.selectedIntervalMode;
        var rowPaneFactoryChooser = options.rowPaneFactoryChooser;

        var font = options.font;
        var fgColor = options.fgColor;
        var rowLabelColor = options.rowLabelColor;
        var groupLabelColor = options.groupLabelColor;
        var axisLabelColor = options.axisLabelColor;
        var bgColor = options.bgColor;
        var rowBgColor = options.rowBgColor;
        var rowAltBgColor = options.rowAltBgColor;
        var gridColor = options.gridColor;

        var gridTimeZone = options.gridTimeZone;
        var gridTickSpacing = options.gridTickSpacing;

        var groupLabelInsets = options.groupLabelInsets;
        var rowLabelInsets = options.rowLabelInsets;
        var rowLabelPaneWidth = options.rowLabelPaneWidth;
        var rowSeparatorHeight = options.rowSeparatorHeight;

        var draggableEdgeWidth = options.draggableEdgeWidth;
        var snapToDistance = options.snapToDistance;

        var textureRenderer = new TextureRenderer( );
        var createGroupLabelTexture = createTextTextureFactory( font );
        var createRowLabelTexture = createTextTextureFactory( font );


        var timelineContentPane = new Pane( newRowLayout( ) );


        // Group panes
        //

        var groupHeaderPanes : StringMap<Pane> = {};
        var groupContentPanes : StringMap<Pane> = {};

        var addGroup = function( groupGuid : string, groupIndex : number ) {
            var group = model.group( groupGuid );

            var groupLabel = new Label( font, groupLabelColor, group.label );
            var groupLabelPane = new Pane( { updatePrefSize: fitToLabel( groupLabel ) }, false );
            groupLabelPane.addPainter( newLabelPainter( groupLabel, 0, 1, 0, 1 ) );
            var groupButton = newInsetPane( groupLabelPane, groupLabelInsets, bgColor );
            
            var redrawLabel = function( ) {
                groupLabel.text = group.label;
                drawable.redraw( );
            }
            group.attrsChanged.on( redrawLabel );

            var groupHeaderStripe = new Pane( newRowLayout( ) );
            groupHeaderStripe.addPane( new Pane( null ), 0, { height: null } );
            groupHeaderStripe.addPane( newSolidPane( groupLabelColor ), 1, { height: 1 } );
            groupHeaderStripe.addPane( new Pane( null ), 2, { height: null } );

            var groupHeaderUnderlay = new Pane( newColumnLayout( ) );
            groupHeaderUnderlay.addPainter( newBackgroundPainter( bgColor ) );
            groupHeaderUnderlay.addPane( groupButton, 0 );
            groupHeaderUnderlay.addPane( groupHeaderStripe, 1, { ignoreHeight: true } );

            var groupHeaderOverlay = newTimeAxisPane( timeAxis, ui, draggableEdgeWidth, null, selectedIntervalMode );
            var groupHeaderOverlayInsets = newInsets( 0, 0, 0, rowLabelPaneWidth );

            var groupHeaderPane = new Pane( newOverlayLayout( ) );
            groupHeaderPane.addPane( groupHeaderUnderlay, true );
            groupHeaderPane.addPane( newInsetPane( groupHeaderOverlay, groupHeaderOverlayInsets, null, false ), false );


            var groupContentPane = new Pane( newRowLayout( ) );

            timelineContentPane.updateLayoutArgs( function( layoutArg : any ) : any {
                var shift = ( isNumber( layoutArg ) && layoutArg >= 2*groupIndex );
                return ( shift ? layoutArg + 2 : layoutArg );
            } );
            timelineContentPane.addPane( groupHeaderPane, 2*groupIndex );
            timelineContentPane.addPane( groupContentPane, 2*groupIndex + 1, { hide: group.collapsed } );
            groupHeaderPanes[ groupGuid ] = groupHeaderPane;
            groupContentPanes[ groupGuid ] = groupContentPane;

            var groupAttrsChanged = function( ) {
                var groupContentLayoutOpts = timelineContentPane.layoutOptions( groupContentPane );
                if ( group.collapsed !== groupContentLayoutOpts.hide ) {
                    groupContentLayoutOpts.hide = group.collapsed;
                    drawable.redraw( );
                }
            };
            group.attrsChanged.on( groupAttrsChanged );

            groupButton.mouseDown.on( function( ) {
                group.collapsed = !group.collapsed;
            } );


            // Row panes
            //

            function newRowBackgroundPainter( group : TimelineGroupModel, row : TimelineRowModel ) {
                return function( gl : WebGLRenderingContext ) {
                    var color = ( group.rowGuids.indexOf( row.rowGuid ) % 2 ? rowBgColor : rowAltBgColor );
                    gl.clearColor( color.r, color.g, color.b, color.a );
                    gl.clear( GL.COLOR_BUFFER_BIT );
                };
            }

            var rowPanes : StringMap<Pane> = {};

            var addRow = function( rowGuid : string, rowIndex : number ) {
                var row = model.row( rowGuid );
                var rowUi = ui.rowUi( rowGuid );

                var rowLabel = new Label( font, rowLabelColor, row.label );
                var rowLabelPane = new Pane( { updatePrefSize: fitToLabel( rowLabel ) }, false );
                rowLabelPane.addPainter( newLabelPainter( rowLabel, 0, 0.5, 0, 0.5 ) );
                var rowHeaderPane = newInsetPane( rowLabelPane, rowLabelInsets, bgColor );
                
                var rowAttrsChanged = function( ) {
                    rowLabel.text = row.label;
                    drawable.redraw( );
                }
                row.attrsChanged.on( rowAttrsChanged );

                var rowBackgroundPane = newTimeAxisPane( timeAxis, ui, draggableEdgeWidth, row, selectedIntervalMode );
                rowBackgroundPane.addPainter( newRowBackgroundPainter( group, row ) );

                var timeGridOpts = { tickSpacing: gridTickSpacing, gridColor: gridColor };
                rowBackgroundPane.addPainter( newTimeGridPainter( timeAxis, false, gridTimeZone, timeGridOpts ) );

                var rowInsetTop = rowSeparatorHeight/2;
                var rowInsetBottom = rowSeparatorHeight - rowInsetTop;
                var rowInsetPane = new Pane( newInsetLayout( newInsets( rowInsetTop, 0, rowInsetBottom, 0 ) ), false );
                rowInsetPane.addPainter( newBorderPainter( bgColor, { thickness: rowInsetTop, drawRight: false, drawLeft: false, drawBottom: false } ) );
                rowInsetPane.addPainter( newBorderPainter( bgColor, { thickness: rowInsetBottom, drawRight: false, drawLeft: false, drawTop: false } ) );
                rowBackgroundPane.addPane( rowInsetPane, true );

                var rowOverlayPane = new Pane( null, false );
                rowOverlayPane.addPainter( newBorderPainter( rowLabelColor, { drawRight: false, drawTop: false, drawBottom: false } ) );
                rowBackgroundPane.addPane( rowOverlayPane, false );

                var rowPane = new Pane( newColumnLayout( ) );
                rowPane.addPane( rowHeaderPane, 0, { width: rowLabelPaneWidth } );
                rowPane.addPane( rowBackgroundPane, 1, { width: null } );
                
                var rowDataAxis = row.dataAxis;

                var rowContentPane : Pane = null;
                var rowPaneFactory : TimelineRowPaneFactory = null;
                var rowContentOptions = { timelineFont: font, timelineFgColor: fgColor, draggableEdgeWidth: draggableEdgeWidth, snapToDistance: snapToDistance };
                var refreshRowContentPane = function( ) {
                    // The current row-panes don't clean up after themselves very well. Until that's fixed,
                    // avoid switching row-panes in the common case: content is cleared and re-added, causing
                    // the row-pane to switch to null and then back to its original value. To avoid that,
                    // only switch row-panes if newRowPaneFactory is truthy.
                    var newRowPaneFactory = ( rowUi.paneFactory || rowPaneFactoryChooser( row ) );
                    if ( newRowPaneFactory !== rowPaneFactory && newRowPaneFactory ) {
                        if ( rowContentPane ) {
                            rowContentPane.dispose.fire( );
                            rowInsetPane.removePane( rowContentPane );
                        }
                        rowPaneFactory = newRowPaneFactory;
                        rowContentPane = ( rowPaneFactory && rowPaneFactory( drawable, timeAxis, rowDataAxis, model, group, row, ui, rowContentOptions ) );
                        if ( rowContentPane ) {
                            rowInsetPane.addPane( rowContentPane );
                        }
                        drawable.redraw( );
                    }
                };

                rowUi.paneFactoryChanged.on( refreshRowContentPane );
                row.attrsChanged.on( refreshRowContentPane );
                row.eventGuids.valueAdded.on( refreshRowContentPane );
                row.eventGuids.valueRemoved.on( refreshRowContentPane );
                row.timeseriesGuids.valueAdded.on( refreshRowContentPane );
                row.timeseriesGuids.valueRemoved.on( refreshRowContentPane );
                refreshRowContentPane( );

                groupContentPane.updateLayoutArgs( function( layoutArg : any ) : any {
                    var shift = ( isNumber( layoutArg ) && layoutArg >= rowIndex );
                    return ( shift ? layoutArg + 1 : layoutArg );
                } );
                groupContentPane.addPane( rowPane, rowIndex );
                rowPanes[ rowGuid ] = rowPane;

                drawable.redraw( );
                
                rowPane.dispose.on( function( ) {
                    row.attrsChanged.off( rowAttrsChanged );
                    rowUi.paneFactoryChanged.off( refreshRowContentPane );
                    row.attrsChanged.off( refreshRowContentPane );
                    row.eventGuids.valueAdded.off( refreshRowContentPane );
                    row.eventGuids.valueRemoved.off( refreshRowContentPane );
                    row.timeseriesGuids.valueAdded.off( refreshRowContentPane );
                    row.timeseriesGuids.valueRemoved.off( refreshRowContentPane );
                } );
            };
            group.rowGuids.forEach( addRow );
            group.rowGuids.valueAdded.on( addRow );

            var valueMoved = function( rowGuid : string, rowOldIndex : number, rowNewIndex : number ) {
                var nMin = Math.min( rowOldIndex, rowNewIndex );
                var nMax = Math.max( rowOldIndex, rowNewIndex );
                for ( var n = nMin; n <= nMax; n++ ) {
                    var rowGuid = group.rowGuids.valueAt( n );
                    groupContentPane.setLayoutArg( rowPanes[ rowGuid ], n );
                }

                drawable.redraw( );
            };
            group.rowGuids.valueMoved.on( valueMoved );

            var valueRemoved = function( rowGuid : string, rowIndex : number ) {
                groupContentPane.removePane( rowPanes[ rowGuid ] );
                groupContentPane.updateLayoutArgs( function( layoutArg : any ) : any {
                    var shift = ( isNumber( layoutArg ) && layoutArg > rowIndex );
                    return ( shift ? layoutArg - 1 : layoutArg );
                } );
                delete rowPanes[ rowGuid ];

                drawable.redraw( );
            };
            group.rowGuids.valueRemoved.on( valueRemoved );


            // Redraw
            //

            drawable.redraw( );
            
            // Dispose
            
            groupContentPane.dispose.on( function( ) {
                group.attrsChanged.off( redrawLabel );
                
                group.attrsChanged.off( groupAttrsChanged );
                
                group.rowGuids.valueAdded.off( addRow );
                
                group.rowGuids.valueMoved.off( valueMoved );
                group.rowGuids.valueRemoved.off( valueRemoved );
           } );
        };
        root.groupGuids.forEach( addGroup );
        root.groupGuids.valueAdded.on( addGroup );

        var groupGuidsValueMoved = function( groupGuid : string, groupOldIndex : number, groupNewIndex : number ) {
            var nMin = Math.min( groupOldIndex, groupNewIndex );
            var nMax = Math.max( groupOldIndex, groupNewIndex );
            for ( var n = nMin; n <= nMax; n++ ) {
                var groupGuid = root.groupGuids.valueAt( n );
                timelineContentPane.setLayoutArg( groupHeaderPanes[ groupGuid ], 2*n );
                timelineContentPane.setLayoutArg( groupContentPanes[ groupGuid ], 2*n + 1 );
            }

            drawable.redraw( );
        };
        root.groupGuids.valueMoved.on( groupGuidsValueMoved );
        
        var groupGuidsValueRemoved = function( groupGuid : string, groupIndex : number ) {
            timelineContentPane.removePane( groupContentPanes[ groupGuid ] );
            timelineContentPane.removePane( groupHeaderPanes[ groupGuid ] );
            timelineContentPane.updateLayoutArgs( function( layoutArg : any ) : any {
                var shift = ( isNumber( layoutArg ) && layoutArg > 2*groupIndex + 1 );
                return ( shift ? layoutArg - 2 : layoutArg );
            } );
            delete groupHeaderPanes[ groupGuid ];
            delete groupContentPanes[ groupGuid ];

            drawable.redraw( );
        };
        root.groupGuids.valueRemoved.on( groupGuidsValueRemoved );

       // Dispose
        
        timelineContentPane.dispose.on( function( ) {
            root.groupGuids.valueAdded.off( addGroup );
            root.groupGuids.valueMoved.off( groupGuidsValueMoved );
            root.groupGuids.valueRemoved.off( groupGuidsValueRemoved );
        } );

        return timelineContentPane;
    }


}
