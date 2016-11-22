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


    // Default
    //

    export var timeseriesRowPainterFactories_DEFAULT = [
        newTimeseriesPainterFactory( ),
        newTimeseriesAnnotationPainterFactory( ),
        newTimeseriesCursorPainterFactory( {
            font: '16px verdana,sans-serif',
            buffer_px: 6
        } )
    ];
    
    export var eventsRowPaneFactory_DEFAULT : TimelineRowPaneFactory = newEventsRowPaneFactory( {
        laneHeight: 40,
        painterFactories: [
            newEventLimitsPainterFactory( ),
            newEventBarsPainterFactory( ),
            newEventIconsPainterFactory( ),
            newEventLabelsPainterFactory( {
                iconsSizeFactor: 0.7
            } )
        ]
    } );
    
    export var timeseriesRowPaneFactory_DEFAULT : TimelineRowPaneFactory = newTimeseriesRowPaneFactory( {
        painterFactories: timeseriesRowPainterFactories_DEFAULT,
        axisOptions: { tickSpacing: 34 }
    } );

    export function rowPaneFactoryChooser_DEFAULT( row : TimelineRowModel ) : TimelineRowPaneFactory {
        if ( !row.eventGuids.isEmpty ) {
            return eventsRowPaneFactory_DEFAULT;
        }
        else if ( !row.timeseriesGuids.isEmpty ) {
            return timeseriesRowPaneFactory_DEFAULT;
        }
        else {
            return null;
        }
    }



    // Thin
    //

    export var eventsRowPaneFactory_THIN : TimelineRowPaneFactory = newEventsRowPaneFactory( {
        rowTopPadding: 0,
        rowBottomPadding: 0,
        laneHeight: 23,
        allowMultipleLanes: true,
        painterFactories: [
            newEventLimitsPainterFactory( {
                lineColor: new Color( 1, 0, 0, 1 ),
                lineThickness: 2
            } ),
            newEventStripedBarsPainterFactory( {
                bottomMargin: 0,
                topMargin: 13,
                minimumVisibleWidth: 0,
                stripeSlant: -1,
                stripeSecondaryWidth: 10,
                stripeWidth: 10
            } ),
            newEventDashedBordersPainterFactory( {
                bottomMargin: 0,
                topMargin: 13,
                minimumVisibleWidth: 0,
                cornerType: JointType.MITER,
                dashLength: 5
            } ),
            newEventIconsPainterFactory( {
                bottomMargin: 0,
                topMargin: 13,
                vAlign: 0.0
            } ),
            newEventLabelsPainterFactory( {
                bottomMargin: 12,
                topMargin: 0,
                leftMargin: 2,
                rightMargin: 2,
                vAlign: 0.0,
                spacing: 2,
                extendBeyondBar: true,
                textMode: 'force'
            } )
        ]
    } );

    export function rowPaneFactoryChooser_THIN( row : TimelineRowModel ) : TimelineRowPaneFactory {
        if ( !row.eventGuids.isEmpty ) {
            return eventsRowPaneFactory_THIN;
        }
        else if ( !row.timeseriesGuids.isEmpty ) {
            return timeseriesRowPaneFactory_DEFAULT;
        }
        else {
            return null;
        }
    }
    
    export var eventsRowPaneFactory_SINGLE : TimelineRowPaneFactory = newEventsRowPaneFactory( {
        rowTopPadding: 0,
        rowBottomPadding: 0,
        laneHeight: 23,
        allowMultipleLanes: false,
        painterFactories: [
            newEventLimitsPainterFactory( {
                lineColor: new Color( 1, 0, 0, 1 ),
                lineThickness: 2
            } ),
            newCombinedEventPainterFactory( 
                {
                    bottomMargin: 0,
                    topMargin: 13,
                    minimumVisibleWidth: 0,
                    cornerType: JointType.MITER
                },
                {
                    bottomMargin: 12,
                    topMargin: 0,
                    leftMargin: 2,
                    rightMargin: 2,
                    vAlign: 0.0,
                    spacing: 2,
                    extendBeyondBar: false,
                    textMode: 'show'
                },
                {
                    bottomMargin: 0,
                    topMargin: 13,
                    vAlign: 0.0
                }
            )
        ]
    } );
    
    export function rowPaneFactoryChooser_SINGLE( row : TimelineRowModel ) : TimelineRowPaneFactory {
        if ( !row.eventGuids.isEmpty ) {
            return eventsRowPaneFactory_SINGLE;
        }
        else if ( !row.timeseriesGuids.isEmpty ) {
            return timeseriesRowPaneFactory_DEFAULT;
        }
        else {
            return null;
        }
    }

}