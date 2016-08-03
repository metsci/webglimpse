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

    export interface TimeseriesCursorPainterOptions {
        font?         : string;
        textColor?    : Color;
        // number of pixels between box and label text
        buffer_px?    : number;
        // number of significant digits in text labels
        textDecimals? : number;

        // color of selection box and crosshair lines
        lineColor?    : Color;

        // thickness of cursor crosshair lines in pixels
        crosshairThickness_px?   : number;

        // width/height of selection box (shown at intersection beween crosshairs and timeseries) in pixels
        boxSize_px? : number;
        // thickness of selection box lines in pixels
        boxThickness_px? : number;
    }

    export function newTimeseriesCursorPainterFactory( cursorOptions? : TimeseriesCursorPainterOptions ) : TimelineTimeseriesPainterFactory {

        // Painter Factory
        return function( drawable : Drawable, timeAxis : TimeAxis1D, dataAxis : Axis1D, model : TimelineModel, rowModel : TimelineRowModel, ui : TimelineUi, options : TimelineTimeseriesPainterOptions ) : Painter {

            var textColor             = ( hasval( cursorOptions ) && hasval( cursorOptions.textColor              ) ? cursorOptions.textColor      : white );
            var lineColor             = ( hasval( cursorOptions ) && hasval( cursorOptions.lineColor              ) ? cursorOptions.lineColor      : white );
            var font                  = ( hasval( cursorOptions ) && hasval( cursorOptions.font                   ) ? cursorOptions.font           : options.timelineFont );
            var buffer_px             = ( hasval( cursorOptions ) && hasval( cursorOptions.buffer_px              ) ? cursorOptions.buffer_px      : 4 );
            var textDecimals          = ( hasval( cursorOptions ) && hasval( cursorOptions.textDecimals           ) ? cursorOptions.textDecimals   : 2 );
            var boxSize_px            = ( hasval( cursorOptions ) && hasval( cursorOptions.boxSize_px             ) ? cursorOptions.boxSize_px     : 8 );
            var crosshairThickness_px = ( hasval( cursorOptions ) && hasval( cursorOptions.crosshairThickness_px  ) ? cursorOptions.boxSize_px     : 2 );
            var boxThickness_px       = ( hasval( cursorOptions ) && hasval( cursorOptions.boxThickness_px        ) ? cursorOptions.boxSize_px     : 2 );

            var program = new Program( xyFrac_VERTSHADER, solid_FRAGSHADER );
            var u_Color = new UniformColor( program, 'u_Color' );
            var a_Position = new Attribute( program, 'a_XyFrac' );
            
            var xys = new Float32Array( 0 );
            xys = ensureCapacityFloat32( xys, 4 );
            var xysBuffer = newDynamicBuffer( );

            var textTextures = <Cache<TextTexture2D>> newTextTextureCache( font, textColor );
            var textureRenderer = new TextureRenderer( );
            
            // Painter
            return function( gl : WebGLRenderingContext, viewport : BoundsUnmodifiable ) {

                // only draw a cursor if we are the current hovered row
                var hoveredRow : TimelineRowModel = ui.selection.hoveredRow.value;
                if ( !hasval( hoveredRow ) || hoveredRow.rowGuid !== rowModel.rowGuid ) return;

                gl.blendFuncSeparate( GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA, GL.ONE, GL.ONE_MINUS_SRC_ALPHA );
                gl.enable( GL.BLEND );
                
                var indexXys = 0;
                textTextures.resetTouches( );
                
                var time = ui.selection.hoveredTime_PMILLIS.value;
                var y    = ui.selection.hoveredY.value;

                var wLine = crosshairThickness_px / viewport.w;
                var hLine = crosshairThickness_px / viewport.h;

                var wBoxLine = boxThickness_px / viewport.w;
                var hBoxLine = boxThickness_px / viewport.h;

                var wBox = boxSize_px / viewport.w;
                var hBox = boxSize_px / viewport.h;

                if ( hasval( time ) ) {
                
                    var cursorModel = model.cursor( rowModel.cursorGuid );
                    
                    if ( hasval( cursorModel) )
                    {
                        textureRenderer.begin( gl, viewport );

                        var timeseriesCount = cursorModel.labeledTimeseriesGuids.length;

                        // 36 vertices for crosshairs, 48 vertices per timeseries intersection marker
                        xys = ensureCapacityFloat32( xys, 2 * ( 36 + timeseriesCount * 48 ) );

                        for ( var i = 0 ; i < cursorModel.labeledTimeseriesGuids.length ; i++ ) {

                            var timeseriesGuid = cursorModel.labeledTimeseriesGuids.valueAt( i );
                            var timeseries = model.timeseries( timeseriesGuid );
                            
                            // if the row doesn't contain the timeseries, don't show cursor intersections
                            if ( !rowModel.timeseriesGuids.hasValue( timeseriesGuid ) ) continue;

                            for ( var j = 0 ; j < timeseries.fragmentGuids.length ; j++ ) {
                                var fragmentGuid : string = timeseries.fragmentGuids.valueAt( j );
                                var fragment : TimelineTimeseriesFragmentModel = model.timeseriesFragment( fragmentGuid );
                                
                                // fragments should not overlap
                                if ( fragment.start_PMILLIS < time && fragment.end_PMILLIS > time ) {
                                    
                                    var value : number;
                                    
                                    // bars are drawn starting at the point and continuing to the next point, so we don't interpolate them
                                    if ( timeseries.uiHint == 'bars' ) {
                                        var index : number = indexAtOrBefore( fragment.times_PMILLIS, time );
                                        value = fragment.data[index];
                                    }
                                    else {
                                        var index0 : number = indexAtOrBefore( fragment.times_PMILLIS, time );
                                        var index1 : number = indexAtOrAfter( fragment.times_PMILLIS, time );
                                        
                                        var value0 = fragment.data[index0];
                                        var time0 = fragment.times_PMILLIS[index0];
                                        
                                        var value1 = fragment.data[index1];
                                        var time1 = fragment.times_PMILLIS[index1];
                                        
                                        var diff = time1 - time0;
                                        var diff0 = ( time - time0 ) / diff;
                                        var diff1 = 1 - diff0;
                                        
                                        value = value0 * diff1 + value1 * diff0;                                    
                                    }

                                    var textTexture = textTextures.value( value.toFixed( textDecimals ) );

                                    var valueFracY = dataAxis.vFrac( value );
                                    var valueFracX = timeAxis.tFrac( time );

                                    var boxLeft   = valueFracX - wBox/2;
                                    var boxRight  = valueFracX + wBox/2;
                                    var boxTop    = valueFracY + hBox/2;
                                    var boxBottom = valueFracY - hBox/2;

                                    // draw box at value location

                                    // left edge
                                    indexXys = putQuadXys( xys, indexXys, boxLeft-wBoxLine/2, boxLeft+wBoxLine/2, boxTop+hBoxLine/2, boxBottom-hBoxLine/2 );
                                    // right edge
                                    indexXys = putQuadXys( xys, indexXys, boxRight-wBoxLine/2, boxRight+wBoxLine/2, boxTop+hBoxLine/2, boxBottom-hBoxLine/2 );
                                    // top edge
                                    indexXys = putQuadXys( xys, indexXys, boxLeft+wBoxLine/2, boxRight-wBoxLine/2, boxTop-hBoxLine/2, boxTop+hBoxLine/2 );
                                    // bottom edge
                                    indexXys = putQuadXys( xys, indexXys, boxLeft+wBoxLine/2, boxRight-wBoxLine/2, boxBottom-hBoxLine/2, boxBottom+hBoxLine/2 );

                                    // draw text
                                    //XXX 0.6 looks more centered to the eye than 0.5 for numeric text
                                    textureRenderer.draw( gl, textTexture, boxRight+wBoxLine/2+buffer_px/viewport.w, valueFracY, { xAnchor: 0, yAnchor: .6 } );

                                }
                            }
                        }

                        if ( hasval( cursorModel.showCursorText ) ? cursorModel.showCursorText : true ) {
                            var textTexture = textTextures.value( y.toFixed( textDecimals ) );
                            //textureRenderer.draw( gl, textTexture, 1, timeAxis.tFrac( y ) + buffer_px/viewport.h, { xAnchor: 1, yAnchor: 0 } );
                            textureRenderer.draw( gl, textTexture, 1, dataAxis.vFrac( y ) + buffer_px/viewport.h, { xAnchor: 1, yAnchor: 0 } );    
                        }

                        textureRenderer.end( gl );
                        textTextures.retainTouched( );

                        var xLeft  = 0;
                        var xRight = 1;
                        var yMid   = dataAxis.vFrac( y );
                        var xMid   = timeAxis.tFrac( time );

                        // draw horizontal line
                        if ( hasval( cursorModel.showHorizontalLine ) ? cursorModel.showHorizontalLine : true ) {
                            indexXys = putQuadXys( xys, indexXys, xLeft, xRight, yMid-hLine/2, yMid+hLine/2 );
                        }

                        // draw vertical lines (split in two to avoid overlap with horizontal)
                        if ( hasval( cursorModel.showVerticalLine ) ? cursorModel.showVerticalLine : true ) {
                            indexXys = putQuadXys( xys, indexXys, xMid-wLine/2, xMid+wLine/2, 0, yMid-hLine/2 );
                            indexXys = putQuadXys( xys, indexXys, xMid-wLine/2, xMid+wLine/2, yMid+hLine/2, 1 );
                        }

                        // draw lines
                        program.use( gl );

                        xysBuffer.setData( xys.subarray( 0, indexXys ) );
                        a_Position.setDataAndEnable( gl, xysBuffer, 2, GL.FLOAT );
                        u_Color.setData( gl, lineColor );
                        gl.drawArrays( GL.TRIANGLES, 0, Math.floor( indexXys / 2 ) );
        
                        a_Position.disable( gl );
                        program.endUse( gl );
                    }
                }
            }
        }
    }
}