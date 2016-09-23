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


    export interface TimelineEventsPainterOptions {
        timelineFont : string;
        timelineFgColor : Color;
        rowTopPadding : number;
        rowBottomPadding : number;
        laneHeight : number;
    }



    export interface TimelineEventsPainterFactory {
        ( drawable : Drawable, timeAxis : TimeAxis1D, lanes : TimelineLaneArray, ui : TimelineUi, options : TimelineEventsPainterOptions ) : Painter;
    }



    export interface TimelineEventsRowPaneOptions {
        rowTopPadding? : number;
        rowBottomPadding? : number;
        laneHeight? : number;
        allowMultipleLanes? : boolean;
        painterFactories? : TimelineEventsPainterFactory[];
    }



    export function newEventsRowPaneFactory( eventsRowOpts? : TimelineEventsRowPaneOptions ) : TimelineRowPaneFactory {

        // Pane Factory
        return function( drawable : Drawable, timeAxis : TimeAxis1D, dataAxis : Axis1D, model : TimelineModel, row : TimelineRowModel, ui : TimelineUi, options : TimelineRowPaneOptions ) : Pane {
            var rowTopPadding      = ( hasval( eventsRowOpts ) && hasval( eventsRowOpts.rowTopPadding    ) ? eventsRowOpts.rowTopPadding    : 6 );
            var rowBottomPadding   = ( hasval( eventsRowOpts ) && hasval( eventsRowOpts.rowBottomPadding ) ? eventsRowOpts.rowBottomPadding : 6 );
            var laneHeight         = ( hasval( eventsRowOpts ) && hasval( eventsRowOpts.laneHeight       ) ? eventsRowOpts.laneHeight       : 33 );
            var painterFactories   = ( hasval( eventsRowOpts ) && hasval( eventsRowOpts.painterFactories ) ? eventsRowOpts.painterFactories : [] );
            var allowMultipleLanes = ( hasval( eventsRowOpts ) && hasval( eventsRowOpts.allowMultipleLanes ) ? eventsRowOpts.allowMultipleLanes : true );

            var timelineFont       = options.timelineFont;
            var timelineFgColor    = options.timelineFgColor;
            var draggableEdgeWidth = options.draggableEdgeWidth;
            var snapToDistance     = options.snapToDistance;

            var rowUi = ui.rowUi( row.rowGuid );
            var input = ui.input;
            var selection = ui.selection;
            
            var lanes = new TimelineLaneArray( model, row, ui, allowMultipleLanes );

            var timeAtCoords_PMILLIS = function( viewport : BoundsUnmodifiable, i : number ) : number {
                return timeAxis.tAtFrac_PMILLIS( viewport.xFrac( i ) );
            };

            var timeAtPointer_PMILLIS = function( ev : PointerEvent ) : number {
                return timeAtCoords_PMILLIS( ev.paneViewport, ev.i );
            };

            var eventAtCoords = function( viewport : BoundsUnmodifiable, i : number, j : number ) : TimelineEventModel {
                var laneNum = Math.floor( ( viewport.jEnd - j - rowTopPadding ) / laneHeight );
                var time_PMILLIS = timeAtCoords_PMILLIS( viewport, i );
                return lanes.eventAt( laneNum, time_PMILLIS );
            };

            var eventAtPointer = function( ev : PointerEvent ) : TimelineEventModel {
                return eventAtCoords( ev.paneViewport, ev.i, ev.j );
            };

            var isInsideAnEvent : Mask2D = function( viewport : BoundsUnmodifiable, i : number, j : number ) : boolean {
                return hasval( eventAtCoords( viewport, i, j ) );
            };


            // Create pane
            //

            var layout = {
                updatePrefSize: function( parentPrefSize : Size ) {
                    parentPrefSize.h = rowTopPadding + rowBottomPadding + Math.max( 1, lanes.length )*laneHeight;
                    parentPrefSize.w = null;
                }
            };
            var rowContentPane = new Pane( layout, true, isInsideAnEvent );

            rowUi.addPane( 'content', rowContentPane );
            
            var painterOptions = { timelineFont: timelineFont, timelineFgColor: timelineFgColor, rowTopPadding: rowTopPadding, rowBottomPadding: rowBottomPadding, laneHeight: laneHeight };
            for ( var n = 0; n < painterFactories.length; n++ ) {
                var createPainter = painterFactories[ n ];
                rowContentPane.addPainter( createPainter( drawable, timeAxis, lanes, ui, painterOptions ) );
            }


            var redraw = function( ) {
                drawable.redraw( );
            };

            row.eventGuids.valueAdded.on( redraw );
            row.eventGuids.valueMoved.on( redraw );
            row.eventGuids.valueRemoved.on( redraw );

            var watchEventAttrs = function( eventGuid : string ) {
                model.event( eventGuid ).attrsChanged.on( redraw );
            };
            row.eventGuids.forEach( watchEventAttrs );
            row.eventGuids.valueAdded.on( watchEventAttrs );

            var removeRedraw = function( eventGuid : string ) {
                model.event( eventGuid ).attrsChanged.off( redraw );
            }
            row.eventGuids.valueRemoved.on( removeRedraw );



            // Used by both sets of listeners to know whether an event-drag is in progress
            var eventDragMode : string = null;



            // Hook up input notifications
            //

            var recentMouseMove : PointerEvent = null;

            rowContentPane.mouseMove.on( function( ev : PointerEvent ) {
                input.mouseMove.fire( ev );
                if ( !eventDragMode ) {
                    input.timeHover.fire( timeAtPointer_PMILLIS( ev ), ev );
                    input.rowHover.fire( row, ev );
                    input.eventHover.fire( eventAtPointer( ev ), ev );
                }
                recentMouseMove = ev;
            } );

            rowContentPane.mouseExit.on( function( ev : PointerEvent ) {
                input.mouseExit.fire( ev );
                if ( !eventDragMode ) {
                    input.timeHover.fire( null, ev );
                    input.rowHover.fire( null, ev );
                    input.eventHover.fire( null, ev );
                }
                recentMouseMove = null;
            } );

            var uiMillisPerPxChanged = function( ) {
                if ( !eventDragMode && recentMouseMove != null ) {
                    var ev = recentMouseMove;
                    input.timeHover.fire( timeAtPointer_PMILLIS( ev ), ev );
                    input.eventHover.fire( eventAtPointer( ev ), ev );
                }
            };
            ui.millisPerPx.changed.on( uiMillisPerPxChanged );
            
            rowContentPane.mouseUp.on( function( ev : PointerEvent ) {
                input.mouseUp.fire( ev );
            } );

            rowContentPane.mouseDown.on( function( ev : PointerEvent ) {
                input.mouseDown.fire( ev );
            } );

            rowContentPane.mouseWheel.on( options.mouseWheelListener );

            rowContentPane.contextMenu.on( function( ev : PointerEvent ) {
                input.contextMenu.fire( ev );
            } );



            // Begin event-drag
            //

            var eventDragEvents : TimelineEventModel[] = [];
            var eventDragOffsets_MILLIS : StringMap<number> = {};
            var eventDragSnapTimes_PMILLIS : number[] = [];


            // Event-edges are draggable for events at least this wide
            var minEventWidthForEdgeDraggability = 3 * draggableEdgeWidth;

            // When dragging an event-edge, the event cannot be made narrower than this
            //
            // Needs to be greater than minEventWidthForEdgeDraggability -- by enough to
            // cover floating-point precision loss -- so a user can't accidentally make
            // an event so narrow that it can't easily be widened again.
            //
            var minEventWidthWhenDraggingEdge = minEventWidthForEdgeDraggability + 1;


            function allUserEditable( events : TimelineEventModel[] ) : boolean {
                for ( var n = 0; n < events.length; n++ ) {
                    if ( !events[ n ].userEditable ) {
                        return false;
                    }
                }
                return true;
            }

            function chooseEventDragMode( ui : TimelineUi, mouseTime_PMILLIS : number, eventDragEvents : TimelineEventModel[] ) : string {
                if ( eventDragEvents.length === 0 ) {
                    // If no events are selected, then we don't have any to drag
                    return null;
                }
                else if ( !allUserEditable( eventDragEvents ) ) {
                    // If any selected event is not user-editable, don't allow editing
                    return 'undraggable';
                }
                else if ( eventDragEvents.length > 1 ) {
                    // If more than one event is selected, don't allow edge dragging
                    return 'center';
                }
                else if ( eventDragEvents.length === 1 ) {
                    var event = eventDragEvents[ 0 ];
                    var pxPerMilli = 1 / ui.millisPerPx.value;
                    var eventWidth = ( event.end_PMILLIS - event.start_PMILLIS ) * pxPerMilli;
                    if ( eventWidth < minEventWidthForEdgeDraggability ) {
                        // If event isn't very wide, don't try to allow edge dragging
                        return 'center';
                    }
                    else {
                        var mouseOffset = ( mouseTime_PMILLIS - event.start_PMILLIS ) * pxPerMilli;
                        if ( mouseOffset < draggableEdgeWidth ) {
                            // If mouse is near the left edge, drag the event's start-time
                            return 'start';
                        }
                        else if ( mouseOffset < eventWidth - draggableEdgeWidth ) {
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

            var updateCursor = function( ) {
                if ( !eventDragMode ) {

                    var mouseCursors = { 'center': 'default', 'start': 'w-resize', 'end': 'e-resize', 'undraggable': 'default' };
                    var hoveredTime_PMILLIS = selection.hoveredTime_PMILLIS.value;
                    
                    // if a multi-selection has been made, update the cursor based on all the events in the multi-selection
                    if ( selection.selectedEvents.length > 1 ) {
                        rowContentPane.mouseCursor = mouseCursors[ chooseEventDragMode( ui, hoveredTime_PMILLIS, selection.selectedEvents.toArray( ) ) ];
                    }
                    else {
                        var hoveredEvent = selection.hoveredEvent.value;
                        var hoveredEvents = ( hasval( hoveredEvent ) ? [ hoveredEvent ] : [] );
                        rowContentPane.mouseCursor = mouseCursors[ chooseEventDragMode( ui, hoveredTime_PMILLIS, hoveredEvents ) ];
                    }
                }
            };
            ui.millisPerPx.changed.on( updateCursor );
            selection.hoveredTime_PMILLIS.changed.on( updateCursor );
            selection.hoveredEvent.changed.on( updateCursor );

            rowContentPane.mouseDown.on( function( ev : PointerEvent ) {
                if ( isLeftMouseDown( ev.mouseEvent ) ) {
                    var eventDragEventsSet = selection.selectedEvents;
                    eventDragEvents = eventDragEventsSet.toArray( );
                    eventDragMode = chooseEventDragMode( ui, timeAtPointer_PMILLIS( ev ), eventDragEvents );
    
                    eventDragSnapTimes_PMILLIS = new Array( );
                    var numSnapTimes = 0;
                    var allEventGuids = row.eventGuids;
                    for ( var n = 0; n < allEventGuids.length; n++ ) {
                        var eventGuid = allEventGuids.valueAt( n );
                        if ( !eventDragEventsSet.hasId( eventGuid ) ) {
                            var event = model.event( eventGuid );
                            eventDragSnapTimes_PMILLIS.push( event.start_PMILLIS );
                            eventDragSnapTimes_PMILLIS.push( event.end_PMILLIS );
                        }
                    }
                    eventDragSnapTimes_PMILLIS.sort( );
                }
            } );

            function findSnapShift_MILLIS( t_PMILLIS : number, maxShift_MILLIS : number ) : number {
                var i = indexNearest( eventDragSnapTimes_PMILLIS, t_PMILLIS );
                if ( i >= 0 )
                {
                    var shift_MILLIS = eventDragSnapTimes_PMILLIS[ i ] - t_PMILLIS;
                    if ( Math.abs( shift_MILLIS ) <= maxShift_MILLIS ) {
                        return shift_MILLIS;
                    }
                }
                return null;
            }


            // Compute (and remember) the pointer time, for use by the event-drag listeners below
            //

            var eventDragPointer_PMILLIS : number = null;

            var updateEventDragPointer = function( ev : PointerEvent ) {
                if ( isLeftMouseDown( ev.mouseEvent ) && eventDragMode ) {
                    eventDragPointer_PMILLIS = timeAtPointer_PMILLIS( ev );
                }
            };
            rowContentPane.mouseDown.on( updateEventDragPointer );
            rowContentPane.mouseMove.on( updateEventDragPointer );


            // Dragging event-center
            //

            var grabEventCenter = function( ) {
                if ( eventDragMode === 'center' ) {
                    for ( var n = 0; n < eventDragEvents.length; n++ ) {
                        var event = eventDragEvents[ n ];
                        eventDragOffsets_MILLIS[ event.eventGuid ] = eventDragPointer_PMILLIS - event.start_PMILLIS;
                    }

                    // If this is a simple click-and-release, leave the mouse-cursor alone --
                    // but once we can tell that it's actually a drag, change to a drag cursor
                    //

                    var beginDrag = function( ) {
                        rowContentPane.mouseCursor = 'move';
                    };
                    rowContentPane.mouseMove.on( beginDrag );
                    var pendingBeginDrag = setTimeout( beginDrag, 300 );

                    var endDrag = function( ) {
                        clearTimeout( pendingBeginDrag );
                        rowContentPane.mouseMove.off( beginDrag );
                        rowContentPane.mouseUp.off( endDrag );
                    };
                    rowContentPane.mouseUp.on( endDrag );
                }
            };
            rowContentPane.mouseDown.on( grabEventCenter );

            var dragEventCenter = function( ) {
                if ( eventDragMode === 'center' ) {
                    var maxSnapShift_MILLIS = snapToDistance * ( timeAxis.tSize_MILLIS / rowContentPane.viewport.w );

                    var snapShift_MILLIS : number = null;
                    for ( var n = 0; n < eventDragEvents.length; n++ ) {
                        var event = eventDragEvents[ n ];
                        var newStart_PMILLIS = ( eventDragPointer_PMILLIS - eventDragOffsets_MILLIS[ event.eventGuid ] );
                        var newEnd_PMILLIS = event.end_PMILLIS + ( newStart_PMILLIS - event.start_PMILLIS );

                        var eventStartSnapShift_MILLIS = findSnapShift_MILLIS( newStart_PMILLIS, maxSnapShift_MILLIS );
                        if ( hasval( eventStartSnapShift_MILLIS ) ) {
                            if ( !hasval( snapShift_MILLIS ) || Math.abs( eventStartSnapShift_MILLIS ) < Math.abs( snapShift_MILLIS )) {
                                snapShift_MILLIS = eventStartSnapShift_MILLIS;
                            }
                        }

                        var eventEndSnapShift_MILLIS = findSnapShift_MILLIS( newEnd_PMILLIS, maxSnapShift_MILLIS );
                        if ( hasval( eventEndSnapShift_MILLIS ) ) {
                            if ( !hasval( snapShift_MILLIS ) || Math.abs( eventEndSnapShift_MILLIS ) < Math.abs( snapShift_MILLIS )) {
                                snapShift_MILLIS = eventEndSnapShift_MILLIS;
                            }
                        }
                    }
                    if ( !hasval( snapShift_MILLIS ) ) {
                        snapShift_MILLIS = 0;
                    }

                    for ( var n = 0; n < eventDragEvents.length; n++ ) {
                        var event = eventDragEvents[ n ];
                        var newStart_PMILLIS = eventDragPointer_PMILLIS - eventDragOffsets_MILLIS[ event.eventGuid ] + snapShift_MILLIS;
                        var newEnd_PMILLIS = event.end_PMILLIS + ( newStart_PMILLIS - event.start_PMILLIS );
                        event.setInterval( newStart_PMILLIS, newEnd_PMILLIS );
                    }
                }
            };
            rowContentPane.mouseMove.on( dragEventCenter );


            // Dragging event-start
            //

            var grabEventStart = function( ) {
                if ( eventDragMode === 'start' ) {
                    for ( var n = 0; n < eventDragEvents.length; n++ ) {
                        var event = eventDragEvents[ n ];
                        eventDragOffsets_MILLIS[ event.eventGuid ] = eventDragPointer_PMILLIS - event.start_PMILLIS;
                    }
                }
            };
            rowContentPane.mouseDown.on( grabEventStart );

            var dragEventStart = function( ) {
                if ( eventDragMode === 'start' ) {
                    var wMin_MILLIS = minEventWidthWhenDraggingEdge * timeAxis.vSize / rowContentPane.viewport.w;
                    var maxSnapShift_MILLIS = snapToDistance * ( timeAxis.tSize_MILLIS / rowContentPane.viewport.w );

                    var snapShift_MILLIS : number = null;
                    for ( var n = 0; n < eventDragEvents.length; n++ ) {
                        var event = eventDragEvents[ n ];
                        var newStart_PMILLIS = eventDragPointer_PMILLIS - eventDragOffsets_MILLIS[ event.eventGuid ];

                        var eventSnapShift_MILLIS = findSnapShift_MILLIS( newStart_PMILLIS, maxSnapShift_MILLIS );
                        if ( hasval( eventSnapShift_MILLIS ) ) {
                            if ( !hasval( snapShift_MILLIS ) || Math.abs( eventSnapShift_MILLIS ) < Math.abs( snapShift_MILLIS )) {
                                snapShift_MILLIS = eventSnapShift_MILLIS;
                            }
                        }
                    }
                    if ( !hasval( snapShift_MILLIS ) ) {
                        snapShift_MILLIS = 0;
                    }

                    for ( var n = 0; n < eventDragEvents.length; n++ ) {
                        var event = eventDragEvents[ n ];
                        var newStart_PMILLIS = eventDragPointer_PMILLIS - eventDragOffsets_MILLIS[ event.eventGuid ] + snapShift_MILLIS;
                        event.start_PMILLIS = Math.min( event.end_PMILLIS - wMin_MILLIS, newStart_PMILLIS );
                    }
                }
            };
            rowContentPane.mouseMove.on( dragEventStart );
            timeAxis.limitsChanged.on( dragEventStart );


            // Dragging event-end
            //

            var grabEventEnd = function( ) {
                if ( eventDragMode === 'end' ) {
                    for ( var n = 0; n < eventDragEvents.length; n++ ) {
                        var event = eventDragEvents[ n ];
                        eventDragOffsets_MILLIS[ event.eventGuid ] = eventDragPointer_PMILLIS - event.end_PMILLIS;
                    }
                }
            };
            rowContentPane.mouseDown.on( grabEventEnd );

            var dragEventEnd = function( ) {
                if ( eventDragMode === 'end' ) {
                    var wMin_MILLIS = minEventWidthWhenDraggingEdge * timeAxis.vSize / rowContentPane.viewport.w;
                    var maxSnapShift_MILLIS = snapToDistance * ( timeAxis.tSize_MILLIS / rowContentPane.viewport.w );

                    var snapShift_MILLIS : number = null;
                    for ( var n = 0; n < eventDragEvents.length; n++ ) {
                        var event = eventDragEvents[ n ];
                        var newEnd_PMILLIS = eventDragPointer_PMILLIS - eventDragOffsets_MILLIS[ event.eventGuid ];

                        var eventSnapShift_MILLIS = findSnapShift_MILLIS( newEnd_PMILLIS, maxSnapShift_MILLIS );
                        if ( hasval( eventSnapShift_MILLIS ) ) {
                            if ( !hasval( snapShift_MILLIS ) || Math.abs( eventSnapShift_MILLIS ) < Math.abs( snapShift_MILLIS )) {
                                snapShift_MILLIS = eventSnapShift_MILLIS;
                            }
                        }
                    }
                    if ( !hasval( snapShift_MILLIS ) ) {
                        snapShift_MILLIS = 0;
                    }

                    for ( var n = 0; n < eventDragEvents.length; n++ ) {
                        var event = eventDragEvents[ n ];
                        var newEnd_PMILLIS = eventDragPointer_PMILLIS - eventDragOffsets_MILLIS[ event.eventGuid ] + snapShift_MILLIS;
                        event.end_PMILLIS = Math.max( event.start_PMILLIS + wMin_MILLIS, newEnd_PMILLIS );
                    }
                }
            };
            rowContentPane.mouseMove.on( dragEventEnd );
            timeAxis.limitsChanged.on( dragEventEnd );


            // Finish event-drag
            //

            rowContentPane.mouseUp.on( function( ev : PointerEvent ) {
                eventDragEvents = [];
                eventDragOffsets_MILLIS = {};
                eventDragSnapTimes_PMILLIS = [];
                eventDragPointer_PMILLIS = null;
                eventDragMode = null;
            } );


            rowContentPane.dispose.on( function( ) {
                lanes.dispose( );
                
                timeAxis.limitsChanged.off( dragEventEnd );
                timeAxis.limitsChanged.off( dragEventStart );
                
                ui.millisPerPx.changed.off( uiMillisPerPxChanged );
                
                ui.millisPerPx.changed.off( updateCursor );
                selection.hoveredTime_PMILLIS.changed.off( updateCursor );
                selection.hoveredEvent.changed.off( updateCursor );
                
                row.eventGuids.valueAdded.off( redraw );
                row.eventGuids.valueMoved.off( redraw );
                row.eventGuids.valueRemoved.off( redraw );
                row.eventGuids.valueRemoved.off( removeRedraw );
                
                row.eventGuids.valueAdded.off( watchEventAttrs );
                
                row.eventGuids.forEach( function( eventGuid : string ) {
                    model.event( eventGuid ).attrsChanged.off( redraw );
                } );
            } );

            return rowContentPane;
        };
    }

    export interface TimelineEventLimitsPainterOptions {
        lineColor? : Color;
        lineThickness? : number;
    }

    function eventLimitsPainterHelper( limitsOpts : TimelineEventLimitsPainterOptions, drawable : Drawable, timeAxis : TimeAxis1D, lanes : TimelineLaneArray, ui : TimelineUi, options : TimelineEventsPainterOptions ) {

        var rowTopPadding    = options.rowTopPadding;
        var rowBottomPadding = options.rowBottomPadding;
        var laneHeight       = options.laneHeight;

        var lineColor               = ( hasval( limitsOpts ) && hasval( limitsOpts.lineColor          ) ? limitsOpts.lineColor        : new Color( 1, 0, 0, 1 ) );
        var lineThickness           = ( hasval( limitsOpts ) && hasval( limitsOpts.lineThickness      ) ? limitsOpts.lineThickness    : 2.5 );
        
        var xyFrac_vColor_VERTSHADER = concatLines(
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

        var program = new Program( xyFrac_vColor_VERTSHADER, varyingColor_FRAGSHADER );
        var a_XyFrac = new Attribute( program, 'a_XyFrac' );
        var a_Color = new Attribute( program, 'a_Color' );
        
        var xys = new Float32Array( 0 );
        var xysBuffer = newDynamicBuffer( );

        var rgbas = new Float32Array( 0 );
        var rgbasBuffer = newDynamicBuffer( );
        
        return {
            paint( indexXys : number, indexRgbas : number, gl : WebGLRenderingContext, viewport : BoundsUnmodifiable ) {
                if ( indexXys > 0 ) {
                    gl.blendFuncSeparate( GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA, GL.ONE, GL.ONE_MINUS_SRC_ALPHA );
                    gl.enable( GL.BLEND );
                    
                    program.use( gl );
                    xysBuffer.setData( xys.subarray( 0, indexXys ) );
                    a_XyFrac.setDataAndEnable( gl, xysBuffer, 2, GL.FLOAT );
                    rgbasBuffer.setData( rgbas.subarray( 0, indexRgbas ) );
                    a_Color.setDataAndEnable( gl, rgbasBuffer, 4, GL.FLOAT );
    
                    gl.drawArrays( GL.TRIANGLES, 0, Math.floor( indexXys / 2 ) );
    
                    a_Color.disable( gl );
                    a_XyFrac.disable( gl );
                    program.endUse( gl );
                }
            },
            ensureCapacity: function( eventCount : number ) {
                var numVertices =  ( 6 * 3 /* triangles */ * eventCount );
                xys = ensureCapacityFloat32( xys, 2*numVertices );
                rgbas = ensureCapacityFloat32( rgbas, 4*numVertices );
            },
            fillEvent: function( laneIndex : number, eventIndex : number, indexXys : number, indexRgbas : number, viewport : BoundsUnmodifiable ) : { indexXys : number; indexRgbas : number } {
                
                var lane : TimelineLane = lanes.lane( laneIndex );
                var event : TimelineEventModel = lane.event( eventIndex );
                
                var wLine = lineThickness / viewport.w;
                var hLine = lineThickness / viewport.h;
                
                var jTop = rowTopPadding + ( laneIndex )*laneHeight;
                var yTop = ( viewport.h - jTop ) / viewport.h;
                var jBottom = rowTopPadding + ( laneIndex + 1 )*laneHeight;
                var yBottom =  ( viewport.h - jBottom ) / viewport.h;
                var yMid = ( yTop + yBottom ) / 2;
                
                var xLeft  = hasval( event.startLimit_PMILLIS ) ? timeAxis.tFrac( event.startLimit_PMILLIS ) : 0;
                var xRight = hasval( event.endLimit_PMILLIS )   ? timeAxis.tFrac( event.endLimit_PMILLIS )   : 1;
                
                indexXys = putQuadXys( xys, indexXys, xLeft, xRight, yMid-hLine/2, yMid+hLine/2 );
                indexXys = putQuadXys( xys, indexXys, xLeft, xLeft-wLine, yTop, yBottom );
                indexXys = putQuadXys( xys, indexXys, xRight, xRight+wLine, yTop, yBottom );
                indexRgbas = putRgbas( rgbas, indexRgbas, lineColor, 18 );
                
                return { indexXys : indexXys, indexRgbas : indexRgbas };
            }
        };
    }
    
    export function newEventLimitsPainterFactory( limitOpts? : TimelineEventLimitsPainterOptions ) : TimelineEventsPainterFactory {

        // Painter Factory
        return function( drawable : Drawable, timeAxis : TimeAxis1D, lanes : TimelineLaneArray, ui : TimelineUi, options : TimelineEventsPainterOptions ) : Painter {
            
            var helper = eventLimitsPainterHelper( limitOpts, drawable, timeAxis, lanes, ui, options );

            // Painter
            return function( gl : WebGLRenderingContext, viewport : BoundsUnmodifiable ) {
                
                var selectedEvents : OrderedSet<TimelineEventModel> = ui.selection.selectedEvents;
                
                //XXX Instead of estimating the number of events we will need to draw ahead of time
                //XXX (difficult because selected events may be present in multiple lanes, so
                //XXX selectedEvents.length might not be sufficient) just make enough space for all events.
                //XXX Potentially quite inefficient with lots of events (and few selected events).
                helper.ensureCapacity( lanes.numEvents );

                var indexXys = 0;
                var indexRgbas = 0;
                
                for ( var l = 0; l < lanes.length; l++ ) {
                    var lane = lanes.lane( l );
                    for ( var e = 0; e < lane.length; e++ ) {
                        var event = lane.event( e );
                        
                        // check whether the event is selected and has limits defined
                        if ( selectedEvents.hasId( event.eventGuid ) && ( hasval( event.startLimit_PMILLIS ) || hasval( event.endLimit_PMILLIS ) ) ) {
                            var indexes = helper.fillEvent( l, e, indexXys, indexRgbas, viewport );
                            indexXys = indexes.indexXys;
                            indexRgbas = indexes.indexRgbas;
                        }
                    }
                }
                
                helper.paint( indexXys, indexRgbas, gl, viewport );
            };
        };
    }


    export enum JointType {
        BEVEL, MITER
    }
    
    export interface TimelineEventBarsPainterOptions {
        topMargin? : number;
        bottomMargin? : number;
        borderThickness? : number;
        cornerType? : JointType;
        defaultColor? : Color;
        defaultBorderColor? : Color;
        selectedBorderColor? : Color;
        
        // minimum pixel width of the event bar
        // when the timeline is zoomed out so that the event bar
        // is smaller than this visible width, the event bar is hidden
        minimumVisibleWidth? : number;
    }
    
    function eventBarPainterHelper( barOpts : TimelineEventBarsPainterOptions, drawable : Drawable, timeAxis : TimeAxis1D, lanes : TimelineLaneArray, ui : TimelineUi, options : TimelineEventsPainterOptions ) {
        var rowTopPadding    = options.rowTopPadding;
        var rowBottomPadding = options.rowBottomPadding;
        var laneHeight       = options.laneHeight;

        var topMargin           = ( hasval( barOpts ) && hasval( barOpts.topMargin           ) ? barOpts.topMargin           : 1.2 );
        var bottomMargin        = ( hasval( barOpts ) && hasval( barOpts.bottomMargin        ) ? barOpts.bottomMargin        : 1.2 );
        var borderThickness     = ( hasval( barOpts ) && hasval( barOpts.borderThickness     ) ? barOpts.borderThickness     : 2 );
        var cornerType          = ( hasval( barOpts ) && hasval( barOpts.cornerType          ) ? barOpts.cornerType          : JointType.BEVEL );
        var defaultColor        = ( hasval( barOpts ) && hasval( barOpts.defaultColor        ) ? barOpts.defaultColor        : options.timelineFgColor.withAlphaTimes( 0.4 ) );
        var defaultBorderColor  = ( hasval( barOpts ) && hasval( barOpts.defaultBorderColor  ) ? barOpts.defaultBorderColor  : null );
        var selectedBorderColor = ( hasval( barOpts ) && hasval( barOpts.selectedBorderColor ) ? barOpts.selectedBorderColor : options.timelineFgColor );
        var minimumVisibleWidth = ( hasval( barOpts ) && hasval( barOpts.minimumVisibleWidth ) ? barOpts.minimumVisibleWidth : 0 );
        
        var selection = ui.selection;
        
        var xyFrac_vColor_VERTSHADER = concatLines(
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

        var program = new Program( xyFrac_vColor_VERTSHADER, varyingColor_FRAGSHADER );
        var a_XyFrac = new Attribute( program, 'a_XyFrac' );
        var a_Color = new Attribute( program, 'a_Color' );

        var xys = new Float32Array( 0 );
        var xysBuffer = newDynamicBuffer( );

        var rgbas = new Float32Array( 0 );
        var rgbasBuffer = newDynamicBuffer( );
        
        return {
            paint( indexXys : number, indexRgbas : number, gl : WebGLRenderingContext, viewport : BoundsUnmodifiable ) {
                if ( indexXys == 0 || indexRgbas == 0 ) return;
                
                gl.blendFuncSeparate( GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA, GL.ONE, GL.ONE_MINUS_SRC_ALPHA );
                gl.enable( GL.BLEND );
                
                program.use( gl );
                xysBuffer.setData( xys.subarray( 0, indexXys ) );
                a_XyFrac.setDataAndEnable( gl, xysBuffer, 2, GL.FLOAT );
                rgbasBuffer.setData( rgbas.subarray( 0, indexRgbas ) );
                a_Color.setDataAndEnable( gl, rgbasBuffer, 4, GL.FLOAT );

                gl.drawArrays( GL.TRIANGLES, 0, Math.floor( indexXys / 2 ) );

                a_Color.disable( gl );
                a_XyFrac.disable( gl );
                program.endUse( gl );
            },
            ensureCapacity: function( eventCount : number ) {
                var numVertices;
                switch ( cornerType ) {
                    case JointType.BEVEL:
                        numVertices = ( 6*( 5 /*quads*/ ) + 3*( 4 /*triangles*/ ) )*eventCount;
                        break;

                    default:
                        numVertices = ( 6*( 5 /*quads*/ ) )*eventCount;
                        break;
                }

                xys = ensureCapacityFloat32( xys, 2*numVertices );
                rgbas = ensureCapacityFloat32( rgbas, 4*numVertices );
            },
            fillEvent: function( laneIndex : number, eventIndex : number, indexXys : number, indexRgbas : number, viewport : BoundsUnmodifiable ) : { indexXys : number; indexRgbas : number } {
                var lane : TimelineLane = lanes.lane( laneIndex );
                var event : TimelineEventModel = lane.event( eventIndex );
                
                var wBorder = borderThickness / viewport.w;
                var hBorder = borderThickness / viewport.h;
                
                var _topMargin = hasval( event.topMargin ) ? event.topMargin : topMargin;
                var _bottomMargin = hasval( event.bottomMargin ) ? event.bottomMargin : bottomMargin;
                
                var jTop = rowTopPadding + ( laneIndex )*laneHeight + _topMargin;
                var yTop = ( viewport.h - jTop ) / viewport.h;
                var jBottom = rowTopPadding + ( laneIndex + 1 )*laneHeight - _bottomMargin;
                var yBottom =  ( viewport.h - jBottom ) / viewport.h;
                
                var xLeft = timeAxis.tFrac( event.start_PMILLIS );
                var xRight = timeAxis.tFrac( event.end_PMILLIS );
                
                var xWidthPixels = viewport.w * ( xRight - xLeft );
                
                if ( !( xRight < 0 || xLeft > 1 ) && xWidthPixels > minimumVisibleWidth ) {

                    // Fill
                    var fillColor = ( event.bgColor || defaultColor );
                    if ( event === selection.hoveredEvent.value ) {
                        fillColor = darker( fillColor, 0.8 );
                    }
                    indexXys = putQuadXys( xys, indexXys, xLeft+wBorder, xRight-wBorder, yTop-hBorder, yBottom+hBorder );
                    indexRgbas = putQuadRgbas( rgbas, indexRgbas, fillColor );

                    // Border
                    var borderColor = ( event.borderColor || ( event.bgColor ? fillColor : null ) || defaultBorderColor || fillColor );
                    if ( selection.selectedEvents.hasValue( event ) ) {
                        borderColor = selectedBorderColor;
                    }
                    if ( borderColor ) {
                        switch ( cornerType ) {
                            case JointType.BEVEL:
                                // Quads
                                indexXys = putQuadXys( xys, indexXys, xLeft, xLeft+wBorder, yTop-hBorder, yBottom+hBorder );
                                indexXys = putQuadXys( xys, indexXys, xRight-wBorder, xRight, yTop-hBorder, yBottom+hBorder );
                                indexXys = putQuadXys( xys, indexXys, xLeft+wBorder, xRight-wBorder, yTop, yTop-hBorder );
                                indexXys = putQuadXys( xys, indexXys, xLeft+wBorder, xRight-wBorder, yBottom+hBorder, yBottom );
                                indexRgbas = putRgbas( rgbas, indexRgbas, borderColor, 24 );
                                // Triangles
                                indexXys = putLowerLeftTriangleXys( xys, indexXys, xRight-wBorder, xRight, yTop, yTop-hBorder );
                                indexXys = putUpperLeftTriangleXys( xys, indexXys, xRight-wBorder, xRight, yBottom+hBorder, yBottom );
                                indexXys = putUpperRightTriangleXys( xys, indexXys, xLeft, xLeft+wBorder, yBottom+hBorder, yBottom );
                                indexXys = putLowerRightTriangleXys( xys, indexXys, xLeft, xLeft+wBorder, yTop, yTop-hBorder );
                                indexRgbas = putRgbas( rgbas, indexRgbas, borderColor, 12 );
                                break;

                            default:
                                indexXys = putQuadXys( xys, indexXys, xLeft, xRight-wBorder, yTop, yTop-hBorder );
                                indexXys = putQuadXys( xys, indexXys, xRight-wBorder, xRight, yTop, yBottom+hBorder );
                                indexXys = putQuadXys( xys, indexXys, xLeft+wBorder, xRight, yBottom+hBorder, yBottom );
                                indexXys = putQuadXys( xys, indexXys, xLeft, xLeft+wBorder, yTop-hBorder, yBottom );
                                indexRgbas = putRgbas( rgbas, indexRgbas, borderColor, 24 );
                                break;
                        }
                    }
                }
                
                return { indexXys : indexXys, indexRgbas : indexRgbas };
            }
        };
    }


    export function newEventBarsPainterFactory( barOpts? : TimelineEventBarsPainterOptions ) : TimelineEventsPainterFactory {

        // Painter Factory
        return function( drawable : Drawable, timeAxis : TimeAxis1D, lanes : TimelineLaneArray, ui : TimelineUi, options : TimelineEventsPainterOptions ) : Painter {
            
            var helper = eventBarPainterHelper( barOpts, drawable, timeAxis, lanes, ui, options );

            // Painter
            return function( gl : WebGLRenderingContext, viewport : BoundsUnmodifiable ) {
                helper.ensureCapacity( lanes.numEvents );

                var indexXys = 0;
                var indexRgbas = 0;
                
                for ( var l = 0; l < lanes.length; l++ ) {
                    var lane = lanes.lane( l );
                    for ( var e = 0; e < lane.length; e++ ) {
                        var event = lane.event( e );
                        var indexes = helper.fillEvent( l, e, indexXys, indexRgbas, viewport );
                        indexXys = indexes.indexXys;
                        indexRgbas = indexes.indexRgbas;
                    }
                }

                helper.paint( indexXys, indexRgbas, gl, viewport );
            };
        };
    }



    export interface TimelineEventIconsPainterOptions {
        topMargin? : number;
        bottomMargin? : number;
        vAlign? : number;
    }

    
    function eventIconsPainterHelper( iconOpts : TimelineEventIconsPainterOptions, drawable : Drawable, timeAxis : TimeAxis1D, lanes : TimelineLaneArray, ui : TimelineUi, options : TimelineEventsPainterOptions ) {

        var rowTopPadding    = options.rowTopPadding;
        var rowBottomPadding = options.rowBottomPadding;
        var laneHeight       = options.laneHeight;

        var topMargin    = ( hasval( iconOpts ) && hasval( iconOpts.topMargin    ) ? iconOpts.topMargin    : 1.2 );
        var bottomMargin = ( hasval( iconOpts ) && hasval( iconOpts.bottomMargin ) ? iconOpts.bottomMargin : 1.2 );
        var vAlign       = ( hasval( iconOpts ) && hasval( iconOpts.vAlign       ) ? iconOpts.vAlign       : 0.5 );

        var textureRenderer = new TextureRenderer( );
        
        return {
            textureRenderer : textureRenderer,
            paintEvent: function( laneIndex : number, eventIndex : number, gl : WebGLRenderingContext, viewport : BoundsUnmodifiable ) {
                var lane : TimelineLane = lanes.lane( laneIndex );
                var event : TimelineEventModel = lane.event( eventIndex );
                var eventStyle = ui.eventStyle( event.styleGuid );
                
                var jTop = rowTopPadding + ( laneIndex )*laneHeight + topMargin;
                var yFrac = ( viewport.h - jTop - ( 1.0 - vAlign )*( laneHeight - topMargin - bottomMargin ) ) / viewport.h;

                for ( var n = 0; n < eventStyle.numIcons; n++ ) {
                    var icon = eventStyle.icon( n );
                    var iconTime_PMILLIS = event.start_PMILLIS + icon.hPos*( event.end_PMILLIS - event.start_PMILLIS );
                    var xFrac = timeAxis.tFrac( iconTime_PMILLIS );
                    var w = icon.displayWidth / viewport.w;
                    if ( -w <= xFrac && xFrac <= 1+w ) {
                        var iconTexture = ui.loadImage( icon.url, function( ) { drawable.redraw( ); } );
                        if ( iconTexture ) {
                            textureRenderer.draw( gl, iconTexture, xFrac, yFrac, { xAnchor: icon.hAlign, yAnchor: vAlign, width: icon.displayWidth, height: icon.displayHeight } );
                        }
                    }
                }
            }
        };
    }

    export function newEventIconsPainterFactory( iconOpts? : TimelineEventIconsPainterOptions ) : TimelineEventsPainterFactory {

        // Painter Factory
        return function( drawable : Drawable, timeAxis : TimeAxis1D, lanes : TimelineLaneArray, ui : TimelineUi, options : TimelineEventsPainterOptions ) : Painter {
            
            var helper = eventIconsPainterHelper( iconOpts, drawable, timeAxis, lanes, ui, options );

            // Painter
            return function( gl : WebGLRenderingContext, viewport : BoundsUnmodifiable ) {
                gl.blendFuncSeparate( GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA, GL.ONE, GL.ONE_MINUS_SRC_ALPHA );
                gl.enable( GL.BLEND );

                helper.textureRenderer.begin( gl, viewport );
                for ( var l = 0; l < lanes.length; l++ ) {
                    var lane = lanes.lane( l );
                    for ( var e = 0; e < lane.length; e++ ) {
                        helper.paintEvent( l, e, gl, viewport );
                    }
                }
                helper.textureRenderer.end( gl );
            };
        };
    }



    export interface TimelineEventLabelOptions {
        topMargin? : number;
        bottomMargin? : number;
        leftMargin? : number;
        rightMargin? : number;
        vAlign? : number;
        spacing? : number;
        extendBeyondBar? : boolean;
        forceVisible? : boolean;

        iconsEnabled? : boolean;
        // Can be a number, or 'imageSize', or 'auto'
        iconsForceWidth? : any;
        // Can be a number, or 'imageSize', or 'auto'
        iconsForceHeight? : any;
        iconsSizeFactor? : number;

        textEnabled? : boolean;
        textDefaultColor? : Color;
        textFont? : string;
    }


    function eventLabelsPainterHelper( labelOpts : TimelineEventLabelOptions, drawable : Drawable, timeAxis : TimeAxis1D, lanes : TimelineLaneArray, ui : TimelineUi, options : TimelineEventsPainterOptions ) {
        var rowTopPadding    = options.rowTopPadding;
        var rowBottomPadding = options.rowBottomPadding;
        var laneHeight       = options.laneHeight;

        var topMargin       = ( hasval( labelOpts ) && hasval( labelOpts.topMargin       ) ? labelOpts.topMargin       : 1.2   );
        var bottomMargin    = ( hasval( labelOpts ) && hasval( labelOpts.bottomMargin    ) ? labelOpts.bottomMargin    : 1.2   );
        var leftMargin      = ( hasval( labelOpts ) && hasval( labelOpts.leftMargin      ) ? labelOpts.leftMargin      : 4     );
        var rightMargin     = ( hasval( labelOpts ) && hasval( labelOpts.rightMargin     ) ? labelOpts.rightMargin     : 4     );
        var vAlign          = ( hasval( labelOpts ) && hasval( labelOpts.vAlign          ) ? labelOpts.vAlign          : 0.5   );
        var spacing         = ( hasval( labelOpts ) && hasval( labelOpts.spacing         ) ? labelOpts.spacing         : 3     );
        var extendBeyondBar = ( hasval( labelOpts ) && hasval( labelOpts.extendBeyondBar ) ? labelOpts.extendBeyondBar : false );
        var forceVisible    = ( hasval( labelOpts ) && hasval( labelOpts.forceVisible    ) ? labelOpts.forceVisible    : false );

        // Icon options
        var iconsEnabled     = ( hasval( labelOpts ) && hasval( labelOpts.iconsEnabled     ) ? labelOpts.iconsEnabled     : true   );
        var iconsForceWidth  = ( hasval( labelOpts ) && hasval( labelOpts.iconsForceWidth  ) ? labelOpts.iconsForceWidth  : 'auto' );
        var iconsForceHeight = ( hasval( labelOpts ) && hasval( labelOpts.iconsForceHeight ) ? labelOpts.iconsForceHeight : 'auto' );
        var iconsSizeFactor  = ( hasval( labelOpts ) && hasval( labelOpts.iconsSizeFactor  ) ? labelOpts.iconsSizeFactor  : 1      );

        // Text options
        var textEnabled      = ( hasval( labelOpts ) && hasval( labelOpts.textEnabled      ) ? labelOpts.textEnabled      : true );
        var textDefaultColor = ( hasval( labelOpts ) && hasval( labelOpts.textDefaultColor ) ? labelOpts.textDefaultColor : options.timelineFgColor );
        var textFont         = ( hasval( labelOpts ) && hasval( labelOpts.textFont         ) ? labelOpts.textFont         : options.timelineFont );

        // XXX: Old icon textures never get cleaned out
        var iconTextures : StringMap<Texture2D> = {};
        var textTextures = newTextTextureCache2( textFont );
        var textureRenderer = new TextureRenderer( );
        
        return {
            textTextures : textTextures,
            textureRenderer : textureRenderer,
            paintEvent: function( laneIndex : number, eventIndex : number, gl : WebGLRenderingContext, viewport : BoundsUnmodifiable ) {
                
                var lane : TimelineLane = lanes.lane( laneIndex );
                var event : TimelineEventModel = lane.event( eventIndex );
               
                var labelTopMargin = hasval( event.labelTopMargin ) ? event.labelTopMargin : topMargin;
                var labelBottomMargin = hasval( event.labelBottomMargin ) ? event.labelBottomMargin : bottomMargin;
                
                var labelVAlign = hasval( event.labelVAlign ) ? event.labelVAlign : vAlign;
                var labelVPos = hasval( event.labelVPos ) ? event.labelVPos : labelVAlign;

                var labelHAlign = hasval( event.labelHAlign ) ? event.labelHAlign : 0;
                var labelHPos = hasval( event.labelHPos ) ? event.labelHPos : labelHAlign;

                var jTop = rowTopPadding + ( laneIndex )*laneHeight + labelTopMargin;
                var yFrac = ( viewport.h - jTop - ( 1.0 - labelVAlign )*( laneHeight - labelTopMargin - labelBottomMargin ) ) / viewport.h;
                
                var xLeftMin = 2 / viewport.w;
                var xRightMax = ( viewport.w - 2 ) / viewport.w;
                var wLeftIndent = leftMargin / viewport.w;
                var wRightIndent = rightMargin / viewport.w;
                
                var xStart = timeAxis.tFrac( event.start_PMILLIS );
                var xEnd = timeAxis.tFrac( event.end_PMILLIS );
                
                var wTotal = ( xEnd - wRightIndent ) - ( xStart + wLeftIndent ) 
                var wSpacing = ( spacing / viewport.w );

                if ( !( xEnd <= 0 || xStart > 1 ) ) {
    
                    var xLeft;
                    var xRight;
                    if ( extendBeyondBar ) {
                        if ( eventIndex+1 < lane.length ) {
                            var nextEvent = lane.event( eventIndex+1 );
                            var nextStart_PMILLIS = effectiveEdges_PMILLIS( ui, nextEvent )[ 0 ];
                            xRight = timeAxis.tFrac( nextStart_PMILLIS );
                        }
                        else {
                            xRight = xRightMax;
                        }
                        
                        if ( eventIndex-1 >= 0 ) {
                            var previousEvent = lane.event( eventIndex-1 );
                            var previousEnd_PMILLIS = effectiveEdges_PMILLIS( ui, previousEvent )[ 1 ];
                            xLeft = timeAxis.tFrac( previousEnd_PMILLIS );
                        }
                        else {
                            xLeft = xLeftMin;
                        }
                    }
                    else {
                        xRight = xEnd;
                        xLeft  = xStart;
                    }
    
                    // calculate Text width
                    const calculatedTextWidth = calculateTextWidth(textEnabled, event.label, event.fgColor, textDefaultColor, textTextures, viewport);
                    var wText = calculatedTextWidth.wText;
                    var textTexture = calculatedTextWidth.textTexture;
                    
                    // calculate Icon width (and start load if necessary)
                    var wIcon = 0;
                    var wIconPlusSpacing = 0;
                    var iconWidth;
                    var iconHeight;
                    var iconTexture;
                    if ( iconsEnabled && event.labelIcon ) {
                        iconTexture = iconTextures[ event.labelIcon ];
                        if ( hasval( iconTexture ) ) {
                            iconWidth = ( isNumber( iconsForceWidth ) ? iconsForceWidth : ( iconsForceWidth === 'imageSize' ? iconTexture.w : null ) );
                            iconHeight = ( isNumber( iconsForceHeight ) ? iconsForceHeight : ( iconsForceHeight === 'imageSize' ? iconTexture.h : null ) );
    
                            var wIconKnown = hasval( iconWidth );
                            var hIconKnown = hasval( iconHeight );
                            if ( !wIconKnown && !hIconKnown ) {
                                iconHeight = Math.round( iconsSizeFactor * ( laneHeight - labelTopMargin - labelBottomMargin ) );
                                iconWidth = iconTexture.w * iconHeight / iconTexture.h;
                            }
                            else if ( !wIconKnown ) {
                                iconHeight = Math.round( iconsSizeFactor * iconHeight );
                                iconWidth = iconTexture.w * iconHeight / iconTexture.h;
                            }
                            else if ( !hIconKnown ) {
                                iconWidth = Math.round( iconsSizeFactor * iconWidth );
                                iconHeight = iconTexture.h * iconWidth / iconTexture.w;
                            }
                            else {
                                iconWidth = Math.round( iconsSizeFactor * iconWidth );
                                iconHeight = Math.round( iconsSizeFactor * iconHeight );
                            }
    
                            wIcon = ( iconWidth / viewport.w );
                            
                            wIconPlusSpacing = wIcon + wSpacing;
                        }
                        // A null in the map means a fetch has already been initiated
                        // ... either it is still in progress, or it has already failed
                        else if ( iconTexture !== null ) {
                            iconTextures[ event.labelIcon ] = null;
    
                            var image = new Image( );
                            image.onload = ( function( url, img ) {
                                return function( ) {
                                    var wImage = img.naturalWidth;
                                    var hImage = img.naturalHeight;
                                    iconTextures[ url ] = new Texture2D( wImage, hImage, GL.LINEAR, GL.LINEAR, function( g ) {
                                        g.drawImage( img, 0, 0 );
                                    } );
                                    drawable.redraw( );
                                };
                            } )( event.labelIcon, image );
                            image.src = event.labelIcon;
                        }
                    }
                    
                    // NOTE: With extendBeyondBar=true, we detect when there is insufficient space between the current event
                    //       and those to either side to display the text + icon. However, if one event has right aligned text
                    //       and the other has left aligned text, so both text labels overlap into the same space between the
                    //       events, we don't currently try to detect that.
                    
                    // Determine whether there is enough space to display both text and icon, or only icon, or neither

                    // coordinates of the start edge of the icon + label
                    var xStartLabel = xStart + wLeftIndent - ( wSpacing + wIcon + wText ) * labelHPos + ( wTotal ) * labelHAlign;
                    // coordinates of the end edge of the icon + label
                    var xEndLabel = xStartLabel + ( wSpacing + wIcon + wText );
                    
                    // adjust xStartLabel and xEndLabel if they fall off the screen
                    if ( xStartLabel < xLeftMin ) {
                        xStartLabel = xLeftMin;
                        xEndLabel = xStartLabel + ( wSpacing + wIcon + wText );
                    }
                    else if ( xEndLabel > xRightMax ) {
                        xEndLabel = xRightMax;
                        xStartLabel = xEndLabel - ( wSpacing + wIcon + wText );
                    }
                    
                    if ( !forceVisible ) {
                        if ( xEndLabel > xRight || xStartLabel < xLeft ) {
                            // there is not enough room for the text, try with just the icon
                            wText = 0;
                            textTexture = null;
                            
                            // coordinates of the start edge of the icon + label
                            var xStartLabel = xStart + wLeftIndent - ( wIcon ) * labelHPos + ( wTotal ) * labelHAlign;
                            // coordinates of the end edge of the icon + label
                            var xEndLabel = xStartLabel + ( wIcon );
                            
                            // adjust xStartLabel and xEndLabel if they fall off the screen
                            if ( xStartLabel < xLeftMin ) {
                                xStartLabel = xLeftMin;
                                xEndLabel = xStartLabel + ( wIcon );
                            }
                            else if ( xEndLabel > xRightMax ) {
                                xEndLabel = xRightMax;
                                xStartLabel = xEndLabel - ( wIcon );
                            }
                            
                            // if there is still not enough room, don't show anything
                            if ( xEndLabel > xRight || xStartLabel < xLeft ) {
                                wIcon = 0;
                                iconTexture = null;
                            }
                        }
                    }
                    
                    // Icons
                    if ( hasval( iconTexture ) ) {
                        // coordinates of the start edge of the icon + label
                        var xStartLabel = xStart + wLeftIndent - ( wSpacing + wIcon + wText ) * labelHPos + ( wTotal ) * labelHAlign;
                    
                        // coordinates of the end edge of the icon + label
                        var xEndLabel = xStartLabel + ( wSpacing + wIcon + wText );
                    
                        if ( xStartLabel < xLeftMin ) {
                            textureRenderer.draw( gl, iconTexture, xLeftMin, yFrac, { xAnchor: 0, yAnchor: labelVPos, width: iconWidth, height: iconHeight } );
                        }
                        else if ( xEndLabel > xRightMax ) {
                            textureRenderer.draw( gl, iconTexture, xRightMax - wSpacing - wText, yFrac, { xAnchor: 1, yAnchor: labelVPos, width: iconWidth, height: iconHeight } );
                        }
                        else {
                            var xFrac = xStart + wLeftIndent - ( wSpacing + wText ) * labelHPos + ( wTotal ) * labelHAlign;
                            textureRenderer.draw( gl, iconTexture, xFrac, yFrac, { xAnchor: labelHPos, yAnchor: labelVPos, width: iconWidth, height: iconHeight } );
                        }
                    }
    
                    // Text
                    if ( hasval( textTexture ) ) {
                        // coordinates of the start edge of the icon + label
                        var xStartLabel = xStart + wLeftIndent - ( wSpacing + wIcon + wText ) * labelHPos + ( wTotal ) * labelHAlign;
                    
                        // coordinates of the end edge of the icon + label
                        var xEndLabel = xStartLabel + ( wSpacing + wIcon + wText );
                    
                        if ( xStartLabel < xLeftMin ) {
                            textureRenderer.draw( gl, textTexture, xLeftMin + wSpacing + wIcon, yFrac, { xAnchor: 0, yAnchor: textTexture.yAnchor( labelVPos ) } );
                        }
                        else if ( xEndLabel > xRightMax ) {
                            textureRenderer.draw( gl, textTexture, xRightMax, yFrac, { xAnchor: 1, yAnchor: textTexture.yAnchor( labelVPos ) } );
                        }
                        else {
                            var xFrac = xStart + wLeftIndent + ( wIconPlusSpacing ) * ( 1 - labelHPos ) + ( wTotal ) * labelHAlign;
                            textureRenderer.draw( gl, textTexture, xFrac, yFrac, { xAnchor: labelHPos, yAnchor: textTexture.yAnchor( labelVPos ) } );
                        }
                    }
                }
            }
        };
    }

    // MJC
    function calculateTextWidth(textEnabled: boolean, labelText: string, fgColor: Color, textDefaultColor: Color,
        textTextures: Cache<TextTexture2D>, viewport: Bounds) {
        var wText = 0;
        var textTexture;
        if (textEnabled && labelText) {
            var textColor = Webglimpse.hasval(fgColor) ? fgColor : textDefaultColor;
            textTexture = textTextures.value(textColor.rgbaString, labelText);
            wText = textTexture.w / viewport.w;
        }
        return {
            wText: wText,
            textTexture: textTexture
        };
    }

    export function newEventLabelsPainterFactory( labelOpts? : TimelineEventLabelOptions ) : TimelineEventsPainterFactory {

        // Painter Factory
        return function( drawable : Drawable, timeAxis : TimeAxis1D, lanes : TimelineLaneArray, ui : TimelineUi, options : TimelineEventsPainterOptions ) : Painter {

            var helper = eventLabelsPainterHelper( labelOpts, drawable, timeAxis, lanes, ui, options );
            
            // Painter
            return function( gl : WebGLRenderingContext, viewport : BoundsUnmodifiable ) {
                gl.blendFuncSeparate( GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA, GL.ONE, GL.ONE_MINUS_SRC_ALPHA );
                gl.enable( GL.BLEND );

                helper.textTextures.resetTouches( );
                helper.textureRenderer.begin( gl, viewport );
                for ( var l = 0; l < lanes.length; l++ ) {
                    var lane : TimelineLane = lanes.lane( l );
                    for ( var e = 0; e < lane.length; e++ ) {
                        helper.paintEvent( l, e, gl, viewport );
                    }
                }
                helper.textureRenderer.end( gl );
                helper.textTextures.retainTouched( );
            };
        };
    }
    
    export function newCombinedEventPainterFactory( barOpts? : TimelineEventBarsPainterOptions, labelOpts? : TimelineEventLabelOptions, iconOpts? : TimelineEventIconsPainterOptions ) : TimelineEventsPainterFactory {
        
        // Painter Factory
        return function( drawable : Drawable, timeAxis : TimeAxis1D, lanes : TimelineLaneArray, ui : TimelineUi, options : TimelineEventsPainterOptions ) : Painter {

            var labelHelper = eventLabelsPainterHelper( labelOpts, drawable, timeAxis, lanes, ui, options );
            var iconHelper = eventIconsPainterHelper( iconOpts, drawable, timeAxis, lanes, ui, options );
            var barHelper = eventBarPainterHelper( barOpts, drawable, timeAxis, lanes, ui, options );

            // Painter
            return function( gl : WebGLRenderingContext, viewport : BoundsUnmodifiable ) {
                gl.blendFuncSeparate( GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA, GL.ONE, GL.ONE_MINUS_SRC_ALPHA );
                gl.enable( GL.BLEND );
                
                for ( var l = 0; l < lanes.length; l++ ) {
                    var lane : TimelineLane = lanes.lane( l );
                    for ( var e = 0; e < lane.length; e++ ) {
                        
                        // draw bar
                        barHelper.ensureCapacity( 1 );
                        var indexes = barHelper.fillEvent( l, e, 0, 0, viewport );
                        barHelper.paint( indexes.indexXys, indexes.indexRgbas, gl, viewport );
                        
                        // draw label
                        labelHelper.textTextures.resetTouches( );
                        labelHelper.textureRenderer.begin( gl, viewport );
                        labelHelper.paintEvent( l, e, gl, viewport );
                        labelHelper.textureRenderer.end( gl );
                        labelHelper.textTextures.retainTouched( );
                        
                        // draw icon
                        iconHelper.textureRenderer.begin( gl, viewport );
                        iconHelper.paintEvent( l, e, gl, viewport );
                        iconHelper.textureRenderer.end( gl );
                    }
                }
                
            }
        }
    }
}