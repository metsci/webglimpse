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

    export function newTimeseriesCursorPainterFactory( ) : TimelineTimeseriesPainterFactory {
        // Painter Factory
        return function( drawable : Drawable, timeAxis : TimeAxis1D, dataAxis : Axis1D, model : TimelineModel, rowModel : TimelineRowModel, ui : TimelineUi ) : Painter {

            var textTextures = newTextTextureCache3( );
            var textureRenderer = new TextureRenderer( );
            
            var program = new Program( xyFrac_VERTSHADER, solid_FRAGSHADER );
            var u_Color = new UniformColor( program, 'u_Color' );
            var a_Position = new Attribute( program, 'a_XyFrac' );
            
            var xys = new Float32Array( 0 );
            xys = ensureCapacityFloat32( xys, 4 );
            var xysBuffer = newDynamicBuffer( );
            
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

                var boxSize       = 18;
                var lineThickness = 5;
                var lineColor     = white;

                var wLine = lineThickness / viewport.w;
                var hLine = lineThickness / viewport.h;

                var wBox = boxSize / viewport.w;
                var hBox = boxSize / viewport.h;

                if ( hasval( time ) ) {
                
                    var cursorModel = model.cursor( rowModel.cursorGuid );
                    
                    if ( hasval( cursorModel) )
                    {
                        var timeseriesCount = cursorModel.labeledTimeseriesGuids.length;

                        // 36 vertices for crosshairs, 48 vertices per timeseries intersection marker
                        xys = ensureCapacityFloat32( xys, 2 * ( 36 + timeseriesCount * 48 ) );

                        for ( var i = 0 ; i < cursorModel.labeledTimeseriesGuids.length ; i++ ) {
                            
                            var timeseriesGuid = cursorModel.labeledTimeseriesGuids.valueAt( i );
                            var timeseries = model.timeseries( timeseriesGuid );
                            
                            for ( var j = 0 ; j < timeseries.fragmentGuids.length ; j++ ) {
                                var fragmentGuid : string = timeseries.fragmentGuids.valueAt( j );
                                var fragment : TimelineTimeseriesFragmentModel = model.timeseriesFragment( fragmentGuid );
                                
                                // fragments should not overlap
                                if ( fragment.start_PMILLIS < time && fragment.end_PMILLIS > time ) {
                                    
                                    var value;
                                    
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

                                    var valueFracY = dataAxis.vFrac( value );
                                    var valueFracX = timeAxis.tFrac( time );

                                    var boxLeft   = valueFracX - wBox/2;
                                    var boxRight  = valueFracX + wBox/2;
                                    var boxTop    = valueFracY + hBox/2;
                                    var boxBottom = valueFracY - hBox/2;

                                    // draw box at value location

                                    // left edge
                                    indexXys = putQuadXys( xys, indexXys, boxLeft-wLine/2, boxLeft+wLine/2, boxTop+hLine/2, boxBottom-hLine/2 );
                                    // right edge
                                    indexXys = putQuadXys( xys, indexXys, boxRight-wLine/2, boxRight+wLine/2, boxTop+hLine/2, boxBottom-hLine/2 );
                                    // top edge
                                    indexXys = putQuadXys( xys, indexXys, boxLeft+wLine/2, boxRight-wLine/2, boxTop-hLine/2, boxTop+hLine/2 );
                                    // bottom edge
                                    indexXys = putQuadXys( xys, indexXys, boxLeft+wLine/2, boxRight-wLine/2, boxBottom-hLine/2, boxBottom+hLine/2 );
                                }
                            }
                        }

                        var xLeft  = 0;
                        var xRight = 1;
                        var yMid   = dataAxis.vFrac( y );
                        var xMid   = timeAxis.tFrac( time );

                        // draw horizontal line
                        indexXys = putQuadXys( xys, indexXys, xLeft, xRight, yMid-hLine/2, yMid+hLine/2 );

                        // draw vertical lines (split in two to avoid overlap with horizontal)
                        indexXys = putQuadXys( xys, indexXys, xMid-wLine/2, xMid+wLine/2, 0, yMid-hLine/2 );
                        indexXys = putQuadXys( xys, indexXys, xMid-wLine/2, xMid+wLine/2, yMid+hLine/2, 1 );

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