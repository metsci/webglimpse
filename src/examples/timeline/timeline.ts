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


    interface ExampleTooltip {
        show( html : string, i : number, j : number );
        move( i : number, j : number );
        hide( );
    }


    function newExampleTooltip( ) : ExampleTooltip {
        var div = document.createElement( 'div' );
        div.classList.add( 'exampleTooltip' );
        div.style.position = 'absolute';
        div.style.zIndex = '1';
        div.style.visibility = 'hidden';
        document.body.appendChild( div );

        return {
            show: function( html : string, i : number, j : number ) {
                div.innerHTML = html;
                div.style.left = ( i ) + 'px';
                div.style.bottom = ( j - div.clientHeight ) + 'px';
                div.style.visibility = 'visible';
            },
            move: function( i : number, j : number ) {
                div.style.left = ( i ) + 'px';
                div.style.bottom = ( j - div.clientHeight ) + 'px';
            },
            hide: function( ) {
                div.style.visibility = 'hidden';
            }
        };
    }


    export function runTimelineExample( container : Node ) {


        // DOM Setup
        //

        var canvas = document.createElement( 'canvas' );
        canvas.id = 'exampleCanvas';
        canvas.style.padding = '0';
        container.appendChild( canvas );

        var drawable = newDrawable( canvas );

        var updateCanvasSize = function( ) {
            // Make the canvas extend to the bottom of the browser viewport
            // (can't just set CSS height to 100%, because of the toolbar)
            $( canvas ).height( $( window ).height( ) - canvas.getBoundingClientRect( ).top );

            canvas.width = $( canvas ).width( );
            canvas.height = $( canvas ).height( );
            drawable.redraw( );
        };
        $( window ).resize( updateCanvasSize );
        updateCanvasSize( );



        // Timeline Setup
        //

        var timeAxis = new TimeAxis1D( parseTime_PMILLIS( '2014-01-01T00:00:00Z' ), parseTime_PMILLIS( '2014-01-01T12:00:00Z' ) );
        timeAxis.limitsChanged.on( drawable.redraw );

        var timelineOptions : TimelinePaneOptions = {

            selectedIntervalMode: 'single',
            topTimeZone: '-0500',
            fgColor: white,
            rowLabelColor: white,
            groupLabelColor: white,
            axisLabelColor: white,
            bgColor: rgb( 0.098, 0.165, 0.243 ),
            rowBgColor: rgb( 0.020, 0.086, 0.165 ),
            rowAltBgColor: rgb( 0.020, 0.086, 0.165 ),
            gridColor: gray( 0.5 ),
            selectedIntervalFillColor: rgba( 0, 0.6, 0.8, 0.157 ),
            selectedIntervalBorderColor: rgb( 0, 0.2, 1.0 ),
            allowEventMultiSelection: true,
            rowPaneFactoryChooser: rowPaneFactoryChooser_THIN

        };
        var model = new TimelineModel( );
        var ui = new TimelineUi( model, { allowEventMultiSelection : true } );
        var timelinePane = newTimelinePane( drawable, timeAxis, model, timelineOptions, ui );
        var selection = ui.selection;
        selection.selectedInterval.setInterval( parseTime_PMILLIS( '2014-01-01T08:30:00Z' ), parseTime_PMILLIS( '2014-01-01T08:50:00Z' ) );

        var contentPane = new Pane( newCornerLayout( Side.LEFT, Side.TOP ) );
        contentPane.addPane( timelinePane );
        drawable.setContentPane( newInsetPane( contentPane, newInsets( 12, 10, 2 ), timelineOptions.bgColor ) );
        drawable.redraw( );

        // Load UI styles
        //

        $.getJSON( 'timelineUi.json', function( uiStyles : { eventStyles : TimelineEventStyle[]; annotationStyles : TimelineAnnotationStyle[] } ) {
            uiStyles.eventStyles.forEach( function( s ) {
                ui.eventStyles.add( new TimelineEventStyleUi( s ) );
            } );
            uiStyles.annotationStyles.forEach( function( s ) {
                ui.annotationStyles.add( new TimelineAnnotationStyleUi( s ) );
            } );
        } );



        // Example Toolbar Actions
        //

        // step in 1 hour increments
        var timeStep = hoursToMillis( 1 );
        var selectedInterval = selection.selectedInterval;

        var a = document.getElementById( 'selected-time-step-backward' );
        a.onclick = function( ) {
            selectedInterval.pan( -timeStep );
            // if the time selection scrolls off the screen, jump the axis to keep it visible
            if ( selectedInterval.start_PMILLIS < timeAxis.tMin_PMILLIS ) {
                var tSize_MILLIS = timeAxis.tSize_MILLIS;
                timeAxis.tMin_PMILLIS = selectedInterval.start_PMILLIS;
                timeAxis.tMax_PMILLIS = timeAxis.tMin_PMILLIS + tSize_MILLIS;
            }
            drawable.redraw( );
        };

        var a = document.getElementById( 'selected-time-step-forward' );
        a.onclick = function( ) {
            selectedInterval.pan( timeStep );
            // if the time selection scrolls off the screen, jump the axis to keep it visible
            if ( selectedInterval.end_PMILLIS > timeAxis.tMax_PMILLIS ) {
                var tSize_MILLIS = timeAxis.tSize_MILLIS;
                timeAxis.tMax_PMILLIS = selectedInterval.end_PMILLIS;
                timeAxis.tMin_PMILLIS = timeAxis.tMax_PMILLIS - tSize_MILLIS;
            }
            drawable.redraw( );
        };

        var a = document.getElementById( 'selected-time-decrease' );
        a.onclick = function( ) {
            var newDuration_MILLIS = Math.max( selectedInterval.duration_MILLIS - timeStep, timeStep );
            selectedInterval.start_PMILLIS = selectedInterval.end_PMILLIS - newDuration_MILLIS;
            drawable.redraw( );
        };

        var a = document.getElementById( 'selected-time-increase' );
        a.onclick = function( ) {
            var newDuration_MILLIS = Math.max( selectedInterval.duration_MILLIS + timeStep, timeStep );
            selectedInterval.start_PMILLIS = selectedInterval.end_PMILLIS - newDuration_MILLIS;
            drawable.redraw( );
        };
        
        var a = document.getElementById( 'selected-time-calendar' );
        a.onclick = function() {

            var dateFormat = 'M/D/YYYY';
            var id = 'calendar1';

            var calendardiv = document.getElementById(id);
            if ( !calendardiv ) {
                calendardiv = document.createElement( 'div' );

                calendardiv.style.fontSize = '12';
                
                var rect = a.getBoundingClientRect();
                var position: number[] = [rect.left, rect.bottom - 4];

                var options = {};
                var callback = function(date, picker) {
                    var newTime = moment(date, dateFormat).valueOf();

                    var selectionDiff = selectedInterval.end_PMILLIS - selectedInterval.start_PMILLIS;
                    var axisDiff = timeAxis.tMax_PMILLIS - timeAxis.tMin_PMILLIS;
                    
                    // jump the selected and axis times
                    selectedInterval.start_PMILLIS = newTime - selectionDiff;
                    selectedInterval.end_PMILLIS = newTime;

                    timeAxis.tMin_PMILLIS = newTime - axisDiff;
                    timeAxis.tMax_PMILLIS = newTime;
                    
                    drawable.redraw( );
                }

                var date = moment( selectedInterval.start_PMILLIS ).format( dateFormat );

                $( calendardiv ).datepicker( 'dialog', date, callback, options, position );
            }
        };
        
        // Link a button to maximize / unmaximize two specific rows
        
        var a = document.getElementById( 'maximize-button' );
        a.onclick = function() {
            if ( model.root.maximizedRowGuids.hasValue( 'metsci.timelineExample.row03a' ) ) {
                model.root.maximizedRowGuids.removeValue( 'metsci.timelineExample.row03a' );
            }
            else {
                model.root.maximizedRowGuids.add( 'metsci.timelineExample.row03a' );
            }
                
            if ( model.root.maximizedRowGuids.hasValue( 'metsci.timelineExample.dynamicRow02' ) ) {
                model.root.maximizedRowGuids.removeValue( 'metsci.timelineExample.dynamicRow02' );
            }
            else {
                model.root.maximizedRowGuids.add( 'metsci.timelineExample.dynamicRow02' );
            }
        };
        
        // Toggle row maximize by double clicking on row label
        
        //add listener for new TimelineRowUi
        ui.rowUis.valueAdded.on( function ( rowUi : TimelineRowUi ) {
            // add listener for new Panes
            rowUi.panes.valueAdded.on( function ( pane : Pane, index : number ) {
                var id = rowUi.panes.idAt( index );
                // test if the new Pane is a maximized row label pane
                if ( id === 'maximized-label' ) {
                     // add a mouse listener to the maximized row label Pane
                    pane.mouseDown.on( function( event : PointerEvent ) {
                        if ( event.clickCount === 2 ) {
                            // minimize the double clicked row
                            model.root.maximizedRowGuids.removeValue( rowUi.rowGuid );
                        }
                    } );
                }
                // test if the new Pane is a label pane (id ends with '-label')
                else if ( id.search( '-label$' ) !== -1 ) {
                     // add a mouse listener to the row label Pane
                    pane.mouseDown.on( function( event : PointerEvent ) {
                        if ( event.clickCount === 2 ) {
                            // maximize the double clicked row
                            model.root.maximizedRowGuids.add( rowUi.rowGuid );
                        }
                    } );
                }
            } );
        } );
        
        // Link a button to pin / unpin some rows to the top/bottom of the timeline
        
        var a = document.getElementById( 'pin-button' );
        a.onclick = function() {
            if ( model.root.topPinnedRowGuids.hasValue( 'metsci.timelineExample.row01a' ) ) {
                model.root.topPinnedRowGuids.removeValue( 'metsci.timelineExample.row01a' );
            }
            else {
                model.root.topPinnedRowGuids.add( 'metsci.timelineExample.row01a' );
            }
            
            if ( model.root.topPinnedRowGuids.hasValue( 'metsci.timelineExample.row01b' ) ) {
                model.root.topPinnedRowGuids.removeValue( 'metsci.timelineExample.row01b' );
            }
            else {
                model.root.topPinnedRowGuids.add( 'metsci.timelineExample.row01b' );
            }
            
            if ( model.root.bottomPinnedRowGuids.hasValue( 'metsci.timelineExample.row03a' ) ) {
                model.root.bottomPinnedRowGuids.removeValue( 'metsci.timelineExample.row03a' );
            }
            else {
                model.root.bottomPinnedRowGuids.add( 'metsci.timelineExample.row03a' );
            }
        };
        
        // Link a button change the size of a particular row
        
        var customRowHeight = 135;
        var a = document.getElementById( 'flag-button' );
        a.onclick = function() {
            customRowHeight = customRowHeight + 10;
            if ( customRowHeight > 200 ) customRowHeight = 135;
            
            model.row( 'metsci.timelineExample.row03a' ).rowHeight = customRowHeight;
        };

        // Example Event-Hover Overlay
        //
        // Shows overlay div, containing arbitrary html content, when an event is hovered
        //

        var tooltip = newExampleTooltip( );
        var iTooltipOffset = +12;
        var jTooltipOffset = -12;

        selection.hoveredEvent.changed.on( function( ) {
            var hoveredEvent = selection.hoveredEvent.value;
            if ( hoveredEvent ) {
                var iMouse = selection.mousePos.x;
                var jMouse = selection.mousePos.y;
                if ( isNumber( iMouse ) && isNumber( jMouse ) ) {

                    // Generate application-specific html content, based on which event is hovered
                    var html = hoveredEvent.label;

                    tooltip.show( html, iMouse+iTooltipOffset, jMouse+jTooltipOffset );
                }
                else {
                    tooltip.hide( );
                }
            }
            else {
                tooltip.hide( );
            }
        } );

        selection.mousePos.changed.on( function( ) {
            var iMouse = selection.mousePos.x;
            var jMouse = selection.mousePos.y;
            if ( isNumber( iMouse ) && isNumber( jMouse ) ) {
                tooltip.move( iMouse+iTooltipOffset, jMouse+jTooltipOffset );
            }
            else {
                tooltip.hide( );
            }
        } );

        // Example Timeseries-Hover Overlay
        //
        // Shows overlay div, containing arbitrary html content, when a timeseries point is hovered
        //
        
        var hoveredFragment : TimelineTimeseriesFragmentModel;

        var updateTimeseriesTooltip = function( ) {
            
            // unattach any old data change listener
            if ( hasval( hoveredFragment ) ) {
                hoveredFragment.dataChanged.off( updateTimeseriesTooltip );
            }
            
            hoveredFragment = selection.hoveredTimeseries.fragment;
            
            if ( hasval( hoveredFragment ) ) {
                
                // attach listener to newly selected fragment to update toolip when fragment data changes
                hoveredFragment.dataChanged.on( updateTimeseriesTooltip );
                
                var iMouse = selection.mousePos.x;
                var jMouse = selection.mousePos.y;
                if ( isNumber( iMouse ) && isNumber( jMouse ) ) {

                    // Generate application-specific html content, based on which event is hovered
                    var html = '' + selection.hoveredTimeseries.data.toFixed(2);

                    tooltip.show( html, iMouse+iTooltipOffset, jMouse+jTooltipOffset );
                }
                else {
                    tooltip.hide( );
                }
            }
            else {
                tooltip.hide( );
            }
        };
        
        selection.hoveredTimeseries.changed.on( updateTimeseriesTooltip );


        // Example Input Listeners
        //
        // Fill these in with application-specific input-handling code
        //
        
        selection.hoveredAnnotation.changed.on( function( ) {
            if ( hasval( selection.hoveredAnnotation.value ) )
            {
                // Do something with the hovered annotation
            }
        });
        
        selection.hoveredTimeseries.changed.on( function( ) {
            if ( hasval( selection.hoveredTimeseries.fragment ) )
            {
                // Do something with the time and data value of the selected timeseries point 
                var dataValue = selection.hoveredTimeseries.data;
                var time_PMILLIS = selection.hoveredTimeseries.times_PMILLIS;
            }
        } );

        selection.mousePos.changed.on( function( ) {
            // Handle mouse position
            var iMouse = selection.mousePos.x; // null if the mouse is outside the timeline
            var jMouse = selection.mousePos.y; // null if the mouse is outside the timeline
        } );

        selection.hoveredTime_PMILLIS.changed.on( function( ) {
            // Handle hovered time
            var hoveredTime_PMILLIS = selection.hoveredTime_PMILLIS.value;
        } );

        selection.selectedInterval.changed.on( function( ) {
            // Handle selected time interval
            var selectionStart_PMILLIS = selection.selectedInterval.start_PMILLIS;
            var selectionEnd_PMILLIS = selection.selectedInterval.end_PMILLIS;
        } );

        selection.hoveredRow.changed.on( function( ) {
            // Handle row hovered
            var hoveredRow = selection.hoveredRow.value;
        } );

        selection.hoveredEvent.changed.on( function( ) {
            // Handle event hovered
            var hoveredEvent = selection.hoveredEvent.value;
        } );

        selection.selectedEvents.valueAdded.on( function( event : TimelineEventModel ) {
            // Handle event selected
        } );

        selection.selectedEvents.valueRemoved.on( function( event : TimelineEventModel ) {
            // Handle event de-selected
        } );
        
        
        // Example Dynamic Data
        //
        // Populate the timeline model with a dynamically generated group, row, and custom painters
        //

        var group4 = {
            groupGuid: 'metsci.timelineExample.group04',
            label: 'Group #4',
            rowGuids: []
        };
        model.groups.add( new TimelineGroupModel( group4 ) );
        model.root.groupGuids.add( group4.groupGuid );

        var row = {
            rowGuid: 'metsci.timelineExample.dynamicRow01',
            label: 'Broadband',
            eventGuids: []
        };
        model.rows.add( new TimelineRowModel( row ) );
        model.group( group4.groupGuid ).rowGuids.add( row.rowGuid );

        var row = {
            rowGuid: 'metsci.timelineExample.dynamicRow02',
            label: 'Heatmap',
            eventGuids: []
        };
        model.rows.add( new TimelineRowModel( row ) );
        model.group( group4.groupGuid ).rowGuids.add( row.rowGuid );
        
        // create an empty timeseries fragment and listen for changes to its data
        // the fragment will be filled later with data loaded from timeline.json
        
        var fragment3 = new TimelineTimeseriesFragmentModel( { fragmentGuid: 'metsci.timelineExample.fragment03' } );
        model.timeseriesFragments.add( fragment3 );
        
        // print the new data value when fragment3 changes
        // also, ensure that fragment1 data values never exceed 20
        fragment3.dataChanged.on( function( startIndex : number, endIndex : number ) {
            for ( var i = startIndex ; i < endIndex ; i++ ) {
                if ( fragment3.data[i] > 20 ) {
                    fragment3.setData( i, 20 );
                }
            }
        } );
        
        // Example Custom Row
        //
        // Create a heatmap row with data loaded form a json file
        //
        
        $.getJSON( 'heatmapData.json', function( json : any ) {
            
            // pull heat map data fields out of the returned json object
            var angleMin = json.minY;
            var angleMax = json.maxY;
            var timeMin = timeAxis.vAtTime( parseTime_PMILLIS( json.minX ) );
            var timeMax = timeAxis.vAtTime( parseTime_PMILLIS( json.maxX ) );
            var ySize = json.sizeY;
            var xSize = json.sizeX;
            
            var array = new Float32Array( xSize * ySize );
            for ( var x = 0 ; x < xSize ; x++ ) {
                for ( var y = 0 ; y < ySize ; y++ ) {
                    array[ y * xSize + x ] =  json.data[y][x];
                }
            }
           
            var createHeatmapPlotPane = function( drawable : Drawable, timeAxis : TimeAxis1D, yAxis : Axis1D, model : TimelineModel, row : TimelineRowModel, ui : TimelineUi, options : TimelineRowPaneOptions ) : Pane {
                var axisColor = options.timelineFgColor;

                var height = options.isMaximized ? null : 270;
                
                // setup axes
                var colorAxis = new Axis1D( -0.7, 0.3 );
                colorAxis.limitsChanged.on( drawable.redraw );
                
                yAxis.setVRange( 0, 180 );
                yAxis.limitsChanged.on( drawable.redraw );
                
                var rowAxis = new Axis2D( timeAxis, yAxis );
                
                var spacerPane = new Pane( { updatePrefSize: fixedSize( null, height ) }, false );
                
                var yAxisPane = new Pane( { updatePrefSize: fixedSize( 40, height ) } );
                attachAxisMouseListeners1D( yAxisPane, yAxis, true );
                
                var colorAxisPane = new Pane( { updatePrefSize: fixedSize( 40, height ) } );
                attachAxisMouseListeners1D( colorAxisPane, colorAxis, true );
                
                var colorInsetPane = newInsetPane( colorAxisPane, newInsets( 10, 10, 10, 10 ), null, false );
                colorInsetPane.addPainter( newBlendingBackgroundPainter( rgba( 0, 0, 0, 0.6 ) ) );

                // build arguments to newHeatmapPainter( )
                var data = { array : array, xSize : xSize, ySize : ySize, xMin : timeMin, xMax : timeMax, yMin : angleMin, yMax : angleMax };
                var colorGradient = reverseBone;
                var colorScale = getGradientTexture( colorGradient );
                
                // construct Pane and Painters
                var plotPane = new Pane( newColumnLayout( ), false );
                plotPane.addPainter( newHeatmapPainter( rowAxis, colorAxis, data, colorScale, { blend: true } ) );
                plotPane.addPainter( newEdgeAxisPainter( yAxis, Side.RIGHT, { showLabel: false, textColor: axisColor, tickColor: axisColor, tickSpacing: 34, tickSize: 5, font: '9px verdana,sans-serif' } ) );
                colorAxisPane.addPainter( newEdgeAxisPainter( colorAxis, Side.RIGHT, { showLabel: false, textColor: axisColor, tickColor: axisColor, tickSpacing: 34, tickSize: 10, showBorder : true, gradientFill : colorGradient, font: '9px verdana,sans-serif' } ) );
                plotPane.addPane( yAxisPane, 0 );
                plotPane.addPane( spacerPane, 1 );
                plotPane.addPane( colorInsetPane, 2 );
                
                return plotPane;
            }

            // Override content of an existing row
            ui.rowUi( 'metsci.timelineExample.dynamicRow01' ).paneFactory = createHeatmapPlotPane;
        });
        
        // Another Example Custom Row
        //
        // Create a heatmap row with programmatically generated data
        //
        
        var createHeatmapPlotPane = function( drawable : Drawable, timeAxis : TimeAxis1D, yAxis : Axis1D, model : TimelineModel, row : TimelineRowModel, ui : TimelineUi, options : TimelineRowPaneOptions ) : Pane {
            var axisColor = options.timelineFgColor;

            var height = options.isMaximized ? null : 270;
            
            // setup axes
            var colorAxis = new Axis1D( 0, 30 );
            colorAxis.limitsChanged.on( drawable.redraw );
            
            yAxis.setVRange( -400, 400 );
            yAxis.limitsChanged.on( drawable.redraw );
            
            var rowAxis = new Axis2D( timeAxis, yAxis );
            
            var spacerPane = new Pane( { updatePrefSize: fixedSize( null, height ) }, false );
            
            var yAxisPane = new Pane( { updatePrefSize: fixedSize( 40, height ) } );
            attachAxisMouseListeners1D( yAxisPane, yAxis, true );
            
            var colorAxisPane = new Pane( { updatePrefSize: fixedSize( 40, height ) } );
            attachAxisMouseListeners1D( colorAxisPane, colorAxis, true );
            
            var colorInsetPane = newInsetPane( colorAxisPane, newInsets( 10, 10, 10, 10 ), null, false );
            colorInsetPane.addPainter( newBlendingBackgroundPainter( rgba( 0, 0, 0, 0.6 ) ) );

            // set heat map min/max bounds (in time and y axis value)
              
            var yMin = -1000;
            var yMax = 1000;
            var timeMin = timeAxis.vAtTime( parseTime_PMILLIS( '2013-12-31T21:00:00Z' ) );
            var timeMax = timeAxis.vAtTime( parseTime_PMILLIS( '2014-01-02T06:19:00Z' ) );
            
            // fill heat map data array
            var xSize = 1000;
            var ySize = 300;
            var w = 2 * Math.PI / 60;
            var fr = 0;
            var array = new Float32Array( xSize * ySize );
            for ( var x = 0 ; x < xSize ; x++ ) {
                for ( var y = 0 ; y < ySize ; y++ ) {
                    var x0 = 2 * Math.PI * x / xSize;
                    var x1 = 2 * Math.PI * y / ySize;
                    var value = 30 * Math.abs( Math.sin( x0 + w * fr ) ) * ( Math.sin( x0 - w * fr ) * Math.sin( 8 * x0 + w * fr ) * Math.cos( -8 * x1 - w * fr ) +Math.abs( Math.sin( 24 * x1 ) ) / 3 );
                    array[ y * xSize + x ] =  value;
                }
            }
            
            // build arguments to newHeatmapPainter( )
            var data = { array : array, xSize : xSize, ySize : ySize, xMin : timeMin, xMax : timeMax, yMin : yMin, yMax : yMax };
            var colorGradient = jet;
            var colorScale = getGradientTexture( colorGradient );
            
            // construct Pane and Painters
            var plotPane = new Pane( newColumnLayout( ), false );
            plotPane.addPainter( newHeatmapPainter( rowAxis, colorAxis, data, colorScale, { blend: true } ) );
            plotPane.addPainter( newEdgeAxisPainter( yAxis, Side.RIGHT, { showLabel: false, textColor: axisColor, tickColor: axisColor, tickSpacing: 34, tickSize: 5, font: '9px verdana,sans-serif' } ) );
            colorAxisPane.addPainter( newEdgeAxisPainter( colorAxis, Side.RIGHT, { showLabel: false, textColor: axisColor, tickColor: axisColor, tickSpacing: 34, tickSize: 10, showBorder : true, gradientFill : colorGradient, font: '9px verdana,sans-serif' } ) );
            plotPane.addPane( yAxisPane, 0 );
            plotPane.addPane( spacerPane, 1 );
            plotPane.addPane( colorInsetPane, 2 );

            return plotPane;
            
        }

        // Override content of an existing row
        ui.rowUi( 'metsci.timelineExample.dynamicRow02' ).paneFactory = createHeatmapPlotPane;

        // Example JSON Event loading
        //
        // Fetch timeline data from the server, and merge it into the existing timeline model
        //
        $.getJSON( 'timelineData.json', function( newTimeline : Timeline ) {
            model.merge( newTimeline, timelineMergeNewBeforeOld );
            
            // once the timeline has been loaded, add listeners to some of the Panes
            var pane = ui.rowUi( 'metsci.timelineExample.row03a' ).getPane( 'y-axis' );
            var clickListener = function( ev : PointerEvent ) {
                console.log( 'y-axis click: ' + ev.clickCount );
            };
            pane.mouseDown.on( clickListener );
        } );
        
        // Example function for reloading TimelinePane with new TimelinePaneOptions. Takes care of
        // removing the TimelinePane from its parent pane, disposing of its listeners/resources,
        // creating a new TimelinePane, and reattaching it to the parent Pane. The new TimelinePane
        // is returned.
        //
        // In this example, this function would be called as follows:
        //
        // timelinePane = reloadTimeline( contentPane, timelinePane, timelineOptions );
        //
        var reloadTimeline = function( parentPane : Pane, oldTimelinePane : TimelinePane, newOptions : TimelinePaneOptions ) : TimelinePane {

            // remove the old TimelinePane from the parent Pane, dispose of it, and create a new TimelinePane
            parentPane.removePane( oldTimelinePane );
            oldTimelinePane.dispose.fire( );
            var reloadedTimelinePane = newTimelinePane( drawable, timeAxis, model, timelineOptions, oldTimelinePane.ui );
            parentPane.addPane( reloadedTimelinePane );

            // update the drawable
            drawable.redraw( );
        
            // return the newly created Pane
            return reloadedTimelinePane;
        }
    }
}
