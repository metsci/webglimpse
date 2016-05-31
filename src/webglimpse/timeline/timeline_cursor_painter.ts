
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
                gl.blendFuncSeparate( GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA, GL.ONE, GL.ONE_MINUS_SRC_ALPHA );
                gl.enable( GL.BLEND );
                
                textTextures.resetTouches( );
                
                var time = ui.selection.hoveredTime_PMILLIS.value;
                
                if ( hasval( time ) ) {
                
                    var cursorModel = model.cursor( rowModel.cursorGuid );
                    
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
                                    
                                    value = value0 * diff0 + value1 * diff1;                                    
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}