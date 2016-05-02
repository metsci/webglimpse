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
    
    
    export interface TimelineAnnotation {
        annotationGuid : string;
        // time (x axis position) of annotation
        time_ISO8601? : string;
        // y axis position of annotion
        y? : number;
        label : string;
        styleGuid : string;
    }
    

    export interface TimelineTimeseries {
        timeseriesGuid : string;
        // supported hints:
        // lines, points, lines-and-points, bars, area
        uiHint? : string;
        // used for bars and area plots
        // determines the y axis value that the bars/area originate from
        baseline? : number;
        lineColor? : string;
        pointColor? : string;
        lineThickness? : number;
        pointSize? : number
        fragmentGuids? : string[];
    }


    export interface TimelineTimeseriesFragment {
        fragmentGuid : string;
        data? : number[];
        times_ISO8601? : string[];
        
        // undefined : user cannot adjust data points
        // 'y'       : user can adjust y value of points, but not time value
        // 'xy       : user can adjust both x (time) and y value of points
        userEditMode? : string;
    }


    export interface TimelineEvent {
        eventGuid : string;
        start_ISO8601 : string;
        end_ISO8601 : string;
        // text to be displayed with the event
        label : string;
        labelIcon? : string;
        // whether or not the event can be dragged / resized by user clicks
        userEditable? : boolean;
        // see timeline_event_style.ts (determines what icons the event displays)
        styleGuid? : string;
        // determines which events are drawn over others (higher numbers on top)
        order? : number;
        // distance between event box and top of timeline row
        topMargin? : number;
        // distance between event box and bottom of timeline row
        bottomMargin? : number;
        // text label color
        fgColor? : string;
        // event box color
        bgColor? : string;
        // event box border color
        borderColor? : string;
        // portion at the top of the timeline row not considered by labelVAlign when placing text
        labelTopMargin? : number;
        // portion at the bottom of the timeline row not considered by labelVAlign when placing text
        labelBottomMargin? : number;
        // center of the label text (0 = bottom of row, 1 = top of row)
        labelVAlign? : number;
    }


    export interface TimelineRow {
        rowGuid : string;
        label : string;
        hidden? : boolean;
        rowHeight? : number;
        yMin? : number;
        yMax? : number;
        uiHint? : string;
        eventGuids? : string[];
        timeseriesGuids? : string[];
        annotationGuids? : string[];
        bgColor? : string;
    }


    export interface TimelineGroup {
        groupGuid : string;
        rollupGuid? : string;
        label : string;
        hidden? : boolean;
        collapsed? : boolean;
        rowGuids : string[];
    }


    export interface TimelineRoot {
        groupGuids : string[];
        topPinnedRowGuids : string[];
        bottomPinnedRowGuids : string[];
        maximizedRowGuids : string[];
    }


    export interface Timeline {
        annotations : TimelineAnnotation[];
        timeseriesFragments : TimelineTimeseriesFragment[];
        timeseries : TimelineTimeseries[];
        events : TimelineEvent[];
        rows : TimelineRow[];
        groups : TimelineGroup[];
        root : TimelineRoot;
    }

    
    export class TimelineAnnotationModel {
        private _annotationGuid : string;
        private _attrsChanged : Notification;
        private _time_PMILLIS : number;
        private _y : number;
        private _label : string;
        private _styleGuid : string;
        
        constructor( annotation : TimelineAnnotation ) {
            this._annotationGuid = annotation.annotationGuid;
            this._attrsChanged = new Notification( );
            this.setAttrs( annotation );
        }
        
        get annotationGuid( ) : string {
            return this._annotationGuid;
        }

        get attrsChanged( ) : Notification {
            return this._attrsChanged;
        }
        
        setLocation( time_PMILLIS : number, y : number ) {
            if ( time_PMILLIS !== this._time_PMILLIS || y !== this.y ) {
                this._y = y;
                this._time_PMILLIS = time_PMILLIS;
                this._attrsChanged.fire( );

            }
        }
        
        get time_PMILLIS( ) : number {
            return this._time_PMILLIS;
        }
        
        set time_PMILLIS( time_PMILLIS : number ) {
            if ( time_PMILLIS !== this._time_PMILLIS ) {
                this._time_PMILLIS = time_PMILLIS;
                this._attrsChanged.fire( );
            }
        }
        
        get y( ) : number {
            return this._y;
        }
        
        set y( y : number ) {
            if ( y !== this.y ) {
                this._y = y;
                this._attrsChanged.fire( );
            }
        }
        
        get label( ) : string {
            return this._label;
        }
        
        set label( label : string ) {
            if ( label !== this.label ) {
                this._label = label;
                this._attrsChanged.fire( );
            }
        }
        
        get styleGuid( ) : string {
            return this._styleGuid;
        }
        
        set styleGuid( styleGuid : string ) {
            if ( styleGuid !== this.styleGuid ) {
                this._styleGuid = styleGuid;
                this._attrsChanged.fire( );
            }
        }

        setAttrs( annotation : TimelineAnnotation ) {
            // Don't both checking whether values are going to change -- it's not that important, and it would be obnoxious here
            this._time_PMILLIS = hasval( annotation.time_ISO8601 ) ? parseTime_PMILLIS( annotation.time_ISO8601 ) : undefined;
            this._y = annotation.y;
            this._label = annotation.label;
            this._styleGuid = annotation.styleGuid;
            this._attrsChanged.fire( );
        }
        
        snapshot( ) : TimelineAnnotation {
            return {
                annotationGuid: this._annotationGuid,
                label: this._label,
                styleGuid: this._styleGuid,
                time_ISO8601 : formatTime_ISO8601( this._time_PMILLIS ),
                y: this._y,
            };
        }
    }


    export class TimelineTimeseriesModel {
        private _timeseriesGuid : string;
        private _attrsChanged : Notification;
        private _uiHint : string;
        private _baseline : number;
        private _lineColor : Color;
        private _pointColor : Color;
        private _lineThickness : number;
        private _pointSize : number;
        private _fragmentGuids : OrderedStringSet;

        constructor( timeseries : TimelineTimeseries ) {
            this._timeseriesGuid = timeseries.timeseriesGuid;
            this._attrsChanged = new Notification( );
            this.setAttrs( timeseries );
            this._fragmentGuids = new OrderedStringSet( timeseries.fragmentGuids || [] );
        }

        get timeseriesGuid( ) : string {
            return this._timeseriesGuid;
        }

        get attrsChanged( ) : Notification {
            return this._attrsChanged;
        }

        setAttrs( timeseries : TimelineTimeseries ) {
            // Don't both checking whether values are going to change -- it's not that important, and it would be obnoxious here
            this._uiHint = timeseries.uiHint;
            this._baseline = timeseries.baseline;
            this._lineColor = ( hasval( timeseries.lineColor ) ? parseCssColor( timeseries.lineColor ) : null );
            this._pointColor = ( hasval( timeseries.pointColor ) ? parseCssColor( timeseries.pointColor ) : null );
            this._lineThickness = timeseries.lineThickness;
            this._pointSize = timeseries.pointSize;
            this._fragmentGuids = new OrderedStringSet( timeseries.fragmentGuids || [] );
            this._attrsChanged.fire( );
        }

        get baseline( ) : number {
            return this._baseline;
        }

        set baseline( baseline : number ) {
            if ( baseline !== this._baseline ) {
                this._baseline = baseline;
                this._attrsChanged.fire( );
            }
        }

        get lineColor( ) : Color {
            return this._lineColor;
        }

        set lineColor( lineColor : Color ) {
            if ( lineColor !== this._lineColor ) {
                this._lineColor = lineColor;
                this._attrsChanged.fire( );
            }
        }

        get pointColor( ) : Color {
            return this._pointColor;
        }

        set pointColor( pointColor : Color ) {
            if ( pointColor !== this._pointColor ) {
                this._pointColor = pointColor;
                this._attrsChanged.fire( );
            }
        }

        get lineThickness( ) : number {
            return this._lineThickness;
        }

        set lineThickness( lineThickness : number ) {
            if ( lineThickness !== this._lineThickness ) {
                this._lineThickness = lineThickness;
                this._attrsChanged.fire( );
            }
        }

        get pointSize( ) : number {
            return this._pointSize;
        }

        set pointSize( pointSize : number ) {
            if ( pointSize !== this._pointSize ) {
                this._pointSize = pointSize;
                this._attrsChanged.fire( );
            }
        }

        get uiHint( ) : string {
            return this._uiHint;
        }

        set uiHint( uiHint : string ) {
            if ( uiHint !== this._uiHint ) {
                this._uiHint = uiHint;
                this._attrsChanged.fire( );
            }
        }
        
        get fragmentGuids( ) : OrderedStringSet {
            return this._fragmentGuids;
        }
        
        set fragmentGuids( fragmentGuids : OrderedStringSet ) {
            if ( fragmentGuids !== this._fragmentGuids ) {
                this._fragmentGuids = fragmentGuids;
                this._attrsChanged.fire( );
            }
        }

        snapshot( ) : TimelineTimeseries {
            return {
                timeseriesGuid: this._timeseriesGuid,
                uiHint: this._uiHint,
                baseline: this._baseline,
                lineColor: ( hasval( this._lineColor ) ? this._lineColor.cssString : null ),
                pointColor: ( hasval( this._pointColor ) ? this._pointColor.cssString : null ),
                lineThickness: this._lineThickness,
                pointSize: this._pointSize,
                fragmentGuids: this._fragmentGuids.toArray( ),
            };
        }
    }


    export class TimelineTimeseriesFragmentModel {
        private _fragmentGuid : string;
        // notification provides the start and end indexes of the modified range
        // start index is inclusive, end index is exclusive 
        private _dataChanged : Notification2<number,number>;
        private _attrsChanged : Notification;
        private _userEditMode : string;
        private _data : number[];
        private _times_PMILLIS : number[];

        constructor( fragment : TimelineTimeseriesFragment ) {
            this._fragmentGuid = fragment.fragmentGuid;
            this._attrsChanged = new Notification( );
            this._dataChanged = new Notification2<number,number>( );
            this.setAttrs( fragment );
        }

        get fragmentGuid( ) : string {
            return this._fragmentGuid;
        }

        get dataChanged( ) : Notification2<number,number> {
            return this._dataChanged;
        }

        setAttrs( fragment : TimelineTimeseriesFragment ) {
            this._userEditMode = fragment.userEditMode;
            this._times_PMILLIS = hasval( fragment.times_ISO8601 ) ? fragment.times_ISO8601.map( parseTime_PMILLIS ) : [];
            this._data = hasval( fragment.data ) ? fragment.data.slice( ) : [];
            this._dataChanged.fire( 0, this._data.length );
            this._attrsChanged.fire( );
        }

        get data( ) : number[] {
            return this._data;
        }

        set data( data : number[] ) {
            if ( data !== this._data ) {
                this._data = data;
                this._dataChanged.fire( 0, this._data.length );
            }
        }

        get times_PMILLIS( ) : number[] {
            return this._times_PMILLIS;
        }

        // Time should only be modified in a way which keeps the _times_PMILLIS
        // array sorted. This is currently not enforced by the model.
        set times_PMILLIS( times_PMILLIS : number[] ) {
            if ( times_PMILLIS !== this._times_PMILLIS ) {
                this._times_PMILLIS = times_PMILLIS;
                this._dataChanged.fire( 0, this._data.length );
            }
        }
        
        // Time should only be modified in a way which keeps the _times_PMILLIS
        // array sorted. This is currently not enforced by the model.
        setAllData( data : number[], times_PMILLIS : number[] ) {
            if ( data !== this._data || times_PMILLIS !== this._times_PMILLIS ) {
                this._data = data;
                this._times_PMILLIS = times_PMILLIS;
                this._dataChanged.fire( 0, this._data.length );
            }
        }
        
        // Handles adjusting the _times_PMILLIS and _data arrays if the new time
        // requires them to be rearranged to stay in time order. Returns the new
        // index assigned to the data point.
        setData( index : number, value : number, time? : number ) : number {
            if ( this._data[index] !== value || ( hasval( time ) && this._times_PMILLIS[index] !== time ) ) {
                if ( hasval( time ) ) {
                    // the new time value would maintain the sorted order of the array
                    if ( ( index === 0 || time > this._times_PMILLIS[index-1] ) &&
                         ( index === this._times_PMILLIS.length-1 || time < this._times_PMILLIS[index+1] ) ) {
                        this._times_PMILLIS[index] = time;
                        this._data[index] = value;
                        this._dataChanged.fire( index, index+1 );
                    }
                    else {
                        // remove the current point at index
                        this._times_PMILLIS.splice( index, 1 );
                        this._data.splice( index, 1 );
                        
                        // find the index to reinsert new data at
                        index = indexOf( this._times_PMILLIS, time );
                        if ( index < 0 ) index = -index-1;
                        
                        this._times_PMILLIS.splice( index, 0, time );
                        this._data.splice( index, 0, value );
                        this._dataChanged.fire( index, index+1 );
                    }
                }
                else {
                    this._data[index] = value;
                    this._dataChanged.fire( index, index+1 );
                }
            }
            
            return index;
        }
        
        get start_PMILLIS( ) : number {
            return this._times_PMILLIS[ 0 ];
        }

        get end_PMILLIS( ) : number {
            return this._times_PMILLIS.slice( -1 )[ 0 ];
        }
        
        get userEditMode( ) : string {
            return this._userEditMode;
        }

        set userEditMode( userEditMode : string ) {
            if ( userEditMode !== this._userEditMode ) {
                this._userEditMode = userEditMode;
                this._attrsChanged.fire( );
            }
        }

        snapshot( ) : TimelineTimeseriesFragment {
            return {
                userEditMode: this._userEditMode,
                fragmentGuid: this._fragmentGuid,
                data: this._data.slice( ),
                times_ISO8601: this._times_PMILLIS.map( formatTime_ISO8601 )
            };
        }
    }


    export class TimelineEventModel {
        private _eventGuid : string;
        private _attrsChanged : Notification;
        private _start_PMILLIS : number;
        private _end_PMILLIS : number;
        private _label : string;
        private _labelIcon : string;
        private _userEditable : boolean;
        private _styleGuid : string;
        private _order : number;
        private _topMargin : number;
        private _bottomMargin : number;
        private _fgColor : Color;
        private _bgColor : Color;
        private _borderColor : Color;
        private _labelTopMargin : number;
        private _labelBottomMargin : number;
        private _labelVAlign : number;

        constructor( event : TimelineEvent ) {
            this._eventGuid = event.eventGuid;
            this._attrsChanged = new Notification( );
            this.setAttrs( event );
        }

        get eventGuid( ) : string {
            return this._eventGuid;
        }

        get attrsChanged( ) : Notification {
            return this._attrsChanged;
        }

        setAttrs( event : TimelineEvent ) {
            // Don't both checking whether values are going to change -- it's not that important, and it would be obnoxious here
            this._start_PMILLIS = parseTime_PMILLIS( event.start_ISO8601 );
            this._end_PMILLIS = parseTime_PMILLIS( event.end_ISO8601 );
            this._label = event.label;
            this._labelIcon = event.labelIcon;
            this._userEditable = ( hasval( event.userEditable ) ? event.userEditable : false );
            this._styleGuid = event.styleGuid;
            this._order = event.order;
            this._topMargin = event.topMargin;
            this._bottomMargin = event.bottomMargin;
            this._fgColor = ( hasval( event.fgColor ) ? parseCssColor( event.fgColor ) : null );
            this._bgColor = ( hasval( event.bgColor ) ? parseCssColor( event.bgColor ) : null );
            this._borderColor = ( hasval( event.borderColor ) ? parseCssColor( event.borderColor ) : null );
            this._labelTopMargin = event.labelTopMargin;
            this._labelBottomMargin = event.labelBottomMargin;
            this._labelVAlign = event.labelVAlign;
            this._attrsChanged.fire( );
        }

        setInterval( start_PMILLIS : number, end_PMILLIS : number ) {
            if ( start_PMILLIS !== this._start_PMILLIS || end_PMILLIS !== this._end_PMILLIS ) {
                this._start_PMILLIS = start_PMILLIS;
                this._end_PMILLIS = end_PMILLIS;
                this._attrsChanged.fire( );
            }
        }

        get start_PMILLIS( ) : number {
            return this._start_PMILLIS;
        }

        set start_PMILLIS( start_PMILLIS : number ) {
            if ( start_PMILLIS !== this._start_PMILLIS ) {
                this._start_PMILLIS = start_PMILLIS;
                this._attrsChanged.fire( );
            }
        }

        get end_PMILLIS( ) : number {
            return this._end_PMILLIS;
        }

        set end_PMILLIS( end_PMILLIS : number ) {
            if ( end_PMILLIS !== this._end_PMILLIS ) {
                this._end_PMILLIS = end_PMILLIS;
                this._attrsChanged.fire( );
            }
        }

        get label( ) : string {
            return this._label;
        }

        set label( label : string ) {
            if ( label !== this._label ) {
                this._label = label;
                this._attrsChanged.fire( );
            }
        }

        get labelIcon( ) : string {
            return this._labelIcon;
        }

        set labelIcon( labelIcon : string ) {
            if ( labelIcon !== this._labelIcon ) {
                this._labelIcon = labelIcon;
                this._attrsChanged.fire( );
            }
        }

        get userEditable( ) : boolean {
            return this._userEditable;
        }

        set userEditable( userEditable : boolean ) {
            if ( userEditable !== this._userEditable ) {
                this._userEditable = userEditable;
                this._attrsChanged.fire( );
            }
        }

        get styleGuid( ) : string {
            return this._styleGuid;
        }
        
        set styleGuid( styleGuid : string ) {
            if ( styleGuid !== this._styleGuid ) {
                this._styleGuid = styleGuid;
                this._attrsChanged.fire( );
            }
        }
        
        get order( ) : number {
            return this._order;
        }
        
        set order( order : number ) {
            if ( order !== this._order ) {
                this._order = order;
                this._attrsChanged.fire( );
            }
        }
        
        get topMargin( ) : number {
            return this._topMargin;
        }
        
        set topMargin( topMargin : number ) {
            if ( topMargin !== this._topMargin ) {
                this._topMargin = topMargin;
                this._attrsChanged.fire( );
            }
        }
        
        get bottomMargin( ) : number {
            return this._bottomMargin;
        }
        
        set bottomMargin( bottomMargin : number ) {
            if ( bottomMargin !== this._bottomMargin ) {
                this._bottomMargin = bottomMargin;
                this._attrsChanged.fire( );
            }
        }

        get fgColor( ) : Color {
            return this._fgColor;
        }

        set fgColor( fgColor : Color ) {
            if ( fgColor !== this._fgColor ) {
                this._fgColor = fgColor;
                this._attrsChanged.fire( );
            }
        }

        get bgColor( ) : Color {
            return this._bgColor;
        }

        set bgColor( bgColor : Color ) {
            if ( bgColor !== this._bgColor ) {
                this._bgColor = bgColor;
                this._attrsChanged.fire( );
            }
        }

        get borderColor( ) : Color {
            return this._borderColor;
        }

        set borderColor( borderColor : Color ) {
            if ( borderColor !== this._borderColor ) {
                this._borderColor = borderColor;
                this._attrsChanged.fire( );
            }
        }
        
        get labelTopMargin( ) : number {
            return this._labelTopMargin;
        }
        
        set labelTopMargin( labelTopMargin : number ) {
            if ( labelTopMargin !== this._labelTopMargin ) {
                this._labelTopMargin = labelTopMargin;
                this._attrsChanged.fire( );
            }
        }
        
        get labelBottomMargin( ) : number {
            return this._labelBottomMargin;
        }
        
        set labelBottomMargin( labelBottomMargin : number ) {
            if ( labelBottomMargin !== this._labelBottomMargin ) {
                this._labelBottomMargin = labelBottomMargin;
                this._attrsChanged.fire( );
            }
        }
        
        get labelVAlign( ) : number {
            return this._labelVAlign;
        }
        
        set labelVAlign( labelVAlign : number ) {
            if ( labelVAlign !== this._labelVAlign ) {
                this._labelVAlign = labelVAlign;
                this._attrsChanged.fire( );
            }
        }

        snapshot( ) : TimelineEvent {
            return {
                eventGuid: this._eventGuid,
                start_ISO8601: formatTime_ISO8601( this._start_PMILLIS ),
                end_ISO8601: formatTime_ISO8601( this._end_PMILLIS ),
                label: this._label,
                labelIcon: this._labelIcon,
                userEditable: this._userEditable,
                styleGuid: this._styleGuid,
                order: this._order,
                topMargin: this._topMargin,
                bottomMargin: this._bottomMargin,
                bgColor: ( hasval( this._bgColor ) ? this._bgColor.cssString : null ),
                fgColor: ( hasval( this._fgColor ) ? this._fgColor.cssString : null ),
                borderColor: ( hasval( this._borderColor ) ? this._borderColor.cssString : null ),
                labelTopMargin: this._labelTopMargin,
                labelBottomMargin: this._labelBottomMargin,
                labelVAlign: this._labelVAlign
            };
        }
    }


    export class TimelineRowModel {
        private _rowGuid : string;
        private _attrsChanged : Notification;
        private _rowHeight : number;
        private _hidden : boolean;
        private _label : string;
        private _uiHint : string;
        private _eventGuids : OrderedStringSet;
        private _timeseriesGuids : OrderedStringSet;
        private _annotationGuids : OrderedStringSet;
        private _bgColor : Color;
        private _dataAxis : Axis1D;

        constructor( row : TimelineRow ) {
            this._rowGuid = row.rowGuid;
            this._attrsChanged = new Notification( );
            
            var min : number = hasval( row.yMin ) ? row.yMin : 0;
            var max : number = hasval( row.yMax ) ? row.yMax : 1;
            this._dataAxis = new Axis1D( min, max );
            
            this.setAttrs( row );
            this._eventGuids = new OrderedStringSet( row.eventGuids || [] );
            this._timeseriesGuids = new OrderedStringSet( row.timeseriesGuids || [] );
            this._annotationGuids = new OrderedStringSet( row.annotationGuids || [] );
        }

        get rowGuid( ) : string {
            return this._rowGuid;
        }

        get attrsChanged( ) : Notification {
            return this._attrsChanged;
        }

        setAttrs( row : TimelineRow ) {
            // Don't both checking whether values are going to change -- it's not that important, and it would be obnoxious here
            this._label = row.label;
            this._uiHint = row.uiHint;
            this._hidden = row.hidden;
            this._rowHeight = row.rowHeight;
            this._bgColor = ( hasval( row.bgColor ) ? parseCssColor( row.bgColor ) : null );
            this._attrsChanged.fire( );
        }
        
        get rowHeight( ) : number {
            return this._rowHeight;
        }
        
        set rowHeight( rowHeight : number ) {
            this._rowHeight = rowHeight;
            this._attrsChanged.fire( );
        }
        
        get hidden( ) : boolean {
            return this._hidden;
        }
        
        set hidden( hidden : boolean ) {
            this._hidden = hidden;
            this._attrsChanged.fire( );
        }
        
        get dataAxis( ) : Axis1D {
           return this._dataAxis;
        }
        
        set dataAxis( dataAxis : Axis1D ) {
            this._dataAxis = dataAxis;
            this._attrsChanged.fire( );
        }

        get label( ) : string {
           return this._label;
        }

        set label( label : string ) {
            if ( label !== this._label ) {
                this._label = label;
                this._attrsChanged.fire( );
            }
        }

        get uiHint( ) : string {
           return this._uiHint;
        }

        set uiHint( uiHint : string ) {
            if ( uiHint !== this._uiHint ) {
                this._uiHint = uiHint;
                this._attrsChanged.fire( );
            }
        }
        
        get bgColor( ) : Color {
            return this._bgColor;
        }

        set bgColor( bgColor : Color ) {
            if ( bgColor !== this._bgColor ) {
                this._bgColor = bgColor;
                this._attrsChanged.fire( );
            }
        }

        get eventGuids( ) : OrderedStringSet {
            return this._eventGuids;
        }
        
        get timeseriesGuids( ) : OrderedStringSet {
            return this._timeseriesGuids;
        }
        
        get annotationGuids( ) : OrderedStringSet {
            return this._annotationGuids;
        }

        snapshot( ) : TimelineRow {
            return {
                rowGuid: this._rowGuid,
                label: this._label,
                rowHeight: this._rowHeight,
                hidden: this._hidden,
                uiHint: this._uiHint,
                eventGuids: this._eventGuids.toArray( ),
                timeseriesGuids: this._timeseriesGuids.toArray( ),
                annotationGuids: this._annotationGuids.toArray( ),
                bgColor: ( hasval( this._bgColor ) ? this._bgColor.cssString : null ),
            };
        }
    }


    export class TimelineGroupModel {
        private _groupGuid : string;
        private _rollupGuid : string;
        private _attrsChanged : Notification;
        private _hidden : boolean;
        private _label : string;
        private _collapsed : boolean;
        private _rowGuids : OrderedStringSet;

        constructor( group : TimelineGroup ) {
            this._groupGuid = group.groupGuid;
            this._attrsChanged = new Notification( );
            this.setAttrs( group );
            this._rowGuids = new OrderedStringSet( group.rowGuids );
        }

        get groupGuid( ) : string {
            return this._groupGuid;
        }

        get rollupGuid( ) : string {
            return this._rollupGuid;
        }
        
        set rollupGuid( rollupGuid : string ) {
            this._rollupGuid = rollupGuid;
            this._attrsChanged.fire( );
        }
        
        get attrsChanged( ) : Notification {
            return this._attrsChanged;
        }

        setAttrs( group : TimelineGroup ) {
            // Don't both checking whether values are going to change -- it's not that important, and it would be obnoxious here
            this._rollupGuid = group.rollupGuid;
            this._hidden = group.hidden;
            this._label = group.label;
            this._collapsed = group.collapsed;
            this._attrsChanged.fire( );
        }
        
        get hidden( ) : boolean {
            return this._hidden;
        }
        
        set hidden( hidden : boolean ) {
            this._hidden = hidden;
            this._attrsChanged.fire( );
        }

        get label( ) : string {
            return this._label;
        }

        set label( label : string ) {
            if ( label !== this._label ) {
                this._label = label;
                this._attrsChanged.fire( );
            }
        }

        get collapsed( ) : boolean {
            return this._collapsed;
        }

        set collapsed( collapsed : boolean ) {
            if ( collapsed !== this._collapsed ) {
                this._collapsed = collapsed;
                this._attrsChanged.fire( );
            }
        }

        get rowGuids( ) : OrderedStringSet {
            return this._rowGuids;
        }

        snapshot( ) : TimelineGroup {
            return {
                groupGuid: this._groupGuid,
                rollupGuid: this._rollupGuid,
                label: this._label,
                hidden: this._hidden,
                collapsed: ( hasval( this._collapsed ) ? this._collapsed : false ),
                rowGuids: this._rowGuids.toArray( )
            };
        }
    }


    export class TimelineRootModel {
        private _attrsChanged : Notification;
        private _groupGuids : OrderedStringSet;
        private _topPinnedRowGuids : OrderedStringSet;
        private _bottomPinnedRowGuids : OrderedStringSet;
        private _maximizedRowGuids : OrderedStringSet;

        constructor( root : TimelineRoot ) {
            this._attrsChanged = new Notification( );
            this.setAttrs( root );
            this._groupGuids = new OrderedStringSet( root.groupGuids );
            this._topPinnedRowGuids = new OrderedStringSet( root.topPinnedRowGuids || [] );
            this._bottomPinnedRowGuids = new OrderedStringSet( root.bottomPinnedRowGuids || [] );
            this._maximizedRowGuids = new OrderedStringSet( root.maximizedRowGuids || [] );
        }

        get attrsChanged( ) : Notification {
            return this._attrsChanged;
        }

        setAttrs( root : TimelineRoot ) {
            // Don't both checking whether values are going to change -- it's not that important, and it would be obnoxious here
            // No attrs yet
            this._attrsChanged.fire( );
        }

        get groupGuids( ) : OrderedStringSet {
            return this._groupGuids;
        }
        
        get topPinnedRowGuids( ) : OrderedStringSet {
            return this._topPinnedRowGuids;
        }
        
        get bottomPinnedRowGuids( ) : OrderedStringSet {
            return this._bottomPinnedRowGuids;
        }
        
        get maximizedRowGuids( ) : OrderedStringSet {
            return this._maximizedRowGuids;
        }

        snapshot( ) : TimelineRoot {
            return {
                groupGuids: this._groupGuids.toArray( ),
                topPinnedRowGuids: this._topPinnedRowGuids.toArray( ),
                bottomPinnedRowGuids: this._bottomPinnedRowGuids.toArray( ),
                maximizedRowGuids: this._maximizedRowGuids.toArray( )
            };
        }
    }


    export interface TimelineMergeStrategy {
        updateAnnotationModel( annotationModel : TimelineAnnotationModel, newAnnotation : TimelineAnnotation );
        updateTimeseriesFragmentModel( timeseriesFragmentModel : TimelineTimeseriesFragmentModel, newTimeseriesFragment : TimelineTimeseriesFragment );
        updateTimeseriesModel( timeseriesModel : TimelineTimeseriesModel, newTimeseries : TimelineTimeseries );
        updateEventModel( eventModel : TimelineEventModel, newEvent : TimelineEvent );
        updateRowModel( rowModel : TimelineRowModel, newRow : TimelineRow );
        updateGroupModel( groupModel : TimelineGroupModel, newGroup : TimelineGroup );
        updateRootModel( rootModel : TimelineRootModel, newRoot : TimelineRoot );
    }


    export class TimelineModel {
        private _annotations : OrderedSet<TimelineAnnotationModel>;
        private _timeseriesFragments : OrderedSet<TimelineTimeseriesFragmentModel>;
        private _timeseries : OrderedSet<TimelineTimeseriesModel>;
        private _events : OrderedSet<TimelineEventModel>;
        private _rows : OrderedSet<TimelineRowModel>;
        private _groups : OrderedSet<TimelineGroupModel>;
        private _root : TimelineRootModel;

        constructor( timeline? : Timeline ) {
        
            var annotations = ( hasval( timeline ) && hasval( timeline.annotations ) ? timeline.annotations : [] );
            this._annotations = new OrderedSet<TimelineAnnotationModel>( [], (g)=>g.annotationGuid );
            for ( var n = 0; n < annotations.length; n++ ) {
                this._annotations.add( new TimelineAnnotationModel( annotations[ n ] ) );
            }
            
            var timeseriesFragments = ( hasval( timeline ) && hasval( timeline.timeseriesFragments ) ? timeline.timeseriesFragments : [] );
            this._timeseriesFragments = new OrderedSet<TimelineTimeseriesFragmentModel>( [], (e)=>e.fragmentGuid );
            for ( var n = 0; n < timeseriesFragments.length; n++ ) {
                this._timeseriesFragments.add( new TimelineTimeseriesFragmentModel( timeseriesFragments[ n ] ) );
            }
            
            var timeseries = ( hasval( timeline ) && hasval( timeline.timeseries ) ? timeline.timeseries : [] );
            this._timeseries = new OrderedSet<TimelineTimeseriesModel>( [], (e)=>e.timeseriesGuid );
            for ( var n = 0; n < timeseries.length; n++ ) {
                this._timeseries.add( new TimelineTimeseriesModel( timeseries[ n ] ) );
            }
            
            var events = ( hasval( timeline ) && hasval( timeline.events ) ? timeline.events : [] );
            this._events = new OrderedSet<TimelineEventModel>( [], (e)=>e.eventGuid );
            for ( var n = 0; n < events.length; n++ ) {
                this._events.add( new TimelineEventModel( events[ n ] ) );
            }

            var rows = ( hasval( timeline ) && hasval( timeline.rows ) ? timeline.rows : [] );
            this._rows = new OrderedSet<TimelineRowModel>( [], (r)=>r.rowGuid );
            for ( var n = 0; n < rows.length; n++ ) {
                this._rows.add( new TimelineRowModel( rows[ n ] ) );
            }

            var groups = ( hasval( timeline ) && hasval( timeline.groups ) ? timeline.groups : [] );
            this._groups = new OrderedSet<TimelineGroupModel>( [], (g)=>g.groupGuid );
            for ( var n = 0; n < groups.length; n++ ) {
                this._groups.add( new TimelineGroupModel( groups[ n ] ) );
            }

            var root = ( hasval( timeline ) && hasval( timeline.root ) ? timeline.root : newEmptyTimelineRoot( ) );
            this._root = new TimelineRootModel( root );
        }
        
        get annotations( ) : OrderedSet<TimelineAnnotationModel> { return this._annotations; }
        get timeseriesFragments( ) : OrderedSet<TimelineTimeseriesFragmentModel> { return this._timeseriesFragments; }
        get timeseriesSets( ) : OrderedSet<TimelineTimeseriesModel> { return this._timeseries; }
        get events( ) : OrderedSet<TimelineEventModel> { return this._events; }
        get rows( ) : OrderedSet<TimelineRowModel> { return this._rows; }
        get groups( ) : OrderedSet<TimelineGroupModel> { return this._groups; }
        get root( ) : TimelineRootModel { return this._root; }

        annotation( annotationGuid : string ) : TimelineAnnotationModel { return this._annotations.valueFor( annotationGuid ); }
        timeseriesFragment( fragmentGuid : string ) : TimelineTimeseriesFragmentModel { return this._timeseriesFragments.valueFor( fragmentGuid ); }
        timeseries( timeseriesGuid : string ) : TimelineTimeseriesModel { return this._timeseries.valueFor( timeseriesGuid ); }
        event( eventGuid : string ) : TimelineEventModel { return this._events.valueFor( eventGuid ); }
        row( rowGuid : string ) : TimelineRowModel { return this._rows.valueFor( rowGuid ); }
        group( groupGuid : string ) : TimelineGroupModel { return this._groups.valueFor( groupGuid ); }


        replace( newTimeline : Timeline ) {

            // Purge removed items
            //

            var freshRoot = newTimeline.root;
            this._root.groupGuids.retainValues( freshRoot.groupGuids );
            this._root.topPinnedRowGuids.retainValues( freshRoot.topPinnedRowGuids );
            this._root.bottomPinnedRowGuids.retainValues( freshRoot.bottomPinnedRowGuids );
            this._root.maximizedRowGuids.retainValues( freshRoot.maximizedRowGuids );
            
            var freshGroups = newTimeline.groups;
            var retainedGroupGuids : string[] = [];
            for ( var n = 0; n < freshGroups.length; n++ ) {
                var freshGroup = freshGroups[ n ];
                var groupGuid = freshGroup.groupGuid;
                var oldGroup = this._groups.valueFor( groupGuid );
                if ( hasval( oldGroup ) ) {
                    oldGroup.rowGuids.retainValues( freshGroup.rowGuids );
                    retainedGroupGuids.push( groupGuid );
                }
            }
            this._groups.retainIds( retainedGroupGuids );

            var freshRows = newTimeline.rows;
            var retainedRowGuids : string[] = [];
            for ( var n = 0; n < freshRows.length; n++ ) {
                var freshRow = freshRows[ n ];
                var rowGuid = freshRow.rowGuid;
                var oldRow = this._rows.valueFor( rowGuid );
                if ( hasval( oldRow ) ) {
                    oldRow.eventGuids.retainValues( freshRow.eventGuids || [] );
                    retainedRowGuids.push( rowGuid );
                }
            }
            this._rows.retainIds( retainedRowGuids );

            var freshEvents = newTimeline.events;
            var retainedEventGuids : string[] = [];
            for ( var n = 0; n < freshEvents.length; n++ ) {
                var freshEvent = freshEvents[ n ];
                var eventGuid = freshEvent.eventGuid;
                var oldEvent = this._events.valueFor( eventGuid );
                if ( hasval( oldEvent ) ) {
                    retainedEventGuids.push( eventGuid );
                }
            }
            this._events.retainIds( retainedEventGuids );

            var freshTimeseriesSet = newTimeline.timeseries;
            var retainedTimeseriesGuids : string[] = [];
            for ( var n = 0; n < freshTimeseriesSet.length; n++ ) {
                var freshTimeseries = freshTimeseriesSet[ n ];
                var timeseriesGuid = freshTimeseries.timeseriesGuid;
                var oldTimeseries = this._timeseries.valueFor( timeseriesGuid );
                if ( hasval( oldTimeseries ) ) {
                    retainedTimeseriesGuids.push( timeseriesGuid );
                }
            }
            this._timeseries.retainIds( retainedTimeseriesGuids );
            
            var freshTimeseriesFragments = newTimeline.timeseriesFragments;
            var retainedTimeseriesFragmentGuids : string[] = [];
            for ( var n = 0; n < freshTimeseriesFragments.length; n++ ) {
                var freshTimeseriesFragment = freshTimeseriesFragments[ n ];
                var fragmentGuid = freshTimeseriesFragment.fragmentGuid;
                var oldTimeseriesFragment = this._timeseriesFragments.valueFor( fragmentGuid );
                if ( hasval( oldTimeseriesFragment ) ) {
                    retainedTimeseriesFragmentGuids.push( fragmentGuid );
                }
            }
            this._timeseriesFragments.retainIds( retainedTimeseriesFragmentGuids );
            
            var freshAnnotations = newTimeline.annotations;
            var retainedAnnotationGuids : string[] = [];
            for ( var n = 0; n < freshAnnotations.length; n++ ) {
                var freshAnnotation = freshAnnotations[ n ];
                var annotationGuid = freshAnnotation.annotationGuid;
                var oldAnnotation = this._annotations.valueFor( annotationGuid );
                if ( hasval( oldAnnotation ) ) {
                    retainedAnnotationGuids.push( annotationGuid );
                }
            }
            this._annotations.retainIds( retainedAnnotationGuids );
            
            // Add new items
            //
            
            for ( var n = 0; n < freshAnnotations.length; n++ ) {
                var freshAnnotation = freshAnnotations[ n ];
                var oldAnnotation = this._annotations.valueFor( freshAnnotation.annotationGuid );
                if ( hasval( oldAnnotation ) ) {
                    oldAnnotation.setAttrs( freshAnnotation );
                }
                else {
                    this._annotations.add( new TimelineAnnotationModel( freshAnnotation ) );
                }
            }
            
            for ( var n = 0; n < freshTimeseriesFragments.length; n++ ) {
                var freshTimeseriesFragment = freshTimeseriesFragments[ n ];
                var oldTimeseriesFragment = this._timeseriesFragments.valueFor( freshTimeseriesFragment.fragmentGuid );
                if ( hasval( oldTimeseriesFragment ) ) {
                    oldTimeseriesFragment.setAttrs( freshTimeseriesFragment );
                }
                else {
                    this._timeseriesFragments.add( new TimelineTimeseriesFragmentModel( freshTimeseriesFragment ) );
                }
            }
            
            for ( var n = 0; n < freshTimeseriesSet.length; n++ ) {
                var freshTimeseries = freshTimeseriesSet[ n ];
                var oldTimeseries = this._timeseries.valueFor( freshTimeseries.timeseriesGuid );
                if ( hasval( oldTimeseries ) ) {
                    oldTimeseries.setAttrs( freshTimeseries );
                }
                else {
                    this._timeseries.add( new TimelineTimeseriesModel( freshTimeseries ) );
                }
            }

            for ( var n = 0; n < freshEvents.length; n++ ) {
                var freshEvent = freshEvents[ n ];
                var oldEvent = this._events.valueFor( freshEvent.eventGuid );
                if ( hasval( oldEvent ) ) {
                    oldEvent.setAttrs( freshEvent );
                }
                else {
                    this._events.add( new TimelineEventModel( freshEvent ) );
                }
            }

            for ( var n = 0; n < freshRows.length; n++ ) {
                var freshRow = freshRows[ n ];
                var oldRow = this._rows.valueFor( freshRow.rowGuid );
                if ( hasval( oldRow ) ) {
                    oldRow.setAttrs( freshRow );
                    oldRow.eventGuids.addAll( ( freshRow.eventGuids || [] ), 0, true );
                }
                else {
                    this._rows.add( new TimelineRowModel( freshRow ) );
                }
            }

            for ( var n = 0; n < freshGroups.length; n++ ) {
                var freshGroup = freshGroups[ n ];
                var oldGroup = this._groups.valueFor( freshGroup.groupGuid );
                if ( hasval( oldGroup ) ) {
                    oldGroup.setAttrs( freshGroup );
                    oldGroup.rowGuids.addAll( freshGroup.rowGuids, 0, true );
                }
                else {
                    this._groups.add( new TimelineGroupModel( freshGroup ) );
                }
            }

            this._root.groupGuids.addAll( freshRoot.groupGuids, 0, true );
            this._root.topPinnedRowGuids.addAll( freshRoot.topPinnedRowGuids, 0, true );
            this._root.bottomPinnedRowGuids.addAll( freshRoot.bottomPinnedRowGuids, 0, true );
            this._root.maximizedRowGuids.addAll( freshRoot.maximizedRowGuids, 0, true );
        }


        merge( newData : Timeline, strategy : TimelineMergeStrategy ) {
        
            var newAnnotations = hasval( newData.annotations ) ? newData.annotations : [];
            for ( var n = 0; n < newAnnotations.length; n++ ) {
                var newAnnotation = newAnnotations[ n ];
                var annotationModel = this._annotations.valueFor( newAnnotation.annotationGuid );
                if ( hasval( annotationModel ) ) {
                    strategy.updateAnnotationModel( annotationModel, newAnnotation );
                }
                else {
                    this._annotations.add( new TimelineAnnotationModel( newAnnotation ) );
                }
            }
            
            var newTimeseriesFragments = hasval( newData.timeseriesFragments ) ? newData.timeseriesFragments : [];
            for ( var n = 0; n < newTimeseriesFragments.length; n++ ) {
                var newTimeseriesFragment = newTimeseriesFragments[ n ];
                var timeseriesFragmentModel = this._timeseriesFragments.valueFor( newTimeseriesFragment.fragmentGuid );
                if ( hasval( timeseriesFragmentModel ) ) {
                    strategy.updateTimeseriesFragmentModel( timeseriesFragmentModel, newTimeseriesFragment );
                }
                else {
                    this._timeseriesFragments.add( new TimelineTimeseriesFragmentModel( newTimeseriesFragment ) );
                }
            }
            
            var newTimeseriesSet = hasval( newData.timeseries ) ? newData.timeseries : [];
            for ( var n = 0; n < newTimeseriesSet.length; n++ ) {
                var newTimeseries = newTimeseriesSet[ n ];
                var timeseriesModel = this._timeseries.valueFor( newTimeseries.timeseriesGuid );
                if ( hasval( timeseriesModel ) ) {
                    strategy.updateTimeseriesModel( timeseriesModel, newTimeseries );
                }
                else {
                    this._timeseries.add( new TimelineTimeseriesModel( newTimeseries ) );
                }
            }
            
            var newEvents = hasval( newData.events ) ? newData.events : [];
            for ( var n = 0; n < newEvents.length; n++ ) {
                var newEvent = newEvents[ n ];
                var eventModel = this._events.valueFor( newEvent.eventGuid );
                if ( hasval( eventModel ) ) {
                    strategy.updateEventModel( eventModel, newEvent );
                }
                else {
                    this._events.add( new TimelineEventModel( newEvent ) );
                }
            }

            var newRows = hasval( newData.rows ) ? newData.rows : [];
            for ( var n = 0; n < newRows.length; n++ ) {
                var newRow = newRows[ n ];
                var rowModel = this._rows.valueFor( newRow.rowGuid );
                if ( hasval( rowModel ) ) {
                    strategy.updateRowModel( rowModel, newRow );
                }
                else {
                    this._rows.add( new TimelineRowModel( newRow ) );
                }
            }

            var newGroups = hasval( newData.groups ) ? newData.groups : [];
            for ( var n = 0; n < newGroups.length; n++ ) {
                var newGroup = newGroups[ n ];
                var groupModel = this._groups.valueFor( newGroup.groupGuid );
                if ( hasval( groupModel ) ) {
                    strategy.updateGroupModel( groupModel, newGroup );
                }
                else {
                    this._groups.add( new TimelineGroupModel( newGroup ) );
                }
            }

            var newRoot = newData.root;
            strategy.updateRootModel( this._root, newRoot );
        }

        snapshot( ) : Timeline {
            return {
                annotations : this._annotations.map( (e)=>e.snapshot() ),
                timeseriesFragments : this._timeseriesFragments.map( (e)=>e.snapshot() ),
                timeseries : this._timeseries.map( (e)=>e.snapshot() ),
                events : this._events.map( (e)=>e.snapshot() ),
                rows : this._rows.map( (r)=>r.snapshot() ),
                groups : this._groups.map( (g)=>g.snapshot() ),
                root : this._root.snapshot( )
            };
        }


    }


    export function newEmptyTimelineRoot( ) : TimelineRoot {
        return { groupGuids: [],
                 bottomPinnedRowGuids: [],
                 topPinnedRowGuids: [],
                 maximizedRowGuids: [] };
    }


    export var timelineMergeNewBeforeOld : TimelineMergeStrategy = {
        
        updateAnnotationModel( annotationModel : TimelineAnnotationModel, newAnnotation : TimelineAnnotation ) {
            annotationModel.setAttrs( newAnnotation );
        },
        
        updateTimeseriesFragmentModel( timeseriesFragmentModel : TimelineTimeseriesFragmentModel, newTimeseriesFragment : TimelineTimeseriesFragment ) {
            timeseriesFragmentModel.setAttrs( newTimeseriesFragment );
        },
        
        updateTimeseriesModel( timeseriesModel : TimelineTimeseriesModel, newTimeseries : TimelineTimeseries ) {
            timeseriesModel.setAttrs( newTimeseries );
            timeseriesModel.fragmentGuids.addAll( ( newTimeseries.fragmentGuids || [] ), 0, true );
        },
        
        updateEventModel: function( eventModel : TimelineEventModel, newEvent : TimelineEvent ) {
            eventModel.setAttrs( newEvent );
        },

        updateRowModel: function( rowModel : TimelineRowModel, newRow : TimelineRow ) {
            rowModel.setAttrs( newRow );
            rowModel.eventGuids.addAll( ( newRow.eventGuids || [] ), 0, true );
        },

        updateGroupModel: function( groupModel : TimelineGroupModel, newGroup : TimelineGroup ) {
            groupModel.setAttrs( newGroup );
            groupModel.rowGuids.addAll( newGroup.rowGuids, 0, true );
        },

        updateRootModel: function( rootModel : TimelineRootModel, newRoot : TimelineRoot ) {
            rootModel.setAttrs( newRoot );
            rootModel.groupGuids.addAll( newRoot.groupGuids, 0, true );
            rootModel.topPinnedRowGuids.addAll( newRoot.topPinnedRowGuids || [], 0, true );
            rootModel.bottomPinnedRowGuids.addAll( newRoot.bottomPinnedRowGuids || [], 0, true );
            rootModel.maximizedRowGuids.addAll( newRoot.maximizedRowGuids || [], 0, true );
        }
    };


    export var timelineMergeNewAfterOld : TimelineMergeStrategy = {
        
        updateAnnotationModel( annotationModel : TimelineAnnotationModel, newAnnotation : TimelineAnnotation ) {
            annotationModel.setAttrs( newAnnotation );
        },
        
        updateTimeseriesFragmentModel( timeseriesFragmentModel : TimelineTimeseriesFragmentModel, newTimeseriesFragment : TimelineTimeseriesFragment ) {
            timeseriesFragmentModel.setAttrs( newTimeseriesFragment );
        },
        
        updateTimeseriesModel( timeseriesModel : TimelineTimeseriesModel, newTimeseries : TimelineTimeseries ) {
            timeseriesModel.setAttrs( newTimeseries );
            timeseriesModel.fragmentGuids.addAll( newTimeseries.fragmentGuids || [] );
        },
        
        updateEventModel: function( eventModel : TimelineEventModel, newEvent : TimelineEvent ) {
            eventModel.setAttrs( newEvent );
        },

        updateRowModel: function( rowModel : TimelineRowModel, newRow : TimelineRow ) {
            rowModel.setAttrs( newRow );
            rowModel.eventGuids.addAll( newRow.eventGuids || [] );
            rowModel.timeseriesGuids.addAll( newRow.timeseriesGuids || [] );
            rowModel.annotationGuids.addAll( newRow.annotationGuids || [] );
        },

        updateGroupModel: function( groupModel : TimelineGroupModel, newGroup : TimelineGroup ) {
            groupModel.setAttrs( newGroup );
            groupModel.rowGuids.addAll( newGroup.rowGuids );
        },

        updateRootModel: function( rootModel : TimelineRootModel, newRoot : TimelineRoot ) {
            rootModel.setAttrs( newRoot );
            rootModel.groupGuids.addAll( newRoot.groupGuids );
            rootModel.topPinnedRowGuids.addAll( newRoot.topPinnedRowGuids || [] );
            rootModel.bottomPinnedRowGuids.addAll( newRoot.bottomPinnedRowGuids || [] );
            rootModel.maximizedRowGuids.addAll( newRoot.maximizedRowGuids || [] );
        }
    };


}