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

    export interface TimelineTimeseriesPainterOptions {
        timelineFont : string;
        timelineFgColor : Color;
        timelineThickness : number;
        rowTopPadding : number;
        rowBottomPadding : number;
    }
    
    export interface TimelineTimeseriesPainterFactory {
        ( drawable : Drawable, timeAxis : TimeAxis1D, dataAxis : Axis1D, model : TimelineModel, rowModel : TimelineRowModel, selection : TimelineSelectionModel, options : TimelineTimeseriesPainterOptions ) : Painter;
    }
    
    export interface TimelineTimeseriesRowPaneOptions {
        rowHeight? : number;
        rowTopPadding? : number;
        rowBottomPadding? : number;
        tickLabeler? : TickLabeler;
        tickSpacing? : number;
        tickSize? : number;
        showAxisLabel?: boolean;
        painterFactories? : TimelineTimeseriesPainterFactory[];
    }
    
    export function newTimeseriesRowPaneFactory( rowOptions? : TimelineTimeseriesRowPaneOptions ) : TimelineRowPaneFactory {
        return function( drawable : Drawable, timeAxis : TimeAxis1D, dataAxis : Axis1D, model : TimelineModel, group : TimelineGroupModel, row : TimelineRowModel, ui : TimelineUi, options : TimelineRowPaneOptions ) : Pane {
            
            var rowTopPadding       = ( hasval( rowOptions ) && hasval( rowOptions.rowTopPadding    ) ? rowOptions.rowTopPadding    : 6 );
            var rowBottomPadding    = ( hasval( rowOptions ) && hasval( rowOptions.rowBottomPadding ) ? rowOptions.rowBottomPadding : 6 );
            var rowHeight           = ( hasval( rowOptions ) && hasval( rowOptions.rowHeight ) ? rowOptions.rowHeight : 135 );
            var tickLabeler         = ( hasval( rowOptions ) && hasval( rowOptions.tickLabeler ) ? rowOptions.tickLabeler : undefined );
            var showAxisLabel       = ( hasval( rowOptions ) && hasval( rowOptions.showAxisLabel ) ? rowOptions.showAxisLabel : false );
            var tickSize            = ( hasval( rowOptions ) && hasval( rowOptions.tickSize ) ? rowOptions.tickSize : 5 );
            var tickSpacing         = ( hasval( rowOptions ) && hasval( rowOptions.tickSpacing ) ? rowOptions.tickSpacing : 34 );
            var painterFactories    = ( hasval( rowOptions ) && hasval( rowOptions.painterFactories ) ? rowOptions.painterFactories : [] );
            
            var timelineFont       = options.timelineFont;
            var timelineFgColor    = options.timelineFgColor;
            var draggableEdgeWidth = options.draggableEdgeWidth;
            var snapToDistance     = options.snapToDistance;

            var input = ui.input;
            var selection = ui.selection;
            
            
            // setup pane for data (y) axis painter and mouse listener
            var yAxisPane = new Pane( { updatePrefSize: fixedSize( 40, rowHeight ) } );
            dataAxis.limitsChanged.on( drawable.redraw );
            attachAxisMouseListeners1D( yAxisPane, dataAxis, true );
            
            
            var isDragMode : Mask2D = function( viewport : BoundsUnmodifiable, i : number, j : number ) : boolean {
                var fragment = getNearestFragment( viewport, i, j ).fragment;
                return hasval( fragment );
            };
            
            var rowContentPane = new Pane( newColumnLayout( ), true, isDragMode );
            
            var painterOptions = { timelineFont: timelineFont, timelineFgColor: timelineFgColor, timelineThickness: 1, rowTopPadding: rowTopPadding, rowBottomPadding: rowBottomPadding };
            for ( var n = 0; n < painterFactories.length; n++ ) {
                var createPainter = painterFactories[ n ];
                rowContentPane.addPainter( createPainter( drawable, timeAxis, dataAxis, model, row, selection, painterOptions ) );
            }
            
            rowContentPane.addPainter( newEdgeAxisPainter( dataAxis, Side.RIGHT, { tickLabeler: tickLabeler, showLabel: showAxisLabel, textColor: timelineFgColor, tickColor: timelineFgColor, tickSpacing: tickSpacing, tickSize: tickSize, font: timelineFont } ) );
            rowContentPane.addPane( yAxisPane, 0 );
            
            
            var redraw = function( ) {
                drawable.redraw( );
            };

            row.timeseriesGuids.valueAdded.on( redraw );
            row.timeseriesGuids.valueMoved.on( redraw );
            row.timeseriesGuids.valueRemoved.on( redraw );
            
            var addFragmentRedraw = function( fragmentGuid : string ) {
                var fragment = model.timeseriesFragment( fragmentGuid );
                fragment.dataChanged.on( redraw );
            }
            
            var removeFragmentRedraw = function( fragmentGuid : string ) {
                var fragment = model.timeseriesFragment( fragmentGuid );
                fragment.dataChanged.off( redraw );
            }
            
            var addRedraw = function( timeseriesGuid : string ) {
                var timeseries = model.timeseries( timeseriesGuid );
                timeseries.attrsChanged.on( redraw );
                timeseries.fragmentGuids.valueAdded.on( redraw );
                timeseries.fragmentGuids.valueRemoved.on( redraw );
                
                timeseries.fragmentGuids.forEach( addFragmentRedraw );
                timeseries.fragmentGuids.valueAdded.on( addFragmentRedraw );
                timeseries.fragmentGuids.valueRemoved.on( removeFragmentRedraw );
            };
            row.timeseriesGuids.forEach( addRedraw );
            row.timeseriesGuids.valueAdded.on( addRedraw );

            var removeRedraw = function( timeseriesGuid : string ) {
                var timeseries = model.timeseries( timeseriesGuid );
                timeseries.attrsChanged.off( redraw );
                timeseries.fragmentGuids.valueAdded.off( redraw );
                timeseries.fragmentGuids.valueRemoved.off( redraw );
                timeseries.fragmentGuids.forEach( removeFragmentRedraw );
            };
            row.timeseriesGuids.valueRemoved.on( removeRedraw );
            
            var timeAtCoords_PMILLIS = function( viewport : BoundsUnmodifiable, i : number ) : number {
                return timeAxis.tAtFrac_PMILLIS( viewport.xFrac( i ) );
            };
            
            var timeAtPointer_PMILLIS = function( ev : PointerEvent ) : number {
                return timeAtCoords_PMILLIS( ev.paneViewport, ev.i );
            };
            
            // Used by both sets of listeners to know whether a timeseries-drag is in progress
            var timeseriesDragMode : string = null;

            // Hook up input notifications
            //

            var recentMouseMove : PointerEvent = null;

            rowContentPane.mouseMove.on( function( ev : PointerEvent ) {
                input.mouseMove.fire( ev );
                if ( !hasval( timeseriesDragMode ) ) {
                    input.timeHover.fire( timeAtPointer_PMILLIS( ev ), ev );
                    input.rowHover.fire( row, ev );
                }
                recentMouseMove = ev;
            } );

            rowContentPane.mouseExit.on( function( ev : PointerEvent ) {
                input.mouseExit.fire( ev );
                if ( !hasval( timeseriesDragMode ) ) {
                    input.timeHover.fire( null, ev );
                    input.rowHover.fire( null, ev );
                    input.eventHover.fire( null, ev );
                }
                recentMouseMove = null;
            } );

            var uiMillisPerPxChanged = function( ) {
                if ( !hasval( timeseriesDragMode ) && recentMouseMove != null ) {
                    var ev = recentMouseMove;
                    input.timeHover.fire( timeAtPointer_PMILLIS( ev ), ev );
                }
            };
            ui.millisPerPx.changed.on( uiMillisPerPxChanged );

            rowContentPane.mouseUp.on( function( ev : PointerEvent ) {
                input.mouseUp.fire( ev );
            } );
            
            rowContentPane.mouseDown.on( function( ev : PointerEvent ) {
                input.mouseDown.fire( ev );
            } );

            rowContentPane.mouseWheel.on( function( ev : PointerEvent ) {
                var zoomFactor = Math.pow( axisZoomStep, ev.wheelSteps );
                timeAxis.zoom( zoomFactor, timeAxis.vAtFrac( xFrac( ev ) ) );
            } );

            rowContentPane.contextMenu.on( function( ev : PointerEvent ) {
                input.contextMenu.fire( ev );
            } );
            
            // Begin timeseries-drag
            //
            
            function chooseTimeseriesDragMode( ui : TimelineUi, hoveredTimeseriesFragment : TimelineTimeseriesFragmentModel ) : string {
                if ( !hasval( hoveredTimeseriesFragment ) ) {
                    return null;
                }
                // return the edit mode of the selected fragment
                else {
                    return hoveredTimeseriesFragment.userEditMode;
                }
            }
            
            var updateCursor = function( ) {
                if ( !timeseriesDragMode ) {
                    var mouseCursors = { 'xy': 'move', 'y': 'ns-resize' };
                    rowContentPane.mouseCursor = mouseCursors[ chooseTimeseriesDragMode( ui, selection.hoveredTimeseries.fragment ) ];
                }
            };
            ui.millisPerPx.changed.on( updateCursor );
            selection.hoveredTimeseries.changed.on( updateCursor );
            
            var getNearestFragment = function( viewport : BoundsUnmodifiable, i : number, j : number ) {
                // maximum number of pixels away from a point the mouse can be to select it
                var pickBuffer_PIXEL : number = 10;
                // value per pixel in x and y directions
                var vppx : number = ui.millisPerPx.value;
                var vppy : number = dataAxis.vSize / rowContentPane.viewport.h;
                var pickBuffer_PMILLIS : number = pickBuffer_PIXEL * vppx;
                
                var bestFragment : TimelineTimeseriesFragmentModel;
                var bestIndex : number;
                var best_PIXEL : number;
                    
                var ev_time : number = timeAtCoords_PMILLIS( viewport, i );
                var ev_value : number = dataAxis.vAtFrac( viewport.yFrac( j ) );
                
                if ( ev_time ) {
                    for ( var i = 0 ; i < row.timeseriesGuids.length ; i++ ) {
                        var timeseriesGuid : string = row.timeseriesGuids.valueAt( i );
                        var timeseries : TimelineTimeseriesModel = model.timeseries( timeseriesGuid );
                    
                        for ( var j = 0 ; j < timeseries.fragmentGuids.length ; j++ ) {
                            var fragmentGuid : string = timeseries.fragmentGuids.valueAt( j );
                            var fragment : TimelineTimeseriesFragmentModel = model.timeseriesFragment( fragmentGuid );
                            
                            // fragments should not overlap
                            if ( fragment.start_PMILLIS - pickBuffer_PMILLIS < ev_time && fragment.end_PMILLIS + pickBuffer_PMILLIS > ev_time ) {
                                // bars are drawn starting at the point and continuing to the next point, so we need to choose the closest index differently
                                var index : number = timeseries.uiHint == 'bars' ? indexAtOrBefore( fragment.times_PMILLIS, ev_time ) : indexNearest( fragment.times_PMILLIS, ev_time );
                                var value = fragment.data[index];
                                var time = fragment.times_PMILLIS[index];
                                
                                var dy_PIXEL = ( value - ev_value ) / vppy;
                                var dx_PIXEL = ( time - ev_time ) / vppx;
                                var d_PIXEL = Math.sqrt( dx_PIXEL * dx_PIXEL + dy_PIXEL * dy_PIXEL ); 
                                
                                var filter = function( ) : boolean {
                                    if ( timeseries.uiHint == 'bars' ) {
                                        return ( timeseries.baseline < ev_value && ev_value < value ) ||
                                               ( timeseries.baseline > ev_value && ev_value > value );
                                    }
                                    else {
                                        return d_PIXEL < pickBuffer_PIXEL;
                                    }
                                }
                                
                                if ( ( !best_PIXEL || d_PIXEL < best_PIXEL ) && filter( ) )
                                {
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
            
            var getNearestFragmentEvent = function( ev : PointerEvent ) {
                return getNearestFragment( ev.paneViewport, ev.i, ev.j );
            }
            
            // choose the closest data point to the mouse cursor position and fire an event when it changes
            rowContentPane.mouseMove.on( function( ev : PointerEvent ) {
                if ( ! hasval( timeseriesDragMode ) ) {
                    var result = getNearestFragmentEvent( ev );
                    selection.hoveredTimeseries.setValue( result.fragment, result.index );
                }
            } );
            selection.hoveredTimeseries.changed.on( redraw );
            
            rowContentPane.mouseExit.on( function( ) {
                selection.hoveredTimeseries.clearValue( );
            } );
            
            rowContentPane.mouseDown.on( function( ev : PointerEvent ) {
                timeseriesDragMode = chooseTimeseriesDragMode( ui, selection.hoveredTimeseries.fragment );
            } );
            
            rowContentPane.mouseMove.on( function( ev : PointerEvent ) {
                
                if ( hasval( timeseriesDragMode ) ) {
                    var x : number = timeAtPointer_PMILLIS( ev );
                    var y : number = dataAxis.vAtFrac( yFrac( ev ) );
                
                    var fragment = selection.hoveredTimeseries.fragment;
                    var fragment_time = fragment.times_PMILLIS;
                    
                    if ( timeseriesDragMode === 'y' ) {                    
                        fragment.setData( selection.hoveredTimeseries.index, y );
                    }
                    else if ( timeseriesDragMode === 'xy' ) {
                        var index = fragment.setData( selection.hoveredTimeseries.index, y, x );
                        if ( index !== selection.hoveredTimeseries.index ) {
                            selection.hoveredTimeseries.setValue( fragment, index );
                        }
                    }
                }
            } );
            
            // Finish event-drag
            //

            rowContentPane.mouseUp.on( function( ev : PointerEvent ) {
                timeseriesDragMode = null;
            } );
            
            rowContentPane.dispose.on( function( ) {
                dataAxis.limitsChanged.off( drawable.redraw );
                
                row.timeseriesGuids.valueAdded.off( redraw );
                row.timeseriesGuids.valueMoved.off( redraw );
                row.timeseriesGuids.valueRemoved.off( redraw );
                
                row.timeseriesGuids.valueAdded.off( addRedraw );
                row.timeseriesGuids.valueRemoved.off( removeRedraw );
                
                selection.hoveredTimeseries.changed.off( redraw );
                
                row.timeseriesGuids.forEach( function( timeseriesGuid : string ) {
                    var timeseries = model.timeseries( timeseriesGuid );
                    timeseries.attrsChanged.off( redraw );
                    timeseries.fragmentGuids.valueAdded.off( redraw );
                    timeseries.fragmentGuids.valueRemoved.off( redraw );
                } );
            } );
            
            return rowContentPane;
        }
    }
                    
    export function newTimeseriesPainterFactory( options? : TimelineTimeseriesPainterOptions ) : TimelineTimeseriesPainterFactory {
        // Painter Factory
        return function( drawable : Drawable, timeAxis : TimeAxis1D, dataAxis : Axis1D, model : TimelineModel, rowModel : TimelineRowModel, selection : TimelineSelectionModel ) : Painter {
            
            var defaultColor = hasval( options ) && hasval( options.timelineFgColor ) ? options.timelineFgColor : white;
            var defaultThickness = hasval( options ) && hasval( options.timelineThickness ) ? options.timelineThickness : 1;
            
            var modelview_pointsize_VERTSHADER = concatLines(
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
            
            var program = new Program( modelview_pointsize_VERTSHADER, solid_FRAGSHADER );
            var u_Color = new UniformColor( program, 'u_Color' );
            var u_modelViewMatrix = new UniformMatrix4f( program, 'u_modelViewMatrix' );
            var a_Position = new Attribute( program, 'a_Position' );
            var u_PointSize = new Uniform1f( program, 'u_PointSize' );
            
            var axis = new Axis2D( timeAxis, dataAxis );
            
            var xys = new Float32Array( 0 );
            var xysBuffer = newDynamicBuffer( );
           
            // Painter
            return function( gl : WebGLRenderingContext, viewport : BoundsUnmodifiable ) {
           
                gl.blendFuncSeparate( GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA, GL.ONE, GL.ONE_MINUS_SRC_ALPHA );
                gl.enable( GL.BLEND );
                
                // enable the shader
                program.use( gl );
                
                u_modelViewMatrix.setData( gl, glOrthoAxis( axis ) );
                
                for ( var i = 0 ; i < rowModel.timeseriesGuids.length ; i++ ) {
                    
                    // collect fragments and sort them by time
                    var totalSize = 0;
                    var sortedFragments = new Array<TimelineTimeseriesFragmentModel>( );
                    var timeseriesGuid = rowModel.timeseriesGuids.valueAt(i);
                    var timeseries = model.timeseries( timeseriesGuid );
                    for ( var j = 0 ; j < timeseries.fragmentGuids.length ; j++ ) {
                        var timeseriesFragmentGuid = timeseries.fragmentGuids.valueAt(j);
                        var fragment = model.timeseriesFragment( timeseriesFragmentGuid );
                        
                        sortedFragments.push( fragment );
                        totalSize += fragment.times_PMILLIS.length;
                    }
                    sortedFragments.sort( ( a,b ) => { return a.start_PMILLIS - b.start_PMILLIS; } );
                    
                    if ( timeseries.uiHint == 'lines' || timeseries.uiHint == 'points' || timeseries.uiHint == 'lines-and-points' || timeseries.uiHint == undefined ) {
                    
                        var size = totalSize * 2;
                        
                        xys = ensureCapacityFloat32( xys, size );
                        
                        var index = 0;
                        for ( var j = 0 ; j < sortedFragments.length ; j++ ) {
                            var fragment = sortedFragments[j];
                            var data : number[] = fragment.data;
                            var times_PMILLIS : number[] = fragment.times_PMILLIS;
                            
                            for ( var k = 0 ; k < data.length ; k++,index+=2 ) {
                                xys[index] = timeAxis.vAtTime( times_PMILLIS[k] );
                                xys[index+1] = data[k];
                            }
                        }
                        
                        var lineColor = hasval( timeseries.lineColor ) ? timeseries.lineColor : defaultColor;
                        u_Color.setData( gl, lineColor );
                        
                        var lineThickness = hasval( timeseries.lineThickness ) ? timeseries.lineThickness : defaultThickness;
                        gl.lineWidth( lineThickness );
    
                        xysBuffer.setData( xys.subarray( 0, index ) );
                        a_Position.setDataAndEnable( gl, xysBuffer, 2, GL.FLOAT );
                        
                        if ( timeseries.uiHint == 'lines' || timeseries.uiHint == 'lines-and-points' || timeseries.uiHint == undefined ) {
                            // draw the lines
                            gl.drawArrays( GL.LINE_STRIP, 0, size / 2 );
                        }
                        
                        // point size works in WebKit and actually works in Minefield as well even though
                        // VERTEX_PROGRAM_POINT_SIZE and POINT_SMOOTH aren't defined
                        if ( timeseries.uiHint == 'points' || timeseries.uiHint == 'lines-and-points' ) {
                            
                            var pointColor = hasval( timeseries.pointColor ) ? timeseries.pointColor : defaultColor;
                            u_Color.setData( gl, pointColor );
                            
                            u_PointSize.setData( gl, timeseries.pointSize );
                            
                            gl.drawArrays( GL.POINTS, 0, size / 2 );
                        }
                    }
                    else if ( timeseries.uiHint == 'bars' ) {
                        
                        // The last data point defines the right edge of the bar
                        // but it does not have its own bar drawn, so we need at
                        // least 2 data points to draw any bars
                        if ( totalSize >= 2 ) {
                            var baseline : number = timeseries.baseline;
                            
                            var size = (totalSize-1) * 12;
                            xys = ensureCapacityFloat32( xys, size );
                            
                            var index = 0;
                            for ( var j = 0 ; j < sortedFragments.length ; j++ ) {
                                var fragment = sortedFragments[j];
                                var data : number[] = fragment.data;
                                var times_PMILLIS : number[] = fragment.times_PMILLIS;
                                
                                for ( var k = 0 ; k < data.length-1 ; k++ ) {
                                    var x1 = timeAxis.vAtTime( times_PMILLIS[k] );
                                    var y1 = data[k];
                                    
                                    var x2 = timeAxis.vAtTime( times_PMILLIS[k+1] );
                                    var y2 = data[k+1];
                                    
                                    index = putQuadXys( xys, index, x1, x2, y1, baseline );
                                }
                            }
                            
                            var lineColor = hasval( timeseries.lineColor ) ? timeseries.lineColor : defaultColor;
                            u_Color.setData( gl, lineColor );
        
                            xysBuffer.setData( xys.subarray( 0, index ) );
                            a_Position.setDataAndEnable( gl, xysBuffer, 2, GL.FLOAT );
                            
                            gl.drawArrays( GL.TRIANGLES, 0, size / 2 );
                        }
                    }
                    else if ( timeseries.uiHint == 'area' ) {
                        
                        var baseline : number = timeseries.baseline;
                        
                        var size = totalSize * 4;
                        
                        // the last data point defines the right edge of the bar
                        // but it does not have its own bar drawn
                        xys = ensureCapacityFloat32( xys, size );
                        
                        var index = 0;
                        for ( var j = 0 ; j < sortedFragments.length ; j++ ) {
                            var fragment = sortedFragments[j];
                            var data : number[] = fragment.data;
                            var times_PMILLIS : number[] = fragment.times_PMILLIS;
                            
                            for ( var k = 0 ; k < data.length ; k++,index+=4 ) {
                                var x1 = timeAxis.vAtTime( times_PMILLIS[k] );
                                var y1 = data[k];
                                
                                xys[index] = x1;
                                xys[index+1] = baseline;
                                
                                xys[index+2] = x1;
                                xys[index+3] = y1;
                            }
                        }
                        
                        var lineColor = hasval( timeseries.lineColor ) ? timeseries.lineColor : defaultColor;
                        u_Color.setData( gl, lineColor );
    
                        xysBuffer.setData( xys.subarray( 0, index ) );
                        a_Position.setDataAndEnable( gl, xysBuffer, 2, GL.FLOAT );
                        
                        gl.drawArrays( GL.TRIANGLE_STRIP, 0, size / 2 );
                        
                    }
                    
                    // highlight hovered point
                    if ( selection.hoveredTimeseries.fragment && timeseries.fragmentGuids.hasValue( selection.hoveredTimeseries.fragment.fragmentGuid ) )
                    {
                        if ( timeseries.uiHint == 'area' || timeseries.uiHint == 'lines' || timeseries.uiHint == 'points' || timeseries.uiHint == 'lines-and-points' || timeseries.uiHint == undefined ) {
                            var size = 8;
                            xys = ensureCapacityFloat32( xys, size );
                            
                            var vppx : number = timeAxis.vSize / viewport.w;
                            var vppy : number = dataAxis.vSize / viewport.h;
                            
                            var highlightSize = hasval( timeseries.pointSize ) ? timeseries.pointSize : 5;
                            
                            var bufferx = ( highlightSize / 2 ) * vppx;
                            var buffery = ( highlightSize / 2 ) * vppy;
                                                    
                            var fragment = selection.hoveredTimeseries.fragment;
                            var y = selection.hoveredTimeseries.data;
                            var x = timeAxis.vAtTime( selection.hoveredTimeseries.times_PMILLIS );
                            
                            xys[0] = x-bufferx; xys[1] = y-buffery;
                            xys[2] = x+bufferx; xys[3] = y-buffery;
                            xys[4] = x+bufferx; xys[5] = y+buffery;
                            xys[6] = x-bufferx; xys[7] = y+buffery;
                            
                            var color = hasval( timeseries.pointColor ) ? timeseries.pointColor : defaultColor;
                            u_Color.setData( gl, darker( color, 0.8 ) );
        
                            xysBuffer.setData( xys.subarray( 0, size ) );
                            a_Position.setDataAndEnable( gl, xysBuffer, 2, GL.FLOAT );
                            
                            gl.drawArrays( GL.LINE_LOOP, 0, size / 2 );
                        }
                        else if ( timeseries.uiHint == 'bars' ) {
                            var size = 8;
                            xys = ensureCapacityFloat32( xys, size );
    
                            var fragment = selection.hoveredTimeseries.fragment;
                            var index = selection.hoveredTimeseries.index;
                            
                            if ( index < fragment.data.length )
                            {
                                var x1 = timeAxis.vAtTime( fragment.times_PMILLIS[index] );
                                var y1 = fragment.data[index];
                                
                                var x2 = timeAxis.vAtTime( fragment.times_PMILLIS[index+1] );
                                var y2 = fragment.data[index+1];
                                
                                xys[0] = x1; xys[1] = y1;
                                xys[2] = x2; xys[3] = y1;
                                xys[4] = x2; xys[5] = baseline;
                                xys[6] = x1; xys[7] = baseline;
                                
                                var color = hasval( timeseries.lineColor ) ? timeseries.lineColor : defaultColor;
                                u_Color.setData( gl, darker( color, 0.8 ) );
        
                                xysBuffer.setData( xys.subarray( 0, size ) );
                                a_Position.setDataAndEnable( gl, xysBuffer, 2, GL.FLOAT );
                            
                                gl.drawArrays( GL.LINE_LOOP, 0, size / 2 );
                            }
                        }
                    }
                }
                
                // disable shader and attribute buffers
                a_Position.disable( gl );
                program.endUse( gl );
            }
        }    
    }
}
