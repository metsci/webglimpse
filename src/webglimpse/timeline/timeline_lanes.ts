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


    export class TimelineLaneArray {
        private _ui : TimelineUi;
        private _row : TimelineRowModel;
        private _lanes : TimelineLane[];
        private _laneNums : StringMap<number>;
        
        private _rebuildLanesMouseWheel;
        private _rebuildLanes;
        private _newEvent;
        private _addEvent;
        private _removeEvent;
        
        private _model : TimelineModel;
        
        // Keep references to listeners, so that we can remove them later
        private _eventAttrsListeners : StringMap<Listener>;

        constructor( model : TimelineModel, row : TimelineRowModel, ui : TimelineUi, allowMultipleLanes : boolean ) {
            this._model = model;
            this._row = row;
            this._ui = ui;
            
            this._lanes = [];
            this._laneNums = {};
            this._eventAttrsListeners = {};

            var self = this;

            function findAvailableLaneNum( event : TimelineEventModel, startLaneNum : number, endLaneNum : number ) : number {
                for ( var n = startLaneNum; n < endLaneNum; n++ ) {
                    if ( self._lanes[ n ].couldFitEvent( event ) ) {
                        return n;
                    }
                }
                return null;
            }

            function firstAvailableLaneNum( event : TimelineEventModel ) : number {
                var laneNum = findAvailableLaneNum( event, 0, self._lanes.length );
                return ( hasval( laneNum ) ? laneNum : self._lanes.length );
            }

            function addEventToLane( event : TimelineEventModel, laneNum : number ) {
                if ( !self._lanes[ laneNum ] ) {
                    self._lanes[ laneNum ] = allowMultipleLanes ? new TimelineLaneStack( ui ) : new TimelineLaneSimple( ui );
                }
                self._lanes[ laneNum ].add( event );
                self._laneNums[ event.eventGuid ] = laneNum;
            }

            function fillVacancy( vacancyLaneNum : number, vacancyEdges_PMILLIS : number[] ) {
                var vacancyLane = self._lanes[ vacancyLaneNum ];
                for ( var n = vacancyLaneNum + 1; n < self._lanes.length; n++ ) {
                    var lane = self._lanes[ n ];
                    var possibleTenants = lane.collisionsWithInterval( vacancyEdges_PMILLIS[ 0 ], vacancyEdges_PMILLIS[ 1 ] );
                    for ( var p = 0; p < possibleTenants.length; p++ ) {
                        var event = possibleTenants[ p ];
                        if ( vacancyLane.couldFitEvent( event ) ) {
                            lane.remove( event );
                            addEventToLane( event, vacancyLaneNum );
                            fillVacancy( n, effectiveEdges_PMILLIS( ui, event ) );
                        }
                    }
                }
            }

            function trimEmptyLanes( ) {
                for ( var n = self._lanes.length - 1; n >= 0; n-- ) {
                    if ( self._lanes[ n ].isEmpty( ) ) {
                        self._lanes.splice( n, 1 );
                    }
                    else {
                        break;
                    }
                }
            }

            // adds event to lane, may be called multiple times
            this._addEvent = function( eventGuid : string ) {
                if ( hasval( self._laneNums[ eventGuid ] ) ) {
                    throw new Error( 'Lanes-array already contains this event: row-guid = ' + row.rowGuid + ', lane = ' + self._laneNums[ eventGuid ] + ', event-guid = ' + eventGuid );
                }
                var event = model.event( eventGuid );
                var laneNum = firstAvailableLaneNum( event );
                addEventToLane( event, laneNum );
            };

            row.eventGuids.forEach( this._addEvent );
            row.eventGuids.valueAdded.on( this._addEvent );
            
            // attaches listeners to event, should be called only once
            // when an event is first added to the row model
            this._newEvent = function( eventGuid : string ) {
                var event = model.event( eventGuid );
                var oldEdges_PMILLIS = effectiveEdges_PMILLIS( ui, event );
                var updateLaneAssignment = function( ) {
                    var newEdges_PMILLIS = effectiveEdges_PMILLIS( ui, event );
                    if ( newEdges_PMILLIS[ 0 ] !== oldEdges_PMILLIS[ 0 ] || newEdges_PMILLIS[ 1 ] !== oldEdges_PMILLIS[ 1 ] ) {
                        var oldLaneNum = self._laneNums[ event.eventGuid ];
                        var oldLane = self._lanes[ oldLaneNum ];

                        var betterLaneNum = findAvailableLaneNum( event, 0, oldLaneNum );
                        if ( hasval( betterLaneNum ) ) {
                            // Move to a better lane
                            oldLane.remove( event );
                            addEventToLane( event, betterLaneNum );
                        }
                        else if ( oldLane.eventStillFits( event ) ) {
                            // Stay in the current lane
                            oldLane.update( event );
                        }
                        else {
                            // Take whatever lane we can get
                            var newLaneNum = findAvailableLaneNum( event, oldLaneNum + 1, self._lanes.length );
                            if ( !hasval( newLaneNum ) ) newLaneNum = self._lanes.length;
                            oldLane.remove( event );
                            addEventToLane( event, newLaneNum );
                        }

                        fillVacancy( oldLaneNum, oldEdges_PMILLIS );
                        trimEmptyLanes( );

                        oldEdges_PMILLIS = newEdges_PMILLIS;
                    }
                };
                
                event.attrsChanged.on( updateLaneAssignment );
                self._eventAttrsListeners[ eventGuid ] = updateLaneAssignment;  
            };
            row.eventGuids.forEach( this._newEvent );
            row.eventGuids.valueAdded.on( this._newEvent );

            this._removeEvent = function( eventGuid : string ) {
                var event = model.event( eventGuid );

                var oldLaneNum = self._laneNums[ eventGuid ];
                delete self._laneNums[ eventGuid ];

                self._lanes[ oldLaneNum ].remove( event );
                fillVacancy( oldLaneNum, effectiveEdges_PMILLIS( ui, event ) );
                trimEmptyLanes( );

                event.attrsChanged.off( self._eventAttrsListeners[ eventGuid ] );
                delete self._eventAttrsListeners[ eventGuid ];
            }
            row.eventGuids.valueRemoved.on( this._removeEvent );

            self._rebuildLanes = function( ) {
                var oldLanes = self._lanes;
                self._lanes = [];
                self._laneNums = {};

                for ( var l = 0; l < oldLanes.length; l++ ) {
                    var lane = oldLanes[ l ];
                    for ( var e = 0; e < lane.length; e++ ) {
                        var event = lane.event( e );
                        self._addEvent( event.eventGuid );
                    }
                }
            };
            
            var hasIcons = function( ) {
                var oldLanes = self._lanes;
                for ( var l = 0; l < oldLanes.length; l++ ) {
                    var lane = oldLanes[ l ];
                    for ( var e = 0; e < lane.length; e++ ) {
                        var event = lane.event( e );
                        var style = ui.eventStyle( event.styleGuid );
                        if ( event.labelIcon || style.numIcons > 0 ) return true;
                    }
                }
                return false;
            }
            
            self._rebuildLanesMouseWheel = function( ) {
                if ( hasIcons( ) ) {
                    self._rebuildLanes( );
                }
            }
            
            ui.millisPerPx.changed.on( self._rebuildLanesMouseWheel );
            ui.eventStyles.valueAdded.on( self._rebuildLanes );
            ui.eventStyles.valueRemoved.on( self._rebuildLanes );
        }

        get length( ) : number {
            return this._lanes.length;
        }

        lane( index : number ) : TimelineLane {
            return this._lanes[ index ];
        }

        get numEvents( ) : number {
            return this._row.eventGuids.length;
        }

        eventAt( laneNum : number, time_PMILLIS : number ) : TimelineEventModel {
            var lane = this._lanes[ laneNum ];
            return ( lane && lane.eventAtTime( time_PMILLIS ) );
        }
        
        dispose( ) : void {
            this._row.eventGuids.valueAdded.off( this._addEvent );
            this._row.eventGuids.valueRemoved.off( this._removeEvent );
            this._row.eventGuids.valueAdded.off( this._newEvent );

            this._ui.millisPerPx.changed.off( this._rebuildLanesMouseWheel );
            this._ui.eventStyles.valueAdded.off( this._rebuildLanes );
            this._ui.eventStyles.valueRemoved.off( this._rebuildLanes );
            
            for ( var eventGuid in this._eventAttrsListeners ) {
                if ( this._eventAttrsListeners.hasOwnProperty( eventGuid ) ) {
                    var listener = this._eventAttrsListeners[ eventGuid ];
                    var event = this._model.event( eventGuid );
                    if ( listener && event ) event.attrsChanged.off( listener );
                }
            }
        }
    }



    export function effectiveEdges_PMILLIS( ui : TimelineUi, event : TimelineEventModel ) : number[] {
        var start_PMILLIS = event.start_PMILLIS;
        var end_PMILLIS = event.end_PMILLIS;

        var millisPerPx = ui.millisPerPx.value;
        var eventStyle = ui.eventStyle( event.styleGuid );
        for ( var n = 0; n < eventStyle.numIcons; n++ ) {
            var icon = eventStyle.icon( n );
            var iconTime_PMILLIS = event.start_PMILLIS + icon.hPos*( event.end_PMILLIS - event.start_PMILLIS );
            var iconStart_PMILLIS = iconTime_PMILLIS - ( millisPerPx * icon.hAlign * icon.displayWidth );
            var iconEnd_PMILLIS = iconTime_PMILLIS + ( millisPerPx * (1-icon.hAlign) * icon.displayWidth );

            start_PMILLIS = Math.min( start_PMILLIS, iconStart_PMILLIS );
            end_PMILLIS = Math.max( end_PMILLIS, iconEnd_PMILLIS );
        }

        return [ start_PMILLIS, end_PMILLIS ];
    }


    export interface TimelineLane {
        length : number;
        event( index : number ) : TimelineEventModel;
        isEmpty( ) : boolean;
        eventAtTime( time_PMILLIS : number ) : TimelineEventModel;
        add( event : TimelineEventModel );
        remove( event : TimelineEventModel );
        eventStillFits( event : TimelineEventModel ) : boolean;
        update( event : TimelineEventModel );
        collisionsWithInterval( start_PMILLIS : number, end_PMILLIS : number ) : TimelineEventModel[];
        couldFitEvent( event : TimelineEventModel ) : boolean;
    }

    // a TimelineLane where no events start/end time overlap
    export class TimelineLaneStack implements TimelineLane {
        private _events : TimelineEventModel[];
        private _starts_PMILLIS : number[];
        private _ends_PMILLIS : number[];
        private _indices : StringMap<number>;
        private _ui : TimelineUi;

        constructor( ui : TimelineUi ) {
            this._events = [];
            this._starts_PMILLIS = [];
            this._ends_PMILLIS = [];
            this._indices = {};
            this._ui = ui;
        }

        get length( ) : number {
            return this._events.length;
        }

        event( index : number ) : TimelineEventModel {
            return this._events[ index ];
        }

        isEmpty( ) : boolean {
            return ( this._events.length === 0 );
        }

        eventAtTime( time_PMILLIS : number ) : TimelineEventModel {
            if ( hasval( time_PMILLIS ) ) {
                // Check the first event ending after time
                var iFirst = indexAfter( this._ends_PMILLIS, time_PMILLIS );
                if ( iFirst < this._events.length ) {
                    var eventFirst = this._events[ iFirst ];
                    var startFirst_PMILLIS = effectiveEdges_PMILLIS( this._ui, eventFirst )[ 0 ];
                    if ( time_PMILLIS >= startFirst_PMILLIS ) {
                        return eventFirst;
                    }
                }
                // Check the previous event, in case we're in its icon-slop
                var iPrev = iFirst - 1;
                if ( iPrev >= 0 ) {
                    var eventPrev = this._events[ iPrev ];
                    var endPrev_PMILLIS = effectiveEdges_PMILLIS( this._ui, eventPrev )[ 1 ];
                    if ( time_PMILLIS < endPrev_PMILLIS ) {
                        return eventPrev;
                    }
                }
            }
            return null;
        }

        add( event : TimelineEventModel ) {
            var eventGuid = event.eventGuid;
            if ( hasval( this._indices[ eventGuid ] ) ) throw new Error( 'Lane already contains this event: event = ' + formatEvent( event ) );

            var i = indexAfter( this._starts_PMILLIS, event.start_PMILLIS );
            if ( !this._eventFitsBetween( event, i-1, i ) ) throw new Error( 'New event does not fit between existing events: new = ' + formatEvent( event ) + ', before = ' + formatEvent( this._events[ i-1 ] ) + ', after = ' +formatEvent( this._events[ i ] ) );

            this._events.splice( i, 0, event );
            this._starts_PMILLIS.splice( i, 0, event.start_PMILLIS );
            this._ends_PMILLIS.splice( i, 0, event.end_PMILLIS );
            this._indices[ eventGuid ] = i;

            for ( var n = i; n < this._events.length; n++ ) {
                this._indices[ this._events[ n ].eventGuid ] = n;
            }
        }

        remove( event : TimelineEventModel ) {
            var eventGuid = event.eventGuid;
            var i = this._indices[ eventGuid ];
            if ( !hasval( i ) ) throw new Error( 'Event not found in this lane: event = ' + formatEvent( event ) );

            this._events.splice( i, 1 );
            this._starts_PMILLIS.splice( i, 1 );
            this._ends_PMILLIS.splice( i, 1 );
            delete this._indices[ eventGuid ];

            for ( var n = i; n < this._events.length; n++ ) {
                this._indices[ this._events[ n ].eventGuid ] = n;
            }
        }

        eventStillFits( event : TimelineEventModel ) : boolean {
            var i = this._indices[ event.eventGuid ];
            if ( !hasval( i ) ) throw new Error( 'Event not found in this lane: event = ' + formatEvent( event ) );

            return this._eventFitsBetween( event, i-1, i+1 );
        }

        update( event : TimelineEventModel ) {
            var i = this._indices[ event.eventGuid ];
            if ( !hasval( i ) ) throw new Error( 'Event not found in this lane: event = ' + formatEvent( event ) );

            this._starts_PMILLIS[ i ] = event.start_PMILLIS;
            this._ends_PMILLIS[ i ] = event.end_PMILLIS;
        }

        collisionsWithInterval( start_PMILLIS : number, end_PMILLIS : number ) : TimelineEventModel[] {
            // Find the first event ending after start
            var iFirst = indexAfter( this._ends_PMILLIS, start_PMILLIS );
            var iPrev = iFirst - 1;
            if ( iPrev >= 0 ) {
                var endPrev_PMILLIS = effectiveEdges_PMILLIS( this._ui, this._events[ iPrev ] )[ 1 ];
                if ( start_PMILLIS < endPrev_PMILLIS ) {
                    iFirst = iPrev;
                }
            }
            // Find the last event starting before end
            var iLast = indexBefore( this._starts_PMILLIS, end_PMILLIS );
            var iPost = iLast + 1;
            if ( iPost < this._events.length ) {
                var startPost_PMILLIS = effectiveEdges_PMILLIS( this._ui, this._events[ iPost ] )[ 0 ];
                if ( end_PMILLIS > startPost_PMILLIS ) {
                    iLast = iPost;
                }
            }
            // Return that section
            return this._events.slice( iFirst, iLast + 1 );
        }

        couldFitEvent( event : TimelineEventModel ) : boolean {
            var iAfter = indexAfter( this._starts_PMILLIS, event.start_PMILLIS );
            var iBefore = iAfter - 1;
            return this._eventFitsBetween( event, iBefore, iAfter );
        }

        _eventFitsBetween( event : TimelineEventModel, iBefore : number, iAfter : number ) : boolean {
            var edges_PMILLIS = effectiveEdges_PMILLIS( this._ui, event );

            if ( iBefore >= 0 ) {
                // Comparing one start-time (inclusive) and one end-time (exclusive), so equality means no collision
                var edgesBefore_PMILLIS = effectiveEdges_PMILLIS( this._ui, this._events[ iBefore ] );
                if ( edges_PMILLIS[ 0 ] < edgesBefore_PMILLIS[ 1 ] ) {
                    return false;
                }
            }

            if ( iAfter < this._events.length ) {
                // Comparing one start-time (inclusive) and one end-time (exclusive), so equality means no collision
                var edgesAfter_PMILLIS = effectiveEdges_PMILLIS( this._ui, this._events[ iAfter ] );
                if ( edges_PMILLIS[ 1 ] > edgesAfter_PMILLIS[ 0 ] ) {
                    return false;
                }
            }

            return true;
        }
    }
    
    // a TimelineLane where events are allowed to overlap arbitrarily
    // because of this assumptions like the index for an event in the _starts_PMILLIS
    // and _ends_PMILLIS arrays being the same no longer hold
    //
    // does not make any assumptions about event overlapping and uses
    // an inefficient O(n) brute force search to find events (an interval tree
    // would be needed for efficient search in the general case)
    export class TimelineLaneSimple implements TimelineLane {
        
        private _events : TimelineEventModel[];
        private _orders : number[];
        private _ids : StringMap<any>;
        private _ui : TimelineUi;
        
        constructor( ui : TimelineUi ) {
            this._events = [];
            this._orders = [];
            this._ids = {};
            this._ui = ui;
        }
        
        get length( ) : number {
            return this._events.length;
        }
        
        event( index : number ) : TimelineEventModel {
            return this._events[ index ];
        }
        
        isEmpty( ) : boolean {
            return ( this._events.length === 0 );
        }
        
        eventAtTime( time_PMILLIS : number ) : TimelineEventModel {
            
            var bestEvent : TimelineEventModel;
            
            // start at end of events list so that eventAtTime result
            // favors events drawn on top (in cases where events are unordered
            // those that happen to be at end end of th
            for ( var n = this._events.length-1; n >= 0; n-- ) {
                var event : TimelineEventModel = this._events[n];
                
                if ( time_PMILLIS > event.start_PMILLIS &&
                     time_PMILLIS < event.end_PMILLIS &&
                     ( bestEvent === undefined || bestEvent.order < event.order ) ) {
                    bestEvent = event;
                }
            }
            
            return bestEvent;
        }
        
        add( event : TimelineEventModel ) {
            var eventGuid = event.eventGuid;
            if ( hasval( this._ids[ eventGuid ] ) ) throw new Error( 'Lane already contains this event: event = ' + formatEvent( event ) );
            
            // for events with undefined order, replace with largest possible negative order so sort is correct
            var order = hasval( event.order ) ? event.order : Number.NEGATIVE_INFINITY;

            var i : number = indexAtOrAfter( this._orders, order );

            this._ids[ eventGuid ] = eventGuid;
            this._orders.splice( i, 0, order );
            this._events.splice( i, 0, event );
        }
        
        remove( event : TimelineEventModel ) {
            var eventGuid = event.eventGuid;
            if ( !hasval( this._ids[ eventGuid ] ) ) throw new Error( 'Event not found in this lane: event = ' + formatEvent( event ) );
            
            delete this._ids[ eventGuid ];
            var i : number = this._getIndex( event );
            this._orders.splice( i, 1 );
            this._events.splice( i, 1 );
        }
        
        update( event : TimelineEventModel ) {
            // no action is necessary since we don't maintain any time indexed data structures
        }
        
        collisionsWithInterval( start_PMILLIS : number, end_PMILLIS : number ) : TimelineEventModel[] {
            
            var results = [];
            
            for ( var n = 0; n < this._events.length; n++ ) {
                var event : TimelineEventModel = this._events[n];
                
                if ( !(start_PMILLIS > event.end_PMILLIS || end_PMILLIS < event.start_PMILLIS) ) {
                    results.push( event );
                }
            }
            
            return results;
        }
   
        // we can always fit more events because overlaps are allowed
        eventStillFits( event : TimelineEventModel ) : boolean {
            return true;
        }
        
        // we can always fit more events because overlaps are allowed
        couldFitEvent( event : TimelineEventModel ) : boolean {
            return true;
        }
    
        _getIndex( queryEvent : TimelineEventModel ) : number {
            for ( var n = 0; n < this._events.length; n++ ) {
                var event : TimelineEventModel = this._events[n];
                if ( queryEvent.eventGuid === event.eventGuid ) {
                    return n;
                }
            }
            throw new Error( 'Event not found in this lane: event = ' + formatEvent( queryEvent ) );
        }
    }

    function formatEvent( event : TimelineEventModel ) : string {
        if ( !hasval( event ) ) {
            return '' + event;
        }
        else {
            return ( event.label + ' [ ' + formatTime_ISO8601( event.start_PMILLIS ) + ' ... ' + formatTime_ISO8601( event.end_PMILLIS ) + ' ]' );
        }
    }
}