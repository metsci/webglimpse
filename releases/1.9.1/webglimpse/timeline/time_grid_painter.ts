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


    export interface TimeGridPainterOptions {
        tickSpacing? : number;
        gridColor?   : Color;
        referenceDate? : string;
    }


    export function newTimeGridPainter( timeAxis : TimeAxis1D, isVerticalAxis : boolean, timeZone : string, options? : TimeGridPainterOptions ) : Painter {
        var tickSpacing = ( hasval( options ) && hasval( options.tickSpacing ) ? options.tickSpacing : 60    );
        var gridColor   = ( hasval( options ) && hasval( options.gridColor   ) ? options.gridColor   : black );
        var referenceDate_PMILLIS = ( hasval( options ) && hasval( options.referenceDate  ) ? parseTime_PMILLIS( options.referenceDate )  : undefined );

        var program = new Program( xyFrac_VERTSHADER, solid_FRAGSHADER );
        var u_Color = new UniformColor( program, 'u_Color' );
        var a_XyFrac = new Attribute( program, 'a_XyFrac' );

        var xyFrac = new Float32Array( 0 );
        var xyFracBuffer = newDynamicBuffer( );

        return function( gl : WebGLRenderingContext, viewport : BoundsUnmodifiable ) {
            var tickTimes_PMILLIS = getTickTimes_PMILLIS( timeAxis, ( isVerticalAxis ? viewport.h : viewport.w ), tickSpacing, timeZone, referenceDate_PMILLIS );
            var tickCount = tickTimes_PMILLIS.length;

            program.use( gl );
            u_Color.setData( gl, gridColor );

            xyFrac = ensureCapacityFloat32( xyFrac, 4*tickCount );
            for ( var n = 0; n < tickCount; n++ ) {
                var tFrac = timeAxis.tFrac( tickTimes_PMILLIS[ n ] );
                if ( isVerticalAxis ) {
                    tFrac = ( Math.floor( tFrac*viewport.h ) + 0.5 ) / viewport.h;
                    xyFrac[ ( 4*n + 0 ) ] = 0;
                    xyFrac[ ( 4*n + 1 ) ] = tFrac;
                    xyFrac[ ( 4*n + 2 ) ] = 1;
                    xyFrac[ ( 4*n + 3 ) ] = tFrac;
                }
                else {
                    // Adding epsilon is a crude way to compensate for floating-point error (which is probably introduced up where we compute tFrac)
                    tFrac = ( Math.floor( tFrac*viewport.w + 1e-4 ) + 0.5 ) / viewport.w;
                    xyFrac[ ( 4*n + 0 ) ] = tFrac;
                    xyFrac[ ( 4*n + 1 ) ] = 0;
                    xyFrac[ ( 4*n + 2 ) ] = tFrac;
                    xyFrac[ ( 4*n + 3 ) ] = 1;
                }
            }
            xyFracBuffer.setData( xyFrac.subarray( 0, 4*tickCount ) );
            a_XyFrac.setDataAndEnable( gl, xyFracBuffer, 2, GL.FLOAT );

            // IE does not support lineWidths other than 1, so make sure all browsers use lineWidth of 1
            gl.lineWidth( 1 );
            gl.drawArrays( GL.LINES, 0, 2*tickCount );

            a_XyFrac.disable( gl );
            program.endUse( gl );
        }
    }


}